import React from 'react';
import { motion } from 'framer-motion';
import { BedSingle, Crown, Lock, ScrollText, ShieldAlert, Skull, ShoppingBag } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getBossUnlockWinsRequired } from '../../../shared/core/gameCore';
import type { NodeType } from '../types';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

const ACT_TITLES = {
  1: '第一幕 · 风寒初起',
  2: '第二幕 · 邪热入里',
  3: '第三幕 · 五行失衡',
} as const;

const NODE_META: Record<NodeType, { label: string; hint: string; icon: React.ReactNode }> = {
  start: { label: '起点', hint: '本幕开始。', icon: <ScrollText size={18} /> },
  combat: { label: '战斗', hint: '补牌推进。', icon: <Skull size={18} /> },
  elite: { label: '精英', hint: '高风险高回报。', icon: <ShieldAlert size={18} /> },
  boss: { label: '首领', hint: '幕末决战。', icon: <Crown size={18} /> },
  event: { label: '事件', hint: '分支抉择。', icon: <ScrollText size={18} /> },
  shop: { label: '药房', hint: '买卖药材。', icon: <ShoppingBag size={18} /> },
  rest: { label: '休憩', hint: '恢复或净牌。', icon: <BedSingle size={18} /> },
  chest: { label: '', hint: '', icon: <></> },
};

const LAYER_SPACING = 110;
const NODE_CENTER_OFFSET = 22;

export const MapView: React.FC = () => {
  const { map, startCombat, currentFloor, currentAct, player, setPhase, combatWinsThisCycle = 0 } = useGameStore();
  const requiredWins = getBossUnlockWinsRequired();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const totalLayers = map.length;
  const mapHeight = Math.max(400, (Math.max(totalLayers, 1) - 1) * LAYER_SPACING + 100);

  const alignCurrentFloor = React.useCallback(() => {
    const container = mapContainerRef.current;
    if (!container || totalLayers === 0) return;
    const floorY = (totalLayers - 1 - currentFloor) * LAYER_SPACING + 24;
    const startY = (totalLayers - 1) * LAYER_SPACING + 24;
    const containerHeight = container.clientHeight;
    const maxTop = Math.max(0, container.scrollHeight - containerHeight);
    const targetTop =
      currentFloor <= 2
        ? Math.min(
            maxTop,
            Math.max(0, Math.max(floorY - containerHeight * 0.2, startY - containerHeight + 76)),
          )
        : Math.min(maxTop, Math.max(0, floorY - containerHeight * 0.3));
    container.scrollTo({ top: targetTop, behavior: 'auto' });
  }, [currentFloor, totalLayers]);

  React.useEffect(() => {
    let frameA = 0;
    let frameB = 0;

    const scheduleAlign = () => {
      frameA = window.requestAnimationFrame(() => {
        frameB = window.requestAnimationFrame(() => alignCurrentFloor());
      });
    };

    const handleResize = () => scheduleAlign();
    scheduleAlign();
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      observer = new ResizeObserver(() => scheduleAlign());
      observer.observe(mapContainerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [alignCurrentFloor]);

  if (!map || map.length === 0) {
    return (
      <PageShell
        tone="immersive"
        headerSurface="plain"
        className="map-page"
        headerClassName="map-page__header"
        title="巡诊地图"
        subtitle="当前还没有可用地图。"
        actions={<ActionButton onClick={() => setPhase('start_menu')}>返回主菜单</ActionButton>}
      >
        <div className="flex h-full items-center justify-center">
          <Panel className="px-8 py-10 text-center text-lg text-stone-700">请先从开始菜单发起新的巡诊。</Panel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      tone="immersive"
      headerSurface="plain"
      className="map-page"
      headerClassName="map-page__header"
      title="巡诊地图"
      subtitle={`当前幕次：${ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]}`}
      kicker="巡诊卷轴"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.4), rgba(6,8,14,0.84)), radial-gradient(circle at top, rgba(255,223,167,0.16), transparent 28%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 28%',
      }}
      actions={<ActionButton onClick={() => setPhase('start_menu')}>返回主菜单</ActionButton>}
      contentClassName="map-page__layout"
    >
      <Panel className="map-page__aside map-page__aside--left px-5 py-5 md:px-6">
        <div className="map-page__aside-kicker">当前幕次</div>
        <h2 className="map-page__act-title">{ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]}</h2>
        <p className="map-page__aside-copy">沿高亮节点推进，首领前尽量留住血线与关键牌。</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>楼层 {Math.max(1, currentFloor)}</Badge>
          <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
          <Badge variant="blue">真气 {player.maxEnergy}</Badge>
          <Badge variant="amber">金币 {player.gold}</Badge>
        </div>
        <div className="map-page__note mt-5">
          <div className="map-page__note-title">路线提示</div>
          <div className="map-page__note-copy">优先看下一层的可达节点，再决定补牌、休憩还是绕路。</div>
        </div>
      </Panel>

      <Panel className="map-page__stage relative min-h-0 overflow-hidden px-4 py-4 md:px-5 md:py-5">
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <SectionTitle title="当前路径" hint="进入页面会自动对齐当前可推进层。" />
          <div
            ref={mapContainerRef}
            className="ornate-scroll map-page__scroll relative min-h-0 flex-1 overflow-y-auto rounded-[26px] px-2 py-4"
          >
            <div className="relative mx-auto w-full max-w-4xl" style={{ minHeight: `${mapHeight}px` }}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {map.map((layer, layerIdx) =>
                  layer.nodes.flatMap((node) =>
                    node.children.map((childId) => {
                      const childLayer = map[layerIdx + 1];
                      const childNode = childLayer?.nodes.find((entry) => entry.id === childId);
                      if (!childNode) return null;
                      const y1 = (totalLayers - 1 - layerIdx) * LAYER_SPACING + NODE_CENTER_OFFSET;
                      const y2 = (totalLayers - 1 - (layerIdx + 1)) * LAYER_SPACING + NODE_CENTER_OFFSET;
                      return (
                        <line
                          key={`${node.id}-${childId}`}
                          x1={`${node.x}%`}
                          y1={y1}
                          x2={`${childNode.x}%`}
                          y2={y2}
                          stroke="rgba(243, 215, 160, 0.48)"
                          strokeWidth="2.5"
                          strokeDasharray={node.status === 'completed' ? '0' : '7 8'}
                          strokeLinecap="round"
                        />
                      );
                    }),
                  ),
                )}
              </svg>

              {map.map((layer, layerIndex) => (
                <div
                  key={layerIndex}
                  className="absolute w-full"
                  style={{ top: `${(totalLayers - 1 - layerIndex) * LAYER_SPACING}px` }}
                >
                  {layer.nodes.map((node, ni) => {
                    const meta = NODE_META[node.type];
                    const isNodeCol3 = layer.nodes.length === 4 && ni === 3;
                    const isConnector = isNodeCol3 && node.type === 'combat';

                    const isBoss = node.type === 'boss';
                    const isBossLane = isNodeCol3 && (node.type === 'boss' || node.type === 'rest');
                    const bossLocked = isBossLane && combatWinsThisCycle < requiredWins;
                    const isAvailable = node.status === 'available' && !bossLocked;
                    const isCompleted = node.status === 'completed';
                    const isLocked = node.status === 'locked' || bossLocked;
                    const canEnter = isAvailable && !isConnector && node.type !== 'start';

                    if (isConnector) {
                      return (
                        <div
                          key={node.id}
                          className="absolute flex w-10 -translate-x-1/2 flex-col items-center"
                          style={{ left: `${node.x}%` }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-stone-600/50" />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={node.id}
                        className={[
                          'absolute flex w-20 -translate-x-1/2 flex-col items-center gap-1.5 text-center',
                          canEnter ? 'cursor-pointer' : isLocked ? 'cursor-not-allowed opacity-45 grayscale' : 'cursor-default',
                        ].join(' ')}
                        style={{ left: `${node.x}%` }}
                      >
                        <button
                          type="button"
                          className="relative flex items-center justify-center"
                          disabled={!canEnter}
                          onClick={() => canEnter && startCombat(node.id)}
                        >
                          <motion.div
                            whileHover={canEnter ? { scale: 1.08, y: -4 } : undefined}
                            whileTap={canEnter ? { scale: 0.98 } : undefined}
                            className={[
                              'map-page__node-shell',
                              isBoss ? 'map-page__node-shell--boss' : '',
                              isAvailable
                                ? 'map-page__node-shell--available animate-soft-pulse'
                                : isCompleted
                                  ? 'map-page__node-shell--completed'
                                  : 'map-page__node-shell--locked',
                            ].join(' ')}
                          >
                            {bossLocked ? <Lock size={18} /> : meta.icon}
                          </motion.div>
                        </button>

                        <div className="map-page__node-label">{meta.label}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="map-page__aside-stack">
        <Panel className="map-page__aside px-5 py-5 md:px-6">
          <SectionTitle title="首领进度" hint={`击败 ${combatWinsThisCycle}/${requiredWins} 次解锁首领`} />
          <div className="mt-3 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
            {combatWinsThisCycle >= requiredWins ? '首领已解锁' : `还需 ${requiredWins - combatWinsThisCycle} 场战斗`}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
