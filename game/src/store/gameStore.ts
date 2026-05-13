import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Card,
  Constitution,
  Enemy,
  EnemyActionCue,
  EnemyActionPhase,
  GamePhase,
  GameState,
  MapNode,
  PlayerImpactCue,
  StatusEffect,
} from '../types';
import { CARD_LIBRARY, EQUIPMENT_CARD_IDS, STARTING_DECKS } from '../data/cards';
import { FORMULA_BLUEPRINTS, FORMULA_BLUEPRINT_BY_ID } from '../data/formulas';
import { countCardCopies, getCardCategory, getTemplateCardId, isFormulaCard, isHerbCard } from '../data/cards';
import { ENEMY_CODEX_DETAILS } from '../data/codex';
import { ENEMIES, ENEMY_POOLS } from '../data/enemies';
import { SIDE_EVENTS, getMainlineActData } from '../../../shared/data/events';
import type { GameEvent } from '../../../shared/data/events';
import { createRuntimeId } from '../utils/id';
import { primeProgressiveAsset } from '../utils/progressiveAssets';
import {
  INITIAL_PLAYER,
  INITIAL_TURN_FLAGS,
  applyCardUpgrade,
  connectMapSegments,
  generateMap,
  getBossUnlockWinsRequired,
  getEnemyScaling,
  resolveCardPlay,
  resolveEnemyTurn,
  resolvePlayerEndTurn,
  type CoreState,
  type EnemyTurnResult,
  type TurnFlags,
} from '../../../shared/core/gameCore';
import { playSfx, setBgmVolume, setSfxVolume } from '../services/audioService';

interface GameStore extends GameState {
  combatLog: string[];
  bgmVolume: number;
  sfxVolume: number;
  fontSize: number;
  bossKills: number;
  combatWinsThisCycle: number;
  selectedEnemyId: string | null;
  turnFlags: TurnFlags;
  enemyActionCue: EnemyActionCue | null;
  playerImpactCue: PlayerImpactCue | null;
  pendingEquipmentRewardId: string | null;
  pendingFormulaBlueprintId: string | null;
  shownFormulaPoemIds: string[];
  eventLog?: string[];
  eventMarkers?: Record<string, string>;
  shopPriceMultiplier?: number;
  currentEvent?: {
    id: string;
    title: string;
    description: string;
    clearMarkerOnTrigger?: string;
    options: Array<{
      label: string;
      description: string;
      setMarker?: string;
      effects: Array<{ type: string; value?: number; cardId?: string; equipmentId?: string; relicId?: string; count?: number; rarity?: string; cardType?: string }>;
    }>;
   } | null;
   eventChosenIndex?: number | null;
   eventQueue?: string[];
   lastEnemyId?: string | null;
   setFontSize: (size: number) => void;
  setBgmVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  startCombat: (nodeId: string) => void;
  startAdminEnemyChallenge: (enemyId: string) => void;
  completeCombat: () => void;
  completeNonCombat: () => void;
  drawCards: (count: number) => void;
  selectEnemy: (enemyId: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  addCardToDeck: (cardId: string) => void;
  addLog: (message: string) => void;
  removeCardFromDeck: (cardIndex: number) => void;
  removeCardById: (cardId: string) => void;
  upgradeCardById: (cardId: string) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => void;
  healPlayer: (amount: number) => void;
  increaseMaxHp: (amount: number) => void;
  increaseShopRemovalCost: (amount: number) => void;
  discardOverflowCard: (cardId: string) => void;
  getHandLimit: () => number;
  getDrawPerTurn: () => number;
  sellCardFromDeck: (cardId: string) => void;
  combineCards: (cardIds: string[], targetCardId: string) => void;
  recordFormulaBlueprint: (blueprintId: string) => CraftFormulaResult;
  craftFormulaFromBlueprint: (blueprintId: string, ingredientInstanceIds: string[]) => CraftFormulaResult;
  clearPendingEquipmentReward: () => void;
  clearPendingFormulaBlueprintReward: () => void;
  clearCurrentEvent: () => void;
  getObtainedCardIds: () => string[];
  handleEventChoice: (eventId: string, optionIndex: number) => void;
  getCurrentEvent: () => { id: string; title: string; description: string; options: Array<{ label: string; description: string; effects: Array<{ type: string; value?: number; cardId?: string; equipmentId?: string; relicId?: string; count?: number; rarity?: string; cardType?: string }> }> } | null;
  getShopPriceMultiplier: () => number;
}

export interface CraftFormulaResult {
  ok: boolean;
  reason?:
    | 'phase_unavailable'
    | 'unknown_blueprint'
    | 'blueprint_not_recorded'
    | 'recipe_pending'
    | 'invalid_ingredients'
    | 'ingredients_mismatch'
    | 'target_unavailable'
    | 'copy_limit';
  message: string;
  formulaCardId?: string;
  showPoem?: boolean;
  poem?: string;
}

const INITIAL_SHOP_REMOVAL_COST = 75;
const ENEMY_TURN_DELAY_MS = 1500;
const ENEMY_ATTACK_WINDUP_MS = 280;
const ENEMY_ATTACK_LUNGE_MS = 125;
const ENEMY_ATTACK_IMPACT_MS = 135;
const ENEMY_ATTACK_RECOVER_MS = 170;
const ENEMY_ACTION_CHAIN_GAP_MS = 180;
const ENEMY_ATTACK_TOTAL_MS =
  ENEMY_ATTACK_WINDUP_MS +
  ENEMY_ATTACK_LUNGE_MS +
  ENEMY_ATTACK_IMPACT_MS +
  ENEMY_ATTACK_RECOVER_MS;

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => {
      store.set(name, value);
    },
    removeItem: (name: string) => {
      store.delete(name);
    }
  };
})();

const webStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage
    : memoryStorage;

interface ScheduledTask {
  id: number;
  fn: () => void;
  timeout: ReturnType<typeof setTimeout>;
}

let nextScheduledTaskId = 1;
let scheduledTasks: ScheduledTask[] = [];
let pendingEnemyTurnTaskId: number | null = null;

const executeScheduledTask = (taskId: number) => {
  const taskIndex = scheduledTasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;
  const task = scheduledTasks[taskIndex];
  scheduledTasks.splice(taskIndex, 1);
  task.fn();
};

const scheduleTask = (delay: number, fn: () => void) => {
  const id = nextScheduledTaskId++;
  const timeout = setTimeout(() => {
    executeScheduledTask(id);
  }, delay);
  scheduledTasks.push({ id, fn, timeout });
  return id;
};

const cancelScheduledTask = (taskId: number | null) => {
  if (taskId == null) return;
  const taskIndex = scheduledTasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;
  clearTimeout(scheduledTasks[taskIndex].timeout);
  scheduledTasks.splice(taskIndex, 1);
};

const cancelAllScheduledTasks = () => {
  scheduledTasks.forEach(task => {
    clearTimeout(task.timeout);
  });
  scheduledTasks = [];
  pendingEnemyTurnTaskId = null;
};

const scheduleEnemyTurn = (fn: () => void) => {
  cancelScheduledTask(pendingEnemyTurnTaskId);
  pendingEnemyTurnTaskId = scheduleTask(ENEMY_TURN_DELAY_MS, () => {
    pendingEnemyTurnTaskId = null;
    fn();
  });
};

const MAX_CARD_COPIES = 10;
const BASE_HAND_LIMIT = 8;
const BASE_DRAW_PER_TURN = 3;
const MAX_HAND_LIMIT = 10;
const MAX_DRAW_PER_TURN = 5;
const EQUIPMENT_DRAW_PER_TURN_CAP = 6;

const createCardInstance = (cardId: string): Card => ({
  ...CARD_LIBRARY[cardId],
  id: createRuntimeId(),
  _templateId: cardId,
});

const createEquipmentRelic = (cardId: string) => {
  const card = CARD_LIBRARY[cardId];
  return {
    id: card.id,
    name: card.name,
    description: card.description,
    effectId: card.effectId,
  };
};

const hasEquipment = (player: GameStore['player'], cardId: string) =>
  player.relics?.some(relic => relic.id === cardId) ?? false;

const countEquipment = (player: GameStore['player'], cardId: string): number =>
  player.relics?.filter(relic => relic.id === cardId).length ?? 0;

const applyEquipmentBlock = (player: GameStore['player'], amount: number) => {
  const nextPlayer = { ...player };
  nextPlayer.block += amount;
  const qixueCount = countEquipment(nextPlayer, 'equipment_qixue_jinye');
  if (qixueCount > 0) {
    nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + Math.min(2 * qixueCount, Math.floor(amount / 5)));
  }
  return nextPlayer;
};

const getPlayerHealAmount = (player: GameStore['player'], amount: number) => {
  if (amount <= 0) return 0;
  return amount + countEquipment(player, 'equipment_zhengti');
};

const getEquipmentDropChance = (nodeType: MapNode['type'] | undefined) => {
  if (nodeType === 'boss') return 0.5;
  if (nodeType === 'elite') return 0.2;
  if (nodeType === 'combat') return 0.1;
  return 0;
};

const rollEquipmentReward = (nodeType: MapNode['type'] | undefined) => {
  const chance = getEquipmentDropChance(nodeType);
  if (chance <= 0 || Math.random() >= chance) return null;

  return EQUIPMENT_CARD_IDS[Math.floor(Math.random() * EQUIPMENT_CARD_IDS.length)] ?? null;
};

const pickSideEvent = (state: GameStore): GameEvent | null => {
  const actRequirementMet = (e: GameEvent) => !e.actRequirement || e.actRequirement <= state.currentAct;
  const queue = state.eventQueue ?? [];
  for (const id of queue) {
    if ((state.eventLog ?? []).includes(id)) continue;
    const e = SIDE_EVENTS.find(ev => ev.id === id);
    if (e && actRequirementMet(e)) return e;
  }
  return null;
};

const buildEventQueue = (): string[] => {
  const nonContinuation = SIDE_EVENTS.filter(e => !e.continuationMarker);
  const shuffled = [...nonContinuation].sort(() => Math.random() - 0.5);
  const needleIdx = shuffled.findIndex(e => e.id === 'side_needle_stage1');
  if (needleIdx > 0 && Math.random() < 0.5) {
    const [needle] = shuffled.splice(needleIdx, 1);
    shuffled.unshift(needle);
  }
  return shuffled.map(e => e.id);
};

const rollFormulaBlueprintReward = (nodeType: MapNode['type'] | undefined) => {
  if (nodeType !== 'combat' && nodeType !== 'elite' && nodeType !== 'boss') return null;
  if (FORMULA_BLUEPRINTS.length === 0) return null;
  const roll = Math.random();
  const safeRoll = Number.isFinite(roll) ? roll : 0;
  const index = Math.min(FORMULA_BLUEPRINTS.length - 1, Math.floor(safeRoll * FORMULA_BLUEPRINTS.length));
  return FORMULA_BLUEPRINTS[index]?.id ?? null;
};

const normalizeConstitution = (constitution: unknown): Constitution => {
  if (constitution === 'fire_heat') return 'damp_heat';
  if (constitution === 'jing_deficiency') return 'special_diathesis';
  if (
    constitution === 'balanced' ||
    constitution === 'yin_deficiency' ||
    constitution === 'qi_deficiency' ||
    constitution === 'yang_deficiency' ||
    constitution === 'phlegm_dampness' ||
    constitution === 'damp_heat' ||
    constitution === 'blood_stasis' ||
    constitution === 'qi_stagnation' ||
    constitution === 'special_diathesis' ||
    constitution === 'admin'
  ) {
    return constitution;
  }
  return 'balanced';
};

const CONSTITUTION_PASSIVES: Record<Constitution, StatusEffect[]> = {
  balanced: [
    {
      id: 'balanced_passive',
      name: '平和质',
      type: 'buff',
      stacks: 1,
      description: '攻击、格挡和治疗效果各+1。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  yin_deficiency: [
    {
      id: 'yin_deficiency_passive',
      name: '阴虚质',
      type: 'buff',
      stacks: 1,
      description: '获得滋阴时额外+1层；回合开始真气+1；受到伤害+1。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  qi_deficiency: [
    {
      id: 'qi_deficiency_passive',
      name: '气虚质',
      type: 'buff',
      stacks: 1,
      description: '攻击伤害-1，格挡+2，治疗+1；打出攻击牌恢复1点生命。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  yang_deficiency: [
    {
      id: 'yang_deficiency_passive',
      name: '阳虚质',
      type: 'buff',
      stacks: 1,
      description: '回合开始获得温阳，前2次启动真气-1；3层温阳造成群体爆发。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  phlegm_dampness: [
    {
      id: 'phlegm_dampness_passive',
      name: '痰湿质',
      type: 'buff',
      stacks: 1,
      description: '打出技能牌给敌人叠加痰湿禁锢，3层时眩晕并虚弱。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  damp_heat: [
    {
      id: 'damp_heat_passive',
      name: '湿热质',
      type: 'buff',
      stacks: 1,
      description: '攻击牌施加热邪；每回合首张攻击牌使全体敌人获得热邪；格挡-2。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  blood_stasis: [
    {
      id: 'blood_stasis_passive',
      name: '血瘀质',
      type: 'buff',
      stacks: 1,
      description: '攻击牌叠加血瘀；攻击血瘀目标伤害+50%并无视格挡；格挡与治疗减半。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  qi_stagnation: [
    {
      id: 'qi_stagnation_passive',
      name: '气郁质',
      type: 'buff',
      stacks: 1,
      description: '每回合多抽1张；首张技能牌额外抽1张；敌方回合首次受伤-4；攻防-1。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  special_diathesis: [
    {
      id: 'special_diathesis_passive',
      name: '特禀质',
      type: 'buff',
      stacks: 1,
      description: '每个玩家回合开始随机触发一种先天禀赋。',
      canStack: false,
      dispelImmune: true,
    },
  ],
  admin: [
    {
      id: 'admin_passive',
      name: '管理员体质',
      type: 'buff',
      stacks: 1,
      description: '开局获得所有卡牌、蓝图、装备。仅用于测试合成台。',
      canStack: false,
      dispelImmune: true,
    },
  ],
};

const CRAFTING_PHASES = new Set<GamePhase>(['map', 'reward', 'shop', 'rest', 'event', 'chest']);

const isCraftingPhase = (phase: GamePhase) => CRAFTING_PHASES.has(phase);

const sameRecipe = (left: string[], right: string[]) =>
  left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);

const cloneEnemyTemplate = (enemy: Enemy): Enemy => ({
  ...enemy,
  id: createRuntimeId('enemy_'),
  currentHp: enemy.maxHp,
  intent: { ...enemy.intent },
  statusEffects: [],
  meta: enemy.meta ? { ...enemy.meta } : undefined
});

const createCombatState = (state: GameStore, enemyTemplate: Enemy, nodeId: string) => {
  const drawPile = [...state.player.deck].sort(() => Math.random() - 0.5);
  const enemy = cloneEnemyTemplate(enemyTemplate);
  return {
    phase: 'combat' as const,
    currentNodeId: nodeId,
    enemies: [enemy],
    combatTurn: 0,
    combatLog: [],
    selectedEnemyId: enemy.id,
    enemyActionCue: null,
    playerImpactCue: null,
    turnFlags: { ...INITIAL_TURN_FLAGS },
    player: {
      ...state.player,
      drawPile,
      hand: [],
      discardPile: [],
      exhaustPile: [],
      block: 0,
      energy: state.player.maxEnergy,
      statusEffects: state.player.statusEffects.filter(status =>
        status.dispelImmune
      ),
    }
  };
};

const primeEnemyMedia = (enemyTemplate?: Enemy | null) => {
  if (!enemyTemplate) return;
  void primeProgressiveAsset(enemyTemplate.image, enemyTemplate.posterImage);
};

const completeNode = (state: GameStore) => {
  const { map, currentNodeId } = state;
  if (!currentNodeId || map.length === 0) {
    return { map, currentLayerIndex: -1, currentNode: null as MapNode | null };
  }
  const currentLayerIndex = map.findIndex(layer => layer.nodes.some(node => node.id === currentNodeId));
  const currentNode =
    currentLayerIndex >= 0 ? map[currentLayerIndex].nodes.find(node => node.id === currentNodeId) ?? null : null;

  const processed = new Set<string>();
  const unlockQueue: string[] = currentNode?.children ? [...currentNode.children] : [];

  const lookUpNode = (childId: string) => {
    for (const layer of map) {
      const found = layer.nodes.find(node => node.id === childId);
      if (found) return found;
    }
    return null;
  };

  while (unlockQueue.length > 0) {
    const childId = unlockQueue.shift()!;
    if (processed.has(childId)) continue;
    processed.add(childId);
    const childNode = lookUpNode(childId);
    if (!childNode || childNode.status !== 'locked') continue;
    childNode.status = 'available';
    // col 3 connector: 灰色圆点，不可点击，需自动级联
    const isCol3Connector = childNode.type === 'combat' && childId.endsWith('_3');
    if (isCol3Connector && childNode.children) {
      unlockQueue.push(...childNode.children);
    }
  }

  if (currentNode) {
    currentNode.status = 'completed';
  }

  return { map: [...map], currentLayerIndex, currentNode };
};

const findMapNodeById = (map: GameStore['map'], nodeId: string) => {
  for (let layerIndex = 0; layerIndex < map.length; layerIndex += 1) {
    const node = map[layerIndex].nodes.find((entry) => entry.id === nodeId);
    if (node) {
      return { node, layerIndex };
    }
  }
  return null;
};

const isAdminEnemyChallengeNode = (nodeId: string | null) =>
  typeof nodeId === 'string' && nodeId.startsWith('admin_enemy_');

const buildStartingPlayer = (constitution: Constitution) => {
  const normalizedConstitution = normalizeConstitution(constitution);
  const statusEffects: StatusEffect[] = CONSTITUTION_PASSIVES[normalizedConstitution].map(status => ({ ...status }));

  if (normalizedConstitution === 'admin') {
    const allHerbIds = Object.keys(CARD_LIBRARY).filter((id) => isHerbCard(CARD_LIBRARY[id]));
    const allFormulaIds = Object.keys(CARD_LIBRARY).filter((id) => isFormulaCard(CARD_LIBRARY[id]));
    const deck = [...allHerbIds.map(createCardInstance), ...allFormulaIds.map(createCardInstance)];
    return {
      ...INITIAL_PLAYER,
      deck,
      constitution: normalizedConstitution,
      statusEffects,
    };
  }

  const deckIds = STARTING_DECKS[normalizedConstitution] || STARTING_DECKS.balanced;
  const deck = deckIds.map(createCardInstance);
  return {
    ...INITIAL_PLAYER,
    deck,
    constitution: normalizedConstitution,
    statusEffects,
  };
};

const buildNewRunState = (constitution: Constitution = 'balanced', currentAct = 1) => ({
  phase: 'map' as const,
  player: buildStartingPlayer(constitution),
  currentAct,
  currentFloor: 0,
  map: generateMap(12),
  currentNodeId: null,
  enemies: [],
  combatTurn: 0,
  combatLog: [],
  selectedCardId: null,
  selectedEnemyId: null,
  bossKills: 0,
  combatWinsThisCycle: 0,
  shopRemovalCost: INITIAL_SHOP_REMOVAL_COST,
  turnFlags: { ...INITIAL_TURN_FLAGS },
  enemyActionCue: null,
  playerImpactCue: null,
  pendingEquipmentRewardId: null,
  pendingFormulaBlueprintId: null,
  shownFormulaPoemIds: [],
  eventLog: [],
  eventMarkers: {},
  eventQueue: buildEventQueue(),
  shopPriceMultiplier: 100,
  currentEvent: null,
  eventChosenIndex: null,
  lastEnemyId: null,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const setEnemyActionCue = (
        enemyId: string,
        phase: EnemyActionPhase,
        token: number,
        playerImpactCue: PlayerImpactCue | null = null,
      ) => {
        set({
          enemyActionCue: { enemyId, phase, token },
          playerImpactCue,
        });
      };

      const applyEnemyTurnResult = (enemyTurnResult: EnemyTurnResult) => {
        if (enemyTurnResult.phase) {
          set({ phase: enemyTurnResult.phase, enemyActionCue: null, playerImpactCue: null });
          return;
        }
        set({
          player: {
            ...enemyTurnResult.player,
            statusEffects: [...enemyTurnResult.player.statusEffects],
          },
          enemies: enemyTurnResult.enemies,
          combatTurn: enemyTurnResult.combatTurn,
          turnFlags: enemyTurnResult.turnFlags,
          selectedEnemyId: enemyTurnResult.selectedEnemyId,
        });
      };

      const scheduleSingleEnemyAction = (action: EnemyTurnResult['actions'][number], index: number) => {
        const token = Date.now() + index;
        const startOffset = index * (ENEMY_ATTACK_TOTAL_MS + ENEMY_ACTION_CHAIN_GAP_MS);

        scheduleTask(startOffset, () => {
          setEnemyActionCue(action.enemyId, 'windup', token, null);
        });

        scheduleTask(startOffset + ENEMY_ATTACK_WINDUP_MS, () => {
          setEnemyActionCue(action.enemyId, 'lunge', token);
        });

        scheduleTask(startOffset + ENEMY_ATTACK_WINDUP_MS + ENEMY_ATTACK_LUNGE_MS, () => {
          set({
            player: action.player,
            enemies: action.enemies,
            selectedEnemyId: action.selectedEnemyId,
            enemyActionCue: { enemyId: action.enemyId, phase: 'impact', token },
            playerImpactCue: action.impactKind
              ? { token, kind: action.impactKind }
              : null,
          });
        });

        scheduleTask(startOffset + ENEMY_ATTACK_WINDUP_MS + ENEMY_ATTACK_LUNGE_MS + ENEMY_ATTACK_IMPACT_MS, () => {
          setEnemyActionCue(action.enemyId, 'recover', token);
        });
      };

      const scheduleEnemyActionAnimations = (enemyTurnResult: EnemyTurnResult) => {
        enemyTurnResult.actions.forEach((action, index) => {
          scheduleSingleEnemyAction(action, index);
        });

        const finalOffset =
          enemyTurnResult.actions.length * (ENEMY_ATTACK_TOTAL_MS + ENEMY_ACTION_CHAIN_GAP_MS) -
          ENEMY_ACTION_CHAIN_GAP_MS;

        scheduleTask(finalOffset, () => {
          applyEnemyTurnResult(enemyTurnResult);
          set({ enemyActionCue: null, playerImpactCue: null });
          if (enemyTurnResult.victory) {
            get().completeCombat();
          } else {
            get().drawCards(get().getDrawPerTurn());
          }
        });
      };

      const handleEnemyTurn = () => {
        const currentState = get();
        const enemyTurnResult = resolveEnemyTurn(currentState as CoreState, message => get().addLog(message));
        if (!enemyTurnResult) return;

        if (enemyTurnResult.actions.length === 0) {
          applyEnemyTurnResult(enemyTurnResult);
          if (enemyTurnResult.victory) {
            get().completeCombat();
          } else {
            get().drawCards(get().getDrawPerTurn());
          }
          return;
        }

        scheduleEnemyActionAnimations(enemyTurnResult);
      };

      const handlePlayerTurnEnd = () => {
        const state = get();
        const playerTurnResult = resolvePlayerEndTurn(state as CoreState, message => get().addLog(message));
        if (!playerTurnResult) return false;

        set({
          combatTurn: 1,
          player: {
            ...playerTurnResult.player,
            statusEffects: [...playerTurnResult.player.statusEffects],
          },
          enemies: playerTurnResult.enemies,
          turnFlags: playerTurnResult.turnFlags,
          enemyActionCue: null,
          playerImpactCue: null,
        });

        return true;
      };

      return {
        phase: 'start_menu',
      player: { ...INITIAL_PLAYER },
      currentAct: 1,
      currentFloor: 0,
      map: [],
      currentNodeId: null,
      enemies: [],
      combatTurn: 0,
      combatLog: [],
      selectedCardId: null,
      selectedEnemyId: null,
      volume: 1,
      bgmVolume: 1,
      sfxVolume: 1,
      fontSize: 16,
      bossKills: 0,
      combatWinsThisCycle: 0,
      shopRemovalCost: INITIAL_SHOP_REMOVAL_COST,
      turnFlags: { ...INITIAL_TURN_FLAGS },
      enemyActionCue: null,
      playerImpactCue: null,
      pendingEquipmentRewardId: null,
      pendingFormulaBlueprintId: null,
      shownFormulaPoemIds: [],

        startGame: (constitution: Constitution = 'balanced', currentAct = 1) => {
          cancelAllScheduledTasks();
          const normalizedConstitution = normalizeConstitution(constitution);
          const newRunState = buildNewRunState(normalizedConstitution, currentAct);
          const isAdmin = normalizedConstitution === 'admin';
          set({
            ...newRunState,
            player: {
              ...newRunState.player,
              obtainedCardIds: isAdmin
                ? Object.keys(CARD_LIBRARY).filter((id) => {
                    const c = CARD_LIBRARY[id];
                    return c && (isHerbCard(c) || isFormulaCard(c) || c.category === 'equipment');
                  })
                : [],
              obtainedEnemyTemplateIds: [],
              knownFormulaBlueprintIds: isAdmin
                ? FORMULA_BLUEPRINTS.map((bp) => bp.id)
                : [],
              relics: isAdmin
                ? EQUIPMENT_CARD_IDS.map((id) => {
                    const c = CARD_LIBRARY[id];
                    return { id, name: c?.name ?? id, description: c?.description ?? '', effectId: c?.effectId ?? '' };
                  })
                : [],
            },
            pendingEquipmentRewardId: null,
            pendingFormulaBlueprintId: null,
            shownFormulaPoemIds: [],
            eventLog: [],
            eventMarkers: {},
            eventQueue: buildEventQueue(),
            shopPriceMultiplier: 100,
          });
        },

      setFontSize: (size) => set({ fontSize: size }),

      setBgmVolume: (value) => {
        const clamped = Math.max(0, Math.min(1, value));
        setBgmVolume(clamped);
        set({ bgmVolume: clamped });
      },

      setSfxVolume: (value) => {
        const clamped = Math.max(0, Math.min(1, value));
        setSfxVolume(clamped);
        set({ sfxVolume: clamped });
      },

      startCombat: (nodeId) => {
        cancelAllScheduledTasks();
        const state = get();
        const locatedNode = findMapNodeById(state.map, nodeId);
        const node = locatedNode?.node;

        if (node && node.status !== 'available') {
          return;
        }

        const nodeType = node?.type || 'combat';

        if (nodeType === 'start') {
          return;
        }

        if (nodeType === 'shop' || nodeType === 'rest' || nodeType === 'event' || nodeType === 'chest') {
          if (nodeType === 'event') {
            const actKey = `act${state.currentAct}_intro`;
            if (!(state.eventMarkers ?? {})[actKey]) {
              const actStageData = getMainlineActData(state.currentAct, state.eventMarkers ?? {});
              if (actStageData) {
                set({
                  phase: 'event',
                  currentNodeId: nodeId,
                  enemyActionCue: null,
                  playerImpactCue: null,
                  currentEvent: {
                    id: `mainline_three_brothers_act${state.currentAct}`,
                    title: actStageData.title,
                    description: actStageData.description,
                    options: actStageData.options,
                  },
                  eventMarkers: { ...(state.eventMarkers ?? {}), [actKey]: 'true' },
                });
                return;
              }
            }
            const sideEvent = pickSideEvent(state);
            if (sideEvent) {
              set({
                phase: 'event',
                currentNodeId: nodeId,
                enemyActionCue: null,
                playerImpactCue: null,
                currentEvent: {
                  id: sideEvent.id,
                  title: sideEvent.title,
                  description: sideEvent.description,
                  options: sideEvent.options,
                },
              });
              return;
            }
            set({ phase: 'event', currentNodeId: nodeId, enemyActionCue: null, playerImpactCue: null, currentEvent: null });
            return;
          }
          set({ phase: nodeType, currentNodeId: nodeId, enemyActionCue: null, playerImpactCue: null });
          return;
        }

        if (nodeType === 'boss' && state.combatWinsThisCycle < getBossUnlockWinsRequired()) {
          return;
        }

        const poolKey = `act${Math.min(state.currentAct, 3)}` as keyof typeof ENEMY_POOLS;
        const allPools = ENEMY_POOLS[poolKey] ?? ENEMY_POOLS.act1;
        const enemyIds =
          nodeType === 'boss' ? allPools.boss : nodeType === 'elite' ? allPools.elite : allPools.common;
        const availableIds = enemyIds.length > 1
          ? enemyIds.filter(id => id !== state.lastEnemyId)
          : enemyIds;
        const pickedId = availableIds[Math.floor(Math.random() * availableIds.length)] ?? enemyIds[0];
        const enemyTemplate = ENEMIES[pickedId];
        if (!enemyTemplate) return;

        set({ lastEnemyId: pickedId });

        primeEnemyMedia(enemyTemplate);
        const scale = getEnemyScaling(state.currentFloor);
         const scaledEnemy = {
           ...enemyTemplate,
           maxHp: Math.ceil(enemyTemplate.maxHp * scale.hpMultiplier),
           currentHp: Math.ceil(enemyTemplate.maxHp * scale.hpMultiplier),
         };
        const combatState = createCombatState(state, scaledEnemy, nodeId);
        let startingPlayer: GameStore['player'] = combatState.player;
        const zhiweibingCount = countEquipment(startingPlayer, 'equipment_zhiweibing');
        if (zhiweibingCount > 0) {
          startingPlayer = applyEquipmentBlock(startingPlayer, 5 * zhiweibingCount);
        }
        set({
          ...combatState,
          player: {
            ...startingPlayer,
            obtainedEnemyTemplateIds: (state.player.obtainedEnemyTemplateIds ?? []).includes(enemyTemplate.id)
              ? state.player.obtainedEnemyTemplateIds ?? []
              : [...(state.player.obtainedEnemyTemplateIds ?? []), enemyTemplate.id],
          }
        });
        get().drawCards(5);
      },

      startAdminEnemyChallenge: (enemyId) => {
        cancelAllScheduledTasks();
        const enemyTemplate = ENEMIES[enemyId];
        if (!enemyTemplate) return;

        const challengeAct = ENEMY_CODEX_DETAILS[enemyId]?.act ?? 1;
        const runState = buildNewRunState('balanced', challengeAct);
        const previewState = { ...get(), ...runState } as GameStore;

        primeEnemyMedia(enemyTemplate);
        const combatState = createCombatState(previewState, enemyTemplate, `admin_enemy_${enemyId}`);
        let startingPlayer: GameStore['player'] = combatState.player;
        if (hasEquipment(startingPlayer, 'equipment_zhiweibing')) {
          startingPlayer = applyEquipmentBlock(startingPlayer, 5);
        }
        set({
          ...runState,
          ...combatState,
          player: {
            ...startingPlayer,
            obtainedEnemyTemplateIds: (previewState.player.obtainedEnemyTemplateIds ?? []).includes(enemyTemplate.id)
              ? previewState.player.obtainedEnemyTemplateIds ?? []
              : [...(previewState.player.obtainedEnemyTemplateIds ?? []), enemyTemplate.id],
          }
        });
        get().drawCards(5);
      },

      drawCards: (count) => {
        set(state => {
          let { drawPile, discardPile, hand } = state.player;
          const nextHand = [...hand];
          let drawn = 0;

          for (let i = 0; i < count; i += 1) {
            if (drawPile.length === 0) {
              if (discardPile.length === 0) break;
              drawPile = [...discardPile].sort(() => Math.random() - 0.5);
              discardPile = [];
            }
            const card = drawPile.pop();
            if (card) { nextHand.push(card); drawn += 1; }
          }

          if (drawn > 0 && state.phase === 'combat') {
            setTimeout(() => playSfx('card_draw'), 0);
          }

          return {
            player: {
              ...state.player,
              drawPile,
              discardPile,
              hand: nextHand,
            }
          };
        });
      },

      completeCombat: () => {
        cancelAllScheduledTasks();
        const state = get();
        playSfx('victory');

        if (isAdminEnemyChallengeNode(state.currentNodeId)) {
          set({
            phase: 'reward',
            currentFloor: 0,
            currentNodeId: null,
            selectedEnemyId: null,
            enemyActionCue: null,
            playerImpactCue: null,
            pendingEquipmentRewardId: null,
            pendingFormulaBlueprintId: null,
          });
          return;
        }

        const { map, currentLayerIndex, currentNode } = completeNode(state);
        const equipmentRewardId = rollEquipmentReward(currentNode?.type);
        const formulaBlueprintRewardId = rollFormulaBlueprintReward(currentNode?.type);
        const rewardPlayer = equipmentRewardId
          ? {
              ...state.player,
              relics: [...(state.player.relics ?? []), createEquipmentRelic(equipmentRewardId)],
              obtainedCardIds: (state.player.obtainedCardIds ?? []).includes(equipmentRewardId)
                ? state.player.obtainedCardIds ?? []
                : [...(state.player.obtainedCardIds ?? []), equipmentRewardId],
            }
          : state.player;

        if (currentNode?.type === 'boss') {
          const nextBossKills = state.bossKills + 1;
          const nextAct = Math.min(state.currentAct + 1, 3);
          const freshMap = generateMap(12);
          set({
            phase: 'reward',
            player: rewardPlayer,
            currentFloor: 0,
            map: freshMap,
            currentAct: nextAct,
            bossKills: nextBossKills,
            combatWinsThisCycle: 0,
            enemyActionCue: null,
            playerImpactCue: null,
            pendingEquipmentRewardId: equipmentRewardId,
            pendingFormulaBlueprintId: formulaBlueprintRewardId,
          });
          return;
        }

        const nextWins = state.combatWinsThisCycle + 1;
        let nextMap = map;
        let nextFloor = currentLayerIndex >= 0 ? Math.min(currentLayerIndex + 1, map.length - 1) : state.currentFloor;

        if (nextFloor >= map.length - 2) {
          const newSegment = generateMap(12, map.length);
          connectMapSegments(map, newSegment);
          nextMap = [...map, ...newSegment];
          nextFloor = Math.min(nextFloor, nextMap.length - 1);
        }

        set({
          phase: 'reward',
          player: rewardPlayer,
          currentFloor: nextFloor,
          map: nextMap,
          combatWinsThisCycle: nextWins,
          enemyActionCue: null,
          playerImpactCue: null,
          pendingEquipmentRewardId: equipmentRewardId,
          pendingFormulaBlueprintId: formulaBlueprintRewardId,
        });
      },

      completeNonCombat: () => {
        cancelAllScheduledTasks();
        const state = get();
        const { map, currentLayerIndex } = completeNode(state);
        let nextMap = map;
        let nextFloor = currentLayerIndex >= 0 ? Math.min(currentLayerIndex + 1, map.length - 1) : state.currentFloor;
        if (nextFloor >= map.length - 2) {
          const newSegment = generateMap(12, map.length);
          connectMapSegments(map, newSegment);
          nextMap = [...map, ...newSegment];
          nextFloor = Math.min(nextFloor, nextMap.length - 1);
        }
        set({
          phase: 'map',
          currentFloor: nextFloor,
          map: nextMap,
          currentNodeId: null,
          enemyActionCue: null,
          playerImpactCue: null,
          pendingEquipmentRewardId: null,
          pendingFormulaBlueprintId: null,
        });
      },

      playCard: (cardId, targetId) => {
        const state = get();
        if (!state.player.hand.some(card => card.id === cardId)) return;
        const result = resolveCardPlay(state as CoreState, cardId, targetId, message => get().addLog(message));
        if (!result) return;

        set({
          player: {
            ...result.player,
            energy: result.player.energy - result.energyCost,
            statusEffects: [...result.player.statusEffects],
          },
          enemies: result.enemies,
          selectedEnemyId: result.selectedEnemyId,
          turnFlags: result.turnFlags,
        });

        if (result.victory) {
          scheduleEnemyTurn(() => {
            get().completeCombat();
          });
        }
      },

      endTurn: () => {
        if (!handlePlayerTurnEnd()) return;
        scheduleEnemyTurn(handleEnemyTurn);
      },

      selectNode: (nodeId) => {
        set({ currentNodeId: nodeId });
        get().startCombat(nodeId);
      },

      selectEnemy: (enemyId) => set({ selectedEnemyId: enemyId }),
      setPhase: (phase) => {
        cancelAllScheduledTasks();
        set({ phase, enemyActionCue: null, playerImpactCue: null });
      },

      addCardToDeck: (cardId) => {
        set(state => {
          const cardTemplate = CARD_LIBRARY[cardId];
          if (!cardTemplate || !isHerbCard(cardTemplate) || cardTemplate.unplayable) return {};
          const count = countCardCopies(state.player.deck, cardId);
          if (count >= MAX_CARD_COPIES) return {};
          const ids = state.player.obtainedCardIds ?? [];
          return {
            player: {
              ...state.player,
              deck: [...state.player.deck, createCardInstance(cardId)],
              obtainedCardIds: ids.includes(cardId) ? ids : [...ids, cardId],
            }
          };
        });
      },

      addLog: (message) => {
        set(state => ({ combatLog: [...state.combatLog, message].slice(-12) }));
      },

      removeCardFromDeck: (cardIndex) => {
        set(state => {
          const deck = [...state.player.deck];
          deck.splice(cardIndex, 1);
          return { player: { ...state.player, deck } };
        });
      },

      removeCardById: (cardId) => {
        set(state => ({
          player: {
            ...state.player,
            deck: state.player.deck.filter(card => card.id !== cardId),
          }
        }));
      },

      upgradeCardById: (cardId) => {
        set(state => ({
          player: {
            ...state.player,
            deck: state.player.deck.map(card => (card.id === cardId ? applyCardUpgrade(card) : card)),
          }
        }));
      },

      addGold: (amount) => {
        if (amount > 0) playSfx('gold_gain');
        set(state => ({ player: { ...state.player, gold: Math.max(0, state.player.gold + amount) } }));
      },

      spendGold: (amount) => {
        const pre = get();
        if (amount > 0 && pre.phase === 'shop') playSfx('shop_purchase');
        set(state => ({ player: { ...state.player, gold: Math.max(0, state.player.gold - amount) } }));
      },

      healPlayer: (amount) => {
        if (amount > 0) playSfx('heal');
        set(state => ({
          player: {
            ...state.player,
            hp: Math.min(state.player.maxHp, state.player.hp + getPlayerHealAmount(state.player, amount)),
          }
        }));
      },

      increaseMaxHp: (amount) => {
        set(state => ({
          player: {
            ...state.player,
            maxHp: state.player.maxHp + amount,
            hp: state.player.hp + amount,
          }
        }));
      },

      increaseShopRemovalCost: (amount) => {
        set(state => ({ shopRemovalCost: Math.max(0, state.shopRemovalCost + amount) }));
      },

      getHandLimit: () => {
        const state = get();
        return BASE_HAND_LIMIT + Math.min(state.bossKills, MAX_HAND_LIMIT - BASE_HAND_LIMIT);
      },

      getDrawPerTurn: () => {
        const state = get();
        const drawDown = state.player.statusEffects.find(s => s.id === 'draw_down')?.stacks ?? 0;
        const base = BASE_DRAW_PER_TURN + Math.min(state.bossKills, MAX_DRAW_PER_TURN - BASE_DRAW_PER_TURN);
        const equipmentBonus = countEquipment(state.player, 'equipment_ziwuliuzhu') && state.phase === 'combat' ? countEquipment(state.player, 'equipment_ziwuliuzhu') : 0;
        const cap = equipmentBonus > 0 ? EQUIPMENT_DRAW_PER_TURN_CAP : MAX_DRAW_PER_TURN;
        return Math.max(0, Math.min(cap, base + equipmentBonus) - drawDown);
      },

      discardOverflowCard: (cardId) => {
        set(state => {
          const idx = state.player.hand.findIndex(c => c.id === cardId);
          if (idx < 0) return {};
          const nextHand = [...state.player.hand];
          nextHand.splice(idx, 1);
          return {
            player: {
              ...state.player,
              hand: nextHand,
              discardPile: [...state.player.discardPile, state.player.hand[idx]],
            }
          };
        });
      },

      getObtainedCardIds: () => {
        return get().player.obtainedCardIds ?? [];
      },

      sellCardFromDeck: (cardId) => {
        set(state => {
          const idx = state.player.deck.findIndex(c => c.id === cardId);
          if (idx < 0) return {};
          const card = state.player.deck[idx];
          const nextDeck = [...state.player.deck];
          nextDeck.splice(idx, 1);
          const sellPrice = card.rarity === 'rare' ? 50 : card.rarity === 'uncommon' ? 30 : 15;
          return {
            player: {
              ...state.player,
              deck: nextDeck,
              gold: state.player.gold + sellPrice,
            }
          };
        });
      },

      combineCards: (cardIds, targetCardId) => {
        set(state => {
          const targetTemplate = CARD_LIBRARY[targetCardId];
          if (!targetTemplate || !isHerbCard(targetTemplate) || targetTemplate.unplayable) return {};
          const nextDeck = state.player.deck.filter(c => !cardIds.includes(c.id));
          const alreadyHas = countCardCopies(nextDeck, targetCardId);
          if (alreadyHas >= MAX_CARD_COPIES) return {};
          return {
            player: {
              ...state.player,
              deck: [...nextDeck, createCardInstance(targetCardId)],
              obtainedCardIds: (state.player.obtainedCardIds ?? []).includes(targetCardId)
                ? state.player.obtainedCardIds ?? []
                : [...(state.player.obtainedCardIds ?? []), targetCardId],
            }
          };
        });
      },

      recordFormulaBlueprint: (blueprintId) => {
        const blueprint = FORMULA_BLUEPRINT_BY_ID[blueprintId];
        if (!blueprint) {
          return { ok: false, reason: 'unknown_blueprint', message: '未找到该药方蓝图。' };
        }
        if (!isCraftingPhase(get().phase)) {
          return { ok: false, reason: 'phase_unavailable', message: '合成台只能在战斗外使用。' };
        }

        set(state => {
          const known = state.player.knownFormulaBlueprintIds ?? [];
          if (known.includes(blueprintId)) return {};
          return {
            player: {
              ...state.player,
              knownFormulaBlueprintIds: [...known, blueprintId],
            },
          };
        });

        return { ok: true, message: '药方蓝图已录入合成台。' };
      },

      craftFormulaFromBlueprint: (blueprintId, ingredientInstanceIds) => {
        const state = get();
        const blueprint = FORMULA_BLUEPRINT_BY_ID[blueprintId];
        if (!isCraftingPhase(state.phase)) {
          return { ok: false, reason: 'phase_unavailable', message: '合成台只能在战斗外使用。' };
        }
        if (!blueprint) {
          return { ok: false, reason: 'unknown_blueprint', message: '未找到该药方蓝图。' };
        }
        if (!(state.player.knownFormulaBlueprintIds ?? []).includes(blueprintId)) {
          return { ok: false, reason: 'blueprint_not_recorded', message: '请先录入这张药方蓝图。' };
        }
        if (blueprint.status === 'recipe_pending' || blueprint.ingredientCardIds.length === 0) {
          return { ok: false, reason: 'recipe_pending', message: '该蓝图配方尚未录入，暂不能合成。' };
        }
        if (ingredientInstanceIds.length !== blueprint.ingredientCardIds.length) {
          return {
            ok: false,
            reason: 'invalid_ingredients',
            message: `合成该药方需要选择 ${blueprint.ingredientCardIds.length} 张药材牌。`,
          };
        }
        if (new Set(ingredientInstanceIds).size !== ingredientInstanceIds.length) {
          return { ok: false, reason: 'invalid_ingredients', message: '同一张药材牌不能重复作为材料。' };
        }

        const selectedCards = ingredientInstanceIds
          .map((instanceId) => state.player.deck.find((card) => card.id === instanceId) ?? null);
        if (selectedCards.some((card) => !card || getCardCategory(card) !== 'herb')) {
          return { ok: false, reason: 'invalid_ingredients', message: '只能使用牌组中的药材牌作为材料。' };
        }

        const selectedTemplateIds = selectedCards
          .map((card) => (card ? getTemplateCardId(card) : null))
          .filter((id): id is string => Boolean(id));
        if (!sameRecipe(selectedTemplateIds, blueprint.ingredientCardIds)) {
          return { ok: false, reason: 'ingredients_mismatch', message: '所选药材与蓝图配方不匹配。' };
        }

        const targetTemplate = CARD_LIBRARY[blueprint.formulaCardId];
        if (!targetTemplate || !isFormulaCard(targetTemplate)) {
          return { ok: false, reason: 'target_unavailable', message: '该药方牌尚未配置。' };
        }

        const shownPoems = state.shownFormulaPoemIds ?? [];
        const showPoem = !shownPoems.includes(blueprintId);

        set(current => ({
          player: {
            ...current.player,
            deck: [
              ...current.player.deck.filter(card => !ingredientInstanceIds.includes(card.id)),
              createCardInstance(blueprint.formulaCardId),
            ],
            obtainedCardIds: (current.player.obtainedCardIds ?? []).includes(blueprint.formulaCardId)
              ? current.player.obtainedCardIds ?? []
              : [...(current.player.obtainedCardIds ?? []), blueprint.formulaCardId],
          },
          shownFormulaPoemIds: showPoem
            ? [...(current.shownFormulaPoemIds ?? []), blueprintId]
            : current.shownFormulaPoemIds ?? [],
        }));

        return {
          ok: true,
          message: '药方牌已合成并加入牌组。',
          formulaCardId: blueprint.formulaCardId,
          showPoem,
          poem: showPoem ? blueprint.poem : undefined,
        };
      },
      clearPendingEquipmentReward: () => {
        set({ pendingEquipmentRewardId: null });
      },
      clearPendingFormulaBlueprintReward: () => {
        set({ pendingFormulaBlueprintId: null });
      },
      clearCurrentEvent: () => {
        set({ currentEvent: null, eventChosenIndex: null });
      },
      getShopPriceMultiplier: () => get().shopPriceMultiplier ?? 100,
      getCurrentEvent: () => get().currentEvent ?? null,
      handleEventChoice: (eventId, optionIndex) => {
        const state = get();
        const event = state.currentEvent;
        if (!event || event.id !== eventId) return;
        const option = event.options[optionIndex];
        if (!option) return;

        const nextPlayer = { ...state.player };
       let nextGold = state.player.gold;
        let nextShopPriceMultiplier = state.shopPriceMultiplier ?? 100;
        const nextEventLog = (state.eventLog ?? []).includes(eventId)
          ? (state.eventLog ?? [])
          : eventId.startsWith('side_')
            ? [...(state.eventLog ?? []), eventId]
            : (state.eventLog ?? []);
        let nextMarkers = { ...(state.eventMarkers ?? {}) };

        for (const effect of option.effects) {
          switch (effect.type) {
            case 'heal': {
              const amount = effect.value === 999 ? nextPlayer.maxHp : (effect.value ?? 0);
              nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + amount);
              break;
            }
            case 'damage': {
              const dmg = effect.value ?? 0;
              const blocked = Math.min(nextPlayer.block, dmg);
              nextPlayer.block -= blocked;
              nextPlayer.hp = Math.max(0, nextPlayer.hp - (dmg - blocked));
              break;
            }
            case 'maxHpChange': {
              const delta = effect.value ?? 0;
              nextPlayer.maxHp = Math.max(1, nextPlayer.maxHp + delta);
              if (delta > 0) nextPlayer.hp += delta;
              else nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp);
              break;
            }
            case 'goldChange': {
              nextGold = Math.max(0, nextGold + (effect.value ?? 0));
              break;
            }
            case 'shopPriceChange': {
              nextShopPriceMultiplier = Math.max(50, nextShopPriceMultiplier + (effect.value ?? 0));
              break;
            }
            case 'addRelic': {
              if (effect.relicId) {
                const c = CARD_LIBRARY[effect.relicId];
                const count = effect.count ?? 1;
                for (let i = 0; i < count; i++) {
                  nextPlayer.relics = [...(nextPlayer.relics ?? []), {
                    id: effect.relicId,
                    name: c?.name ?? effect.relicId,
                    description: c?.description ?? '',
                    effectId: c?.effectId ?? '',
                  }];
                }
              }
              break;
            }
            case 'removeCard': {
              const count = effect.count ?? 1;
              for (let i = 0; i < count; i++) {
                if (nextPlayer.deck.length > 0) {
                  const idx = Math.floor(Math.random() * nextPlayer.deck.length);
                  nextPlayer.deck = [...nextPlayer.deck.slice(0, idx), ...nextPlayer.deck.slice(idx + 1)];
                }
              }
              break;
            }
            case 'addCard': {
              if (effect.cardId) {
                nextPlayer.deck = [...nextPlayer.deck, createCardInstance(effect.cardId)];
              }
              break;
            }
            case 'randomCard': {
              const pool = Object.values(CARD_LIBRARY).filter(c =>
                isHerbCard(c) &&
                (effect.rarity ? c.rarity === effect.rarity : true) &&
                (effect.cardType ? c.type === effect.cardType : true)
              );
              if (pool.length > 0) {
                const picked = pool[Math.floor(Math.random() * pool.length)];
                nextPlayer.deck = [...nextPlayer.deck, createCardInstance(picked.id)];
              }
              break;
            }
          }
        }

        if (option.setMarker) {
          const [key, val] = option.setMarker.split('=');
          if (key && val) nextMarkers[key] = val;
        }

        if (event.clearMarkerOnTrigger) {
          delete nextMarkers[event.clearMarkerOnTrigger];
        }

        if (eventId === 'side_needle_stage2' && optionIndex === 0) {
          const needlePath = nextMarkers['needle_stage1'];
          if (needlePath === 'needle') {
            nextPlayer.maxHp = Math.max(1, nextPlayer.maxHp - 3);
            nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp);
          }
        }

        set({
          player: { ...nextPlayer, gold: nextGold },
          shopPriceMultiplier: nextShopPriceMultiplier,
          eventLog: nextEventLog,
          eventMarkers: nextMarkers,
          eventChosenIndex: optionIndex,
        });

        if (eventId !== 'mainline_three_brothers_act1' && eventId !== 'mainline_three_brothers_act2' && eventId !== 'mainline_three_brothers_act3') {
          const updatedState = get();
          const newEventLog = updatedState.eventLog ?? [];
          const contEvents = SIDE_EVENTS.filter(se =>
            se.continuationMarker && nextMarkers[se.continuationMarker] && !newEventLog.includes(se.id)
          );
          if (contEvents.length > 0) {
            const curQueue = updatedState.eventQueue ?? [];
            const remaining = curQueue.filter(id => !newEventLog.includes(id));
            set({ eventQueue: [...contEvents.map(e => e.id), ...remaining] });
          }
        }

        if (eventId === 'mainline_three_brothers_act1') {
          set({ eventMarkers: { ...nextMarkers, ['act1_intro']: 'true' } });
        } else if (eventId === 'mainline_three_brothers_act2') {
          set({ eventMarkers: { ...nextMarkers, ['act2_intro']: 'true' } });
        } else if (eventId === 'mainline_three_brothers_act3') {
          set({ eventMarkers: { ...nextMarkers, ['act3_intro']: 'true' } });
        }
      },
    };
  },
    {
      name: 'wuxing-yidao-storage',
      storage: createJSONStorage(() => webStorage),
      version: 14,
      partialize: state => ({
        phase: state.phase === 'card_codex' || state.phase === 'intro' ? 'start_menu' : state.phase,
        player: state.player,
        currentAct: state.currentAct,
        currentFloor: state.currentFloor,
        map: state.map,
        currentNodeId: state.currentNodeId,
        enemies: state.enemies,
        combatTurn: state.combatTurn,
        combatLog: state.combatLog,
        selectedCardId: state.selectedCardId,
        selectedEnemyId: state.selectedEnemyId,
        bgmVolume: state.bgmVolume,
        sfxVolume: state.sfxVolume,
        fontSize: state.fontSize,
        bossKills: state.bossKills,
        combatWinsThisCycle: state.combatWinsThisCycle,
        shopRemovalCost: state.shopRemovalCost,
        turnFlags: state.turnFlags,
        pendingEquipmentRewardId: state.pendingEquipmentRewardId,
        pendingFormulaBlueprintId: state.pendingFormulaBlueprintId,
        shownFormulaPoemIds: state.shownFormulaPoemIds,
        eventLog: state.eventLog ?? [],
        eventMarkers: state.eventMarkers ?? {},
        eventQueue: state.eventQueue ?? buildEventQueue(),
        shopPriceMultiplier: state.shopPriceMultiplier ?? 100,
      }),
      migrate: (persistedState, version) => {
        if (version < 8) {
          const legacy = persistedState as any;
          return {
            phase: 'start_menu',
            player: { ...INITIAL_PLAYER },
            currentAct: 1,
            currentFloor: 0,
            map: [],
            currentNodeId: null,
            enemies: [],
            combatTurn: 0,
            combatLog: [],
            selectedCardId: null,
            selectedEnemyId: null,
            bgmVolume: typeof legacy.bgmVolume === 'number' ? legacy.bgmVolume : 1,
            sfxVolume: typeof legacy.sfxVolume === 'number' ? legacy.sfxVolume : 1,
            fontSize: typeof legacy.fontSize === 'number' ? legacy.fontSize : 16,
            shopRemovalCost: INITIAL_SHOP_REMOVAL_COST,
            turnFlags: { ...INITIAL_TURN_FLAGS },
            enemyActionCue: null,
            playerImpactCue: null,
            pendingEquipmentRewardId: null,
            pendingFormulaBlueprintId: null,
            shownFormulaPoemIds: [],
            eventLog: [],
            eventMarkers: {},
            eventQueue: buildEventQueue(),
            shopPriceMultiplier: 100,
          } as Partial<GameStore>;
        }
        const migrated = persistedState as GameStore;
        const normalizedConstitution = normalizeConstitution(migrated.player?.constitution);
        const existingPlayer = migrated.player ?? INITIAL_PLAYER;
        return {
          ...migrated,
          player: {
            ...existingPlayer,
            constitution: normalizedConstitution,
            statusEffects: existingPlayer.statusEffects?.map((status) => {
              if (status.id === 'fire_heat_passive') {
                return { ...CONSTITUTION_PASSIVES.damp_heat[0] };
              }
              if (status.id === 'jing_deficiency_passive') {
                return { ...CONSTITUTION_PASSIVES.special_diathesis[0] };
              }
              const refreshedPassive = CONSTITUTION_PASSIVES[normalizedConstitution].find(passive => passive.id === status.id);
              if (refreshedPassive) {
                return { ...refreshedPassive };
              }
              return status;
            }) ?? CONSTITUTION_PASSIVES[normalizedConstitution].map(status => ({ ...status })),
            relics: existingPlayer.relics ?? [],
            obtainedCardIds: existingPlayer.obtainedCardIds ?? [],
            obtainedEnemyTemplateIds: existingPlayer.obtainedEnemyTemplateIds ?? [],
            knownFormulaBlueprintIds: existingPlayer.knownFormulaBlueprintIds ?? [],
          },
          enemyActionCue: null,
          playerImpactCue: null,
          pendingEquipmentRewardId: null,
          pendingFormulaBlueprintId: null,
          shownFormulaPoemIds: migrated.shownFormulaPoemIds ?? [],
          eventLog: migrated.eventLog ?? [],
          eventMarkers: migrated.eventMarkers ?? {},
          eventQueue: migrated.eventQueue ?? buildEventQueue(),
          shopPriceMultiplier: migrated.shopPriceMultiplier ?? 100,
        } as GameStore;
      }
    }
  )
);
