import { Level, parseLayout } from "./level";

export class Level3 extends Level {
  constructor() {
    super(
      3,
      parseLayout(`
..####
......
.....@
..&###
......
.....@
..####
......
*....@
######
`)
    );
  }
}
