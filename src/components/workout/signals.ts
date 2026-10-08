"use client";

// Small physical signals that make the clock felt without looking: a short
// buzz and a beep. Both are optional and fail silently where unsupported.

const MUTE_KEY = "hm-sound-off";
let audio: AudioContext | null = null;

export function soundOff(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setSoundOff(off: boolean): void {
  try { localStorage.setItem(MUTE_KEY, off ? "1" : "0"); } catch { /* storage may be unavailable */ }
}

/** Call from a press: browsers only allow sound after the player touched the page. */
export function unlockSound(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch { /* no audio on this device */ }
}

export function beep(kind: "tick" | "go" | "done"): void {
  if (!audio || soundOff()) return;
  try {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const length = kind === "tick" ? 0.09 : 0.28;
    oscillator.frequency.value = kind === "tick" ? 660 : kind === "go" ? 990 : 520;
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + length);
  } catch { /* sound is a nicety */ }
}

export function buzz(pattern: number | number[] = 30): void {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}
