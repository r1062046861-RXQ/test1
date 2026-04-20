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

const NODE_META: Record<NodeType, { label: string; hint: string; icon: React.ReactNode }> = {
  start: { label: '起点', hint: '本幕路线的起始节点。', icon: <ScrollText size={18} /> },
  combat: { label: '战斗', hint: '稳步推进并补充牌组。', icon: <Skull size={18} /> },
  elite: { label: '精英', hint: '风险更高，回报也更高。', icon: <ShieldAlert size={18} /> },
  boss: { label: '首领', hint: '每一幕顶层的关键战。', icon: <Crown size={18} /> },
  event: { label: '事件', hint: '提供叙事与分支抉择。', icon: <ScrollText size={18} /> },
  shop: { label: '药铺', hint: '购牌、净化与资源调整。', icon: <ShoppingBag size={18} /> },
  rest: { label: '休憩', hint: '恢复生命或提升关键卡。', icon: <BedSingle size={18} /> },
  chest: { label: '宝箱', hint: '获得额外奖励与资源。', icon: <Gift size={18} /> },
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
      subtitle={`沿着当前路线推进至 ${ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]}`}
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
        <p className="map-page__aside-copy">
          先观察高亮可达节点，再决定这一段更该稳血、补牌，还是提前为下一幕积累金币与恢复机会。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>楼层 {Math.max(1, currentFloor)}</Badge>
          <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
          <Badge variant="blue">真气 {player.maxEnergy}</Badge>
          <Badge variant="amber">金币 {player.gold}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          <div className="map-page__note">
            <div className="map-page__note-title">路径判断</div>
            <div className="map-page__note-copy">普通战斗稳步补牌，事件改方向，药铺与休憩负责让后面的路线更可控。</div>
          </div>
          <div className="map-page__note">
            <div className="map-page__note-title">阶段目标</div>
            <div className="map-page__note-copy">每一幕顶层都会通向首领节点，进入中后段前要留意血量、金币和关键牌是否齐备。</div>
          </div>
        </div>
      </Panel>

      <Panel className="map-page__stage relative min-h-0 overflow-hidden px-4 py-4 md:px-5 md:py-5">
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <SectionTitle title="当前路径" hint="地图居中展开，选择高亮节点即可进入下一段巡诊。" />
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
                  {layer.nodes.map((node) => {
                    const meta = NODE_META[node.type];
                    const isAvailable = node.status === 'available';
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
                            whileHover={canEnter ? { scale: 1.08, y: -4 } : undefined}
                            whileTap={canEnter ? { scale: 0.98 } : undefined}
                            className={[
                              'map-page__node-shell',
                              isAvailable
                                ? 'map-page__node-shell--available animate-soft-pulse'
                                : isCompleted
                                  ? 'map-page__node-shell--completed'
                                  : 'map-page__node-shell--locked',
                            ].join(' ')}
                          >
                            {meta.icon}
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
          <SectionTitle title="路线说明" hint="辅助信息放在两侧，不抢地图本体的视觉位置。" />
          <div className="space-y-4 text-sm leading-7 text-stone-200/84">
            <p>起点会连向第一层可选节点，地图保留分支，方便你根据当前体质与牌组选择路线。</p>
            <p>普通战斗稳步补充牌组，事件与药铺负责调整方向，精英节点则检验你的辨证与资源调度。</p>
            <p>进入首领战前，优先确认生命、真气与关键牌是否足够支撑长线战斗。</p>
          </div>
        </Panel>

        <Panel className="map-page__aside px-5 py-5 md:px-6">
          <SectionTitle title="节点图例" hint="图标代表节点职责，不再显示内部英文键名。" />
          <div className="grid gap-3">
            {(Object.values(NODE_META) as Array<(typeof NODE_META)[NodeType]>).map((meta) => (
              <div key={meta.label} className="map-page__legend-item">
                <div className="map-page__legend-icon">{meta.icon}</div>
                <div>
                  <div className="map-page__legend-title">{meta.label}</div>
                  <div className="map-page__legend-copy">{meta.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
