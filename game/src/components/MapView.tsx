import React from 'react';
import { motion } from 'framer-motion';
import { BedSingle, Crown, Gift, ScrollText, ShieldAlert, Skull, ShoppingBag } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { NodeType } from '../types';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

const ACT_TITLES = {
  1: '第一幕 · 风寒初起',
  2: '第二幕 · 邪热入里',
  3: '第三幕 · 五行失衡',
} as const;

const NODE_META: Record<NodeType, { label: string; icon: React.ReactNode }> = {
  start: { label: '起点', icon: <ScrollText size={18} /> },
  combat: { label: '战斗', icon: <Skull size={18} /> },
  elite: { label: '精英', icon: <ShieldAlert size={18} /> },
  boss: { label: 'Boss', icon: <Crown size={18} /> },
  event: { label: '事件', icon: <ScrollText size={18} /> },
  shop: { label: '药铺', icon: <ShoppingBag size={18} /> },
  rest: { label: '休憩', icon: <BedSingle size={18} /> },
  chest: { label: '宝箱', icon: <Gift size={18} /> },
};

const LAYER_SPACING = 118;
const NODE_CENTER_OFFSET = 28;

export const MapView: React.FC = () => {
  const { map, startCombat, currentFloor, currentAct, player, setPhase } = useGameStore();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const totalLayers = map.length;
  const mapHeight = Math.max(720, (Math.max(totalLayers, 1) - 1) * LAYER_SPACING + 160);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!mapContainerRef.current || totalLayers === 0) return;
      const floorY = (totalLayers - 1 - currentFloor) * LAYER_SPACING + 24;
      const containerHeight = mapContainerRef.current.clientHeight;
      mapContainerRef.current.scrollTop = Math.max(0, floorY - containerHeight * 0.58);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentFloor, totalLayers]);

  if (!map || map.length === 0) {
    return (
      <PageShell
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

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5">
        <Badge>楼层 {Math.max(1, currentFloor)}</Badge>
        <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
        <Badge variant="blue">真气 {player.maxEnergy}</Badge>
        <Badge variant="amber">金币 {player.gold}</Badge>
      </div>
      <div className="text-xs tracking-[0.12em] text-stone-600 md:text-sm">选择高亮节点，规划下一段巡诊路径。</div>
    </div>
  );

  return (
    <PageShell
      title="巡诊地图"
      subtitle={`沿着当前路线推进至 ${ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]}`}
      kicker="巡诊卷轴"
      actions={<ActionButton onClick={() => setPhase('start_menu')}>返回主菜单</ActionButton>}
      footer={footer}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="relative min-h-0 overflow-hidden px-4 py-4 md:px-5">
          <div
            className="absolute inset-0 opacity-35"
            style={{ backgroundImage: resolveAssetBackground('/assets/background_map.png'), backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,249,235,0.88),rgba(236,224,200,0.92))]" />
          <div className="relative z-10 flex h-full min-h-0 flex-col">
            <SectionTitle title={ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]} hint="沿节点推进巡诊，在战斗、际遇与调息之间规划路径。" />
            <div
              ref={mapContainerRef}
              className="ornate-scroll relative min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-amber-900/10 bg-white/20 px-2 py-4"
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
                            stroke="rgba(92, 60, 26, 0.45)"
                            strokeWidth="2.5"
                            strokeDasharray={node.status === 'completed' ? '0' : '6 8'}
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
                    {layer.nodes.map((node) => {
                      const meta = NODE_META[node.type];
                      const isAvailable = node.status === 'available';
                      const isCurrent = node.status === 'current';
                      const isCompleted = node.status === 'completed';
                      const isLocked = node.status === 'locked';
                      const canEnter = isAvailable && node.type !== 'start';

                      return (
                        <div
                          key={node.id}
                          className={[
                            'absolute flex w-28 -translate-x-1/2 flex-col items-center gap-2 text-center',
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
                              whileHover={canEnter ? { scale: 1.06, y: -3 } : undefined}
                              whileTap={canEnter ? { scale: 0.98 } : undefined}
                              className={[
                                'flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-[0_10px_20px_rgba(35,22,10,0.16)] transition-all',
                                isAvailable
                                  ? 'animate-soft-pulse border-amber-800 bg-gradient-to-b from-amber-200 to-amber-400 text-amber-950'
                                  : isCurrent
                                    ? 'border-amber-900 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950'
                                    : isCompleted
                                      ? 'border-stone-700 bg-gradient-to-b from-stone-300 to-stone-400 text-stone-800'
                                      : 'border-stone-500 bg-stone-300 text-stone-600',
                              ].join(' ')}
                            >
                              {meta.icon}
                            </motion.div>
                          </button>

                          <div className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold tracking-[0.14em] text-stone-700 shadow-sm">
                            {meta.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid min-h-0 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
          <Panel className="px-5 py-4">
            <SectionTitle title="路线说明" hint="先看可达节点，再判断这轮更该补强牌组、保血还是攒金。" />
            <div className="mt-3 space-y-3 text-sm leading-7 text-stone-700">
              <p>起点会连向第一层可选节点，地图保留分支，方便你根据当前体质与牌组选择路线。</p>
              <p>普通战斗稳步补充牌组，事件与药铺负责调整方向，精英节点则检验你的辨证与资源调度。</p>
              <p>每一幕顶层都会通向 Boss 节点，请提前规划血量、金币与休憩节奏。</p>
            </div>
          </Panel>

          <Panel className="min-h-0 overflow-hidden px-4 py-4">
            <SectionTitle title="节点图例" />
            <div className="ornate-scroll grid max-h-full gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {(Object.entries(NODE_META) as Array<[NodeType, (typeof NODE_META)[NodeType]]>).map(([key, meta]) => (
                <div key={key} className="inset-panel flex items-center gap-3 px-3 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-900/15 bg-amber-100 text-amber-950">
                    {meta.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">{meta.label}</div>
                    <div className="text-[12px] tracking-[0.12em] text-stone-500">{key}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
};
