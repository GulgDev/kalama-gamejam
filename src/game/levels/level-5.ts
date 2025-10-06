import { Level, parseLayout } from "./level";

export class Level5 extends Level {
  constructor() {
    super(
      1,
      parseLayout(`
*............
###&$$#%%####
#.....#.....#
#..#######..#
#.....#.....#
####..#..####
#.....#.....#
#..#######..#
#....#@..#..#
###..##$$#..#
#@%.........#
#############
`)
    );
  }
}
