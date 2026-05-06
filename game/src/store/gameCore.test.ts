import { describe, expect, it } from 'vitest';
import { CARD_LIBRARY } from '../data/cards';
import { ENEMIES, ENEMY_POOLS } from '../data/enemies';
import type { Card, Enemy, Player } from '../types';
import { INITIAL_PLAYER, INITIAL_TURN_FLAGS, resolveCardPlay, resolveEnemyTurn, type CoreState } from '../../../shared/core/gameCore';

const makeCard = (id: keyof typeof CARD_LIBRARY, suffix = Math.random().toString(36).slice(2, 7)): Card => ({
  ...CARD_LIBRARY[id],
  id: `${CARD_LIBRARY[id].id}_${suffix}`,
});

const makeEnemy = (id: keyof typeof ENEMIES): Enemy => ({
  ...ENEMIES[id],
  id: `${ENEMIES[id].id}_instance`,
  currentHp: ENEMIES[id].currentHp,
  statusEffects: [],
  meta: ENEMIES[id].meta ? { ...ENEMIES[id].meta } : undefined,
});

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  ...INITIAL_PLAYER,
  deck: [],
  hand: [],
  discardPile: [],
  drawPile: [],
  exhaustPile: [],
  statusEffects: [],
  relics: [],
  potions: [],
  gold: 99,
  ...overrides,
});

const makeState = (player: Player, enemies: Enemy[]): CoreState => ({
  phase: 'combat',
  player,
  currentAct: 1,
  currentFloor: 0,
  map: [],
  currentNodeId: 'node_0_0',
  enemies,
  combatTurn: 0,
  selectedCardId: null,
  selectedEnemyId: enemies[0]?.id ?? null,
  turnFlags: { ...INITIAL_TURN_FLAGS },
});

const getStacks = (player: Player, id: string) => player.statusEffects.find(status => status.id === id)?.stacks ?? 0;

const applyPlay = (state: CoreState, cardId: string, targetId?: string) => {
  const log: string[] = [];
  const result = resolveCardPlay(state, cardId, targetId, message => log.push(message));
  expect(result).not.toBeNull();
  const applied = result!;
  return {
    state: {
      ...state,
      player: { ...applied.player, energy: applied.player.energy - applied.energyCost },
      enemies: applied.enemies,
      selectedEnemyId: applied.selectedEnemyId,
      turnFlags: applied.turnFlags,
    } as CoreState,
    log,
  };
};

describe('shared game core', () => {
  it('党参补气会强化下一张技能牌的核心效果', () => {
    const dangshen = makeCard('dangshen', 'a');
    const huangqi = makeCard('huangqi', 'b');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      hand: [dangshen, huangqi],
    });

    const first = applyPlay(makeState(player, [enemy]), dangshen.id, enemy.id);
    expect(first.state.player.block).toBe(4);
    expect(getStacks(first.state.player, 'next_skill_bonus')).toBe(2);

    const second = applyPlay(first.state, huangqi.id, enemy.id);
    expect(second.state.player.block).toBe(16);
    expect(getStacks(second.state.player, 'next_skill_bonus')).toBe(0);
  });

  it('脾虚湿盛者在场时会稳定提高卡牌消耗', () => {
    const chenpi = makeCard('chenpi', 'cost');
    const enemy = makeEnemy('spleen_dampness');
    const player = makePlayer({
      energy: 0,
      hand: [chenpi],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), chenpi.id, enemy.id, () => undefined);
    expect(result).toBeNull();
  });

  it('山楂消食不需要击杀也会造成伤害并获得格挡', () => {
    const shanzha = makeCard('shanzha', 'block');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      hand: [shanzha],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), shanzha.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].currentHp).toBe(enemy.maxHp - 3);
    expect(result!.player.block).toBe(5);
  });

  it('足三里重复使用后会按层数叠加攻击回血', () => {
    const firstZusanli = makeCard('zusanli', 'a');
    const secondZusanli = makeCard('zusanli', 'b');
    const danshen = makeCard('danshen', 'attack');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      hp: 70,
      energy: 6,
      hand: [firstZusanli, secondZusanli, danshen],
    });

    const first = applyPlay(makeState(player, [enemy]), firstZusanli.id, enemy.id);
    const second = applyPlay(first.state, secondZusanli.id, enemy.id);
    expect(getStacks(second.state.player, 'zusanli')).toBe(2);

    const third = applyPlay(second.state, danshen.id, enemy.id);
    expect(third.state.player.hp).toBe(72);
  });

  it('阴虚体质受到敌人攻击时只额外受到1点伤害', () => {
    const enemy = makeEnemy('yangmingfushi');
    enemy.block = 0;
    const player = makePlayer({
      statusEffects: [
        {
          id: 'yin_deficiency_passive',
          name: '阴虚火旺',
          type: 'buff',
          stacks: 1,
          canStack: false,
          description: '回合开始时获得1点能量，但受到伤害+1',
        },
      ],
    });

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.hp).toBe(66);
  });

  it('肝火炽盛战斗中首回合攻击会立即扣除敌方生命', () => {
    const danshen = makeCard('danshen', 'liver-fire');
    const enemy = makeEnemy('boss_liver_fire');
    const player = makePlayer({
      energy: 3,
      hand: [danshen],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), danshen.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].currentHp).toBe(enemy.maxHp - 7);
  });

  it('脾虚湿困会召唤正式的水湿小怪实例', () => {
    const enemy = makeEnemy('boss_spleen_damp');
    enemy.meta = { ...(enemy.meta ?? {}), turn: 1 };
    const player = makePlayer();

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();

    const summoned = result!.enemies.find((entry) => entry.behavior === 'damp_minion');
    expect(summoned).toBeDefined();
    expect(summoned).toMatchObject({
      name: ENEMIES.damp_minion.name,
      maxHp: ENEMIES.damp_minion.maxHp,
      currentHp: ENEMIES.damp_minion.maxHp,
      behavior: ENEMIES.damp_minion.behavior,
      image: ENEMIES.damp_minion.image,
      posterImage: ENEMIES.damp_minion.posterImage,
    });
    expect(summoned?.id).not.toBe(ENEMIES.damp_minion.id);
    expect(result!.enemies.filter((entry) => entry.currentHp > 0)).toHaveLength(2);
  });

  it('脾虚湿困在场上已有两名存活敌人时不会再召唤第三个敌人', () => {
    const boss = makeEnemy('boss_spleen_damp');
    boss.meta = { ...(boss.meta ?? {}), turn: 3 };
    const minion = makeEnemy('damp_minion');
    const player = makePlayer();

    const result = resolveEnemyTurn(makeState(player, [boss, minion]), () => undefined);
    expect(result).not.toBeNull();

    const aliveEnemies = result!.enemies.filter((entry) => entry.currentHp > 0);
    const aliveMinions = aliveEnemies.filter((entry) => entry.behavior === 'damp_minion');
    expect(aliveEnemies).toHaveLength(2);
    expect(aliveMinions).toHaveLength(1);
  });

  it('脾虚湿困会在水湿小怪阵亡后补召回双敌上限', () => {
    const boss = makeEnemy('boss_spleen_damp');
    boss.meta = { ...(boss.meta ?? {}), turn: 3 };
    const fallenMinion = makeEnemy('damp_minion');
    fallenMinion.currentHp = 0;
    const player = makePlayer();

    const result = resolveEnemyTurn(makeState(player, [boss, fallenMinion]), () => undefined);
    expect(result).not.toBeNull();

    const aliveEnemies = result!.enemies.filter((entry) => entry.currentHp > 0);
    const replacement = aliveEnemies.find((entry) => entry.behavior === 'damp_minion');
    expect(aliveEnemies).toHaveLength(2);
    expect(replacement).toBeDefined();
    expect(replacement?.id).not.toBe(fallenMinion.id);
  });

  it('水湿小怪只作为召唤单位存在于正式敌人数据中', () => {
    expect(ENEMIES.damp_minion).toBeDefined();
    expect(ENEMY_POOLS.act1.common).not.toContain('damp_minion');
    expect(ENEMY_POOLS.act2.common).not.toContain('damp_minion');
    expect(ENEMY_POOLS.act2.elite).not.toContain('damp_minion');
    expect(ENEMY_POOLS.act2.boss).not.toContain('damp_minion');
    expect(ENEMY_POOLS.act3.common).not.toContain('damp_minion');
  });

  it('风寒束表二阶段会把 3 层寒邪转成 1 层血瘀', () => {
    const enemy = makeEnemy('boss_wind_cold');
    enemy.currentHp = 60;
    enemy.meta = { ...(enemy.meta ?? {}), turn: 1 };
    const player = makePlayer({
      statusEffects: [
        { id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 3, canStack: true, description: '寒邪缠身' },
      ],
    });

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    const nextPlayer = result!.player;
    expect(getStacks(nextPlayer, 'cold_evil')).toBe(0);
    expect(getStacks(nextPlayer, 'blood_stasis')).toBe(1);
  });

  it('肝火炽盛二阶段在无法偷取滋阴时会禁止下回合获得滋阴', () => {
    const enemy = makeEnemy('boss_liver_fire');
    enemy.currentHp = 60;
    enemy.meta = { ...(enemy.meta ?? {}), turn: 1 };
    const player = makePlayer();

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    expect(getStacks(result!.player, 'no_yin_gain')).toBe(1);
  });

  it('五行失调会在血线阈值达到时切换阶段', () => {
    const enemy = makeEnemy('boss_five_elements');
    enemy.currentHp = 380;
    enemy.meta = { phase: 'wood', phaseTurn: 0 };
    const player = makePlayer();

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].meta?.phase).toBe('fire');
  });

  it('禁止获得滋阴状态会阻止麦冬滋阴生效', () => {
    const maidong = makeCard('maidong', 'yin');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      hand: [maidong],
      statusEffects: [
        {
          id: 'no_yin_gain',
          name: '伤阴',
          type: 'debuff',
          stacks: 1,
          canStack: false,
          description: '下回合无法获得滋阴',
          duration: 1,
        },
      ],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), maidong.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(getStacks(result!.player, 'yin')).toBe(0);
  });
});
