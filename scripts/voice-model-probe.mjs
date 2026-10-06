/**
 * Voice layer probe — measures which layer actually costs time or fails.
 *
 *   BOB_GEMINI_API_KEY=your-key node scripts/voice-model-probe.mjs
 *
 * The key is read from the environment only and is never printed, logged or
 * written anywhere. Model IDs are parsed out of the app's own source so this
 * always measures the paths the app really calls:
 *   src/lib/voice/voiceConfig.ts  -> liveModels   (Live / Call mode)
 *   src/lib/voice/ttsProvider.ts  -> TTS_MODELS   (Read Aloud + Call fallback)
 *   src/lib/voice/sttProvider.ts  -> STT_MODELS   (Prompt transcription)
 *
 * Requests mirror the app exactly: same endpoint, same headers, same payloads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.BOB_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

if (!KEY) {
  console.error('Missing key. Run:  BOB_GEMINI_API_KEY=<your gemini key> node scripts/voice-model-probe.mjs');
  process.exit(1);
}

function readIds(file, re) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const m = re.exec(src);
  if (!m) return [];
  return [...m[0].matchAll(/'(gemini-[a-z0-9.\-]+)'/g)].map((x) => x[1]);
}

const LIVE_MODELS = readIds('src/lib/voice/voiceConfig.ts', /liveModels:\s*\[[^\]]*\]/);
const TTS_MODELS = readIds('src/lib/voice/ttsProvider.ts', /const TTS_MODELS = \[[^\]]*\]/);
const STT_MODELS = readIds('src/lib/voice/sttProvider.ts', /const STT_MODELS = \[[^\]]*\]/);
const LIVE_VOICE = /liveVoice:\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'src/lib/voice/voiceConfig.ts'), 'utf8'))?.[1] || 'Kore';
const TTS_VOICE = /defaultVoice:\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'src/lib/voice/voiceConfig.ts'), 'utf8'))?.[1] || 'Kore';

const H = { 'Content-Type': 'application/json', 'x-goog-api-key': KEY };
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const start = () => performance.now();
const ms = (s) => `${Math.round(performance.now() - s)}ms`;

console.log('app-configured models under test:');
console.log('  live:', LIVE_MODELS.join(', ') || '(none)');
console.log('  tts :', TTS_MODELS.join(', ') || '(none)', `voice=${TTS_VOICE}`);
console.log('  stt :', STT_MODELS.join(', ') || '(none)');

// ------------------------------------------------------- 1. what the key can see
async function listModels() {
  const s = start();
  const res = await fetch(`${BASE}/models?pageSize=500`, { headers: H });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.log(`\n[x] model list failed: HTTP ${res.status} ${String(data?.error?.message || '').slice(0, 180)}`);
    return [];
  }
  const ids = (data.models || []).map((m) => String(m.name).replace('models/', ''));
  console.log(`\n== ${ids.length} models visible to this key (${ms(s)}) ==`);
  console.log(ids.filter((i) => /live|tts|transcribe|omni|native-audio/i.test(i)).sort().map((i) => `  ${i}`).join('\n'));

  console.log('\n== availability of the app-configured IDs ==');
  for (const [group, list] of [['live', LIVE_MODELS], ['tts', TTS_MODELS], ['stt', STT_MODELS]]) {
    for (const id of list) {
      console.log(`  ${group.padEnd(4)} ${id.padEnd(36)} ${ids.includes(id) ? 'VISIBLE' : 'NOT LISTED for this key'}`);
    }
  }
  return ids;
}

// ------------------------------------------------------------------- 2. TTS layer
async function ttsProbe(model, text, voiceName) {
  const s = start();
  try {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          ...(voiceName ? { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } : {}),
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.log(`  ${model.padEnd(28)} voice=${String(voiceName).padEnd(6)} HTTP ${res.status} in ${ms(s)}`);
      console.log(`      -> ${String(data?.error?.message || '').slice(0, 220)}`);
      return;
    }
    const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const b64 = inline?.data;
    if (!b64) return console.log(`  ${model.padEnd(28)} OK in ${ms(s)} but returned NO audio part`);
    const mime = String(inline?.mimeType || '');
    const bytes = Math.floor((b64.length * 3) / 4);
    const rate = Number(/rate=(\d+)/i.exec(mime)?.[1] || 24000);
    const secs = (bytes / 2 / rate).toFixed(2);
    const needsWrap = /l16|pcm/i.test(mime) || !/wav|mp3|ogg|aac|flac|webm/i.test(mime);
    console.log(`  ${model.padEnd(28)} voice=${String(voiceName).padEnd(6)} OK in ${ms(s)} :: ${bytes}B ~${secs}s audio mime=${mime || '(none)'}`);
    console.log(`      -> ${needsWrap ? `raw PCM: app must WAV-wrap at ${rate}Hz (ttsProvider does this)` : 'container format: playable as-is'}`);
  } catch (e) {
    console.log(`  ${model.padEnd(28)} voice=${String(voiceName).padEnd(6)} THREW in ${ms(s)} :: ${String(e?.message || e).slice(0, 180)}`);
  }
}

// ------------------------------------------------------------------- 3. STT layer
function toneWav(seconds = 1.2, rate = 16000) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i / 20) * 800), 44 + i * 2);
  return buf;
}

async function sttProbe(model, wavB64) {
  const s = start();
  try {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Transcribe this spoken audio exactly into plain text. Do not add commentary.' },
          { inlineData: { mimeType: 'audio/wav', data: wavB64 } },
        ] }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.log(`  ${model.padEnd(28)} HTTP ${res.status} in ${ms(s)} -> ${String(data?.error?.message || '').slice(0, 220)}`);
      return;
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`  ${model.padEnd(28)} OK in ${ms(s)} :: transcript=${JSON.stringify(text.slice(0, 50))} (synthetic tone, so empty is expected — this measures reach + latency only)`);
  } catch (e) {
    console.log(`  ${model.padEnd(28)} THREW in ${ms(s)} :: ${String(e?.message || e).slice(0, 180)}`);
  }
}

// ------------------------------------------------------------------ 4. Live layer
async function liveProbe(model) {
  const { GoogleGenAI } = await import('@google/genai/node');
  const ai = new GoogleGenAI({ apiKey: KEY });
  const s = start();
  let firstMsg = null;
  let setup = null;
  const outcome = await new Promise((resolve) => {
    const kill = setTimeout(() => resolve('TIMEOUT after 12s (no setupComplete)'), 12000);
    ai.live.connect({
      model,
      callbacks: {
        onmessage: (msg) => {
          if (!firstMsg) firstMsg = performance.now() - s;
          if (msg?.setupComplete && !setup) {
            setup = performance.now() - s;
            clearTimeout(kill);
            resolve('setupComplete');
          }
        },
        onerror: (e) => { clearTimeout(kill); resolve(`ERROR ${String(e?.message || e).slice(0, 220)}`); },
        onclose: () => { clearTimeout(kill); resolve('socket closed before setupComplete'); },
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } },
        systemInstruction: { parts: [{ text: 'You are Bob.' }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
            endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
            silenceDurationMs: 1500,
          },
        },
      },
    }).then((session) => {
      setTimeout(() => { try { session.close(); } catch {} }, 400);
    }).catch((e) => { clearTimeout(kill); resolve(`CONNECT THREW ${String(e?.message || e).slice(0, 220)}`); });
  });
  console.log(`  ${model.padEnd(34)} ${outcome}`);
  console.log(`      -> firstServerMsg=${firstMsg ? Math.round(firstMsg) + 'ms' : '-'} setupComplete=${setup ? Math.round(setup) + 'ms' : '-'} total=${ms(s)}`);
}

const visible = await listModels();

const TEXT = 'Here is what I found about your research question, in a couple of short sentences.';
console.log(`\n== TTS layer (${TEXT.length} chars, the size of one app chunk) ==`);
for (const m of TTS_MODELS) await ttsProbe(m, TEXT, TTS_VOICE);

console.log('\n== STT layer (1.2s synthetic tone) ==');
const wav = toneWav().toString('base64');
for (const m of STT_MODELS) await sttProbe(m, wav);

console.log('\n== Live layer (handshake only, no audio sent) ==');
for (const m of LIVE_MODELS) await liveProbe(m);

console.log(`\nprobe complete. ${visible.length} models were visible to this key.`);
process.exit(0);
