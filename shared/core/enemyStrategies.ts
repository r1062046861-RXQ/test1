import type { Enemy, EnemyIntent, Player, StatusEffect } from '../baseTypes';

export interface EnemyActionContext {
  player: Player;
  enemies: Enemy[];
  turnFlags: { playedAttack: boolean; playedSkill: boolean; tookAttackDamage: boolean; cardsPlayed: number };
  log: (message: string) => void;
  currentAct: number;
  getStacks: (entity: { statusEffects: StatusEffect[] }, id: string) => number;
  getStatus: (entity: { statusEffects: StatusEffect[] }, id: string) => StatusEffect | undefined;
  addStatus: (entity: { statusEffects: StatusEffect[] }, status: StatusEffect) => void;
  removeStatus: (entity: { statusEffects: StatusEffect[] }, id: string) => void;
  removeBuffs: (entity: { statusEffects: StatusEffect[] }) => void;
  hasPassive: (entity: { statusEffects: StatusEffect[] }, id: string) => boolean;
  getStrength: (entity: { statusEffects: StatusEffect[] }) => number;
  canSummonEnemy: (enemies: Enemy[]) => boolean;
  createEnemyFromTemplate: (enemyId: string, overrides?: Partial<Enemy>) => Enemy;
  applyDamageToPlayer: (baseDamage: number) => number;
  applyDebuffToPlayer: (status: StatusEffect) => void;
}

export interface EnemyBehaviorStrategy {
  onTurnStart?(enemy: Enemy, context: EnemyActionContext): void;
  getPrimaryIntent(enemy: Enemy, context: EnemyActionContext): EnemyIntent;
  getFollowUpIntent?(enemy: Enemy, primary: EnemyIntent, context: EnemyActionContext): EnemyIntent | null;
  executeIntent(enemy: Enemy, intent: EnemyIntent, context: EnemyActionContext): void;
}

const executeAttackIntent = (enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext) => {
  const hits = intent.hits || 1;
  for (let i = 0; i < hits; i += 1) {
    let dmg = (intent.value || 0) + ctx.getStrength(enemy);
    const phlegmBind = ctx.getStacks(enemy, 'phlegm_bind');
    if (phlegmBind > 0) {
      dmg = Math.max(0, dmg - phlegmBind);
    }
    if (ctx.getStacks(enemy, 'weak') > 0) {
      dmg = Math.floor(dmg * 0.75);
    }
    const dealt = ctx.applyDamageToPlayer(dmg);
    ctx.log(`${enemy.name} 攻击了你，造成 ${dealt} 点伤害`);
  }
};

const executeDefendIntent = (enemy: Enemy, intent: EnemyIntent) => {
  enemy.block += intent.value || 0;
};

class WindColdGuestStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.68
      ? { type: 'attack', value: 7, description: '寒邪侵袭' }
      : { type: 'debuff', value: 0, description: '风寒束表' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'attack'
      ? { type: 'debuff', value: 0, description: '风寒束表' }
      : { type: 'attack', value: 6, description: '寒邪追袭' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
      ctx.applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
      ctx.log('风寒束表：你被寒邪侵袭');
    }
  }
}

class WindHeatAttackStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.62
      ? { type: 'attack', value: 4, hits: 2, description: '热邪连袭' }
      : { type: 'debuff', value: 0, description: '热邪灼络' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'attack'
      ? { type: 'debuff', value: 0, description: '热邪灼络' }
      : { type: 'attack', value: 4, hits: 2, description: '火毒追击' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
      ctx.log('热邪灼络：你被热邪灼伤');
    }
  }
}

class DampTurbidityStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.55
      ? { type: 'attack', value: 6, description: '湿浊侵身' }
      : { type: 'debuff', value: 0, description: '湿邪困脾' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'attack'
      ? { type: 'debuff', value: 0, description: '湿邪困脾' }
      : { type: 'defend', value: 6, description: '浊气护体' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'defend') {
      executeDefendIntent(enemy, intent);
      ctx.log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
      ctx.log('湿邪困脾：你的格挡效率下降');
    }
  }
}

class DampMinionStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.65
      ? { type: 'debuff', value: 0, description: '湿邪侵体' }
      : { type: 'attack', value: 5, description: '浊气扑袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 4, description: '浊气扑袭' }
      : { type: 'debuff', value: 0, description: '湿邪侵体' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
      ctx.log('湿邪侵体');
    }
  }
}

class ExternalCombinationStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, ctx: EnemyActionContext): void {
    const formTurns = enemy.meta?.formTurns ?? 3;
    if (formTurns <= 0) {
      const nextForm = enemy.meta?.form === 'cold' ? 'heat' : 'cold';
      enemy.meta = { ...(enemy.meta || {}), form: nextForm, formTurns: 3 };
      enemy.statusEffects = [];
      ctx.log(`外感合病切换为${nextForm === 'cold' ? '风寒态' : '风热态'}`);
    } else {
      enemy.meta = { ...(enemy.meta || {}), formTurns: formTurns - 1 };
    }
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const roll = Math.random();
    const form = enemy.meta?.form || 'cold';
    if (form === 'cold') {
      return roll < 0.42
        ? { type: 'attack', value: 9, description: '寒邪裹体' }
        : { type: 'debuff', value: 0, description: '风寒束表' };
    }
    return roll < 0.4
      ? { type: 'debuff', value: 0, description: '热邪蒸腾' }
      : { type: 'attack', value: 5 + _ctx.getStacks(enemy, 'heat_evil'), hits: 2, description: '热邪连袭' };
  }

  getFollowUpIntent(enemy: Enemy, primary: EnemyIntent, ctx: EnemyActionContext): EnemyIntent | null {
    const form = enemy.meta?.form || 'cold';
    if (primary.type === 'attack') {
      return { type: 'debuff', value: 0, description: form === 'cold' ? '风寒束表' : '热邪蒸腾' };
    }
    return {
      type: 'attack',
      value: form === 'cold' ? 8 : 4 + ctx.getStacks(enemy, 'heat_evil'),
      hits: form === 'cold' ? 1 : 2,
      description: form === 'cold' ? '寒袭追打' : '热邪连袭',
    };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      const isCold = (enemy.meta?.form || 'cold') === 'cold';
      if (isCold) {
        ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
        ctx.applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
        ctx.log('外感合病（风寒态）：施加寒邪与虚弱');
      } else {
        ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
        ctx.log('外感合病（风热态）：热邪蒸腾');
      }
    }
  }
}

class QiBloodStasisStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '气滞血瘀' }
      : { type: 'attack', value: 10, description: '郁阻作痛' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 10, description: '瘀阻重击' }
      : { type: 'debuff', value: 0, description: '气滞血瘀' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'cost_up_next', name: '气滞', type: 'debuff', stacks: 1, canStack: false, description: '下一张卡牌消耗 +1' });
      ctx.applyDebuffToPlayer({ id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '受到伤害增加' });
      ctx.log('气滞血瘀：你被施加负面状态');
    }
  }
}

class SpleenDampnessStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const roll = Math.random();
    if (roll < 0.32) return { type: 'attack', value: 8, description: '湿浊压身' };
    if (roll < 0.72) return { type: 'defend', value: 10, description: '脾虚护体' };
    return { type: 'debuff', value: 0, description: '湿困中焦' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    if (primary.type === 'defend') return { type: 'attack', value: 8, description: '湿浊压身' };
    if (primary.type === 'attack') return { type: 'debuff', value: 0, description: '湿困中焦' };
    return { type: 'attack', value: 8, description: '浊气扑压' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'defend') {
      executeDefendIntent(enemy, intent);
      ctx.log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'cost_up', name: '脾虚湿困', type: 'debuff', stacks: 1, canStack: true, description: '卡牌消耗增加', duration: 3 });
      ctx.applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
      ctx.log('湿困中焦：卡牌消耗增加');
    }
  }
}

class HeartKidneyGapStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.72
      ? { type: 'debuff', value: 0, description: '心悸不安' }
      : { type: 'attack', value: 8, description: '神乱冲心' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 8, description: '心肾失衡' }
      : { type: 'debuff', value: 0, description: '心悸不安' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      if (Math.random() < 0.5) {
        ctx.applyDebuffToPlayer({ id: 'draw_down', name: '心悸不安', type: 'debuff', stacks: 1, canStack: true, description: '下回合少抽牌', duration: 1 });
        ctx.applyDebuffToPlayer({ id: 'no_block', name: '心肾不交', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
        ctx.log('心悸不安：下回合抽牌减少');
      } else {
        ctx.applyDebuffToPlayer({ id: 'stun', name: '痰蒙心窍', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
        ctx.applyDebuffToPlayer({ id: 'no_block', name: '心肾不交', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
        ctx.log('痰蒙心窍：你被眩晕');
      }
    }
  }
}

class TanmengxinqiaoStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    const playerAlreadyControlled =
      ctx.getStacks(ctx.player, 'stun') > 0 || ctx.getStacks(ctx.player, 'draw_down') > 0 || ctx.getStacks(ctx.player, 'no_block') > 0;
    if (playerAlreadyControlled && turn % 2 === 1) {
      return { type: 'attack', value: 10, description: '窍闭冲击' };
    }
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '痰蒙心窍' }
      : { type: 'attack', value: 9, description: '窍闭失神' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 9, description: '迷窍冲心' }
      : { type: 'debuff', value: 0, description: '迷窍封格' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      if (ctx.getStacks(ctx.player, 'draw_down') > 0 || ctx.getStacks(ctx.player, 'no_block') > 0) {
        ctx.applyDebuffToPlayer({ id: 'stun', name: '痰蒙心窍', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 });
        ctx.log('痰蒙心窍：你被迷窍眩晕');
      } else {
        ctx.applyDebuffToPlayer({ id: 'draw_down', name: '神志昏蒙', type: 'debuff', stacks: 1, canStack: true, description: '下回合少抽牌', duration: 1 });
        ctx.applyDebuffToPlayer({ id: 'no_block', name: '窍闭失固', type: 'debuff', stacks: 1, canStack: true, description: '下回合无法获得格挡', duration: 1 });
        ctx.log('痰蒙心窍：下回合少抽且无法获得格挡');
      }
    }
  }
}

class PhlegmStasisStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, ctx: EnemyActionContext): void {
    if (ctx.getStacks(ctx.player, 'dampness_evil') > 0) {
      enemy.block += 4;
    }
    if (ctx.getStacks(ctx.player, 'blood_stasis') > 0) {
      ctx.addStatus(enemy, { id: 'strength', name: '力量', type: 'buff', stacks: 1, canStack: true, description: '攻击伤害提高' });
    }
  }

  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.5
      ? { type: 'attack', value: 12, description: '痰瘀互结' }
      : { type: 'defend', value: 14, description: '痰凝护体' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'defend'
      ? { type: 'attack', value: 11, description: '痰瘀镇压' }
      : { type: 'defend', value: 12, description: '痰凝护体' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'defend') {
      executeDefendIntent(enemy, intent);
      ctx.log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
    }
  }
}

class ChongRenInstabilityStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() < 0.7
      ? { type: 'debuff', value: 0, description: '冲任不固' }
      : { type: 'attack', value: 9, description: '逆乱冲袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 9, description: '逆乱冲袭' }
      : { type: 'debuff', value: 0, description: '冲任不固' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.removeBuffs(ctx.player);
      ctx.log('冲任不固：失去所有正面状态');
    }
  }
}

class ReruyingxueStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    const playerHeat = ctx.getStacks(ctx.player, 'heat_evil');
    if (turn % 2 === 0 || playerHeat < 2) {
      return { type: 'debuff', value: 0, description: '热入营血' };
    }
    return { type: 'attack', value: 10 + Math.min(4, playerHeat), description: '营热灼袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 8 + Math.min(3, ctx.getStacks(ctx.player, 'heat_evil')), description: '营热追袭' }
      : { type: 'debuff', value: 0, description: '热入营血' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
      ctx.log('热入营血：热邪进一步深入营血');
    }
  }
}

class ShenbunaqiStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '肾不纳气' }
      : { type: 'attack', value: 11, description: '纳气失司' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'debuff'
      ? { type: 'attack', value: 10, description: '逆气冲胸' }
      : { type: 'debuff', value: 0, description: '肾不纳气' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'energy_drain', name: '肾不纳气', type: 'debuff', stacks: 1, canStack: true, description: '真气上限降低', duration: 2 });
      ctx.applyDebuffToPlayer({ id: 'max_energy_down', name: '纳气失司', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
      ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
      ctx.applyDebuffToPlayer({ id: 'weak', name: '气虚失摄', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 1 });
      ctx.log('肾不纳气：真气受抑，寒邪与虚弱同时侵袭');
    }
  }
}

class YangmingfushiStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    if (ctx.player.block > 0 && turn % 2 === 0) {
      return { type: 'special', value: 0, description: '阳明腑实' };
    }
    return { type: 'attack', value: 13, description: '腑实压顶' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, ctx: EnemyActionContext): EnemyIntent | null {
    if (primary.type === 'special') {
      return { type: 'attack', value: 12, description: '腑实追压' };
    }
    return ctx.player.block > 0
      ? { type: 'special', value: 0, description: '阳明腑实' }
      : { type: 'attack', value: 11, description: '燥结逼压' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'special') {
      const clearedBlock = ctx.player.block;
      if (clearedBlock > 0) {
        ctx.player.block = 0;
        ctx.log(`阳明腑实：清空了 ${clearedBlock} 点格挡`);
      } else {
        ctx.log('阳明腑实：逼压防线，回合末格挡仍会被清空');
      }
      ctx.applyDebuffToPlayer({
        id: 'remove_block_end',
        name: '阳明腑实',
        type: 'debuff',
        stacks: 1,
        canStack: false,
        description: '回合结束时清空格挡',
        duration: 1,
      });
    }
  }
}

class JueyinComplexStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    const turn = (enemy.meta?.turn || 0) + 1;
    enemy.meta = { ...(enemy.meta || {}), turn };
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '寒邪+虚弱' }
      : { type: 'debuff', value: 0, description: '热邪+易伤' };
  }

  getFollowUpIntent(_enemy: Enemy, _primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return { type: 'attack', value: 12, description: '厥阴交错' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      const turn = enemy.meta?.turn || 0;
      if (turn % 2 === 0) {
        ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
        ctx.applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
      } else {
        ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 1, canStack: true, description: '回合结束受到伤害' });
        ctx.applyDebuffToPlayer({ id: 'vulnerable', name: '易伤', type: 'debuff', stacks: 1, canStack: true, description: '下次受伤增加50%' });
      }
      ctx.log('寒热错杂侵袭');
    }
  }
}

class YinYangSplitStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    const form = enemy.meta?.form === 'yang' ? 'yin' : 'yang';
    enemy.meta = { ...(enemy.meta || {}), form };
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const form = enemy.meta?.form || 'yin';
    return form === 'yin'
      ? { type: 'defend', value: 8, description: '阴守' }
      : { type: 'attack', value: 11, description: '阳攻' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'defend'
      ? { type: 'attack', value: 9, description: '阳袭' }
      : { type: 'defend', value: 7, description: '阴守' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'defend') {
      executeDefendIntent(enemy, intent);
      ctx.log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
    }
  }
}

class BossWindColdStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, _ctx: EnemyActionContext): void {
    enemy.meta = { ...(enemy.meta || {}), turn: (enemy.meta?.turn || 0) + 1 };
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    const phaseTwo = enemy.currentHp / enemy.maxHp < 0.5;
    if (phaseTwo && turn % 3 === 2) {
      return { type: 'special', value: 0, description: '寒凝血瘀' };
    }
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '风寒束表' }
      : { type: 'attack', value: phaseTwo ? 16 : 13, description: '寒邪侵袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    const phaseTwo = _enemy.currentHp / _enemy.maxHp < 0.5;
    if (primary.type === 'special') {
      return { type: 'attack', value: phaseTwo ? 15 : 13, description: '寒邪崩压' };
    }
    if (primary.type === 'attack') {
      return { type: 'debuff', value: 0, description: '风寒束表' };
    }
    return { type: 'attack', value: phaseTwo ? 15 : 13, description: '寒邪侵袭' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 2, canStack: true, description: '寒邪缠身' });
      ctx.applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
      ctx.log('风寒束表：寒邪侵体');
    } else if (intent.type === 'special') {
      const coldStacks = ctx.getStacks(ctx.player, 'cold_evil');
      if (coldStacks >= 3) {
        const coldStatus = ctx.getStatus(ctx.player, 'cold_evil');
        if (coldStatus) {
          coldStatus.stacks -= 3;
          if (coldStatus.stacks <= 0) ctx.removeStatus(ctx.player, 'cold_evil');
        }
        ctx.applyDebuffToPlayer({ id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '受到伤害增加' });
        ctx.log('寒凝血瘀：3 层寒邪转化为 1 层血瘀');
      } else {
        ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 2, canStack: true, description: '寒邪缠身' });
        ctx.log('风寒束表进一步加深寒邪');
      }
    }
  }
}

class BossLiverFireStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, ctx: EnemyActionContext): void {
    const turn = (enemy.meta?.turn || 0) + 1;
    enemy.meta = { ...(enemy.meta || {}), turn };
    ctx.addStatus(enemy, { id: 'fire_growth', name: '肝火势', type: 'buff', stacks: 1, canStack: true, description: '攻击力提高' });
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const heatGrowth = _ctx.getStacks(enemy, 'fire_growth');
    const phaseTwo = enemy.currentHp / enemy.maxHp < 0.5;
    const turn = enemy.meta?.turn || 0;
    if (phaseTwo && turn % 3 === 2) {
      return { type: 'special', value: 0, description: '火旺伤阴' };
    }
    return turn % 2 === 0
      ? { type: 'debuff', value: 0, description: '热邪炽盛' }
      : { type: 'attack', value: 9 + heatGrowth, hits: phaseTwo ? 2 : 1, description: '肝火灼袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    const heatGrowth = _ctx.getStacks(_enemy, 'fire_growth');
    const phaseTwo = _enemy.currentHp / _enemy.maxHp < 0.5;
    if (primary.type === 'special') {
      return { type: 'attack', value: 10 + heatGrowth, hits: phaseTwo ? 2 : 1, description: '火势追袭' };
    }
    if (primary.type === 'attack') {
      return { type: 'debuff', value: 0, description: '热邪炽盛' };
    }
    return { type: 'attack', value: 10 + heatGrowth, hits: phaseTwo ? 2 : 1, description: '肝火灼袭' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
      ctx.log('肝火炽盛：热邪侵身');
    } else if (intent.type === 'special') {
      const yin = ctx.getStatus(ctx.player, 'yin');
      if (yin && yin.stacks > 0) {
        yin.stacks -= 1;
        if (yin.stacks <= 0) ctx.removeStatus(ctx.player, 'yin');
        ctx.log('火旺伤阴：你失去了 1 层滋阴');
      } else {
        ctx.applyDebuffToPlayer({
          id: 'no_yin_gain',
          name: '伤阴',
          type: 'debuff',
          stacks: 1,
          canStack: false,
          description: '下回合无法获得滋阴',
          duration: 1,
        });
        ctx.log('火旺伤阴：下回合无法获得滋阴');
      }
    }
  }
}

class BossSpleenDampStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, ctx: EnemyActionContext): void {
    const turn = (enemy.meta?.turn || 0) + 1;
    enemy.meta = { ...(enemy.meta || {}), turn };
    if (turn % 2 === 0 && ctx.canSummonEnemy(ctx.enemies)) {
      ctx.enemies.push(
        ctx.createEnemyFromTemplate('damp_minion', {
          id: `damp_minion_${Date.now()}_${enemy.id}`,
        }),
      );
    }
    ctx.addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '化热前积蓄湿邪' });
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const turn = enemy.meta?.turn || 0;
    const phaseTwo = enemy.currentHp / enemy.maxHp < 0.4;
    if (turn > 0 && turn % 2 === 0) {
      return { type: 'special', value: 0, description: '水湿不运' };
    }
    if (phaseTwo && _ctx.getStacks(enemy, 'dampness_evil') > 0 && turn % 3 === 1) {
      return { type: 'special', value: 0, description: '化热' };
    }
    return turn % 2 === 1
      ? { type: 'debuff', value: 0, description: '湿困中焦' }
      : { type: 'attack', value: 14, description: '湿浊扑袭' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    if (primary.description === '化热') {
      return { type: 'attack', value: 15, description: '湿热压顶' };
    }
    if (primary.type === 'attack') {
      return { type: 'debuff', value: 0, description: '湿困中焦' };
    }
    return { type: 'attack', value: 14, description: '湿浊扑袭' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      ctx.applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 2, canStack: true, description: '格挡获得降低' });
      ctx.applyDebuffToPlayer({ id: 'max_energy_down', name: '真气受阻', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
      ctx.log('湿困中焦：真气受阻');
    } else if (intent.type === 'special') {
      if (intent.description === '水湿不运') {
        ctx.log(ctx.canSummonEnemy(ctx.enemies) ? '脾虚湿困：召来水湿小怪' : '脾虚湿困：湿气翻涌，但场上敌人已满');
      } else {
        const damp = Math.max(1, ctx.getStacks(enemy, 'dampness_evil'));
        ctx.removeStatus(enemy, 'dampness_evil');
        ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: damp, canStack: true, description: '回合结束受到伤害' });
        ctx.log(`化热：将 ${damp} 层湿邪转化为热邪压向玩家`);
      }
    }
  }
}

class BossFiveElementsStrategy implements EnemyBehaviorStrategy {
  onTurnStart(enemy: Enemy, ctx: EnemyActionContext): void {
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
      ctx.log(`五行失调切换到${nextPhase}阶段`);
    } else {
      enemy.meta = { ...(enemy.meta || {}), phase: nextPhase, phaseTurn };
    }
    if (nextPhase === 'wood') {
      ctx.addStatus(enemy, { id: 'strength', name: '木势', type: 'buff', stacks: 2, canStack: true, description: '攻击力提高' });
    } else if (nextPhase === 'earth') {
      ctx.addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '湿郁化热' });
    }
  }

  getPrimaryIntent(enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    const phase = enemy.meta?.phase || 'wood';
    if (phase === 'wood') return { type: 'attack', value: 7, hits: 2, description: '风木摇动' };
    if (phase === 'fire') return { type: 'debuff', value: 0, description: '热入营血' };
    if (phase === 'earth') return { type: 'debuff', value: 0, description: '湿浊中阻' };
    if (phase === 'metal') return { type: 'special', value: 0, description: '燥邪伤肺' };
    return { type: 'special', value: 0, description: '寒水泛溢' };
  }

  getFollowUpIntent(enemy: Enemy, _primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    const phase = enemy.meta?.phase || 'wood';
    if (phase === 'wood') return { type: 'debuff', value: 0, description: '木郁乘土' };
    if (phase === 'fire') return { type: 'attack', value: 12, description: '火势焚袭' };
    if (phase === 'earth') return { type: 'attack', value: 11, description: '湿土镇压' };
    if (phase === 'metal') return { type: 'attack', value: 10, hits: 2, description: '金风肃杀' };
    return { type: 'debuff', value: 0, description: '寒水逼压' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'debuff') {
      const phase = enemy.meta?.phase || 'wood';
      if (phase === 'fire') {
        ctx.applyDebuffToPlayer({ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 2, canStack: true, description: '回合结束受到伤害' });
        ctx.log('热入营血：热邪加深');
      } else if (phase === 'earth') {
        ctx.applyDebuffToPlayer({ id: 'dampness_evil', name: '湿邪', type: 'debuff', stacks: 1, canStack: true, description: '格挡获得降低' });
        enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + 6);
        ctx.addStatus(enemy, { id: 'dampness_evil', name: '湿邪', type: 'buff', stacks: 1, canStack: true, description: '可转化为热邪' });
        ctx.log('湿浊中阻：湿邪缠身');
      } else if (phase === 'water') {
        ctx.applyDebuffToPlayer({ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '寒邪缠身' });
        ctx.applyDebuffToPlayer({ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 2 });
        ctx.applyDebuffToPlayer({ id: 'max_energy_down', name: '肾不纳气', type: 'debuff', stacks: 1, canStack: true, description: '下回合真气上限 -1', duration: 1 });
        ctx.log('寒水泛溢：真气受阻');
      } else if (phase === 'wood') {
        ctx.applyDebuffToPlayer({ id: 'weak', name: '木郁', type: 'debuff', stacks: 1, canStack: true, description: '造成伤害降低25%', duration: 1 });
        ctx.log('木郁乘土：攻势被压制');
      }
    } else if (intent.type === 'special') {
      const phase = enemy.meta?.phase || 'wood';
      if (phase === 'metal') {
        ctx.applyDebuffToPlayer({
          id: 'lung_dryness',
          name: '燥邪伤肺',
          type: 'debuff',
          stacks: 1,
          canStack: true,
          description: '治疗与格挡效果下降',
          duration: 2,
        });
        ctx.log('燥邪伤肺：你的治疗与格挡效果下降');
      } else if (phase === 'water') {
        ctx.applyDebuffToPlayer({
          id: 'energy_drain',
          name: '肾不纳气',
          type: 'debuff',
          stacks: 1,
          canStack: true,
          description: '真气上限降低',
          duration: 2,
        });
        ctx.applyDebuffToPlayer({
          id: 'max_energy_down',
          name: '寒水泛溢',
          type: 'debuff',
          stacks: 1,
          canStack: true,
          description: '下回合真气上限 -1',
          duration: 1,
        });
        ctx.log('寒水泛溢：你的真气被偷取');
      }
    }
  }
}

class DefaultStrategy implements EnemyBehaviorStrategy {
  getPrimaryIntent(_enemy: Enemy, _ctx: EnemyActionContext): EnemyIntent {
    return Math.random() > 0.5
      ? { type: 'attack', value: 7, description: '攻击' }
      : { type: 'defend', value: 5, description: '格挡' };
  }

  getFollowUpIntent(_enemy: Enemy, primary: EnemyIntent, _ctx: EnemyActionContext): EnemyIntent | null {
    return primary.type === 'attack'
      ? { type: 'defend', value: 4, description: '格挡' }
      : { type: 'attack', value: 6, description: '攻击' };
  }

  executeIntent(enemy: Enemy, intent: EnemyIntent, ctx: EnemyActionContext): void {
    if (intent.type === 'attack') {
      executeAttackIntent(enemy, intent, ctx);
    } else if (intent.type === 'defend') {
      executeDefendIntent(enemy, intent);
      ctx.log(`${enemy.name} 获得了 ${intent.value || 0} 点格挡`);
    }
  }
}

const defaultStrategy = new DefaultStrategy();

const strategyRegistry: Record<string, EnemyBehaviorStrategy> = {
  wind_cold_guest: new WindColdGuestStrategy(),
  wind_heat_attack: new WindHeatAttackStrategy(),
  damp_turbidity: new DampTurbidityStrategy(),
  damp_minion: new DampMinionStrategy(),
  external_combination: new ExternalCombinationStrategy(),
  qi_blood_stasis: new QiBloodStasisStrategy(),
  spleen_dampness: new SpleenDampnessStrategy(),
  heart_kidney_gap: new HeartKidneyGapStrategy(),
  tanmengxinqiao: new TanmengxinqiaoStrategy(),
  phlegm_stasis: new PhlegmStasisStrategy(),
  chong_ren_instability: new ChongRenInstabilityStrategy(),
  reruyingxue: new ReruyingxueStrategy(),
  shenbunaqi: new ShenbunaqiStrategy(),
  yangmingfushi: new YangmingfushiStrategy(),
  jueyin_complex: new JueyinComplexStrategy(),
  yin_yang_split: new YinYangSplitStrategy(),
  boss_wind_cold: new BossWindColdStrategy(),
  boss_liver_fire: new BossLiverFireStrategy(),
  boss_spleen_damp: new BossSpleenDampStrategy(),
  boss_five_elements: new BossFiveElementsStrategy(),
};

export const getEnemyStrategy = (behavior: string): EnemyBehaviorStrategy =>
  strategyRegistry[behavior] || defaultStrategy;

export const hasEnemyStrategy = (behavior: string): boolean =>
  Object.prototype.hasOwnProperty.call(strategyRegistry, behavior);

const getEnemyRank = (enemy: Enemy): 'common' | 'elite' | 'boss' => {
  if (enemy.behavior?.startsWith('boss_') || enemy.id.includes('boss')) return 'boss';
  if (['external_combination', 'phlegm_stasis', 'jueyin_complex'].includes(enemy.behavior ?? enemy.id)) return 'elite';
  return 'common';
};

export const getEnemyActionCount = (enemy: Enemy, currentAct: number): number => {
  const rank = getEnemyRank(enemy);
  if (rank !== 'common') return 2;
  if (currentAct <= 1) return 1;
  if (currentAct === 2) return Math.random() < 0.65 ? 2 : 1;
  return 2;
};
