import React, { useEffect, useMemo, useState } from 'react';
import { CARD_LIBRARY } from '../data/cards';
import { useGameStore } from '../store/gameStore';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

interface EventChoice {
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
  onPick: () => string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const EventView: React.FC = () => {
  const {
    player,
    currentAct,
    currentNodeId,
    addGold,
    spendGold,
    healPlayer,
    addCardToDeck,
    removeCardById,
    completeNonCombat,
  } = useGameStore();

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const eventSeed = `${currentAct}:${currentNodeId ?? 'free_event'}`;

  const cardPool = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => (!card.act || card.act <= currentAct) && !card.unplayable),
    [currentAct],
  );
  const eventRewardPool = useMemo(
    () => cardPool.filter((card) => card.rarity === 'common' || card.rarity === 'uncommon'),
    [cardPool],
  );

  useEffect(() => {
    const goldReward = 55 + currentAct * 10;
    const tradeCost = 35 + currentAct * 5;
    const healAmount = Math.max(1, Math.floor(player.maxHp * 0.25));

    const events: EventData[] = [
      {
        id: 'ancient_well',
        title: '古井',
        description: '荒废古井下仍有潮气翻涌，井沿散落着陌生行者留下的旧物。',
        choices: [
          {
            id: 'salvage',
            label: '打捞旧物',
            description: `失去 1 张随机卡牌，获得 ${goldReward} 金币。`,
            disabled: player.deck.length === 0,
            onPick: () => {
              const removed = pickRandom(player.deck);
              removeCardById(removed.id);
              addGold(goldReward);
              return `你舍弃了「${removed.name}」，换得 ${goldReward} 金币。`;
            },
          },
          {
            id: 'leave',
            label: '谨慎离开',
            description: '不冒险，直接离去。',
            onPick: () => '你没有惊动井中的气息，平静离开了。',
          },
        ],
      },
      {
        id: 'stone_shrine',
        title: '石龛',
        description: '石龛上刻着残缺医理，淡淡药香从裂缝中逸出。',
        choices: [
          {
            id: 'pray',
            label: '静坐调息',
            description: `恢复 ${healAmount} 点生命。`,
            onPick: () => {
              healPlayer(healAmount);
              return `你在石龛前调匀气血，恢复了 ${healAmount} 点生命。`;
            },
          },
          {
            id: 'study',
            label: '领受残篇',
            description: '获得 1 张当前幕次随机牌。',
            onPick: () => {
              const picked = pickRandom(eventRewardPool.length > 0 ? eventRewardPool : cardPool);
              addCardToDeck(picked.id);
              return `你从石龛残篇中领得了「${picked.name}」。`;
            },
          },
          {
            id: 'leave',
            label: '收神离开',
            description: '保持现状，继续前进。',
            onPick: () => '你向石龛一礼，继续踏上巡诊之路。',
          },
        ],
      },
      {
        id: 'wandering_merchant',
        title: '流浪药商',
        description: '药商打开匣盒，愿以金币交换他珍藏的一味秘方。',
        choices: [
          {
            id: 'trade',
            label: '花钱换方',
            description: `支付 ${tradeCost} 金币，获得 1 张随机高阶牌。`,
            disabled: player.gold < tradeCost,
            onPick: () => {
              const uncommonPool = cardPool.filter((card) => card.rarity === 'uncommon' || card.rarity === 'rare');
              const picked = pickRandom(uncommonPool.length > 0 ? uncommonPool : cardPool);
              spendGold(tradeCost);
              addCardToDeck(picked.id);
              return `你支付了 ${tradeCost} 金币，得到「${picked.name}」。`;
            },
          },
          {
            id: 'decline',
            label: '谢绝交易',
            description: '保留金币，不做交换。',
            onPick: () => '你谢过药商，决定保留手中的盘缠。',
          },
        ],
      },
    ];

    setEventData(events[Math.floor(Math.random() * events.length)]);
    setResult(null);
    setSelectionLocked(false);
  }, [eventSeed]);

  const handlePick = (choice: EventChoice) => {
    if (choice.disabled || result || selectionLocked) return;
    setSelectionLocked(true);
    const nextResult = choice.onPick();
    setResult(nextResult);
  };

  if (!eventData) {
    return (
      <PageShell
        tone="immersive"
        headerSurface="plain"
        headerClassName="immersive-page__header"
        title="随机事件"
        subtitle="事件载入中…"
        style={{
          backgroundImage:
            `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex h-full items-center justify-center">
          <Panel className="px-8 py-10 text-center text-lg text-stone-200">事件载入中…</Panel>
        </div>
      </PageShell>
    );
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
        <Badge variant="amber">金币 {player.gold}</Badge>
      </div>
      {result ? <ActionButton onClick={completeNonCombat}>继续前进</ActionButton> : null}
    </div>
  );

  return (
    <PageShell
      tone="immersive"
      headerSurface="plain"
      footerSurface="plain"
      headerClassName="immersive-page__header"
      title={eventData.title}
      subtitle={eventData.description}
      kicker="巡诊际遇"
      footer={footer}
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="px-5 py-5">
          <SectionTitle title="事件抉择" hint="先看代价，再决定拿资源、补状态还是改方向。" />
          <div className="mt-5 space-y-4">
            {eventData.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handlePick(choice)}
                disabled={choice.disabled || Boolean(result) || selectionLocked}
                className="inset-panel w-full px-5 py-4 text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="text-xl font-bold text-amber-50">{choice.label}</div>
                <div className="mt-2 text-sm leading-7 text-stone-300">{choice.description}</div>
              </button>
            ))}
          </div>

          {result ? <div className="mt-5 inset-panel px-5 py-5 text-base leading-8 text-stone-200">{result}</div> : null}
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="事件提示" />
          <div className="space-y-3 text-sm leading-7 text-stone-300">
            <p>事件多半是换资源，不必每次都拿满。</p>
            <p>先看代价，再决定要不要冒险。</p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
