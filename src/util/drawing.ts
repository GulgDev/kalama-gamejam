import * as w4 from "../wasm4";

export function drawRoundedRect(
  x: i32,
  y: i32,
  width: u32,
  height: u32,
  radius: u32
): void {
  const diameter = radius * 2;

  const drawColors = load<u16>(w4.DRAW_COLORS);

  w4.oval(x, y, diameter, diameter);
  w4.oval(x + width - diameter, y, diameter, diameter);
  w4.oval(x, y + height - diameter, diameter, diameter);
  w4.oval(x + width - diameter, y + height - diameter, diameter, diameter);

  store<u16>(w4.DRAW_COLORS, drawColors & 0xf);
  w4.rect(x + radius, y, width - radius * 2, height);
  w4.rect(x, y + radius, width, height - radius * 2);

  store<u16>(w4.DRAW_COLORS, drawColors >> 4);
  w4.hline(x + radius, y, width - radius * 2);
  w4.hline(x + radius, y + height - 1, width - radius * 2);
  w4.vline(x, y + radius, height - radius * 2);
  w4.vline(x + width - 1, y + radius, height - radius * 2);

  store<u16>(w4.DRAW_COLORS, drawColors);
}
