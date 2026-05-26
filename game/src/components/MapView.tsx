import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedSingle,
  ChevronLeft,
  Crown,
  Lock,
  ScrollText,
  ShieldAlert,
  Skull,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getBossUnlockWinsRequired } from '../../../shared/core/gameCore';
import type { Card as CardData, NodeType } from '../types';
import { CARD_LIBRARY, countCardsByTemplate } from '../data/cards';
import { resolveAssetUrl } from '../utils/assets';
import { SynthesisBench } from './SynthesisBench';

const REF_W = 1920;
const REF_H = 1080;

const refRect = (left: number, top: number, width: number, height: number): React.CSSProperties => ({
  left: `${(left / REF_W) * 100}%`,
  top: `${(top / REF_H) * 100}%`,
  width: `${(width / REF_W) * 100}%`,
  height: `${(height / REF_H) * 100}%`,
});

const localRect = (
  left: number,
  top: number,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number,
): React.CSSProperties => ({
  left: `${(left / containerWidth) * 100}%`,
  top: `${(top / containerHeight) * 100}%`,
  width: `${(width / containerWidth) * 100}%`,
  height: `${(height / containerHeight) * 100}%`,
});

const leftPanelRect = (left: number, top: number, width: number, height: number) =>
  localRect(left, top, width, height, 386, 905);

const rightPanelRect = (left: number, top: number, width: number, height: number) =>
  localRect(left, top, width, height, 325, 905);

const MAP_ASSET_BASE = '/assets/map/v2';

const MAP_ASSETS = {
  routeFrame: `${MAP_ASSET_BASE}/route_frame.png`,
  routeTitleDivider: `${MAP_ASSET_BASE}/route_title_divider.png`,
  rightDivider: `${MAP_ASSET_BASE}/right_divider.png`,
  routeHintPanel: `${MAP_ASSET_BASE}/route_hint_panel.png`,
  routeHintIcon: `${MAP_ASSET_BASE}/route_hint_icon.png`,
  bossProgressPlate: `${MAP_ASSET_BASE}/boss_progress_plate.png`,
  bossLampComplete: `${MAP_ASSET_BASE}/boss_lamp_complete.png`,
  bossLampPending: `${MAP_ASSET_BASE}/boss_lamp_pending.png`,
  statFloor: `${MAP_ASSET_BASE}/stat_floor.png`,
  statHp: `${MAP_ASSET_BASE}/stat_hp.png`,
  statGold: `${MAP_ASSET_BASE}/stat_gold.png`,
  statEnergy: `${MAP_ASSET_BASE}/stat_energy.png`,
} as const;

const ACT_TITLES = {
  1: '第一幕\n风寒初起',
  2: '第二幕\n邪热入里',
  3: '第三幕\n五行失衡',
} as const;

const ACT_SUBTITLES = {
  1: '沿高亮节点推进，首领前尽量留住血线与关键牌。',
  2: '邪热渐深，斟酌补牌、休息与药房路线。',
  3: '五行气机失衡，稳住节奏再赴终局。',
} as const;

const NODE_META: Record<NodeType, { label: string; icon: React.ReactNode }> = {
  start: { label: '起点', icon: <ScrollText size={24} /> },
  combat: { label: '战斗', icon: <Skull size={24} /> },
  elite: { label: '精英', icon: <ShieldAlert size={24} /> },
  boss: { label: '首领', icon: <Crown size={28} /> },
  event: { label: '奇遇', icon: <ScrollText size={24} /> },
  shop: { label: '药房', icon: <ShoppingBag size={24} /> },
  rest: { label: '休憩', icon: <BedSingle size={24} /> },
  chest: { label: '宝箱', icon: <ScrollText size={24} /> },
};

const LAYER_SPACING = 118;
const NODE_CENTER_OFFSET = 34;

const getMapBackground = (currentAct: number) => {
  if (currentAct === 1) return '/assets/background_map_act1.png';
  if (currentAct === 2) return '/assets/background_map_act2.webp';
  return '/assets/background_main_menu.png';
};

type HandOverviewProps = {
  deck: CardData[];
  relics: Array<{ id: string; name: string; description: string; effectId: string }>;
};

const HandOverview: React.FC<HandOverviewProps> = ({ deck, relics }) => {
  const [open, setOpen] = React.useState(false);
  const templateCounts = React.useMemo(() => countCardsByTemplate(deck), [deck]);
  const sorted = React.useMemo(
    () => Object.entries(templateCounts).sort(([, a], [, b]) => b.count - a.count),
    [templateCounts],
  );
  const relicCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    relics.forEach((relic) => counts.set(relic.id, (counts.get(relic.id) ?? 0) + 1));
    return Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  }, [relics]);

  return (
    <>
      <button
        type="button"
        className="map-v2-action map-v2-action--deck"
        style={refRect(1576, 829, 260, 72)}
        aria-label={`查看牌组，当前 ${deck.length} 张牌`}
        onClick={() => setOpen(true)}
      >
        <ScrollText size={26} aria-hidden="true" />
        <span className="map-v2-action__label">手牌一览</span>
        <span className="map-v2-action__count">{deck.length} 牌</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="synthesis-bench-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="synthesis-bench"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
              style={{ maxWidth: '680px', maxHeight: 'min(600px, calc(100vh - 36px))' }}
            >
              <div className="synthesis-bench__header">
                <div className="min-w-0">
                  <div className="chapter-kicker">巡诊行囊</div>
                  <h2 className="synthesis-bench__title">手牌一览</h2>
                </div>
                <button type="button" className="synthesis-bench__close" aria-label="关闭" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ornate-scroll p-4" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {sorted.map(([templateId, count]) => {
                    const card = CARD_LIBRARY[templateId];
                    if (!card) return null;
                    return (
                      <div key={templateId} className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-[rgba(255,255,255,0.04)] px-3 py-2">
                        {card.image ? (
                          <img src={resolveAssetUrl(card.image)} alt="" className="h-12 w-8 shrink-0 rounded-md object-cover" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-amber-100">{card.name}</div>
                          <div className="text-xs text-stone-400">x{count.count}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {relicCounts.length > 0 ? (
                  <>
                    <div className="chapter-kicker mt-5 mb-2">已获装备</div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                      {relicCounts.map(([relicId, count]) => {
                        const relic = relics.find((entry) => entry.id === relicId);
                        if (!relic) return null;
                        const relicCard = CARD_LIBRARY[relicId];
                        return (
                          <div key={relicId} className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-[rgba(255,255,255,0.04)] px-3 py-2">
                            {relicCard?.image ? (
                              <img src={resolveAssetUrl(relicCard.image)} alt="" className="h-12 w-8 shrink-0 rounded-md object-cover" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-amber-100">{relic.name}</div>
                              <div className="text-xs text-stone-400">x{count}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {sorted.length === 0 && relicCounts.length === 0 ? (
                  <div className="py-12 text-center text-stone-400">牌组为空</div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

type StatPillProps = {
  asset: string;
  label: string;
  value: string | number;
  style: React.CSSProperties;
};

const StatPill: React.FC<StatPillProps> = ({ asset, label, value, style }) => (
  <div className="map-v2-stat" style={style}>
    <img src={resolveAssetUrl(asset)} alt="" aria-hidden="true" />
    <span>
      {label} {value}
    </span>
  </div>
);

export const MapView: React.FC = () => {
  const { map, startCombat, currentFloor, currentAct, player, setPhase, combatWinsThisCycle = 0 } = useGameStore();
  const requiredWins = getBossUnlockWinsRequired();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const totalLayers = map.length;
  const mapHeight = Math.max(560, (Math.max(totalLayers, 1) - 1) * LAYER_SPACING + 120);
  const completedBossLamps = Math.min(requiredWins, Math.max(0, combatWinsThisCycle));

  const alignCurrentFloor = React.useCallback(() => {
    const container = mapContainerRef.current;
    if (!container || totalLayers === 0) return;

    const floorY = (totalLayers - 1 - currentFloor) * LAYER_SPACING + 24;
    const startY = (totalLayers - 1) * LAYER_SPACING + 24;
    const containerHeight = container.clientHeight;
    const maxTop = Math.max(0, container.scrollHeight - containerHeight);
    const targetTop =
      currentFloor <= 2
        ? Math.min(maxTop, Math.max(0, Math.max(floorY - containerHeight * 0.18, startY - containerHeight + 94)))
        : Math.min(maxTop, Math.max(0, floorY - containerHeight * 0.32));

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
      <div className="map-v2">
        <div className="map-v2__viewport">
          <img className="map-v2__background" src={resolveAssetUrl(getMapBackground(currentAct))} alt="" aria-hidden="true" />
          <div className="map-v2__shade" />
          <button
            type="button"
            className="map-v2-back"
            style={refRect(1601, 87, 234, 67)}
            onClick={() => setPhase('start_menu')}
          >
            <ChevronLeft size={32} />
            <span>返回主菜单</span>
          </button>
          <div className="map-v2-empty" style={refRect(518, 88, 969, 923)}>
            <img className="map-v2-empty__frame" src={resolveAssetUrl(MAP_ASSETS.routeFrame)} alt="" aria-hidden="true" />
            <div className="map-v2-empty__text">当前还没有可用地图，请先从主菜单开始巡诊。</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-v2">
      <div className="map-v2__viewport">
        <img className="map-v2__background" src={resolveAssetUrl(getMapBackground(currentAct))} alt="" aria-hidden="true" />
        <div className="map-v2__shade" />

        <section className="map-v2-left" style={refRect(84, 86, 386, 905)} aria-label="巡诊信息">
          <div className="map-v2-kicker">巡诊卷轴</div>
          <h1 className="map-v2-title">巡诊地图</h1>

          <div className="map-v2-act">
            <div className="map-v2-act__label">当前幕次</div>
            <div className="map-v2-act__title">
              {(ACT_TITLES[currentAct as 1 | 2 | 3] ?? ACT_TITLES[1]).split('\n').map((line) => (
                <React.Fragment key={line}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
            <p>{ACT_SUBTITLES[currentAct as 1 | 2 | 3] ?? ACT_SUBTITLES[1]}</p>
          </div>

          <div className="map-v2-stats" aria-label="角色状态">
            <StatPill asset={MAP_ASSETS.statFloor} label="楼层" value={Math.max(1, currentFloor)} style={leftPanelRect(0, 538, 192, 92)} />
            <StatPill asset={MAP_ASSETS.statHp} label="生命" value={`${player.hp}/${player.maxHp}`} style={leftPanelRect(176, 538, 228, 92)} />
            <StatPill asset={MAP_ASSETS.statGold} label="金币" value={player.gold} style={leftPanelRect(0, 596, 196, 93)} />
            <StatPill asset={MAP_ASSETS.statEnergy} label="真气" value={player.maxEnergy} style={leftPanelRect(176, 596, 201, 93)} />
          </div>

          <div className="map-v2-hint" style={leftPanelRect(0, 750, 384, 159)}>
            <img className="map-v2-hint__bg" src={resolveAssetUrl(MAP_ASSETS.routeHintPanel)} alt="" aria-hidden="true" />
            <img className="map-v2-hint__icon" src={resolveAssetUrl(MAP_ASSETS.routeHintIcon)} alt="" aria-hidden="true" />
            <div className="map-v2-hint__title">路线提示</div>
            <p>优先看下一层的可达节点，再决定补牌、休息还是绕路。</p>
          </div>
        </section>

        <main className="map-v2-route" style={refRect(517, 88, 969, 923)} aria-label="当前路径">
          <img className="map-v2-route__frame" src={resolveAssetUrl(MAP_ASSETS.routeFrame)} alt="" aria-hidden="true" />
          <div className="map-v2-route__heading">
            <h2>当前路径</h2>
            <img src={resolveAssetUrl(MAP_ASSETS.routeTitleDivider)} alt="" aria-hidden="true" />
          </div>
          <div ref={mapContainerRef} className="map-v2-route__scroll ornate-scroll">
            <div className="map-v2-route__map" style={{ height: `${mapHeight}px` }}>
              <svg className="map-v2-route__lines" aria-hidden="true">
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
                          className={node.status === 'completed' ? 'map-v2-route__line map-v2-route__line--completed' : 'map-v2-route__line'}
                        />
                      );
                    }),
                  ),
                )}
              </svg>

              {map.map((layer, layerIndex) => (
                <div
                  key={layerIndex}
                  className="map-v2-route__layer"
                  style={{ top: `${(totalLayers - 1 - layerIndex) * LAYER_SPACING}px` }}
                >
                  {layer.nodes.map((node, nodeIndex) => {
                    const meta = NODE_META[node.type];
                    const isNodeCol3 = layer.nodes.length === 4 && nodeIndex === 3;
                    const isConnector = isNodeCol3 && node.type === 'combat';
                    const isBoss = node.type === 'boss';
                    const isBossLane = isNodeCol3 && isBoss;
                    const bossLocked = isBossLane && combatWinsThisCycle < requiredWins;
                    const isAvailable = node.status === 'available' && !bossLocked;
                    const isCompleted = node.status === 'completed' || node.status === 'current';
                    const isLocked = node.status === 'locked' || bossLocked;
                    const canEnter = isAvailable && !isConnector && node.type !== 'start';

                    if (isConnector) {
                      return (
                        <div
                          key={node.id}
                          className="map-v2-node map-v2-node--connector"
                          style={{ left: `${node.x}%` }}
                        >
                          <span />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={node.id}
                        className={[
                          'map-v2-node',
                          isBoss ? 'map-v2-node--boss' : '',
                          canEnter ? 'map-v2-node--clickable' : isLocked ? 'map-v2-node--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{ left: `${node.x}%` }}
                      >
                        <button
                          type="button"
                          className={[
                            'map-v2-node__button',
                            isAvailable ? 'map-v2-node__button--available' : '',
                            isCompleted ? 'map-v2-node__button--completed' : '',
                            isLocked ? 'map-v2-node__button--locked' : '',
                            isBoss ? 'map-v2-node__button--boss' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={!canEnter}
                          onClick={() => canEnter && startCombat(node.id)}
                          aria-label={`${meta.label}${canEnter ? '，可进入' : isLocked ? '，未解锁' : ''}`}
                        >
                          <motion.span
                            className="map-v2-node__icon"
                            whileHover={canEnter ? { scale: 1.08, y: -3 } : undefined}
                            whileTap={canEnter ? { scale: 0.96 } : undefined}
                          >
                            {bossLocked ? <Lock size={24} /> : meta.icon}
                          </motion.span>
                        </button>
                        <div className="map-v2-node__label">{meta.label}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="map-v2-right" style={refRect(1515, 87, 325, 905)} aria-label="首领进度">
          <button
            type="button"
            className="map-v2-back"
            style={rightPanelRect(86, 0, 234, 67)}
            onClick={() => setPhase('start_menu')}
          >
            <ChevronLeft size={32} />
            <span>返回主菜单</span>
          </button>

          <div className="map-v2-boss" style={rightPanelRect(0, 122, 325, 238)}>
            <div className="map-v2-boss__heading">
              <h2>首领进度</h2>
              <img src={resolveAssetUrl(MAP_ASSETS.rightDivider)} alt="" aria-hidden="true" />
            </div>
            <div className="map-v2-boss__copy">
              击败 {Math.min(combatWinsThisCycle, requiredWins)}/{requiredWins} 次解锁首领
            </div>
            <div className="map-v2-boss__lamps">
              <img className="map-v2-boss__plate" src={resolveAssetUrl(MAP_ASSETS.bossProgressPlate)} alt="" aria-hidden="true" />
              {Array.from({ length: requiredWins }, (_, index) => (
                <img
                  key={index}
                  className="map-v2-boss__lamp"
                  src={resolveAssetUrl(index < completedBossLamps ? MAP_ASSETS.bossLampComplete : MAP_ASSETS.bossLampPending)}
                  alt=""
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="map-v2-boss__status">
              {combatWinsThisCycle >= requiredWins ? '首领已解锁' : `还需 ${requiredWins - combatWinsThisCycle} 场战斗`}
            </div>
          </div>
        </aside>

        <HandOverview deck={player.deck} relics={player.relics ?? []} />
        <SynthesisBench />
      </div>
    </div>
  );
};
