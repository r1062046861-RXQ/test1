export type Constitution = 'balanced' | 'yin_deficiency' | 'qi_deficiency' | 'blood_stasis' | 'phlegm_dampness' | 'fire_heat' | 'qi_stagnation' | 'jing_deficiency' | 'yang_deficiency';

export type CardType = 'attack' | 'skill' | 'power';
export type CardRarity = 'common' | 'uncommon' | 'rare';
export type CardTarget = 'single_enemy' | 'all_enemies' | 'self' | 'random';

export interface Card {
  id: string;
  name: string;
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
