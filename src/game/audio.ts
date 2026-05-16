export type GameSoundKey =
  | "clayPigeonFlying"
  | "clayPigeonHit"
  | "clayPigeonLaunch"
  | "dogBark"
  | "dogLaugh"
  | "dogRetrieve"
  | "duckFalling"
  | "duckFlying"
  | "duckGroundHit"
  | "duckHit"
  | "duckQuack"
  | "perfectRound";

const SOUND_URLS: Record<GameSoundKey, string> = {
  clayPigeonFlying: new URL("../../Assets/Audio/clay_pigeon_flying.wav", import.meta.url).href,
  clayPigeonHit: new URL("../../Assets/Audio/clay_pigeon_hit.wav", import.meta.url).href,
  clayPigeonLaunch: new URL("../../Assets/Audio/clay_pigeon_launch.wav", import.meta.url).href,
  dogBark: new URL("../../Assets/Audio/dog_bark.wav", import.meta.url).href,
  dogLaugh: new URL("../../Assets/Audio/dog_laugh.wav", import.meta.url).href,
  dogRetrieve: new URL("../../Assets/Audio/dog_retrieve.wav", import.meta.url).href,
  duckFalling: new URL("../../Assets/Audio/duck_falling.wav", import.meta.url).href,
  duckFlying: new URL("../../Assets/Audio/duck_flying.wav", import.meta.url).href,
  duckGroundHit: new URL("../../Assets/Audio/duck_ground_hit.wav", import.meta.url).href,
  duckHit: new URL("../../Assets/Audio/duck_hit.wav", import.meta.url).href,
  duckQuack: new URL("../../Assets/Audio/duck_quack.wav", import.meta.url).href,
  perfectRound: new URL("../../Assets/Audio/perfect_round.wav", import.meta.url).href
};

const POOL_SIZE = 4;

class GameAudio {
  private readonly pools = new Map<GameSoundKey, HTMLAudioElement[]>();
  private readonly loops = new Map<GameSoundKey, HTMLAudioElement>();
  private unlocked = false;
  private initialized = false;

  constructor() {
    if (typeof window === "undefined") return;
    this.initialize();
  }

  play(key: GameSoundKey, volume = 0.75) {
    if (typeof window === "undefined") return;
    this.initialize();
    if (!this.unlocked) return;

    const pool = this.pools.get(key);
    if (!pool || pool.length === 0) return;

    const audio = pool.find((candidate) => candidate.paused || candidate.ended) ?? pool[0];
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;
      void audio.play().catch(() => undefined);
    } catch {
      // Audio should never break gameplay.
    }
  }

  startLoop(key: GameSoundKey, volume = 0.55) {
    if (typeof window === "undefined") return;
    this.initialize();
    if (!this.unlocked) return;
    if (this.loops.has(key)) return;

    const audio = new Audio(SOUND_URLS[key]);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    this.loops.set(key, audio);
    void audio.play().catch(() => {
      this.loops.delete(key);
    });
  }

  stopLoop(key: GameSoundKey) {
    const audio = this.loops.get(key);
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Audio should never break gameplay.
    } finally {
      this.loops.delete(key);
    }
  }

  unlock() {
    if (typeof window === "undefined") return;
    this.initialize();
    this.unlocked = true;
  }

  private initialize() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    for (const [key, src] of Object.entries(SOUND_URLS) as Array<[GameSoundKey, string]>) {
      const pool = Array.from({ length: POOL_SIZE }, () => {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
      });
      this.pools.set(key, pool);
    }

    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    window.addEventListener("touchstart", unlock, { once: true, capture: true });
  }
}

export const gameAudio = new GameAudio();
