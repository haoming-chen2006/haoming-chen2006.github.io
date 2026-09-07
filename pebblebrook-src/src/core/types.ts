/**
 * Shared contracts for Pebblebrook. Every module builds against these; extend by adding, never by
 * renaming. See specs/DESIGN.md for the design these types serve.
 */

export interface Vec { x: number; y: number }
export type Dir = 'up' | 'down' | 'left' | 'right';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'snow';

export type TileKind =
  | 'grass' | 'dirt' | 'path' | 'water' | 'deepwater' | 'sand' | 'stone' | 'floor' | 'wall' | 'roof' | 'door' | 'bridge'
  | 'farmland' | 'flower' | 'tree' | 'rock' | 'bush' | 'fence' | 'prop' | 'void';

export type Profession =
  | 'farmer' | 'blacksmith' | 'baker' | 'fisher' | 'doctor' | 'innkeeper' | 'miner' | 'shopkeeper' | 'librarian' | 'carpenter'
  | 'none';

export type VillagerId = string;
export type PlaceId = string;
export type ItemId = string;
export type ObjectId = string;

export type Emote = 'happy' | 'sad' | 'angry' | 'love' | 'question' | 'idea' | 'sleepy' | 'music' | 'sweat' | 'exclaim' | 'sick' | 'none';

/** Absolute in-game time, minute resolution. Days are 24 h; seasons 28 days. */
export interface WorldTime {
  /** minutes since the game began (day 1, 6:00 is minute 360) */
  minute: number;
  year: number;
  season: Season;
  /** 1..28 */
  day: number;
  /** total days since start, day 1 = 1 */
  dayIndex: number;
  hour: number;
  min: number;
  /** 0 = Monday */
  weekday: number;
  isDaylight: boolean;
}

/* ------------------------------------------------------------------ items */

export type ItemKind = 'crop' | 'seed' | 'food' | 'drink' | 'material' | 'ore' | 'tool' | 'gift' | 'book' | 'furniture' | 'medicine' | 'fish' | 'misc';

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  /** base shop price */
  price: number;
  description: string;
  /** effects when eaten/drunk */
  edible?: { hunger: number; energy?: number; fun?: number; health?: number };
  /** tags villagers can like or dislike: 'sweet', 'flowers', 'metal', 'books', 'fish', 'fancy', 'rustic', 'spicy' ... */
  tags: string[];
  /** where it normally comes from, for the LLM's benefit */
  source?: string;
}

export interface ItemStack { id: ItemId; qty: number; quality?: 1 | 2 | 3 }

export interface CropDef {
  id: ItemId;          // the harvested item id
  seed: ItemId;
  name: string;
  seasons: Season[];
  /** days from planting to harvest when watered */
  days: number;
  /** harvested units */
  yieldQty: number;
  regrowDays?: number; // if set, plant keeps producing
  stages: number;      // sprite growth stages
}

export interface RecipeDef {
  id: string;
  name: string;
  result: ItemStack;
  inputs: ItemStack[];
  /** where it can be made: 'kitchen' | 'oven' | 'forge' | 'workbench' | 'anywhere' */
  station: 'kitchen' | 'oven' | 'forge' | 'workbench' | 'anywhere';
  skill?: { name: SkillName; level: number };
  minutes: number;
}

/* ------------------------------------------------------------------ world */

export type PlaceKind = 'home' | 'shop' | 'workplace' | 'public' | 'nature' | 'farm' | 'landmark';

export interface Place {
  id: PlaceId;
  name: string;
  kind: PlaceKind;
  /** every tile that counts as "at" this place (interior footprint for buildings, area for outdoor places) */
  tiles: Vec[];
  /** where a villager stands when they are "at" the place */
  anchor: Vec;
  /** door tile for buildings (walk here, then step inside) */
  door?: Vec;
  /** the tile just inside the door where an "inside" villager is parked (hidden) */
  interior?: Vec;
  owner?: VillagerId;
  /** opening hours for shops/workplaces */
  open?: [number, number];
  /** what this place offers, e.g. 'kitchen', 'oven', 'forge', 'workbench', 'bed', 'bar', 'counter', 'books', 'clinic' */
  facilities: string[];
}

export type ObjectKind =
  | 'plot' | 'tree' | 'rock' | 'fishspot' | 'forage' | 'bench' | 'well' | 'board' | 'counter' | 'bed' | 'lantern' | 'sign'
  | 'flowerbed' | 'stump' | 'campfire' | 'shrine' | 'barrel' | 'crate' | 'animal' | 'decoration';

export interface WorldObject {
  id: ObjectId;
  kind: ObjectKind;
  pos: Vec;
  place?: PlaceId;
  /** kind-specific state; kept JSON-serialisable */
  data: Record<string, unknown>;
}

export interface PlotState {
  state: 'empty' | 'tilled' | 'planted';
  crop?: ItemId;
  growth: number;      // 0..1
  watered: boolean;
  daysSincePlant: number;
  stage: number;
  owner?: VillagerId | 'player';
}

export interface WeatherState {
  kind: WeatherKind;
  /** 0..1 how hard it rains/snows */
  intensity: number;
  /** tomorrow's forecast */
  forecast: WeatherKind;
  temperature: number; // °C, cosmetic
}

/** What the rest of the game may ask the world. Implemented by src/world. */
export interface World {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly places: Place[];
  readonly objects: WorldObject[];
  readonly time: WorldTime;
  readonly weather: WeatherState;
  tile(x: number, y: number): TileKind;
  /** variant/decoration index for the renderer (0 when none) */
  tileVariant(x: number, y: number): number;
  walkable(x: number, y: number): boolean;
  place(id: PlaceId): Place | undefined;
  placeAt(pos: Vec): Place | undefined;
  placesOfKind(kind: PlaceKind): Place[];
  object(id: ObjectId): WorldObject | undefined;
  objectsNear(pos: Vec, radius: number, kind?: ObjectKind): WorldObject[];
  objectsAt(place: PlaceId, kind?: ObjectKind): WorldObject[];
  findPath(from: Vec, to: Vec, opts?: { maxNodes?: number }): Vec[] | null;
  /** a free walkable tile at or near `pos` */
  nearestWalkable(pos: Vec, radius?: number): Vec;
  /** advance the clock; fires newday/hour/weather changes via the bus */
  tick(minutes: number): void;
  /** the clock's speed multiplier and pause, owned by the world */
  speed: number;
  paused: boolean;
  /** festival/calendar */
  festivalToday(): { id: string; name: string; hour: number } | null;
  season: Season;
  /** crop catalogue helpers */
  plot(objId: ObjectId): PlotState | undefined;
  setPlot(objId: ObjectId, state: PlotState): void;
  /** serialisation */
  save(): unknown;
  load(data: unknown): void;
}

/* --------------------------------------------------------------- villagers */

export type SkillName = 'farming' | 'fishing' | 'mining' | 'cooking' | 'crafting' | 'charm' | 'lore' | 'medicine';

export interface Needs {
  energy: number;   // 0..100, low = tired
  hunger: number;   // 0..100, low = hungry (it is "satiety")
  social: number;   // 0..100, low = lonely
  fun: number;      // 0..100, low = bored
  comfort: number;  // 0..100, low = cold/wet/dirty
  purpose: number;  // 0..100, low = restless / unfulfilled
}

export interface Personality {
  openness: number;         // 0..1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  /** free-form: 'gossip', 'romantic', 'grumpy', 'generous', 'superstitious', 'ambitious', 'lazy', 'brave', 'shy', 'proud' ... */
  traits: string[];
  likes: string[];      // item tags, activities, weather, topics
  dislikes: string[];
  /** a sentence in their own voice, used by both brains */
  voice: string;
  /** their deepest wish, in one line */
  dream: string;
}

export type RelationLabel = 'stranger' | 'acquaintance' | 'friend' | 'close friend' | 'rival' | 'crush' | 'partner' | 'family';

export interface Relationship {
  affinity: number;     // -100..100
  trust: number;        // 0..100
  romance: number;      // 0..100
  familiarity: number;  // 0..100, how much time spent
  label: RelationLabel;
  /** last few notable things, newest last */
  notes: string[];
  lastTalked: number;   // world minute
}

export type MemoryKind = 'observation' | 'reflection' | 'plan' | 'conversation' | 'event' | 'gossip';

export interface Memory {
  id: string;
  t: number;              // world minute
  kind: MemoryKind;
  text: string;
  importance: number;     // 1..10
  tags: string[];
  about?: VillagerId[];
  place?: PlaceId;
  secondhand?: boolean;   // heard from someone else
  source?: VillagerId;    // who told them
}

export interface Goal {
  id: string;
  text: string;
  priority: number;       // 1..10
  createdAt: number;
  done?: boolean;
  progress?: string;
}

export interface ScheduleEntry {
  /** start hour (fractional ok) */
  hour: number;
  /** what they intend: 'sleep' | 'breakfast' | 'work' | 'lunch' | 'free' | 'dinner' | 'social' | 'chores' | 'errand' */
  block: string;
  place?: PlaceId;
  note?: string;
}

export interface DayPlan { day: number; entries: ScheduleEntry[]; summary: string }

export interface CurrentAction {
  tool: string;
  args: Record<string, unknown>;
  startedAt: number;
  endsAt: number;
  /** what the villager is doing in words (HUD/thought bubble) */
  label: string;
  /** brain's stated reason */
  thought: string;
  progress: number;       // 0..1
  /** movement path when travelling */
  path?: Vec[];
  target?: Vec;
  phase?: string;
}

export type StatusFlag = 'sick' | 'tired' | 'drunk' | 'injured' | 'inLove' | 'grieving' | 'celebrating' | 'wet' | 'inspired' | 'angry';

export interface Villager {
  id: VillagerId;
  name: string;
  profession: Profession;
  home: PlaceId;
  workplace: PlaceId;
  pos: Vec;               // tile coordinates, fractional while walking
  facing: Dir;
  inside?: PlaceId;
  needs: Needs;
  mood: number;           // -1..1
  money: number;
  inventory: ItemStack[];
  skills: Record<SkillName, number>;
  health: number;         // 0..100
  personality: Personality;
  relationships: Record<VillagerId, Relationship>;
  memory: Memory[];
  goals: Goal[];
  plan: DayPlan | null;
  action: CurrentAction | null;
  queue: { tool: string; args: Record<string, unknown>; thought?: string }[];
  status: StatusFlag[];
  /** appearance for the character generator */
  look: { skin: string; hair: string; hairStyle: number; outfit: string; accent: string; hat?: number; build: 'slim' | 'medium' | 'broad'; height: number };
  /** which brain drives them: set by the UI */
  brain: 'local' | 'llm';
  birthday: { season: Season; day: number };
  /** what they said last and when, for bubbles */
  speech?: { text: string; until: number; to?: VillagerId | 'player' };
  emote?: { kind: Emote; until: number };
  /** running statistics for the chronicle */
  stats: Record<string, number>;
}

/* ------------------------------------------------------------------- tools */

export type JsonSchema = Record<string, unknown>;

export type ToolCategory = 'move' | 'work' | 'social' | 'economy' | 'life' | 'craft' | 'info' | 'meta';

export interface Effect { kind: string; [k: string]: unknown }

export interface ToolResult {
  ok: boolean;
  /** observation text the villager remembers, in third person ("Ada watered the turnips") */
  message: string;
  /** how long the action occupies the villager (0 = instant) */
  durationMin?: number;
  importance?: number;   // memory importance, default 2
  effects?: Effect[];
}

export interface ToolDef {
  name: string;
  description: string;
  params: JsonSchema;
  category: ToolCategory;
  professions?: Profession[];
  available(v: Villager, sim: SimView): boolean;
  execute(v: Villager, sim: SimView, args: Record<string, unknown>): ToolResult;
}

/* ------------------------------------------------------------------- brain */

export interface DecisionContext {
  villager: Villager;
  sim: SimView;
  world: World;
  now: WorldTime;
  nearby: Villager[];
  options: ToolDef[];
  recent: Memory[];
  relevant: Memory[];
  /** why decide() was called */
  reason: 'idle' | 'interrupted' | 'newhour' | 'event' | 'approached';
  /** text of what just happened, when reason is interrupted/event/approached */
  trigger?: string;
}

export interface Decision {
  tool: string;
  args: Record<string, unknown>;
  thought: string;
  say?: string;
  emote?: Emote;
}

export interface ConversationContext {
  speaker: Villager;
  listener: Villager | 'player';
  listenerName: string;
  history: ConversationTurn[];
  relationship: Relationship | null;
  relevant: Memory[];
  topic?: string;
  /** what the player typed or chose, when the listener is the player */
  playerLine?: string;
  playerIntent?: string;
  sim: SimView;
  world: World;
}

export interface ConversationTurn {
  speaker: VillagerId | 'player';
  text: string;
  tone?: 'warm' | 'neutral' | 'cold' | 'flirty' | 'angry' | 'sad' | 'joking';
  /** the speaker wants to stop after this line */
  end?: boolean;
  /** memory the listener should form, if notable */
  remember?: { text: string; importance: number; tags: string[] };
  affinityDelta?: number;
  emote?: Emote;
  /** the sub-topic this line is about (so the reply can react to it); free text, e.g. 'weather', 'news' */
  topic?: string;
}

export interface Brain {
  kind: 'local' | 'llm';
  decide(ctx: DecisionContext): Promise<Decision>;
  converse(ctx: ConversationContext): Promise<ConversationTurn>;
  reflect(ctx: DecisionContext): Promise<string[]>;
  /** free-form: the LLM answers the player's typed line; local brains may return null to use intents */
  chat?(ctx: ConversationContext): Promise<ConversationTurn | null>;
}

/* ------------------------------------------------------------------ events */

export type EventKind = 'weather' | 'visitor' | 'festival' | 'calamity' | 'social' | 'economy' | 'mystery' | 'nature';

export interface Request {
  id: string;
  by: VillagerId | 'player';
  text: string;
  reward: { money?: number; item?: ItemStack };
  needs: ItemStack[];
  postedAt: number;
  acceptedBy?: VillagerId | 'player';
  done?: boolean;
  expiresAt: number;
  /** set by the sim once expiresAt has passed without completion */
  expired?: boolean;
}

export interface ActiveEvent {
  id: string;
  name: string;
  kind: EventKind;
  startedAt: number;
  endsAt: number;
  place?: PlaceId;
  text: string;
  data: Record<string, unknown>;
}

/* --------------------------------------------------------------- sim view */

export interface PlayerState {
  pos: Vec;
  facing: Dir;
  inside?: PlaceId;
  money: number;
  inventory: ItemStack[];
  skills: Record<SkillName, number>;
  energy: number;
  name: string;
  /** the villager the player is currently talking to */
  talkingTo?: VillagerId;
  following?: VillagerId;
  hotbar: number;
}

export interface ConversationState {
  id: string;
  participants: (VillagerId | 'player')[];
  turns: ConversationTurn[];
  place?: PlaceId;
  startedAt: number;
  topic?: string;
  done?: boolean;
}

/** What tools, brains, events and UI may read/do on the simulation. Implemented by src/sim. */
export interface SimView {
  readonly world: World;
  readonly villagers: Villager[];
  readonly player: PlayerState;
  readonly requests: Request[];
  readonly events: ActiveEvent[];
  readonly conversations: ConversationState[];
  villager(id: VillagerId): Villager | undefined;
  villagersNear(pos: Vec, radius: number): Villager[];
  /** utilities for tools */
  give(v: Villager | PlayerState, item: ItemStack): void;
  take(v: Villager | PlayerState, item: ItemStack): boolean;
  has(v: Villager | PlayerState, id: ItemId, qty?: number): boolean;
  remember(v: Villager, m: Omit<Memory, 'id' | 't'>): Memory;
  adjustRelationship(a: Villager, b: VillagerId | 'player', delta: Partial<Pick<Relationship, 'affinity' | 'trust' | 'romance' | 'familiarity'>>, note?: string): void;
  say(v: Villager, text: string, to?: VillagerId | 'player', tone?: ConversationTurn['tone']): void;
  emote(v: Villager, kind: Emote): void;
  /** start a villager↔villager conversation (returns null if either is busy/unwilling) */
  startConversation(a: Villager, b: Villager, topic?: string): ConversationState | null;
  /** notice board */
  postRequest(by: VillagerId | 'player', text: string, reward: Request['reward'], needs: ItemStack[]): Request;
  /** shops */
  shopStock(place: PlaceId): ItemStack[];
  priceOf(id: ItemId, place?: PlaceId): number;
  /** interrupt whatever a villager is doing */
  interrupt(v: Villager, reason: string): void;
  /** RNG shared by the sim, seeded */
  rng: Rng;
  /** append to the village log ("storyboard") */
  log(text: string, importance: number, about?: VillagerId[], place?: PlaceId): void;
  /** the log itself, newest last */
  readonly chronicle: { t: number; text: string; importance: number; about?: VillagerId[]; place?: PlaceId }[];
}

export interface Rng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: T[]): T[];
  state: number;
}
