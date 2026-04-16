const BASE = import.meta.env.BASE_URL;

const SOUND_FILES = [
  'pickup.ogg',
  'place.ogg',
  'line-clear.ogg',
  'combo.ogg',
  'invalid-drop.ogg',
  'game-over.ogg',
] as const;

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
  pickup: () => play('pickup.ogg', 0.3),
  place: () => play('place.ogg', 0.4),
  lineClear: (count: number) => {
    if (count >= 2) {
      play('combo.ogg', 0.5);
    } else {
      play('line-clear.ogg', 0.45);
    }
  },
  invalidDrop: () => play('invalid-drop.ogg', 0.25),
  gameOver: () => play('game-over.ogg', 0.5),
};
