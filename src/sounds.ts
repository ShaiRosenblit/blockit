const BASE = import.meta.env.BASE_URL;
const STORAGE_KEY = 'blockit-sound';

const SOUND_FILES = [
  'pickup.mp3',
  'place.mp3',
  'rotate.mp3',
  'line-clear.mp3',
  'combo.mp3',
  'invalid-drop.mp3',
  'game-over.mp3',
  'celebrate.mp3',
] as const;

let muted = localStorage.getItem(STORAGE_KEY) !== 'on';

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
let unlocked = false;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function preload() {
  const ac = getContext();
  for (const name of SOUND_FILES) {
    if (buffers.has(name)) continue;
    fetch(`${BASE}sounds/${name}`)
      .then((r) => r.arrayBuffer())
      .then((data) => ac.decodeAudioData(data))
      .then((buf) => buffers.set(name, buf))
      .catch(() => {});
  }
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  const ac = getContext();
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  preload();
  for (const evt of ['pointerdown', 'touchstart', 'keydown'] as const) {
    document.removeEventListener(evt, unlock, true);
  }
}

for (const evt of ['pointerdown', 'touchstart', 'keydown'] as const) {
  document.addEventListener(evt, unlock, { capture: true, once: false });
}

function play(name: string, volume = 0.5) {
  if (muted) return;

  const ac = getContext();
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const buffer = buffers.get(name);
  if (!buffer) return;

  const source = ac.createBufferSource();
  source.buffer = buffer;

  const gain = ac.createGain();
  gain.gain.value = volume;

  source.connect(gain).connect(ac.destination);
  source.start(0);
}

export const sounds = {
  isMuted: () => muted,
  setMuted: (value: boolean) => {
    muted = value;
    localStorage.setItem(STORAGE_KEY, value ? 'off' : 'on');
    if (!value && !unlocked) unlock();
  },
  pickup: () => play('pickup.mp3', 0.5),
  place: () => play('place.mp3', 0.6),
  rotate: () => play('rotate.mp3', 0.45),
  lineClear: (count: number) => {
    if (count >= 2) {
      play('combo.mp3', 0.7);
    } else {
      play('line-clear.mp3', 0.65);
    }
  },
  invalidDrop: () => play('invalid-drop.mp3', 0.35),
  gameOver: () => play('game-over.mp3', 0.6),
  /**
   * Riddle-solve celebration. A bespoke ascending arpeggio + bell-chord
   * fanfare; volume scales with intensity so tutorial solves stay gentle and
   * the hardest riddle lands with a full, ringing reward.
   */
  celebrate: (intensity: number) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    const volume = 0.5 + clamped * 0.4;
    play('celebrate.mp3', volume);
  },
};
