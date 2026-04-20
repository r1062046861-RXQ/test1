import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Play, Settings, Shield, Users, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { Constitution } from '../types';
import {
  CONSTITUTION_CINEMATIC_MS,
  CONSTITUTION_REDUCED_MOTION_MS,
  ConstitutionIntroOverlay,
  type ConstitutionIntroStage,
  type ConstitutionOption,
} from './ConstitutionIntroOverlay';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground, resolveAssetUrl } from '../utils/assets';

const CONSTITUTIONS: ConstitutionOption[] = [
  {
    id: 'balanced',
    title: '平和体质',
    subtitle: '均衡起手，进攻、防守与过牌都更稳定。',
    passive: '均衡开局',
    detail: '适合第一次巡诊时使用，容易衔接多种流派与章节节奏。',
    accent: 'from-stone-100 to-amber-50 border-stone-700/30',
    image: '/assets/cards_special/86.png',
  },
  {
    id: 'yin_deficiency',
    title: '阴虚体质',
    subtitle: '偏技巧与资源经营，擅长围绕滋阴展开联动。',
    passive: '滋阴 +1，滋阴上限 +2',
    detail: '更强调回合规划与状态积累，适合打出高爆发的中后期节奏。',
    accent: 'from-sky-100 to-indigo-50 border-sky-700/30',
    image: '/assets/cards_special/87.png',
  },
  {
    id: 'qi_deficiency',
    title: '气虚体质',
    subtitle: '偏防御与续航，依靠护盾、格挡和治疗稳住局面。',
    passive: '每回合恢复 1 点生命',
    detail: '更适合稳扎稳打的推进方式，能在长线战斗中慢慢拉开优势。',
    accent: 'from-yellow-100 to-amber-50 border-yellow-700/30',
    image: '/assets/cards_special/88.png',
  },
];

const AUTHOR_CONTACTS = [
  {
    id: 'wang-yi',
    role: '视觉、创意作者',
    name: '王熠',
    note: '负责整体视觉气质、创意方向与美术表达。',
    qr: '/assets/author_qr/wang-yi-placeholder.svg',
    qrAlt: '王熠二维码占位图',
    placeholder: true,
  },
  {
    id: 'ren-xuanqi',
    role: '技术支持作者',
    name: '任玄奇',
    note: '负责网页端实现、交互整合与部署支持。',
    qr: '/assets/author_qr/ren-xuanqi.jpg',
    qrAlt: '任玄奇二维码',
    placeholder: false,
  },
] as const;

type NewRunStage = 'closed' | ConstitutionIntroStage;

const MenuActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  wide?: boolean;
}> = ({ title, description, icon, onClick, variant = 'secondary', wide = false }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -4, scale: 1.01 }}
    whileTap={{ scale: 0.985 }}
    className={[
      'start-menu__action-card',
      `start-menu__action-card--${variant}`,
      wide ? 'md:col-span-2' : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="start-menu__action-icon">{icon}</div>
    <div className="start-menu__action-copy">
      <div className="start-menu__action-title">{title}</div>
      <p className="start-menu__action-description">{description}</p>
    </div>
  </motion.button>
);

export const StartMenu: React.FC = () => {
  const { map, startGame, startCombat, setPhase, setFontSize, fontSize } = useGameStore();
  const shouldReduceMotion = useReducedMotion();
  const [showSettings, setShowSettings] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [newRunStage, setNewRunStage] = useState<NewRunStage>('closed');
  const adminEnabled = (() => {
    if (typeof window === 'undefined') return false;
    try {
      return new URLSearchParams(window.location.search).has('admin');
    } catch {
      return false;
    }
  })();
  const [showAdminPanel, setShowAdminPanel] = useState(adminEnabled);

  useEffect(() => {
    if (newRunStage !== 'cinematic') {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNewRunStage('select'),
      shouldReduceMotion ? CONSTITUTION_REDUCED_MOTION_MS : CONSTITUTION_CINEMATIC_MS,
    );

    return () => window.clearTimeout(timer);
  }, [newRunStage, shouldReduceMotion]);

  const openNewRunFlow = () => {
    setNewRunStage('cinematic');
  };

  const handleStartGame = (constitution: Constitution) => {
    startGame(constitution);
    setNewRunStage('closed');
  };
  const hasSavedRun = Boolean(map && map.length > 0);

  return (
    <>
      <PageShell
        tone="immersive"
        headerSurface="plain"
        title="五行医道"
        kicker="五行辨证巡诊"
        subtitle="循五行，辨寒热虚实。以巡诊构筑为引，在体质起局与路径取舍中理解药性、生克与证候变化。"
        className="start-menu-page"
        headerClassName="start-menu__hero"
        style={{
          backgroundImage:
            `linear-gradient(180deg, rgba(8,10,18,0.28), rgba(6,8,14,0.78)), radial-gradient(circle at top, rgba(255,221,161,0.14), transparent 32%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        contentClassName="start-menu__layout"
      >
        <Panel className="start-menu__aside start-menu__aside--left px-5 py-5 md:px-6">
          <SectionTitle
            title={hasSavedRun ? '巡诊状态' : '启程提示'}
            hint={hasSavedRun ? '已有一局进行中的巡诊，可直接返回当前路径。' : '新的巡诊会先经过入场过场，再进入体质选择。'}
          />
          <div className="space-y-4 text-sm leading-7 text-stone-200/86">
            <p>
              {hasSavedRun
                ? '当前巡诊仍保留在地图中，你可以继续推进，也可以重新起局，换一条新的辨证路径。'
                : '从这里开启新的巡诊，先选体质，再沿地图推进，在战斗、事件与药铺之间逐步完成构筑。'}
            </p>
            <p>图鉴与联系作者入口都保留在主舞台周围，方便边玩边查看设定与资料。</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant={hasSavedRun ? 'emerald' : 'amber'}>{hasSavedRun ? '已有巡诊' : '等待开局'}</Badge>
            <Badge variant="blue">网页版</Badge>
            <Badge variant="slate">图鉴已开放</Badge>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="start-menu__mini-note">
              <div className="start-menu__mini-note-title">体质起局</div>
              <div className="start-menu__mini-note-copy">从平和、阴虚、气虚三种体质出发，决定初期节奏与被动走向。</div>
            </div>
            <div className="start-menu__mini-note">
              <div className="start-menu__mini-note-title">巡诊节奏</div>
              <div className="start-menu__mini-note-copy">普通战斗补牌，事件改方向，药铺与休憩负责资源整理和修补短板。</div>
            </div>
          </div>
        </Panel>

        <Panel className="start-menu__stage px-5 py-5 md:px-6 md:py-6">
          <div className="start-menu__stage-kicker">中央主舞台</div>
          <div className="start-menu__stage-title">开始一次新的巡诊</div>
          <p className="start-menu__stage-copy">
            主要操作集中在这里。新的巡诊会播放入场过场，继续巡诊则直接返回当前地图。
          </p>

          <div className="start-menu__actions-grid">
            {hasSavedRun ? (
              <MenuActionCard
                title="继续巡诊"
                description="返回当前地图，沿既有路线继续推进。"
                icon={<Play size={20} />}
                variant="primary"
                onClick={() => setPhase('map')}
              />
            ) : null}

            <MenuActionCard
              title={hasSavedRun ? '重新巡诊' : '开始巡诊'}
              description={hasSavedRun ? '从体质起局重新开启一轮新的巡诊。' : '进入入场过场，并前往体质选择界面。'}
              icon={<Play size={20} />}
              variant="primary"
              wide={!hasSavedRun}
              onClick={openNewRunFlow}
            />

            <MenuActionCard
              title="图鉴总览"
              description="查看卡牌、敌人和状态词典。"
              icon={<BookOpen size={20} />}
              onClick={() => setPhase('card_codex')}
            />
            <MenuActionCard
              title="联系作者"
              description="查看作者信息与联络二维码。"
              icon={<Users size={20} />}
              onClick={() => setShowContactPanel(true)}
            />
            <MenuActionCard
              title="设置"
              description="调整界面字号等网页端显示项。"
              icon={<Settings size={20} />}
              variant="quiet"
              onClick={() => setShowSettings(true)}
            />
            <MenuActionCard
              title="管理员测试"
              description="快速跳转到特定页面，便于本地回看。"
              icon={<Shield size={20} />}
              variant="quiet"
              onClick={() => setShowAdminPanel(true)}
            />
          </div>
        </Panel>

        <div className="start-menu__aside-stack">
          <Panel className="start-menu__aside px-5 py-5 md:px-6">
            <SectionTitle title="巡诊摘要" hint="主流程围绕体质起局、路径推进与构筑取舍展开。" />
            <div className="space-y-4 text-sm leading-7 text-stone-200/84">
              <p>游戏以中医药知识转译为底色，用卡组构筑与章节推进串联药性、生克与证候变化。</p>
              <p>你会在每一页承担不同职责：起局、辨证、取舍、整理，让理解发生在游玩过程里。</p>
            </div>
          </Panel>

          <Panel className="start-menu__aside px-5 py-5 md:px-6">
            <SectionTitle title="当前重点" hint="先决定走哪条线，再决定何时补强、何时求稳。" />
            <div className="grid gap-3">
              <div className="start-menu__mini-note">
                <div className="start-menu__mini-note-title">构筑方向</div>
                <div className="start-menu__mini-note-copy">优先围绕当前体质与前几层路线做取舍，不必在一开始追求面面俱到。</div>
              </div>
              <div className="start-menu__mini-note">
                <div className="start-menu__mini-note-title">资源节奏</div>
                <div className="start-menu__mini-note-copy">生命、金币与图鉴信息都能反向帮助你判断下一步更该战斗、药铺还是休憩。</div>
              </div>
            </div>
          </Panel>
        </div>
      </PageShell>

      <AnimatePresence>
        {showContactPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setShowContactPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="ornate-panel w-full max-w-3xl px-6 py-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold tracking-[0.18em] text-amber-800/80">作者联系</div>
                  <h2 className="mt-2 text-3xl font-bold text-stone-900">联系作者</h2>
                  <p className="mt-2 text-sm leading-7 text-stone-600">扫码可联系作者；视觉作者二维码暂为占位图。</p>
                </div>
                <button onClick={() => setShowContactPanel(false)} className="rounded-full p-2 text-stone-500 transition hover:bg-black/5 hover:text-red-700">
                  <X size={24} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {AUTHOR_CONTACTS.map((author) => (
                  <div key={author.id} className="inset-panel flex h-full flex-col gap-4 px-4 py-4">
                    <div className="overflow-hidden rounded-[24px] border border-stone-900/10 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <img
                        src={resolveAssetUrl(author.qr)}
                        alt={author.qrAlt}
                        className="mx-auto aspect-square w-full max-w-[13rem] rounded-[20px] border border-stone-900/8 bg-white object-contain p-2"
                      />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.24em] text-amber-800/80">{author.role}</div>
                      <div className="mt-2 text-2xl font-bold text-stone-900">{author.name}</div>
                      <p className="mt-2 text-sm leading-7 text-stone-700">{author.note}</p>
                      <p className="mt-2 text-xs tracking-[0.16em] text-stone-500">
                        {author.placeholder ? '当前展示为预留占位图' : '当前展示为可扫描联系二维码'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} className="ornate-panel w-full max-w-md px-6 py-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold tracking-[0.18em] text-amber-800/80">界面设置</div>
                  <h2 className="mt-2 text-3xl font-bold text-stone-900">设置</h2>
                </div>
                <button onClick={() => setShowSettings(false)} className="rounded-full p-2 text-stone-500 transition hover:bg-black/5 hover:text-red-700">
                  <X size={24} />
                </button>
              </div>
              <div className="inset-panel px-4 py-4">
                <label className="block text-base font-semibold text-stone-800">字体大小：{fontSize}px</label>
                <input type="range" min="12" max="24" step="2" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-4 w-full accent-amber-700" />
                <div className="mt-3 text-sm text-stone-600">仅影响网页端界面的基础字号。</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 px-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} className="ornate-panel w-full max-w-2xl px-6 py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold tracking-[0.18em] text-amber-800/80">管理员入口</div>
                  <h2 className="mt-2 text-3xl font-bold text-stone-900">管理员测试</h2>
                </div>
                <button onClick={() => setShowAdminPanel(false)} className="rounded-full p-2 text-stone-500 transition hover:bg-black/5 hover:text-red-700">
                  <X size={24} />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ActionButton
                  id="admin-combat-btn"
                  variant="primary"
                  className="justify-start px-5 py-4"
                  onClick={() => {
                    startGame('balanced');
                    setShowAdminPanel(false);
                    setTimeout(() => startCombat('admin_test'), 0);
                  }}
                >
                  直接进入战斗
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  className="justify-start px-5 py-4"
                  onClick={() => {
                    startGame('balanced');
                    useGameStore.setState({ phase: 'shop' });
                    setShowAdminPanel(false);
                  }}
                >
                  直接进入药铺
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  className="justify-start px-5 py-4"
                  onClick={() => {
                    startGame('balanced');
                    useGameStore.setState({ phase: 'rest' });
                    setShowAdminPanel(false);
                  }}
                >
                  直接进入休憩
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  className="justify-start px-5 py-4"
                  onClick={() => {
                    startGame('balanced');
                    useGameStore.setState({ phase: 'event' });
                    setShowAdminPanel(false);
                  }}
                >
                  直接进入事件
                </ActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newRunStage !== 'closed' ? (
          <ConstitutionIntroOverlay
            stage={newRunStage}
            options={CONSTITUTIONS}
            onSkip={() => setNewRunStage('select')}
            onClose={() => setNewRunStage('closed')}
            onSelect={handleStartGame}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
};
