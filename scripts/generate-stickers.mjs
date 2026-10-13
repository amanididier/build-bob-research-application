import fs from 'fs';
import path from 'path';

const sets = {
  construction: [
    { stage: 1, label: 'Blueprint Paper', icon: '📐', desc: 'Planning the architecture' },
    { stage: 2, label: 'Tools Organised', icon: '🛠️', desc: 'Laying out the workbench' },
    { stage: 3, label: 'Machines at Work', icon: '⚙️', desc: 'Active construction' },
    { stage: 4, label: 'Engineering Cap', icon: '👷', desc: 'Precision inspection' },
    { stage: 5, label: 'Finished Building', icon: '🏛️', desc: 'Structure standing tall' }
  ],
  kitchen: [
    { stage: 1, label: 'Kitchen Tools', icon: '🔪', desc: 'Mise en place ready' },
    { stage: 2, label: 'Pan with Omelette', icon: '🍳', desc: 'Sizzle on the stove' },
    { stage: 3, label: 'Decorated Plate', icon: '🍽️', desc: 'Artful presentation' },
    { stage: 4, label: 'Glass of Water', icon: '🥂', desc: 'Table setting clear' },
    { stage: 5, label: 'Full Table Served', icon: '🍲', desc: 'Feast ready to enjoy' }
  ],
  holiday: [
    { stage: 1, label: 'Suitcase Open', icon: '🧳', desc: 'Packing essentials' },
    { stage: 2, label: 'Beach Shorts', icon: '🩳', desc: 'Sunny destination set' },
    { stage: 3, label: 'Surfboard', icon: '🏄', desc: 'Riding the wave' },
    { stage: 4, label: 'Rollercoaster', icon: '🎢', desc: 'Adrenaline peak' },
    { stage: 5, label: 'Sunset Trip Done', icon: '🌅', desc: 'Memories safely kept' }
  ],
  launch: [
    { stage: 1, label: 'Launch Blueprint', icon: '🚀', desc: 'Launch pad calibrated' },
    { stage: 2, label: 'Fuel Tanks Filled', icon: '⛽', desc: 'Propellant loaded' },
    { stage: 3, label: 'Countdown', icon: '⏱️', desc: 'T-minus 10 seconds' },
    { stage: 4, label: 'Liftoff', icon: '🔥', desc: 'Tower cleared' },
    { stage: 5, label: 'Flag in Orbit', icon: '🚩', desc: 'Mission accomplished' }
  ],
  garden: [
    { stage: 1, label: 'Seed Packet', icon: '🌱', desc: 'Selecting heirloom seeds' },
    { stage: 2, label: 'Watering Can', icon: '🚿', desc: 'Moistening fresh soil' },
    { stage: 3, label: 'First Sprout', icon: '🌿', desc: 'Green shoots appear' },
    { stage: 4, label: 'Full Bloom', icon: '🌻', desc: 'Petals unfold in sun' },
    { stage: 5, label: 'Garden in Full Colour', icon: '💐', desc: 'Vibrant living plot' }
  ]
};

for (const [setName, stages] of Object.entries(sets)) {
  const dir = path.join(process.cwd(), 'public', 'assets', 'stickers', setName);
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stages) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f5f1ea" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5B82E"/>
      <stop offset="100%" stop-color="#2DBFB0"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="144" height="144" rx="36" fill="url(#badgeBg)" stroke="url(#ring)" stroke-width="3.5" filter="url(#glow)"/>
  <circle cx="80" cy="65" r="34" fill="#fbf8f2" stroke="#e7e0d3" stroke-width="1.5"/>
  <text x="80" y="78" font-size="36" text-anchor="middle" dominant-baseline="central">${s.icon}</text>
  <rect x="34" y="110" width="92" height="20" rx="10" fill="#17150F"/>
  <text x="80" y="123" font-family="monospace, monospace" font-size="9" font-weight="bold" fill="#F5B82E" text-anchor="middle" letter-spacing="1">STAGE ${s.stage} OF 5</text>
  <text x="80" y="145" font-family="sans-serif" font-size="9" font-weight="600" fill="#6B6358" text-anchor="middle">${s.label}</text>
</svg>`;
    fs.writeFileSync(path.join(dir, `${s.stage}.svg`), svg);
  }
}
console.log('Generated 25 sticker SVGs in public/assets/stickers/');
