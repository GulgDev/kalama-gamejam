import { Level, parseLayout } from "./level";

export class Level4 extends Level {
  constructor() {
    super(
      1,
      parseLayout(`
......##
......%@
....&###
*.....$@
########
`)
    );
  }
}
