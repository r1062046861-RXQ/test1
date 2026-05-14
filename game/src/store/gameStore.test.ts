import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CARD_LIBRARY,
  EQUIPMENT_CARD_IDS,
  FORMULA_CARD_IDS,
  STARTING_DECKS,
  countCardCopies,
  getCardCategory,
  getTemplateCardId,
} from '../data/cards';
import { FORMULA_BLUEPRINTS } from '../data/formulas';
import { useGameStore } from './gameStore';
import * as progressiveAssets from '../utils/progressiveAssets';
import { getMainlineActData } from '../../../shared/data/events';

describe('Game Store', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'start_menu',
      player: {
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
        gold: 0,
        obtainedCardIds: [],
        obtainedEnemyTemplateIds: [],
        knownFormulaBlueprintIds: [],
      },
      currentAct: 1,
      currentFloor: 0,
      map: [],
      currentNodeId: null,
      enemies: [],
      combatTurn: 0,
      selectedCardId: null,
      selectedEnemyId: null,
      volume: 1,
      shopRemovalCost: 75,
      combatLog: [],
      fontSize: 16,
      enemyActionCue: null,
      playerImpactCue: null,
      pendingEquipmentRewardId: null,
      pendingFormulaBlueprintId: null,
      shownFormulaPoemIds: [],
      turnFlags: {
        playedAttack: false,
        playedSkill: false,
        tookAttackDamage: false,
        cardsPlayed: 0,
      },
    });
  });

  it('starts game correctly', () => {
    const store = useGameStore.getState();
    store.startGame();

    const newState = useGameStore.getState();
    expect(newState.phase).toBe('map');
    expect(newState.player.deck.length).toBeGreaterThan(0);
    expect(newState.map.length).toBe(14);
    expect(newState.enemyActionCue).toBeNull();
    expect(newState.playerImpactCue).toBeNull();
  });

  it('creates valid 15-card starting decks for all constitutions', () => {
    const constitutionIds = [
      'balanced',
      'yin_deficiency',
      'qi_deficiency',
      'yang_deficiency',
      'phlegm_dampness',
      'damp_heat',
      'blood_stasis',
      'qi_stagnation',
      'special_diathesis',
      'admin',
    ];

    expect(Object.keys(STARTING_DECKS).sort()).toEqual([...constitutionIds].sort());
    constitutionIds.forEach((constitution) => {
      const deck = STARTING_DECKS[constitution];
      expect(deck).toHaveLength(15);
      deck.forEach((cardId) => {
        const card = CARD_LIBRARY[cardId];
        expect(card, `${constitution}:${cardId}`).toBeDefined();
        expect(getCardCategory(card)).toBe('herb');
        expect(card.unplayable).not.toBe(true);
      });
    });
  });

  it('allows multiple card instances of the same template while keeping the 10-copy limit', () => {
    const store = useGameStore.getState();

    for (let index = 0; index < 11; index += 1) {
      store.addCardToDeck('gancao');
    }

    const deck = useGameStore.getState().player.deck;
    expect(countCardCopies(deck, 'gancao')).toBe(10);

    const gancaoInstances = deck.filter((card) => getTemplateCardId(card) === 'gancao');
    expect(gancaoInstances).toHaveLength(10);
    expect(new Set(gancaoInstances.map((card) => card.id)).size).toBe(10);
  });

  it('starts migrated and new constitution runs with dispel-immune passives', () => {
    const store = useGameStore.getState();

    store.startGame('damp_heat');
    let state = useGameStore.getState();
    expect(state.player.constitution).toBe('damp_heat');
    expect(state.player.statusEffects).toContainEqual(expect.objectContaining({
      id: 'damp_heat_passive',
      dispelImmune: true,
    }));

    store.startGame('fire_heat' as any);
    state = useGameStore.getState();
    expect(state.player.constitution).toBe('damp_heat');
    expect(state.player.statusEffects).toContainEqual(expect.objectContaining({
      id: 'damp_heat_passive',
      dispelImmune: true,
    }));

    store.startGame('jing_deficiency' as any);
    state = useGameStore.getState();
    expect(state.player.constitution).toBe('special_diathesis');
    expect(state.player.statusEffects).toContainEqual(expect.objectContaining({
      id: 'special_diathesis_passive',
      dispelImmune: true,
    }));
  });

  it('gives the second brother route a lasting opening benefit instead of wasted healing', () => {
    const act1 = getMainlineActData(1, {});
    expect(act1).toBeTruthy();

    useGameStore.setState({
      currentEvent: {
        id: 'mainline_three_brothers_act1',
        title: act1!.title,
        description: act1!.description,
        options: act1!.options,
      },
      eventMarkers: {},
      eventQueue: [],
      player: {
        ...useGameStore.getState().player,
        hp: 80,
        maxHp: 80,
        gold: 0,
      },
    });

    useGameStore.getState().handleEventChoice('mainline_three_brothers_act1', 1);

    const state = useGameStore.getState();
    expect(state.player.maxHp).toBe(82);
    expect(state.player.hp).toBe(82);
    expect(state.player.gold).toBe(50);
    expect(state.eventMarkers?.three_brothers).toBe('erge');
  });

  it('starts combat correctly', () => {
    const store = useGameStore.getState();
    store.startGame();
    store.startAdminEnemyChallenge('wind_cold_guest');

    const newState = useGameStore.getState();
    expect(newState.phase).toBe('combat');
    expect(newState.enemies.length).toBe(1);
    expect(newState.player.hand.length).toBe(5);
    expect(newState.enemyActionCue).toBeNull();
    expect(newState.playerImpactCue).toBeNull();
  });

  it('starts an admin-selected enemy challenge with the correct act and battle state', () => {
    const store = useGameStore.getState();

    store.startAdminEnemyChallenge('boss_spleen_damp');

    const newState = useGameStore.getState();
    expect(newState.phase).toBe('combat');
    expect(newState.currentAct).toBe(2);
    expect(newState.currentNodeId).toBe('admin_enemy_boss_spleen_damp');
    expect(newState.map.length).toBe(14);
    expect(newState.enemies).toHaveLength(1);
    expect(newState.enemies[0]?.name).toBe('脾虚湿困');
    expect(newState.player.constitution).toBe('balanced');
    expect(newState.player.hand.length).toBe(5);
  });

  it('routes admin-selected enemy victories to reward without boss progression side effects', () => {
    const store = useGameStore.getState();

    store.startAdminEnemyChallenge('boss_five_elements');
    store.completeCombat();

    const newState = useGameStore.getState();
    expect(newState.phase).toBe('reward');
    expect(newState.currentAct).toBe(3);
    expect(newState.currentFloor).toBe(0);
    expect(newState.currentNodeId).toBeNull();
    expect(newState.pendingFormulaBlueprintId).toBeNull();
  });

  it('rolls equipment drops from normal map combat without adding equipment to card piles', () => {
    const store = useGameStore.getState();
    store.startGame();
    const map = useGameStore.getState().map;
    const combatNode = map.flatMap(layer => layer.nodes).find(node => node.type === 'combat');
    expect(combatNode).toBeDefined();

    combatNode!.status = 'available';
    useGameStore.setState({
      map,
      currentNodeId: combatNode!.id,
      player: {
        ...useGameStore.getState().player,
        hand: [],
        drawPile: [],
        discardPile: [],
      },
    });
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValue(0)
      .mockReturnValueOnce(0.09)
      .mockReturnValueOnce(0);

    store.completeCombat();
    randomSpy.mockRestore();

    const nextState = useGameStore.getState();
    expect(nextState.pendingEquipmentRewardId).toBe(EQUIPMENT_CARD_IDS[0]);
    expect(nextState.pendingFormulaBlueprintId).toBe(FORMULA_BLUEPRINTS[0].id);
    expect(nextState.player.relics).toContainEqual(expect.objectContaining({ id: EQUIPMENT_CARD_IDS[0] }));
    expect(nextState.player.obtainedCardIds).toContain(EQUIPMENT_CARD_IDS[0]);
    expect(nextState.player.deck.some((card) => getCardCategory(card) === 'equipment')).toBe(false);
    expect(nextState.player.hand.some((card) => getCardCategory(card) === 'equipment')).toBe(false);
    expect(nextState.player.drawPile.some((card) => getCardCategory(card) === 'equipment')).toBe(false);
    expect(nextState.player.discardPile.some((card) => getCardCategory(card) === 'equipment')).toBe(false);
  });

  it('does not drop equipment for admin challenge victories', () => {
    const store = useGameStore.getState();
    store.startAdminEnemyChallenge('wind_cold_guest');
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    store.completeCombat();
    randomSpy.mockRestore();

    const nextState = useGameStore.getState();
    expect(nextState.pendingEquipmentRewardId).toBeNull();
    expect(nextState.pendingFormulaBlueprintId).toBeNull();
    expect(nextState.player.relics).toHaveLength(0);
  });

  it('awards one real formula blueprint after normal map combat and records it idempotently', () => {
    const store = useGameStore.getState();
    store.startGame();
    const map = useGameStore.getState().map;
    const combatNode = map.flatMap(layer => layer.nodes).find(node => node.type === 'combat');
    expect(combatNode).toBeDefined();

    combatNode!.status = 'available';
    useGameStore.setState({
      map,
      currentNodeId: combatNode!.id,
    });
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValue(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.42);

    store.completeCombat();
    randomSpy.mockRestore();

    const expectedBlueprintId = FORMULA_BLUEPRINTS[Math.floor(0.42 * FORMULA_BLUEPRINTS.length)].id;
    expect(useGameStore.getState().pendingFormulaBlueprintId).toBe(expectedBlueprintId);

    const first = useGameStore.getState().recordFormulaBlueprint(expectedBlueprintId);
    const second = useGameStore.getState().recordFormulaBlueprint(expectedBlueprintId);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(useGameStore.getState().player.knownFormulaBlueprintIds.filter((id) => id === expectedBlueprintId)).toHaveLength(1);
  });

  it('allows equipment duplicates since equipment is no longer unique', () => {
    const store = useGameStore.getState();
    store.startGame();
    const map = useGameStore.getState().map;
    const combatNode = map.flatMap(layer => layer.nodes).find(node => node.type === 'combat');
    expect(combatNode).toBeDefined();

    combatNode!.status = 'available';
    useGameStore.setState({
      map,
      currentNodeId: combatNode!.id,
      player: {
        ...useGameStore.getState().player,
        relics: [
          {
            id: EQUIPMENT_CARD_IDS[0],
            name: CARD_LIBRARY[EQUIPMENT_CARD_IDS[0]].name,
            description: CARD_LIBRARY[EQUIPMENT_CARD_IDS[0]].description,
            effectId: CARD_LIBRARY[EQUIPMENT_CARD_IDS[0]].effectId,
          },
        ],
      },
    });
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValue(0)
      .mockReturnValueOnce(0.09)
      .mockReturnValueOnce(0);

    store.completeCombat();
    randomSpy.mockRestore();

    const relicIds = useGameStore.getState().player.relics.map((relic) => relic.id);
    expect(relicIds.filter((id) => id === EQUIPMENT_CARD_IDS[0])).toHaveLength(2);
    expect(useGameStore.getState().pendingEquipmentRewardId).toBe(EQUIPMENT_CARD_IDS[0]);
    expect(useGameStore.getState().pendingFormulaBlueprintId).toBe(FORMULA_BLUEPRINTS[0].id);
  });

  it('子午流注让非首回合补牌上限提高到6', () => {
    useGameStore.setState({
      phase: 'combat',
      bossKills: 3,
      player: {
        ...useGameStore.getState().player,
        relics: [
          {
            id: 'equipment_ziwuliuzhu',
            name: CARD_LIBRARY.equipment_ziwuliuzhu.name,
            description: CARD_LIBRARY.equipment_ziwuliuzhu.description,
            effectId: CARD_LIBRARY.equipment_ziwuliuzhu.effectId,
          },
        ],
      },
    });

    expect(useGameStore.getState().getDrawPerTurn()).toBe(6);
  });

  it('装备的战斗开始格挡和地图治疗会触发装备被动', () => {
    const zhiweibing = {
      id: 'equipment_zhiweibing',
      name: CARD_LIBRARY.equipment_zhiweibing.name,
      description: CARD_LIBRARY.equipment_zhiweibing.description,
      effectId: CARD_LIBRARY.equipment_zhiweibing.effectId,
    };
    const qixueJinye = {
      id: 'equipment_qixue_jinye',
      name: CARD_LIBRARY.equipment_qixue_jinye.name,
      description: CARD_LIBRARY.equipment_qixue_jinye.description,
      effectId: CARD_LIBRARY.equipment_qixue_jinye.effectId,
    };
    const zhengti = {
      id: 'equipment_zhengti',
      name: CARD_LIBRARY.equipment_zhengti.name,
      description: CARD_LIBRARY.equipment_zhengti.description,
      effectId: CARD_LIBRARY.equipment_zhengti.effectId,
    };

    const store = useGameStore.getState();
    store.startGame();
    const started = useGameStore.getState();
    const combatNode = started.map.flatMap(layer => layer.nodes).find(node => node.type === 'combat');
    expect(combatNode).toBeDefined();

    combatNode!.status = 'available';
    useGameStore.setState({
      map: started.map,
      currentNodeId: combatNode!.id,
      player: {
        ...started.player,
        hp: 70,
        relics: [zhiweibing, qixueJinye, zhengti],
      },
    });

    store.startCombat(combatNode!.id);
    const inCombat = useGameStore.getState();
    expect(inCombat.player.block).toBe(5);
    expect(inCombat.player.hp).toBe(71);

    useGameStore.setState({
      phase: 'rest',
      player: {
        ...inCombat.player,
        hp: 70,
      },
    });
    store.healPlayer(2);
    expect(useGameStore.getState().player.hp).toBe(73);
  });

  it('keeps first-turn damage against boss_liver_fire in the store immediately after playing an attack', () => {
    const store = useGameStore.getState();

    store.startAdminEnemyChallenge('boss_liver_fire');
    const started = useGameStore.getState();
    const enemy = started.enemies[0];
    expect(enemy).toBeTruthy();

    const card = { ...CARD_LIBRARY.danshen, id: 'test_danshen_liver_fire' };
    useGameStore.setState({
      player: {
        ...started.player,
        energy: 3,
        hand: [card],
      },
    });

    useGameStore.getState().playCard(card.id, enemy!.id);

    const afterPlay = useGameStore.getState();
    expect(afterPlay.enemies[0]?.currentHp).toBe(enemy!.maxHp - 8);
  });

  it('primes enemy media before starting an admin-selected battle', () => {
    const primeSpy = vi.spyOn(progressiveAssets, 'primeProgressiveAsset').mockResolvedValue(true);
    const store = useGameStore.getState();

    store.startAdminEnemyChallenge('damp_turbidity');

    expect(primeSpy).toHaveBeenCalledWith('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');
  });

  it('formula blueprints use ready full recipes and formula cards stay out of normal pools', () => {
    expect(FORMULA_BLUEPRINTS).toHaveLength(12);
    FORMULA_BLUEPRINTS.forEach((blueprint) => {
      expect(blueprint.status).toBe('ready');
      expect(blueprint.ingredientCardIds.length).toBeGreaterThanOrEqual(2);
      blueprint.ingredientCardIds.forEach((cardId) => {
        expect(CARD_LIBRARY[cardId], `${blueprint.id}:${cardId}`).toBeDefined();
        expect(getCardCategory(CARD_LIBRARY[cardId])).toBe('herb');
      });

      const formulaCard = CARD_LIBRARY[blueprint.formulaCardId];
      expect(formulaCard).toBeDefined();
      expect(getCardCategory(formulaCard)).toBe('formula');
      expect(formulaCard.unplayable).not.toBe(true);
    });

    FORMULA_CARD_IDS.forEach((cardId) => {
      useGameStore.getState().addCardToDeck(cardId);
    });
    expect(useGameStore.getState().player.deck.some((card) => getCardCategory(card) === 'formula')).toBe(false);
  });

  it('records formula blueprints once and crafts a formula from full ingredients with once-per-run poem', () => {
    const store = useGameStore.getState();
    store.startGame();

    const blueprintId = 'blueprint_formula_placeholder_11';
    const blueprint = FORMULA_BLUEPRINTS.find((entry) => entry.id === blueprintId)!;
    const makeIngredientDeck = (suffix: string) =>
      blueprint.ingredientCardIds.map((cardId, index) => ({
        ...CARD_LIBRARY[cardId],
        id: `${suffix}_${cardId}_${index}`,
      }));

    const first = useGameStore.getState().recordFormulaBlueprint(blueprintId);
    const second = useGameStore.getState().recordFormulaBlueprint(blueprintId);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(useGameStore.getState().player.knownFormulaBlueprintIds).toEqual([blueprintId]);

    const firstDeck = makeIngredientDeck('first');
    useGameStore.setState({
      phase: 'map',
      player: {
        ...useGameStore.getState().player,
        deck: firstDeck,
      },
    });
    const firstCraft = useGameStore.getState().craftFormulaFromBlueprint(blueprintId, firstDeck.map((card) => card.id));

    expect(firstCraft).toMatchObject({
      ok: true,
      formulaCardId: blueprint.formulaCardId,
      showPoem: true,
    });
    expect(firstCraft.poem).toContain('麻黄汤');
    expect(useGameStore.getState().player.deck).toHaveLength(1);
    expect(getCardCategory(useGameStore.getState().player.deck[0])).toBe('formula');
    expect(useGameStore.getState().player.obtainedCardIds).toContain(blueprint.formulaCardId);

    const secondDeck = makeIngredientDeck('second');
    useGameStore.setState({
      player: {
        ...useGameStore.getState().player,
        deck: secondDeck,
      },
    });
    const secondCraft = useGameStore.getState().craftFormulaFromBlueprint(blueprintId, secondDeck.map((card) => card.id));
    expect(secondCraft).toMatchObject({ ok: true, showPoem: false });

    store.startGame();
    store.recordFormulaBlueprint(blueprintId);
    const thirdDeck = makeIngredientDeck('third');
    useGameStore.setState({
      phase: 'map',
      player: {
        ...useGameStore.getState().player,
        deck: thirdDeck,
      },
    });
    const thirdCraft = useGameStore.getState().craftFormulaFromBlueprint(blueprintId, thirdDeck.map((card) => card.id));
    expect(thirdCraft).toMatchObject({ ok: true, showPoem: true });
  });

  it('rejects incomplete, duplicated, mismatched, and non-herb formula ingredients', () => {
    const store = useGameStore.getState();
    store.startGame();
    const blueprintId = 'blueprint_formula_placeholder_06';
    const blueprint = FORMULA_BLUEPRINTS.find((entry) => entry.id === blueprintId)!;
    store.recordFormulaBlueprint(blueprintId);

    const ingredientDeck = blueprint.ingredientCardIds.map((cardId, index) => ({
      ...CARD_LIBRARY[cardId],
      id: `ingredient_${cardId}_${index}`,
    }));
    const formulaAsMaterial = { ...CARD_LIBRARY.formula_placeholder_11, id: 'bad_formula_material' };
    useGameStore.setState({
      phase: 'map',
      player: {
        ...useGameStore.getState().player,
        deck: [...ingredientDeck, formulaAsMaterial],
      },
    });

    expect(useGameStore.getState().craftFormulaFromBlueprint(blueprintId, ingredientDeck.slice(0, 1).map((card) => card.id))).toMatchObject({
      ok: false,
      reason: 'invalid_ingredients',
    });
    expect(useGameStore.getState().craftFormulaFromBlueprint(blueprintId, [ingredientDeck[0].id, ingredientDeck[0].id])).toMatchObject({
      ok: false,
      reason: 'invalid_ingredients',
    });
    expect(useGameStore.getState().craftFormulaFromBlueprint(blueprintId, [ingredientDeck[0].id, formulaAsMaterial.id])).toMatchObject({
      ok: false,
      reason: 'invalid_ingredients',
    });

    const wrongHerb = { ...CARD_LIBRARY.gancao, id: 'wrong_gancao' };
    useGameStore.setState({
      player: {
        ...useGameStore.getState().player,
        deck: [ingredientDeck[0], wrongHerb],
      },
    });
    expect(useGameStore.getState().craftFormulaFromBlueprint(blueprintId, [ingredientDeck[0].id, wrongHerb.id])).toMatchObject({
      ok: false,
      reason: 'ingredients_mismatch',
    });
  });

  it('blocks formula crafting outside non-combat crafting phases', () => {
    const store = useGameStore.getState();
    store.startGame();
    useGameStore.setState({ phase: 'combat' });

    const recordResult = useGameStore.getState().recordFormulaBlueprint('blueprint_formula_placeholder_01');
    const craftResult = useGameStore.getState().craftFormulaFromBlueprint('blueprint_formula_placeholder_01', []);

    expect(recordResult).toMatchObject({ ok: false, reason: 'phase_unavailable' });
    expect(craftResult).toMatchObject({ ok: false, reason: 'phase_unavailable' });
  });
});
