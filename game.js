const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");

const choiceModal = document.getElementById("choiceModal");
const choiceTag = document.getElementById("choiceTag");
const choiceTitle = document.getElementById("choiceTitle");
const choiceText = document.getElementById("choiceText");
const choiceOptions = document.getElementById("choiceOptions");

const hpFill = document.getElementById("hpFill");
const hpText = document.getElementById("hpText");
const novaFill = document.getElementById("novaFill");
const novaText = document.getElementById("novaText");
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");
const dashState = document.getElementById("dashState");
const threatState = document.getElementById("threatState");
const killState = document.getElementById("killState");
const bossState = document.getElementById("bossState");
const objectiveText = document.getElementById("objectiveText");
const storyText = document.getElementById("storyText");
const treeStatus = document.getElementById("treeStatus");
const skillTreeList = document.getElementById("skillTreeList");

const view = { width: canvas.width, height: canvas.height };
const world = { width: 2800, height: 1800 };
const keys = new Set();
const CITY = createCityMap();

function loadSprite(src) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return image;
}

const SPRITES = {
  hero: loadSprite("assets/zero-hero-tech-v2.png"),
  heroRun: loadSprite("assets/zero-hero-run-v1.png"),
  heroFang: loadSprite("assets/zero-hero-fang-idle-v1.png"),
  heroFangRun: loadSprite("assets/zero-hero-fang-run-v1.png"),
  heroGhost: loadSprite("assets/zero-hero-ghost-idle-v1.png"),
  heroGhostRun: loadSprite("assets/zero-hero-ghost-run-v1.png"),
  heroDomain: loadSprite("assets/zero-hero-domain-idle-v1.png"),
  heroDomainRun: loadSprite("assets/zero-hero-domain-run-v1.png"),
  enemyRunner: loadSprite("assets/enemy-runner-v1.png"),
  enemyElite: loadSprite("assets/enemy-elite-v1.png"),
  enemyShooter: loadSprite("assets/enemy-shooter-v1.png"),
  enemyCharger: loadSprite("assets/enemy-charger-v1.png"),
  enemyBoss: loadSprite("assets/enemy-boss-v1.png"),
};

const CONFIG = {
  playerRadius: 22,
  maxHp: 100,
  baseMoveSpeed: 330,
  baseSlashCooldown: 0.42,
  baseSlashRange: 250,
  baseSlashDamage: 32,
  baseDashDuration: 0.18,
  baseDashSpeed: 980,
  baseDashDamage: 80,
  baseDashRecharge: 1.2,
  baseDashCharges: 1,
  baseNovaRadius: 310,
  baseNovaDamage: 999,
  baseNovaCost: 100,
  baseEnemySpeed: 100,
  spawnInterval: 1.12,
  pickupMagnetRadius: 190,
  pickupCollectRadius: 34,
  regenTickRate: 1,
  bossFirstTime: 60,
  bossEvery: 70,
  extractionTime: 185,
};

const STORY_EVENTS = [
  { time: 6, text: "通讯噪音里传来旧代号：'Zero，不要停。追猎阵列已经锁死你的位置。'" },
  { time: 24, text: "你从坍塌广告塔下冲过，义体日志不断重复：'复仇优先级高于撤离。'" },
  { time: 46, text: "上城防卫网开始重编。机甲吊舱正在下降，街区灯带全部转为敌对红。'" },
];

const UPGRADES = [
  {
    id: "overclock",
    title: "神经超频",
    description: "斩击冷却 -12%，斩击伤害 +6。",
    apply() {
      player.slashCooldownBase = Math.max(0.14, player.slashCooldownBase * 0.88);
      player.slashDamage += 6;
    },
  },
  {
    id: "feral_pulse",
    title: "狼步脉冲",
    description: "移动速度 +32，拾取范围扩大。",
    apply() {
      player.moveSpeed += 32;
      player.pickupRadius += 26;
    },
  },
  {
    id: "mono_fang",
    title: "单分子獠刃",
    description: "斩击伤害 +14，斩击距离 +28。",
    apply() {
      player.slashDamage += 14;
      player.slashRange += 28;
    },
  },
  {
    id: "ghost_stride",
    title: "幻轨驱动",
    description: "Dash 充能时间 -0.16 秒。",
    apply() {
      player.dashRechargeBase = Math.max(0.35, player.dashRechargeBase - 0.16);
    },
  },
  {
    id: "phase_shell",
    title: "相位外壳",
    description: "受伤减免 12%，拾取 1 个碎片时恢复 1 点生命。",
    apply() {
      player.damageTakenScale *= 0.88;
      player.onShardHeal += 1;
    },
  },
  {
    id: "capacitor",
    title: "零域电容",
    description: "万解半径 +50，能量获取 +25%。",
    apply() {
      player.novaRadius += 50;
      player.novaGainMult += 0.25;
    },
  },
  {
    id: "chain_sever",
    title: "链式断裂",
    description: "每次自动斩击额外命中 1 个目标。",
    apply() {
      player.slashTargets += 1;
    },
  },
  {
    id: "scavenger",
    title: "记忆掠夺",
    description: "经验碎片获取 +24%，升级时额外恢复 10 点生命。",
    apply() {
      player.xpGainMult += 0.24;
      player.levelHeal += 10;
    },
  },
  {
    id: "blood_recode",
    title: "血码重写",
    description: "最大生命 +18，立即恢复 20 点生命。",
    apply() {
      player.maxHp += 18;
      player.hp = clamp(player.hp + 20, 0, player.maxHp);
    },
  },
  {
    id: "dash_spike",
    title: "裂帛冲锋",
    description: "Dash 伤害 +45，冲刺结束后释放一次小型震荡。",
    apply() {
      player.dashDamage += 45;
      player.dashShockwave += 1;
    },
  },
];

const SKILL_NODES = [
  {
    id: "fang_1",
    path: "fang",
    branch: "赤牙",
    title: "赤牙 I",
    description: "斩击造成流血，持续吞噬目标生命。",
    requires: [],
    apply() {
      player.bleedDamage = 12;
      player.bleedDuration = 2.8;
    },
  },
  {
    id: "fang_2",
    path: "fang",
    branch: "赤牙",
    title: "赤牙 II",
    description: "斩击额外命中 2 个目标，斩击伤害再提高。",
    requires: ["fang_1"],
    apply() {
      player.slashTargets += 2;
      player.slashDamage += 18;
    },
  },
  {
    id: "ghost_1",
    path: "ghost",
    branch: "幽轨",
    title: "幽轨 I",
    description: "Dash 改为双充能，冲刺后留下残影切痕。",
    requires: [],
    apply() {
      player.dashChargesMax = Math.max(player.dashChargesMax, 2);
      player.dashCharges = player.dashChargesMax;
      player.afterimageDamage = 36;
    },
  },
  {
    id: "ghost_2",
    path: "ghost",
    branch: "幽轨",
    title: "幽轨 II",
    description: "Dash 后短暂进入相位，自动斩击冷却进一步下降。",
    requires: ["ghost_1"],
    apply() {
      player.phaseAfterDash = 0.8;
      player.slashCooldownBase = Math.max(0.12, player.slashCooldownBase * 0.82);
    },
  },
  {
    id: "domain_1",
    path: "domain",
    branch: "零域",
    title: "零域 I",
    description: "获得环身脉冲，每秒灼烧附近敌人。",
    requires: [],
    apply() {
      player.auraDamage = 18;
      player.auraRadius = 120;
    },
  },
  {
    id: "domain_2",
    path: "domain",
    branch: "零域",
    title: "零域 II",
    description: "万解释放两次回响脉冲，范围与能量收益同步强化。",
    requires: ["domain_1"],
    apply() {
      player.novaEchoes = 2;
      player.novaRadius += 45;
      player.novaGainMult += 0.15;
    },
  },
];

const BUILD_LABELS = {
  fang: "Red Fang",
  ghost: "Ghostline",
  domain: "Zero Domain",
  neutral: "Hybrid",
};

const UPGRADE_TIER_DATA = {
  common: { label: "Street-grade", title: "Street Wolf", color: "#9bb3d9" },
  uncommon: { label: "Hunter-grade", title: "Circuit Hunter", color: "#59e8ff" },
  rare: { label: "Black Label", title: "Night Reaper", color: "#ffd166" },
  epic: { label: "Mythic", title: "Upper City Reaver", color: "#ff8a7d" },
  legendary: { label: "Apex Protocol", title: "Gate Breaker", color: "#a7ff83" },
};

const PATH_TITLES = {
  neutral: {
    common: "Stray Wolf",
    uncommon: "Circuit Hunter",
    rare: "Night Reaper",
    epic: "Upper City Reaver",
    legendary: "Gate Breaker",
  },
  fang: {
    common: "Fang Scout",
    uncommon: "Blood Runner",
    rare: "Butcher Unit",
    epic: "Crimson Reaper",
    legendary: "Red Fang Sovereign",
  },
  ghost: {
    common: "Trace Walker",
    uncommon: "Phase Runner",
    rare: "Ghost Hunter",
    epic: "Phantom Railer",
    legendary: "Ghostline Monarch",
  },
  domain: {
    common: "Signal Walker",
    uncommon: "Grid Binder",
    rare: "Zone Breaker",
    epic: "Abyss Broadcaster",
    legendary: "Zero Domain Tyrant",
  },
};

const TIER_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

const BUILD_UPGRADES = [
  {
    id: "fang_predator",
    path: "fang",
    minAffinity: 1,
    title: "Predator Loop",
    description: "Slash cooldown -18%, slash damage +8.",
    apply() {
      player.slashCooldownBase = Math.max(0.12, player.slashCooldownBase * 0.82);
      player.slashDamage += 8;
    },
  },
  {
    id: "fang_butcher",
    path: "fang",
    minAffinity: 2,
    title: "Butcher Circuit",
    description: "Bleeding kills detonate, slash range +24, slash hits 1 more target.",
    apply() {
      player.bleedBurstDamage += 60;
      player.bleedBurstRadius = Math.max(player.bleedBurstRadius, 88);
      player.slashRange += 24;
      player.slashTargets += 1;
    },
  },
  {
    id: "fang_feast",
    path: "fang",
    minAffinity: 2,
    title: "Feast Engine",
    description: "Combo kills heal 3 HP and extend combo duration.",
    apply() {
      player.healOnComboKill += 3;
      player.comboExtension += 0.9;
    },
  },
  {
    id: "fang_execute",
    path: "fang",
    minAffinity: 3,
    title: "Execution Threshold",
    description: "Slash instantly executes low-health enemies below 18% HP.",
    apply() {
      player.executeThreshold = Math.max(player.executeThreshold, 0.18);
    },
  },
  {
    id: "ghost_battery",
    path: "ghost",
    minAffinity: 1,
    title: "Ghost Battery",
    description: "Dash charge +1 and recharge -0.18s.",
    apply() {
      player.dashChargesMax += 1;
      player.dashCharges = player.dashChargesMax;
      player.dashRechargeBase = Math.max(0.28, player.dashRechargeBase - 0.18);
    },
  },
  {
    id: "ghost_folds",
    path: "ghost",
    minAffinity: 2,
    title: "Folded Momentum",
    description: "Dash damage +30, afterimage damage +24, move speed +20.",
    apply() {
      player.dashDamage += 30;
      player.afterimageDamage += 24;
      player.moveSpeed += 20;
    },
  },
  {
    id: "ghost_razorwake",
    path: "ghost",
    minAffinity: 2,
    title: "Razor Wake",
    description: "Dash shockwave intensifies and kills refund dash recharge.",
    apply() {
      player.dashShockwave += 2;
      player.dashRefundOnKill += 0.42;
    },
  },
  {
    id: "ghost_hunt",
    path: "ghost",
    minAffinity: 3,
    title: "Blink Hunter",
    description: "Auto-slash cooldown -10% and slash damage +10 while moving fast.",
    apply() {
      player.slashCooldownBase = Math.max(0.11, player.slashCooldownBase * 0.9);
      player.slashDamage += 10;
      player.moveSpeed += 18;
    },
  },
  {
    id: "domain_capacitor",
    path: "domain",
    minAffinity: 1,
    title: "Capacitor Bloom",
    description: "Nova cost -18, radius +44, energy gain +18%.",
    apply() {
      player.novaCost = Math.max(40, player.novaCost - 18);
      player.novaRadius += 44;
      player.novaGainMult += 0.18;
    },
  },
  {
    id: "domain_loop",
    path: "domain",
    minAffinity: 2,
    title: "Ion Loop",
    description: "Aura grows stronger and aura hits feed nova energy.",
    apply() {
      player.auraDamage += 14;
      player.auraRadius += 40;
      player.auraNovaGain += 3;
    },
  },
  {
    id: "domain_arc",
    path: "domain",
    minAffinity: 2,
    title: "Shard Arc",
    description: "Picking up shards zaps nearby enemies for bonus damage.",
    apply() {
      player.pickupBoltDamage += 24;
      player.pickupBoltCount += 1;
    },
  },
  {
    id: "domain_null",
    path: "domain",
    minAffinity: 3,
    title: "Null Field",
    description: "Jammer effects are heavily reduced; nova damage +140.",
    apply() {
      player.jamResist = Math.min(0.9, player.jamResist + 0.7);
      player.novaDamage += 140;
    },
  },
  {
    id: "hybrid_weapon",
    path: "neutral",
    repeatable: true,
    title: "Weapon Sync",
    description: "Slash damage +8 and nova damage +50.",
    apply() {
      player.slashDamage += 8;
      player.novaDamage += 50;
    },
  },
  {
    id: "hybrid_mobility",
    path: "neutral",
    repeatable: true,
    title: "Mobility Sync",
    description: "Move speed +18 and dash damage +20.",
    apply() {
      player.moveSpeed += 18;
      player.dashDamage += 20;
    },
  },
  {
    id: "hybrid_reactor",
    path: "neutral",
    repeatable: true,
    title: "Reactor Sync",
    description: "Nova gain +12% and XP gain +8%.",
    apply() {
      player.novaGainMult += 0.12;
      player.xpGainMult += 0.08;
    },
  },
  {
    id: "fang_ultimate",
    path: "fang",
    minAffinity: 4,
    minLevel: 7,
    title: "Ultimate: Crimson Harvest",
    description: "Red Fang fully blooms. Slash damage surges, execute threshold rises, combo lasts longer, bleeding detonations intensify.",
    apply() {
      player.fangUltimate = true;
      player.slashDamage += 18;
      player.executeThreshold = Math.max(player.executeThreshold, 0.28);
      player.comboExtension += 1.4;
      player.bleedBurstDamage += 110;
      player.bleedBurstRadius = Math.max(player.bleedBurstRadius, 120);
    },
  },
  {
    id: "ghost_ultimate",
    path: "ghost",
    minAffinity: 4,
    minLevel: 7,
    title: "Ultimate: Phantom Rail",
    description: "Ghostline goes all in. Gain another dash charge, recharge faster, dash damage spikes, and dash kills immediately refund a charge.",
    apply() {
      player.ghostUltimate = true;
      player.dashChargesMax += 1;
      player.dashCharges = player.dashChargesMax;
      player.dashRechargeBase = Math.max(0.22, player.dashRechargeBase - 0.22);
      player.dashDamage += 55;
      player.afterimageDamage += 36;
      player.dashRefundOnKill += 0.8;
    },
  },
  {
    id: "domain_ultimate",
    path: "domain",
    minAffinity: 4,
    minLevel: 7,
    title: "Ultimate: Abyss Broadcast",
    description: "Zero Domain saturates the district. Nova gains extra echoes, aura pulses faster, aura feeds more energy, and pick-up bolts intensify.",
    apply() {
      player.domainUltimate = true;
      player.novaEchoes += 2;
      player.auraRadius += 60;
      player.auraDamage += 20;
      player.auraNovaGain += 4;
      player.pickupBoltDamage += 36;
      player.pickupBoltCount += 1;
    },
  },
];

let lastTime = 0;
let enemies = [];
let pickups = [];
let worldObjects = [];
let pendingChoices = [];
let currentChoice = null;
let storyIndex = 0;

const state = {
  mode: "menu",
  time: 0,
  kills: 0,
  threatLevel: 1,
  spawnTimer: 0,
  hitFlash: 0,
  messageTimer: 0,
  textBurst: "",
  effects: [],
  floatingTexts: [],
  enemyProjectiles: [],
  messageText: "",
  nextBossTime: CONFIG.bossFirstTime,
  bossStage: 0,
  particles: [],
  shake: 0,
  nextJammerTime: 26,
  jamSlow: 0,
  nextBountyTime: 34,
  nextLockdownTime: 48,
  bountyTarget: null,
  lockdownZone: null,
  lockdownDamageTick: 0,
  extractionUnlocked: false,
  extractionActive: false,
  extractionZone: null,
  extractionHold: 0,
  extractionGoal: 8,
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: CONFIG.playerRadius,
  facing: 0,
  hp: CONFIG.maxHp,
  maxHp: CONFIG.maxHp,
  level: 1,
  xp: 0,
  xpToNext: 30,
  nova: 0,
  moveSpeed: CONFIG.baseMoveSpeed,
  slashCooldownBase: CONFIG.baseSlashCooldown,
  slashCooldownTimer: 0,
  slashRange: CONFIG.baseSlashRange,
  slashDamage: CONFIG.baseSlashDamage,
  slashTargets: 1,
  dashDuration: CONFIG.baseDashDuration,
  dashSpeed: CONFIG.baseDashSpeed,
  dashDamage: CONFIG.baseDashDamage,
  dashTime: 0,
  dashShockwave: 0,
  dashChargesMax: CONFIG.baseDashCharges,
  dashCharges: CONFIG.baseDashCharges,
  dashRechargeBase: CONFIG.baseDashRecharge,
  dashRechargeTimer: 0,
  invuln: 0,
  phaseAfterDash: 0,
  pickupRadius: CONFIG.pickupMagnetRadius,
  damageTakenScale: 1,
  novaRadius: CONFIG.baseNovaRadius,
  novaDamage: CONFIG.baseNovaDamage,
  novaCost: CONFIG.baseNovaCost,
  novaGainMult: 1,
  xpGainMult: 1,
  bleedDamage: 0,
  bleedDuration: 0,
  auraDamage: 0,
  auraRadius: 0,
  auraTick: 0,
  afterimageDamage: 0,
  levelHeal: 0,
  onShardHeal: 0,
  combo: 0,
  comboTimer: 0,
  overdrive: 0,
  overdriveCharge: 0,
  novaEchoes: 0,
  buildCore: null,
  buildAffinity: { fang: 0, ghost: 0, domain: 0 },
  majorPathCounts: { fang: 0, ghost: 0, domain: 0 },
  buildCounts: {},
  buildHistory: [],
  lastMajorPath: null,
  highestTier: "common",
  titleText: "Stray Wolf",
  comboExtension: 0,
  healOnComboKill: 0,
  executeThreshold: 0,
  bleedBurstDamage: 0,
  bleedBurstRadius: 0,
  dashRefundOnKill: 0,
  auraNovaGain: 0,
  pickupBoltDamage: 0,
  pickupBoltCount: 0,
  jamResist: 0,
  fangUltimate: false,
  ghostUltimate: false,
  domainUltimate: false,
  treeNodes: [],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
  const closestX = start.x + dx * t;
  const closestY = start.y + dy * t;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function createCityMap() {
  const roads = {
    vertical: [
      { x: 250, w: 170, glow: "rgba(89,232,255,0.14)" },
      { x: 1180, w: 360, glow: "rgba(167,255,131,0.12)" },
      { x: 2230, w: 170, glow: "rgba(255,77,109,0.12)" },
    ],
    horizontal: [
      { y: 220, h: 160, glow: "rgba(255,77,109,0.12)" },
      { y: 820, h: 220, glow: "rgba(89,232,255,0.12)" },
      { y: 1380, h: 160, glow: "rgba(255,209,102,0.12)" },
    ],
  };

  const districts = [
    { x: 0, y: 0, w: 250, h: 220, tint: "rgba(15,33,58,0.45)" },
    { x: 420, y: 0, w: 760, h: 220, tint: "rgba(20,22,50,0.45)" },
    { x: 1540, y: 0, w: 690, h: 220, tint: "rgba(22,30,58,0.45)" },
    { x: 2400, y: 0, w: 400, h: 220, tint: "rgba(26,24,52,0.45)" },
    { x: 0, y: 380, w: 250, h: 440, tint: "rgba(14,26,44,0.44)" },
    { x: 420, y: 380, w: 760, h: 440, tint: "rgba(28,22,46,0.42)" },
    { x: 1540, y: 380, w: 690, h: 440, tint: "rgba(18,28,50,0.42)" },
    { x: 2400, y: 380, w: 400, h: 440, tint: "rgba(21,22,44,0.42)" },
    { x: 0, y: 1040, w: 250, h: 340, tint: "rgba(17,29,52,0.42)" },
    { x: 420, y: 1040, w: 760, h: 340, tint: "rgba(23,23,46,0.42)" },
    { x: 1540, y: 1040, w: 690, h: 340, tint: "rgba(20,27,48,0.42)" },
    { x: 2400, y: 1040, w: 400, h: 340, tint: "rgba(24,21,43,0.42)" },
    { x: 0, y: 1540, w: 250, h: 260, tint: "rgba(15,31,54,0.44)" },
    { x: 420, y: 1540, w: 760, h: 260, tint: "rgba(18,22,48,0.42)" },
    { x: 1540, y: 1540, w: 690, h: 260, tint: "rgba(24,24,50,0.42)" },
    { x: 2400, y: 1540, w: 400, h: 260, tint: "rgba(26,22,44,0.42)" },
  ];

  const solids = [
    { x: 520, y: 470, w: 220, h: 120, style: "tower" },
    { x: 820, y: 480, w: 170, h: 190, style: "tower" },
    { x: 560, y: 1120, w: 260, h: 140, style: "market" },
    { x: 900, y: 1100, w: 140, h: 220, style: "market" },
    { x: 1660, y: 470, w: 220, h: 150, style: "lab" },
    { x: 1940, y: 470, w: 150, h: 230, style: "lab" },
    { x: 1680, y: 1120, w: 240, h: 130, style: "substation" },
    { x: 1980, y: 1090, w: 150, h: 220, style: "substation" },
    { x: 95, y: 500, w: 110, h: 170, style: "service" },
    { x: 2480, y: 490, w: 120, h: 180, style: "service" },
    { x: 90, y: 1130, w: 120, h: 160, style: "service" },
    { x: 2480, y: 1110, w: 140, h: 200, style: "service" },
    { x: 1060, y: 1160, w: 90, h: 150, style: "pillar" },
    { x: 1650, y: 600, w: 110, h: 90, style: "pillar" },
  ];

  const billboards = [
    { x: 455, y: 400, w: 92, h: 18, color: "#59e8ff", text: "ZERO" },
    { x: 755, y: 670, w: 84, h: 18, color: "#ff4d6d", text: "NOVA" },
    { x: 1600, y: 395, w: 104, h: 18, color: "#a7ff83", text: "UPCITY" },
    { x: 1870, y: 715, w: 98, h: 18, color: "#ffd166", text: "RUN" },
    { x: 570, y: 1285, w: 94, h: 18, color: "#59e8ff", text: "WOLF" },
    { x: 1760, y: 1268, w: 86, h: 18, color: "#ff4d6d", text: "VOID" },
  ];

  const props = [
    { x: 472, y: 628, w: 42, h: 20, kind: "crate" },
    { x: 740, y: 1176, w: 48, h: 22, kind: "crate" },
    { x: 932, y: 704, w: 22, h: 68, kind: "pipe" },
    { x: 1605, y: 665, w: 28, h: 72, kind: "pipe" },
    { x: 2034, y: 740, w: 42, h: 18, kind: "crate" },
    { x: 1915, y: 1288, w: 52, h: 22, kind: "crate" },
    { x: 2470, y: 700, w: 20, h: 72, kind: "pipe" },
    { x: 130, y: 1280, w: 24, h: 64, kind: "pipe" },
  ];

  const puddles = [
    { x: 610, y: 900, w: 140, h: 48, hue: "#59e8ff" },
    { x: 1250, y: 1080, w: 180, h: 62, hue: "#59e8ff" },
    { x: 1710, y: 970, w: 120, h: 40, hue: "#ff4d6d" },
    { x: 2360, y: 905, w: 110, h: 38, hue: "#ffd166" },
  ];

  return { roads, districts, solids, billboards, props, puddles };
}

function rectIntersectsCircle(rect, x, y, radius) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function resolveSolidOverlap(pos, radius, rect) {
  const closestX = clamp(pos.x, rect.x, rect.x + rect.w);
  const closestY = clamp(pos.y, rect.y, rect.y + rect.h);
  let dx = pos.x - closestX;
  let dy = pos.y - closestY;
  let distanceSq = dx * dx + dy * dy;

  if (distanceSq >= radius * radius) {
    return pos;
  }

  if (distanceSq === 0) {
    const left = Math.abs(pos.x - rect.x);
    const right = Math.abs(rect.x + rect.w - pos.x);
    const top = Math.abs(pos.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - pos.y);
    const minEdge = Math.min(left, right, top, bottom);

    if (minEdge === left) {
      return { x: rect.x - radius, y: pos.y };
    }
    if (minEdge === right) {
      return { x: rect.x + rect.w + radius, y: pos.y };
    }
    if (minEdge === top) {
      return { x: pos.x, y: rect.y - radius };
    }
    return { x: pos.x, y: rect.y + rect.h + radius };
  }

  const distance = Math.sqrt(distanceSq);
  const push = radius - distance;
  dx /= distance;
  dy /= distance;
  return {
    x: pos.x + dx * push,
    y: pos.y + dy * push,
  };
}

function resolveWorldSolids(pos, radius) {
  let next = { x: pos.x, y: pos.y };

  for (const rect of CITY.solids) {
    next = resolveSolidOverlap(next, radius, rect);
  }

  next.x = clamp(next.x, radius, world.width - radius);
  next.y = clamp(next.y, radius, world.height - radius);
  return next;
}

function moveEntityWithSolids(entity, dx, dy, radiusScale = 1) {
  const radius = entity.radius * radiusScale;
  let next = {
    x: clamp(entity.x + dx, radius, world.width - radius),
    y: entity.y,
  };
  next = resolveWorldSolids(next, radius);
  next.y = clamp(next.y + dy, radius, world.height - radius);
  next = resolveWorldSolids(next, radius);
  entity.x = next.x;
  entity.y = next.y;
}

function addScreenShake(amount) {
  state.shake = Math.min(Math.max(state.shake, amount), 26);
}

function spawnParticles(x, y, color, count, speedMin, speedMax, lifeMin, lifeMax) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(speedMin, speedMax);
    const life = randomRange(lifeMin, lifeMax);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      size: randomRange(4, 12),
    });
  }
}

function nextXpRequirement(level) {
  return Math.round(30 + level * 18 + level * level * 8);
}

function worldToScreen(x, y, camera) {
  return { x: x - camera.x, y: y - camera.y };
}

function setBurst(text, duration = 1.2) {
  state.messageText = text;
  state.messageTimer = duration;
}

function setStory(text) {
  storyText.textContent = text;
}

function hasBossAlive() {
  return enemies.some((enemy) => enemy.type === "boss");
}

function setObjectiveText() {
  if (state.extractionActive && state.extractionZone) {
    const remaining = Math.max(0, state.extractionGoal - state.extractionHold).toFixed(1);
    objectiveText.textContent = `Extraction beacon is online. Hold inside the zone for ${remaining}s to break out of Upper City.`;
    return;
  }

  if (state.lockdownZone) {
    objectiveText.textContent = "Lockdown protocol active. Stay inside the marked district ring or the city grid will carve into Zero.";
    return;
  }

  if (state.bountyTarget && enemies.includes(state.bountyTarget)) {
    objectiveText.textContent = "A bounty elite is marked on the grid. Hunt it down before the district escalates again.";
    return;
  }

  const jammer = enemies.find((enemy) => enemy.type === "jammer");
  if (jammer) {
    objectiveText.textContent = "A jammer tower is distorting the district. Destroy it to restore movement and shard pull.";
    return;
  }

  if (hasBossAlive()) {
    objectiveText.textContent = "执政机甲已落地。撕开装甲，躲开散射弹幕，夺取它的核心。";
    return;
  }

  const remaining = Math.max(0, state.nextBossTime - state.time);
  if (remaining > 0) {
    objectiveText.textContent = `收集记忆碎片并完成升级。${remaining.toFixed(0)} 秒后将迎来下一台上城执政机甲。`;
    return;
  }

  objectiveText.textContent = "防卫网正在重组。继续逃离，准备迎接下一轮封锁。";
}

function createWorldObjects() {
  return [
    { kind: "barrel", x: 480, y: 740, radius: 18, active: true },
    { kind: "barrel", x: 780, y: 930, radius: 18, active: true },
    { kind: "barrel", x: 980, y: 760, radius: 18, active: true },
    { kind: "barrel", x: 1630, y: 770, radius: 18, active: true },
    { kind: "barrel", x: 2050, y: 880, radius: 18, active: true },
    { kind: "barrel", x: 2330, y: 1260, radius: 18, active: true },
    { kind: "barrel", x: 780, y: 1450, radius: 18, active: true },
    { kind: "barrel", x: 1890, y: 1450, radius: 18, active: true },
    { kind: "crate", x: 355, y: 1120, radius: 20, active: true, opened: false },
    { kind: "crate", x: 1350, y: 430, radius: 20, active: true, opened: false },
    { kind: "crate", x: 1350, y: 1460, radius: 20, active: true, opened: false },
    { kind: "crate", x: 2470, y: 960, radius: 20, active: true, opened: false },
  ];
}

function getEventAnchors() {
  return [
    { x: 720, y: 770, radius: 220 },
    { x: 1420, y: 930, radius: 250 },
    { x: 1810, y: 730, radius: 220 },
    { x: 1880, y: 1320, radius: 230 },
    { x: 760, y: 1310, radius: 210 },
  ];
}

function activateOverdrive() {
  player.overdrive = 7;
  player.overdriveCharge = 0;
  player.dashCharges = player.dashChargesMax;
  player.invuln = Math.max(player.invuln, 0.35);
  setBurst("OVERDRIVE", 1.2);
  addScreenShake(14);
  spawnParticles(player.x, player.y, "#ff4d6d", 24, 110, 280, 0.22, 0.52);
}

function createEnemy(type, x, y, scale = 1) {
  if (type === "runner") {
    return {
      x,
      y,
      type,
      radius: 18,
      speed: (CONFIG.baseEnemySpeed + Math.random() * 70) * scale,
      hp: 36 * scale,
      maxHp: 36 * scale,
      damage: 12,
      touchCooldown: 0,
      fireCooldown: 0,
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 10,
    };
  }

  if (type === "elite") {
    return {
      x,
      y,
      type,
      radius: 30,
      speed: 118 * scale,
      hp: 140 * scale,
      maxHp: 140 * scale,
      damage: 22,
      touchCooldown: 0,
      fireCooldown: 0,
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 22,
    };
  }

  if (type === "shooter") {
    return {
      x,
      y,
      type,
      radius: 22,
      speed: 104 * scale,
      hp: 46 * scale,
      maxHp: 46 * scale,
      damage: 8,
      touchCooldown: 0,
      fireCooldown: randomRange(1.1, 2.2),
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 14,
    };
  }

  if (type === "charger") {
    return {
      x,
      y,
      type,
      radius: 20,
      speed: 118 * scale,
      hp: 58 * scale,
      maxHp: 58 * scale,
      damage: 18,
      touchCooldown: 0,
      fireCooldown: 0,
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 18,
      chargeCooldown: randomRange(1.8, 3.1),
      chargeTime: 0,
      chargeVector: { x: 0, y: 0 },
      chargeWindup: 0,
    };
  }

  if (type === "turret") {
    return {
      x,
      y,
      type,
      radius: 20,
      speed: 0,
      hp: 64 * scale,
      maxHp: 64 * scale,
      damage: 0,
      touchCooldown: 0,
      fireCooldown: randomRange(1.4, 2.2),
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 18,
    };
  }

  if (type === "laser") {
    return {
      x,
      y,
      type,
      radius: 22,
      speed: 72 * scale,
      hp: 72 * scale,
      maxHp: 72 * scale,
      damage: 0,
      touchCooldown: 0,
      fireCooldown: randomRange(2.6, 4.2),
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 24,
      beamCharge: 0,
      beamCooldown: 0,
      beamTarget: 0,
    };
  }

  if (type === "missile") {
    return {
      x,
      y,
      type,
      radius: 24,
      speed: 84 * scale,
      hp: 84 * scale,
      maxHp: 84 * scale,
      damage: 0,
      touchCooldown: 0,
      fireCooldown: randomRange(2.4, 3.8),
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 26,
    };
  }

  if (type === "brood_turret") {
    return {
      x,
      y,
      type,
      radius: 28,
      speed: 0,
      hp: 220 * scale,
      maxHp: 220 * scale,
      damage: 0,
      touchCooldown: 0,
      fireCooldown: randomRange(1.2, 1.8),
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 48,
      summonCooldown: randomRange(4.8, 7.2),
    };
  }

  if (type === "jammer") {
    return {
      x,
      y,
      type,
      radius: 28,
      speed: 0,
      hp: 190 * scale,
      maxHp: 190 * scale,
      damage: 0,
      touchCooldown: 0,
      fireCooldown: 1.6,
      bleedTimer: 0,
      bleedDamage: 0,
      xpValue: 42,
      auraRadius: 250,
      pulseTimer: 0.7,
    };
  }

  return {
    x,
    y,
    type: "boss",
    radius: 48,
    speed: 120 + state.bossStage * 10,
    hp: 850 + state.bossStage * 260,
    maxHp: 850 + state.bossStage * 260,
    damage: 30,
    touchCooldown: 0,
    fireCooldown: 0,
    bleedTimer: 0,
    bleedDamage: 0,
    xpValue: 100,
    burstCooldown: 4.2,
    summonCooldown: 7,
    chargeCooldown: 5.2,
    chargeTime: 0,
    chargeVector: { x: 0, y: 0 },
    chargeWindup: 0,
  };
}

function createBountyEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = player.x;
  let y = player.y;

  if (edge === 0) {
    x = clamp(player.x + randomRange(-340, 340), 120, world.width - 120);
    y = -90;
  } else if (edge === 1) {
    x = world.width + 90;
    y = clamp(player.y + randomRange(-300, 300), 120, world.height - 120);
  } else if (edge === 2) {
    x = clamp(player.x + randomRange(-340, 340), 120, world.width - 120);
    y = world.height + 90;
  } else {
    x = -90;
    y = clamp(player.y + randomRange(-300, 300), 120, world.height - 120);
  }

  const bountyType = state.time > 110 ? chooseRandom(["elite", "charger", "shooter"]) : chooseRandom(["elite", "charger"]);
  const enemy = createEnemy(bountyType, x, y, 1.45 + state.threatLevel * 0.12);
  enemy.bounty = true;
  enemy.radius += 6;
  enemy.hp *= 1.6;
  enemy.maxHp = enemy.hp;
  enemy.speed *= 1.16;
  enemy.damage += 6;
  enemy.xpValue = Math.round(enemy.xpValue * 2.6);
  enemy.fireCooldown = Math.min(enemy.fireCooldown || 1.4, 1.2);
  return enemy;
}

function spawnEnemy(initial = false) {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = randomRange(0, world.width);
    y = -80;
  } else if (edge === 1) {
    x = world.width + 80;
    y = randomRange(0, world.height);
  } else if (edge === 2) {
    x = randomRange(0, world.width);
    y = world.height + 80;
  } else {
    x = -80;
    y = randomRange(0, world.height);
  }

  const levelScale = 1 + state.threatLevel * 0.12;
  let type = "runner";
  const roll = Math.random();

  if (!initial && state.time > 105 && roll > 0.985) {
    type = "brood_turret";
  } else if (!initial && state.time > 82 && roll > 0.97) {
    type = "missile";
  } else if (!initial && state.time > 68 && roll > 0.955) {
    type = "laser";
  } else if (!initial && state.time > 40 && roll > 0.95) {
    type = "turret";
  } else if (!initial && state.time > 24 && roll > 0.88) {
    type = "charger";
  } else if (!initial && state.time > 18 && roll > 0.72) {
    type = "elite";
  } else if (!initial && state.time > 30 && roll > 0.86) {
    type = "shooter";
  }

  enemies.push(createEnemy(type, x, y, levelScale));
}

function spawnJammerTower() {
  if (enemies.some((enemy) => enemy.type === "jammer")) {
    return;
  }

  const spots = [
    { x: 700, y: 700 },
    { x: 1790, y: 690 },
    { x: 700, y: 1230 },
    { x: 1830, y: 1240 },
  ];
  const spot = spots[Math.floor(Math.random() * spots.length)];
  enemies.push(createEnemy("jammer", spot.x, spot.y, 1 + state.threatLevel * 0.08));
  state.nextJammerTime = state.time + 38;
  setBurst("Jammer tower online", 1.2);
  setStory('"A jammer just lit up. If you leave it alive, this district will choke you."');
}

function spawnBountyElite() {
  if (state.bountyTarget && enemies.includes(state.bountyTarget)) {
    return;
  }

  const bounty = createBountyEnemy();
  state.bountyTarget = bounty;
  state.nextBountyTime = state.time + randomRange(38, 52);
  enemies.push(bounty);
  setBurst("Bounty elite marked", 1.2);
  setStory('"Upper City flagged a hunter-killer package. Kill it fast or the whole block tightens around you."');
}

function startLockdownZone() {
  if (state.lockdownZone) {
    return;
  }

  const anchor = chooseRandom(getEventAnchors());
  state.lockdownZone = {
    x: anchor.x,
    y: anchor.y,
    radius: anchor.radius + 110,
    targetRadius: anchor.radius,
    life: 18,
    pulse: 0.7,
  };
  state.lockdownDamageTick = 0;
  state.nextLockdownTime = state.time + randomRange(50, 64);
  setBurst("District lockdown", 1.2);
  setStory('"Lockdown shutters are dropping. Stay inside the live district ring or let the grid flay you on the move."');
}

function startExtractionWindow() {
  const anchor = chooseRandom(getEventAnchors());
  state.extractionUnlocked = true;
  state.extractionActive = true;
  state.extractionHold = 0;
  state.extractionZone = {
    x: clamp(anchor.x + randomRange(-120, 120), 180, world.width - 180),
    y: clamp(anchor.y + randomRange(-120, 120), 180, world.height - 180),
    radius: 118,
    pulse: 0,
  };
  setBurst("Extraction beacon online", 1.4);
  setStory('"Route breach found. Hold the beacon until the gate tears open, then get Zero out."');
}

function spawnBoss() {
  state.bossStage += 1;
  const boss = createEnemy("boss", world.width / 2 + randomRange(-220, 220), -120, 1);
  boss.hp += state.threatLevel * 70;
  boss.maxHp = boss.hp;
  enemies.push(boss);
  setBurst(`执政机甲 Mk.${state.bossStage} 降下`, 1.8);
  setStory("“Boss 已部署。别被它拖住。打爆核心，不然整片街区都会封死。”");
}

function dropPickup(x, y, value) {
  pickups.push({
    x,
    y,
    radius: 7,
    value,
    life: 18,
    phase: Math.random() * Math.PI * 2,
  });
}

function openSupplyCrate(crate) {
  if (!crate.active || crate.opened) {
    return;
  }

  crate.active = false;
  crate.opened = true;
  const rewards = [
    {
      text: "Supply: HP restored",
      apply() {
        player.hp = clamp(player.hp + 22, 0, player.maxHp);
      },
    },
    {
      text: "Supply: Nova boosted",
      apply() {
        player.nova = clamp(player.nova + 34, 0, 100);
      },
    },
    {
      text: "Supply: Overdrive charge",
      apply() {
        player.overdriveCharge = clamp(player.overdriveCharge + 32, 0, 100);
      },
    },
    {
      text: "Supply: bonus shards",
      apply() {
        grantXp(22);
      },
    },
  ];

  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  reward.apply();
  setBurst(reward.text, 1);
  spawnParticles(crate.x, crate.y, "#a7ff83", 16, 70, 220, 0.16, 0.42);
}

function explodeBarrel(barrel) {
  if (!barrel.active) {
    return;
  }

  barrel.active = false;
  addScreenShake(10);
  setBurst("Barrel burst", 0.55);
  spawnParticles(barrel.x, barrel.y, "#ff8a7d", 20, 90, 260, 0.16, 0.4);
  state.effects.push({
    type: "burst",
    x: barrel.x,
    y: barrel.y,
    radius: 128,
    life: 0.26,
    color: "#ff8a7d",
  });
  applyAreaDamage(barrel.x, barrel.y, 128, 82, "nova");

  for (const object of worldObjects) {
    if (object.active && object.kind === "barrel" && object !== barrel && dist(barrel, object) < 96) {
      object.active = false;
      state.effects.push({
        type: "burst",
        x: object.x,
        y: object.y,
        radius: 76,
        life: 0.18,
        color: "#ffd166",
      });
    }
  }
}

function damageWorldObjects(x, y, radius) {
  for (const object of worldObjects) {
    if (!object.active) {
      continue;
    }

    if (dist(object, { x, y }) > radius + object.radius) {
      continue;
    }

    if (object.kind === "barrel") {
      explodeBarrel(object);
    } else if (object.kind === "crate") {
      openSupplyCrate(object);
    }
  }
}

function queueChoice(choice) {
  pendingChoices.push(choice);
  tryOpenNextChoice();
}

function chooseDistinct(pool, count) {
  const copy = [...pool];
  const result = [];

  while (copy.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }

  return result;
}

function dominantBuildPath() {
  let bestPath = player.lastMajorPath || player.buildCore;
  let bestValue = bestPath ? player.buildAffinity[bestPath] : 0;

  for (const [path, value] of Object.entries(player.buildAffinity)) {
    if (value > bestValue || (value === bestValue && path === player.lastMajorPath)) {
      bestPath = path;
      bestValue = value;
    }
  }

  return bestValue > 0 ? bestPath : null;
}

function weightedPick(pool) {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) {
      return item;
    }
  }

  return pool[pool.length - 1];
}

function hasBuildUltimate(path) {
  return (path === "fang" && player.fangUltimate)
    || (path === "ghost" && player.ghostUltimate)
    || (path === "domain" && player.domainUltimate);
}

function getUpgradeTier(upgrade) {
  if (upgrade.tier) {
    return upgrade.tier;
  }
  if (["blood_recode", "dash_spike", "capacitor", "chain_sever", "phase_shell", "scavenger"].includes(upgrade.id)) {
    return "uncommon";
  }
  if (upgrade.id.includes("_ultimate")) {
    return "legendary";
  }
  if ((upgrade.minAffinity || 0) >= 3) {
    return "epic";
  }
  if ((upgrade.minAffinity || 0) >= 2) {
    return "rare";
  }
  if ((upgrade.minAffinity || 0) >= 1) {
    return "uncommon";
  }
  return "common";
}

function getTierScore(tier) {
  return TIER_ORDER.indexOf(tier);
}

function getTierBaseWeight(tier) {
  if (tier === "legendary") {
    return player.level >= 8 ? 0.18 + (player.level - 8) * 0.12 : 0;
  }
  if (tier === "epic") {
    return player.level >= 5 ? 0.7 + (player.level - 5) * 0.22 : 0;
  }
  if (tier === "rare") {
    return 0.9 + player.level * 0.26;
  }
  if (tier === "uncommon") {
    return 3.6 + player.level * 0.12;
  }
  return Math.max(2.8, 8 - player.level * 0.32);
}

function updatePlayerTitle() {
  const path = dominantBuildPath() || "neutral";
  const tier = player.highestTier || "common";
  player.titleText = PATH_TITLES[path]?.[tier] || UPGRADE_TIER_DATA[tier].title;
}

function syncBuildProfile() {
  player.buildCore = dominantBuildPath();
  updatePlayerTitle();
}

function chooseWeightedDistinct(upgrades, count) {
  const pool = upgrades.map((upgrade) => ({ ...upgrade, weight: upgrade.weight || 1 }));
  const result = [];

  while (pool.length > 0 && result.length < count) {
    const picked = weightedPick(pool);
    result.push(picked);
    const index = pool.findIndex((item) => item.id === picked.id);
    pool.splice(index, 1);
  }

  return result;
}

function registerBuildUpgrade(upgrade) {
  const tier = getUpgradeTier(upgrade);
  player.buildCounts[upgrade.id] = (player.buildCounts[upgrade.id] || 0) + 1;
  if (getTierScore(tier) > getTierScore(player.highestTier)) {
    player.highestTier = tier;
  }
  player.buildHistory.unshift(`${UPGRADE_TIER_DATA[tier].label} · ${upgrade.title}`);
  player.buildHistory = player.buildHistory.slice(0, 5);
  updatePlayerTitle();
}

function registerMajorTalent(node) {
  player.treeNodes.push(node.id);
  player.majorPathCounts[node.path] += 1;
  player.buildAffinity[node.path] += 2;
  player.lastMajorPath = node.path;
  if (getTierScore("rare") > getTierScore(player.highestTier)) {
    player.highestTier = "rare";
  }
  player.buildHistory.unshift(`${BUILD_LABELS[node.path]} Talent · ${node.title}`);
  player.buildHistory = player.buildHistory.slice(0, 5);
  syncBuildProfile();
}

function getOutgoingDamageMultiplier(enemy, source) {
  let multiplier = 1;

  if (player.buildCore === "fang") {
    if (source === "slash") {
      multiplier *= 1.18;
    }
    if (enemy.type === "elite" || enemy.type === "turret") {
      multiplier *= 1.12;
    }
    if (enemy.type === "jammer") {
      multiplier *= 0.9;
    }
  } else if (player.buildCore === "ghost") {
    if (source === "dash" || source === "afterimage") {
      multiplier *= 1.25;
    }
    if (enemy.type === "shooter" || enemy.type === "jammer") {
      multiplier *= 1.15;
    }
    if (enemy.type === "charger") {
      multiplier *= 0.9;
    }
  } else if (player.buildCore === "domain") {
    if (source === "nova" || source === "aura") {
      multiplier *= 1.22;
    }
    if (enemy.type === "boss" || enemy.type === "jammer") {
      multiplier *= 1.15;
    }
    if (source === "slash" && enemy.type === "elite") {
      multiplier *= 0.88;
    }
  }

  if (enemy.type === "boss") {
    if (player.buildCore === "fang" && source === "slash") {
      multiplier *= 0.92;
    } else if (player.buildCore === "ghost" && source === "dash") {
      multiplier *= 1.12;
    } else if (player.buildCore === "domain" && (source === "nova" || source === "aura")) {
      multiplier *= 1.12;
    }
  }

  return multiplier;
}

function getIncomingDamageMultiplier(enemyType, damageType) {
  let multiplier = 1;

  if (player.buildCore === "fang" && (damageType === "projectile" || enemyType === "jammer")) {
    multiplier *= 1.14;
  }

  if (player.buildCore === "ghost" && (enemyType === "charger" || damageType === "charge")) {
    multiplier *= 1.16;
  }

  if (player.buildCore === "domain" && (enemyType === "turret" || enemyType === "shooter")) {
    multiplier *= 1.14;
  }

  return multiplier;
}

function getBossAdaptiveProfile() {
  if (player.buildCore === "fang") {
    return { burstRate: 1.18, summonRate: 1, chargeRate: 1.06, chargeSpeed: 1.02, extraProjectiles: 4 };
  }
  if (player.buildCore === "ghost") {
    return { burstRate: 1, summonRate: 1, chargeRate: 1.28, chargeSpeed: 1.18, extraProjectiles: 0 };
  }
  if (player.buildCore === "domain") {
    return { burstRate: 1.08, summonRate: 1.22, chargeRate: 1, chargeSpeed: 1, extraProjectiles: 2 };
  }
  return { burstRate: 1, summonRate: 1, chargeRate: 1, chargeSpeed: 1, extraProjectiles: 0 };
}

function getBuildPalette() {
  if (player.buildCore === "fang") {
    return {
      primary: "#ff6b7a",
      secondary: "#ffd166",
      accent: "#fff1f3",
      slash: "#ff8a7d",
      dash: "#ffb36b",
      nova: "#ff4d6d",
      aura: "#ff8a7d",
      bolt: "#ffd166",
    };
  }

  if (player.buildCore === "ghost") {
    return {
      primary: "#59e8ff",
      secondary: "#8bc1ff",
      accent: "#e8fbff",
      slash: "#c2f6ff",
      dash: "#59e8ff",
      nova: "#87b8ff",
      aura: "#7fd2ff",
      bolt: "#59e8ff",
    };
  }

  if (player.buildCore === "domain") {
    return {
      primary: "#a7ff83",
      secondary: "#59e8ff",
      accent: "#efffe8",
      slash: "#cfff9f",
      dash: "#7effc7",
      nova: "#a7ff83",
      aura: "#a7ff83",
      bolt: "#59e8ff",
    };
  }

  return {
    primary: "#ffffff",
    secondary: "#59e8ff",
    accent: "#eef4ff",
    slash: "#ffffff",
    dash: "#59e8ff",
    nova: "#a7ff83",
    aura: "#a7ff83",
    bolt: "#59e8ff",
  };
}

function availableBuildUpgrades() {
  const dominant = dominantBuildPath();
  const totalAffinity = Object.values(player.buildAffinity).reduce((sum, value) => sum + value, 0);
  const combinedPool = [...UPGRADES, ...BUILD_UPGRADES];

  return combinedPool.filter((upgrade) => {
    const count = player.buildCounts[upgrade.id] || 0;
    if (!upgrade.repeatable && count > 0) {
      return false;
    }

    const path = upgrade.path || "neutral";
    if (path !== "neutral" && player.buildAffinity[path] < (upgrade.minAffinity || 0)) {
      return false;
    }

    if (upgrade.minLevel && player.level < upgrade.minLevel) {
      return false;
    }

    if (path !== "neutral" && hasBuildUltimate(path) && upgrade.id.includes("_ultimate")) {
      return false;
    }

    return true;
  }).map((upgrade) => {
    const tier = getUpgradeTier(upgrade);
    const path = upgrade.path || "neutral";
    const count = player.buildCounts[upgrade.id] || 0;
    let weight = getTierBaseWeight(tier);

    if (path !== "neutral") {
      const affinity = player.buildAffinity[path];
      weight *= 0.82 + affinity * 0.42;
      if (dominant === path) {
        weight *= 1.35;
      }
      if (totalAffinity === 0) {
        weight *= 0.62;
      }
    } else if (totalAffinity === 0) {
      weight *= 1.2;
    }

    if (count > 0) {
      weight *= Math.max(0.48, 1 - count * 0.2);
    }

    return {
      ...upgrade,
      path,
      tier,
      weight: Math.max(0.05, weight),
      badge: UPGRADE_TIER_DATA[tier].label,
      badgeColor: UPGRADE_TIER_DATA[tier].color,
    };
  });
}

function renderChoiceModal(choice) {
  currentChoice = choice;
  choiceTag.textContent = choice.tag;
  choiceTitle.textContent = choice.title;
  choiceText.textContent = choice.text;
  choiceOptions.innerHTML = "";

  choice.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-option";
    const badge = option.badge
      ? `<span style="display:inline-block;margin-top:4px;color:${option.badgeColor || "#9bb3d9"};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">${option.badge}</span>`
      : "";
    button.innerHTML = `<strong>${index + 1}. ${option.title}</strong>${badge}<span>${option.description}</span>`;
    button.addEventListener("click", () => selectChoice(index));
    choiceOptions.appendChild(button);
  });

  choiceModal.classList.remove("hidden");
  state.mode = "choice";
}

function tryOpenNextChoice() {
  if (state.mode !== "playing" || pendingChoices.length === 0) {
    return;
  }

  renderChoiceModal(pendingChoices.shift());
}

function selectChoice(index) {
  if (!currentChoice || !currentChoice.options[index]) {
    return;
  }

  currentChoice.options[index].apply();
  currentChoice = null;
  choiceModal.classList.add("hidden");
  state.mode = "playing";
  renderSkillTree();
  updateHud();
  tryOpenNextChoice();
}

function createUpgradeChoice() {
  const options = chooseWeightedDistinct(availableBuildUpgrades(), 3).map((upgrade) => ({
    title: upgrade.title,
    description: upgrade.description,
    badge: upgrade.badge,
    badgeColor: upgrade.badgeColor,
    apply: () => {
      upgrade.apply();
      registerBuildUpgrade(upgrade);
    },
  }));

  return {
    tag: "LEVEL UP",
    title: `Level ${player.level} upgrade cache`,
    text: player.buildCore
      ? `Major talents are currently bending this run toward ${BUILD_LABELS[player.buildCore]}. Higher-grade modules are rarer, but your awakened path biases the odds.`
      : "Zero is still unshaped. Early upgrades are mostly street-grade modules until a major talent starts bending the run.",
    options,
  };
}

function eligibleSkillNodes() {
  return SKILL_NODES.filter((node) => {
    if (player.treeNodes.includes(node.id)) {
      return false;
    }

    return node.requires.every((requirement) => player.treeNodes.includes(requirement));
  });
}

function createSkillTreeChoice(reasonText) {
  const nodes = chooseDistinct(eligibleSkillNodes(), 3).map((node) => ({
    title: `${BUILD_LABELS[node.path]} · ${node.title}`,
    description: `${node.description} Choosing this major talent will bias future small upgrades toward ${BUILD_LABELS[node.path]}.`,
    badge: "Major Talent",
    badgeColor: UPGRADE_TIER_DATA.rare.color,
    apply: () => {
      registerMajorTalent(node);
      node.apply();
      setBurst(`${node.title} 已觉醒`, 1.2);
    },
  }));

  if (nodes.length === 0) {
    return null;
  }

  return {
    tag: "ZERO AWAKENING",
    title: "选择技能树节点",
    text: reasonText,
    options: nodes,
  };
}

function grantXp(amount) {
  player.xp += amount * player.xpGainMult;

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = nextXpRequirement(player.level);
    player.hp = clamp(player.hp + player.levelHeal, 0, player.maxHp);

    if (player.level % 3 === 0) {
      const treeChoice = createSkillTreeChoice("觉醒节点已打开。Zero 可以沿着赤牙、幽轨、零域中的一支继续进化。");
      if (treeChoice) {
        queueChoice(treeChoice);
      }
    }

    queueChoice(createUpgradeChoice());
  }
}

function resetPlayer() {
  player.x = world.width / 2;
  player.y = world.height / 2;
  player.facing = 0;
  player.hp = CONFIG.maxHp;
  player.maxHp = CONFIG.maxHp;
  player.level = 1;
  player.xp = 0;
  player.xpToNext = 30;
  player.nova = 40;
  player.moveSpeed = CONFIG.baseMoveSpeed;
  player.slashCooldownBase = CONFIG.baseSlashCooldown;
  player.slashCooldownTimer = 0;
  player.slashRange = CONFIG.baseSlashRange;
  player.slashDamage = CONFIG.baseSlashDamage;
  player.slashTargets = 1;
  player.dashDuration = CONFIG.baseDashDuration;
  player.dashSpeed = CONFIG.baseDashSpeed;
  player.dashDamage = CONFIG.baseDashDamage;
  player.dashTime = 0;
  player.dashShockwave = 0;
  player.dashChargesMax = CONFIG.baseDashCharges;
  player.dashCharges = CONFIG.baseDashCharges;
  player.dashRechargeBase = CONFIG.baseDashRecharge;
  player.dashRechargeTimer = 0;
  player.invuln = 0;
  player.phaseAfterDash = 0;
  player.pickupRadius = CONFIG.pickupMagnetRadius;
  player.damageTakenScale = 1;
  player.novaRadius = CONFIG.baseNovaRadius;
  player.novaDamage = CONFIG.baseNovaDamage;
  player.novaCost = CONFIG.baseNovaCost;
  player.novaGainMult = 1;
  player.xpGainMult = 1;
  player.bleedDamage = 0;
  player.bleedDuration = 0;
  player.auraDamage = 0;
  player.auraRadius = 0;
  player.auraTick = 0;
  player.afterimageDamage = 0;
  player.levelHeal = 0;
  player.onShardHeal = 0;
  player.combo = 0;
  player.comboTimer = 0;
  player.overdrive = 0;
  player.overdriveCharge = 0;
  player.novaEchoes = 0;
  player.buildCore = null;
  player.buildAffinity = { fang: 0, ghost: 0, domain: 0 };
  player.majorPathCounts = { fang: 0, ghost: 0, domain: 0 };
  player.buildCounts = {};
  player.buildHistory = [];
  player.lastMajorPath = null;
  player.highestTier = "common";
  player.titleText = "Stray Wolf";
  player.comboExtension = 0;
  player.healOnComboKill = 0;
  player.executeThreshold = 0;
  player.bleedBurstDamage = 0;
  player.bleedBurstRadius = 0;
  player.dashRefundOnKill = 0;
  player.auraNovaGain = 0;
  player.pickupBoltDamage = 0;
  player.pickupBoltCount = 0;
  player.jamResist = 0;
  player.fangUltimate = false;
  player.ghostUltimate = false;
  player.domainUltimate = false;
  player.treeNodes = [];
}

function resetGame() {
  lastTime = 0;
  enemies = [];
  pickups = [];
  worldObjects = createWorldObjects();
  pendingChoices = [];
  currentChoice = null;
  storyIndex = 0;

  state.mode = "playing";
  state.time = 0;
  state.kills = 0;
  state.threatLevel = 1;
  state.spawnTimer = 0;
  state.hitFlash = 0;
  state.messageTimer = 2.2;
  state.messageText = "白狼接入战斗协议";
  state.effects = [];
  state.floatingTexts = [];
  state.enemyProjectiles = [];
  state.nextBossTime = CONFIG.bossFirstTime;
  state.bossStage = 0;
  state.particles = [];
  state.shake = 0;
  state.nextJammerTime = 26;
  state.jamSlow = 0;
  state.nextBountyTime = 34;
  state.nextLockdownTime = 48;
  state.bountyTarget = null;
  state.lockdownZone = null;
  state.lockdownDamageTick = 0;
  state.extractionUnlocked = false;
  state.extractionActive = false;
  state.extractionZone = null;
  state.extractionHold = 0;
  state.extractionGoal = 8;

  resetPlayer();
  setStory("“Zero，听得到吗？上城封锁已经落下。你只能往前撕。”");

  for (let i = 0; i < 8; i += 1) {
    spawnEnemy(true);
  }

  overlay.classList.add("hidden");
  choiceModal.classList.add("hidden");
  renderSkillTree();
  updateHud();
}

function endGame() {
  state.mode = "dead";
  choiceModal.classList.add("hidden");
  overlayTitle.textContent = "Zero 倒在上城封锁线";
  overlayText.textContent = `存活 ${state.time.toFixed(1)} 秒，猎杀 ${state.kills} 名追兵，等级 ${player.level}。按 R 可立即重开。`;
  startButton.textContent = "重新接入";
  overlay.classList.remove("hidden");
}

function winGame() {
  state.mode = "won";
  choiceModal.classList.add("hidden");
  overlayTitle.textContent = "Zero tore a path out of Upper City";
  overlayText.textContent = `Escaped in ${state.time.toFixed(1)}s with ${state.kills} kills at level ${player.level}. Press R to run it again.`;
  startButton.textContent = "Run Again";
  overlay.classList.remove("hidden");
}

function damageEnemy(enemy, amount, source = "slash") {
  const dealt = amount * getOutgoingDamageMultiplier(enemy, source);
  enemy.hp -= dealt;

  if (source === "slash" && player.executeThreshold > 0 && enemy.maxHp > 0 && enemy.hp / enemy.maxHp <= player.executeThreshold) {
    enemy.hp = 0;
  }

  spawnParticles(enemy.x, enemy.y, source === "nova" ? "#59e8ff" : "#ffd166", source === "nova" ? 9 : 6, 40, 170, 0.14, 0.34);
  state.floatingTexts.push({
    x: enemy.x,
    y: enemy.y - enemy.radius - 12,
    text: source === "nova" || source === "aura" ? "裂界" : `-${Math.round(dealt)}`,
    life: 0.65,
    color: source === "nova" ? "#59e8ff" : "#ffd166",
  });

  if (source === "slash" && player.bleedDamage > 0) {
    enemy.bleedTimer = player.bleedDuration;
    enemy.bleedDamage = player.bleedDamage;
  }

  if (enemy.hp > 0) {
    return;
  }

  state.kills += 1;
  player.combo += 1;
  player.comboTimer = 3.2 + player.comboExtension;
  player.overdriveCharge = clamp(player.overdriveCharge + enemy.xpValue * 1.2, 0, 100);
  player.nova = clamp(player.nova + enemy.xpValue * 0.4 * player.novaGainMult, 0, 100);
  addScreenShake(enemy.type === "boss" ? 18 : enemy.type === "elite" ? 10 : 6);
  spawnParticles(enemy.x, enemy.y, enemy.type === "boss" ? "#a7ff83" : enemy.type === "elite" ? "#ff4d6d" : "#59e8ff", enemy.type === "boss" ? 22 : 12, 80, 260, 0.2, 0.52);
  state.effects.push({
    type: enemy.type === "boss" ? "nova" : "burst",
    x: enemy.x,
    y: enemy.y,
    radius: enemy.radius * (enemy.type === "boss" ? 4.6 : 2.4),
    life: enemy.type === "boss" ? 0.8 : 0.35,
    color: enemy.type === "boss" ? "#a7ff83" : enemy.type === "elite" ? "#ff4d6d" : "#59e8ff",
  });

  dropPickup(enemy.x, enemy.y, enemy.xpValue);
  enemies = enemies.filter((item) => item !== enemy);

  if (player.overdriveCharge >= 100 && player.overdrive <= 0) {
    activateOverdrive();
  }

  if (player.healOnComboKill > 0 && player.combo >= 8) {
    player.hp = clamp(player.hp + player.healOnComboKill, 0, player.maxHp);
  }

  if (player.dashRefundOnKill > 0 && player.dashCharges < player.dashChargesMax) {
    player.dashRechargeTimer -= player.dashRefundOnKill;
    if (player.dashRechargeTimer <= 0) {
      player.dashCharges += 1;
      player.dashRechargeTimer = player.dashCharges < player.dashChargesMax ? player.dashRechargeBase : 0;
    }
  }

  if (player.bleedBurstDamage > 0 && enemy.bleedTimer > 0) {
    state.effects.push({
      type: "burst",
      x: enemy.x,
      y: enemy.y,
      radius: player.bleedBurstRadius,
      life: 0.2,
      color: "#ff8a7d",
    });
    applyAreaDamage(enemy.x, enemy.y, player.bleedBurstRadius, player.bleedBurstDamage, "slash");
  }

  if (enemy === state.bountyTarget) {
    state.bountyTarget = null;
    player.overdriveCharge = clamp(player.overdriveCharge + 40, 0, 100);
    player.nova = clamp(player.nova + 28, 0, 100);
    grantXp(32);
    setBurst("Bounty neutralized", 1.2);
    worldObjects.push({ kind: "crate", x: enemy.x, y: enemy.y, radius: 22, active: true, opened: false });
  }

  if (enemy.type === "boss") {
    state.nextBossTime = state.time + CONFIG.bossEvery;
    setBurst("机甲核心破裂，封锁出现缺口", 1.6);
    setStory("“很好。上城裂开了，但别停，第二道封锁已经在重编。”");
    const treeChoice = createSkillTreeChoice("Boss 核心被你撕开。选择一个 Zero 专属技能树节点作为战利品。");
    if (treeChoice) {
      queueChoice(treeChoice);
    }
    grantXp(80);
  } else if (enemy.type === "jammer") {
    setBurst("Jammer offline", 1);
    worldObjects.push({ kind: "crate", x: enemy.x, y: enemy.y, radius: 20, active: true, opened: false });
  }
}

function applyAreaDamage(x, y, radius, amount, source) {
  for (const enemy of [...enemies]) {
    if (dist({ x, y }, enemy) <= radius + enemy.radius) {
      damageEnemy(enemy, amount, source);
    }
  }
  damageWorldObjects(x, y, radius);
}

function fireNova() {
  if (state.mode !== "playing") {
    return;
  }

  if (player.nova < player.novaCost) {
    setBurst("万解能量不足", 0.8);
    return;
  }

  player.nova = 0;
  player.invuln = Math.max(player.invuln, 0.55);
  const palette = getBuildPalette();
  addScreenShake(16);
  spawnParticles(player.x, player.y, palette.nova, 28, 120, 340, 0.24, 0.64);
  setBurst("万解·零域断界", 1.4);
  state.effects.push({
    type: "nova",
    x: player.x,
    y: player.y,
    radius: player.novaRadius,
    life: 0.75,
    color: palette.nova,
    variant: player.buildCore,
  });
  applyAreaDamage(player.x, player.y, player.novaRadius, player.novaDamage, "nova");

  if (player.novaEchoes > 0) {
    for (let echo = 1; echo <= player.novaEchoes; echo += 1) {
      state.effects.push({
        type: "echo",
        x: player.x,
        y: player.y,
        radius: player.novaRadius * (1 + echo * 0.18),
        life: 0.55 + echo * 0.15,
        color: palette.secondary,
        delay: echo * 0.18,
        variant: player.buildCore,
      });
    }
  }

  state.enemyProjectiles = state.enemyProjectiles.filter((shot) => dist(player, shot) > player.novaRadius);
}

function tryDash() {
  if (state.mode !== "playing" || player.dashCharges <= 0 || player.dashTime > 0) {
    return;
  }

  const moveX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const moveY = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  const direction = normalizeVector(moveX || Math.cos(player.facing), moveY || Math.sin(player.facing));

  player.dashCharges -= 1;
  player.dashTime = player.dashDuration;
  player.invuln = Math.max(player.invuln, player.dashDuration + 0.08 + player.phaseAfterDash);
  player.facing = Math.atan2(direction.y, direction.x);
  const palette = getBuildPalette();
  addScreenShake(8);
  spawnParticles(player.x, player.y, palette.dash, 12, 80, 220, 0.14, 0.32);

  if (player.dashCharges < player.dashChargesMax && player.dashRechargeTimer <= 0) {
    player.dashRechargeTimer = player.dashRechargeBase;
  }

  state.effects.push({
    type: "dash",
    x: player.x,
    y: player.y,
    radius: 90,
    life: 0.24,
    color: palette.dash,
    angle: player.facing,
    variant: player.buildCore,
  });
}

function autoSlash() {
  const targets = enemies
    .filter((enemy) => dist(player, enemy) <= player.slashRange)
    .sort((left, right) => dist(player, left) - dist(player, right))
    .slice(0, player.slashTargets);

  if (targets.length === 0) {
    return;
  }

  player.slashCooldownTimer = player.slashCooldownBase * (player.overdrive > 0 ? 0.72 : 1);
  const primary = targets[0];
  player.facing = Math.atan2(primary.y - player.y, primary.x - player.x);
  const palette = getBuildPalette();

  targets.forEach((enemy) => {
    state.effects.push({
      type: "slash",
      x: player.x,
      y: player.y,
      targetX: enemy.x,
      targetY: enemy.y,
      radius: dist(player, enemy),
      life: 0.18,
      color: palette.slash,
      variant: player.buildCore,
    });
    damageEnemy(enemy, player.slashDamage + state.threatLevel * 1.8 + (player.overdrive > 0 ? 16 : 0), "slash");
    damageWorldObjects(enemy.x, enemy.y, 56);
  });
}

function hurtPlayer(amount, enemyType = "", damageType = "touch") {
  if (player.invuln > 0 || state.mode !== "playing") {
    return;
  }

  const finalDamage = amount * player.damageTakenScale * getIncomingDamageMultiplier(enemyType, damageType);
  player.hp -= finalDamage;
  player.invuln = 0.52;
  state.hitFlash = 0.25;
  addScreenShake(12);
  spawnParticles(player.x, player.y, "#ff8a7d", 14, 80, 240, 0.18, 0.42);
  state.floatingTexts.push({
    x: player.x,
    y: player.y - 44,
    text: `-${Math.round(finalDamage)}`,
    life: 0.65,
    color: "#ff8a7d",
  });

  if (player.hp <= 0) {
    player.hp = 0;
    updateHud();
    endGame();
  }
}

function updateJammerEffects() {
  state.jamSlow = 0;

  for (const enemy of enemies) {
    if (enemy.type === "jammer" && dist(player, enemy) <= enemy.auraRadius) {
      state.jamSlow = Math.max(state.jamSlow, 0.22);
    }
  }

  state.jamSlow *= 1 - player.jamResist;
}

function updateStageEvents(dt) {
  if (state.bountyTarget && !enemies.includes(state.bountyTarget)) {
    state.bountyTarget = null;
  }

  if (!state.extractionUnlocked && state.time >= CONFIG.extractionTime) {
    startExtractionWindow();
  }

  if (!state.extractionActive && !state.lockdownZone && !hasBossAlive() && state.time >= state.nextLockdownTime) {
    startLockdownZone();
  }

  if (!state.extractionActive && !hasBossAlive() && state.time >= state.nextBountyTime) {
    spawnBountyElite();
  }

  if (state.lockdownZone) {
    state.lockdownZone.life -= dt;
    state.lockdownZone.pulse -= dt;
    state.lockdownZone.radius += (state.lockdownZone.targetRadius - state.lockdownZone.radius) * Math.min(1, dt * 2.4);

    if (state.lockdownZone.pulse <= 0) {
      state.lockdownZone.pulse = 0.8;
      state.effects.push({
        type: "warning",
        x: state.lockdownZone.x,
        y: state.lockdownZone.y,
        radius: state.lockdownZone.radius,
        life: 0.24,
        color: "#ff8a7d",
      });
    }

    state.lockdownDamageTick -= dt;
    const insideZone = dist(player, state.lockdownZone) <= state.lockdownZone.radius;
    if (!insideZone) {
      state.lockdownDamageTick = Math.max(state.lockdownDamageTick, 0);
      if (state.lockdownDamageTick <= 0) {
        state.lockdownDamageTick = 0.55;
        hurtPlayer(7 + state.threatLevel * 0.55, "lockdown", "zone");
        addScreenShake(5);
      }
    }

    if (state.lockdownZone.life <= 0) {
      state.lockdownZone = null;
      state.lockdownDamageTick = 0;
      setBurst("Lockdown dissipated", 0.8);
    }
  }

  if (state.extractionActive && state.extractionZone) {
    state.extractionZone.pulse += dt * 2.4;
    const insideExtraction = dist(player, state.extractionZone) <= state.extractionZone.radius;
    state.extractionHold = clamp(
      state.extractionHold + (insideExtraction ? dt : -dt * 0.7),
      0,
      state.extractionGoal
    );

    if (insideExtraction && Math.random() < 0.18) {
      state.effects.push({
        type: "burst",
        x: state.extractionZone.x + randomRange(-28, 28),
        y: state.extractionZone.y + randomRange(-28, 28),
        radius: randomRange(18, 36),
        life: 0.16,
        color: "#a7ff83",
      });
    }

    if (state.extractionHold >= state.extractionGoal) {
      winGame();
    }
  }
}

function updateBoss(enemy, dt, direction, distanceToPlayer) {
  const profile = getBossAdaptiveProfile();
  enemy.burstCooldown -= dt * profile.burstRate;
  enemy.summonCooldown -= dt * profile.summonRate;
  enemy.chargeCooldown -= dt * profile.chargeRate;
  enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);

  if (enemy.chargeWindup > 0) {
    enemy.chargeWindup -= dt;
    if (enemy.chargeWindup <= 0) {
      enemy.chargeTime = 0.78;
    }
    return;
  }

  if (enemy.chargeTime > 0) {
    enemy.chargeTime -= dt;
    enemy.x += enemy.chargeVector.x * 520 * profile.chargeSpeed * dt;
    enemy.y += enemy.chargeVector.y * 520 * profile.chargeSpeed * dt;
  } else {
    enemy.x += direction.x * enemy.speed * dt;
    enemy.y += direction.y * enemy.speed * dt;
  }

  if (enemy.chargeCooldown <= 0 && distanceToPlayer > 180) {
    enemy.chargeCooldown = 6;
    enemy.chargeWindup = 0.45;
    enemy.chargeVector = direction;
    addScreenShake(8);
    state.effects.push({
      type: "warning",
      x: enemy.x,
      y: enemy.y,
      radius: 120,
      life: 0.45,
      color: "#ff4d6d",
    });
  }

  if (enemy.burstCooldown <= 0) {
    enemy.burstCooldown = 4.2;
    const projectileCount = 18 + profile.extraProjectiles;
    for (let i = 0; i < projectileCount; i += 1) {
      const angle = (Math.PI * 2 * i) / projectileCount + state.time * 0.4;
      state.enemyProjectiles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 250,
        vy: Math.sin(angle) * 250,
        radius: 8,
        life: 4,
        color: "#ff4d6d",
        damage: 14,
        enemyType: "boss",
      });
    }
  }

  if (enemy.summonCooldown <= 0) {
    enemy.summonCooldown = 8.5;
    const summonCount = (player.buildCore === "domain" ? 5 : 4) + (state.lockdownZone ? 1 : 0);
    for (let i = 0; i < summonCount; i += 1) {
      const angle = (Math.PI * 2 * i) / summonCount + Math.random() * 0.4;
      enemies.push(createEnemy("runner", enemy.x + Math.cos(angle) * 90, enemy.y + Math.sin(angle) * 90, 1 + state.threatLevel * 0.1));
    }
  }

  if (distanceToPlayer <= player.radius + enemy.radius + 8 && enemy.touchCooldown <= 0) {
    enemy.touchCooldown = 0.7;
    hurtPlayer(enemy.damage, "boss", enemy.chargeTime > 0 ? "charge" : "touch");
  }
}

function updateEnemy(enemy, dt) {
  enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);

  if (enemy.bleedTimer > 0) {
    enemy.bleedTimer -= dt;
    enemy.hp -= enemy.bleedDamage * dt;
    if (enemy.hp <= 0) {
      damageEnemy(enemy, 0, "slash");
      return;
    }
  }

  const direction = normalizeVector(player.x - enemy.x, player.y - enemy.y);
  const distanceToPlayer = dist(player, enemy);
  const pressureBoost = enemy.bounty ? 1.18 : 1;

  if (enemy.type === "boss") {
    updateBoss(enemy, dt, direction, distanceToPlayer);
    moveEntityWithSolids(enemy, 0, 0, 0.9);
    return;
  }

  if (enemy.type === "jammer") {
    enemy.fireCooldown -= dt;
    enemy.pulseTimer -= dt;

    if (enemy.pulseTimer <= 0) {
      enemy.pulseTimer = 1;
      state.effects.push({
        type: "warning",
        x: enemy.x,
        y: enemy.y,
        radius: enemy.auraRadius,
        life: 0.28,
        color: "#ff4d6d",
      });
    }

    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = 1.8;
      const toPlayer = normalizeVector(player.x - enemy.x, player.y - enemy.y);
      state.enemyProjectiles.push({
        x: enemy.x,
        y: enemy.y,
        vx: toPlayer.x * 240,
        vy: toPlayer.y * 240,
        radius: 8,
        life: 3.5,
        color: "#ff4d6d",
        damage: 11,
        enemyType: "jammer",
      });
    }
    return;
  }

  if (enemy.type === "turret") {
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = randomRange(1.45, 2.15);
      const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      for (const offset of [-0.28, 0, 0.28]) {
        const angle = base + offset;
        state.enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 300,
          vy: Math.sin(angle) * 300,
          radius: 7,
          life: 3.4,
          color: "#ffd166",
          damage: 10,
          enemyType: "turret",
        });
      }
    }
    return;
  }

  if (enemy.type === "brood_turret") {
    enemy.fireCooldown -= dt;
    enemy.summonCooldown -= dt;

    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = randomRange(1.1, 1.7);
      const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      for (const offset of [-0.22, 0, 0.22]) {
        const angle = base + offset;
        state.enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 320,
          vy: Math.sin(angle) * 320,
          radius: 8,
          life: 3.6,
          color: "#ff4d6d",
          damage: 12,
          enemyType: "brood_turret",
        });
      }
    }

    if (enemy.summonCooldown <= 0) {
      enemy.summonCooldown = randomRange(5.2, 7.8);
      const spawnTypes = state.time > 140 ? ["runner", "runner", "charger"] : ["runner", "runner", "shooter"];
      for (let i = 0; i < spawnTypes.length; i += 1) {
        const angle = (Math.PI * 2 * i) / spawnTypes.length + Math.random() * 0.6;
        const spawnX = enemy.x + Math.cos(angle) * 70;
        const spawnY = enemy.y + Math.sin(angle) * 70;
        enemies.push(createEnemy(spawnTypes[i], spawnX, spawnY, 1 + state.threatLevel * 0.08));
      }
      setBurst("Brood turret deployed reinforcements", 0.8);
      state.effects.push({
        type: "warning",
        x: enemy.x,
        y: enemy.y,
        radius: 90,
        life: 0.28,
        color: "#ff4d6d",
      });
    }
    return;
  }

  if (enemy.type === "laser") {
    enemy.fireCooldown -= dt;
    const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

    if (distanceToPlayer < 250) {
      moveEntityWithSolids(enemy, -direction.x * enemy.speed * 0.54 * dt, -direction.y * enemy.speed * 0.54 * dt, 0.88);
    } else if (distanceToPlayer > 520) {
      moveEntityWithSolids(enemy, direction.x * enemy.speed * 0.46 * dt, direction.y * enemy.speed * 0.46 * dt, 0.88);
    }

    if (enemy.beamCharge > 0) {
      enemy.beamCharge -= dt;
      if (enemy.beamCharge <= 0) {
        enemy.fireCooldown = randomRange(2.8, 4.4);
        const beamLength = 760;
        const end = {
          x: enemy.x + Math.cos(enemy.beamTarget) * beamLength,
          y: enemy.y + Math.sin(enemy.beamTarget) * beamLength,
        };
        state.enemyProjectiles.push({
          kind: "laserBeam",
          x: enemy.x,
          y: enemy.y,
          endX: end.x,
          endY: end.y,
          angle: enemy.beamTarget,
          radius: 16,
          life: 0.36,
          color: "#ff4d6d",
          damage: 18,
          enemyType: "laser",
          applied: false,
        });
      } else {
        enemy.beamTarget = targetAngle;
      }
      return;
    }

    if (enemy.fireCooldown <= 0) {
      enemy.beamCharge = 0.8;
      enemy.beamTarget = targetAngle;
      state.effects.push({
        type: "warning",
        x: enemy.x,
        y: enemy.y,
        radius: 120,
        life: 0.36,
        color: "#ff4d6d",
      });
    }
    return;
  }

  if (enemy.type === "missile") {
    enemy.fireCooldown -= dt;
    if (distanceToPlayer < 240) {
      moveEntityWithSolids(enemy, -direction.x * enemy.speed * 0.64 * dt, -direction.y * enemy.speed * 0.64 * dt, 0.88);
    } else if (distanceToPlayer > 420) {
      moveEntityWithSolids(enemy, direction.x * enemy.speed * 0.34 * dt, direction.y * enemy.speed * 0.34 * dt, 0.88);
    }

    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = randomRange(2.8, 4.4);
      const launch = normalizeVector(player.x - enemy.x, player.y - enemy.y);
      state.enemyProjectiles.push({
        kind: "missile",
        x: enemy.x,
        y: enemy.y,
        vx: launch.x * 170,
        vy: launch.y * 170,
        radius: 10,
        life: 5.8,
        color: "#ff8a7d",
        damage: 18,
        enemyType: "missile",
        speed: 170,
        turnRate: 3.8,
        blastRadius: 64,
      });
      state.effects.push({
        type: "burst",
        x: enemy.x,
        y: enemy.y,
        radius: 26,
        life: 0.12,
        color: "#ff8a7d",
      });
    }
    return;
  }

  if (enemy.type === "charger") {
    if (enemy.chargeWindup > 0) {
      enemy.chargeWindup -= dt;
      if (enemy.chargeWindup <= 0) {
        enemy.chargeTime = 0.5;
      }
    } else if (enemy.chargeTime > 0) {
      enemy.chargeTime -= dt;
      moveEntityWithSolids(enemy, enemy.chargeVector.x * 380 * dt, enemy.chargeVector.y * 380 * dt, 0.88);
    } else {
      enemy.chargeCooldown -= dt;
      if (enemy.chargeCooldown <= 0 && distanceToPlayer > 110) {
        enemy.chargeCooldown = randomRange(enemy.bounty ? 1.45 : 2.2, enemy.bounty ? 2.4 : 3.4);
        enemy.chargeWindup = enemy.bounty ? 0.25 : 0.35;
        enemy.chargeVector = direction;
        state.effects.push({
          type: "warning",
          x: enemy.x,
          y: enemy.y,
          radius: 64,
          life: 0.24,
          color: "#ffd166",
        });
      } else {
        moveEntityWithSolids(enemy, direction.x * enemy.speed * 0.88 * pressureBoost * dt, direction.y * enemy.speed * 0.88 * pressureBoost * dt, 0.88);
      }
    }

    if (distanceToPlayer <= player.radius + enemy.radius + 4 && enemy.touchCooldown <= 0) {
      enemy.touchCooldown = 0.8;
      hurtPlayer(enemy.damage, "charger", enemy.chargeTime > 0 ? "charge" : "touch");
    }
    return;
  }

  enemy.fireCooldown -= dt;
  const speedMultiplier = (enemy.type === "elite" ? 0.86 + Math.sin(state.time * 5 + enemy.x) * 0.06 : 1) * pressureBoost;

  if (enemy.type === "shooter" && distanceToPlayer < 370) {
    moveEntityWithSolids(enemy, -direction.x * enemy.speed * 0.32 * dt, -direction.y * enemy.speed * 0.32 * dt, 0.88);
    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = randomRange(enemy.bounty ? 0.72 : 1.15, enemy.bounty ? 1.2 : 1.95);
      const spread = enemy.bounty ? [-0.22, 0, 0.22] : [0];
      const baseAngle = Math.atan2(direction.y, direction.x);
      for (const offset of spread) {
        const angle = baseAngle + offset;
        state.enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * (enemy.bounty ? 380 : 340),
          vy: Math.sin(angle) * (enemy.bounty ? 380 : 340),
          radius: enemy.bounty ? 8 : 7,
          life: 3.2,
          color: enemy.bounty ? "#ff4d6d" : "#ffd166",
          damage: enemy.bounty ? 12 : 10,
          enemyType: enemy.bounty ? "bounty" : "shooter",
        });
      }
    }
  } else {
    moveEntityWithSolids(enemy, direction.x * enemy.speed * speedMultiplier * dt, direction.y * enemy.speed * speedMultiplier * dt, 0.88);
  }

  if (distanceToPlayer <= player.radius + enemy.radius + 4 && enemy.touchCooldown <= 0) {
    enemy.touchCooldown = enemy.type === "elite" ? 0.8 : 1.05;
    hurtPlayer(enemy.damage, enemy.type, "touch");
  }
}

function updateWorldObjects() {
  for (const object of worldObjects) {
    if (!object.active) {
      continue;
    }

    if (object.kind === "crate" && dist(player, object) <= player.radius + object.radius + 6) {
      openSupplyCrate(object);
    }
  }

  worldObjects = worldObjects.filter((object) => object.active);
}

function updatePickups(dt) {
  const activePickupRadius = Math.max(80, player.pickupRadius * (1 - state.jamSlow * 0.85));
  for (const pickup of pickups) {
    pickup.life -= dt;
    pickup.phase += dt * 5;

    const distance = dist(player, pickup);
    if (distance < activePickupRadius) {
      const direction = normalizeVector(player.x - pickup.x, player.y - pickup.y);
      pickup.x += direction.x * (220 + (activePickupRadius - distance) * 4.5) * dt;
      pickup.y += direction.y * (220 + (activePickupRadius - distance) * 4.5) * dt;
    }

    if (distance < CONFIG.pickupCollectRadius) {
      grantXp(pickup.value);
      player.hp = clamp(player.hp + player.onShardHeal, 0, player.maxHp);
      if (player.pickupBoltDamage > 0) {
        const palette = getBuildPalette();
        const targets = [...enemies]
          .sort((left, right) => dist(pickup, left) - dist(pickup, right))
          .slice(0, player.pickupBoltCount);

        for (const enemy of targets) {
          if (dist(pickup, enemy) <= 220) {
            state.effects.push({
              type: "bolt",
              x: pickup.x,
              y: pickup.y,
              targetX: enemy.x,
              targetY: enemy.y,
              radius: dist(pickup, enemy),
              life: 0.12,
              color: palette.bolt,
              variant: player.buildCore,
            });
            damageEnemy(enemy, player.pickupBoltDamage, "nova");
          }
        }
      }
      pickup.life = 0;
    }
  }

  pickups = pickups.filter((pickup) => pickup.life > 0);
}

function updateProjectiles(dt) {
  for (const shot of state.enemyProjectiles) {
    if (shot.kind === "laserBeam") {
      shot.life -= dt;
      if (!shot.applied) {
        shot.applied = true;
        if (distanceToSegment(player, { x: shot.x, y: shot.y }, { x: shot.endX, y: shot.endY }) <= player.radius + shot.radius) {
          hurtPlayer(shot.damage, shot.enemyType || "", "laser");
        }
      }
      continue;
    }

    if (shot.kind === "missile") {
      const desired = normalizeVector(player.x - shot.x, player.y - shot.y);
      const current = normalizeVector(shot.vx, shot.vy);
      const steer = clamp(shot.turnRate * dt, 0, 1);
      const next = normalizeVector(
        current.x + (desired.x - current.x) * steer,
        current.y + (desired.y - current.y) * steer
      );
      shot.vx = next.x * shot.speed;
      shot.vy = next.y * shot.speed;
    }

    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;

    for (const rect of CITY.solids) {
      if (rectIntersectsCircle(rect, shot.x, shot.y, shot.radius)) {
        shot.life = 0;
        spawnParticles(shot.x, shot.y, shot.color, 7, 50, 170, 0.12, 0.26);
        state.effects.push({
          type: "burst",
          x: shot.x,
          y: shot.y,
          radius: shot.kind === "missile" ? shot.blastRadius : 18,
          life: 0.14,
          color: shot.color,
        });
        if (shot.kind === "missile") {
          if (dist(player, shot) <= shot.blastRadius + player.radius) {
            hurtPlayer(shot.damage, shot.enemyType || "", "explosion");
          }
        }
        break;
      }
    }

    if (dist(player, shot) <= player.radius + shot.radius) {
      shot.life = 0;
      hurtPlayer(
        shot.damage,
        shot.enemyType || "",
        shot.kind === "missile" ? "explosion" : shot.enemyType === "boss" ? "projectile" : "projectile"
      );
      state.effects.push({
        type: "burst",
        x: shot.x,
        y: shot.y,
        radius: shot.kind === "missile" ? shot.blastRadius : 22,
        life: 0.18,
        color: shot.color,
      });
      if (shot.kind === "missile") {
        addScreenShake(8);
      }
    }
  }

  state.enemyProjectiles = state.enemyProjectiles.filter((shot) => {
    return shot.life > 0 && shot.x > -40 && shot.x < world.width + 40 && shot.y > -40 && shot.y < world.height + 40;
  });
}

function updateEffects(dt) {
  const pendingEchoDamage = [];

  for (const effect of state.effects) {
    if (effect.delay) {
      effect.delay -= dt;
      if (effect.delay <= 0) {
        pendingEchoDamage.push(effect);
        effect.delay = 0;
      }
    } else {
      effect.life -= dt;
    }
  }

  pendingEchoDamage.forEach((effect) => {
    applyAreaDamage(effect.x, effect.y, effect.radius, player.novaDamage * 0.35, "nova");
    effect.life -= dt;
  });

  state.effects = state.effects.filter((effect) => effect.life > 0);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
  }

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateFloatingTexts(dt) {
  for (const text of state.floatingTexts) {
    text.life -= dt;
    text.y -= 30 * dt;
  }
  state.floatingTexts = state.floatingTexts.filter((text) => text.life > 0);
}

function updateStoryEvents() {
  while (storyIndex < STORY_EVENTS.length && state.time >= STORY_EVENTS[storyIndex].time) {
    setStory(STORY_EVENTS[storyIndex].text);
    storyIndex += 1;
  }
}

function update(dt) {
  if (state.mode !== "playing") {
    return;
  }

  state.time += dt;
  state.threatLevel = 1 + Math.floor(state.time / 18);
  state.spawnTimer -= dt;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.hitFlash = Math.max(0, state.hitFlash - dt);
  state.shake = Math.max(0, state.shake - dt * 24);
  updateJammerEffects();

  player.dashTime = Math.max(0, player.dashTime - dt);
  player.slashCooldownTimer = Math.max(0, player.slashCooldownTimer - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.auraTick = Math.max(0, player.auraTick - dt);
  player.comboTimer = Math.max(0, player.comboTimer - dt);
  player.overdrive = Math.max(0, player.overdrive - dt);

  if (player.fangUltimate && player.overdrive > 0) {
    player.comboTimer = Math.max(player.comboTimer, 1);
  }

  if (player.comboTimer <= 0) {
    player.combo = 0;
  }

  if (player.dashCharges < player.dashChargesMax) {
    const rechargeRate = player.overdrive > 0 ? 1.45 + (player.ghostUltimate ? 0.35 : 0) : 1;
    player.dashRechargeTimer -= dt * rechargeRate;
    if (player.dashRechargeTimer <= 0) {
      player.dashCharges += 1;
      if (player.dashCharges < player.dashChargesMax) {
        player.dashRechargeTimer = player.dashRechargeBase;
      } else {
        player.dashRechargeTimer = 0;
      }
    }
  }

  const inputX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const inputY = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  const moving = inputX !== 0 || inputY !== 0;
  const input = normalizeVector(inputX, inputY);

  if (moving) {
    player.facing = Math.atan2(input.y, input.x);
  }

  const speedBoost = player.overdrive > 0 ? 1.18 + (player.ghostUltimate ? 0.08 : 0) : 1;
  const jamPenalty = 1 - state.jamSlow;
  const speed = (player.dashTime > 0 ? player.dashSpeed : player.moveSpeed) * speedBoost * jamPenalty;
  moveEntityWithSolids(player, input.x * speed * dt, input.y * speed * dt, 0.92);

  if (player.dashTime > 0) {
    for (const enemy of [...enemies]) {
      if (dist(player, enemy) <= player.radius + enemy.radius + 12) {
        damageEnemy(enemy, player.dashDamage + (player.overdrive > 0 ? 24 : 0), "dash");
      }
    }
  } else if (player.dashShockwave > 0 && moving && Math.random() < 0.07) {
    state.effects.push({
      type: "burst",
      x: player.x,
      y: player.y,
      radius: 42,
      life: 0.16,
      color: "#59e8ff",
    });
    applyAreaDamage(player.x, player.y, 42, 18 + player.dashShockwave * 6, "slash");
  }

  if (player.afterimageDamage > 0 && player.invuln > 0.45) {
    state.effects.push({
      type: "afterimage",
      x: player.x - Math.cos(player.facing) * 30,
      y: player.y - Math.sin(player.facing) * 30,
      radius: 34,
      life: 0.16,
      color: "#59e8ff",
    });
    applyAreaDamage(player.x, player.y, 34, player.afterimageDamage * dt * 6, "afterimage");
  }

  if (player.auraDamage > 0 && player.auraTick <= 0) {
    player.auraTick = player.domainUltimate ? 0.65 : 1;
    state.effects.push({
      type: "aura",
      x: player.x,
      y: player.y,
      radius: player.auraRadius,
      life: 0.35,
      color: "#a7ff83",
    });
    const beforeCount = enemies.length;
    applyAreaDamage(player.x, player.y, player.auraRadius, player.auraDamage, "aura");
    const hits = Math.max(0, beforeCount - enemies.length);
    if (hits > 0 && player.auraNovaGain > 0) {
      player.nova = clamp(player.nova + hits * player.auraNovaGain, 0, 100);
    }
  }

  if (player.slashCooldownTimer <= 0) {
    autoSlash();
  }

  updateStageEvents(dt);

  if (!hasBossAlive() && state.time >= state.nextBossTime) {
    spawnBoss();
  }

  if (!hasBossAlive() && state.time >= state.nextJammerTime) {
    spawnJammerTower();
  }

  const eventPressure = (state.lockdownZone ? 0.14 : 0) + (state.extractionActive ? 0.16 : 0) + (state.bountyTarget ? 0.08 : 0);
  const dynamicSpawnInterval = Math.max(0.22, CONFIG.spawnInterval - state.threatLevel * 0.055 - eventPressure);
  if (state.spawnTimer <= 0 && !hasBossAlive()) {
    state.spawnTimer = dynamicSpawnInterval;
    const wave = Math.min(2 + Math.floor(state.time / 16), 7) + (state.lockdownZone ? 1 : 0) + (state.extractionActive ? 1 : 0);
    for (let i = 0; i < wave; i += 1) {
      spawnEnemy();
    }
  }

  for (const enemy of [...enemies]) {
    updateEnemy(enemy, dt);
  }

  updateProjectiles(dt);
  updatePickups(dt);
  updateWorldObjects();
  updateEffects(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateStoryEvents();
  setObjectiveText();
  updateHud();
}

function drawBackground(camera) {
  ctx.fillStyle = "#050913";
  ctx.fillRect(0, 0, view.width, view.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "rgba(20,40,74,0.38)");
  gradient.addColorStop(1, "rgba(8,12,25,0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(-camera.x * 0.18, -camera.y * 0.18);
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 160) % (world.width + 120);
    const baseY = 40 + (i % 7) * 96;
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,77,109,0.11)" : "rgba(89,232,255,0.08)";
    ctx.fillRect(x, baseY, 28 + (i % 4) * 12, 240 + (i % 5) * 36);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (const district of CITY.districts) {
    ctx.fillStyle = district.tint;
    ctx.fillRect(district.x, district.y, district.w, district.h);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.strokeRect(district.x + 10, district.y + 10, district.w - 20, district.h - 20);
  }

  for (const road of CITY.roads.vertical) {
    ctx.fillStyle = "rgba(18,24,40,0.86)";
    ctx.fillRect(road.x, 0, road.w, world.height);
    ctx.fillStyle = road.glow;
    ctx.fillRect(road.x + 6, 0, 3, world.height);
    ctx.fillRect(road.x + road.w - 9, 0, 3, world.height);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 24]);
    ctx.beginPath();
    ctx.moveTo(road.x + road.w / 2, 0);
    ctx.lineTo(road.x + road.w / 2, world.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const road of CITY.roads.horizontal) {
    ctx.fillStyle = "rgba(20,24,38,0.88)";
    ctx.fillRect(0, road.y, world.width, road.h);
    ctx.fillStyle = road.glow;
    ctx.fillRect(0, road.y + 6, world.width, 3);
    ctx.fillRect(0, road.y + road.h - 9, world.width, 3);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 24]);
    ctx.beginPath();
    ctx.moveTo(0, road.y + road.h / 2);
    ctx.lineTo(world.width, road.y + road.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const vertical of CITY.roads.vertical) {
    for (const horizontal of CITY.roads.horizontal) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 7; i += 1) {
        const stripeX = vertical.x + 18 + i * 22;
        ctx.fillRect(stripeX, horizontal.y + 16, 10, 18);
        ctx.fillRect(stripeX, horizontal.y + horizontal.h - 34, 10, 18);
      }
      for (let i = 0; i < 6; i += 1) {
        const stripeY = horizontal.y + 22 + i * 24;
        ctx.fillRect(vertical.x + 14, stripeY, 18, 10);
        ctx.fillRect(vertical.x + vertical.w - 32, stripeY, 18, 10);
      }
    }
  }

  for (const puddle of CITY.puddles) {
    const puddleGradient = ctx.createLinearGradient(puddle.x, puddle.y, puddle.x + puddle.w, puddle.y + puddle.h);
    puddleGradient.addColorStop(0, "rgba(255,255,255,0.02)");
    puddleGradient.addColorStop(1, `${puddle.hue}44`);
    ctx.fillStyle = puddleGradient;
    ctx.beginPath();
    ctx.ellipse(puddle.x, puddle.y, puddle.w / 2, puddle.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.lockdownZone) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(255,77,109,0.68)";
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(state.lockdownZone.x, state.lockdownZone.y, state.lockdownZone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,77,109,0.08)";
    ctx.beginPath();
    ctx.arc(state.lockdownZone.x, state.lockdownZone.y, state.lockdownZone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (state.extractionActive && state.extractionZone) {
    const pulse = 1 + Math.sin(state.extractionZone.pulse) * 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(167,255,131,0.86)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(state.extractionZone.x, state.extractionZone.y, state.extractionZone.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(89,232,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.extractionZone.x, state.extractionZone.y, state.extractionZone.radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const rect of CITY.solids) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(rect.x + 16, rect.y + 18, rect.w, rect.h);

    const top = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    if (rect.style === "tower") {
      top.addColorStop(0, "#25395f");
      top.addColorStop(1, "#121c32");
    } else if (rect.style === "market") {
      top.addColorStop(0, "#4b2943");
      top.addColorStop(1, "#22142c");
    } else if (rect.style === "lab") {
      top.addColorStop(0, "#1f3f4a");
      top.addColorStop(1, "#13232a");
    } else if (rect.style === "substation") {
      top.addColorStop(0, "#4d3d20");
      top.addColorStop(1, "#221a11");
    } else {
      top.addColorStop(0, "#31343f");
      top.addColorStop(1, "#1a1c24");
    }

    ctx.fillStyle = top;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(rect.x + 10, rect.y + 10, rect.w - 20, 12);

    const stripColor = rect.style === "market" ? "#ff4d6d" : rect.style === "substation" ? "#ffd166" : "#59e8ff";
    ctx.fillStyle = `${stripColor}55`;
    ctx.fillRect(rect.x + 8, rect.y + rect.h - 18, rect.w - 16, 6);
  }

  for (const prop of CITY.props) {
    ctx.fillStyle = prop.kind === "pipe" ? "rgba(79,97,132,0.9)" : "rgba(46,51,66,0.9)";
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    if (prop.kind === "pipe") {
      ctx.fillStyle = "rgba(89,232,255,0.3)";
      ctx.fillRect(prop.x + prop.w / 2 - 3, prop.y, 6, prop.h);
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
    }
  }

  for (const board of CITY.billboards) {
    ctx.fillStyle = "rgba(6,10,18,0.9)";
    ctx.fillRect(board.x, board.y, board.w, board.h);
    ctx.strokeStyle = `${board.color}88`;
    ctx.strokeRect(board.x, board.y, board.w, board.h);
    ctx.fillStyle = board.color;
    ctx.font = '700 10px "Bahnschrift", "Arial Narrow", sans-serif';
    ctx.fillText(board.text, board.x + 10, board.y + 4);
  }

  ctx.strokeStyle = "rgba(89,232,255,0.05)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(80 + i * 220, 0);
    ctx.lineTo(220 + i * 220, world.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorldBorder(camera) {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.strokeStyle = "rgba(167,255,131,0.18)";
  ctx.lineWidth = 10;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(0, 0, world.width, world.height);
  ctx.restore();
  ctx.setLineDash([]);
}

function drawEffects(camera) {
  for (const effect of state.effects) {
    if (effect.delay > 0) {
      continue;
    }

    const pos = worldToScreen(effect.x, effect.y, camera);
    const alpha = clamp(effect.life * 1.5, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (effect.type === "slash" || effect.type === "bolt") {
      const targetX = effect.targetX - camera.x;
      const targetY = effect.targetY - camera.y;
      ctx.strokeStyle = effect.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = effect.color;

      if (effect.variant === "fang") {
        ctx.lineWidth = effect.type === "bolt" ? 4 : 7;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        if (effect.type === "slash") {
          ctx.beginPath();
          ctx.arc(targetX, targetY, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (effect.variant === "ghost") {
        ctx.lineWidth = effect.type === "bolt" ? 3 : 5;
        ctx.setLineDash(effect.type === "bolt" ? [8, 6] : [18, 10]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (effect.variant === "domain") {
        ctx.lineWidth = effect.type === "bolt" ? 4 : 6;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        const mx = (pos.x + targetX) / 2;
        const my = (pos.y + targetY) / 2 - 20;
        ctx.quadraticCurveTo(mx, my, targetX, targetY);
        ctx.stroke();
      } else {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
    } else if (effect.type === "dash") {
      ctx.translate(pos.x, pos.y);
      ctx.rotate(effect.angle);
      const grad = ctx.createLinearGradient(-90, 0, 10, 0);
      grad.addColorStop(0, "rgba(89,232,255,0)");
      grad.addColorStop(1, effect.color);
      ctx.fillStyle = grad;
      if (effect.variant === "fang") {
        ctx.beginPath();
        ctx.moveTo(-118, -24);
        ctx.lineTo(18, 0);
        ctx.lineTo(-118, 24);
        ctx.closePath();
        ctx.fill();
      } else if (effect.variant === "ghost") {
        ctx.fillRect(-122, -12, 140, 24);
      } else if (effect.variant === "domain") {
        ctx.beginPath();
        ctx.ellipse(-34, 0, 86, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-110, -18);
        ctx.lineTo(16, 0);
        ctx.lineTo(-110, 18);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.type === "nova" ? 8 : 4;
      ctx.shadowBlur = effect.type === "warning" ? 20 : 28;
      ctx.shadowColor = effect.color;
      if (effect.type === "nova" && effect.variant === "fang") {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * (1.18 - effect.life * 0.28), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * 0.76, 0, Math.PI * 2);
        ctx.stroke();
      } else if ((effect.type === "nova" || effect.type === "echo") && effect.variant === "ghost") {
        ctx.setLineDash([16, 10]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * (1.2 - effect.life * 0.3), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if ((effect.type === "nova" || effect.type === "aura" || effect.type === "echo") && effect.variant === "domain") {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * (1.22 - effect.life * 0.35), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * 0.58, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effect.radius * (1.22 - effect.life * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

function drawPickups(camera) {
  for (const pickup of pickups) {
    const pos = worldToScreen(pickup.x, pickup.y, camera);
    ctx.save();
    ctx.translate(pos.x, pos.y + Math.sin(pickup.phase) * 4);
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffd166";
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(0, -pickup.radius);
    ctx.lineTo(pickup.radius, 0);
    ctx.lineTo(0, pickup.radius);
    ctx.lineTo(-pickup.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawWorldObjects(camera) {
  for (const object of worldObjects) {
    const pos = worldToScreen(object.x, object.y, camera);
    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (object.kind === "barrel") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ff8a7d";
      ctx.fillStyle = "#662631";
      ctx.fillRect(-12, -16, 24, 32);
      ctx.fillStyle = "#ff8a7d";
      ctx.fillRect(-12, -8, 24, 4);
      ctx.fillRect(-12, 4, 24, 4);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(-12, -16, 24, 32);
    } else {
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#a7ff83";
      ctx.fillStyle = "#253747";
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = "#a7ff83";
      ctx.fillRect(-9, -3, 18, 6);
      ctx.fillRect(-3, -9, 6, 18);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(-15, -15, 30, 30);
    }

    ctx.restore();
  }
}

function drawParticles(camera) {
  for (const particle of state.particles) {
    const pos = worldToScreen(particle.x, particle.y, camera);
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(Math.atan2(particle.vy, particle.vx));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size * 0.5, -1.5, particle.size, 3);
    ctx.restore();
  }
}

function drawForegroundDecor(camera) {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (const road of CITY.roads.horizontal) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, road.y - 8, world.width, 8);
    ctx.fillRect(0, road.y + road.h, world.width, 8);
  }

  for (const road of CITY.roads.vertical) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(road.x - 8, 0, 8, world.height);
    ctx.fillRect(road.x + road.w, 0, 8, world.height);
  }

  const poles = [
    { x: 410, y: 760, h: 120, color: "#59e8ff" },
    { x: 1170, y: 1180, h: 120, color: "#ff4d6d" },
    { x: 1555, y: 760, h: 120, color: "#a7ff83" },
    { x: 2220, y: 1180, h: 120, color: "#ffd166" },
  ];

  for (const pole of poles) {
    ctx.fillStyle = "rgba(18,24,38,0.9)";
    ctx.fillRect(pole.x, pole.y, 8, pole.h);
    ctx.fillStyle = `${pole.color}66`;
    ctx.fillRect(pole.x - 2, pole.y + 18, 12, 18);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(pole.x - 12, pole.y + pole.h - 12, 32, 8);
  }

  ctx.restore();
}

function fillPolygon(points) {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBipedFigure(size, colors, pose = "runner", options = {}) {
  const lean = pose === "charger" ? 0.18 : pose === "shooter" ? -0.08 : pose === "boss" ? 0.04 : 0;
  const shoulder = size * (options.broad ? 0.72 : 0.56);
  const hip = size * 0.34;
  const stride = pose === "charger" ? size * 0.34 : pose === "runner" ? size * 0.28 : size * 0.2;
  const armReach = pose === "shooter" ? size * 0.9 : pose === "boss" ? size * 0.72 : size * 0.54;

  ctx.save();
  ctx.rotate(lean);

  if (options.cloak) {
    ctx.fillStyle = colors.shadow || "rgba(0,0,0,0.24)";
    ctx.globalAlpha *= 0.35;
    fillPolygon([
      [-shoulder * 0.8, -size * 0.12],
      [-size * 0.95, size * 0.14],
      [-size * 0.74, size * 0.92],
      [-hip * 0.2, size * 0.48],
    ]);
    ctx.globalAlpha /= 0.35;
  }

  ctx.fillStyle = colors.limb;
  fillPolygon([
    [-hip * 0.7, size * 0.18],
    [-hip - stride * 0.34, size * 0.98],
    [-hip * 0.15, size * 0.98],
    [-hip * 0.05, size * 0.18],
  ]);
  fillPolygon([
    [hip * 0.05, size * 0.18],
    [hip + stride * 0.38, size * 0.98],
    [hip * 0.95, size * 0.98],
    [hip * 0.52, size * 0.18],
  ]);

  ctx.fillStyle = colors.body;
  fillPolygon([
    [-shoulder, -size * 0.2],
    [shoulder, -size * 0.2],
    [hip, size * 0.32],
    [-hip, size * 0.32],
  ]);

  ctx.fillStyle = colors.limb;
  fillPolygon([
    [-shoulder * 0.92, -size * 0.16],
    [-shoulder - size * 0.18, size * 0.44],
    [-shoulder * 0.5, size * 0.5],
    [-shoulder * 0.2, size * 0.04],
  ]);
  fillPolygon([
    [shoulder * 0.2, size * 0.02],
    [shoulder * 0.58 + armReach, pose === "shooter" ? -size * 0.02 : size * 0.34],
    [shoulder * 0.5, size * 0.5],
    [shoulder * 0.04, size * 0.18],
  ]);

  if (options.weapon === "gun") {
    ctx.fillStyle = colors.accent;
    ctx.fillRect(shoulder * 0.62, -size * 0.08, size * 0.78, size * 0.12);
    ctx.fillRect(shoulder * 0.92, size * 0.02, size * 0.24, size * 0.14);
  } else if (options.weapon === "blade") {
    ctx.fillStyle = colors.accent;
    fillPolygon([
      [shoulder * 0.56, -size * 0.04],
      [size * 1.28, -size * 0.22],
      [size * 1.08, size * 0.06],
      [shoulder * 0.58, size * 0.08],
    ]);
  }

  if (options.spikes) {
    ctx.fillStyle = colors.accent;
    fillPolygon([
      [-shoulder * 0.94, -size * 0.2],
      [-shoulder * 0.48, -size * 0.58],
      [-shoulder * 0.16, -size * 0.22],
    ]);
    fillPolygon([
      [shoulder * 0.94, -size * 0.2],
      [shoulder * 0.48, -size * 0.58],
      [shoulder * 0.16, -size * 0.22],
    ]);
  }

  if (options.tail) {
    ctx.fillStyle = colors.accent;
    fillPolygon([
      [-hip * 0.9, size * 0.22],
      [-size * 1.08, size * 0.52],
      [-size * 0.4, size * 0.4],
    ]);
  }

  ctx.fillStyle = colors.head;
  ctx.beginPath();
  ctx.arc(0, -size * 0.58, size * 0.24, 0, Math.PI * 2);
  ctx.fill();

  if (options.ears) {
    ctx.fillStyle = colors.accent;
    fillPolygon([
      [-size * 0.18, -size * 0.78],
      [-size * 0.32, -size * 1.06],
      [-size * 0.03, -size * 0.88],
    ]);
    fillPolygon([
      [size * 0.18, -size * 0.78],
      [size * 0.03, -size * 0.88],
      [size * 0.32, -size * 1.06],
    ]);
  }

  ctx.fillStyle = colors.visor;
  ctx.fillRect(-size * 0.18, -size * 0.64, size * 0.36, size * 0.08);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(-size * 0.12, -size * 0.08, size * 0.24, size * 0.18);
  ctx.restore();
}

function getEnemyDisplayColor(type) {
  if (type === "boss" || type === "turret") {
    return "#a7ff83";
  }
  if (type === "elite" || type === "jammer" || type === "laser" || type === "brood_turret") {
    return "#ff4d6d";
  }
  if (type === "shooter") {
    return "#ffd166";
  }
  if (type === "charger" || type === "missile") {
    return "#ff8a7d";
  }
  return "#59e8ff";
}

function getHeroSpriteSet() {
  if (player.buildCore === "fang") {
    return { idle: SPRITES.heroFang, run: SPRITES.heroFangRun };
  }
  if (player.buildCore === "ghost") {
    return { idle: SPRITES.heroGhost, run: SPRITES.heroGhostRun };
  }
  if (player.buildCore === "domain") {
    return { idle: SPRITES.heroDomain, run: SPRITES.heroDomainRun };
  }
  return { idle: SPRITES.hero, run: SPRITES.heroRun };
}

function getEnemySprite(enemy) {
  if (enemy.type === "boss") {
    return SPRITES.enemyBoss;
  }
  if (enemy.type === "elite") {
    return SPRITES.enemyElite;
  }
  if (enemy.type === "shooter") {
    return SPRITES.enemyShooter;
  }
  if (enemy.type === "charger") {
    return SPRITES.enemyCharger;
  }
  if (enemy.type === "runner") {
    return SPRITES.enemyRunner;
  }
  return null;
}

function drawSpriteBillboard(sprite, width, height, options = {}) {
  if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) {
    return false;
  }

  const {
    facing = 1,
    y = 0,
    rotation = 0,
    shadowWidth = width * 0.28,
    shadowHeight = height * 0.08,
    shadowY = height * 0.24,
    ghostTrail = false,
  } = options;

  ctx.save();
  ctx.scale(facing, 1);
  ctx.rotate(rotation * facing);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  if (ghostTrail) {
    ctx.globalAlpha *= 0.22;
    ctx.drawImage(sprite, -width / 2 - 6 * facing, y + 3, width, height);
    ctx.globalAlpha /= 0.22;
  }

  ctx.drawImage(sprite, -width / 2, y, width, height);
  ctx.restore();
  return true;
}

function drawEnemies(camera) {
  for (const enemy of enemies) {
    const pos = worldToScreen(enemy.x, enemy.y, camera);
    const healthRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    const enemySprite = getEnemySprite(enemy);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(Math.atan2(player.y - enemy.y, player.x - enemy.x));

    if (enemySprite) {
      const facing = Math.cos(Math.atan2(player.y - enemy.y, player.x - enemy.x)) >= 0 ? 1 : -1;
      if (enemy.type === "boss") {
        drawSpriteBillboard(enemySprite, 124, 124, {
          facing,
          y: -84,
          rotation: 0.03,
          shadowWidth: 30,
          shadowHeight: 11,
          shadowY: 36,
        });
      } else if (enemy.type === "elite") {
        drawSpriteBillboard(enemySprite, 88, 88, {
          facing,
          y: -58,
          rotation: 0.03,
          shadowWidth: 22,
          shadowHeight: 8,
          shadowY: 26,
        });
      } else if (enemy.type === "shooter") {
        drawSpriteBillboard(enemySprite, 82, 82, {
          facing,
          y: -54,
          rotation: 0.02,
          shadowWidth: 20,
          shadowHeight: 8,
          shadowY: 24,
        });
      } else if (enemy.type === "charger") {
        drawSpriteBillboard(enemySprite, 92, 92, {
          facing,
          y: -58,
          rotation: 0.04,
          shadowWidth: 22,
          shadowHeight: 8,
          shadowY: 26,
        });
      } else {
        drawSpriteBillboard(enemySprite, 78, 78, {
          facing,
          y: -50,
          rotation: 0.02,
          shadowWidth: 18,
          shadowHeight: 7,
          shadowY: 23,
        });
      }
    } else if (enemy.type === "boss") {
      ctx.shadowBlur = 34;
      ctx.shadowColor = "rgba(255,77,109,0.75)";
      drawBipedFigure(enemy.radius * 0.9, {
        body: "#3b425a",
        limb: "#1b2032",
        head: "#d8dde9",
        visor: "#ff4d6d",
        accent: "#ff8a7d",
        shadow: "rgba(255,77,109,0.28)",
      }, "boss", { broad: true, spikes: true, weapon: "blade", cloak: true });
      ctx.strokeStyle = "rgba(255,77,109,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.type === "elite") {
      ctx.shadowBlur = 28;
      ctx.shadowColor = "rgba(255,77,109,0.75)";
      drawBipedFigure(enemy.radius * 0.78, {
        body: "#5b3142",
        limb: "#2b1420",
        head: "#f0d7de",
        visor: "#ff4d6d",
        accent: "#ffd166",
        shadow: "rgba(255,77,109,0.24)",
      }, "elite", { broad: true, spikes: true, weapon: "blade" });
    } else if (enemy.type === "shooter") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,209,102,0.6)";
      drawBipedFigure(enemy.radius * 0.78, {
        body: "#5d4a25",
        limb: "#2e2414",
        head: "#efe1b8",
        visor: "#ffd166",
        accent: "#ffd166",
        shadow: "rgba(255,209,102,0.22)",
      }, "shooter", { weapon: "gun" });
    } else if (enemy.type === "charger") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,138,125,0.7)";
      drawBipedFigure(enemy.radius * 0.8, {
        body: "#69322f",
        limb: "#311613",
        head: "#f6d8d0",
        visor: "#ff8a7d",
        accent: "#ff8a7d",
        shadow: "rgba(255,138,125,0.2)",
      }, "charger", { broad: true, weapon: "blade" });
    } else if (enemy.type === "laser") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,77,109,0.7)";
      drawBipedFigure(enemy.radius * 0.8, {
        body: "#4f2835",
        limb: "#241018",
        head: "#f7d8df",
        visor: "#ff4d6d",
        accent: "#ff8a7d",
        shadow: "rgba(255,77,109,0.2)",
      }, "shooter", { weapon: "gun" });
    } else if (enemy.type === "missile") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,138,125,0.7)";
      drawBipedFigure(enemy.radius * 0.82, {
        body: "#5f3726",
        limb: "#2b180f",
        head: "#f8decf",
        visor: "#ff8a7d",
        accent: "#ffd166",
        shadow: "rgba(255,138,125,0.18)",
      }, "shooter", { weapon: "gun", broad: true });
    } else if (enemy.type === "brood_turret") {
      ctx.shadowBlur = 24;
      ctx.shadowColor = "rgba(255,77,109,0.72)";
      ctx.fillStyle = "#3a1220";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#0d1526";
      ctx.fillRect(-10, -enemy.radius - 14, 20, 24);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(-7, -enemy.radius - 10, 14, 8);
    } else if (enemy.type === "turret") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(167,255,131,0.6)";
      ctx.fillStyle = "#a7ff83";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0d1526";
      ctx.fillRect(-6, -enemy.radius - 10, 12, 18);
    } else if (enemy.type === "jammer") {
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(255,77,109,0.75)";
      ctx.strokeStyle = "#ff4d6d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-enemy.radius - 4, 0);
      ctx.lineTo(enemy.radius + 4, 0);
      ctx.moveTo(0, -enemy.radius - 4);
      ctx.lineTo(0, enemy.radius + 4);
      ctx.stroke();
    } else {
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(89,232,255,0.65)";
      drawBipedFigure(enemy.radius * 0.74, {
        body: "#274c59",
        limb: "#12252d",
        head: "#e2fbff",
        visor: "#59e8ff",
        accent: "#8bc1ff",
        shadow: "rgba(89,232,255,0.18)",
      }, "runner");
    }

    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(pos.x - enemy.radius, pos.y - enemy.radius - 16, enemy.radius * 2, 4);
    ctx.fillStyle = getEnemyDisplayColor(enemy.type);
    ctx.fillRect(pos.x - enemy.radius, pos.y - enemy.radius - 16, enemy.radius * 2 * healthRatio, 4);
  }
}

function drawProjectiles(camera) {
  for (const shot of state.enemyProjectiles) {
    const pos = worldToScreen(shot.x, shot.y, camera);
    ctx.save();
    if (shot.kind === "laserBeam") {
      const end = worldToScreen(shot.endX, shot.endY, camera);
      ctx.strokeStyle = shot.color;
      ctx.shadowBlur = 18;
      ctx.shadowColor = shot.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else {
      ctx.translate(pos.x, pos.y);
      ctx.shadowBlur = 14;
      ctx.shadowColor = shot.color;
      ctx.fillStyle = shot.color;
      if (shot.kind === "missile") {
        ctx.rotate(Math.atan2(shot.vy, shot.vx));
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-10, -7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 7);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, shot.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawPlayer(camera) {
  const pos = worldToScreen(player.x, player.y, camera);
  const pulse = 0.92 + Math.sin(state.time * 10) * 0.04;
  const palette = getBuildPalette();
  const moveX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const moveY = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  const isMoving = player.dashTime > 0 || moveX !== 0 || moveY !== 0;
  const stridePhase = state.time * (player.dashTime > 0 ? 20 : 12);
  const bob = isMoving ? Math.sin(stridePhase) * 2.6 : Math.sin(state.time * 4) * 1.2;
  const sway = isMoving ? Math.sin(stridePhase) * 0.06 : 0;

  ctx.save();
  ctx.translate(pos.x, pos.y + bob);
  ctx.rotate(player.facing + sway);
  ctx.scale(pulse, pulse);

  if (player.invuln > 0) {
    ctx.globalAlpha = 0.78;
  }

  ctx.shadowBlur = 26;
  ctx.shadowColor = player.nova >= player.novaCost ? palette.nova : palette.accent;

  if (player.buildCore === "fang") {
    ctx.strokeStyle = `${palette.primary}aa`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0.4, -0.4);
    ctx.stroke();
  } else if (player.buildCore === "ghost") {
    ctx.strokeStyle = `${palette.secondary}aa`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (player.buildCore === "domain") {
    ctx.strokeStyle = `${palette.nova}88`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  const heroSet = getHeroSpriteSet();
  const heroSprite = isMoving ? heroSet.run : heroSet.idle;
  if (heroSprite.complete && heroSprite.naturalWidth > 0) {
    const faceRight = Math.cos(player.facing) >= 0 ? 1 : -1;
    const spriteSize = isMoving ? 112 : 96;
    const spriteY = isMoving ? -72 : -62;
    ctx.globalAlpha *= player.invuln > 0 ? 0.9 : 1;
    drawSpriteBillboard(heroSprite, spriteSize, spriteSize, {
      facing: faceRight,
      y: spriteY,
      rotation: isMoving ? 0.12 : 0.05,
      shadowWidth: isMoving ? 26 : 22,
      shadowHeight: isMoving ? 10 : 9,
      shadowY: 34,
      ghostTrail: isMoving,
    });

    ctx.fillStyle = `${palette.nova}22`;
    ctx.beginPath();
    ctx.arc(2, -26, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawBipedFigure(28, {
      body: player.buildCore === "fang" ? "#f7e8eb" : player.buildCore === "domain" ? "#ebffe5" : "#f4fbff",
      limb: "#d9e6f2",
      head: "#ffffff",
      visor: player.buildCore === "fang" ? palette.primary : player.buildCore === "domain" ? palette.nova : palette.secondary,
      accent: palette.secondary,
      shadow: "rgba(89,232,255,0.14)",
    }, "runner", { ears: true, tail: true, cloak: true, weapon: "blade", broad: true });

    ctx.fillStyle = palette.primary;
    ctx.fillRect(6, -4, 12, 3);
  }
  ctx.restore();
}

function drawFloatingTexts(camera) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = 'bold 18px "Bahnschrift", "Arial Narrow", sans-serif';
  for (const text of state.floatingTexts) {
    const pos = worldToScreen(text.x, text.y, camera);
    ctx.globalAlpha = clamp(text.life * 1.5, 0, 1);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, pos.x, pos.y);
  }

  if (state.bountyTarget && enemies.includes(state.bountyTarget)) {
    const marker = worldToScreen(state.bountyTarget.x, state.bountyTarget.y - state.bountyTarget.radius - 26, camera);
    ctx.save();
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marker.x - 14, marker.y);
    ctx.lineTo(marker.x - 4, marker.y - 10);
    ctx.lineTo(marker.x + 4, marker.y - 10);
    ctx.lineTo(marker.x + 14, marker.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,77,109,0.18)";
    ctx.beginPath();
    ctx.arc(marker.x, marker.y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBossBar() {
  const boss = enemies.find((enemy) => enemy.type === "boss");
  if (!boss) {
    return;
  }

  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  const width = 540;
  const x = (view.width - width) / 2;
  const y = 26;

  ctx.save();
  ctx.fillStyle = "rgba(7, 12, 25, 0.8)";
  ctx.strokeStyle = "rgba(255,77,109,0.32)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 44, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#eef4ff";
  ctx.font = '700 16px "Bahnschrift", "Arial Narrow", sans-serif';
  ctx.fillText(`执政机甲 Mk.${state.bossStage}`, x + 18, y + 11);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 18, y + 28, width - 36, 8);
  ctx.fillStyle = "#ff4d6d";
  ctx.fillRect(x + 18, y + 28, (width - 36) * ratio, 8);
  ctx.restore();
}

function drawHud(camera) {
  ctx.save();
  ctx.textBaseline = "top";
  const palette = getBuildPalette();

  ctx.fillStyle = "rgba(7, 12, 25, 0.72)";
  ctx.strokeStyle = "rgba(89,232,255,0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(20, 20, 324, 170, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#eef4ff";
  ctx.font = '700 18px "Bahnschrift", "Arial Narrow", sans-serif';
  ctx.fillText(`TIME ${state.time.toFixed(1)}s`, 38, 36);
  ctx.fillText(`THREAT ${state.threatLevel}`, 38, 62);
  ctx.fillText(`LEVEL ${player.level}`, 38, 88);
  ctx.font = '700 16px "Bahnschrift", "Arial Narrow", sans-serif';
  ctx.fillStyle = player.overdrive > 0 ? palette.primary : palette.nova;
  ctx.fillText(`COMBO ${player.combo}`, 164, 36);
  ctx.fillText(player.overdrive > 0 ? `OD ${player.overdrive.toFixed(1)}s` : `OD ${Math.round(player.overdriveCharge)}%`, 164, 62);
  ctx.fillStyle = player.buildCore ? palette.secondary : "#9bb3d9";
  ctx.fillText(
    `${player.buildCore ? BUILD_LABELS[player.buildCore] : "UNSHAPED"}${state.jamSlow > 0 ? " / JAMMED" : ""}`,
    164,
    88
  );
  ctx.font = '700 14px "Bahnschrift", "Arial Narrow", sans-serif';
  ctx.fillStyle = state.extractionActive
    ? "#a7ff83"
    : state.lockdownZone
      ? "#ff8a7d"
      : state.bountyTarget
        ? "#ff4d6d"
        : "#9bb3d9";
  const eventLine = state.extractionActive
    ? `EXTRACT ${state.extractionHold.toFixed(1)} / ${state.extractionGoal}s`
    : state.lockdownZone
      ? `LOCKDOWN ${Math.max(0, state.lockdownZone.life).toFixed(1)}s`
      : state.bountyTarget
        ? "EVENT BOUNTY ELITE"
        : `NEXT EVENT ${Math.max(0, Math.min(state.nextBountyTime, state.nextLockdownTime) - state.time).toFixed(0)}s`;
  ctx.fillText(eventLine, 38, 118);
  ctx.fillText(`EXIT ${Math.max(0, CONFIG.extractionTime - state.time).toFixed(0)}s`, 196, 118);
  ctx.fillStyle = UPGRADE_TIER_DATA[player.highestTier].color;
  ctx.fillText(`${UPGRADE_TIER_DATA[player.highestTier].label} · ${player.titleText}`, 38, 142);

  const mapW = 190;
  const mapH = 126;
  const mapX = view.width - mapW - 26;
  const mapY = 24;

  ctx.fillStyle = "rgba(7, 12, 25, 0.72)";
  ctx.strokeStyle = "rgba(167,255,131,0.22)";
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 18);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(mapX + 12, mapY + 12);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(0, 0, mapW - 24, mapH - 24);

  const scaleX = (mapW - 24) / world.width;
  const scaleY = (mapH - 24) / world.height;

  for (const enemy of enemies) {
    ctx.fillStyle = getEnemyDisplayColor(enemy.type);
    const size = enemy.type === "boss" ? 7 : 4;
    ctx.fillRect(enemy.x * scaleX - size / 2, enemy.y * scaleY - size / 2, size, size);
  }

  if (state.lockdownZone) {
    ctx.strokeStyle = "rgba(255,77,109,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.lockdownZone.x * scaleX, state.lockdownZone.y * scaleY, Math.max(5, state.lockdownZone.radius * scaleX), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.extractionActive && state.extractionZone) {
    ctx.strokeStyle = "rgba(167,255,131,0.95)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(
      state.extractionZone.x * scaleX,
      state.extractionZone.y * scaleY,
      Math.max(4, state.extractionZone.radius * scaleX),
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(player.x * scaleX, player.y * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.messageTimer > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = '700 24px "Bahnschrift", "Arial Narrow", sans-serif';
    ctx.fillStyle = "#a7ff83";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#a7ff83";
    ctx.fillText(state.messageText, view.width / 2, hasBossAlive() ? 84 : 32);
    ctx.restore();
  }

  if (state.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,77,109,${state.hitFlash * 0.24})`;
    ctx.fillRect(0, 0, view.width, view.height);
  }

  const vignette = ctx.createRadialGradient(
    view.width / 2,
    view.height / 2,
    view.height * 0.24,
    view.width / 2,
    view.height / 2,
    view.height * 0.72
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.restore();

  drawBossBar();
}

function draw() {
  const shakeX = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
  const shakeY = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
  const camera = {
    x: clamp(player.x - view.width / 2 + shakeX, 0, world.width - view.width),
    y: clamp(player.y - view.height / 2 + shakeY, 0, world.height - view.height),
  };

  drawBackground(camera);
  drawWorldBorder(camera);
  drawEffects(camera);
  drawWorldObjects(camera);
  drawPickups(camera);
  drawEnemies(camera);
  drawProjectiles(camera);
  drawPlayer(camera);
  drawParticles(camera);
  drawForegroundDecor(camera);
  drawFloatingTexts(camera);
  drawHud(camera);
}

function renderSkillTree() {
  skillTreeList.innerHTML = "";

  const buildNode = document.createElement("div");
  buildNode.className = `tree-node${player.buildCore ? " active" : ""}`;
  buildNode.innerHTML = player.buildCore
    ? `<strong>Dominant Tendency · ${BUILD_LABELS[player.buildCore]}</strong><span>${UPGRADE_TIER_DATA[player.highestTier].label} · ${player.titleText} · Major F/G/D: ${player.majorPathCounts.fang} / ${player.majorPathCounts.ghost} / ${player.majorPathCounts.domain}${hasBuildUltimate(player.buildCore) ? " · ULT ONLINE" : ""}</span>`
    : `<strong>Dominant Tendency · Unshaped</strong><span>${UPGRADE_TIER_DATA[player.highestTier].label} · ${player.titleText}. Major talents chosen every 3 levels start bending future small upgrades.</span>`;
  skillTreeList.appendChild(buildNode);

  if (player.buildHistory.length > 0) {
    const historyNode = document.createElement("div");
    historyNode.className = "tree-node";
    historyNode.innerHTML = `<strong>Recent Build Picks</strong><span>${player.buildHistory.join(" / ")}</span>`;
    skillTreeList.appendChild(historyNode);
  }

  if (player.treeNodes.length === 0) {
    const dormantNode = document.createElement("div");
    dormantNode.className = "tree-node";
    dormantNode.innerHTML = "<strong>Awakening Tree</strong><span>Every 3 levels and each boss core will offer a Zero-only tree node.</span>";
    skillTreeList.appendChild(dormantNode);
    treeStatus.textContent = player.buildCore ? `${BUILD_LABELS[player.buildCore]} · ${player.titleText}` : player.titleText;
    return;
  }

  treeStatus.textContent = `${player.buildCore ? BUILD_LABELS[player.buildCore] : "Awake"} · ${player.titleText} · ${player.treeNodes.length} nodes`;

  SKILL_NODES.filter((node) => player.treeNodes.includes(node.id)).forEach((node) => {
    const item = document.createElement("div");
    item.className = "tree-node active";
    item.innerHTML = `<strong>${node.branch} · ${node.title}</strong><span>${node.description}</span>`;
    skillTreeList.appendChild(item);
  });
}

function updateHud() {
  const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
  hpFill.style.width = `${hpRatio * 100}%`;
  hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  novaFill.style.width = `${player.nova}%`;
  novaText.textContent = `${Math.round(player.nova)}%`;

  const xpRatio = clamp(player.xp / player.xpToNext, 0, 1);
  xpFill.style.width = `${xpRatio * 100}%`;
  xpText.textContent = `Lv ${player.level} · ${Math.floor(player.xp)} / ${player.xpToNext}`;

  if (player.dashCharges < player.dashChargesMax) {
    dashState.textContent = `${player.dashCharges} / ${player.dashChargesMax} · ${Math.max(0, player.dashRechargeTimer).toFixed(1)}s`;
  } else {
    dashState.textContent = `${player.dashCharges} / ${player.dashChargesMax}`;
  }

  threatState.textContent = `LV ${state.threatLevel}`;
  killState.textContent = String(state.kills);
  if (state.extractionActive) {
    bossState.textContent = `EXIT ${Math.max(0, state.extractionGoal - state.extractionHold).toFixed(1)}s`;
  } else if (state.lockdownZone) {
    bossState.textContent = `LOCK ${Math.max(0, state.lockdownZone.life).toFixed(0)}s`;
  } else if (state.bountyTarget && enemies.includes(state.bountyTarget)) {
    bossState.textContent = "BOUNTY";
  } else {
    bossState.textContent = hasBossAlive() ? "ACTIVE" : `${Math.max(0, state.nextBossTime - state.time).toFixed(0)}s`;
  }
}

function loop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  resetGame();
});

window.addEventListener("keydown", (event) => {
  if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyR", "Digit1", "Digit2", "Digit3"].includes(event.code)) {
    event.preventDefault();
  }

  keys.add(event.code);

  if (state.mode === "choice") {
    if (event.code === "Digit1") {
      selectChoice(0);
    } else if (event.code === "Digit2") {
      selectChoice(1);
    } else if (event.code === "Digit3") {
      selectChoice(2);
    }
    return;
  }

  if (event.code === "Space") {
    tryDash();
  }

  if (event.code === "KeyE") {
    fireNova();
  }

  if (event.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

renderSkillTree();
setObjectiveText();
updateHud();
draw();
requestAnimationFrame(loop);
