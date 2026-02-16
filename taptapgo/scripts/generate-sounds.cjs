// Script de génération des fichiers audio WAV pour TapTapGO
// Usage: node scripts/generate-sounds.cjs

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const outDir = path.join(__dirname, '..', 'public', 'sounds');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Génère un buffer PCM 16-bit mono
function generateSamples(durationSec, generator) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.max(-1, Math.min(1, generator(t, durationSec)));
  }
  return samples;
}

// Encode en WAV
function toWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // chunk size
  buffer.writeUInt16LE(1, 20);        // PCM
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(16, 34);       // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
  }

  return buffer;
}

function envelope(t, dur, attack = 0.01, release = 0.1) {
  if (t < attack) return t / attack;
  if (t > dur - release) return (dur - t) / release;
  return 1;
}

// === CORRECT : accord majeur joyeux montant (C-E-G) ===
const correct = generateSamples(0.35, (t, dur) => {
  const env = envelope(t, dur, 0.005, 0.08);
  // Trois notes rapides montantes
  let freq;
  if (t < 0.1) freq = 523.25;       // C5
  else if (t < 0.2) freq = 659.25;  // E5
  else freq = 783.99;               // G5

  return env * 0.5 * (
    Math.sin(2 * Math.PI * freq * t) +
    0.3 * Math.sin(2 * Math.PI * freq * 2 * t)
  );
});

// === WRONG : buzzer désagréable ===
const wrong = generateSamples(0.3, (t, dur) => {
  const env = envelope(t, dur, 0.005, 0.1);
  return env * 0.4 * (
    Math.sin(2 * Math.PI * 180 * t) +
    0.6 * Math.sin(2 * Math.PI * 220 * t) +
    0.3 * Math.sin(2 * Math.PI * 260 * t)
  );
});

// === WIN : fanfare triomphale ===
const win = generateSamples(1.2, (t, dur) => {
  const env = envelope(t, dur, 0.01, 0.3);
  let freq;
  if (t < 0.15) freq = 523.25;       // C5
  else if (t < 0.3) freq = 659.25;   // E5
  else if (t < 0.45) freq = 783.99;  // G5
  else if (t < 0.6) freq = 1046.50;  // C6
  else freq = 1046.50;               // C6 tenu

  const vibrato = 1 + 0.003 * Math.sin(2 * Math.PI * 6 * t);
  return env * 0.5 * (
    Math.sin(2 * Math.PI * freq * vibrato * t) +
    0.4 * Math.sin(2 * Math.PI * freq * 2 * t) +
    0.2 * Math.sin(2 * Math.PI * freq * 3 * t)
  );
});

// === LOSE : mélodie descendante triste ===
const lose = generateSamples(1.0, (t, dur) => {
  const env = envelope(t, dur, 0.01, 0.25);
  let freq;
  if (t < 0.25) freq = 440;         // A4
  else if (t < 0.5) freq = 392;     // G4
  else if (t < 0.75) freq = 349.23; // F4
  else freq = 329.63;               // E4

  return env * 0.45 * (
    Math.sin(2 * Math.PI * freq * t) +
    0.3 * Math.sin(2 * Math.PI * freq * 0.5 * t)
  );
});

// === TICK : clic court et net ===
const tick = generateSamples(0.08, (t, dur) => {
  const env = envelope(t, dur, 0.001, 0.03);
  return env * 0.6 * (
    Math.sin(2 * Math.PI * 1200 * t) +
    0.5 * Math.sin(2 * Math.PI * 2400 * t)
  ) * Math.exp(-t * 40);
});

// Écrire les fichiers
const sounds = { correct, wrong, win, lose, tick };
for (const [name, samples] of Object.entries(sounds)) {
  const wav = toWav(samples);
  const filePath = path.join(outDir, `${name}.mp3`);
  fs.writeFileSync(filePath, wav);
  console.log(`✓ ${name}.mp3 (${wav.length} bytes)`);
}

console.log('\nFichiers audio générés dans public/sounds/');
