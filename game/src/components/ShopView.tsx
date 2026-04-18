import React, { useEffect, useMemo, useState } from 'react';
import { CARD_LIBRARY } from '../data/cards';
import type { Card as CardType } from '../types';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';

type Rarity = 'common' | 'uncommon' | 'rare';
type ViewMode = 'idle' | 'remove';

interface ShopCardOffer {
  card: CardType;
  price: number;
  sold: boolean;
  badge?: string;
}

interface ShopServiceOffer {
  id: 'healing' | 'fortify';
  name: string;
  description: string;
  price: number;
  sold: boolean;
  apply: () => string;
}

const BASE_PRICE: Record<Rarity, number> = {
  common: 55,
  uncommon: 85,
  rare: 130,
};

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 0.55,
  uncommon: 0.35,
  rare: 0.1,
};

const chooseWeightedRarity = (weights: Record<Rarity, number>, available: Record<Rarity, CardType[]>) => {
  const entries = (Object.keys(weights) as Rarity[]).filter((rarity) => available[rarity].length > 0);
  const total = entries.reduce((sum, rarity) => sum + weights[rarity], 0);
  let roll = Math.random() * total;
  for (const rarity of entries) {
    roll -= weights[rarity];
    if (roll <= 0) return rarity;
  }
  return entries[0];
};

const pullCard = (pool: Record<Rarity, CardType[]>, rarity: Rarity) => {
  const candidates = pool[rarity];
  if (candidates.length === 0) return null;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates.splice(index, 1)[0];
};

export const ShopView: React.FC = () => {
  const {
    player,
    currentAct,
    currentNodeId,
    addCardToDeck,
    removeCardById,
    spendGold,
    healPlayer,
    increaseMaxHp,
    shopRemovalCost,
    increaseShopRemovalCost,
    completeNonCombat,
  } = useGameStore();

  const [cardOffers, setCardOffers] = useState<ShopCardOffer[]>([]);
  const [serviceOffers, setServiceOffers] = useState<ShopServiceOffer[]>([]);
  const [mode, setMode] = useState<ViewMode>('idle');
  const [result, setResult] = useState<string | null>(null);

  const cardPool = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => (!card.act || card.act <= currentAct) && !card.unplayable),
    [currentAct],
  );

  useEffect(() => {
    const poolByRarity: Record<Rarity, CardType[]> = {
      common: cardPool.filter((card) => card.rarity === 'common'),
      uncommon: cardPool.filter((card) => card.rarity === 'uncommon'),
      rare: cardPool.filter((card) => card.rarity === 'rare'),
    };

    const actBonus = (currentAct - 1) * 8;
    const offers: ShopCardOffer[] = [];

    for (let index = 0; index < 3; index += 1) {
      const rarity = chooseWeightedRarity(RARITY_WEIGHTS, poolByRarity);
      const picked = pullCard(poolByRarity, rarity) ?? pullCard(poolByRarity, 'common');
      if (!picked) break;
      offers.push({
        card: picked,
        price: BASE_PRICE[picked.rarity] + actBonus,
        sold: false,
      });
    }

    const rarePick = pullCard(poolByRarity, 'rare') ?? pullCard(poolByRarity, 'uncommon');
    if (rarePick) {
      offers.push({
        card: rarePick,
        price: BASE_PRICE[rarePick.rarity] + actBonus + 20,
        sold: false,
        badge: '珍藏',
      });
    }

    if (offers.length > 0) {
      const saleIndex = Math.floor(Math.random() * offers.length);
      offers[saleIndex] = {
        ...offers[saleIndex],
        price: Math.max(1, Math.round(offers[saleIndex].price * 0.75)),
        badge: offers[saleIndex].badge ? `折扣 · ${offers[saleIndex].badge}` : '折扣',
      };
    }

    setCardOffers(offers);
    setServiceOffers([
      {
        id: 'healing',
        name: '调息养元',
        description: '恢复最大生命 20%，且至少回复 8 点生命。',
        price: 60 + actBonus,
        sold: false,
        apply: () => {
          const healAmount = Math.max(8, Math.floor(player.maxHp * 0.2));
          healPlayer(healAmount);
          return `调息完成，恢复了 ${healAmount} 点生命。`;
        },
      },
      {
        id: 'fortify',
        name: '固本培元',
        description: '最大生命 +4，并立即恢复 4 点生命。',
        price: 95 + actBonus,
        sold: false,
        apply: () => {
          increaseMaxHp(4);
          return '根基稳固：最大生命提升 4 点，并恢复 4 点生命。';
        },
      },
    ]);
    setMode('idle');
    setResult(null);
  }, [cardPool, currentAct, currentNodeId, healPlayer, increaseMaxHp, player.maxHp]);

  const buyCard = (offer: ShopCardOffer) => {
    if (offer.sold || player.gold < offer.price) return;
    spendGold(offer.price);
    addCardToDeck(offer.card.id);
    setCardOffers((prev) => prev.map((item) => (item.card.id === offer.card.id ? { ...item, sold: true } : item)));
    setResult(`已购入 ${offer.card.name}。`);
  };

  const buyService = (offer: ShopServiceOffer) => {
    if (offer.sold || player.gold < offer.price) return;
    spendGold(offer.price);
    setServiceOffers((prev) => prev.map((item) => (item.id === offer.id ? { ...item, sold: true } : item)));
    setResult(offer.apply());
  };

  const removeCard = (cardId: string, cardName: string) => {
    if (player.gold < shopRemovalCost) return;
    spendGold(shopRemovalCost);
    removeCardById(cardId);
    increaseShopRemovalCost(25);
    setMode('idle');
    setResult(`已净化 ${cardName}。`);
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="amber">金币 {player.gold}</Badge>
        <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
        <Badge variant="slate">净化费用 {shopRemovalCost}</Badge>
      </div>
      <ActionButton onClick={completeNonCombat}>离开药铺</ActionButton>
    </div>
  );

  return (
    <PageShell
      title="药铺"
      subtitle="在药铺购入秘方、补给状态，或净化旧牌，为下一段巡诊整理牌组。"
      kicker="卷轴药铺"
      footer={footer}
    >
      <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[1.18fr_0.82fr]">
        <Panel className="min-h-0 px-5 py-4">
          <div className="grid h-full min-h-0 gap-3 lg:grid-rows-[minmax(0,0.92fr)_auto_minmax(0,0.78fr)]">
            <div className="flex min-h-0 flex-col">
              <SectionTitle title="秘方牌库" hint="先看可购秘方，再判断是补强体系还是补足过渡。" />
              <div className="ornate-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
                  {cardOffers.map((offer) => (
                    <div key={offer.card.id} className="inset-panel flex flex-col items-center px-3 py-2.5">
                      {offer.badge ? <div className="mb-2 text-sm font-semibold text-amber-800">{offer.badge}</div> : null}
                      <Card card={{ ...offer.card, id: `shop_${offer.card.id}` }} disabled={offer.sold} onClick={() => buyCard(offer)} />
                      <div className="mt-3 flex w-full items-center justify-between gap-3">
                        <div className="text-lg font-bold text-amber-800">{offer.price} 金</div>
                        <ActionButton variant={offer.sold ? 'ghost' : 'secondary'} disabled={offer.sold || player.gold < offer.price} onClick={() => buyCard(offer)}>
                          {offer.sold ? '已购' : '购买'}
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <SectionTitle title="补给服务" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {serviceOffers.map((offer) => (
                  <div key={offer.id} className="inset-panel px-4 py-4">
                    <div className="text-xl font-bold text-stone-900">{offer.name}</div>
                    <div className="mt-2 text-sm leading-7 text-stone-700">{offer.description}</div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-lg font-bold text-amber-800">{offer.price} 金</div>
                      <ActionButton variant={offer.sold ? 'ghost' : 'secondary'} disabled={offer.sold || player.gold < offer.price} onClick={() => buyService(offer)}>
                        {offer.sold ? '已购' : '购买'}
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-hidden">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle title="净化服务" className="mb-0" />
                <ActionButton variant={mode === 'remove' ? 'primary' : 'secondary'} disabled={player.deck.length === 0 || player.gold < shopRemovalCost} onClick={() => setMode(mode === 'remove' ? 'idle' : 'remove')}>
                  净化 1 张牌（{shopRemovalCost} 金）
                </ActionButton>
              </div>

              {mode === 'remove' ? (
                <div className="ornate-scroll grid h-full max-h-full grid-cols-[repeat(auto-fit,minmax(192px,1fr))] gap-4 overflow-y-auto pr-2">
                  {player.deck.map((card) => (
                    <div key={card.id} className="flex justify-center transition-transform hover:-translate-y-1">
                      <Card card={card} onClick={() => removeCard(card.id, card.name)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inset-panel px-4 py-4 text-sm leading-7 text-stone-700">
                  净化会永久移除 1 张卡牌，完成后下一次净化费用会额外增加 25 金。
                </div>
              )}
            </div>
          </div>
        </Panel>

        <div className="grid min-h-0 gap-3">
          <Panel className="px-5 py-4">
            <SectionTitle title="药铺札记" hint="在一页内完成购入、补给与净化判断。" />
            <div className="space-y-3 text-sm leading-7 text-stone-700">
              <p>左侧是主要购入区，右侧负责汇总当前交易结果与操作提示。</p>
              <p>秘方、补给与净化对应三种不同取舍：补体系、补状态，或主动压缩牌组。</p>
              <p>进入药铺前先想清楚你当前最缺的是强度、续航，还是更干净的牌组结构。</p>
            </div>
          </Panel>

          <Panel className="px-5 py-4">
            <SectionTitle title="结果反馈" />
            <div className="inset-panel min-h-[8rem] px-4 py-4 text-sm leading-7 text-stone-700">
              {result ?? '交易、治疗与净化结果会在这里即时显示。'}
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
};
