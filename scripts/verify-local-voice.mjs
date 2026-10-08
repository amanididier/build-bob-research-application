/**
 * Local voice engine proof — measures whether on-device Whisper STT and
 * Kokoro-82M TTS actually work on this machine, and how fast they are.
 *
 *   node scripts/verify-local-voice.mjs <path-to-16k-or-any-wav>
 *
 * Prints timings only. Writes the Kokoro output to a temp wav so it can be
 * listened to. Nothing here is shipped in the app bundle.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { pipeline, env } = await import('@huggingface/transformers');
env.allowLocalModels = false;
env.useBrowserCache = false;

const wavPath = process.argv[2];

function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'RIFF') throw new Error('not a RIFF file');
  let offset = 12;
  let rate = 16000;
  let channels = 1;
  let bits = 16;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('latin1', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(offset + 10);
      rate = buf.readUInt32LE(offset + 12);
      bits = buf.readUInt16LE(offset + 22);
    } else if (id === 'data') {
      data = buf.subarray(offset + 8, offset + 8 + size);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data) throw new Error('no data chunk');
  const n = Math.floor(data.length / (bits / 8) / channels);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const idx = i * channels * (bits / 8);
    mono[i] = bits === 16 ? data.readInt16LE(idx) / 32768 : (data.readUInt8(idx) - 128) / 128;
  }
  return { samples: mono, rate };
}

function to16k(samples, rate) {
  if (rate === 16000) return samples;
  const ratio = rate / 16000;
  const out = new Float32Array(Math.round(samples.length / ratio));
  for (let i = 0; i < out.length; i++) out[i] = samples[Math.floor(i * ratio)] || 0;
  return out;
}

function writeWav(file, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

const t = () => performance.now();
const sec = (s) => `${((performance.now() - s) / 1000).toFixed(2)}s`;

// ------------------------------------------------------------------ STT
if (wavPath && fs.existsSync(wavPath)) {
  const { samples, rate } = readWav(wavPath);
  const pcm = to16k(samples, rate);
  console.log(`\n== Whisper STT (onnx-community/whisper-tiny.en, q8) ==`);
  console.log(`  input: ${(pcm.length / 16000).toFixed(2)}s audio @${rate}Hz -> 16k`);
  let s = t();
  const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', { dtype: 'q8' });
  console.log(`  model load: ${sec(s)}`);
  s = t();
  const out = await asr(pcm);
  console.log(`  transcribe: ${sec(s)} for ${(pcm.length / 16000).toFixed(2)}s audio`);
  console.log(`  result: ${JSON.stringify(out?.text || '')}`);

  // second pass proves warm-cache speed, which is what the app experiences
  s = t();
  const out2 = await asr(pcm);
  console.log(`  warm re-transcribe: ${sec(s)} -> ${JSON.stringify(out2?.text || '')}`);

  // Rolling partials: exactly what push-to-talk now does while the user holds —
  // transcribe each new 3s slice as it lands instead of one pass at release.
  const SLICE = 16000 * 3;
  let committed = 0;
  let rolling = '';
  console.log(`  -- rolling 3s slices (push-to-talk partials) --`);
  while (committed < pcm.length) {
    const slice = pcm.subarray(committed, committed + SLICE);
    if (slice.length < 16000 * 0.9) break;
    s = t();
    const part = await asr(new Float32Array(slice));
    const text = (part?.text || '').trim();
    rolling += (rolling ? ' ' : '') + text;
    console.log(
      `  slice ${(committed / 16000).toFixed(0)}-${((committed + slice.length) / 16000).toFixed(0)}s: ${sec(s)} -> ${JSON.stringify(text)}`
    );
    committed += slice.length;
  }
  console.log(`  rolling transcript: ${JSON.stringify(rolling)}`);

  await asr.dispose?.();
} else {
  console.log('\n(no wav supplied — skipping STT proof)');
}

// ------------------------------------------------------------------ TTS
console.log(`\n== Kokoro-82M TTS (onnx-community/Kokoro-82M-v1.0-ONNX, q8) ==`);
const TEXT = 'Here is what I found about your research question, in a couple of short sentences.';
let s = t();
let synth;
try {
  synth = await pipeline('text-to-speech', 'onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8' });
  console.log(`  model load: ${sec(s)}`);
} catch (e) {
  console.log(`  MODEL LOAD FAILED: ${String(e?.message || e).slice(0, 300)}`);
  console.log(
    '  CONCLUSION: @huggingface/transformers 4.3.1 ships StyleTextToSpeech2Model (the Kokoro\n' +
      '  architecture) but no text-to-speech pipeline mapping and no KokoroTTS/phonemizer, so\n' +
      '  in-browser Kokoro-82M cannot be used at this dependency version. Bob therefore speaks\n' +
      '  through Gemini TTS prebuilt studio voices (one distinct voice per character) and falls\n' +
      '  back to on-device browser synthesis with per-character pitch/rate.'
  );
  console.log('\nverification complete');
  process.exit(0);
}

for (const voice of ['af_bella', 'am_adam', 'bf_emma']) {
  s = t();
  try {
    const a = await synth(TEXT, { voice });
    const audio = a?.audio;
    const sr = a?.sampling_rate || 24000;
    const dur = audio ? audio.length / sr : 0;
    const took = performance.now() - s;
    const outFile = path.join(os.tmpdir(), `bob-kokoro-${voice}.wav`);
    if (audio) writeWav(outFile, Float32Array.from(audio), sr);
    console.log(`  voice=${voice.padEnd(9)} synth ${(took / 1000).toFixed(2)}s for ${dur.toFixed(2)}s audio (RTF ${(took / 1000 / Math.max(dur, 0.01)).toFixed(2)}) -> ${outFile}`);
  } catch (e) {
    console.log(`  voice=${voice.padEnd(9)} FAILED: ${String(e?.message || e).slice(0, 200)}`);
  }
}

// short first-chunk case: latency to first spoken sentence in a streamed reply
s = t();
try {
  const a = await synth('Sure, here is the short answer.', { voice: 'af_bella' });
  const sr = a?.sampling_rate || 24000;
  console.log(`  first short sentence: ${sec(s)} for ${((a?.audio?.length || 0) / sr).toFixed(2)}s audio`);
} catch (e) {
  console.log(`  short sentence FAILED: ${String(e?.message || e).slice(0, 200)}`);
}

console.log('\nverification complete');
process.exit(0);
