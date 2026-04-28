# Sprite map

The prototype uses one uploaded sprite sheet:

```txt
public/sprites/tweet_hunt_sheet.png
```

Coordinates use a top-left origin and `[x, y, width, height]`.

## Dog frames

```txt
dog_walk_01     [5,   3, 53, 40]
dog_walk_02     [66,  1, 51, 43]
dog_walk_03     [126, 1, 52, 43]
dog_walk_04     [184, 3, 55, 40]
dog_walk_05     [245, 3, 53, 40]
dog_hold_one    [332, 3, 43, 39]
dog_found       [5,  59, 53, 48]
dog_jump_01     [74, 60, 35, 46]
dog_jump_02     [135,67, 33, 32]
dog_laugh_01    [197,63, 29, 39]
dog_laugh_02    [257,63, 29, 39]
dog_hold_two    [319,63, 56, 39]
```

## Bird frame groups

Blue bird frames are at x range 0 to 113.
Green bird frames are at x range 130 to 243.
Red bird frames are at x range 260 to 373.

Each color includes side, diagonal, upward, hit, and fall frames.

The atlas is implemented in:

```txt
src/game/atlas.ts
```

## Reference images

Additional uploaded reference crops are included at:

```txt
public/sprites/reference/annotated_sprite_sheet.png
public/sprites/reference/dog_frames_reference.png
public/sprites/reference/bird_frames_reference.png
```
