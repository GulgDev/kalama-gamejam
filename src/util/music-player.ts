import * as w4 from "../wasm4";

export class MusicPlayer {
  constructor(
    private readonly noteDuration: u32,
    private readonly volume: u32,
    private readonly flags: u32,
    private readonly loop: boolean,
    private readonly notes: StaticArray<u32>
  ) {}

  private frame: u32 = 0;
  update(): boolean {
    if (this.frame % this.noteDuration === 0) {
      let i = this.frame / this.noteDuration;
      if (i === this.notes.length)
        if (this.loop) i = this.frame = 0;
        else return true;
      if (this.notes[i] !== 0)
        w4.tone(
          this.notes[i],
          (1 << 16) | (1 << 8) | (this.noteDuration - 2),
          this.volume | (this.volume << 8),
          this.flags | w4.TONE_NOTE_MODE
        );
    }
    ++this.frame;
    return false;
  }
}
