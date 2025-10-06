import { Level, parseLayout } from "./level";

export class Level2 extends Level {
  constructor() {
    super(
      2,
      parseLayout(`
.......@..@
...&#######
*.....@#...
###&####...
`)
    );
  }
}
