export * from '../../../shared/baseTypes';
import type { Constitution, GamePhase, MapLayer, Player, Enemy } from '../../../shared/baseTypes';

export type EnemyActionPhase = 'idle' | 'windup' | 'lunge' | 'impact' | 'recover';
export type PlayerImpactKind = 'hp' | 'block' | 'mixed';

export interface EnemyActionCue {
  enemyId: string;
  phase: EnemyActionPhase;
  token: number;
}

export interface PlayerImpactCue {
  token: number;
  kind: PlayerImpactKind;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  currentAct: number;
  currentFloor: number;
  map: MapLayer[];
  currentNodeId: string | null;
  enemies: Enemy[];
  combatTurn: number;
  selectedCardId: string | null;
  volume: number;
  shopRemovalCost: number;

  startGame: (constitution?: Constitution) => void;
  endTurn: () => void;
  playCard: (cardId: string, targetId?: string) => void;
  selectNode: (nodeId: string) => void;
}
