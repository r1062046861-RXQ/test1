export type Constitution =
  | 'balanced'
  | 'yin_deficiency'
  | 'qi_deficiency'
  | 'yang_deficiency'
  | 'phlegm_dampness'
  | 'damp_heat'
  | 'blood_stasis'
  | 'qi_stagnation'
  | 'special_diathesis';

export type CardType = 'attack' | 'skill' | 'power';
export type CardRarity = 'common' | 'uncommon' | 'rare';
export type CardTarget = 'single_enemy' | 'all_enemies' | 'self' | 'random';
export type CardCategory = 'herb' | 'formula' | 'equipment' | 'enemy';

export interface Card {
  id: string;
  name: string;
  category?: CardCategory;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  description: string;
  tcmNote: string;
  effectId: string;
  effectValue?: number;
  secondaryValue?: number;
  target: CardTarget;
  upgraded: boolean;
  unplayable?: boolean;
  exhaust?: boolean;
  image?: string;
  act?: number;
}

export type FormulaBlueprintStatus = 'recipe_pending' | 'ready';
export type FormulaDifficulty = '极简' | '简单' | '中等' | '偏难';

export interface FormulaBlueprint {
  id: string;
  name: string;
  formulaCardId: string;
  ingredientCardIds: string[];
  status: FormulaBlueprintStatus;
  description: string;
  difficulty: FormulaDifficulty;
  fullCompositionText: string;
  poem: string;
  classicSource?: string;
}

export type StatusType = 'buff' | 'debuff';

export interface StatusEffect {
  id: string;
  name: string;
  type: StatusType;
  stacks: number;
  description: string;
  canStack: boolean;
  duration?: number;
  sourceId?: string;
  dispelImmune?: boolean;
  hidden?: boolean;
}

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff' | 'special';
  value?: number;
  description: string;
  hits?: number;
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  block: number;
  statusEffects: StatusEffect[];
  intent: EnemyIntent;
  image?: string;
  posterImage?: string;
  behavior?: string;
  meta?: Record<string, any>;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  effectId: string;
}

export interface Potion {
  id: string;
  name: string;
  description: string;
  effectId: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  drawPile: Card[];
  exhaustPile: Card[];
  statusEffects: StatusEffect[];
  constitution: Constitution;
  relics: Relic[];
  potions: Potion[];
  gold: number;
  obtainedCardIds: string[];
  obtainedEnemyTemplateIds: string[];
  knownFormulaBlueprintIds: string[];
}

export type NodeType = 'combat' | 'elite' | 'boss' | 'event' | 'shop' | 'rest' | 'chest' | 'start';

export interface MapNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  children: string[];
  parents: string[];
  status: 'locked' | 'available' | 'completed' | 'current';
}

export interface MapLayer {
  nodes: MapNode[];
}

export type GamePhase =
  | 'intro'
  | 'start_menu'
  | 'card_codex'
  | 'map'
  | 'combat'
  | 'event'
  | 'shop'
  | 'rest'
  | 'chest'
  | 'reward'
  | 'game_over'
  | 'victory';
