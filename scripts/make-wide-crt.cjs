const sharp = require("sharp");
const path = require("path");

async function main() {
  const input = path.join("Assets", "CRT", "crt_cold.jpg");
  const output = path.join("Assets", "CRT", "crt_cold_wide.jpg");
  const meta = await sharp(input).metadata();
  const height = meta.height ?? 1024;
  const width = meta.width ?? 1024;
  const targetWidth = Math.round((height * 16) / 10);
  const sidePad = Math.max(0, Math.round((targetWidth - width) / 2));
  const stripWidth = Math.min(140, width);

  const [leftStrip, rightStrip, center] = await Promise.all([
    sharp(input)
      .extract({ left: 0, top: 0, width: stripWidth, height })
      .blur(1.2)
      .extend({
        left: sidePad - stripWidth,
        background: { r: 12, g: 16, b: 24 }
      })
      .resize(sidePad, height)
      .toBuffer(),
    sharp(input)
      .extract({ left: width - stripWidth, top: 0, width: stripWidth, height })
      .blur(1.2)
      .extend({
        right: sidePad - stripWidth,
        background: { r: 12, g: 16, b: 24 }
      })
      .resize(sidePad, height)
      .toBuffer(),
    sharp(input).toBuffer()
  ]);

  await sharp({
    create: {
      width: targetWidth,
      height,
      channels: 3,
      background: { r: 12, g: 16, b: 24 }
    }
  })
    .composite([
      { input: leftStrip, left: 0, top: 0 },
      { input: center, left: sidePad, top: 0 },
      { input: rightStrip, left: sidePad + width, top: 0 }
    ])
    .jpeg({ quality: 92 })
    .toFile(output);

  console.log(`Wrote ${output} (${targetWidth}x${height})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
