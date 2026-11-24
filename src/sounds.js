// Escape Room sound effects, made with the browser's Web Audio API (no audio files). Used only on the
// projector. Browsers allow sound only after someone has clicked on the page, which the leader has done
// by the time a game is running.

const SOUND_KEY = 'pltlEscapeSound'
let audio = null

function context() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  return audio
}

// One tone: frequency (Hz), start offset and length (seconds), waveform, loudness
function tone(ctx, frequency, start, length, type = 'square', volume = 0.12) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + length + 0.05)
}

export function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // storage blocked: the setting lasts until the page reloads
  }
  if (on) context()
}

// A team escaped: a rising fanfare, then a two-tone alert for the countdown starting
export function playEscape() {
  const ctx = context()
  if (!ctx) return
  ;[523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.12, 0.22, 'square', 0.1))
  tone(ctx, 1047, 0.5, 0.5, 'triangle', 0.14)
  ;[880, 660, 880, 660].forEach((f, i) => tone(ctx, f, 1.15 + i * 0.28, 0.24, 'sawtooth', 0.06))
}

// Another team escaped while the countdown is already running: a short fanfare
export function playTeamOut() {
  const ctx = context()
  if (!ctx) return
  ;[659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.1, 0.18, 'square', 0.09))
}

// The last 10 seconds: a tick each second (higher in the last 3)
export function playTick(secondsLeft) {
  const ctx = context()
  if (!ctx) return
  tone(ctx, secondsLeft <= 3 ? 1320 : 990, 0, 0.08, 'square', 0.08)
}

// Time's up: a low lockdown buzzer
export function playLockdown() {
  const ctx = context()
  if (!ctx) return
  tone(ctx, 110, 0, 1.1, 'sawtooth', 0.16)
  tone(ctx, 82, 0, 1.1, 'square', 0.08)
  tone(ctx, 110, 1.25, 0.9, 'sawtooth', 0.14)
}
