import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useGameStore } from './store/gameStore';
import { StartMenu } from './components/StartMenu';
import { IntroView } from './components/IntroView';
import { ensureRuntimeAssetLoadingStarted } from './hooks/useRuntimeAssetLoadingProgress';
import { useBgmAutoSwitch } from './hooks/useAudio';

const MapView = lazy(() => import('./components/MapView').then((module) => ({ default: module.MapView })));
const CombatView = lazy(() => import('./components/CombatView').then((module) => ({ default: module.CombatView })));
const RewardView = lazy(() => import('./components/RewardView').then((module) => ({ default: module.RewardView })));
const RestView = lazy(() => import('./components/RestView').then((module) => ({ default: module.RestView })));
const ShopView = lazy(() => import('./components/ShopView').then((module) => ({ default: module.ShopView })));
const EventView = lazy(() => import('./components/EventView').then((module) => ({ default: module.EventView })));
const ChestView = lazy(() => import('./components/ChestView').then((module) => ({ default: module.ChestView })));
const CardCodexView = lazy(() => import('./components/CardCodexView').then((module) => ({ default: module.CardCodexView })));

const CanvasProbe = () => (
  <canvas
    id="playwright-canvas"
    className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
  />
);

const GameSurface = ({ children }: { children: ReactNode }) => (
  <div style={{ fontSize: 'var(--app-font-size)' }} className="w-full h-full">
    <CanvasProbe />
    {children}
  </div>
);

const LazySurface = ({ children }: { children: ReactNode }) => (
  <GameSurface>
    <Suspense fallback={null}>{children}</Suspense>
  </GameSurface>
);

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

    return () => {
      delete (window as any).render_game_to_text;
    };
  }, []);

  // Apply global font size using CSS variable
  useEffect(() => {
      document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);

  if (phase === 'intro') {
    return (
        <GameSurface>
            <IntroView />
        </GameSurface>
    );
  }

  if (phase === 'start_menu') {
    return (
        <GameSurface>
            <StartMenu />
        </GameSurface>
    );
  }

  if (phase === 'map') {
    return (
        <LazySurface>
            <MapView />
        </LazySurface>
    );
  }

  if (phase === 'card_codex') {
    return (
        <LazySurface>
            <CardCodexView />
        </LazySurface>
    );
  }

  if (phase === 'combat') {
    return (
        <LazySurface>
            <CombatView />
        </LazySurface>
    );
  }

  if (phase === 'reward') {
    return (
        <LazySurface>
            <RewardView />
        </LazySurface>
    );
  }

  if (phase === 'chest') {
    return (
        <LazySurface>
            <ChestView />
        </LazySurface>
    );
  }

  if (phase === 'rest') {
    return (
        <LazySurface>
            <RestView />
        </LazySurface>
    );
  }

  if (phase === 'shop') {
    return (
        <LazySurface>
            <ShopView />
        </LazySurface>
    );
  }

  if (phase === 'event') {
    return (
        <LazySurface>
            <EventView />
        </LazySurface>
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
