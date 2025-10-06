import * as w4 from "../../wasm4";
import {
  frog,
  frog_eyes,
  frog_eyesFlags,
  frog_eyesHeight,
  frog_eyesWidth,
  frog_falling,
  frog_falling_eyes,
  frog_falling_eyesFlags,
  frog_falling_eyesHeight,
  frog_falling_eyesWidth,
  frog_fallingFlags,
  frog_fallingHeight,
  frog_fallingWidth,
  frog_jumping,
  frog_jumping_eyes,
  frog_jumping_eyesFlags,
  frog_jumping_eyesHeight,
  frog_jumping_eyesWidth,
  frog_jumpingFlags,
  frog_jumpingHeight,
  frog_jumpingWidth,
  frog_sleeping_1,
  frog_sleeping_1_eyes,
  frog_sleeping_1_eyesFlags,
  frog_sleeping_1_eyesHeight,
  frog_sleeping_1_eyesWidth,
  frog_sleeping_1Flags,
  frog_sleeping_1Height,
  frog_sleeping_1Width,
  frog_sleeping_2,
  frog_sleeping_2_eyes,
  frog_sleeping_2_eyesFlags,
  frog_sleeping_2_eyesHeight,
  frog_sleeping_2_eyesWidth,
  frog_sleeping_2Flags,
  frog_sleeping_2Height,
  frog_sleeping_2Width,
  frog_walking_1,
  frog_walking_1Flags,
  frog_walking_1Height,
  frog_walking_1Width,
  frog_walking_2,
  frog_walking_2Flags,
  frog_walking_2Height,
  frog_walking_2Width,
  frog_walking_eyes,
  frog_walking_eyesFlags,
  frog_walking_eyesHeight,
  frog_walking_eyesWidth,
  frogFlags,
  frogHeight,
  frogWidth,
} from "../../sprites";
import { TILE_SIZE, TileType, World } from "../world";
import { Body } from "../body";

const SPEED: f32 = 1.1;
const JUMP_POWER: f32 = 2.2;

enum CharacterState {
  IDLE,
  WALKING,
  JUMPING,
  FALLING,
  SLEEPING,
  WOKEN_UP,
}

const CHARACTER_TRANSITIONS: Map<
  CharacterState,
  StaticArray<CharacterState>
> = new Map();
CHARACTER_TRANSITIONS.set(CharacterState.IDLE, [
  CharacterState.SLEEPING,
  CharacterState.WALKING,
  CharacterState.JUMPING,
  CharacterState.FALLING,
]);
CHARACTER_TRANSITIONS.set(CharacterState.WALKING, [
  CharacterState.IDLE,
  CharacterState.JUMPING,
  CharacterState.FALLING,
]);
CHARACTER_TRANSITIONS.set(CharacterState.JUMPING, [
  CharacterState.IDLE,
  CharacterState.FALLING,
]);
CHARACTER_TRANSITIONS.set(CharacterState.FALLING, [
  CharacterState.IDLE,
  CharacterState.WALKING,
]);
CHARACTER_TRANSITIONS.set(CharacterState.SLEEPING, [CharacterState.WOKEN_UP]);
CHARACTER_TRANSITIONS.set(CharacterState.WOKEN_UP, [CharacterState.IDLE]);

const GOD_MODE = false; // enables flight

export class Character extends Body<CharacterState> {
  constructor(
    world: World,
    x: f32,
    y: f32,
    public readonly isPrimary: boolean
  ) {
    super(world, x, y, CharacterState.IDLE, CHARACTER_TRANSITIONS);
  }

  private processInput(): void {
    const gamepad = load<u8>(w4.GAMEPAD1);
    if (gamepad & w4.BUTTON_LEFT) this.vx = -SPEED;
    if (gamepad & w4.BUTTON_RIGHT) this.vx = SPEED;
    if (GOD_MODE) {
      if (gamepad & w4.BUTTON_UP) this.vy = -SPEED;
      if (gamepad & w4.BUTTON_DOWN) this.vy = SPEED;
    } else {
      if (gamepad & w4.BUTTON_UP) {
        if (this.setState(CharacterState.JUMPING)) this.vy -= JUMP_POWER;
      }
    }
  }

  protected onStateChanged(
    newState: CharacterState,
    oldState: CharacterState
  ): void {
    switch (newState) {
      case CharacterState.JUMPING:
        w4.tone(
          700 | (780 << 16),
          (5 << 16) | (10 << 8),
          50,
          w4.TONE_MODE2 | w4.TONE_TRIANGLE
        );
        break;
    }
    if (oldState === CharacterState.FALLING) {
      w4.tone(
        70 | (70 << 16),
        (1 << 8) | 1,
        60,
        w4.TONE_MODE1 | w4.TONE_TRIANGLE
      );
    }
  }

  getTileAt(): TileType {
    return this.world.getTileAt(
      <u32>nearest(this.x / <f32>TILE_SIZE - 0.5),
      <u32>nearest(this.y / <f32>TILE_SIZE - 0.5)
    );
  }

  getTileBelow(): TileType {
    return this.world.getTileAt(
      <u32>nearest(this.x / <f32>TILE_SIZE - 0.5),
      <u32>nearest(this.y / <f32>TILE_SIZE + 0.5)
    );
  }

  sleep(): void {
    assert(this.setState(CharacterState.SLEEPING));
  }

  wakeUp(): void {
    assert(
      this.state === CharacterState.SLEEPING &&
        this.setState(CharacterState.WOKEN_UP)
    );
  }

  private prevVy: f32 = this.vy;
  update(): void {
    this.vx = 0;
    if (GOD_MODE) this.vy = 0;
    if (this.world.acceptInput) this.processInput();

    super.update();

    if (this.vy > 0) this.setState(CharacterState.FALLING);
    else if (this.vy === 0 && this.prevVy === 0)
      this.setState(
        this.vx === 0 ? CharacterState.IDLE : CharacterState.WALKING
      );
    this.prevVy = this.vy;

    switch (this.state) {
      case CharacterState.WALKING:
        if (this.world.frame % 8 === 0)
          w4.tone(
            60 | (60 << 16),
            (1 << 16) | (1 << 8) | 2,
            60,
            w4.TONE_MODE1 | w4.TONE_TRIANGLE
          );
        break;
    }
  }

  draw(): void {
    let sprite: usize,
      spriteWidth: u32,
      spriteHeight: u32,
      spriteFlags: u32,
      eyesSprite: usize,
      eyesSpriteWidth: u32,
      eyesSpriteHeight: u32,
      eyesSpriteFlags: u32,
      eyesColor: u32 = 0x401;
    switch (this.state) {
      case CharacterState.IDLE:
      case CharacterState.WOKEN_UP:
        sprite = frog;
        spriteWidth = frogWidth;
        spriteHeight = frogHeight;
        spriteFlags = frogFlags;
        eyesSprite = frog_eyes;
        eyesSpriteWidth = frog_eyesWidth;
        eyesSpriteHeight = frog_eyesHeight;
        eyesSpriteFlags = frog_eyesFlags;
        break;
      case CharacterState.WALKING:
        if (this.world.frame % 10 <= 5) {
          sprite = frog_walking_1;
          spriteWidth = frog_walking_1Width;
          spriteHeight = frog_walking_1Height;
          spriteFlags = frog_walking_1Flags;
        } else {
          sprite = frog_walking_2;
          spriteWidth = frog_walking_2Width;
          spriteHeight = frog_walking_2Height;
          spriteFlags = frog_walking_2Flags;
        }
        eyesSprite = frog_walking_eyes;
        eyesSpriteWidth = frog_walking_eyesWidth;
        eyesSpriteHeight = frog_walking_eyesHeight;
        eyesSpriteFlags = frog_walking_eyesFlags;
        if (this.vx > 0) {
          spriteFlags |= w4.BLIT_FLIP_X;
          eyesSpriteFlags |= w4.BLIT_FLIP_X;
        }
        break;
      case CharacterState.JUMPING:
        sprite = frog_jumping;
        spriteWidth = frog_jumpingWidth;
        spriteHeight = frog_jumpingHeight;
        spriteFlags = frog_jumpingFlags;
        eyesSprite = frog_jumping_eyes;
        eyesSpriteWidth = frog_jumping_eyesWidth;
        eyesSpriteHeight = frog_jumping_eyesHeight;
        eyesSpriteFlags = frog_jumping_eyesFlags;
        break;
      case CharacterState.FALLING:
        sprite = frog_falling;
        spriteWidth = frog_fallingWidth;
        spriteHeight = frog_fallingHeight;
        spriteFlags = frog_fallingFlags;
        eyesSprite = frog_falling_eyes;
        eyesSpriteWidth = frog_falling_eyesWidth;
        eyesSpriteHeight = frog_falling_eyesHeight;
        eyesSpriteFlags = frog_falling_eyesFlags;
        break;
      case CharacterState.SLEEPING:
        if (this.world.frame % 240 >= 120) {
          sprite = frog_sleeping_1;
          spriteWidth = frog_sleeping_1Width;
          spriteHeight = frog_sleeping_1Height;
          spriteFlags = frog_sleeping_1Flags;
          eyesSprite = frog_sleeping_1_eyes;
          eyesSpriteWidth = frog_sleeping_1_eyesWidth;
          eyesSpriteHeight = frog_sleeping_1_eyesHeight;
          eyesSpriteFlags = frog_sleeping_1_eyesFlags;
        } else {
          sprite = frog_sleeping_2;
          spriteWidth = frog_sleeping_2Width;
          spriteHeight = frog_sleeping_2Height;
          spriteFlags = frog_sleeping_2Flags;
          eyesSprite = frog_sleeping_2_eyes;
          eyesSpriteWidth = frog_sleeping_2_eyesWidth;
          eyesSpriteHeight = frog_sleeping_2_eyesHeight;
          eyesSpriteFlags = frog_sleeping_2_eyesFlags;
        }
        eyesColor = 0x40;
        break;
      default:
        unreachable();
    }

    store<u16>(w4.DRAW_COLORS, this.isPrimary ? 0x320 : 0x430);
    w4.blit(
      sprite,
      <i32>nearest(this.x - <f32>spriteWidth / 2 - this.world.cameraOffsetX),
      <i32>(
        nearest(
          this.y +
            <f32>TILE_SIZE / 2 -
            <f32>spriteHeight -
            this.world.cameraOffsetY
        )
      ),
      spriteWidth,
      spriteHeight,
      spriteFlags
    );
    store<u16>(w4.DRAW_COLORS, eyesColor);
    w4.blit(
      eyesSprite,
      <i32>(
        nearest(this.x - <f32>eyesSpriteWidth / 2 - this.world.cameraOffsetX)
      ),
      <i32>(
        nearest(
          this.y +
            <f32>TILE_SIZE / 2 -
            <f32>eyesSpriteHeight -
            this.world.cameraOffsetY
        )
      ),
      eyesSpriteWidth,
      eyesSpriteHeight,
      eyesSpriteFlags
    );

    if (this.state === CharacterState.SLEEPING) {
      store<u16>(w4.DRAW_COLORS, 0x03);
      if (this.world.frame % 180 >= 60)
        w4.text(
          "Z",
          <i32>nearest(this.x - this.world.cameraOffsetX),
          <i32>nearest(this.y - 20 - this.world.cameraOffsetY)
        );
      if (this.world.frame % 180 >= 120)
        w4.text(
          "z",
          <i32>nearest(this.x + 8 - this.world.cameraOffsetX),
          <i32>nearest(this.y - 24 - this.world.cameraOffsetY)
        );
    }
  }
}
