import * as w4 from "./wasm4";
import { MusicPlayer } from "./util/music-player";

export function levelCompletedSfx(): StaticArray<MusicPlayer> {
  const sequence: StaticArray<u32> = [64, 65, 67, 69, 0, 67, 69];
  return [
    new MusicPlayer(10, 50, w4.TONE_PULSE1 | w4.TONE_MODE3, false, sequence),
    new MusicPlayer(
      10,
      50,
      w4.TONE_PULSE2 | w4.TONE_MODE4,
      false,
      StaticArray.fromArray(
        sequence.map<u32>((note) => (note === 0 ? 0 : note + 4))
      )
    ),
  ];
}

export function backgroundMusic(): StaticArray<MusicPlayer> {
  const sequence: StaticArray<u32> = [0 /* TODO */];
  return [
    new MusicPlayer(10, 30, w4.TONE_TRIANGLE | w4.TONE_MODE1, true, sequence),
  ];
}
