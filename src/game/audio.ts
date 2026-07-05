export type GameSoundKey =
  | "clayShootingIntro"
  | "clayPigeonFlying"
  | "clayPigeonHit"
  | "clayPigeonLaunch"
  | "dogBark"
  | "dogLaugh"
  | "dogRetrieve"
  | "duckHuntTitle"
  | "duckFalling"
  | "duckFlying"
  | "duckGroundHit"
  | "duckQuack"
  | "failedRound"
  | "gameOver"
  | "gameStart"
  | "gunShoot"
  | "perfectRound"
  | "roundClear";

const SOUND_URLS: Record<GameSoundKey, string> = {
  clayShootingIntro: new URL("../../Assets/Audio/clay_shooting_intro.wav", import.meta.url).href,
  clayPigeonFlying: new URL("../../Assets/Audio/clay_pigeon_flying.wav", import.meta.url).href,
  clayPigeonHit: new URL("../../Assets/Audio/clay_pigeon_hit.wav", import.meta.url).href,
  clayPigeonLaunch: new URL("../../Assets/Audio/clay_pigeon_launch.wav", import.meta.url).href,
  dogBark: new URL("../../Assets/Audio/dog_bark.wav", import.meta.url).href,
  dogLaugh: new URL("../../Assets/Audio/dog_laugh.wav", import.meta.url).href,
  dogRetrieve: new URL("../../Assets/Audio/dog_retrieve.wav", import.meta.url).href,
  duckHuntTitle: new URL("../../Assets/Audio/duck_hunt_title.wav", import.meta.url).href,
  duckFalling: new URL("../../Assets/Audio/duck_falling.wav", import.meta.url).href,
  duckFlying: new URL("../../Assets/Audio/duck_flying.wav", import.meta.url).href,
  duckGroundHit: new URL("../../Assets/Audio/duck_ground_hit.wav", import.meta.url).href,
  duckQuack: new URL("../../Assets/Audio/duck_quack.wav", import.meta.url).href,
  failedRound: new URL("../../Assets/Audio/failed_round.wav", import.meta.url).href,
  gameOver: new URL("../../Assets/Audio/game_over.wav", import.meta.url).href,
  gameStart: new URL("../../Assets/Audio/game_start.wav", import.meta.url).href,
  gunShoot: new URL("../../Assets/Audio/gun_shoot.wav", import.meta.url).href,
  perfectRound: new URL("../../Assets/Audio/perfect_round.wav", import.meta.url).href,
  roundClear: new URL("../../Assets/Audio/round_clear.wav", import.meta.url).href
};

const MAX_CONCURRENT_PER_KEY = 4;

type ActiveSound = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Game SFX on the Web Audio API. HTMLAudioElement playback goes through the
 * system media pipeline and blocks the main thread on iOS Safari (rapid-fire
 * sounds like wing flaps drop gameplay to single-digit fps); decoded
 * AudioBuffers played through AudioBufferSourceNodes are effectively free.
 *
 * iOS specifics this class must handle:
 * - Web Audio output is muted by the ringer/silent switch unless the page's
 *   audio session is promoted to "playback" (HTMLAudioElement got that for
 *   free, so the old sound system was audible in silent mode).
 * - The AudioContext starts suspended until resumed inside a user gesture,
 *   and iOS can re-suspend/interrupt it on backgrounding or calls, so every
 *   gesture and page-visibility change is treated as a chance to resume.
 */
class GameAudio {
  private context: AudioContext | null = null;
  private readonly buffers = new Map<GameSoundKey, AudioBuffer>();
  private readonly bufferRequests = new Map<GameSoundKey, Promise<AudioBuffer | null>>();
  private readonly activeSounds = new Map<GameSoundKey, Set<ActiveSound>>();
  private readonly loops = new Map<GameSoundKey, ActiveSound>();
  private readonly pendingLoopVolumes = new Map<GameSoundKey, number>();
  private readonly warned = new Set<string>();
  private unlocked = false;
  private initialized = false;
  private generation = 0;

  constructor() {
    if (typeof window === "undefined") return;
    this.initialize();
  }

  play(key: GameSoundKey, volume = 0.75) {
    if (typeof window === "undefined") return;
    this.initialize();
    if (!this.unlocked) return;

    this.withBuffer(key, (buffer) => this.startSound(key, buffer, volume));
  }

  /**
   * Like play(), but skips instead of stealing the oldest instance when the
   * per-sound concurrency cap is reached. Matches the old HTMLAudioElement
   * pool semantics: overlapping instances are allowed (the intro dog bark
   * relies on this to layer barks faster than one bark can finish).
   */
  playIfIdle(key: GameSoundKey, volume = 0.75) {
    if (typeof window === "undefined") return;
    this.initialize();
    if (!this.unlocked) return;
    if ((this.activeSounds.get(key)?.size ?? 0) >= MAX_CONCURRENT_PER_KEY) return;

    this.withBuffer(key, (buffer) => {
      if ((this.activeSounds.get(key)?.size ?? 0) >= MAX_CONCURRENT_PER_KEY) return;
      this.startSound(key, buffer, volume);
    });
  }

  startLoop(key: GameSoundKey, volume = 0.55) {
    if (typeof window === "undefined") return;
    this.initialize();
    if (!this.unlocked) return;
    if (this.loops.has(key) || this.pendingLoopVolumes.has(key)) return;

    const buffer = this.buffers.get(key);
    if (buffer) {
      this.startLoopSound(key, buffer, volume);
      return;
    }

    this.pendingLoopVolumes.set(key, volume);
    const generation = this.generation;
    void this.loadBuffer(key).then((loaded) => {
      const pendingVolume = this.pendingLoopVolumes.get(key);
      this.pendingLoopVolumes.delete(key);
      if (!loaded || generation !== this.generation || pendingVolume === undefined) return;
      if (this.loops.has(key)) return;
      this.startLoopSound(key, loaded, pendingVolume);
    });
  }

  stopLoop(key: GameSoundKey) {
    this.pendingLoopVolumes.delete(key);
    const active = this.loops.get(key);
    if (!active) return;
    this.loops.delete(key);
    stopSound(active);
  }

  stopAll() {
    if (typeof window === "undefined") return;
    this.generation += 1;
    this.pendingLoopVolumes.clear();

    for (const sounds of this.activeSounds.values()) {
      for (const active of sounds) stopSound(active);
      sounds.clear();
    }

    for (const active of this.loops.values()) stopSound(active);
    this.loops.clear();
  }

  unlock() {
    if (typeof window === "undefined") return;
    this.initialize();
    this.unlocked = true;
    this.configureAudioSession();
    this.resumeContext();
  }

  /** Snapshot of the audio pipeline for debugging silent output in the field. */
  debugState() {
    return {
      initialized: this.initialized,
      unlocked: this.unlocked,
      contextState: this.context?.state ?? "no-context",
      sampleRate: this.context?.sampleRate ?? 0,
      buffersLoaded: this.buffers.size,
      totalSounds: Object.keys(SOUND_URLS).length,
      pendingRequests: this.bufferRequests.size,
      activeLoops: [...this.loops.keys()],
      audioSessionType:
        typeof navigator === "undefined" ? "no-navigator" : ((navigator as AudioSessionNavigator).audioSession?.type ?? "unsupported"),
      warnings: [...this.warned]
    };
  }

  private initialize() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.configureAudioSession();

    for (const key of Object.keys(SOUND_URLS) as GameSoundKey[]) {
      void this.loadBuffer(key);
    }

    // Deliberately not `once: true`: iOS can re-suspend the context after the
    // first unlock (silent switch, backgrounding, calls), and a single failed
    // resume must not permanently kill audio. Resuming a running context is a
    // no-op, so re-running unlock on every gesture is free.
    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    window.addEventListener("touchstart", unlock, { capture: true });

    const resumeIfVisible = () => {
      if (document.visibilityState === "visible" && this.unlocked) this.resumeContext();
    };
    document.addEventListener("visibilitychange", resumeIfVisible);
    window.addEventListener("pageshow", resumeIfVisible);
    window.addEventListener("focus", resumeIfVisible);
  }

  /**
   * Route this page's audio through the media "playback" session so Web Audio
   * output ignores the iOS ringer/silent switch, matching the behavior of the
   * HTMLAudioElement-based sound system this replaced.
   */
  private configureAudioSession() {
    try {
      const session = (navigator as AudioSessionNavigator).audioSession;
      if (session && session.type !== "playback") session.type = "playback";
    } catch (error) {
      this.warnOnce("audio-session", error);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;

    const Constructor =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) {
      this.warnOnce("no-audiocontext");
      return null;
    }

    try {
      this.context = new Constructor();
    } catch (error) {
      this.warnOnce("context-create", error);
      return null;
    }
    return this.context;
  }

  private resumeContext() {
    const context = this.ensureContext();
    if (!context) return;
    // Covers "suspended" plus iOS's nonstandard "interrupted" state.
    if (context.state === "running") return;
    void context.resume().catch((error) => this.warnOnce("context-resume", error));
  }

  private withBuffer(key: GameSoundKey, onReady: (buffer: AudioBuffer) => void) {
    const cached = this.buffers.get(key);
    if (cached) {
      onReady(cached);
      return;
    }

    const generation = this.generation;
    void this.loadBuffer(key).then((buffer) => {
      if (!buffer || generation !== this.generation) return;
      onReady(buffer);
    });
  }

  private loadBuffer(key: GameSoundKey): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = this.bufferRequests.get(key);
    if (pending) return pending;

    const request = (async () => {
      try {
        const context = this.ensureContext();
        if (!context) return null;

        const response = await fetch(SOUND_URLS[key]);
        if (!response.ok) {
          this.warnOnce(`fetch-${key}:${response.status}`);
          return null;
        }

        const data = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(data);
        this.buffers.set(key, buffer);
        return buffer;
      } catch (error) {
        this.warnOnce(`load-${key}`, error);
        return null;
      } finally {
        this.bufferRequests.delete(key);
      }
    })();

    this.bufferRequests.set(key, request);
    return request;
  }

  private startSound(key: GameSoundKey, buffer: AudioBuffer, volume: number) {
    const context = this.ensureContext();
    if (!context) return;
    this.resumeContext();

    let sounds = this.activeSounds.get(key);
    if (!sounds) {
      sounds = new Set();
      this.activeSounds.set(key, sounds);
    }

    if (sounds.size >= MAX_CONCURRENT_PER_KEY) {
      const oldest = sounds.values().next().value;
      if (oldest) {
        sounds.delete(oldest);
        stopSound(oldest);
      }
    }

    const active = createSound(context, buffer, volume, false);
    if (!active) return;

    sounds.add(active);
    active.source.onended = () => {
      sounds.delete(active);
      disconnectSound(active);
    };

    try {
      active.source.start();
    } catch (error) {
      this.warnOnce("source-start", error);
      sounds.delete(active);
      disconnectSound(active);
    }
  }

  private startLoopSound(key: GameSoundKey, buffer: AudioBuffer, volume: number) {
    const context = this.ensureContext();
    if (!context) return;
    this.resumeContext();

    const active = createSound(context, buffer, volume, true);
    if (!active) return;

    this.loops.set(key, active);
    try {
      active.source.start();
    } catch (error) {
      this.warnOnce("loop-start", error);
      this.loops.delete(key);
      disconnectSound(active);
    }
  }

  private warnOnce(scope: string, error?: unknown) {
    if (this.warned.has(scope)) return;
    this.warned.add(scope);
    console.warn(`[game-audio] ${scope}`, error ?? "");
  }
}

function createSound(context: AudioContext, buffer: AudioBuffer, volume: number, loop: boolean): ActiveSound | null {
  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = context.createGain();
    gain.gain.value = Math.min(Math.max(volume, 0), 1);

    source.connect(gain);
    gain.connect(context.destination);
    return { source, gain };
  } catch {
    return null;
  }
}

function stopSound(active: ActiveSound) {
  active.source.onended = null;
  try {
    active.source.stop();
  } catch {
    // Sources that never started throw; audio should never break gameplay.
  }
  disconnectSound(active);
}

function disconnectSound(active: ActiveSound) {
  try {
    active.source.disconnect();
    active.gain.disconnect();
  } catch {
    // Audio should never break gameplay.
  }
}

export const gameAudio = new GameAudio();

// Field-debug handle: run `__gameAudio.debugState()` in the browser console to
// see exactly which stage of the audio pipeline is failing.
if (typeof window !== "undefined") {
  (window as unknown as { __gameAudio?: GameAudio }).__gameAudio = gameAudio;
}
