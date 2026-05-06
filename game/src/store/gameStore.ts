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
import { CARD_LIBRARY, STARTING_DECKS } from '../data/cards';
import { ENEMY_CODEX_DETAILS } from '../data/codex';
import { ENEMIES, ENEMY_POOLS } from '../data/enemies';
import { createRuntimeId } from '../utils/id';
import { primeProgressiveAsset } from '../utils/progressiveAssets';
import {
  INITIAL_PLAYER,
  INITIAL_TURN_FLAGS,
  applyCardUpgrade,
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
  advanceTime: (ms: number) => void;
  discardOverflowCard: (cardId: string) => void;
  getHandLimit: () => number;
  getDrawPerTurn: () => number;
  sellCardFromDeck: (cardId: string) => void;
  combineCards: (cardIds: string[], targetCardId: string) => void;
  getObtainedCardIds: () => string[];
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
  remaining: number;
  runAt: number;
  fn: () => void;
  timeout: ReturnType<typeof setTimeout> | null;
}

let nextScheduledTaskId = 1;
let scheduledTasks: ScheduledTask[] = [];
let pendingEnemyTurnTaskId: number | null = null;

const removeScheduledTask = (taskId: number) => {
  scheduledTasks = scheduledTasks.filter(task => task.id !== taskId);
};

const executeScheduledTask = (taskId: number) => {
  const task = scheduledTasks.find(entry => entry.id === taskId);
  if (!task) return;
  if (task.timeout) {
    clearTimeout(task.timeout);
    task.timeout = null;
  }
  removeScheduledTask(taskId);
  task.fn();
};

const scheduleTask = (delay: number, fn: () => void) => {
  const id = nextScheduledTaskId++;
  const task: ScheduledTask = {
    id,
    remaining: delay,
    runAt: Date.now() + delay,
    fn,
    timeout: null,
  };
  task.timeout = setTimeout(() => {
    executeScheduledTask(id);
  }, delay);
  scheduledTasks.push(task);
  return id;
};

const cancelScheduledTask = (taskId: number | null) => {
  if (taskId == null) return;
  const task = scheduledTasks.find(entry => entry.id === taskId);
  if (task?.timeout) {
    clearTimeout(task.timeout);
  }
  removeScheduledTask(taskId);
};

const cancelAllScheduledTasks = () => {
  scheduledTasks.forEach(task => {
    if (task.timeout) {
      clearTimeout(task.timeout);
    }
  });
  scheduledTasks = [];
  pendingEnemyTurnTaskId = null;
};

const advanceScheduledTasks = (ms: number) => {
  if (scheduledTasks.length === 0) return;
  for (const task of scheduledTasks) {
    task.remaining -= ms;
  }
  const dueIds = scheduledTasks
    .filter(task => task.remaining <= 0)
    .sort((a, b) => a.runAt - b.runAt)
    .map(task => task.id);

  dueIds.forEach(executeScheduledTask);
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

const createCardInstance = (cardId: string): Card => ({
  ...CARD_LIBRARY[cardId],
  id: createRuntimeId(),
});

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

  if (currentNode?.children) {
    const nextLayer = map[currentLayerIndex + 1];
    if (nextLayer) {
      currentNode.children.forEach(childId => {
        const childNode = nextLayer.nodes.find(node => node.id === childId);
        if (childNode) childNode.status = 'available';
      });
    }
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
  const deckIds = STARTING_DECKS[constitution] || STARTING_DECKS.balanced;
  const deck = deckIds.map(createCardInstance);
  const statusEffects: StatusEffect[] = [];

  if (constitution === 'yin_deficiency') {
    statusEffects.push({
      id: 'yin_deficiency_passive',
      name: '阴虚火旺',
      type: 'buff',
      stacks: 1,
      description: '回合开始时获得1点能量，但受到伤害+1',
      canStack: false,
    });
  } else if (constitution === 'qi_deficiency') {
    statusEffects.push({
      id: 'qi_deficiency_passive',
      name: '气虚血瘀',
      type: 'buff',
      stacks: 1,
      description: '每次打出攻击牌，恢复1点生命',
      canStack: false,
    });
  } else if (constitution === 'blood_stasis') {
    statusEffects.push({
      id: 'blood_stasis_passive',
      name: '血瘀体质',
      type: 'buff',
      stacks: 1,
      description: '对有血瘀的敌人额外造成2点伤害',
      canStack: false,
    });
  } else if (constitution === 'phlegm_dampness') {
    statusEffects.push({
      id: 'phlegm_dampness_passive',
      name: '痰湿体质',
      type: 'buff',
      stacks: 1,
      description: '回合结束时保留最多3点格挡',
      canStack: false,
    });
  } else if (constitution === 'fire_heat') {
    statusEffects.push({
      id: 'fire_heat_passive',
      name: '火热体质',
      type: 'buff',
      stacks: 1,
      description: '攻击牌额外造成1点伤害',
      canStack: false,
    });
  } else if (constitution === 'qi_stagnation') {
    statusEffects.push({
      id: 'qi_stagnation_passive',
      name: '气滞体质',
      type: 'buff',
      stacks: 1,
      description: '每回合多抽1张牌',
      canStack: false,
    });
  } else if (constitution === 'jing_deficiency') {
    statusEffects.push({
      id: 'jing_deficiency_passive',
      name: '精虚体质',
      type: 'buff',
      stacks: 1,
      description: '技能牌费用-1（最低0）',
      canStack: false,
    });
  } else if (constitution === 'yang_deficiency') {
    statusEffects.push({
      id: 'yang_deficiency_passive',
      name: '阳虚体质',
      type: 'buff',
      stacks: 1,
      description: '生命低于50%时攻击+3',
      canStack: false,
    });
  }

  return {
    ...INITIAL_PLAYER,
    deck,
    constitution,
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
          player: enemyTurnResult.player,
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
          player: playerTurnResult.player,
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

      startGame: (constitution: Constitution = 'balanced') => {
        cancelAllScheduledTasks();
        const prevObtainedCards = get().player.obtainedCardIds ?? [];
        const prevObtainedEnemies = get().player.obtainedEnemyTemplateIds ?? [];
        set({
          ...buildNewRunState(constitution),
          player: {
            ...buildNewRunState(constitution).player,
            obtainedCardIds: prevObtainedCards,
            obtainedEnemyTemplateIds: prevObtainedEnemies,
          }
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
          set({ phase: nodeType, currentNodeId: nodeId, enemyActionCue: null, playerImpactCue: null });
          return;
        }

        if (nodeType === 'boss' && state.combatWinsThisCycle < getBossUnlockWinsRequired()) {
          return;
        }

        const allPools = ENEMY_POOLS.act1;
        const enemyIds =
          nodeType === 'boss' ? allPools.boss : nodeType === 'elite' ? allPools.elite : allPools.common;
        const enemyTemplate = ENEMIES[enemyIds[Math.floor(Math.random() * enemyIds.length)]];
        if (!enemyTemplate) return;

        primeEnemyMedia(enemyTemplate);
        const scale = getEnemyScaling(state.currentFloor);
         const scaledEnemy = {
           ...enemyTemplate,
           maxHp: Math.ceil(enemyTemplate.maxHp * scale.hpMultiplier),
           currentHp: Math.ceil(enemyTemplate.maxHp * scale.hpMultiplier),
         };
        const combatState = createCombatState(state, scaledEnemy, nodeId);
        set({
          ...combatState,
          player: {
            ...combatState.player,
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
        set({
          ...runState,
          ...combatState,
          player: {
            ...combatState.player,
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
          });
          return;
        }

        const { map, currentLayerIndex, currentNode } = completeNode(state);

        if (currentNode?.type === 'boss') {
          const nextBossKills = state.bossKills + 1;
          set({
            phase: 'reward',
            currentFloor: currentLayerIndex >= 0 ? Math.min(currentLayerIndex + 1, map.length - 1) : state.currentFloor,
            map,
            bossKills: nextBossKills,
            combatWinsThisCycle: 0,
            enemyActionCue: null,
            playerImpactCue: null,
          });
          return;
        }

        const nextWins = state.combatWinsThisCycle + 1;
        let nextMap = map;
        let nextFloor = currentLayerIndex >= 0 ? Math.min(currentLayerIndex + 1, map.length - 1) : state.currentFloor;

        if (nextFloor >= map.length - 2) {
          nextMap = [...map, ...generateMap(12, map.length)];
          nextFloor = Math.min(nextFloor, nextMap.length - 1);
        }

        set({
          phase: 'reward',
          currentFloor: nextFloor,
          map: nextMap,
          combatWinsThisCycle: nextWins,
          enemyActionCue: null,
          playerImpactCue: null,
        });
      },

      completeNonCombat: () => {
        cancelAllScheduledTasks();
        const state = get();
        const { map, currentLayerIndex } = completeNode(state);
        let nextMap = map;
        let nextFloor = currentLayerIndex >= 0 ? Math.min(currentLayerIndex + 1, map.length - 1) : state.currentFloor;
        if (nextFloor >= map.length - 2) {
          nextMap = [...map, ...generateMap(12, map.length)];
          nextFloor = Math.min(nextFloor, nextMap.length - 1);
        }
        set({
          phase: 'map',
          currentFloor: nextFloor,
          map: nextMap,
          currentNodeId: null,
          enemyActionCue: null,
          playerImpactCue: null,
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
          const count = state.player.deck.filter(c => c.id === cardId || c.name === CARD_LIBRARY[cardId]?.name).length;
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
            hp: Math.min(state.player.maxHp, state.player.hp + amount),
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
        return Math.max(0, base - drawDown);
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
          const nextDeck = state.player.deck.filter(c => !cardIds.includes(c.id));
          const alreadyHas = nextDeck.filter(c => c.id === targetCardId || c.name === CARD_LIBRARY[targetCardId]?.name).length;
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

      advanceTime: (ms) => {
        advanceScheduledTasks(ms);
      },
    };
  },
    {
      name: 'wuxing-yidao-storage',
      storage: createJSONStorage(() => webStorage),
      version: 9,
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
          } as Partial<GameStore>;
        }
        return {
          ...(persistedState as GameStore),
          enemyActionCue: null,
          playerImpactCue: null,
        } as GameStore;
      }
    }
  )
);
