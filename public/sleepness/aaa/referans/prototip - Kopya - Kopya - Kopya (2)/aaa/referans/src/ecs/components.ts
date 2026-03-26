import { defineComponent, Types } from 'bitecs';

export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

export const Rotation = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  w: Types.f32,
});

export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

export const PlayerTag = defineComponent();
export const EnemyTag = defineComponent();

export const InputState = defineComponent({
  yaw: Types.f32,
  pitch: Types.f32,
  moveX: Types.f32,   // -1..1
  moveZ: Types.f32,   // -1..1
  sprint: Types.ui8,
  jump: Types.ui8,
  attack: Types.ui8,
  swim: Types.ui8,   // su içinde mi
  interact: Types.ui8, // E tuşu
  isDriving: Types.ui8,
});

export const PhysicsBody = defineComponent({
  type: Types.ui8, // 0: Dynamic | 1: Kinematic | 2: Static
});

export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
});

export const CombatState = defineComponent({
  attackCooldown: Types.f32,
  attackRange: Types.f32,
  attackDamage: Types.f32,
  isBlocking: Types.ui8,
  stunTimer: Types.f32,
});

export const Projectile = defineComponent({
  lifetime: Types.f32,
  damage: Types.f32,
});

// Animasyon durumu — AnimationController ile senkron
export const AnimState = defineComponent({
  // 0:idle 1:walk 2:run 3:jump 4:swim 5:shoot 6:punch 7:kick 8:runningjump
  current: Types.ui8,
  previous: Types.ui8,
  // Zıplama cooldown (race condition önler)
  jumpCooldown: Types.f32,
  isGrounded: Types.ui8,
  verticalVel: Types.f32,
});

export const VehicleTag = defineComponent();

export const VehicleInput = defineComponent({
  throttle: Types.f32, // -1..1
  steering: Types.f32, // -1..1
  brake: Types.ui8,
});
