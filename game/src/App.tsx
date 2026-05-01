import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { StartMenu } from './components/StartMenu';
import { IntroView } from './components/IntroView';
import { MapView } from './components/MapView';
import { CombatView } from './components/CombatView';
import { RewardView } from './components/RewardView';
import { RestView } from './components/RestView';
import { ShopView } from './components/ShopView';
import { EventView } from './components/EventView';
import { ChestView } from './components/ChestView';
import { CardCodexView } from './components/CardCodexView';
import { ensureRuntimeAssetLoadingStarted } from './hooks/useRuntimeAssetLoadingProgress';
import { useBgmAutoSwitch } from './hooks/useAudio';

function App() {
  const { phase, setPhase, fontSize } = useGameStore();

  useBgmAutoSwitch();

  useEffect(() => {
     useGameStore.setState({ phase: 'intro' });
  }, []);

  useEffect(() => {
    ensureRuntimeAssetLoadingStarted();
  }, []);

  useEffect(() => {
    const renderToText = () => {
      const state = useGameStore.getState();
      const payload = {
        note: 'turn-based card game, no spatial coordinates',
        phase: state.phase,
        act: state.currentAct,
        floor: state.currentFloor,
        node: state.currentNodeId,
        combatTurn: state.combatTurn,
        selectedEnemyId: state.selectedEnemyId,
        player: {
          hp: state.player.hp,
          maxHp: state.player.maxHp,
          energy: state.player.energy,
          maxEnergy: state.player.maxEnergy,
          block: state.player.block,
          gold: state.player.gold,
          statuses: state.player.statusEffects.map(effect => ({
            id: effect.id,
            stacks: effect.stacks,
            duration: effect.duration
          })),
          hand: state.player.hand.map(card => ({
            id: card.id,
            name: card.name,
            cost: card.cost,
            type: card.type,
            target: card.target,
            unplayable: card.unplayable || false
          })),
          piles: {
            draw: state.player.drawPile.length,
            discard: state.player.discardPile.length,
            exhaust: state.player.exhaustPile.length
          }
        },
        enemies: state.enemies.map(enemy => ({
          id: enemy.id,
          name: enemy.name,
          hp: enemy.currentHp,
          maxHp: enemy.maxHp,
          block: enemy.block,
          intent: enemy.intent,
          statuses: enemy.statusEffects.map(effect => ({
            id: effect.id,
            stacks: effect.stacks,
            duration: effect.duration
          }))
        })),
        intro:
          state.phase === 'intro'
            ? {
                title: '五行医道',
                cta: '进入主菜单',
              }
            : null,
        codex: state.phase === 'card_codex' ? ((window as any).__cardCodexState ?? null) : null,
      };
      return JSON.stringify(payload);
    };

    (window as any).render_game_to_text = renderToText;
    (window as any).advanceTime = (ms: number) => {
      useGameStore.getState().advanceTime(ms);
    };

    return () => {
      delete (window as any).render_game_to_text;
      delete (window as any).advanceTime;
    };
  }, []);

  // Apply global font size using CSS variable
  useEffect(() => {
      document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);

  if (phase === 'intro') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <IntroView />
        </div>
    );
  }

  if (phase === 'start_menu') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <StartMenu />
        </div>
    );
  }

  if (phase === 'map') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <MapView />
        </div>
    );
  }

  if (phase === 'card_codex') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <CardCodexView />
        </div>
    );
  }

  if (phase === 'combat') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <CombatView />
        </div>
    );
  }

  if (phase === 'reward') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <RewardView />
        </div>
    );
  }

  if (phase === 'chest') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <ChestView />
        </div>
    );
  }

  if (phase === 'rest') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <RestView />
        </div>
    );
  }

  if (phase === 'shop') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <ShopView />
        </div>
    );
  }

  if (phase === 'event') {
    return (
        <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
            <canvas
              id="playwright-canvas"
              className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
            />
            <EventView />
        </div>
    );
  }

  if (phase === 'game_over') {
    return (
       <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white space-y-8">
          <canvas
            id="playwright-canvas"
            className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
          />
          <h1 className="text-8xl font-bold text-red-600 drop-shadow-2xl">气绝</h1>
          <p className="text-2xl italic font-serif">医道漫长，且回炉再造...</p>
          <button 
            onClick={() => setPhase('start_menu')}
            className="px-12 py-4 bg-white text-black text-xl font-bold rounded-lg hover:bg-gray-200 transition-all"
          >
            重新开始
          </button>
       </div>
    );
  }

  return <div>Unknown Phase: {phase}</div>;
}

export default App;
