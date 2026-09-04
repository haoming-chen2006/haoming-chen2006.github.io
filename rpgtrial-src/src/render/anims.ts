// KayKit animation names (identical across Knight/Mage/Rogue/Barbarian; skeletons add a few).
export const ANIM = {
  idle: 'Idle', idle2H: '2H_Melee_Idle', idleUnarmed: 'Unarmed_Idle', walk: 'Walking_A', walkB: 'Walking_B', walkBack: 'Walking_Backwards',
  run: 'Running_A', sprint: 'Running_B', strafeL: 'Running_Strafe_Left', strafeR: 'Running_Strafe_Right',
  dodgeF: 'Dodge_Forward', dodgeB: 'Dodge_Backward', dodgeL: 'Dodge_Left', dodgeR: 'Dodge_Right',
  jumpStart: 'Jump_Start', jumpIdle: 'Jump_Idle', jumpLand: 'Jump_Land', jumpShort: 'Jump_Full_Short', jumpLong: 'Jump_Full_Long',
  atk1hChop: '1H_Melee_Attack_Chop', atk1hDiag: '1H_Melee_Attack_Slice_Diagonal', atk1hHoriz: '1H_Melee_Attack_Slice_Horizontal', atk1hStab: '1H_Melee_Attack_Stab',
  atk2hChop: '2H_Melee_Attack_Chop', atk2hSlice: '2H_Melee_Attack_Slice', atk2hSpin: '2H_Melee_Attack_Spin', atk2hSpinning: '2H_Melee_Attack_Spinning', atk2hStab: '2H_Melee_Attack_Stab',
  atkDualChop: 'Dualwield_Melee_Attack_Chop', atkDualSlice: 'Dualwield_Melee_Attack_Slice', atkDualStab: 'Dualwield_Melee_Attack_Stab',
  ranged1hAim: '1H_Ranged_Aiming', ranged1hShoot: '1H_Ranged_Shoot', ranged2hAim: '2H_Ranged_Aiming', ranged2hShoot: '2H_Ranged_Shoot', ranged2hReload: '2H_Ranged_Reload',
  block: 'Block', blocking: 'Blocking', blockHit: 'Block_Hit', blockAttack: 'Block_Attack',
  hitA: 'Hit_A', hitB: 'Hit_B', deathA: 'Death_A', deathB: 'Death_B', deathAPose: 'Death_A_Pose', deathBPose: 'Death_B_Pose',
  castLong: 'Spellcast_Long', castRaise: 'Spellcast_Raise', castShoot: 'Spellcast_Shoot', casting: 'Spellcasting',
  interact: 'Interact', pickUp: 'PickUp', useItem: 'Use_Item', cheer: 'Cheer', throw: 'Throw',
  lieDown: 'Lie_Down', lieIdle: 'Lie_Idle', liePose: 'Lie_Pose', lieStandUp: 'Lie_StandUp',
  sitFloorDown: 'Sit_Floor_Down', sitFloorIdle: 'Sit_Floor_Idle', sitFloorUp: 'Sit_Floor_StandUp',
  kick: 'Unarmed_Melee_Attack_Kick', punchA: 'Unarmed_Melee_Attack_Punch_A', punchB: 'Unarmed_Melee_Attack_Punch_B',
  // skeleton-only
  skAwakenFloor: 'Skeletons_Awaken_Floor', skAwakenFloorLong: 'Skeletons_Awaken_Floor_Long', skAwakenStanding: 'Skeletons_Awaken_Standing',
  skInactiveFloor: 'Skeletons_Inactive_Floor_Pose', skInactiveStanding: 'Skeleton_Inactive_Standing_Pose', skIdleCombat: 'Idle_Combat', skTaunt: 'Taunt',
  skDeathC: 'Death_C_Skeletons', skSpawnGround: 'Spawn_Ground_Skeletons', skWalk: 'Walking_D_Skeletons', skJumpChop: '1H_Melee_Attack_Jump_Chop', skSummon: 'Spellcast_Summon',
} as const;
