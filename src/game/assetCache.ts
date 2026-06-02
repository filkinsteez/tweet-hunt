import crtAsset from "../../Assets/CRT/crt_cold.jpg";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import chatGptGoldenBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_golden_birdsprite_fly.png";
import birdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/bird_shot.png";
import goldenBirdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/golden_bird_shot.png";
import clayBackgroundAsset from "../../Assets/Sprites/Clay/clay_bg.jpg";
import clayPortraitBackgroundAsset from "../../Assets/Sprites/Clay/clay_bg_9x16.jpg";
import clayFilledPigeonAsset from "../../Assets/Sprites/Clay/clay_filled_pigeon.jpg";
import clayHitAsset from "../../Assets/Sprites/Clay/clay_hit_counter.jpg";
import clayHitCounterFilledAsset from "../../Assets/Sprites/Clay/clay_hit_counter_filled.jpg";
import clayRoundAsset from "../../Assets/Sprites/Clay/clay_round_counter.jpg";
import clayScoreAsset from "../../Assets/Sprites/Clay/clay_score_counter.jpg";
import clayShotsAsset from "../../Assets/Sprites/Clay/clay_shot_counter.jpg";
import clayTargetAtlasAsset from "../../Assets/Sprites/Clay/clay_target_atlas.png";
import backgroundAsset from "../../Assets/Sprites/Environment/background.jpg";
import dogOneBirdAsset from "../../Assets/Sprites/Environment/dog_1bird.png";
import foregroundAsset from "../../Assets/Sprites/Environment/foreground.png";
import portraitBackgroundAsset from "../../Assets/Sprites/Environment/background_9x16.jpg";
import portraitGrassAsset from "../../Assets/Sprites/Environment/grass_9x16.png";
import portraitGroundAsset from "../../Assets/Sprites/Environment/ground_9x16.png";
import portraitTreeAsset from "../../Assets/Sprites/Environment/tree_9x16.png";
import midgroundAsset from "../../Assets/Sprites/Environment/midground.png";
import treeAsset from "../../Assets/Sprites/Environment/tree.png";
import ducksHitAsset from "../../Assets/Sprites/UI/UI_ducks_hit.jpg";
import ducksHitAtlasAsset from "../../Assets/Sprites/UI/UI_ducks_hit_atlas.jpg";
import roundAsset from "../../Assets/Sprites/UI/UI_round.jpg";
import roundAtlasAsset from "../../Assets/Sprites/UI/UI_round_atlas.jpg";
import scoreAsset from "../../Assets/Sprites/UI/UI_score.png";
import scoreAtlasAsset from "../../Assets/Sprites/UI/UI_score_atlas.jpg";
import shotsAsset from "../../Assets/Sprites/UI/UI_shots.jpg";
import titleSelectionAsset from "../../Assets/Sprites/UI/UI_title_selection.jpg";
import titleAsset from "../../Assets/Sprites/UI/title_v2.jpg";
import welcomePlayAsset from "../../Assets/Sprites/UI/welcome_screen_play.png";
import welcomeTitleAsset from "../../Assets/Sprites/UI/tweet_hunt_title.png";

export const TWEET_HUNT_SHEET_SRC = "/sprites/tweet_hunt_sheet.png";

const imagePromises = new Map<string, Promise<HTMLImageElement>>();
const loadedImages = new Map<string, HTMLImageElement>();
let pixelFontPromise: Promise<void> | null = null;
let pixelFontLoaded = false;

const INITIAL_IMAGE_SOURCES = [
  TWEET_HUNT_SHEET_SRC,
  crtAsset.src,
  titleAsset.src,
  titleSelectionAsset.src,
  welcomePlayAsset.src,
  welcomeTitleAsset.src,
  chatGptBirdFlyAsset.src,
  chatGptGoldenBirdFlyAsset.src,
  birdShotAsset.src,
  goldenBirdShotAsset.src,
  backgroundAsset.src,
  portraitBackgroundAsset.src,
  foregroundAsset.src,
  portraitGrassAsset.src,
  portraitGroundAsset.src,
  portraitTreeAsset.src,
  dogOneBirdAsset.src,
  midgroundAsset.src,
  treeAsset.src,
  clayBackgroundAsset.src,
  clayPortraitBackgroundAsset.src,
  clayFilledPigeonAsset.src,
  clayHitAsset.src,
  clayHitCounterFilledAsset.src,
  clayRoundAsset.src,
  clayScoreAsset.src,
  clayShotsAsset.src,
  clayTargetAtlasAsset.src,
  ducksHitAsset.src,
  ducksHitAtlasAsset.src,
  roundAsset.src,
  roundAtlasAsset.src,
  scoreAsset.src,
  scoreAtlasAsset.src,
  shotsAsset.src
] as const;

export function getLoadedImage(src: string) {
  return loadedImages.get(src);
}

export function loadImage(src: string) {
  const loaded = loadedImages.get(src);
  if (loaded) return Promise.resolve(loaded);

  const cached = imagePromises.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      loadedImages.set(src, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Could not preload image: ${src}`));
    image.src = src;
  });

  imagePromises.set(src, promise);
  return promise;
}

export function isPixelFontLoaded() {
  return pixelFontLoaded;
}

export function loadPixelFont() {
  if (pixelFontLoaded) return Promise.resolve();
  if (pixelFontPromise) return pixelFontPromise;

  if (typeof document === "undefined" || !("fonts" in document)) {
    pixelFontLoaded = true;
    return Promise.resolve();
  }

  pixelFontPromise = document.fonts
    .load("16px 'Press Start 2P'")
    .then(() => document.fonts.ready)
    .catch(() => undefined)
    .then(() => {
      pixelFontLoaded = true;
    });

  return pixelFontPromise;
}

export async function preloadInitialGameAssets() {
  await Promise.all([
    loadPixelFont(),
    ...Array.from(new Set(INITIAL_IMAGE_SOURCES)).map((src) => loadImage(src).catch(() => undefined))
  ]);
}
