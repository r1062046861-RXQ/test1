import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ActionButton, Panel } from './ui/PageShell';

export const EventView: React.FC = () => {
  const { completeNonCombat } = useGameStore();

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Panel className="max-w-lg mx-auto px-5 py-6 text-center">
        <div className="chapter-kicker mb-2">奇遇</div>
        <h2 className="text-2xl font-bold text-amber-50 mb-4">奇遇事件</h2>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-stone-400 text-sm leading-7"
        >
          <p className="mb-3">你在行医途中偶遇一事……</p>
          <div className="rounded-2xl border border-dashed border-stone-700/40 bg-stone-900/30 px-6 py-8 my-4">
            <div className="text-4xl mb-3">📜</div>
            <p className="text-stone-500 text-sm">
              事件内容尚在筹备中<br />
              敬请期待后续更新
            </p>
          </div>
        </motion.div>
        <ActionButton
          variant="primary"
          className="mt-4 px-8"
          onClick={() => completeNonCombat()}
        >
          继续前行
        </ActionButton>
      </Panel>
    </div>
  );
};
