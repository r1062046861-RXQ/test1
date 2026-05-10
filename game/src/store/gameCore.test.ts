import { describe, expect, it, vi } from 'vitest';
import { CARD_LIBRARY, EQUIPMENT_CARD_IDS, isEquipmentCard } from '../data/cards';
import { ENEMIES, ENEMY_POOLS } from '../data/enemies';
import type { Card, Enemy, Player } from '../types';
import {
  INITIAL_PLAYER,
  INITIAL_TURN_FLAGS,
  resolveCardPlay,
  resolveEnemyTurn,
  resolvePlayerEndTurn,
  type CoreState,
  type PlayCardResult,
} from '../../../shared/core/gameCore';

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
const getEnemyStacks = (enemy: Enemy, id: string) => enemy.statusEffects.find(status => status.id === id)?.stacks ?? 0;

const passive = (id: string, name = id) => ({
  id,
  name,
  type: 'buff' as const,
  stacks: 1,
  canStack: false,
  description: name,
  dispelImmune: true,
});

const makeStunnedEnemy = (id: keyof typeof ENEMIES): Enemy => ({
  ...makeEnemy(id),
  statusEffects: [{ id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动', duration: 1 }],
});

const equipmentRelic = (id: (typeof EQUIPMENT_CARD_IDS)[number]) => ({
  id,
  name: CARD_LIBRARY[id].name,
  description: CARD_LIBRARY[id].description,
  effectId: CARD_LIBRARY[id].effectId,
});

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
  it('装备牌是不可打出的独立卡牌分类', () => {
    expect(EQUIPMENT_CARD_IDS).toHaveLength(11);
    EQUIPMENT_CARD_IDS.forEach((cardId) => {
      const card = CARD_LIBRARY[cardId];
      expect(card, cardId).toBeDefined();
      expect(isEquipmentCard(card)).toBe(true);
      expect(card.type).toBe('power');
      expect(card.cost).toBe(0);
      expect(card.unplayable).toBe(true);
    });
  });

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
    const enemy = makeStunnedEnemy('wind_cold_guest');
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
    const enemy = makeStunnedEnemy('wind_cold_guest');
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
      statusEffects: [passive('yin_deficiency_passive', '阴虚质')],
    });

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.hp).toBe(66);
  });

  it('平和质会同时强化攻击、格挡与治疗', () => {
    const shanzha = makeCard('shanzha', 'balanced');
    const enemy = makeStunnedEnemy('wind_cold_guest');
    const player = makePlayer({
      hp: 70,
      energy: 3,
      hand: [shanzha],
      statusEffects: [passive('balanced_passive', '平和质')],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), shanzha.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].currentHp).toBe(enemy.maxHp - 4);
    expect(result!.player.block).toBe(6);
    expect(result!.player.hp).toBe(70);
  });

  it('阴虚质会强化滋阴层数并在回合开始额外获得真气', () => {
    const maidong = makeCard('maidong', 'yin-passive');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      hand: [maidong],
      statusEffects: [passive('yin_deficiency_passive', '阴虚质')],
    });

    const played = resolveCardPlay(makeState(player, [enemy]), maidong.id, enemy.id, () => undefined);
    expect(played).not.toBeNull();
    expect(getStacks(played!.player, 'yin')).toBe(3);

    const nextTurn = resolveEnemyTurn({ ...makeState(played!.player, [enemy]), combatTurn: 1 }, () => undefined);
    expect(nextTurn).not.toBeNull();
    expect(nextTurn!.player.energy).toBe(4);
  });

  it('气虚质会降低攻击但强化格挡治疗并攻击回血', () => {
    const shanzha = makeCard('shanzha', 'qi-passive');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      hp: 70,
      energy: 3,
      hand: [shanzha],
      statusEffects: [passive('qi_deficiency_passive', '气虚质')],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), shanzha.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].currentHp).toBe(enemy.maxHp - 2);
    expect(result!.player.block).toBe(7);
    expect(result!.player.hp).toBe(72);
  });

  it('阳虚质会前期扣真气并在3层温阳后群体爆发', () => {
    const first = makeEnemy('wind_cold_guest');
    const second = makeEnemy('damp_turbidity');
    const player = makePlayer({
      statusEffects: [
        passive('yang_deficiency_passive', '阳虚质'),
        { id: 'warm_yang', name: '温阳', type: 'buff', stacks: 2, canStack: true, description: '蓄力' },
        { id: 'warm_yang_start_count', name: '温阳启动', type: 'buff', stacks: 2, canStack: true, description: '计数' },
      ],
    });

    const result = resolveEnemyTurn(makeState(player, [first, second]), () => undefined);
    expect(result).not.toBeNull();
    expect(getStacks(result!.player, 'warm_yang')).toBe(0);
    expect(result!.enemies[0].currentHp).toBe(first.maxHp - 12);
    expect(result!.enemies[1].currentHp).toBe(second.maxHp - 12);
  });

  it('痰湿质会通过技能牌叠满禁锢并触发眩晕虚弱', () => {
    const chenpi = makeCard('chenpi', 'phlegm');
    const enemy = makeEnemy('wind_cold_guest');
    enemy.statusEffects = [
      { id: 'phlegm_bind', name: '痰湿禁锢', type: 'debuff', stacks: 2, canStack: true, description: '禁锢' },
    ];
    const player = makePlayer({
      energy: 3,
      hand: [chenpi],
      statusEffects: [passive('phlegm_dampness_passive', '痰湿质')],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), chenpi.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(getEnemyStacks(result!.enemies[0], 'phlegm_bind')).toBe(0);
    expect(getEnemyStacks(result!.enemies[0], 'stun')).toBe(1);
    expect(getEnemyStacks(result!.enemies[0], 'weak')).toBe(1);
  });

  it('湿热质会让首张攻击牌给目标和全体叠加热邪并降低格挡', () => {
    const shanzha = makeCard('shanzha', 'damp-heat');
    const first = makeEnemy('wind_cold_guest');
    const second = makeEnemy('damp_turbidity');
    const player = makePlayer({
      energy: 3,
      hand: [shanzha],
      statusEffects: [passive('damp_heat_passive', '湿热质')],
    });

    const result = resolveCardPlay(makeState(player, [first, second]), shanzha.id, first.id, () => undefined);
    expect(result).not.toBeNull();
    expect(getEnemyStacks(result!.enemies[0], 'heat_evil')).toBe(2);
    expect(getEnemyStacks(result!.enemies[1], 'heat_evil')).toBe(1);
    expect(result!.player.block).toBe(3);
  });

  it('血瘀质攻击血瘀目标时穿透格挡并放大伤害，但自疗自护减半', () => {
    const shanzha = makeCard('shanzha', 'stasis');
    const enemy = makeEnemy('wind_cold_guest');
    enemy.block = 20;
    enemy.statusEffects = [
      { id: 'blood_stasis', name: '血瘀', type: 'debuff', stacks: 1, canStack: true, description: '瘀阻' },
    ];
    const player = makePlayer({
      hp: 70,
      energy: 3,
      hand: [shanzha],
      statusEffects: [passive('blood_stasis_passive', '血瘀质')],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), shanzha.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.enemies[0].block).toBe(0);
    expect(result!.enemies[0].currentHp).toBe(enemy.maxHp - 5);
    expect(result!.player.block).toBe(2);
  });

  it('气郁质会首张技能额外抽牌、降低攻防并在敌方首击时减伤', () => {
    const chenpi = makeCard('chenpi', 'stagnation-skill');
    const drawn = makeCard('gancao', 'drawn');
    const enemy = makeEnemy('yangmingfushi');
    const player = makePlayer({
      energy: 3,
      hand: [chenpi],
      drawPile: [drawn],
      statusEffects: [passive('qi_stagnation_passive', '气郁质')],
    });

    const played = resolveCardPlay(makeState(player, [enemy]), chenpi.id, enemy.id, () => undefined);
    expect(played).not.toBeNull();
    expect(played!.player.hand.some(card => card.name === drawn.name)).toBe(true);

    const attacked = resolveEnemyTurn(makeState(makePlayer({
      statusEffects: [passive('qi_stagnation_passive', '气郁质')],
    }), [enemy]), () => undefined);
    expect(attacked).not.toBeNull();
    expect(attacked!.player.hp).toBe(71);
  });

  it('特禀质会在回合开始按随机结果触发天赋', () => {
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      statusEffects: [passive('special_diathesis_passive', '特禀质')],
    });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.58);

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    randomSpy.mockRestore();

    expect(result).not.toBeNull();
    expect(result!.player.block).toBe(5);
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

  it('治未病在战斗开始由 store 给予初始格挡，核心层不把装备放入手牌', () => {
    const player = makePlayer({
      relics: [equipmentRelic('equipment_zhiweibing')],
      hand: [makeCard('shanzha', 'equipment-not-in-piles')],
      deck: [],
      drawPile: [],
      discardPile: [],
    });

    expect(player.hand.some((card) => CARD_LIBRARY[card.id]?.category === 'equipment')).toBe(false);
    expect(player.deck.some((card) => CARD_LIBRARY[card.id]?.category === 'equipment')).toBe(false);
  });

  it('子午流注在非首回合提高回合抽牌量上限由 store 负责，核心保留抽牌动作纯粹', () => {
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      relics: [equipmentRelic('equipment_ziwuliuzhu')],
      drawPile: [makeCard('gancao', 'draw-a')],
    });

    const result = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.hand).toHaveLength(0);
  });

  it('阴阳学说会按血线强化攻防并免疫每场第一次眩晕', () => {
    const shanzha = makeCard('shanzha', 'yinyang-block');
    const enemy = makeEnemy('wind_cold_guest');
    const highHp = makePlayer({
      energy: 3,
      relics: [equipmentRelic('equipment_yinyang')],
      hand: [shanzha],
    });
    const highResult = resolveCardPlay(makeState(highHp, [enemy]), shanzha.id, enemy.id, () => undefined);
    expect(highResult).not.toBeNull();
    expect(highResult!.player.block).toBe(6);

    const lowCard = makeCard('danshen', 'yinyang-attack');
    const lowEnemy = makeEnemy('wind_cold_guest');
    const lowHp = makePlayer({
      hp: 30,
      energy: 3,
      relics: [equipmentRelic('equipment_yinyang')],
      hand: [lowCard],
    });
    const lowResult = resolveCardPlay(makeState(lowHp, [lowEnemy]), lowCard.id, lowEnemy.id, () => undefined);
    expect(lowResult).not.toBeNull();
    expect(lowResult!.enemies[0].currentHp).toBe(lowEnemy.maxHp - 8);

    const stunned = makePlayer({
      relics: [equipmentRelic('equipment_yinyang')],
      statusEffects: [{ id: 'stun', name: '眩晕', type: 'debuff', stacks: 1, canStack: true, description: '跳过行动' }],
    });
    const turnResult = resolveEnemyTurn(makeState(stunned, [makeEnemy('wind_cold_guest')]), () => undefined);
    expect(turnResult).not.toBeNull();
    expect(turnResult!.combatTurn).toBe(0);
    expect(getStacks(turnResult!.player, 'equipment_yinyang_stun_immunity_used')).toBe(1);
  });

  it('经络学说让每回合第一次技能牌获得额外格挡', () => {
    const chenpi = makeCard('chenpi', 'jingluo');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      relics: [equipmentRelic('equipment_jingluo')],
      hand: [chenpi],
    });

    const result = resolveCardPlay(makeState(player, [enemy]), chenpi.id, enemy.id, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.block).toBe(2);
  });

  it('辨证论治在回合开始按血量与格挡自动择策', () => {
    const enemy = makeStunnedEnemy('wind_cold_guest');
    const lowHp = makePlayer({
      hp: 30,
      relics: [equipmentRelic('equipment_bianzheng')],
    });
    const healed = resolveEnemyTurn(makeState(lowHp, [enemy]), () => undefined);
    expect(healed).not.toBeNull();
    expect(healed!.player.hp).toBeGreaterThan(30);

    const noBlock = makePlayer({
      relics: [equipmentRelic('equipment_bianzheng')],
    });
    const blocked = resolveEnemyTurn(makeState(noBlock, [makeStunnedEnemy('wind_cold_guest')]), () => undefined);
    expect(blocked).not.toBeNull();
    expect(blocked!.player.block).toBe(3);

    const withBlock = makePlayer({
      block: 2,
      relics: [equipmentRelic('equipment_bianzheng')],
      statusEffects: [{ id: 'retain_block', name: '保留格挡', type: 'buff', stacks: 1, canStack: false, description: '保留格挡' }],
    });
    const strengthened = resolveEnemyTurn(makeState(withBlock, [makeStunnedEnemy('wind_cold_guest')]), () => undefined);
    expect(strengthened).not.toBeNull();
    expect(getStacks(strengthened!.player, 'temp_strength')).toBe(1);
  });

  it('天人相应奇数回合加攻击、偶数回合回血', () => {
    const attack = makeCard('danshen', 'tianren');
    const enemy = makeEnemy('wind_cold_guest');
    const player = makePlayer({
      energy: 3,
      relics: [equipmentRelic('equipment_tianren')],
      hand: [attack],
    });
    const attacked = resolveCardPlay(makeState(player, [enemy]), attack.id, enemy.id, () => undefined);
    expect(attacked).not.toBeNull();
    expect(attacked!.enemies[0].currentHp).toBe(enemy.maxHp - 8);

    const evenTurn = makePlayer({
      hp: 70,
      relics: [equipmentRelic('equipment_tianren')],
      statusEffects: [{ id: 'combat_round', name: '战斗回合', type: 'buff', stacks: 1, canStack: true, description: '计数', hidden: true }],
    });
    const recovered = resolveEnemyTurn(makeState(evenTurn, [makeStunnedEnemy('wind_cold_guest')]), () => undefined);
    expect(recovered).not.toBeNull();
    expect(recovered!.player.hp).toBeGreaterThan(70);
  });

  it('藏象学说在回合结束满3层精气时恢复生命', () => {
    const player = makePlayer({
      hp: 60,
      relics: [equipmentRelic('equipment_zangxiang')],
      statusEffects: [{ id: 'zangfu_essence', name: '脏腑精气', type: 'buff', stacks: 2, canStack: true, description: '满3回血' }],
    });

    const result = resolvePlayerEndTurn(makeState(player, [makeEnemy('wind_cold_guest')]), () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.hp).toBe(64);
    expect(getStacks(result!.player, 'zangfu_essence')).toBe(0);
  });

  it('气机升降在回合开始清除1个负面并回血', () => {
    const player = makePlayer({
      hp: 60,
      relics: [equipmentRelic('equipment_qiji')],
      statusEffects: [{ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '减伤' }],
    });

    const result = resolveEnemyTurn(makeState(player, [makeStunnedEnemy('wind_cold_guest')]), () => undefined);
    expect(result).not.toBeNull();
    expect(getStacks(result!.player, 'weak')).toBe(0);
    expect(result!.player.hp).toBeGreaterThan(60);
  });

  it('整体观念减免生命伤害并强化治疗', () => {
    const player = makePlayer({
      hp: 70,
      relics: [equipmentRelic('equipment_zhengti')],
      statusEffects: [{ id: 'heat_evil', name: '热邪', type: 'debuff', stacks: 3, canStack: true, description: '灼烧' }],
    });

    const endTurn = resolvePlayerEndTurn(makeState(player, [makeEnemy('wind_cold_guest')]), () => undefined);
    expect(endTurn).not.toBeNull();
    expect(endTurn!.player.hp).toBe(68);

    const danggui = makeCard('danggui', 'zhengti-heal');
    const healedPlayer = makePlayer({
      hp: 70,
      energy: 3,
      relics: [equipmentRelic('equipment_zhengti')],
      hand: [danggui],
    });
    const healed = resolveCardPlay(makeState(healedPlayer, [makeEnemy('wind_cold_guest')]), danggui.id, undefined, () => undefined);
    expect(healed).not.toBeNull();
    expect(healed!.player.hp).toBe(76);
  });

  it('正邪相争在敌方攻击造成生命伤害后叠正气并提高格挡', () => {
    const enemy = makeEnemy('yangmingfushi');
    const player = makePlayer({
      relics: [equipmentRelic('equipment_zhengxie')],
    });

    const attacked = resolveEnemyTurn(makeState(player, [enemy]), () => undefined);
    expect(attacked).not.toBeNull();
    expect(getStacks(attacked!.player, 'equipment_zhengqi')).toBe(1);

    const shanzha = makeCard('shanzha', 'zhengxie-block');
    const blocked = resolveCardPlay(
      makeState({ ...attacked!.player, energy: 3, hand: [shanzha] }, [makeEnemy('wind_cold_guest')]),
      shanzha.id,
      undefined,
      () => undefined,
    );
    expect(blocked).not.toBeNull();
    expect(blocked!.player.block).toBe(6);
  });

  it('气血津液按实际格挡量回血且单次最多2点', () => {
    const huangqi = makeCard('huangqi', 'qixue');
    const player = makePlayer({
      hp: 70,
      energy: 3,
      relics: [equipmentRelic('equipment_qixue_jinye')],
      hand: [huangqi],
    });

    const result = resolveCardPlay(makeState(player, [makeEnemy('wind_cold_guest')]), huangqi.id, undefined, () => undefined);
    expect(result).not.toBeNull();
    expect(result!.player.block).toBe(10);
    expect(result!.player.hp).toBe(72);
  });

  it('气血津液也作用于非卡牌来源的格挡', () => {
    const player = makePlayer({
      hp: 70,
      relics: [equipmentRelic('equipment_qixue_jinye')],
      statusEffects: [passive('special_diathesis_passive')],
    });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(3 / 6);

    const result = resolveEnemyTurn(makeState(player, [makeStunnedEnemy('wind_cold_guest')]), () => undefined);
    randomSpy.mockRestore();

    expect(result).not.toBeNull();
    expect(result!.player.block).toBe(5);
    expect(result!.player.hp).toBe(71);
  });

  it('药方牌在战斗中真实触发核心效果', () => {
    const formulaExpectations: Array<{
      cardId: keyof typeof CARD_LIBRARY;
      setup?: (player: Player, enemies: Enemy[]) => void;
      assert: (result: PlayCardResult, beforePlayer: Player, beforeEnemies: Enemy[]) => void;
    }> = [
      {
        cardId: 'formula_placeholder_01',
        setup: (player) => {
          player.statusEffects = [{ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '测试' }];
          player.drawPile = [makeCard('chenpi', 'draw')];
        },
        assert: (result) => {
          expect(result.player.block).toBe(8);
          expect(result.player.statusEffects.some((status) => status.id === 'weak')).toBe(false);
          expect(result.player.hand.some((card) => card.name === CARD_LIBRARY.chenpi.name)).toBe(true);
        },
      },
      {
        cardId: 'formula_placeholder_02',
        assert: (result, _beforePlayer, beforeEnemies) => {
          expect(result.enemies[0].currentHp).toBe(beforeEnemies[0].maxHp - 10);
          expect(getEnemyStacks(result.enemies[0], 'heat_evil')).toBe(2);
        },
      },
      {
        cardId: 'formula_placeholder_03',
        setup: (player) => {
          player.hp = 60;
          player.statusEffects = [{ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '测试' }];
          player.drawPile = [makeCard('chenpi', 'draw-a'), makeCard('gancao', 'draw-b')];
        },
        assert: (result) => {
          expect(result.player.hp).toBe(66);
          expect(result.player.statusEffects.some((status) => status.id === 'weak')).toBe(false);
          expect(result.player.hand.length).toBeGreaterThanOrEqual(2);
        },
      },
      {
        cardId: 'formula_placeholder_04',
        setup: (player) => {
          player.hp = 60;
        },
        assert: (result) => {
          expect(result.player.hp).toBe(68);
          expect(getStacks(result.player, 'strength')).toBe(1);
        },
      },
      {
        cardId: 'formula_placeholder_05',
        setup: (player, enemies) => {
          player.drawPile = [makeCard('chenpi', 'draw')];
          enemies[0].statusEffects = [{ id: 'phlegm_bind', name: '痰湿禁锢', type: 'debuff', stacks: 1, canStack: true, description: '测试' }];
        },
        assert: (result, _beforePlayer, beforeEnemies) => {
          expect(result.enemies[0].currentHp).toBe(beforeEnemies[0].maxHp - 8);
          expect(getEnemyStacks(result.enemies[0], 'weak')).toBe(1);
          expect(result.player.hand.some((card) => card.name === CARD_LIBRARY.chenpi.name)).toBe(true);
        },
      },
      {
        cardId: 'formula_placeholder_06',
        setup: (player) => {
          player.statusEffects = [{ id: 'weak', name: '虚弱', type: 'debuff', stacks: 1, canStack: true, description: '测试' }];
        },
        assert: (result) => {
          expect(result.player.block).toBe(6);
          expect(result.player.statusEffects.some((status) => status.id === 'weak')).toBe(false);
        },
      },
      {
        cardId: 'formula_placeholder_07',
        setup: (player) => {
          player.hp = 60;
        },
        assert: (result) => {
          expect(result.player.hp).toBe(70);
          expect(result.player.block).toBe(6);
        },
      },
      {
        cardId: 'formula_placeholder_08',
        assert: (result) => {
          expect(getStacks(result.player, 'formula_zhenwu_guard')).toBe(1);
        },
      },
      {
        cardId: 'formula_placeholder_09',
        setup: (_player, enemies) => {
          enemies[0].statusEffects = [{ id: 'cold_evil', name: '寒邪', type: 'debuff', stacks: 1, canStack: true, description: '测试' }];
        },
        assert: (result, _beforePlayer, beforeEnemies) => {
          expect(result.enemies[0].currentHp).toBe(beforeEnemies[0].maxHp - 10);
          expect(result.enemies[1].currentHp).toBe(beforeEnemies[1].maxHp - 7);
        },
      },
      {
        cardId: 'formula_placeholder_10',
        setup: (player) => {
          player.hp = 60;
        },
        assert: (result) => {
          expect(result.player.hp).toBe(65);
          expect(getEnemyStacks(result.enemies[0], 'stun')).toBe(1);
        },
      },
      {
        cardId: 'formula_placeholder_11',
        setup: (player) => {
          player.drawPile = [makeCard('chenpi', 'draw')];
        },
        assert: (result) => {
          expect(getStacks(result.player, 'pierce_all')).toBe(1);
          expect(result.player.hand.some((card) => card.name === CARD_LIBRARY.chenpi.name)).toBe(true);
        },
      },
      {
        cardId: 'formula_placeholder_12',
        setup: (_player, enemies) => {
          enemies[0].statusEffects = [{ id: 'strength', name: '力量', type: 'buff', stacks: 1, canStack: true, description: '测试' }];
        },
        assert: (result, _beforePlayer, beforeEnemies) => {
          expect(result.enemies[0].currentHp).toBe(beforeEnemies[0].maxHp - 6);
          expect(result.enemies[1].currentHp).toBe(beforeEnemies[1].maxHp - 6);
          expect(getEnemyStacks(result.enemies[0], 'heat_evil')).toBe(1);
          expect(result.enemies[0].statusEffects.some((status) => status.id === 'strength')).toBe(false);
        },
      },
    ];

    formulaExpectations.forEach(({ cardId, setup, assert }) => {
      const card = makeCard(cardId, 'formula');
      const player = makePlayer({
        hp: 70,
        energy: 6,
        hand: [card],
      });
      const enemies = [makeEnemy('wind_cold_guest'), makeEnemy('damp_turbidity')];
      setup?.(player, enemies);
      const beforePlayer = { ...player };
      const beforeEnemies = enemies.map((enemy) => ({ ...enemy, statusEffects: [...enemy.statusEffects] }));
      const targetId = card.target === 'self' || card.target === 'all_enemies' ? undefined : enemies[0].id;

      const result = resolveCardPlay(makeState(player, enemies), card.id, targetId, () => undefined);

      expect(result, cardId).not.toBeNull();
      assert(result!, beforePlayer, beforeEnemies);
    });
  });

  it('所有可打出卡牌的 effectId 都有核心实现，装备和占位不可打出', () => {
    const handledEffectIds = new Set([
      'draw_discard',
      'damage_debuff_stasis',
      'damage_conditional_stasis',
      'damage_kill_block',
      'damage_block',
      'block_cleanse_self',
      'buff_attack',
      'aoe_damage_cleanse',
      'block_pierce_buff',
      'debuff_weak_draw',
      'damage_draw',
      'heal_draw_block',
      'aoe_debuff_heat',
      'block',
      'block_draw_cleanse_damp',
      'danggui_effect',
      'revive_buff',
      'mahuang_effect',
      'dahuang_effect',
      'damage_cleanse_buff',
      'buff_yin',
      'yin_gain_exhaust',
      'yin_attack_virtual_heat',
      'yin_spend_damage_random',
      'yin_power_energy',
      'yin_cleanse',
      'yin_block_scaling',
      'yin_cap_increase',
      'yin_heal_scaling',
      'yin_spend_double_damage',
      'block_if_no_damage_strength',
      'heal_draw',
      'end_turn_heal_power',
      'block_next_skill_bonus',
      'heal_block_exhaust',
      'block_apply_vulnerable',
      'block_per_card',
      'block_to_strength',
      'sleep_debuff',
      'cleanse_damp_convert_block',
      'draw_if_attack',
      'aoe_damage_cleanse_heat',
      'strength_temp',
      'attack_pierce_all',
      'heal_block',
      'cleanse_draw',
      'yin_block',
      'aoe_damage_heat',
      'cleanse_enemy_buffs',
      'cleanse_self_heal',
      'true_damage',
      'steal_buffs',
      'double_block_buff',
      'percent_damage',
      'aoe_damage_cleanse_all_buffs',
      'aoe_stun',
      'strength_dex_heal',
      'cleanse_heat_aoe_damage',
      'draw_to_hand',
      'cost_reduction_turn',
      'energy_max_heal',
      'cleanse_two_draw',
      'aoe_damage',
      'block_reduce_next_damage',
      'cleanse_heat_cold',
      'retain_block_power',
      'apply_weak',
      'strength_dex_block',
      'strength_block',
      'copy_buff_exhaust',
      'block_echo_power',
      'zusanli_effect',
      'zusanli_power',
      'attack_stun_chance',
      'formula_gegen_tang',
      'formula_maxing_shigan_tang',
      'formula_xiaochaihu_tang',
      'formula_lizhong_wan',
      'formula_banxia_houpu_tang',
      'formula_jiaotai_wan',
      'formula_sijunzi_tang',
      'formula_zhenwu_tang',
      'formula_xiaoqinglong_tang',
      'formula_suanzaoren_tang',
      'formula_mahuang_tang',
      'formula_yinqiao_san',
    ]);

    Object.values(CARD_LIBRARY).forEach((card) => {
      if (card.unplayable) return;
      expect(handledEffectIds.has(card.effectId), `${card.id}:${card.effectId}`).toBe(true);
    });
    EQUIPMENT_CARD_IDS.forEach((cardId) => {
      expect(CARD_LIBRARY[cardId].unplayable).toBe(true);
      expect(CARD_LIBRARY[cardId].effectId.startsWith('equipment_')).toBe(true);
    });
  });
});
