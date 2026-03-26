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
export const WolfTag = defineComponent({ value: Types.ui8 });
export const ZombieTag = defineComponent();

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
  // 0:idle 1:walk 2:run 3:jump 4:swim 5:shoot 6:punch 7:kick 8:runningjump 10:crouch_idle 11:crouch_walk 12:stab
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

// ── Weapon System (Future-Ready) ───────────────────────────────────────────

export const InputIntents = defineComponent({
  shootRequest: Types.ui8,
  reloadRequest: Types.ui8,
  aimRequest: Types.ui8,
  switchWeaponRequest: Types.ui8, // 1: Rifle, 2: Knife
  punchRequest: Types.ui8,
  kickRequest: Types.ui8,
  aimYaw: Types.f32,
  aimPitch: Types.f32,
  crouch: Types.ui8,
  jetRequest: Types.ui8,
});

export const Weapon = defineComponent({
  type: Types.ui8,          // 0: Hitscan (Pistol), 1: Hitscan (Rifle), 2: Projectile (Rocket)
  damage: Types.f32,
  fireRate: Types.f32,      // Shots per second
  ammo: Types.ui32,
  maxAmmo: Types.ui32,
  lastFireTime: Types.f64,
  range: Types.f32,
});

export const WeaponState = defineComponent({
  state: Types.ui8,         // 0: IDLE, 1: FIRING, 2: RELOADING, 3: HOLSTERED
  reloadTimer: Types.f32,
  fireSequence: Types.ui32,
});

export const AIController = defineComponent({
  state: Types.ui8,         // 0: Idle, 1: Wander, 2: Chase, 3: Attack, 4: Flee, 5: Staggered
  targetX: Types.f32,
  targetZ: Types.f32,
  timer: Types.f32,
  staggerTimer: Types.f32,
  fleeTimer: Types.f32,
  lastHealth: Types.f32,
});

export const CoffyCoinTag = defineComponent();

export const NPCTag = defineComponent();

export const NPCInteraction = defineComponent({
  dialogueId: Types.ui8,
  requiredCoins: Types.ui32,
  isSatisfied: Types.ui8,
});
