// Packs ./chrome-extension into ./public/bob-chrome-extension.zip so the
// onboarding "Download extension" button always ships the current source.
// Dependency-free: raw deflate via node:zlib plus a hand-rolled zip container.

import { deflateRawSync } from 'node:zlib';
import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'chrome-extension');
const outFile = join(root, 'public', 'bob-chrome-extension.zip');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

// Fixed timestamp keeps the archive byte-identical when nothing changed.
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01

function build() {
  if (!existsSync(sourceDir)) {
    console.error(`[pack-extension] missing source directory: ${sourceDir}`);
    process.exit(1);
  }

  const files = walk(sourceDir).filter((file) => !/(^|[/\\])(\.DS_Store|Thumbs\.db)$/.test(file));
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = relative(sourceDir, file).split('\\').join('/');
    const nameBytes = Buffer.from(name, 'utf8');
    const content = readFileSync(file);
    const deflated = deflateRawSync(content, { level: 9 });
    const useDeflate = deflated.length < content.length;
    const data = useDeflate ? deflated : content;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBytes, data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(DOS_TIME, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(content.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);

    central.push(header, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralBuffer = Buffer.concat(central);
  const centralOffset = offset;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, Buffer.concat([...chunks, centralBuffer, end]));

  const required = ['manifest.json', 'background.js', 'content.js', 'content.css', 'sidepanel.html', 'sidepanel.js', 'sidepanel.css', 'icons/bob-logo.png'];
  const names = files.map((file) => relative(sourceDir, file).split('\\').join('/'));
  const missing = required.filter((name) => !names.includes(name));
  if (missing.length) {
    console.error(`[pack-extension] archive is missing required files: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`[pack-extension] wrote ${relative(root, outFile)} (${files.length} files, ${statSync(outFile).size} bytes)`);
}

build();
