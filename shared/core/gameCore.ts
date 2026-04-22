import { Card, Enemy, EnemyIntent, GamePhase, MapLayer, MapNode, NodeType, Player, StatusEffect } from '../baseTypes';

export interface TurnFlags {
  playedAttack: boolean;
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
};

export const INITIAL_TURN_FLAGS: TurnFlags = {
  playedAttack: false,
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

const applyHealToPlayer = (player: Player, amount: number) => {
  if (amount <= 0) return 0;
  let heal = amount;
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
  const yinCap = getYinCap(player);
  const current = getStacks(player, 'yin');
  const capped = clamp(current + amount, 0, yinCap);
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
    return;
  }
  entity.statusEffects.push({ ...status });
};

const removeStatus = (entity: { statusEffects: StatusEffect[] }, id: string) => {
  entity.statusEffects = entity.statusEffects.filter(s => s.id !== id);
};

const removeDebuffs = (entity: { statusEffects: StatusEffect[] }, count?: number) => {
  if (!count) {
    entity.statusEffects = entity.statusEffects.filter(s => s.type !== 'debuff');
    return;
  }
  let remaining = count;
  entity.statusEffects = entity.statusEffects.filter(s => {
    if (remaining > 0 && s.type === 'debuff') {
      remaining -= 1;
      return false;
    }
    return true;
  });
};

const removeBuffs = (entity: { statusEffects: StatusEffect[] }) => {
  entity.statusEffects = entity.statusEffects.filter(s => s.type !== 'buff');
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
  4: [16, 38, 62, 84],
  5: [12, 31, 50, 69, 88],
};

const jitterX = (value: number, amount = 2.5) => clamp(value + (Math.random() * amount * 2 - amount), 10, 90);

const weightedNodeType = (weights: Array<[NodeType, number]>): NodeType => {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return weights[weights.length - 1][0];
};

const getNodeCountForLayer = (layerIndex: number, layers: number) => {
  if (layerIndex === 0 || layerIndex === layers - 1) return 1;
  if (layers === 8) {
    switch (layerIndex) {
      case 1:
        return Math.random() < 0.45 ? 2 : 3;
      case 2:
        return Math.random() < 0.35 ? 2 : Math.random() < 0.8 ? 3 : 4;
      case 3:
        return Math.random() < 0.3 ? 2 : Math.random() < 0.78 ? 3 : 4;
      case 4:
        return Math.random() < 0.45 ? 3 : 4;
      case 5:
        return 1;
      case 6:
        return Math.random() < 0.55 ? 2 : 3;
      default:
        return 3;
    }
  }
  if (layerIndex === Math.floor(layers * 0.7)) return 1;
  if (layerIndex === 1 || layerIndex === layers - 2) return Math.random() < 0.5 ? 2 : 3;
  return Math.random() < 0.55 ? 3 : 4;
};

const getNodeTypeForLayer = (layerIndex: number, layers: number, nodeIndex: number, nodeCount: number): NodeType => {
  if (layerIndex === 0) return 'start';
  if (layerIndex === layers - 1) return 'boss';
  if (layers === 8) {
    if (layerIndex === 1) return 'combat';
    if (layerIndex === 5) return 'chest';
    if (layerIndex === 4) {
      const eliteSlots = nodeCount >= 4 ? [1, nodeCount - 2] : [Math.floor(nodeCount / 2)];
      if (eliteSlots.includes(nodeIndex)) return 'elite';
      if (nodeIndex === 0) return 'combat';
      if (nodeIndex === nodeCount - 1) return 'rest';
      return 'event';
    }
    if (layerIndex === 6) {
      return nodeIndex === 0 ? 'rest' : nodeIndex === nodeCount - 1 ? 'combat' : 'event';
    }
    if (layerIndex === 3) {
      return weightedNodeType([
        ['combat', 40],
        ['event', 24],
        ['shop', 18],
        ['rest', 18],
      ]);
    }
    if (layerIndex === 2) {
      return weightedNodeType([
        ['combat', 58],
        ['event', 18],
        ['shop', 12],
        ['rest', 12],
      ]);
    }
  }
  if (layerIndex === Math.floor(layers * 0.7)) return 'chest';
  if (layerIndex === Math.floor(layers * 0.55)) {
    const eliteSlots = nodeCount >= 4 ? [1, nodeCount - 2] : [Math.floor(nodeCount / 2)];
    if (eliteSlots.includes(nodeIndex)) return 'elite';
    return nodeIndex === 0 ? 'combat' : nodeIndex === nodeCount - 1 ? 'rest' : 'event';
  }
  if (layerIndex === layers - 2) {
    return nodeIndex === 0 ? 'rest' : nodeIndex === nodeCount - 1 ? 'combat' : 'event';
  }

  return weightedNodeType([
    ['combat', 48],
    ['event', 18],
    ['rest', 16],
    ['shop', 12],
    ['combat', 6],
  ]);
};

const createNode = (layerIndex: number, nodeIndex: number, layers: number, nodeCount: number): MapNode => {
  const preset = MAP_X_PRESETS[nodeCount] ?? MAP_X_PRESETS[3];
  const baseX = preset[nodeIndex] ?? 50;
  const fixedNode =
    layerIndex === 0 ||
    layerIndex === layers - 1 ||
    (layers === 8 ? layerIndex === 5 : layerIndex === Math.floor(layers * 0.7));

  return {
    id: `node_${layerIndex}_${nodeIndex}`,
    type: getNodeTypeForLayer(layerIndex, layers, nodeIndex, nodeCount),
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

const closestNodeIndex = (nodes: MapNode[], x: number) =>
  nodes.reduce(
    (best, node, index) => {
      const distance = Math.abs(node.x - x);
      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;

// Helper to generate map with branches
export function generateMap(layers: number): MapLayer[] {
  const safeLayers = Math.max(layers, 8);
  const map: MapLayer[] = [];

  for (let layerIndex = 0; layerIndex < safeLayers; layerIndex += 1) {
    const nodeCount = getNodeCountForLayer(layerIndex, safeLayers);
    const nodes = Array.from({ length: nodeCount }, (_, nodeIndex) => createNode(layerIndex, nodeIndex, safeLayers, nodeCount));
    map.push({ nodes });
  }

  for (let layerIndex = 0; layerIndex < safeLayers - 1; layerIndex += 1) {
    const currentLayer = map[layerIndex].nodes;
    const nextLayer = map[layerIndex + 1].nodes;

    currentLayer.forEach((node, nodeIndex) => {
      const baseTarget =
        currentLayer.length === 1
          ? Math.floor((nextLayer.length - 1) / 2)
          : Math.round((nodeIndex / (currentLayer.length - 1)) * (nextLayer.length - 1));

      const targetIndexes = new Set<number>([baseTarget]);
      const canBranch = nextLayer.length > 1 && node.type !== 'boss' && (layerIndex === 0 || Math.random() < 0.48);

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
        connectNodes(node, nextLayer[closestNodeIndex(nextLayer, node.x)]);
      }
    });

    nextLayer.forEach((node) => {
      if (node.parents.length === 0) {
        connectNodes(currentLayer[closestNodeIndex(currentLayer, node.x)], node);
      }
    });
  }

  return map;
}

export interface PlayCardResult {
  player: Player;
  enemies: Enemy[];
  selectedEnemyId: string | null;
  turnFlags: {
    playedAttack: boolean;
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

  const { cost: effectiveCost, consumeCostUp } = computeCardCost();
  if (newPlayer.energy < effectiveCost) return null;
  if (consumeCostUp) {
    removeStatus(newPlayer, 'cost_up_next');
  }

  const turnFlags = { ...state.turnFlags };
  turnFlags.cardsPlayed += 1;
  if (card.type === 'attack') {
    turnFlags.playedAttack = true;
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
    const totalGain = getStacks(newPlayer, 'block_echo') > 0 ? blockGain * 2 : blockGain;
    if (totalGain > 0) {
      newPlayer.block += totalGain;
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

    if (getStacks(enemy, 'blood_stasis') > 0) {
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
      if (options?.pierceAll) {
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
    if (getStacks(newPlayer, 'yin_deficiency_passive') > 0) {
      dmg += 2;
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
    newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
    return dmg;
  };

  const drawCardsLocal = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      if (newPlayer.hand.length >= 10) break;
      if (newPlayer.drawPile.length === 0) {
        if (newPlayer.discardPile.length === 0) break;
        newPlayer.drawPile = [...newPlayer.discardPile].sort(() => Math.random() - 0.5);
        newPlayer.discardPile = [];
      }
      const cardDrawn = newPlayer.drawPile.pop();
      if (cardDrawn) newPlayer.hand.push(cardDrawn);
    }
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
      const dmg = amount + getStrength(newPlayer);
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
    enemy.statusEffects = enemy.statusEffects.filter(s => s.type !== 'buff');
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
    case 'block_cleanse_self':
      applyBlock(card.effectValue || 0);
      removeDebuffs(newPlayer, 1);
      log(`你获得了 ${card.effectValue} 点格挡并移除负面状态`);
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
        const buffs = targetEnemy.statusEffects.filter(s => s.type === 'buff');
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
      const buffs = newPlayer.statusEffects.filter(s => s.type === 'buff' && s.id !== 'copy_buff_exhaust');
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
      applyBuffToPlayer({ id: 'zusanli', name: '足三里', type: 'buff', stacks: 1, canStack: false, description: '攻击回血+1' });
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
        applyBlock(bonus);
        break;
      case 'heal_draw':
      case 'heal_block':
      case 'heal_block_exhaust':
      case 'heal_draw_block':
      case 'yin_heal_scaling':
      case 'cleanse_self_heal':
        applyHealToPlayer(newPlayer, bonus);
        break;
      case 'aoe_damage_cleanse':
      case 'aoe_damage_cleanse_heat':
      case 'aoe_damage_heat':
      case 'aoe_damage':
      case 'cleanse_heat_aoe_damage':
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
  if (card.type === 'attack' && targetEnemy && getStacks(newPlayer, 'attack_stun_chance') > 0) {
    if (Math.random() < 0.25) {
      applyDebuffToEnemy(targetEnemy, { id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
      log(`朱砂安神触发，${targetEnemy.name} 眩晕`);
    }
  }

  if (card.type === 'attack' && getStacks(newPlayer, 'qi_deficiency_passive') > 0) {
    newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 1);
    log(`[气虚血瘀] 触发：恢复1点生命`);
  }
  if (card.type === 'attack' && getStacks(newPlayer, 'zusanli') > 0) {
    newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + 1);
    log(`[足三里] 触发：恢复1点生命`);
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
    hand: [],
    discardPile: [...state.player.discardPile, ...state.player.hand]
  };
  const newEnemies = state.enemies.map(enemy => ({
    ...enemy,
    statusEffects: enemy.statusEffects.map(s => ({ ...s })),
    meta: enemy.meta ? { ...enemy.meta } : undefined
  }));

  const heatStacks = getStacks(newPlayer, 'heat_evil');
  if (heatStacks > 0) {
    newPlayer.hp = Math.max(0, newPlayer.hp - heatStacks);
    log(`你受到热邪伤害 ${heatStacks} 点`);
  }
  const firePhaseActive = newEnemies.some(enemy => enemy.behavior === 'boss_five_elements' && enemy.meta?.phase === 'fire');
  if (firePhaseActive && heatStacks > 0) {
    newPlayer.hp = Math.max(0, newPlayer.hp - heatStacks);
    log(`五行失调（火）引发灼伤 ${heatStacks} 点`);
  }
  const reruyingxueCount = newEnemies.filter(enemy => enemy.behavior === 'reruyingxue' && enemy.currentHp > 0).length;
  if (reruyingxueCount > 0 && heatStacks > 0) {
    const scorchDamage = heatStacks * reruyingxueCount;
    newPlayer.hp = Math.max(0, newPlayer.hp - scorchDamage);
    log(`热入营血追袭：额外灼伤 ${scorchDamage} 点`);
  }
  const endTurnHeal = getStacks(newPlayer, 'end_turn_heal');
  if (endTurnHeal > 0) {
    newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + endTurnHeal);
    log(`山药平补恢复 ${endTurnHeal} 点生命`);
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

  decayStacks(newPlayer, ['heat_evil', 'cold_evil', 'dampness_evil', 'blood_stasis', 'virtual_heat', 'diarrhea']);
  decrementDurations(newPlayer);

  return {
    player: newPlayer,
    enemies: newEnemies,
    turnFlags: {
      playedAttack: false,
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
  statusEffects: enemy.statusEffects.map(status => ({ ...status })),
  meta: enemy.meta ? { ...enemy.meta } : undefined,
});

const cloneEnemyStateList = (enemies: Enemy[]) => enemies.map(cloneEnemyState);

const getEnemyRank = (enemy: Enemy): 'common' | 'elite' | 'boss' => {
  if (enemy.behavior?.startsWith('boss_') || enemy.id.includes('boss')) return 'boss';
  if (['external_combination', 'phlegm_stasis', 'jueyin_complex'].includes(enemy.behavior ?? enemy.id)) return 'elite';
  return 'common';
};

const getEnemyActionCount = (enemy: Enemy, currentAct: number) => {
  const rank = getEnemyRank(enemy);
  if (rank !== 'common') return 2;
  if (currentAct <= 1) return 1;
  if (currentAct === 2) return Math.random() < 0.65 ? 2 : 1;
  return 2;
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

  const applyDamageToPlayer = (baseDamage: number) => {
    let dmg = baseDamage;
    if (getStacks(newPlayer, 'yin_deficiency_passive') > 0) {
      dmg += 2;
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
    newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
    if (dmg > 0) {
      nextTurnFlags.tookAttackDamage = true;
    }
    return dmg;
  };

  const applyDebuffToPlayer = (status: StatusEffect) => {
    addStatus(newPlayer, status);
  };

  const getNextIntent = (enemy: Enemy): EnemyIntent => {
    const roll = Math.random();
    switch (enemy.behavior) {
      case 'wind_cold_guest':
        return roll < 0.68
          ? { type: 'attack', value: 7, description: '寒邪侵袭' }
          : { type: 'debuff', value: 0, description: '风寒束表' };
      case 'wind_heat_attack':
        return roll < 0.62
          ? { type: 'attack', value: 4, hits: 2, description: '热邪连袭' }
          : { type: 'debuff', value: 0, description: '热邪灼络' };
      case 'damp_turbidity':
        return roll < 0.55
          ? { type: 'attack', value: 6, description: '湿浊侵身' }
          : { type: 'debuff', value: 0, description: '湿邪困脾' };
      case 'external_combination': {
        const form = enemy.meta?.form || 'cold';
        if (form === 'cold') {
          return roll < 0.42
            ? { type: 'attack', value: 9, description: '寒邪裹体' }
            : { type: 'debuff', value: 0, description: '风寒束表' };
        }
        return roll < 0.4
          ? { type: 'debuff', value: 0, description: '热邪蒸腾' }
          : { type: 'attack', value: 5 + getStacks(enemy, 'heat_evil'), hits: 2, description: '热邪连袭' };
      }
      case 'boss_wind_cold': {
        const turn = enemy.meta?.turn || 0;
        const phaseTwo = enemy.currentHp / enemy.maxHp < 0.5;
        if (phaseTwo && turn % 3 === 2) {
          return { type: 'special', value: 0, description: '寒凝血瘀' };
        }
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '风寒束表' }
          : { type: 'attack', value: phaseTwo ? 16 : 13, description: '寒邪侵袭' };
      }
      case 'boss_liver_fire': {
        const heatGrowth = getStacks(enemy, 'fire_growth');
        const phaseTwo = enemy.currentHp / enemy.maxHp < 0.5;
        const turn = enemy.meta?.turn || 0;
        if (phaseTwo && turn % 3 === 2) {
          return { type: 'special', value: 0, description: '火旺伤阴' };
        }
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '热邪炽盛' }
          : { type: 'attack', value: 9 + heatGrowth, hits: phaseTwo ? 2 : 1, description: '肝火灼袭' };
      }
      case 'qi_blood_stasis': {
        const turn = enemy.meta?.turn || 0;
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '气滞血瘀' }
          : { type: 'attack', value: 10, description: '郁阻作痛' };
      }
      case 'spleen_dampness':
        return roll < 0.32
          ? { type: 'attack', value: 8, description: '湿浊压身' }
          : roll < 0.72
            ? { type: 'defend', value: 10, description: '脾虚护体' }
            : { type: 'debuff', value: 0, description: '湿困中焦' };
      case 'heart_kidney_gap':
        return roll < 0.72
          ? { type: 'debuff', value: 0, description: '心悸不安' }
          : { type: 'attack', value: 8, description: '神乱冲心' };
      case 'tanmengxinqiao': {
        const turn = enemy.meta?.turn || 0;
        const playerAlreadyControlled =
          getStacks(newPlayer, 'stun') > 0 || getStacks(newPlayer, 'draw_down') > 0 || getStacks(newPlayer, 'no_block') > 0;
        if (playerAlreadyControlled && turn % 2 === 1) {
          return { type: 'attack', value: 10, description: '窍闭冲击' };
        }
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '痰蒙心窍' }
          : { type: 'attack', value: 9, description: '窍闭失神' };
      }
      case 'phlegm_stasis':
        return roll < 0.5
          ? { type: 'attack', value: 12, description: '痰瘀互结' }
          : { type: 'defend', value: 14, description: '痰凝护体' };
      case 'boss_spleen_damp': {
        const turn = enemy.meta?.turn || 0;
        const phaseTwo = enemy.currentHp / enemy.maxHp < 0.4;
        if (turn > 0 && turn % 2 === 0) {
          return { type: 'special', value: 0, description: '水湿不运' };
        }
        if (phaseTwo && getStacks(enemy, 'dampness_evil') > 0 && turn % 3 === 1) {
          return { type: 'special', value: 0, description: '化热' };
        }
        return turn % 2 === 1
          ? { type: 'debuff', value: 0, description: '湿困中焦' }
          : { type: 'attack', value: 14, description: '湿浊扑袭' };
      }
      case 'yin_yang_split': {
        const form = enemy.meta?.form || 'yin';
        return form === 'yin'
          ? { type: 'defend', value: 8, description: '阴守' }
          : { type: 'attack', value: 11, description: '阳攻' };
      }
      case 'chong_ren_instability':
        return roll < 0.7
          ? { type: 'debuff', value: 0, description: '冲任不固' }
          : { type: 'attack', value: 9, description: '逆乱冲袭' };
      case 'reruyingxue': {
        const turn = enemy.meta?.turn || 0;
        const playerHeat = getStacks(newPlayer, 'heat_evil');
        if (turn % 2 === 0 || playerHeat < 2) {
          return { type: 'debuff', value: 0, description: '热入营血' };
        }
        return { type: 'attack', value: 10 + Math.min(4, playerHeat), description: '营热灼袭' };
      }
      case 'shenbunaqi': {
        const turn = enemy.meta?.turn || 0;
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '肾不纳气' }
          : { type: 'attack', value: 11, description: '纳气失司' };
      }
      case 'yangmingfushi': {
        const turn = enemy.meta?.turn || 0;
        if (newPlayer.block > 0 && turn % 2 === 0) {
          return { type: 'special', value: 0, description: '阳明腑实' };
        }
        return { type: 'attack', value: 13, description: '腑实压顶' };
      }
      case 'jueyin_complex': {
        const turn = enemy.meta?.turn || 0;
        return turn % 2 === 0
          ? { type: 'debuff', value: 0, description: '寒邪+虚弱' }
          : { type: 'debuff', value: 0, description: '热邪+易伤' };
      }
      case 'boss_five_elements': {
        const phase = enemy.meta?.phase || 'wood';
        if (phase === 'wood') return { type: 'attack', value: 7, hits: 2, description: '风木摇动' };
        if (phase === 'fire') return { type: 'debuff', value: 0, description: '热入营血' };
        if (phase === 'earth') return { type: 'debuff', value: 0, description: '湿浊中阻' };
        if (phase === 'metal') return { type: 'special', value: 0, description: '燥邪伤肺' };
        return { type: 'special', value: 0, description: '寒水泛溢' };
      }
      case 'damp_minion':
        return roll < 0.65
          ? { type: 'debuff', value: 0, description: '湿邪侵体' }
          : { type: 'attack', value: 5, description: '浊气扑袭' };
      default:
        return Math.random() > 0.5
          ? { type: 'attack', value: 7, description: '攻击' }
          : { type: 'defend', value: 5, description: '格挡' };
    }
  };
  const getFollowUpIntent = (enemy: Enemy, primary: EnemyIntent): EnemyIntent => {
    switch (enemy.behavior) {
      case 'wind_cold_guest':
        return primary.type === 'attack'
          ? { type: 'debuff', value: 0, description: '风寒束表' }
          : { type: 'attack', value: 6, description: '寒邪追袭' };
      case 'wind_heat_attack':
        return primary.type === 'attack'
          ? { type: 'debuff', value: 0, description: '热邪灼络' }
          : { type: 'attack', value: 4, hits: 2, description: '火毒追击' };
      case 'damp_turbidity':
        return primary.type === 'attack'
          ? { type: 'debuff', value: 0, description: '湿邪困脾' }
          : { type: 'defend', value: 6, description: '浊气护体' };
      case 'external_combination':
        return primary.type === 'attack'
          ? { type: 'debuff', value: 0, description: enemy.meta?.form === 'cold' ? '风寒束表' : '热邪蒸腾' }
          : {
              type: 'attack',
              value: enemy.meta?.form === 'cold' ? 8 : 4 + getStacks(enemy, 'heat_evil'),
              hits: enemy.meta?.form === 'cold' ? 1 : 2,
              description: enemy.meta?.form === 'cold' ? '寒袭追打' : '热邪连袭',
            };
      case 'boss_wind_cold':
        return primary.type === 'special'
          ? { type: 'attack', value: enemy.currentHp / enemy.maxHp < 0.5 ? 15 : 13, description: '寒邪崩压' }
          : primary.type === 'attack'
            ? { type: 'debuff', value: 0, description: '风寒束表' }
            : { type: 'attack', value: enemy.currentHp / enemy.maxHp < 0.5 ? 15 : 13, description: '寒邪侵袭' };
      case 'boss_liver_fire':
        return primary.type === 'special'
          ? { type: 'attack', value: 10 + getStacks(enemy, 'fire_growth'), hits: enemy.currentHp / enemy.maxHp < 0.5 ? 2 : 1, description: '火势追袭' }
          : primary.type === 'attack'
            ? { type: 'debuff', value: 0, description: '热邪炽盛' }
            : { type: 'attack', value: 10 + getStacks(enemy, 'fire_growth'), hits: enemy.currentHp / enemy.maxHp < 0.5 ? 2 : 1, description: '肝火灼袭' };
      case 'qi_blood_stasis':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 10, description: '瘀阻重击' }
          : { type: 'debuff', value: 0, description: '气滞血瘀' };
      case 'spleen_dampness':
        if (primary.type === 'defend') return { type: 'attack', value: 8, description: '湿浊压身' };
        if (primary.type === 'attack') return { type: 'debuff', value: 0, description: '湿困中焦' };
        return { type: 'attack', value: 8, description: '浊气扑压' };
      case 'heart_kidney_gap':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 8, description: '心肾失衡' }
          : { type: 'debuff', value: 0, description: '心悸不安' };
      case 'tanmengxinqiao':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 9, description: '迷窍冲心' }
          : { type: 'debuff', value: 0, description: '迷窍封格' };
      case 'phlegm_stasis':
        return primary.type === 'defend'
          ? { type: 'attack', value: 11, description: '痰瘀镇压' }
          : { type: 'defend', value: 12, description: '痰凝护体' };
      case 'boss_spleen_damp':
        return primary.description === '化热'
          ? { type: 'attack', value: 15, description: '湿热压顶' }
          : primary.type === 'attack'
            ? { type: 'debuff', value: 0, description: '湿困中焦' }
            : { type: 'attack', value: 14, description: '湿浊扑袭' };
      case 'yin_yang_split':
        return primary.type === 'defend'
          ? { type: 'attack', value: 9, description: '阳袭' }
          : { type: 'defend', value: 7, description: '阴守' };
      case 'chong_ren_instability':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 9, description: '逆乱冲袭' }
          : { type: 'debuff', value: 0, description: '冲任不固' };
      case 'reruyingxue':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 8 + Math.min(3, getStacks(newPlayer, 'heat_evil')), description: '营热追袭' }
          : { type: 'debuff', value: 0, description: '热入营血' };
      case 'shenbunaqi':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 10, description: '逆气冲胸' }
          : { type: 'debuff', value: 0, description: '肾不纳气' };
      case 'yangmingfushi':
        return primary.type === 'special'
          ? { type: 'attack', value: 12, description: '腑实追压' }
          : newPlayer.block > 0
            ? { type: 'special', value: 0, description: '阳明腑实' }
            : { type: 'attack', value: 11, description: '燥结逼压' };
      case 'jueyin_complex':
        return { type: 'attack', value: 12, description: '厥阴交错' };
      case 'boss_five_elements': {
        const phase = enemy.meta?.phase || 'wood';
        if (phase === 'wood') return { type: 'debuff', value: 0, description: '木郁乘土' };
        if (phase === 'fire') return { type: 'attack', value: 12, description: '火势焚袭' };
        if (phase === 'earth') return { type: 'attack', value: 11, description: '湿土镇压' };
        if (phase === 'metal') return { type: 'attack', value: 10, hits: 2, description: '金风肃杀' };
        return { type: 'debuff', value: 0, description: '寒水逼压' };
      }
      case 'damp_minion':
        return primary.type === 'debuff'
          ? { type: 'attack', value: 4, description: '浊气扑袭' }
          : { type: 'debuff', value: 0, description: '湿邪侵体' };
      default:
        return primary.type === 'attack'
          ? { type: 'defend', value: 4, description: '格挡' }
          : { type: 'attack', value: 6, description: '攻击' };
    }
  };

  const executeEnemyIntent = (enemy: Enemy, intent: EnemyIntent) => {
    if (intent.type === 'attack') {
      const hits = intent.hits || 1;
      for (let i = 0; i < hits; i += 1) {
        let dmg = (intent.value || 0) + getStrength(enemy);
        if (getStacks(enemy, 'weak') > 0) {
          dmg = Math.floor(dmg * 0.75);
        }
        const dealt = applyDamageToPlayer(dmg);
        log(`${enemy.name} 攻击了你，造成 ${dealt} 点伤害`);
      }
      return;
    }
    if (intent.type === 'defend') {
      enemy.block += intent.value || 0;
      log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
      return;
    }
    if (intent.type === 'special') {
      switch (enemy.behavior) {
        case 'boss_wind_cold': {
          const coldStacks = getStacks(newPlayer, 'cold_evil');
          if (coldStacks >= 3) {
            const coldStatus = getStatus(newPlayer, 'cold_evil');
            if (coldStatus) {
              coldStatus.stacks -= 3;
              if (coldStatus.stacks <= 0) removeStatus(newPlayer, 'cold_evil');
            }
            applyDebuffToPlayer({ id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '受到伤害增加' });
            log('寒凝血瘀：3 层寒邪转化为 1 层血瘀');
          } else {
            applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 2, canStack: true, description: '寒邪缠身' });
            log('风寒束表进一步加深寒邪');
          }
          break;
        }
        case 'boss_liver_fire': {
          const yin = getStatus(newPlayer, 'yin');
          if (yin && yin.stacks > 0) {
            yin.stacks -= 1;
            if (yin.stacks <= 0) removeStatus(newPlayer, 'yin');
            log('火旺伤阴：你失去了 1 层滋阴');
          } else {
            applyDebuffToPlayer({
              id: 'no_yin_gain',
              name: '伤阴',
              type: 'debuff',
              stacks: 1,
              canStack: false,
              description: '下回合无法获得滋阴',
              duration: 1,
            });
            log('火旺伤阴：下回合无法获得滋阴');
          }
          break;
        }
        case 'boss_spleen_damp': {
          if (intent.description === '水湿不运') {
            log('脾虚湿困：召来水湿小怪');
          } else {
            const damp = Math.max(1, getStacks(enemy, 'dampness_evil'));
            removeStatus(enemy, 'dampness_evil');
            applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: damp, canStack: true, description: '回合结束受到伤害' });
            log(`化热：将 ${damp} 层湿邪转化为热邪压向玩家`);
          }
          break;
        }
        case 'boss_five_elements': {
          const phase = enemy.meta?.phase || 'wood';
          if (phase === 'metal') {
            applyDebuffToPlayer({
              id: 'lung_dryness',
              name: '燥邪伤肺',
              type: 'debuff',
              stacks: 1,
              canStack: true,
              description: '治疗与格挡效果下降',
              duration: 2,
            });
            log('燥邪伤肺：你的治疗与格挡效果下降');
          } else if (phase === 'water') {
            applyDebuffToPlayer({
              id: 'energy_drain',
              name: '肾不纳气',
              type: 'debuff',
              stacks: 1,
              canStack: true,
              description: '真气上限降低',
              duration: 2,
            });
            applyDebuffToPlayer({
              id: 'max_energy_down',
              name: '寒水泛溢',
              type: 'debuff',
              stacks: 1,
              canStack: true,
              description: '下回合真气上限 -1',
              duration: 1,
            });
            log('寒水泛溢：你的真气被偷取');
          }
          break;
        }
        case 'yangmingfushi': {
          const clearedBlock = newPlayer.block;
          if (clearedBlock > 0) {
            newPlayer.block = 0;
            log(`阳明腑实：清空了 ${clearedBlock} 点格挡`);
          } else {
            log('阳明腑实：逼压防线，回合末格挡仍会被清空');
          }
          applyDebuffToPlayer({
            id: 'remove_block_end',
            name: '阳明腑实',
            type: 'debuff',
            stacks: 1,
            canStack: false,
            description: '回合结束时清空格挡',
            duration: 1,
          });
          break;
        }
        default:
          break;
      }
      return;
    }
    if (intent.type === 'debuff') {
      switch (enemy.behavior) {
        case 'wind_cold_guest':
          applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
          applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
          log('风寒束表：你被寒邪侵袭');
          break;
        case 'wind_heat_attack':
          applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
          log('热邪灼络：你被热邪灼伤');
          break;
        case 'damp_turbidity':
          applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
          log('湿邪困脾：你的格挡效率下降');
          break;
        case 'external_combination':
          if ((enemy.meta?.form || 'cold') === 'cold') {
            applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
            applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
            log('外感合病（风寒态）：施加寒邪与虚弱');
          } else {
            applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
            log('外感合病（风热态）：热邪蒸腾');
          }
          break;
        case 'spleen_dampness':
          applyDebuffToPlayer({ id: 'cost_up', name: '脾虚湿困', type: 'debuff', stacks: 1, canStack: true, description: '卡牌消耗增加', duration: 3 });
          applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
          log('湿困中焦：卡牌消耗增加');
          break;
        case 'heart_kidney_gap':
          if (Math.random() < 0.5) {
            applyDebuffToPlayer({ id: 'draw_down', name: '心悸不安', type: 'debuff', stacks: 1, canStack: true, description: '下回合少抽牌', duration: 1 });
            applyDebuffToPlayer({ id: 'no_block', name: '心肾不交', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
            log('心悸不安：下回合抽牌减少');
          } else {
            applyDebuffToPlayer({ id: 'stun', name: '痰蒙心窍', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
            applyDebuffToPlayer({ id: 'no_block', name: '心肾不交', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
            log('痰蒙心窍：你被眩晕');
          }
          break;
        case 'tanmengxinqiao':
          if (getStacks(newPlayer, 'draw_down') > 0 || getStacks(newPlayer, 'no_block') > 0) {
            applyDebuffToPlayer({ id: 'stun', name: '痰蒙心窍', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
            log('痰蒙心窍：你被迷窍眩晕');
          } else {
            applyDebuffToPlayer({ id: 'draw_down', name: '神志昏蒙', type: 'debuff', stacks: 1, canStack: true, description: '下回合少抽牌', duration: 1 });
            applyDebuffToPlayer({ id: 'no_block', name: '窍闭失固', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
            log('痰蒙心窍：下回合少抽且无法获得格挡');
          }
          break;
        case 'qi_blood_stasis':
          applyDebuffToPlayer({ id: 'cost_up_next', name: '气滞', type: 'debuff', stacks: 1, canStack: false, description: '下一张卡牌消耗 +1' });
          applyDebuffToPlayer({ id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '受到伤害增加' });
          log('气滞血瘀：你被施加负面状态');
          break;
        case 'boss_wind_cold':
          applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 2, canStack: true, description: '寒邪缠身' });
          applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
          log('风寒束表：寒邪侵体');
          break;
        case 'boss_liver_fire':
          applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
          log('肝火炽盛：热邪侵身');
          break;
        case 'boss_spleen_damp':
          applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 2, canStack: true, description: '格挡获得降低' });
          applyDebuffToPlayer({ id: 'max_energy_down', name: '真气受阻', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
          log('湿困中焦：真气受阻');
          break;
        case 'chong_ren_instability':
          removeBuffs(newPlayer);
          log('冲任不固：失去所有正面状态');
          break;
        case 'reruyingxue':
          applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
          log('热入营血：热邪进一步深入营血');
          break;
        case 'shenbunaqi':
          applyDebuffToPlayer({ id: 'energy_drain', name: '肾不纳气', type: 'debuff', stacks: 1, canStack: true, description: '真气上限降低', duration: 2 });
          applyDebuffToPlayer({ id: 'max_energy_down', name: '纳气失司', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
          applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
          applyDebuffToPlayer({ id: 'weak', name: '气虚失摄', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 1 });
          log('肾不纳气：真气受抑，寒邪与虚弱同时侵袭');
          break;
        case 'jueyin_complex': {
          const turn = enemy.meta?.turn || 0;
          if (turn % 2 === 0) {
            applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
            applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
          } else {
            applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 1, canStack: true, description: '回合结束受到伤害' });
            applyDebuffToPlayer({ id: 'vulnerable', name: '易伤', type: 'debuff', stacks: 1, canStack: true, description: '下次受伤增加50%' });
          }
          log('寒热错杂侵袭');
          break;
        }
        case 'boss_five_elements': {
          const phase = enemy.meta?.phase || 'wood';
          if (phase === 'fire') {
            applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
            log('热入营血：热邪加深');
          } else if (phase === 'earth') {
            applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
            enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + 6);
            addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '可转化为热邪' });
            log('湿浊中阻：湿邪缠身');
          } else if (phase === 'water') {
            applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
            applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
            applyDebuffToPlayer({ id: 'max_energy_down', name: '肾不纳气', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
            log('寒水泛溢：真气受阻');
          } else if (phase === 'wood') {
            applyDebuffToPlayer({ id: 'weak', name: '木郁', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 1 });
            log('木郁乘土：攻势被压制');
          }
          break;
        }
        case 'damp_minion':
          applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
          log('湿邪侵体');
          break;
        default:
          break;
      }
    }
  };

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

    if (enemy.behavior === 'external_combination') {
      const formTurns = enemy.meta?.formTurns ?? 3;
      if (formTurns <= 0) {
        const nextForm = enemy.meta?.form === 'cold' ? 'heat' : 'cold';
        enemy.meta = { ...(enemy.meta || {}), form: nextForm, formTurns: 3 };
        enemy.statusEffects = [];
        log(`外感合病切换为${nextForm === 'cold' ? '风寒态' : '风热态'}`);
      } else {
        enemy.meta = { ...(enemy.meta || {}), formTurns: formTurns - 1 };
      }
    }

    if (
      enemy.behavior === 'boss_wind_cold' ||
      enemy.behavior === 'boss_liver_fire' ||
      enemy.behavior === 'qi_blood_stasis' ||
      enemy.behavior === 'tanmengxinqiao' ||
      enemy.behavior === 'reruyingxue' ||
      enemy.behavior === 'shenbunaqi' ||
      enemy.behavior === 'yangmingfushi'
    ) {
      enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
    }

    if (enemy.behavior === 'boss_liver_fire') {
      addStatus(enemy, { id: 'fire_growth', name: '肝火势', type: 'buff', stacks: 1, canStack: true, description: '攻击力提高' });
    }

    if (enemy.behavior === 'phlegm_stasis') {
      if (getStacks(newPlayer, 'dampness_evil') > 0) {
        enemy.block += 4;
      }
      if (getStacks(newPlayer, 'blood_stasis') > 0) {
        addStatus(enemy, { id: 'strength', name: '力量', type: 'buff', stacks: 1, canStack: true, description: '攻击伤害提高' });
      }
    }

    if (enemy.behavior === 'boss_five_elements') {
      const hpRatio = enemy.currentHp / enemy.maxHp;
      const phases = ['wood', 'fire', 'earth', 'metal', 'water'];
      const currentPhase = enemy.meta?.phase || 'wood';
      const currentIndex = phases.indexOf(currentPhase);
      const thresholdPhase = phases[Math.min(4, Math.floor((1 - hpRatio) / 0.2))];
      const phaseTurn = (enemy.meta?.phaseTurn || 0) + 1;
      const shouldRotateByTurn = phaseTurn >= 3;
      const nextPhase = thresholdPhase !== currentPhase
        ? thresholdPhase
        : shouldRotateByTurn
          ? phases[(currentIndex + 1 + phases.length) % phases.length]
          : currentPhase;
      if (enemy.meta?.phase !== nextPhase) {
        enemy.meta = { ...(enemy.meta || {}), phase: nextPhase, phaseTurn: 0 };
        enemy.statusEffects = [];
        log(`五行失调切换到${nextPhase}阶段`);
      } else {
        enemy.meta = { ...(enemy.meta || {}), phase: nextPhase, phaseTurn };
      }
      if (nextPhase === 'wood') {
        addStatus(enemy, { id: 'strength', name: '木势', type: 'buff', stacks: 2, canStack: true, description: '攻击力提高' });
      } else if (nextPhase === 'earth') {
        addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '湿郁化热' });
      }
    }

    if (enemy.behavior === 'boss_spleen_damp') {
      const turn = (enemy.meta?.turn || 0) + 1;
      enemy.meta = { ...(enemy.meta || {}), turn };
      if (turn % 2 === 0) {
        const minions = newEnemies.filter(entry => entry.behavior === 'damp_minion' && entry.currentHp > 0);
        if (minions.length < 2) {
          newEnemies.push({
            id: `damp_minion_${Date.now()}_${enemyIndex}`,
            name: '水湿小怪',
            maxHp: 20,
            currentHp: 20,
            block: 0,
            statusEffects: [],
            intent: { type: 'debuff', value: 0, description: '湿邪侵体' },
            behavior: 'damp_minion',
            meta: {},
          });
        }
      }
      addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '化热前积蓄湿邪' });
    }

    if (enemy.behavior === 'yin_yang_split') {
      const form = enemy.meta?.form === 'yang' ? 'yin' : 'yang';
      enemy.meta = { ...(enemy.meta || {}), form };
    }

    if (enemy.behavior === 'jueyin_complex') {
      const turn = (enemy.meta?.turn || 0) + 1;
      enemy.meta = { ...(enemy.meta || {}), turn };
    }

    const primaryIntent = getNextIntent(enemy);
    const plannedIntents = [primaryIntent];
    const totalActions = getEnemyActionCount(enemy, state.currentAct);
    if (totalActions > 1) {
      plannedIntents.push(getFollowUpIntent(enemy, primaryIntent));
    }

    for (const intent of plannedIntents) {
      if (enemy.currentHp <= 0 || newPlayer.hp <= 0) break;
      enemy.intent = intent;
      const beforePlayer = clonePlayerState(newPlayer);
      executeEnemyIntent(enemy, intent);

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

  newPlayer.energy = getEffectiveMaxEnergy(newPlayer);
  if (getStacks(newPlayer, 'yin_deficiency_passive') > 0) {
    newPlayer.energy += 1;
    log('[阴虚火旺] 触发：能量 +1');
  }
  if (getStacks(newPlayer, 'yin_energy') > 0 && getStacks(newPlayer, 'yin') > 0) {
    newPlayer.energy += 1;
    log('[玉竹生津] 触发：能量 +1');
  }

  const maxEnergyDown = getStacks(newPlayer, 'max_energy_down');
  if (maxEnergyDown > 0) {
    newPlayer.maxEnergy = Math.max(1, newPlayer.maxEnergy - maxEnergyDown);
    newPlayer.energy = Math.min(newPlayer.energy, newPlayer.maxEnergy);
    removeStatus(newPlayer, 'max_energy_down');
  }

  if (getStacks(newPlayer, 'stun') > 0) {
    removeStatus(newPlayer, 'stun');
    log('你被眩晕，跳过回合');
    return {
      player: newPlayer,
      enemies: newEnemies,
      combatTurn: 1,
      turnFlags: {
        playedAttack: false,
        tookAttackDamage: false,
        cardsPlayed: 0,
      },
      selectedEnemyId: aliveEnemies[0]?.id || null,
      victory: false,
      actions,
    };
  }

  if (getStacks(newPlayer, 'retain_block') === 0) {
    newPlayer.block = 0;
  }

  const drawDown = getStacks(newPlayer, 'draw_down');
  const drawCount = Math.max(0, 5 - drawDown);
  if (drawDown > 0) {
    removeStatus(newPlayer, 'draw_down');
  }
  for (let i = 0; i < drawCount; i += 1) {
    if (newPlayer.hand.length >= 10) break;
    if (newPlayer.drawPile.length === 0) {
      if (newPlayer.discardPile.length === 0) break;
      newPlayer.drawPile = [...newPlayer.discardPile].sort(() => Math.random() - 0.5);
      newPlayer.discardPile = [];
    }
    const drawn = newPlayer.drawPile.pop();
    if (drawn) newPlayer.hand.push(drawn);
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
