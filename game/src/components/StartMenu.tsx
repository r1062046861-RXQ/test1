import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Play, Settings, Shield, X } from 'lucide-react';
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
import { resolveAssetBackground } from '../utils/assets';

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
    subtitle: '偏技巧与资源经营，擅长围绕滋阴展开连动。',
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

type NewRunStage = 'closed' | ConstitutionIntroStage;

export const StartMenu: React.FC = () => {
  const { map, startGame, startCombat, setPhase, setFontSize, fontSize } = useGameStore();
  const shouldReduceMotion = useReducedMotion();
  const [showSettings, setShowSettings] = useState(false);
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

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm italic tracking-[0.18em] text-stone-600">
      <span>五行医道 · 辨证启程</span>
      <div className="flex flex-wrap gap-2">
        <Badge variant="blue">Web 版</Badge>
        <Badge variant="slate">五行巡诊</Badge>
        <Badge variant="amber">85 张卡</Badge>
        <Badge variant="crimson">15 个敌人</Badge>
      </div>
    </div>
  );

  return (
    <>
      <PageShell
        title="五行医道"
        kicker="五行辨证构筑"
        subtitle="沿巡诊章节推进牌组，在攻守取舍与体质分化中体会五行、生克与证候变化。"
        style={{
          backgroundImage:
            `linear-gradient(180deg, rgba(27,19,14,0.58), rgba(27,19,14,0.68)), radial-gradient(circle at top, rgba(255,239,199,0.38), transparent 36%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        actions={
          <>
            {map && map.length > 0 ? <Badge variant="emerald">已有巡诊</Badge> : <Badge variant="amber">等待开局</Badge>}
            <Badge variant="slate">图鉴已开放</Badge>
          </>
        }
        footer={footer}
        contentClassName="grid min-h-0 gap-4 xl:grid-cols-[1.08fr_0.92fr]"
      >
        <Panel className="px-6 py-6 md:px-7 md:py-7">
          <SectionTitle title="主菜单" hint="开始、继续与图鉴入口都围绕巡诊起局与牌组取舍展开。" />
          <div className="mt-5 flex flex-col gap-3">
            {map && map.length > 0 ? (
              <ActionButton variant="primary" className="justify-start px-6 py-4 text-base md:text-lg" onClick={() => setPhase('map')}>
                <Play size={18} />
                继续巡诊
              </ActionButton>
            ) : null}

            <ActionButton variant="secondary" className="justify-start px-6 py-4 text-base md:text-lg" onClick={openNewRunFlow}>
              <Play size={18} />
              {map && map.length > 0 ? '重新巡诊' : '开始巡诊'}
            </ActionButton>

            <ActionButton variant="secondary" className="justify-start px-6 py-4 text-base md:text-lg" onClick={() => setPhase('card_codex')}>
              <BookOpen size={18} />
              图鉴总览
            </ActionButton>

            <ActionButton variant="ghost" className="justify-start px-6 py-4 text-base md:text-lg" onClick={() => setShowSettings(true)}>
              <Settings size={18} />
              设置
            </ActionButton>

            <ActionButton variant="ghost" className="justify-start px-6 py-4 text-base md:text-lg" onClick={() => setShowAdminPanel(true)}>
              <Shield size={18} />
              管理员测试
            </ActionButton>
          </div>
        </Panel>

        <div className="grid min-h-0 gap-4">
          <Panel className="px-5 py-5">
            <SectionTitle title="巡诊摘要" hint="从体质起局到路线推进，主流程围绕巡诊、构筑与辨证选择展开。" />
            <div className="mt-4 space-y-3 text-sm leading-7 text-stone-700">
              <p>从这里选择体质、进入地图、查看图鉴，逐步熟悉五行医道的巡诊路径。</p>
              <p>游戏以中医药知识转译为底色，用卡组构筑与章节推进串联药性、生克与证候变化。</p>
              <p>不同页面各自承担起局、辨证、取舍与整理的职责，让理解发生在游玩过程里。</p>
            </div>
          </Panel>

          <Panel className="px-5 py-5">
            <SectionTitle title="巡诊要点" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="inset-panel px-4 py-4 text-sm leading-7 text-stone-700">
                <div className="font-semibold text-stone-900">体质起局</div>
                <div className="mt-2">体质决定初始被动与起手倾向，会影响前几层的巡诊节奏。</div>
              </div>
              <div className="inset-panel px-4 py-4 text-sm leading-7 text-stone-700">
                <div className="font-semibold text-stone-900">路线取舍</div>
                <div className="mt-2">战斗、事件、药铺与休憩会持续改变你的牌组与资源配置。</div>
              </div>
            </div>
          </Panel>
        </div>
      </PageShell>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} className="ornate-panel w-full max-w-md px-6 py-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="chapter-kicker">Settings</div>
                  <h2 className="mt-2 text-3xl font-bold text-stone-900">设置</h2>
                </div>
                <button onClick={() => setShowSettings(false)} className="rounded-full p-2 text-stone-500 transition hover:bg-black/5 hover:text-red-700">
                  <X size={24} />
                </button>
              </div>
              <div className="inset-panel px-4 py-4">
                <label className="block text-base font-semibold text-stone-800">字体大小：{fontSize}px</label>
                <input type="range" min="12" max="24" step="2" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-4 w-full accent-amber-700" />
                <div className="mt-3 text-sm text-stone-600">仅影响 Web 端界面的基础字号。</div>
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
                  <div className="chapter-kicker">Admin</div>
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
