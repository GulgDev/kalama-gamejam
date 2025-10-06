import { World } from "../world";
import { Finale } from "./finale";
import { Level } from "./level";
import { Level1 } from "./level-1";
import { Level2 } from "./level-2";
import { Level3 } from "./level-3";
import { Level4 } from "./level-4";
import { Level5 } from "./level-5";
import { Level6 } from "./level-6";
import { Level7 } from "./level-7";
import { Level8 } from "./level-8";
import { Level9 } from "./level-9";

export const LEVEL_COUNT: u32 = 9;

export function createLevel(level: u32, world: World): Level {
  switch (level) {
    case 0:
      return new Level1(world);
    case 1:
      return new Level2();
    case 2:
      return new Level3();
    case 3:
      return new Level4();
    case 4:
      return new Level5();
    case 5:
      return new Level6();
    case 6:
      return new Level7();
    case 7:
      return new Level8();
    case 8:
      return new Level9();
    case 9:
      return new Finale(world);
    default:
      return unreachable();
  }
}
