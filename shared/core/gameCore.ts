import { Card, Enemy, EnemyIntent, GamePhase, MapLayer, MapNode, NodeType, Player, StatusEffect } from '../baseTypes';
import { ENEMIES } from '../data/enemies';
import { getEnemyStrategy, getEnemyActionCount, type EnemyActionContext } from './enemyStrategies';

export interface TurnFlags {
  playedAttack: boolean;
  playedSkill: boolean;
  tookAttackDamage: boolean;
  cardsPlayed: number;
}

export interface CoreState {
  phase: GamePhase;
  player: Player;
  currentAct: number;
  currentFloor: number;
  map: MapLayer[];
  currentNodeId: string | null;
  enemies: Enemy[];
  combatTurn: number;
  selectedCardId: string | null;
  selectedEnemyId: string | null;
  turnFlags: TurnFlags;
}

export const BASE_YIN_CAP = 5;
export const CONSTITUTION_PASSIVE_IDS = new Set([
  'balanced_passive',
  'yin_deficiency_passive',
  'qi_deficiency_passive',
  'yang_deficiency_passive',
  'phlegm_dampness_passive',
  'damp_heat_passive',
  'blood_stasis_passive',
  'qi_stagnation_passive',
  'special_diathesis_passive',
]);

export const INITIAL_PLAYER: Player = {
  hp: 80,
  maxHp: 80,
  energy: 3,
  maxEnergy: 3,
  block: 0,
  deck: [],
  hand: [],
  discardPile: [],
  drawPile: [],
  exhaustPile: [],
  statusEffects: [],
  constitution: 'balanced',
  relics: [],
  potions: [],
  gold: 99,
  obtainedCardIds: [],
  obtainedEnemyTemplateIds: [],
  knownFormulaBlueprintIds: [],
};

export const INITIAL_TURN_FLAGS: TurnFlags = {
  playedAttack: false,
  playedSkill: false,
  tookAttackDamage: false,
  cardsPlayed: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getStatus = (entity: { statusEffects: StatusEffect[] }, id: string) =>
  entity.statusEffects.find(s => s.id === id);

const getStacks = (entity: { statusEffects: StatusEffect[] }, id: string) =>
  getStatus(entity, id)?.stacks || 0;

const getStrength = (entity: { statusEffects: StatusEffect[] }) =>
  getStacks(entity, 'strength') + getStacks(entity, 'temp_strength');

const getDexterity = (entity: { statusEffects: StatusEffect[] }) =>
  getStacks(entity, 'dexterity');

const getYinCap = (entity: { statusEffects: StatusEffect[] }) =>
  BASE_YIN_CAP + getStacks(entity, 'yin_cap');

const getEffectiveMaxEnergy = (entity: Player) =>
  Math.max(1, entity.maxEnergy - getStacks(entity, 'energy_drain') - getStacks(entity, 'max_energy_down'));

const hasPassive = (entity: { statusEffects: StatusEffect[] }, id: string) =>
  getStacks(entity, id) > 0;

const hasRelic = (player: Player, id: string) =>
  player.relics?.some(relic => relic.id === id) ?? false;

const countRelic = (player: Player, id: string): number =>
  player.relics?.filter(relic => relic.id === id).length ?? 0;

const getCombatRound = (player: Player) =>
  getStacks(player, 'combat_round') || 1;

const gainPlayerBlock = (player: Player, amount: number) => {
  if (amount <= 0) return 0;
  player.block += amount;
  if (hasRelic(player, 'equipment_qixue_jinye')) {
    applyHealToPlayer(player, Math.min(2, Math.floor(amount / 5)));
  }
  return amount;
};

const takePlayerHpDamage = (player: Player, amount: number) => {
  if (amount <= 0) return 0;
  const finalDamage = hasRelic(player, 'equipment_zhengti') ? Math.max(0, amount - countRelic(player, 'equipment_zhengti')) : amount;
  if (finalDamage <= 0) return 0;
  player.hp = Math.max(0, player.hp - finalDamage);
  return finalDamage;
};

const isConstitutionPassive = (status: StatusEffect) =>
  status.dispelImmune || CONSTITUTION_PASSIVE_IDS.has(status.id);

const applyHealToPlayer = (player: Player, amount: number) => {
  if (amount <= 0) return 0;
  let heal = amount;
  if (hasPassive(player, 'balanced_passive')) {
    heal += 1;
  }
  if (hasPassive(player, 'qi_deficiency_passive')) {
    heal += 1;
  }
  if (hasRelic(player, 'equipment_zhengti')) {
    heal += countRelic(player, 'equipment_zhengti');
  }
  if (hasPassive(player, 'blood_stasis_passive')) {
    heal = Math.floor(heal * 0.5);
  }
  if (getStacks(player, 'lung_dryness') > 0) {
    heal = Math.floor(heal * 0.5);
  }
  if (heal <= 0) return 0;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  return heal;
};

const gainYin = (player: Player, amount: number, log?: (message: string) => void) => {
  if (amount <= 0) return 0;
  if (getStacks(player, 'no_yin_gain') > 0) {
    log?.('你暂时无法获得滋阴。');
    return 0;
  }
  const passiveBonus = hasPassive(player, 'yin_deficiency_passive') ? 1 : 0;
  const yinCap = getYinCap(player);
  const current = getStacks(player, 'yin');
  const capped = clamp(current + amount + passiveBonus, 0, yinCap);
  const delta = capped - current;
  if (delta > 0) {
    addStatus(player, {
      id: 'yin',
      name: '滋阴',
      type: 'buff',
      stacks: delta,
      canStack: true,
      description: '回合开始可触发效果'
    });
  }
  return delta;
};

const drawCardsForPlayer = (player: Player, count: number) => {
  for (let i = 0; i < count; i += 1) {
    if (player.drawPile.length === 0) {
      if (player.discardPile.length === 0) break;
      player.drawPile = [...player.discardPile].sort(() => Math.random() - 0.5);
      player.discardPile = [];
    }
    const cardDrawn = player.drawPile.pop();
    if (cardDrawn) player.hand.push(cardDrawn);
  }
};

const addStatus = (entity: { statusEffects: StatusEffect[] }, status: StatusEffect) => {
  const existing = getStatus(entity, status.id);
  if (existing) {
    if (existing.canStack || status.canStack) {
      existing.stacks += status.stacks;
    } else {
      existing.stacks = Math.max(existing.stacks, status.stacks);
    }
    if (typeof status.duration === 'number') {
      existing.duration = existing.duration ? Math.max(existing.duration, status.duration) : status.duration;
    }
    if (status.sourceId) {
      existing.sourceId = status.sourceId;
    }
    if (status.dispelImmune) {
      existing.dispelImmune = true;
    }
    if (status.hidden) {
      existing.hidden = true;
    }
    return;
  }
  entity.statusEffects.push({ ...status });
};

const removeStatus = (entity: { statusEffects: StatusEffect[] }, id: string) => {
  entity.statusEffects = entity.statusEffects.filter(s => s.id !== id);
};

const removeDebuffs = (entity: { statusEffects: StatusEffect[] }, count?: number) => {
  if (!count) {
    entity.statusEffects = entity.statusEffects.filter(s => s.type !== 'debuff' || isConstitutionPassive(s));
    return;
  }
  let remaining = count;
  entity.statusEffects = entity.statusEffects.filter(s => {
    if (remaining > 0 && s.type === 'debuff' && !isConstitutionPassive(s)) {
      remaining -= 1;
      return false;
    }
    return true;
  });
};

const removeBuffs = (entity: { statusEffects: StatusEffect[] }) => {
  entity.statusEffects = entity.statusEffects.filter(s => s.type !== 'buff' || isConstitutionPassive(s));
};

const decrementDurations = (entity: { statusEffects: StatusEffect[] }) => {
  entity.statusEffects = entity.statusEffects
    .map(s => (typeof s.duration === 'number' ? { ...s, duration: s.duration - 1 } : s))
    .filter(s => s.duration === undefined || s.duration > 0);
};

const decayStacks = (entity: { statusEffects: StatusEffect[] }, ids: string[]) => {
  ids.forEach(id => {
    const status = getStatus(entity, id);
    if (!status) return;
    status.stacks -= 1;
    if (status.stacks <= 0) {
      removeStatus(entity, id);
    }
  });
};

export const applyCardUpgrade = (card: Card): Card => {
  if (card.upgraded) return card;
  const next: Card = { ...card, upgraded: true };
  if (typeof card.effectValue === 'number') {
    next.effectValue = card.effectValue + 2;
  }
  if (typeof card.secondaryValue === 'number') {
    next.secondaryValue = card.secondaryValue + 1;
  }
  return next;
};


const MAP_X_PRESETS: Record<number, number[]> = {
  1: [50],
  2: [34, 66],
  3: [22, 50, 78],
  4: [14, 36, 58, 80],
  5: [10, 28, 48, 68, 86],
};

const jitterX = (value: number, amount = 2.5) => clamp(value + (Math.random() * amount * 2 - amount), 10, 90);

const createNodeWithType = (layerIndex: number, nodeIndex: number, _layers: number, nodeCount: number, nodeType: NodeType): MapNode => {
  const preset = MAP_X_PRESETS[nodeCount] ?? MAP_X_PRESETS[3];
  const baseX = preset[nodeIndex] ?? 50;
  const fixedNode = layerIndex === 0;

  return {
    id: `node_${layerIndex}_${nodeIndex}`,
    type: nodeType,
    x: fixedNode ? baseX : jitterX(baseX),
    y: layerIndex * 80 + 50,
    children: [],
    parents: [],
    status: layerIndex === 0 ? 'current' : layerIndex === 1 ? 'available' : 'locked',
  };
};

const connectNodes = (parent: MapNode, child: MapNode) => {
  if (!parent.children.includes(child.id)) {
    parent.children.push(child.id);
  }
  if (!child.parents.includes(parent.id)) {
    child.parents.push(parent.id);
  }
};

export const connectMapSegments = (prevLayers: MapLayer[], nextLayers: MapLayer[]) => {
  if (prevLayers.length === 0 || nextLayers.length === 0) return;
  const prevLast = prevLayers[prevLayers.length - 1].nodes;
  const nextFirst = nextLayers[0].nodes;
  const mainPrev = prevLast.slice(0, 3);
  const mainNext = nextFirst.slice(0, 3);
  if (mainPrev.length === 0 || mainNext.length === 0) return;
  for (let i = 0; i < mainPrev.length; i++) {
    const baseTarget = Math.round((i / (mainPrev.length - 1)) * (mainNext.length - 1));
    const parent = mainPrev[i];
    const child = mainNext[baseTarget];
    if (parent && child) connectNodes(parent, child);
    const branchDir = i === 0 ? 1 : -1;
    const branchIndex = Math.max(0, Math.min(mainNext.length - 1, baseTarget + branchDir));
    if (branchIndex !== baseTarget) {
      const branchChild = mainNext[branchIndex];
      if (parent && branchChild) connectNodes(parent, branchChild);
    }
  }
  mainNext.forEach((node, ni) => {
    if (ni >= 3) return;
    if (node.parents.length === 0) {
      connectNodes(mainPrev[Math.floor((ni / (mainNext.length - 1)) * (mainPrev.length - 1))] ?? mainPrev[0], node);
    }
  });
};

const closestNodeIndex = (nodes: MapNode[], x: number) =>
  nodes.reduce(
    (best, node, index) => {
      const distance = Math.abs(node.x - x);
      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;

// Helper to generate map with branches
export function generateMap(layers: number, startOffset = 0): MapLayer[] {
  const safeLayers = Math.max(layers, startOffset === 0 ? 14 : layers);
  const result = generateMapSegment(safeLayers, startOffset, 0, 0);
  return result.layers;
}

const scanTailCounters = (layers: MapLayer[]): { combatSinceEvent: number; combatSinceShop: number } => {
  let cse = 0; let css = 0;
  for (let i = Math.max(0, layers.length - 4); i < layers.length; i++) {
    const types = layers[i].nodes.map(n => n.type);
    const mainTypes = types.slice(0, Math.min(3, types.length));
    const hasEvent = mainTypes.some(t => t === 'event');
    const hasShop = mainTypes.some(t => t === 'shop');
    const hasRestBoss = types.some(t => t === 'rest' || t === 'boss');
    if (hasEvent || hasShop || hasRestBoss) {
      cse = 0;
      if (hasShop) css = 0;
      else if (!hasRestBoss) css += 1;
    } else {
      cse += 1; css += 1;
    }
  }
  return { combatSinceEvent: cse, combatSinceShop: css };
};

export function extendMap(existingLayers: MapLayer[]): MapLayer[] {
  const tail = scanTailCounters(existingLayers);
  const newSegment = generateMapSegment(12, existingLayers.length, tail.combatSinceEvent, tail.combatSinceShop);
  connectMapSegments(existingLayers, newSegment.layers);
  return [...existingLayers, ...newSegment.layers];
}

export const generateMapSegment = (totalLayers: number, startLayerIndex: number, initialCombatSinceEvent = 0, initialCombatSinceShop = 0): { layers: MapLayer[]; combatSinceEvent: number; combatSinceShop: number } => {
  const layers: MapLayer[] = [];
  let combatSinceShop = initialCombatSinceShop;
  let combatSinceEvent = initialCombatSinceEvent;
  let lastCombatCol = -1;

  for (let li = 0; li < totalLayers; li += 1) {
    const absoluteLayer = startLayerIndex + li;
    const nodeCount = getNodeCountForLayerV3(absoluteLayer);
    const result = generateLayerTypes(absoluteLayer, nodeCount, combatSinceShop, combatSinceEvent, lastCombatCol);
    const types = result.types;
    lastCombatCol = result.lastCombatCol;

    const mainTypes = types.slice(0, Math.min(3, types.length));
    const hasEvent = mainTypes.some(t => t === 'event');
    const hasShop = mainTypes.some(t => t === 'shop');
    const hasRestBoss = types.some(t => t === 'rest' || t === 'boss');

    if (hasEvent || hasShop || hasRestBoss) {
      combatSinceEvent = 0;
      if (hasShop) combatSinceShop = 0;
      else if (!hasRestBoss) combatSinceShop += 1;
    } else {
      combatSinceEvent += 1;
      combatSinceShop += 1;
    }

    const nodes = types.map((nodeType, ni) =>
      createNodeWithType(absoluteLayer, ni, startLayerIndex + totalLayers, nodeCount, nodeType)
    );
    layers.push({ nodes });
  }

  for (let li = 0; li < totalLayers - 1; li += 1) {
    const currentLayer = layers[li].nodes;
    const nextLayer = layers[li + 1].nodes;

    currentLayer.forEach((node, nodeIndex) => {
      if (nodeIndex >= 3) return;
      const baseTarget =
        currentLayer.length === 1
          ? Math.floor((nextLayer.length - 1) / 2)
          : Math.round((nodeIndex / (currentLayer.length - 1)) * (nextLayer.length - 1));

      const targetIndexes = new Set<number>([baseTarget]);
      const canBranch = nextLayer.length > 1 && node.type !== 'boss' && (absoluteLayer(li, startLayerIndex) === 0 || Math.random() < 0.48);

      if (canBranch) {
        const branchDirection = Math.random() > 0.5 ? 1 : -1;
        const branchIndex = clamp(baseTarget + branchDirection, 0, nextLayer.length - 1);
        targetIndexes.add(branchIndex);
      }

      targetIndexes.forEach((targetIndex) => {
        const child = nextLayer[targetIndex];
        if (child && Math.abs(child.x - node.x) <= 30) {
          connectNodes(node, child);
        }
      });

      if (node.children.length === 0) {
        const mainNodes = nextLayer.slice(0, 3);
        if (mainNodes.length > 0) {
          connectNodes(node, mainNodes[closestNodeIndex(mainNodes, node.x)]);
        }
      }
    });

    nextLayer.forEach((node, nodeIndex) => {
      if (nodeIndex >= 3) return;
      if (node.parents.length === 0) {
        const mainParents = currentLayer.slice(0, 3);
        if (mainParents.length > 0) {
          connectNodes(mainParents[closestNodeIndex(mainParents, node.x)], node);
        }
      }
    });
  }

  if (totalLayers >= 3) {
    connectNodes(layers[1].nodes[0], layers[2].nodes[3]);
  }
  for (let li = 2; li < totalLayers - 1; li += 1) {
    const cur = layers[li].nodes;
    const nxt = layers[li + 1].nodes;
    if (cur.length > 3 && nxt.length > 3 && cur[3].type !== 'boss' && cur[3].parents.length > 0) {
      connectNodes(cur[3], nxt[3]);
    }
    if (cur.length > 3 && (cur[3].type === 'rest' || cur[3].type === 'boss')) {
      const mainNodes = cur.slice(0, 3);
      connectNodes(mainNodes[closestNodeIndex(mainNodes, cur[3].x)], cur[3]);
    }
  }

  return { layers, combatSinceEvent, combatSinceShop };
};

const absoluteLayer = (li: number, startLayerIndex: number) => startLayerIndex + li;

const ACT_LENGTH = 10;

const generateLayerTypes = (absoluteLayer: number, nodeCount: number, combatSinceShop: number, combatSinceEvent: number, prevCombatCol: number): { types: NodeType[]; lastCombatCol: number } => {
  const none = (): { types: NodeType[]; lastCombatCol: number } => {
    const t = Array.from({ length: nodeCount }, () => 'combat' as NodeType);
    return { types: t, lastCombatCol: prevCombatCol };
  };
  if (absoluteLayer === 0) return { types: ['start'], lastCombatCol: prevCombatCol };
  if (absoluteLayer === 1) return { types: ['event'], lastCombatCol: prevCombatCol };

  const cyclePos = (absoluteLayer - 2) % ACT_LENGTH;

  // cyclePos 8: pre-boss rest (boss lane, col 3)
  if (cyclePos === 8) return { types: ['combat', 'combat', 'combat', 'rest'], lastCombatCol: prevCombatCol };
  // cyclePos 9: boss (boss lane, col 3)
  if (cyclePos === 9) return { types: ['combat', 'combat', 'combat', 'boss'], lastCombatCol: prevCombatCol };
  // cyclePos 4: mid-act rest (boss lane, col 3)
  if (cyclePos === 4) return { types: ['combat', 'combat', 'combat', 'rest'], lastCombatCol: prevCombatCol };

  const isCombatLayer = (cyclePos >= 0 && cyclePos <= 3) || (cyclePos >= 5 && cyclePos <= 7);
  if (isCombatLayer) {
    // cols 0-2 = main content, col 3 = boss lane connector (combat)
    const forceShop = combatSinceShop >= 4;
    const forceEvent = combatSinceEvent >= 1;
    const r: NodeType[] = ['combat', 'combat', 'combat', 'combat'];
    let combatCol = -1;

    if (forceEvent) {
      for (let i = 0; i < 3; i++) r[i] = Math.random() < 0.85 ? 'event' : 'shop';
    } else if (forceShop) {
      for (let i = 0; i < 3; i++) r[i] = 'shop';
    } else {
      // Pick 2 of 3 cols for event/shop, 1 for combat — rotate away from prevCombatCol
      combatCol = prevCombatCol < 0 || prevCombatCol >= 3
        ? Math.floor(Math.random() * 3)
        : (prevCombatCol + 1 + Math.floor(Math.random() * 2)) % 3;
      for (let i = 0; i < 3; i++) {
        if (i === combatCol) continue;
        r[i] = Math.random() < 0.85 ? 'event' : 'shop';
      }
    }
    return { types: r, lastCombatCol: combatCol };
  }

  return none();
};

const getNodeCountForLayerV3 = (absoluteLayer: number): number => {
  if (absoluteLayer === 0 || absoluteLayer === 1) return 1;
  return 4;
};

export const getBossUnlockWinsRequired = (): number => 3;

export const getEnemyScaling = (floor: number) => ({
  hpMultiplier: 1 + floor * 0.05,
  damageBonus: Math.floor(floor * 0.03),
});

export interface PlayCardResult {
  player: Player;
  enemies: Enemy[];
  selectedEnemyId: string | null;
  turnFlags: {
    playedAttack: boolean;
    playedSkill: boolean;
    tookAttackDamage: boolean;
    cardsPlayed: number;
  };
  energyCost: number;
  victory: boolean;
}

export const resolveCardPlay = (
  state: CoreState,
  cardId: string,
  targetId: string | undefined,
  log: (message: string) => void
): PlayCardResult | null => {
  const cardIndex = state.player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return null;

  const card = state.player.hand[cardIndex];
  if (card.unplayable) {
    log(`${card.name} 是一张无法打出的牌。`);
    return null;
  }
  const newEnemies = state.enemies.map(enemy => ({
    ...enemy,
    intent: { ...enemy.intent },
    statusEffects: enemy.statusEffects.map(s => ({ ...s })),
    meta: enemy.meta ? { ...enemy.meta } : undefined
  }));
  const newPlayer: Player = {
    ...state.player,
    statusEffects: state.player.statusEffects.map(s => ({ ...s })),
    hand: [...state.player.hand],
    drawPile: [...state.player.drawPile],
    discardPile: [...state.player.discardPile],
    exhaustPile: [...state.player.exhaustPile]
  };

  const hasBossMetalPhase = newEnemies.some(enemy => enemy.behavior === 'boss_five_elements' && enemy.meta?.phase === 'metal');
  const hasBossEarthPhase = newEnemies.some(enemy => enemy.behavior === 'boss_five_elements' && enemy.meta?.phase === 'earth');

  const findTargetIndex = (id?: string) => {
    const chosenId = id || state.selectedEnemyId;
    if (chosenId) {
      const idx = newEnemies.findIndex(e => e.id === chosenId && e.currentHp > 0);
      if (idx !== -1) return idx;
    }
    return newEnemies.findIndex(e => e.currentHp > 0);
  };

  const computeCardCost = () => {
    let cost = card.cost;
    const costReduction = getStacks(newPlayer, 'cost_reduction');
    if (costReduction > 0) cost -= costReduction;
    const costAura = getStacks(newPlayer, 'cost_up');
    if (costAura > 0) cost += costAura;
    const costUp = getStacks(newPlayer, 'cost_up_next');
    if (costUp > 0) cost += 1;
    if (newEnemies.some(enemy => enemy.currentHp > 0 && enemy.behavior === 'spleen_dampness')) {
      cost += 1;
    }
    if (hasBossEarthPhase) cost += 1;
    return {
      cost: Math.max(0, cost),
      consumeCostUp: costUp > 0
    };
  };

  const { cost: baseCost, consumeCostUp } = computeCardCost();
  const effectiveCost = card.type === 'attack' ? 0 : baseCost;
  if (newPlayer.energy < effectiveCost) return null;
  if (consumeCostUp) {
    removeStatus(newPlayer, 'cost_up_next');
  }

  const turnFlags = { ...state.turnFlags };
  turnFlags.cardsPlayed += 1;
  if (card.type === 'attack') {
    turnFlags.playedAttack = true;
  }
  if (card.type === 'skill') {
    turnFlags.playedSkill = true;
  }
  const skillBonus = card.type === 'skill' ? getStacks(newPlayer, 'next_skill_bonus') : 0;
  let skillBonusConsumed = false;
  const consumeSkillBonus = () => {
    if (skillBonus <= 0 || skillBonusConsumed) return 0;
    skillBonusConsumed = true;
    removeStatus(newPlayer, 'next_skill_bonus');
    log(`党参补气触发，技能核心效果 +${skillBonus}`);
    return skillBonus;
  };

  const applyBlock = (amount: number) => {
    if (amount <= 0) return;
    let blockGain = amount + getDexterity(newPlayer);
    if (hasPassive(newPlayer, 'balanced_passive')) {
      blockGain += 1;
    }
    if (hasPassive(newPlayer, 'qi_deficiency_passive')) {
      blockGain += 2;
    }
    if (hasPassive(newPlayer, 'damp_heat_passive')) {
      blockGain -= 2;
    }
    if (hasPassive(newPlayer, 'qi_stagnation_passive')) {
      blockGain -= 1;
    }
    const dampness = getStacks(newPlayer, 'dampness_evil');
    if (dampness > 0) {
      blockGain = Math.max(0, blockGain - dampness * 2);
    }
    if (getStacks(newPlayer, 'lung_dryness') > 0) {
      blockGain = Math.floor(blockGain * 0.5);
    }
    if (getStacks(newPlayer, 'no_block') > 0) {
      blockGain = 0;
    }
    if (getStacks(newPlayer, 'double_block') > 0) {
      blockGain *= 2;
    }
    if (getStacks(newPlayer, 'formula_zhenwu_guard') > 0) {
      blockGain = Math.floor(blockGain * 1.5);
    }
    if (hasPassive(newPlayer, 'blood_stasis_passive')) {
      blockGain = Math.floor(blockGain * 0.5);
    }
    if (hasRelic(newPlayer, 'equipment_yinyang') && newPlayer.hp * 2 >= newPlayer.maxHp) {
      blockGain += countRelic(newPlayer, 'equipment_yinyang');
    }
    blockGain += getStacks(newPlayer, 'equipment_zhengqi');
    const totalGain = getStacks(newPlayer, 'block_echo') > 0 ? blockGain * 2 : blockGain;
    if (totalGain > 0) {
      gainPlayerBlock(newPlayer, totalGain);
    }
    if (blockGain > 0 && getStacks(newPlayer, 'block_to_strength') > 0) {
      addStatus(newPlayer, { id: 'temp_strength', name: '临时力量', type: 'buff', stacks: 1, canStack: true, description: '回合结束时失去', duration: 1 });
    }
  };

  const applyDamageToEnemy = (enemy: Enemy, baseDamage: number, options?: { trueDamage?: boolean; pierceAll?: boolean; pierceAmount?: number }) => {
    let dmg = baseDamage;
    if (dmg <= 0) return 0;

    const virtualHeat = getStacks(enemy, 'virtual_heat');
    if (virtualHeat > 0) {
      dmg += virtualHeat;
    }

    if (hasPassive(newPlayer, 'blood_stasis_passive') && getStacks(enemy, 'blood_stasis') > 0) {
      dmg = Math.round(dmg * 1.5);
    } else if (getStacks(enemy, 'blood_stasis') > 0) {
      dmg = Math.round(dmg * 1.25);
    }
    if (getStacks(enemy, 'vulnerable') > 0) {
      dmg = Math.round(dmg * 1.5);
      const vuln = getStatus(enemy, 'vulnerable');
      if (vuln) {
        vuln.stacks -= 1;
        if (vuln.stacks <= 0) removeStatus(enemy, 'vulnerable');
      }
    }

    if (enemy.behavior === 'yin_yang_split' && enemy.meta?.form === 'yin') {
      enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + dmg);
      log(`${enemy.name} 处于阴态，恢复 ${dmg} 点生命`);
      return -1;
    }
    if (enemy.behavior === 'yin_yang_split' && enemy.meta?.form === 'yang') {
      dmg = Math.round(dmg * 1.5);
    }

    if (!options?.trueDamage) {
      if (options?.pierceAll || (hasPassive(newPlayer, 'blood_stasis_passive') && getStacks(enemy, 'blood_stasis') > 0)) {
        enemy.block = 0;
      } else if (options?.pierceAmount) {
        enemy.block = Math.max(0, enemy.block - options.pierceAmount);
      }
      if (enemy.block >= dmg) {
        enemy.block -= dmg;
        return 0;
      }
      dmg -= enemy.block;
      enemy.block = 0;
    }

    enemy.currentHp = Math.max(0, enemy.currentHp - dmg);
    return dmg;
  };

  const applyDamageToPlayer = (baseDamage: number) => {
    let dmg = baseDamage;
    if (hasPassive(newPlayer, 'yin_deficiency_passive')) {
      dmg += 1;
    }
    const bloodStasis = getStacks(newPlayer, 'blood_stasis');
    if (bloodStasis > 0) {
      dmg += bloodStasis;
    }
    const reduceOnce = getStacks(newPlayer, 'reduce_next_damage');
    if (reduceOnce > 0) {
      dmg = Math.max(0, dmg - reduceOnce);
      removeStatus(newPlayer, 'reduce_next_damage');
    }
    if (newPlayer.block >= dmg) {
      newPlayer.block -= dmg;
      return 0;
    }
    dmg -= newPlayer.block;
    newPlayer.block = 0;
    return takePlayerHpDamage(newPlayer, dmg);
  };

  const drawCardsLocal = (count: number) => {
    drawCardsForPlayer(newPlayer, count);
  };

  const removeRandomCard = () => {
    const candidates = newPlayer.hand.filter(c => c.id !== cardId);
    if (candidates.length === 0) return;
    const randomIdx = Math.floor(Math.random() * candidates.length);
    const toDiscard = candidates[randomIdx];
    const idxInHand = newPlayer.hand.findIndex(c => c.id === toDiscard.id);
    if (idxInHand > -1) {
      newPlayer.hand.splice(idxInHand, 1);
      newPlayer.discardPile.push(toDiscard);
      log(`丢弃了 ${toDiscard.name}`);
    }
  };

  if (getStacks(newPlayer, 'block_per_card') > 0) {
    applyBlock(1);
  }

  const cardPlayPain = getStacks(newPlayer, 'card_play_damage');
  if (cardPlayPain > 0) {
    applyDamageToPlayer(cardPlayPain);
    log(`你受到气滞反噬 ${cardPlayPain} 点`);
  }
  if (hasBossMetalPhase) {
    applyDamageToPlayer(1);
    log(`五行失调（金）使你受到 1 点伤害`);
  }

  const targetIndex = findTargetIndex(targetId);
  const targetEnemy = targetIndex !== -1 ? newEnemies[targetIndex] : null;

  const applyAttackDamage = (amount: number, options?: { trueDamage?: boolean }) => {
    if (!targetEnemy) return 0;
    let dmg = amount + getStrength(newPlayer);
    if (hasPassive(newPlayer, 'balanced_passive')) {
      dmg += 1;
    }
    if (hasPassive(newPlayer, 'qi_deficiency_passive')) {
      dmg -= 1;
    }
    if (hasPassive(newPlayer, 'qi_stagnation_passive')) {
      dmg -= 1;
    }
    if (hasRelic(newPlayer, 'equipment_yinyang') && newPlayer.hp * 2 < newPlayer.maxHp) {
      dmg += countRelic(newPlayer, 'equipment_yinyang');
    }
    if (hasRelic(newPlayer, 'equipment_tianren') && getCombatRound(newPlayer) % 2 === 1) {
      dmg += countRelic(newPlayer, 'equipment_tianren');
    }
    if (getStacks(newPlayer, 'attack_buff') > 0) {
      dmg += 3;
      removeStatus(newPlayer, 'attack_buff');
      log(`[发散] 触发：额外造成3点伤害`);
    }
    if (getStacks(newPlayer, 'weak') > 0) {
      dmg = Math.floor(dmg * 0.75);
    }
    const pierceAll = getStacks(newPlayer, 'pierce_all') > 0;
    const pierceAmount = getStacks(newPlayer, 'pierce_block');
    const damageDealt = applyDamageToEnemy(targetEnemy, dmg, {
      trueDamage: options?.trueDamage,
      pierceAll,
      pierceAmount
    });
    if (damageDealt > 0) {
      log(`你对 ${targetEnemy.name} 造成了 ${damageDealt} 点伤害`);
    } else if (damageDealt === 0 && dmg > 0) {
      log(`你对 ${targetEnemy.name} 的攻击被格挡或化解`);
    }
    return damageDealt;
  };

  const applyAoeDamage = (amount: number, options?: { trueDamage?: boolean }) => {
    newEnemies.forEach(enemy => {
      if (enemy.currentHp <= 0) return;
      let dmg = amount + getStrength(newPlayer);
      if (hasPassive(newPlayer, 'balanced_passive')) {
        dmg += 1;
      }
      if (hasPassive(newPlayer, 'qi_deficiency_passive')) {
        dmg -= 1;
      }
      if (hasPassive(newPlayer, 'qi_stagnation_passive')) {
        dmg -= 1;
      }
      if (hasRelic(newPlayer, 'equipment_yinyang') && newPlayer.hp * 2 < newPlayer.maxHp) {
        dmg += countRelic(newPlayer, 'equipment_yinyang');
      }
      if (hasRelic(newPlayer, 'equipment_tianren') && getCombatRound(newPlayer) % 2 === 1) {
        dmg += countRelic(newPlayer, 'equipment_tianren');
      }
      const dealt = applyDamageToEnemy(enemy, dmg, options);
      if (dealt > 0) {
        log(`你对 ${enemy.name} 造成了 ${dealt} 点伤害`);
      }
    });
  };

  const applyDebuffToEnemy = (enemy: Enemy, status: StatusEffect) => {
    addStatus(enemy, status);
  };

  const applyBuffToPlayer = (status: StatusEffect) => {
    addStatus(newPlayer, status);
  };

    const removeEnemyBuffs = (enemy: Enemy) => {
      enemy.statusEffects = enemy.statusEffects.filter(s => s.type !== 'buff' || isConstitutionPassive(s));
    };

  const removeAllEnemyBuffs = () => {
    newEnemies.forEach(enemy => removeEnemyBuffs(enemy));
  };

  switch (card.effectId) {
    case 'draw_discard':
      drawCardsLocal(card.effectValue || 2);
      removeRandomCard();
      break;
    case 'damage_debuff_stasis':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
        applyDebuffToEnemy(targetEnemy, { id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: card.secondaryValue || 1, canStack: true, description: '受到伤害增加25%' });
        log(`施加了血瘀`);
      }
      break;
    case 'damage_conditional_stasis':
      if (targetEnemy) {
        let damage = card.effectValue || 0;
        if (getStacks(targetEnemy, 'blood_stasis') > 0) {
          damage += card.secondaryValue || 0;
        }
        applyAttackDamage(damage);
      }
      break;
    case 'damage_kill_block':
      if (targetEnemy) {
        const dealt = applyAttackDamage(card.effectValue || 0);
        if (targetEnemy.currentHp <= 0 && dealt && dealt > 0) {
          applyBlock(card.secondaryValue || 0);
          log(`击杀获得 ${card.secondaryValue} 点格挡`);
        }
      }
      break;
    case 'damage_block':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
        applyBlock(card.secondaryValue || 0);
        log(`获得 ${card.secondaryValue || 0} 点格挡`);
      }
      break;
    case 'block_cleanse_self':
      applyBlock(card.effectValue || 0);
      removeDebuffs(newPlayer, 1);
      log(`你获得了 ${card.effectValue} 点格挡并移除负面状态`);
      break;
    case 'formula_gegen_tang':
      applyBlock(card.effectValue || 8);
      removeDebuffs(newPlayer, 1);
      drawCardsLocal(card.secondaryValue || 1);
      log('葛根汤舒筋解表：获得格挡、清除负面状态并抽牌');
      break;
    case 'formula_maxing_shigan_tang':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 10);
        applyDebuffToEnemy(targetEnemy, {
          id: 'heat_evil',
          name: '热邪',
          type: 'debuff',
          stacks: card.secondaryValue || 2,
          canStack: true,
          description: '回合结束受到伤害',
        });
        log(`麻杏石甘汤清肺泄热：${targetEnemy.name} 获得热邪`);
      }
      break;
    case 'formula_xiaochaihu_tang':
      applyHealToPlayer(newPlayer, card.effectValue || 6);
      drawCardsLocal(card.secondaryValue || 2);
      removeDebuffs(newPlayer, 1);
      log('小柴胡汤和解少阳：恢复生命、抽牌并清除负面状态');
      break;
    case 'formula_lizhong_wan':
      applyHealToPlayer(newPlayer, card.effectValue || 8);
      applyBuffToPlayer({
        id: 'strength',
        name: '力量',
        type: 'buff',
        stacks: card.secondaryValue || 1,
        canStack: true,
        description: '攻击伤害提高',
      });
      log('理中丸温中补气：恢复生命并获得力量');
      break;
    case 'formula_banxia_houpu_tang':
      if (targetEnemy) {
        const shouldDraw = getStacks(targetEnemy, 'phlegm_bind') > 0 || getStacks(targetEnemy, 'dampness_evil') > 0;
        applyAttackDamage(card.effectValue || 8);
        applyDebuffToEnemy(targetEnemy, {
          id: 'weak',
          name: '虚弱',
          type: 'debuff',
          stacks: 1,
          canStack: true,
          description: '造成伤害降低25%',
          duration: card.secondaryValue || 2,
        });
        if (shouldDraw) {
          drawCardsLocal(1);
        }
        log(`半夏厚朴汤行气化痰：${targetEnemy.name} 获得虚弱`);
      }
      break;
    case 'formula_jiaotai_wan':
      applyBlock(card.effectValue || 6);
      removeDebuffs(newPlayer, 1);
      log('交泰丸交通心肾：获得格挡并清除负面状态');
      break;
    case 'formula_sijunzi_tang':
      applyHealToPlayer(newPlayer, card.effectValue || 10);
      applyBlock(card.secondaryValue || 6);
      log('四君子汤益气健脾：恢复生命并获得格挡');
      break;
    case 'formula_zhenwu_tang':
      applyBuffToPlayer({
        id: 'formula_zhenwu_guard',
        name: '真武护阳',
        type: 'buff',
        stacks: 1,
        canStack: false,
        description: '本场战斗格挡效果+50%，回合结束获得1点格挡',
      });
      log('真武汤温阳利水：本场战斗格挡效果提升');
      break;
    case 'formula_xiaoqinglong_tang':
      newEnemies.forEach(enemy => {
        if (enemy.currentHp <= 0) return;
        let dmg = (card.effectValue || 7) + getStrength(newPlayer);
        if (getStacks(enemy, 'cold_evil') > 0) {
          dmg += card.secondaryValue || 3;
        }
        if (hasPassive(newPlayer, 'balanced_passive')) dmg += 1;
        if (hasPassive(newPlayer, 'qi_deficiency_passive')) dmg -= 1;
        if (hasPassive(newPlayer, 'qi_stagnation_passive')) dmg -= 1;
        if (hasRelic(newPlayer, 'equipment_yinyang') && newPlayer.hp * 2 < newPlayer.maxHp) dmg += countRelic(newPlayer, 'equipment_yinyang');
        if (hasRelic(newPlayer, 'equipment_tianren') && getCombatRound(newPlayer) % 2 === 1) dmg += countRelic(newPlayer, 'equipment_tianren');
        const dealt = applyDamageToEnemy(enemy, dmg);
        if (dealt > 0) log(`小青龙汤对 ${enemy.name} 造成了 ${dealt} 点伤害`);
      });
      break;
    case 'formula_suanzaoren_tang':
      if (targetEnemy) {
        applyDebuffToEnemy(targetEnemy, {
          id: 'stun',
          name: '困倦',
          type: 'debuff',
          stacks: card.secondaryValue || 1,
          canStack: true,
          description: '跳过行动',
          duration: card.secondaryValue || 1,
        });
        log(`酸枣仁汤安神：${targetEnemy.name} 困倦`);
      }
      applyHealToPlayer(newPlayer, card.effectValue || 5);
      break;
    case 'formula_mahuang_tang':
      applyBuffToPlayer({
        id: 'pierce_all',
        name: '麻黄发汗',
        type: 'buff',
        stacks: 1,
        canStack: false,
        description: '本回合攻击无视格挡',
        duration: 1,
      });
      drawCardsLocal(1);
      log('麻黄汤宣肺解表：本回合攻击无视格挡并抽牌');
      break;
    case 'formula_yinqiao_san':
      applyAoeDamage(card.effectValue || 6);
      newEnemies.forEach(enemy => {
        if (enemy.currentHp <= 0) return;
        applyDebuffToEnemy(enemy, {
          id: 'heat_evil',
          name: '热邪',
          type: 'debuff',
          stacks: card.secondaryValue || 1,
          canStack: true,
          description: '回合结束受到伤害',
        });
        const buff = enemy.statusEffects.find(s => s.type === 'buff' && !isConstitutionPassive(s));
        if (buff) removeStatus(enemy, buff.id);
      });
      log('银翘散辛凉解表：群体伤害、施加热邪并清除敌方正面状态');
      break;
    case 'buff_attack':
      applyBuffToPlayer({ id: 'attack_buff', name: '发散', type: 'buff', stacks: 1, canStack: false, description: '下一次攻击伤害+3' });
      log(`下一次攻击伤害增加`);
      break;
    case 'aoe_damage_cleanse':
      applyAoeDamage(card.effectValue || 0);
      newEnemies.forEach(enemy => {
        const buff = enemy.statusEffects.find(s => s.type === 'buff');
        if (buff) removeStatus(enemy, buff.id);
      });
      log(`对所有敌人造成伤害并驱散`);
      break;
    case 'block_pierce_buff':
      applyBlock(card.effectValue || 0);
      applyBuffToPlayer({ id: 'pierce_block', name: '通络', type: 'buff', stacks: card.secondaryValue || 3, canStack: false, description: '攻击无视部分格挡', duration: 1 });
      log(`你获得了 ${card.effectValue} 点格挡和通络效果`);
      break;
    case 'debuff_weak_draw':
      if (targetEnemy) {
        applyDebuffToEnemy(targetEnemy, { id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
        log(`给予 ${targetEnemy.name} 虚弱`);
      }
      drawCardsLocal(1);
      break;
    case 'damage_draw':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
      }
      drawCardsLocal(1);
      break;
    case 'heal_draw_block':
      applyHealToPlayer(newPlayer, card.effectValue || 0);
      applyBlock(card.secondaryValue || 0);
      drawCardsLocal(2);
      log(`恢复生命，获得格挡并抽牌`);
      break;
    case 'aoe_debuff_heat':
      newEnemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
          applyDebuffToEnemy(enemy, { id: 'heat_evil', name: '热邪', type: 'debuff', stacks: card.effectValue || 1, canStack: true, description: '回合结束受到伤害' });
        }
      });
      drawCardsLocal(1);
      log(`给予所有敌人热邪`);
      break;
    case 'block':
      applyBlock(card.effectValue || 0);
      log(`你获得了 ${card.effectValue} 点格挡`);
      break;
    case 'block_draw_cleanse_damp':
      applyBlock(card.effectValue || 0);
      if (getStacks(newPlayer, 'dampness_evil') > 0) {
        removeStatus(newPlayer, 'dampness_evil');
        log(`清除了湿邪`);
      }
      drawCardsLocal(1);
      break;
    case 'danggui_effect':
      if (newPlayer.hp >= newPlayer.maxHp) {
        applyBlock(card.effectValue || 0);
        log(`你获得了 ${card.effectValue} 点格挡`);
      } else {
        const healed = applyHealToPlayer(newPlayer, card.effectValue || 0);
        log(`你恢复了 ${healed} 点生命`);
      }
      break;
    case 'revive_buff': {
      applyBuffToPlayer({ id: 'revive', name: '回阳', type: 'buff', stacks: 1, canStack: false, description: '免疫一次死亡' });
      const healAmount = Math.floor(newPlayer.maxHp * 0.2);
      const healed = applyHealToPlayer(newPlayer, healAmount);
      log(`获得免疫死亡效果，恢复 ${healed} 点生命`);
      break;
    }
    case 'mahuang_effect':
      if (targetEnemy) {
        let damage = card.effectValue || 0;
        if (getStacks(targetEnemy, 'cold_evil') > 0) {
          damage += card.secondaryValue || 0;
        }
        applyAttackDamage(damage);
      }
      break;
    case 'dahuang_effect':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
        applyDebuffToEnemy(targetEnemy, { id: 'diarrhea', name: '泄下', type: 'debuff', stacks: card.secondaryValue || 2, canStack: true, description: '回合结束失去生命' });
      }
      break;
    case 'damage_cleanse_buff':
      if (targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
        const buff = targetEnemy.statusEffects.find(s => s.type === 'buff');
        if (buff) {
          removeStatus(targetEnemy, buff.id);
          log(`驱散了 ${buff.name}`);
        }
      }
      break;
    case 'buff_yin': {
      const gain = (card.effectValue || 1) + consumeSkillBonus();
      const delta = gainYin(newPlayer, gain, log);
      if (delta > 0) {
        log(`获得 ${delta} 层滋阴`);
      }
      if (card.secondaryValue) {
        drawCardsLocal(card.secondaryValue);
      }
      break;
    }
    case 'yin_gain_exhaust': {
      const gain = (card.effectValue || 0) + consumeSkillBonus();
      const delta = gainYin(newPlayer, gain, log);
      if (delta > 0) {
        log(`获得 ${delta} 层滋阴`);
      }
      break;
    }
    case 'yin_attack_virtual_heat': {
      const gain = (card.effectValue || 1) + consumeSkillBonus();
      const delta = gainYin(newPlayer, gain, log);
      if (delta > 0) {
        log(`获得 ${delta} 层滋阴`);
      }
      applyBuffToPlayer({ id: 'attack_virtual_heat', name: '虚热引动', type: 'buff', stacks: 1, canStack: false, description: '本回合攻击附加虚热', duration: 1 });
      log(`获得滋阴并引动虚热`);
      break;
    }
    case 'yin_spend_damage_random': {
      const stacks = getStacks(newPlayer, 'yin');
      if (stacks > 0) {
        removeStatus(newPlayer, 'yin');
        for (let i = 0; i < stacks; i += 1) {
          const idx = findTargetIndex();
          if (idx === -1) break;
          const enemy = newEnemies[idx];
          applyDamageToEnemy(enemy, 3 + getStrength(newPlayer));
        }
        log(`消耗所有滋阴，对敌人造成伤害`);
      }
      break;
    }
    case 'yin_power_energy':
      applyBuffToPlayer({ id: 'yin_energy', name: '玉竹生津', type: 'buff', stacks: 1, canStack: false, description: '有滋阴时回合开始+1能量' });
      log(`获得玉竹生津`);
      break;
    case 'yin_cleanse':
      if (getStacks(newPlayer, 'yin') >= 3) {
        removeDebuffs(newPlayer);
        log(`滋阴充盈，清除所有负面状态`);
      } else {
        removeDebuffs(newPlayer, 1);
        log(`移除1个负面状态`);
      }
      break;
    case 'yin_block_scaling': {
      const total = (card.effectValue || 0) + getStacks(newPlayer, 'yin');
      applyBlock(total);
      log(`获得 ${total} 点格挡`);
      break;
    }
    case 'yin_cap_increase': {
      const gain = (card.effectValue || 1) + consumeSkillBonus();
      const delta = gainYin(newPlayer, gain, log);
      if (delta > 0) {
        log(`获得 ${delta} 层滋阴`);
      }
      applyBuffToPlayer({ id: 'yin_cap', name: '滋阴上限', type: 'buff', stacks: 2, canStack: true, description: '滋阴上限+2' });
      log(`滋阴上限提升`);
      break;
    }
    case 'yin_heal_scaling': {
      const heal = (card.effectValue || 0) + getStacks(newPlayer, 'yin');
      const healed = applyHealToPlayer(newPlayer, heal);
      log(`恢复 ${healed} 点生命`);
      break;
    }
    case 'yin_spend_double_damage':
      if (targetEnemy) {
        let dmg = card.effectValue || 0;
        if (getStacks(newPlayer, 'yin') >= 3) {
          const yinStatus = getStatus(newPlayer, 'yin');
          if (yinStatus) {
            yinStatus.stacks -= 3;
            if (yinStatus.stacks <= 0) removeStatus(newPlayer, 'yin');
          }
          dmg *= 2;
          log(`消耗 3 层滋阴，伤害翻倍`);
        }
        applyAttackDamage(dmg);
      }
      break;
    case 'block_if_no_damage_strength':
      applyBlock(card.effectValue || 0);
      if (!turnFlags.tookAttackDamage) {
        applyBuffToPlayer({ id: 'strength', name: '力量', type: 'buff', stacks: card.secondaryValue || 2, canStack: true, description: '攻击伤害提高' });
        log(`未受伤，获得力量`);
      }
      break;
    case 'heal_draw':
      applyHealToPlayer(newPlayer, card.effectValue || 0);
      drawCardsLocal(card.secondaryValue || 1);
      log(`恢复生命并抽牌`);
      break;
    case 'end_turn_heal_power':
      applyBuffToPlayer({ id: 'end_turn_heal', name: '山药平补', type: 'buff', stacks: card.effectValue || 2, canStack: true, description: '回合结束恢复生命' });
      log(`获得平补效果`);
      break;
    case 'block_next_skill_bonus':
      applyBlock(card.effectValue || 0);
      applyBuffToPlayer({ id: 'next_skill_bonus', name: '党参补气', type: 'buff', stacks: card.secondaryValue || 2, canStack: false, description: '下回合首张技能+2', duration: 2 });
      log(`下回合首张技能效果提升`);
      break;
    case 'heal_block_exhaust':
      applyHealToPlayer(newPlayer, card.effectValue || 0);
      applyBlock(card.secondaryValue || 0);
      log(`恢复生命并获得格挡`);
      break;
    case 'block_apply_vulnerable':
      applyBlock(card.effectValue || 0);
      if (targetEnemy) {
        applyDebuffToEnemy(targetEnemy, { id: 'vulnerable', name: '易伤', type: 'debuff', stacks: 1, canStack: true, description: '下次受伤增加50%' });
        log(`给予 ${targetEnemy.name} 易伤`);
      }
      break;
    case 'block_per_card':
      applyBlock(card.effectValue || 0);
      applyBuffToPlayer({ id: 'block_per_card', name: '艾叶温经', type: 'buff', stacks: 1, canStack: false, description: '本回合每出一张牌获得1格挡', duration: 1 });
      log(`本回合每出牌获得格挡`);
      break;
    case 'block_to_strength':
      applyBuffToPlayer({ id: 'block_to_strength', name: '升麻升提', type: 'buff', stacks: 1, canStack: false, description: '本回合获得格挡，获得1点临时力量。', duration: 1 });
      log('本回合获得格挡，获得临时力量');
      break;
    case 'sleep_debuff':
      if (targetEnemy) {
        applyDebuffToEnemy(targetEnemy, { id: 'stun', name: '困倦', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
        log(`使 ${targetEnemy.name} 困倦`);
      }
      break;
    case 'cleanse_damp_convert_block': {
      const dampStacks = getStacks(newPlayer, 'dampness_evil');
      if (dampStacks > 0) {
        removeStatus(newPlayer, 'dampness_evil');
        applyBlock(dampStacks * 2);
        log(`清除湿邪并获得格挡`);
      }
      break;
    }
    case 'draw_if_attack':
      drawCardsLocal(1);
      if (turnFlags.playedAttack) {
        drawCardsLocal(1);
        log(`已出攻击牌，额外抽牌`);
      }
      break;
    case 'aoe_damage_cleanse_heat':
      applyAoeDamage(card.effectValue || 0);
      newEnemies.forEach(enemy => {
        const heat = getStatus(enemy, 'heat_evil');
        if (heat) {
          heat.stacks -= 1;
          if (heat.stacks <= 0) removeStatus(enemy, 'heat_evil');
        }
      });
      log(`对所有敌人造成伤害并清除热邪`);
      break;
    case 'strength_temp':
      applyBuffToPlayer({ id: 'strength', name: '力量', type: 'buff', stacks: card.effectValue || 3, canStack: true, description: '攻击伤害提高' });
      applyBuffToPlayer({ id: 'strength_decay', name: '力量衰减', type: 'debuff', stacks: card.effectValue || 3, canStack: true, description: '回合结束失去力量', duration: 1 });
      log(`本回合力量提升`);
      break;
    case 'attack_pierce_all':
      applyBuffToPlayer({ id: 'pierce_all', name: '麻黄汤', type: 'buff', stacks: 1, canStack: false, description: '攻击无视格挡', duration: 1 });
      log(`本回合攻击无视格挡`);
      break;
    case 'heal_block':
      applyHealToPlayer(newPlayer, card.effectValue || 0);
      applyBlock(card.secondaryValue || 0);
      log(`恢复生命并获得格挡`);
      break;
    case 'cleanse_draw':
      removeDebuffs(newPlayer);
      drawCardsLocal(card.effectValue || 3);
      log(`清除负面状态并抽牌`);
      break;
    case 'yin_block':
      {
        const gain = (card.effectValue || 5) + consumeSkillBonus();
        const delta = gainYin(newPlayer, gain, log);
        if (delta > 0) {
          log(`获得 ${delta} 层滋阴`);
        }
        applyBlock(card.secondaryValue || 5);
        log(`滋阴并获得格挡`);
      }
      break;
    case 'aoe_damage_heat':
      applyAoeDamage(card.effectValue || 0);
      newEnemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
          applyDebuffToEnemy(enemy, { id: 'heat_evil', name: '热邪', type: 'debuff', stacks: card.secondaryValue || 1, canStack: true, description: '回合结束受到伤害' });
        }
      });
      log(`对所有敌人造成伤害并施加热邪`);
      break;
    case 'cleanse_enemy_buffs':
      removeAllEnemyBuffs();
      log(`清除敌人所有正面状态`);
      break;
    case 'cleanse_self_heal':
      removeDebuffs(newPlayer);
      applyHealToPlayer(newPlayer, card.effectValue || 10);
      log(`清除负面状态并恢复生命`);
      break;
    case 'true_damage':
      if (targetEnemy) {
        const dealt = applyDamageToEnemy(targetEnemy, card.effectValue || 0, { trueDamage: true });
        if (dealt > 0) log(`造成真实伤害 ${dealt}`);
      }
      break;
    case 'steal_buffs':
      if (targetEnemy) {
          const buffs = targetEnemy.statusEffects.filter(s => s.type === 'buff' && !isConstitutionPassive(s));
        removeEnemyBuffs(targetEnemy);
        buffs.forEach(buff => addStatus(newPlayer, { ...buff }));
        log(`夺取了敌人的正面状态`);
      }
      break;
    case 'double_block_buff':
      applyBuffToPlayer({ id: 'double_block', name: '真武汤', type: 'buff', stacks: 1, canStack: false, description: '格挡效果翻倍' });
      log(`格挡效果翻倍`);
      break;
    case 'percent_damage':
      if (targetEnemy) {
        const amount = Math.floor(targetEnemy.currentHp * (card.effectValue || 0.3));
        const dealt = applyDamageToEnemy(targetEnemy, amount, { trueDamage: true });
        if (dealt > 0) log(`造成 ${dealt} 点穿透伤害`);
      }
      break;
    case 'aoe_damage_cleanse_all_buffs':
      applyAoeDamage(card.effectValue || 0);
      removeAllEnemyBuffs();
      log(`对所有敌人造成伤害并清除增益`);
      break;
    case 'aoe_stun':
      newEnemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
          applyDebuffToEnemy(enemy, { id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: card.effectValue || 2 });
        }
      });
      log(`所有敌人眩晕`);
      break;
    case 'strength_dex_heal':
      applyBuffToPlayer({ id: 'strength', name: '力量', type: 'buff', stacks: card.effectValue || 3, canStack: true, description: '攻击伤害提高' });
      applyBuffToPlayer({ id: 'dexterity', name: '敏捷', type: 'buff', stacks: card.effectValue || 3, canStack: true, description: '格挡效果提高' });
      applyHealToPlayer(newPlayer, card.secondaryValue || 10);
      log(`增强力量敏捷并恢复生命`);
      break;
    case 'cleanse_heat_aoe_damage': {
      let removed = 0;
      const playerHeat = getStacks(newPlayer, 'heat_evil');
      if (playerHeat > 0) {
        removed += playerHeat;
        removeStatus(newPlayer, 'heat_evil');
      }
      newEnemies.forEach(enemy => {
        const heat = getStacks(enemy, 'heat_evil');
        if (heat > 0) {
          removed += heat;
          removeStatus(enemy, 'heat_evil');
        }
      });
      if (removed > 0) {
        applyAoeDamage(removed * 2);
        log(`清除热邪并造成伤害`);
      }
      break;
    }
    case 'draw_to_hand':
      while (newPlayer.hand.length < 5) {
        const before = newPlayer.hand.length;
        drawCardsLocal(1);
        if (newPlayer.hand.length === before) break;
      }
      log(`补充手牌`);
      break;
    case 'cost_reduction_turn':
      applyBuffToPlayer({ id: 'cost_reduction', name: '茶调散', type: 'buff', stacks: 1, canStack: false, description: '本回合卡牌消耗-1', duration: 1 });
      log(`本回合卡牌消耗减少`);
      break;
    case 'energy_max_heal':
      newPlayer.maxEnergy += card.effectValue || 1;
      newPlayer.energy = Math.min(getEffectiveMaxEnergy(newPlayer), newPlayer.energy + (card.effectValue || 1));
      applyHealToPlayer(newPlayer, card.secondaryValue || 3);
      log(`真气上限提升并恢复生命`);
      break;
    case 'cleanse_two_draw':
      removeDebuffs(newPlayer, 2);
      drawCardsLocal(1);
      log(`移除负面状态并抽牌`);
      break;
    case 'aoe_damage':
      applyAoeDamage(card.effectValue || 0);
      log(`对所有敌人造成伤害`);
      break;
    case 'block_reduce_next_damage':
      applyBlock(card.effectValue || 0);
      applyBuffToPlayer({ id: 'reduce_next_damage', name: '护心', type: 'buff', stacks: card.secondaryValue || 3, canStack: false, description: '本回合首次受伤减伤' });
      log(`本回合首次受伤减伤`);
      break;
    case 'cleanse_heat_cold':
      removeStatus(newPlayer, 'heat_evil');
      removeStatus(newPlayer, 'cold_evil');
      log(`清除寒热`);
      break;
    case 'retain_block_power':
      applyBuffToPlayer({ id: 'retain_block', name: '温针灸', type: 'buff', stacks: 1, canStack: false, description: '回合结束保留格挡' });
      log(`获得格挡保留`);
      break;
    case 'apply_weak':
      if (targetEnemy) {
        applyDebuffToEnemy(targetEnemy, { id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: card.effectValue || 2 });
        log(`给予 ${targetEnemy.name} 虚弱`);
      }
      break;
    case 'strength_dex_block':
      applyBuffToPlayer({ id: 'strength', name: '力量', type: 'buff', stacks: card.effectValue || 1, canStack: true, description: '攻击伤害提高' });
      applyBuffToPlayer({ id: 'dexterity', name: '敏捷', type: 'buff', stacks: card.effectValue || 1, canStack: true, description: '格挡效果提高' });
      applyBlock(card.secondaryValue || 5);
      log(`获得力量、敏捷与格挡`);
      break;
    case 'strength_block':
      applyBuffToPlayer({ id: 'strength', name: '力量', type: 'buff', stacks: card.effectValue || 3, canStack: true, description: '攻击伤害提高' });
      applyBlock(card.secondaryValue || 5);
      log(`获得力量与格挡`);
      break;
    case 'copy_buff_exhaust': {
      const buffs = newPlayer.statusEffects.filter(s => s.type === 'buff' && s.id !== 'copy_buff_exhaust' && !isConstitutionPassive(s));
      if (buffs.length > 0) {
        const picked = buffs[Math.floor(Math.random() * buffs.length)];
        if (picked.canStack) {
          addStatus(newPlayer, { ...picked });
        } else {
          addStatus(newPlayer, { ...picked, id: `${picked.id}_copy` });
        }
        log(`复制了 ${picked.name}`);
      }
      break;
    }
    case 'block_echo_power':
      applyBuffToPlayer({ id: 'block_echo', name: '补中益气', type: 'buff', stacks: 1, canStack: false, description: '获得格挡时再获得等量护盾' });
      log(`获得补中益气效果`);
      break;
    case 'status_enemy':
      log(`该牌仅用于敌方状态效果`);
      break;
    case 'zusanli_effect':
    case 'zusanli_power':
      applyBuffToPlayer({ id: 'zusanli', name: '足三里', type: 'buff', stacks: 1, canStack: true, description: '每层使攻击回血+1' });
      log(`获得足三里效果`);
      break;
    case 'attack_stun_chance':
      applyBuffToPlayer({ id: 'attack_stun_chance', name: '朱砂安神', type: 'buff', stacks: 1, canStack: false, description: '攻击有概率眩晕' });
      log(`获得安神效果`);
      break;
    default:
      if (card.type === 'attack' && targetEnemy) {
        applyAttackDamage(card.effectValue || 0);
      }
      break;
  }

  if (skillBonus > 0 && !skillBonusConsumed && card.type === 'skill') {
    const bonus = consumeSkillBonus();
    switch (card.effectId) {
      case 'block':
      case 'block_cleanse_self':
      case 'block_pierce_buff':
      case 'block_draw_cleanse_damp':
      case 'block_if_no_damage_strength':
      case 'block_next_skill_bonus':
      case 'block_apply_vulnerable':
      case 'block_per_card':
      case 'block_reduce_next_damage':
      case 'yin_block_scaling':
      case 'yin_block':
      case 'strength_dex_block':
      case 'strength_block':
      case 'formula_gegen_tang':
      case 'formula_jiaotai_wan':
      case 'formula_sijunzi_tang':
        applyBlock(bonus);
        break;
      case 'heal_draw':
      case 'heal_block':
      case 'heal_block_exhaust':
      case 'heal_draw_block':
      case 'yin_heal_scaling':
      case 'cleanse_self_heal':
      case 'formula_xiaochaihu_tang':
      case 'formula_lizhong_wan':
      case 'formula_suanzaoren_tang':
        applyHealToPlayer(newPlayer, bonus);
        break;
      case 'aoe_damage_cleanse':
      case 'aoe_damage_cleanse_heat':
      case 'aoe_damage_heat':
      case 'aoe_damage':
      case 'cleanse_heat_aoe_damage':
      case 'formula_xiaoqinglong_tang':
      case 'formula_yinqiao_san':
        applyAoeDamage(bonus);
        break;
      case 'buff_yin':
      case 'yin_gain_exhaust':
      case 'yin_attack_virtual_heat':
      case 'yin_cap_increase':
        gainYin(newPlayer, bonus, log);
        break;
      case 'aoe_debuff_heat':
        newEnemies.forEach(enemy => {
          if (enemy.currentHp > 0) {
            applyDebuffToEnemy(enemy, {
              id: 'heat_evil',
              name: '热邪',
              type: 'debuff',
              stacks: bonus,
              canStack: true,
              description: '回合结束受到伤害'
            });
          }
        });
        break;
      case 'sleep_debuff':
      case 'apply_weak':
        if (targetEnemy) {
          applyDebuffToEnemy(targetEnemy, {
            id: card.effectId === 'sleep_debuff' ? 'stun' : 'weak',
            name: card.effectId === 'sleep_debuff' ? '困倦' : '虚弱',
            type: 'debuff',
            stacks: bonus,
            canStack: true,
            description: card.effectId === 'sleep_debuff' ? '跳过行动' : '造成伤害降低25%',
            duration: card.effectId === 'sleep_debuff' ? bonus : Math.max(2, bonus)
          });
        }
        break;
      default:
        break;
    }
  }

  if (card.type === 'attack' && targetEnemy && getStacks(newPlayer, 'attack_virtual_heat') > 0) {
    applyDebuffToEnemy(targetEnemy, { id: 'virtual_heat', name: '虚热', type: 'debuff', stacks: 1, canStack: true, description: '受到额外伤害' });
  }
  if (card.type === 'attack' && targetEnemy && hasPassive(newPlayer, 'damp_heat_passive')) {
    applyDebuffToEnemy(targetEnemy, { id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 1, canStack: true, description: '回合结束受到伤害' });
    if (!state.turnFlags.playedAttack) {
      newEnemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
          applyDebuffToEnemy(enemy, { id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 1, canStack: true, description: '回合结束受到伤害' });
        }
      });
      log('[湿热质] 湿热外蒸：所有敌人获得1层热邪');
    }
  }
  if (card.type === 'attack' && targetEnemy && hasPassive(newPlayer, 'blood_stasis_passive')) {
    applyDebuffToEnemy(targetEnemy, { id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '受到伤害增加25%' });
  }
  if (card.type === 'skill' && hasPassive(newPlayer, 'phlegm_dampness_passive')) {
    const bindTarget = targetEnemy ?? newEnemies.find(enemy => enemy.currentHp > 0) ?? null;
    if (bindTarget) {
      applyDebuffToEnemy(bindTarget, {
        id: 'phlegm_bind',
        name: '痰湿禁锢',
        type: 'debuff',
        stacks: 1,
        canStack: true,
        description: '每层攻击-1，受到伤害+1；3层时眩晕并虚弱',
      });
      const bind = getStatus(bindTarget, 'phlegm_bind');
      if (bind && bind.stacks >= 3) {
        removeStatus(bindTarget, 'phlegm_bind');
        applyDebuffToEnemy(bindTarget, { id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
        applyDebuffToEnemy(bindTarget, { id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
        log(`[痰湿质] 痰湿禁锢触发，${bindTarget.name} 被眩晕并虚弱`);
      }
    }
  }
  if (card.type === 'skill' && hasPassive(newPlayer, 'qi_stagnation_passive') && !state.turnFlags.playedSkill) {
    drawCardsLocal(1);
    log('[气郁质] 气机流转：额外抽1张牌');
  }
  if (card.type === 'skill' && hasRelic(newPlayer, 'equipment_jingluo') && !state.turnFlags.playedSkill) {
    gainPlayerBlock(newPlayer, 2 * countRelic(newPlayer, 'equipment_jingluo'));
    log('[经络学说] 经络通行：获得2点格挡');
  }
  if (card.type === 'attack' && targetEnemy && getStacks(newPlayer, 'attack_stun_chance') > 0) {
    if (Math.random() < 0.25) {
      applyDebuffToEnemy(targetEnemy, { id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
      log(`朱砂安神触发，${targetEnemy.name} 眩晕`);
    }
  }

  if (card.type === 'attack' && hasPassive(newPlayer, 'qi_deficiency_passive')) {
    applyHealToPlayer(newPlayer, 1);
    log(`[气虚质] 固表续航：恢复1点生命`);
  }
  const zusanliStacks = getStacks(newPlayer, 'zusanli');
  if (card.type === 'attack' && zusanliStacks > 0) {
    const healed = applyHealToPlayer(newPlayer, zusanliStacks);
    log(`[足三里] 触发：恢复${healed}点生命`);
  }

  const playedIdx = newPlayer.hand.findIndex(c => c.id === cardId);
  if (playedIdx > -1) {
    newPlayer.hand.splice(playedIdx, 1);
  }

  if (card.exhaust) {
    newPlayer.exhaustPile.push(card);
  } else {
    newPlayer.discardPile.push(card);
  }

  const aliveEnemies = newEnemies.filter(e => e.currentHp > 0);
  const nextSelectedEnemyId = state.selectedEnemyId && aliveEnemies.some(e => e.id === state.selectedEnemyId)
    ? state.selectedEnemyId
    : aliveEnemies[0]?.id || null;

  return {
    player: newPlayer,
    enemies: newEnemies,
    selectedEnemyId: nextSelectedEnemyId,
    turnFlags,
    energyCost: effectiveCost,
    victory: aliveEnemies.length === 0
  };
};

export interface PlayerEndTurnResult {
  player: Player;
  enemies: Enemy[];
  turnFlags: {
    playedAttack: boolean;
    playedSkill: boolean;
    tookAttackDamage: boolean;
    cardsPlayed: number;
  };
}

export const resolvePlayerEndTurn = (
  state: CoreState,
  log: (message: string) => void
): PlayerEndTurnResult | null => {
  const newPlayer: Player = {
    ...state.player,
    statusEffects: state.player.statusEffects.map(s => ({ ...s })),
    hand: state.player.hand.map(c => ({ ...c })),
    discardPile: [...state.player.discardPile]
  };
  const newEnemies = state.enemies.map(enemy => ({
    ...enemy,
    statusEffects: enemy.statusEffects.map(s => ({ ...s })),
    meta: enemy.meta ? { ...enemy.meta } : undefined
  }));

  const heatStacks = getStacks(newPlayer, 'heat_evil');
  if (heatStacks > 0) {
    const dealt = takePlayerHpDamage(newPlayer, heatStacks);
    log(`你受到热邪伤害 ${dealt} 点`);
  }
  const firePhaseActive = newEnemies.some(enemy => enemy.behavior === 'boss_five_elements' && enemy.meta?.phase === 'fire');
  if (firePhaseActive && heatStacks > 0) {
    const dealt = takePlayerHpDamage(newPlayer, heatStacks);
    log(`五行失调（火）引发灼伤 ${dealt} 点`);
  }
  const reruyingxueCount = newEnemies.filter(enemy => enemy.behavior === 'reruyingxue' && enemy.currentHp > 0).length;
  if (reruyingxueCount > 0 && heatStacks > 0) {
    const scorchDamage = heatStacks * reruyingxueCount;
    const dealt = takePlayerHpDamage(newPlayer, scorchDamage);
    log(`热入营血追袭：额外灼伤 ${dealt} 点`);
  }
  const endTurnHeal = getStacks(newPlayer, 'end_turn_heal');
  if (endTurnHeal > 0) {
    const healed = applyHealToPlayer(newPlayer, endTurnHeal);
    log(`山药平补恢复 ${healed} 点生命`);
  }
  if (getStacks(newPlayer, 'formula_zhenwu_guard') > 0) {
    gainPlayerBlock(newPlayer, 1);
    log('真武护阳：获得1点格挡');
  }
  const strengthDecay = getStacks(newPlayer, 'strength_decay');
  if (strengthDecay > 0) {
    const strengthStatus = getStatus(newPlayer, 'strength');
    if (strengthStatus) {
      strengthStatus.stacks = Math.max(0, strengthStatus.stacks - strengthDecay);
      if (strengthStatus.stacks === 0) removeStatus(newPlayer, 'strength');
    }
    removeStatus(newPlayer, 'strength_decay');
  }
  if (getStacks(newPlayer, 'remove_block_end') > 0) {
    newPlayer.block = 0;
    log(`阳明腑实：护盾被清除`);
  }
  if (hasRelic(newPlayer, 'equipment_zangxiang')) {
    addStatus(newPlayer, {
      id: 'zangfu_essence',
      name: '脏腑精气',
      type: 'buff',
      stacks: 1,
      canStack: true,
      description: '满3层时恢复生命',
    });
    const essence = getStatus(newPlayer, 'zangfu_essence');
    if (essence && essence.stacks >= 3) {
      essence.stacks -= 3;
      if (essence.stacks <= 0) removeStatus(newPlayer, 'zangfu_essence');
      const healed = applyHealToPlayer(newPlayer, 4);
      log(`[藏象学说] 脏腑精气充盈：恢复${healed}点生命`);
    }
  }

  decayStacks(newPlayer, ['heat_evil', 'cold_evil', 'dampness_evil', 'blood_stasis', 'virtual_heat', 'diarrhea']);
  decrementDurations(newPlayer);

  return {
    player: newPlayer,
    enemies: newEnemies,
    turnFlags: {
      playedAttack: false,
      playedSkill: false,
      tookAttackDamage: false,
      cardsPlayed: 0
    }
  };
};

export interface EnemyTurnActionResult {
  enemyId: string;
  intent: EnemyIntent;
  player: Player;
  enemies: Enemy[];
  selectedEnemyId: string | null;
  impactKind: 'hp' | 'block' | 'mixed' | null;
}

export interface EnemyTurnResult {
  player: Player;
  enemies: Enemy[];
  combatTurn: number;
  turnFlags: {
    playedAttack: boolean;
    playedSkill: boolean;
    tookAttackDamage: boolean;
    cardsPlayed: number;
  };
  selectedEnemyId: string | null;
  victory: boolean;
  phase?: GamePhase;
  actions: EnemyTurnActionResult[];
}

const clonePlayerState = (player: Player): Player => ({
  ...player,
  statusEffects: player.statusEffects.map(status => ({ ...status })),
  deck: [...player.deck],
  hand: [...player.hand],
  discardPile: [...player.discardPile],
  drawPile: [...player.drawPile],
  exhaustPile: [...player.exhaustPile],
  relics: [...player.relics],
  potions: [...player.potions],
});

const cloneEnemyState = (enemy: Enemy): Enemy => ({
  ...enemy,
  intent: { ...enemy.intent },
  statusEffects: enemy.statusEffects.map(status => ({ ...status })),
  meta: enemy.meta ? { ...enemy.meta } : undefined,
});

const cloneEnemyStateList = (enemies: Enemy[]) => enemies.map(cloneEnemyState);

const createEnemyFromTemplate = (enemyId: keyof typeof ENEMIES, overrides: Partial<Enemy> = {}): Enemy => {
  const template = cloneEnemyState(ENEMIES[enemyId]);
  return {
    ...template,
    ...overrides,
    intent: overrides.intent ? { ...overrides.intent } : template.intent,
    statusEffects: overrides.statusEffects
      ? overrides.statusEffects.map(status => ({ ...status }))
      : template.statusEffects,
    meta: overrides.meta ? { ...overrides.meta } : template.meta ? { ...template.meta } : undefined,
  };
};

const MAX_ALIVE_ENEMIES_ON_FIELD = 2;

const getAliveEnemyCount = (enemies: Enemy[]) => enemies.filter(enemy => enemy.currentHp > 0).length;

const canSummonEnemy = (enemies: Enemy[]) => getAliveEnemyCount(enemies) < MAX_ALIVE_ENEMIES_ON_FIELD;

const applyDamageToPlayer = (
  player: Player,
  baseDamage: number,
  turnFlags: TurnFlags,
  log: (message: string) => void
): number => {
  let dmg = baseDamage;
  if (hasPassive(player, 'yin_deficiency_passive')) {
    dmg += 1;
  }
  if (hasPassive(player, 'qi_stagnation_passive') && !turnFlags.tookAttackDamage) {
    dmg = Math.max(0, dmg - 4);
    log('[气郁质] 闪转腾挪：本次伤害减少4点');
  }
  const bloodStasis = getStacks(player, 'blood_stasis');
  if (bloodStasis > 0) {
    dmg += bloodStasis;
  }
  const reduceOnce = getStacks(player, 'reduce_next_damage');
  if (reduceOnce > 0) {
    dmg = Math.max(0, dmg - reduceOnce);
    removeStatus(player, 'reduce_next_damage');
  }
  if (player.block >= dmg) {
    player.block -= dmg;
    return 0;
  }
  dmg -= player.block;
  player.block = 0;
  const dealt = takePlayerHpDamage(player, dmg);
  if (dealt > 0) {
    turnFlags.tookAttackDamage = true;
  }
  if (dealt > 0 && hasRelic(player, 'equipment_zhengxie')) {
    const current = getStacks(player, 'equipment_zhengqi');
    if (current < 3) {
      addStatus(player, {
        id: 'equipment_zhengqi',
        name: '正气',
        type: 'buff',
        stacks: 1,
        canStack: true,
        description: '每层使格挡获得+1，最多3层',
      });
      const status = getStatus(player, 'equipment_zhengqi');
      if (status && status.stacks > 3) status.stacks = 3;
      log('[正邪相争] 正气被激发，格挡收益提高');
    }
  }
  return dealt;
};

const applyDebuffToPlayer = (player: Player, status: StatusEffect): void => {
  addStatus(player, status);
};

export const resolveEnemyTurn = (
  state: CoreState,
  log: (message: string) => void
): EnemyTurnResult | null => {
  const nextTurnFlags = { ...state.turnFlags };
  const actions: EnemyTurnActionResult[] = [];
  let newPlayer = clonePlayerState(state.player);
  let newEnemies = cloneEnemyStateList(state.enemies);

  const tryRevive = () => {
    if (newPlayer.hp > 0) return true;
    if (getStacks(newPlayer, 'revive') > 0) {
      removeStatus(newPlayer, 'revive');
      const heal = Math.max(1, Math.floor(newPlayer.maxHp * 0.3));
      newPlayer.hp = heal;
      log(`回阳触发，恢复 ${heal} 点生命`);
      return true;
    }
    return false;
  };

  const getPlayerImpactKind = (beforePlayer: Player, afterPlayer: Player) => {
    const hpLost = Math.max(0, beforePlayer.hp - afterPlayer.hp);
    const blockLost = Math.max(0, beforePlayer.block - afterPlayer.block);
    if (hpLost > 0 && blockLost > 0) return 'mixed' as const;
    if (hpLost > 0) return 'hp' as const;
    if (blockLost > 0) return 'block' as const;
    return null;
  };

  const getSelectedEnemyId = () => newEnemies.find(enemy => enemy.currentHp > 0)?.id ?? null;

  if (!tryRevive()) {
    return {
      player: newPlayer,
      enemies: newEnemies,
      combatTurn: 1,
      turnFlags: state.turnFlags,
      selectedEnemyId: state.selectedEnemyId,
      victory: false,
      phase: 'game_over',
      actions,
    };
  }

  const damageToPlayer = (baseDamage: number) =>
    applyDamageToPlayer(newPlayer, baseDamage, nextTurnFlags, log);

  const debuffPlayer = (status: StatusEffect) =>
    applyDebuffToPlayer(newPlayer, status);

  const buildContext = (): EnemyActionContext => ({
    player: newPlayer,
    enemies: newEnemies,
    turnFlags: nextTurnFlags,
    log,
    currentAct: state.currentAct,
    getStacks,
    getStatus,
    addStatus,
    removeStatus,
    removeBuffs,
    hasPassive,
    getStrength,
    canSummonEnemy,
    createEnemyFromTemplate,
    applyDamageToPlayer: damageToPlayer,
    applyDebuffToPlayer: debuffPlayer,
  });

  for (let enemyIndex = 0; enemyIndex < newEnemies.length; enemyIndex += 1) {
    const enemy = newEnemies[enemyIndex];
    if (!enemy || enemy.currentHp <= 0) continue;

    const heat = getStacks(enemy, 'heat_evil');
    if (heat > 0) {
      enemy.currentHp = Math.max(0, enemy.currentHp - heat);
    }
    const diarrhea = getStacks(enemy, 'diarrhea');
    if (diarrhea > 0) {
      enemy.currentHp = Math.max(0, enemy.currentHp - diarrhea);
    }
    if (enemy.currentHp <= 0) continue;

    if (getStacks(enemy, 'stun') > 0) {
      decrementDurations(enemy);
      log(`${enemy.name} 眩晕，跳过行动`);
      continue;
    }

    const strategy = getEnemyStrategy(enemy.behavior ?? '');
    const ctx = buildContext();

    strategy.onTurnStart?.(enemy, ctx);

    const primaryIntent = strategy.getPrimaryIntent(enemy, ctx);
    const plannedIntents = [primaryIntent];
    const totalActions = getEnemyActionCount(enemy, state.currentAct);
    if (totalActions > 1 && strategy.getFollowUpIntent) {
      const followUp = strategy.getFollowUpIntent(enemy, primaryIntent, ctx);
      if (followUp) {
        plannedIntents.push(followUp);
      }
    }

    for (const intent of plannedIntents) {
      if (enemy.currentHp <= 0 || newPlayer.hp <= 0) break;
      enemy.intent = intent;
      const beforePlayer = clonePlayerState(newPlayer);
      strategy.executeIntent(enemy, intent, ctx);

      actions.push({
        enemyId: enemy.id,
        intent,
        player: clonePlayerState(newPlayer),
        enemies: cloneEnemyStateList(newEnemies),
        selectedEnemyId: getSelectedEnemyId(),
        impactKind: getPlayerImpactKind(beforePlayer, newPlayer),
      });

      if (!tryRevive()) {
        return {
          player: newPlayer,
          enemies: newEnemies,
          combatTurn: 1,
          turnFlags: nextTurnFlags,
          selectedEnemyId: state.selectedEnemyId,
          victory: false,
          phase: 'game_over',
          actions,
        };
      }
    }

    decrementDurations(enemy);
    decayStacks(enemy, ['heat_evil', 'cold_evil', 'dampness_evil', 'blood_stasis', 'virtual_heat', 'diarrhea']);
  }

  const aliveEnemies = newEnemies.filter(enemy => enemy.currentHp > 0);
  if (aliveEnemies.length === 0) {
    return {
      player: newPlayer,
      enemies: newEnemies,
      combatTurn: 0,
          turnFlags: {
            playedAttack: false,
            playedSkill: false,
            tookAttackDamage: false,
            cardsPlayed: 0,
          },
      selectedEnemyId: null,
      victory: true,
      actions,
    };
  }

  if (!tryRevive()) {
    return {
      player: newPlayer,
      enemies: newEnemies,
      combatTurn: 1,
      turnFlags: nextTurnFlags,
      selectedEnemyId: state.selectedEnemyId,
      victory: false,
      phase: 'game_over',
      actions,
    };
  }

  if (getStacks(newPlayer, 'retain_block') === 0) {
    newPlayer.block = 0;
  }

  addStatus(newPlayer, {
    id: 'combat_round',
    name: '战斗回合',
    type: 'buff',
    stacks: 1,
    canStack: true,
    description: '记录当前玩家回合数',
    hidden: true,
  });

  newPlayer.energy = getEffectiveMaxEnergy(newPlayer);
  if (hasPassive(newPlayer, 'yin_deficiency_passive')) {
    newPlayer.energy += 1;
    log('[阴虚火旺] 触发：能量 +1');
  }
  if (hasPassive(newPlayer, 'yang_deficiency_passive')) {
    addStatus(newPlayer, {
      id: 'warm_yang',
      name: '温阳',
      type: 'buff',
      stacks: 1,
      canStack: true,
      description: '达到3层时爆发群体伤害',
    });
    const warmStartCount = getStacks(newPlayer, 'warm_yang_start_count');
    if (warmStartCount < 2) {
      newPlayer.energy = Math.max(0, newPlayer.energy - 1);
      log('[阳虚质] 启动缓慢：真气 -1');
    }
    addStatus(newPlayer, {
      id: 'warm_yang_start_count',
      name: '温阳启动',
      type: 'buff',
      stacks: 1,
      canStack: true,
      description: '记录阳虚质前期启动回合',
    });
    const warmYang = getStatus(newPlayer, 'warm_yang');
    if (warmYang && warmYang.stacks >= 3) {
      warmYang.stacks -= 3;
      if (warmYang.stacks <= 0) removeStatus(newPlayer, 'warm_yang');
      newEnemies.forEach(enemy => {
        if (enemy.currentHp <= 0) return;
        enemy.currentHp = Math.max(0, enemy.currentHp - 12);
        log(`[阳虚质] 温阳爆发对 ${enemy.name} 造成 12 点伤害`);
      });
    }
  }
  if (getStacks(newPlayer, 'yin_energy') > 0 && getStacks(newPlayer, 'yin') > 0) {
    newPlayer.energy += 1;
    log('[玉竹生津] 触发：能量 +1');
  }
  if (hasRelic(newPlayer, 'equipment_bianzheng')) {
    if (newPlayer.hp * 2 <= newPlayer.maxHp) {
      const healed = applyHealToPlayer(newPlayer, 2);
      log(`[辨证论治] 低血择治：恢复${healed}点生命`);
    } else if (newPlayer.block <= 0) {
      gainPlayerBlock(newPlayer, 3);
      log('[辨证论治] 固护择治：获得3点格挡');
    } else {
      addStatus(newPlayer, {
        id: 'temp_strength',
        name: '临时力量',
        type: 'buff',
        stacks: 1,
        canStack: true,
        description: '回合结束时失去',
        duration: 1,
      });
      log('[辨证论治] 攻势择治：获得1点临时力量');
    }
  }
  if (hasRelic(newPlayer, 'equipment_tianren') && getCombatRound(newPlayer) % 2 === 0) {
    const healed = applyHealToPlayer(newPlayer, 2 * countRelic(newPlayer, 'equipment_tianren'));
    log(`[天人相应] 偶数回合调息：恢复${healed}点生命`);
  }
  if (hasRelic(newPlayer, 'equipment_qiji')) {
    const beforeDebuffs = newPlayer.statusEffects.filter(status => status.type === 'debuff' && !isConstitutionPassive(status)).length;
    removeDebuffs(newPlayer, 1);
    const afterDebuffs = newPlayer.statusEffects.filter(status => status.type === 'debuff' && !isConstitutionPassive(status)).length;
    if (afterDebuffs < beforeDebuffs) {
      const healed = applyHealToPlayer(newPlayer, 1);
      log(`[气机升降] 清除负面状态并恢复${healed}点生命`);
    }
  }
  if (hasPassive(newPlayer, 'special_diathesis_passive')) {
    const roll = Math.floor(Math.random() * 6);
    switch (roll) {
      case 1:
        newPlayer.energy += 1;
        log('[特禀质] 先天禀赋：真气 +1');
        break;
      case 2: {
        const before = newPlayer.hand.length;
        drawCardsForPlayer(newPlayer, 1);
        if (newPlayer.hand.length > before) log('[特禀质] 先天禀赋：抽1张牌');
        break;
      }
      case 3:
        gainPlayerBlock(newPlayer, 5);
        log('[特禀质] 先天禀赋：获得5点格挡');
        break;
      case 4: {
        const healed = applyHealToPlayer(newPlayer, 4);
        log(`[特禀质] 先天禀赋：恢复${healed}点生命`);
        break;
      }
      case 5:
        addStatus(newPlayer, {
          id: 'temp_strength',
          name: '临时力量',
          type: 'buff',
          stacks: 2,
          canStack: true,
          description: '回合结束时失去',
          duration: 1,
        });
        log('[特禀质] 先天禀赋：获得2点临时力量');
        break;
      default:
        log('[特禀质] 先天禀赋：本回合未触发');
        break;
    }
  }

  const maxEnergyDown = getStacks(newPlayer, 'max_energy_down');
  if (maxEnergyDown > 0) {
    newPlayer.maxEnergy = Math.max(1, newPlayer.maxEnergy - maxEnergyDown);
    newPlayer.energy = Math.min(newPlayer.energy, newPlayer.maxEnergy);
    removeStatus(newPlayer, 'max_energy_down');
  }

  if (getStacks(newPlayer, 'stun') > 0) {
    if (hasRelic(newPlayer, 'equipment_yinyang') && getStacks(newPlayer, 'equipment_yinyang_stun_immunity_used') === 0) {
      removeStatus(newPlayer, 'stun');
      addStatus(newPlayer, {
        id: 'equipment_yinyang_stun_immunity_used',
        name: '阴阳免疫已用',
        type: 'buff',
        stacks: 1,
        canStack: false,
        description: '本场战斗已免疫过一次眩晕',
        hidden: true,
      });
      log('[阴阳学说] 阴阳调衡：免疫本场第一次眩晕');
    } else {
      removeStatus(newPlayer, 'stun');
      log('你被眩晕，跳过回合');
      return {
        player: newPlayer,
        enemies: newEnemies,
        combatTurn: 1,
        turnFlags: {
          playedAttack: false,
          playedSkill: false,
          tookAttackDamage: false,
          cardsPlayed: 0,
        },
        selectedEnemyId: aliveEnemies[0]?.id || null,
        victory: false,
        actions,
      };
    }
  }

  return {
    player: newPlayer,
    enemies: newEnemies,
    combatTurn: 0,
    turnFlags: nextTurnFlags,
    selectedEnemyId: aliveEnemies[0]?.id || null,
    victory: false,
    actions,
  };
};
