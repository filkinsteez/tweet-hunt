export type FrameRect = [x: number, y: number, w: number, h: number];

export const spriteAtlas = {
  meta: {
    image: "/sprites/tweet_hunt_sheet.png",
    size: { w: 375, h: 267 },
    coordinateSystem: "top-left pixels",
    format: "x y w h"
  },
  frames: {
    dog_walk_01: [5, 3, 53, 40],
    dog_walk_02: [66, 1, 51, 43],
    dog_walk_03: [126, 1, 52, 43],
    dog_walk_04: [184, 3, 55, 40],
    dog_walk_05: [245, 3, 53, 40],
    dog_hold_one: [332, 3, 43, 39],
    dog_found: [5, 59, 53, 48],
    dog_jump_01: [74, 60, 35, 46],
    dog_jump_02: [135, 67, 33, 32],
    dog_laugh_01: [197, 63, 29, 39],
    dog_laugh_02: [257, 63, 29, 39],
    dog_hold_two: [319, 63, 56, 39],

    bird_blue_side_01: [0, 121, 34, 24],
    bird_blue_side_02: [40, 123, 34, 20],
    bird_blue_side_03: [81, 119, 32, 28],
    bird_blue_diag_01: [4, 157, 25, 31],
    bird_blue_diag_02: [41, 158, 32, 29],
    bird_blue_diag_03: [83, 157, 27, 31],
    bird_blue_up_01: [5, 197, 24, 31],
    bird_blue_up_02: [41, 197, 32, 31],
    bird_blue_up_03: [82, 198, 30, 30],
    bird_blue_hit_01: [3, 238, 27, 29],
    bird_blue_fall_01: [48, 237, 18, 30],

    bird_green_side_01: [130, 121, 34, 24],
    bird_green_side_02: [170, 123, 34, 20],
    bird_green_side_03: [211, 119, 32, 28],
    bird_green_diag_01: [134, 157, 25, 31],
    bird_green_diag_02: [171, 158, 32, 29],
    bird_green_diag_03: [213, 157, 27, 31],
    bird_green_up_01: [135, 197, 24, 31],
    bird_green_up_02: [171, 197, 32, 31],
    bird_green_up_03: [212, 198, 30, 30],
    bird_green_hit_01: [133, 238, 27, 29],
    bird_green_fall_01: [178, 237, 18, 30],

    bird_red_side_01: [260, 121, 34, 24],
    bird_red_side_02: [300, 123, 34, 20],
    bird_red_side_03: [341, 119, 32, 28],
    bird_red_diag_01: [264, 157, 25, 31],
    bird_red_diag_02: [301, 158, 32, 29],
    bird_red_diag_03: [343, 157, 27, 31],
    bird_red_up_01: [265, 197, 24, 31],
    bird_red_up_02: [301, 197, 32, 31],
    bird_red_up_03: [342, 198, 30, 30],
    bird_red_hit_01: [263, 238, 27, 29],
    bird_red_fall_01: [308, 237, 18, 30]
  } satisfies Record<string, FrameRect>,
  animations: {
    dog_walk: ["dog_walk_01", "dog_walk_02", "dog_walk_03", "dog_walk_04", "dog_walk_05"],
    dog_flush: ["dog_found", "dog_jump_01", "dog_jump_02"],
    dog_laugh: ["dog_laugh_01", "dog_laugh_02"],
    dog_retrieve_one: ["dog_hold_one"],
    dog_retrieve_two: ["dog_hold_two"],

    bird_blue_side: ["bird_blue_side_01", "bird_blue_side_02", "bird_blue_side_03", "bird_blue_side_02"],
    bird_blue_diag: ["bird_blue_diag_01", "bird_blue_diag_02", "bird_blue_diag_03", "bird_blue_diag_02"],
    bird_blue_up: ["bird_blue_up_01", "bird_blue_up_02", "bird_blue_up_03", "bird_blue_up_02"],
    bird_blue_hit: ["bird_blue_hit_01"],
    bird_blue_fall: ["bird_blue_fall_01"],

    bird_green_side: ["bird_green_side_01", "bird_green_side_02", "bird_green_side_03", "bird_green_side_02"],
    bird_green_diag: ["bird_green_diag_01", "bird_green_diag_02", "bird_green_diag_03", "bird_green_diag_02"],
    bird_green_up: ["bird_green_up_01", "bird_green_up_02", "bird_green_up_03", "bird_green_up_02"],
    bird_green_hit: ["bird_green_hit_01"],
    bird_green_fall: ["bird_green_fall_01"],

    bird_red_side: ["bird_red_side_01", "bird_red_side_02", "bird_red_side_03", "bird_red_side_02"],
    bird_red_diag: ["bird_red_diag_01", "bird_red_diag_02", "bird_red_diag_03", "bird_red_diag_02"],
    bird_red_up: ["bird_red_up_01", "bird_red_up_02", "bird_red_up_03", "bird_red_up_02"],
    bird_red_hit: ["bird_red_hit_01"],
    bird_red_fall: ["bird_red_fall_01"]
  } satisfies Record<string, string[]>
};

export type FrameName = keyof typeof spriteAtlas.frames;
export type AnimationName = keyof typeof spriteAtlas.animations;

export function frameAt(animation: AnimationName, timeMs: number, fps = 10): FrameName {
  const frames = spriteAtlas.animations[animation];
  const index = Math.floor((timeMs / 1000) * fps) % frames.length;
  return frames[index] as FrameName;
}
