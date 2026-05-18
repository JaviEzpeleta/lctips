// Synthesizes the royalty-free audio used by the thank-you video.
// Everything here is generated from scratch (sine/triangle additive synth),
// so there are zero licensing concerns. Run: node scripts/generate-thank-you-audio.mjs
// Output: public/thank-you/{music,sparkle,pop}.wav

import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "thank-you")
const SR = 32000

mkdirSync(OUT_DIR, { recursive: true })

function writeWav(path, samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write("RIFF", 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write("WAVE", 8)
  buf.write("fmt ", 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write("data", 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2)
  }
  writeFileSync(path, buf)
}

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)
const N = { C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, C5: 72, D5: 74, E5: 76, G5: 79, A5: 81 }

// ── Soft sine pad with a touch of a fifth, gentle attack/release ──
function pad(samples, startSec, durSec, freqs, gain) {
  const start = (startSec * SR) | 0
  const len = (durSec * SR) | 0
  const atk = 0.35 * SR
  const rel = 0.9 * SR
  for (let i = 0; i < len; i++) {
    let env
    if (i < atk) env = i / atk
    else if (i > len - rel) env = Math.max(0, (len - i) / rel)
    else env = 1
    env = env * env * (3 - 2 * env) // smoothstep
    const t = i / SR
    let v = 0
    for (const f of freqs) {
      v += Math.sin(2 * Math.PI * f * t) * 0.6
      v += Math.sin(2 * Math.PI * f * 2 * t) * 0.12
    }
    samples[start + i] = (samples[start + i] || 0) + (v / freqs.length) * env * gain
  }
}

// ── Twinkly bell (triangle-ish, fast pluck, long-ish decay) ──
function bell(samples, startSec, freq, gain, durSec = 1.1) {
  const start = (startSec * SR) | 0
  const len = (durSec * SR) | 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const env = Math.exp(-t * 4.2)
    const vib = 1 + Math.sin(2 * Math.PI * 5 * t) * 0.004
    let v = Math.sin(2 * Math.PI * freq * vib * t)
    v += Math.sin(2 * Math.PI * freq * 2 * vib * t) * 0.35
    v += Math.sin(2 * Math.PI * freq * 3 * vib * t) * 0.12
    samples[start + i] = (samples[start + i] || 0) + v * env * gain
  }
}

// Simple feedback delay for a dreamy tail.
function addDelay(samples, delaySec, feedback, mix) {
  const d = (delaySec * SR) | 0
  for (let i = d; i < samples.length; i++) {
    samples[i] += (samples[i - d] || 0) * feedback * mix
  }
}

function normalize(samples, peak = 0.86) {
  let max = 0
  for (const s of samples) max = Math.max(max, Math.abs(s))
  if (max === 0) return
  const g = peak / max
  for (let i = 0; i < samples.length; i++) samples[i] *= g
}

// ── MUSIC: dreamy I–V–vi–IV in C, ~70 BPM, looped to ~46s ──
{
  const beat = 60 / 70
  const bar = beat * 4
  const bars = 13
  const total = Math.ceil(bar * bars + 2)
  const buf = new Float32Array(total * SR)

  // root + chord tones for the arpeggio per bar
  const prog = [
    { pad: [N.C3, N.G3, N.E4], arp: [N.C4, N.E4, N.G4, N.C5, N.G4, N.E4] }, // C
    { pad: [N.G3, N.D4, N.B3], arp: [N.G4, N.B3 + 12, N.D5, N.G5, N.D5, N.B3 + 12] }, // G
    { pad: [N.A3, N.E4, N.C4], arp: [N.A4, N.C5, N.E5, N.A5, N.E5, N.C5] }, // Am
    { pad: [N.F3, N.C4, N.A3], arp: [N.F4, N.A4, N.C5, N.F4 + 12, N.C5, N.A4] }, // F
  ]

  for (let b = 0; b < bars; b++) {
    const chord = prog[b % prog.length]
    const t0 = b * bar
    pad(buf, t0, bar + 0.1, chord.pad.map(midi), 0.5)
    // 8th-note arpeggio sprinkle
    for (let s = 0; s < 8; s++) {
      const note = chord.arp[s % chord.arp.length]
      const gain = s % 2 === 0 ? 0.34 : 0.22
      bell(buf, t0 + s * (beat / 2), midi(note), gain, 1.0)
    }
  }
  addDelay(buf, beat / 2, 0.32, 0.5)
  normalize(buf, 0.82)
  writeWav(join(OUT_DIR, "music.wav"), buf)
  console.log(`music.wav  ${(buf.length / SR).toFixed(1)}s`)
}

// ── SPARKLE: quick rising shimmer for reveals ──
{
  const dur = 0.75
  const buf = new Float32Array((dur * SR) | 0)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    const p = t / dur
    const env = Math.pow(1 - p, 1.6) * Math.min(1, p * 18)
    const f = 660 + p * 2400
    let v = Math.sin(2 * Math.PI * f * t)
    v += Math.sin(2 * Math.PI * f * 1.5 * t) * 0.4
    v += Math.sin(2 * Math.PI * f * 2.01 * t) * 0.25
    v += (Math.random() * 2 - 1) * 0.15 * (1 - p)
    buf[i] = v * env * 0.5
  }
  addDelay(buf, 0.06, 0.25, 0.4)
  normalize(buf, 0.8)
  writeWav(join(OUT_DIR, "sparkle.wav"), buf)
  console.log(`sparkle.wav  ${(buf.length / SR).toFixed(2)}s`)
}

// ── POP: soft bubble pop for number/heart accents ──
{
  const dur = 0.2
  const buf = new Float32Array((dur * SR) | 0)
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR
    const env = Math.exp(-t * 38)
    const f = 520 * Math.exp(-t * 9) + 130
    buf[i] = Math.sin(2 * Math.PI * f * t) * env * 0.8
  }
  normalize(buf, 0.75)
  writeWav(join(OUT_DIR, "pop.wav"), buf)
  console.log(`pop.wav  ${(buf.length / SR).toFixed(2)}s`)
}
