import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CARD_LIBRARY } from '../data/cards';
import { useGameStore } from './gameStore';
import * as progressiveAssets from '../utils/progressiveAssets';

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
      turnFlags: {
        playedAttack: false,
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
    expect(newState.map.length).toBe(8);
    expect(newState.enemyActionCue).toBeNull();
    expect(newState.playerImpactCue).toBeNull();
  });

  it('starts combat correctly', () => {
    const store = useGameStore.getState();
    store.startGame();
    const firstAvailableNode = useGameStore
      .getState()
      .map.flatMap((layer) => layer.nodes)
      .find((node) => node.status === 'available' && node.type !== 'start');

    expect(firstAvailableNode).toBeTruthy();
    store.startCombat(firstAvailableNode!.id);

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
    expect(newState.map.length).toBe(8);
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
    expect(afterPlay.enemies[0]?.currentHp).toBe(enemy!.maxHp - 7);
  });

  it('primes enemy media before starting an admin-selected battle', () => {
    const primeSpy = vi.spyOn(progressiveAssets, 'primeProgressiveAsset').mockResolvedValue(true);
    const store = useGameStore.getState();

    store.startAdminEnemyChallenge('damp_turbidity');

    expect(primeSpy).toHaveBeenCalledWith('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');
  });
});
