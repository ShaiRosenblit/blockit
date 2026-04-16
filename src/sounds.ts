const BASE = import.meta.env.BASE_URL;

const cache = new Map<string, HTMLAudioElement>();

function load(name: string): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`${BASE}sounds/${name}`);
    cache.set(name, audio);
  }
  return audio;
}

function play(name: string, volume = 0.5) {
  const audio = load(name);
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
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
