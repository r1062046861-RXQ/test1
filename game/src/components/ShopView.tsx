import React, { useEffect, useMemo, useState } from 'react';
import { CARD_LIBRARY } from '../data/cards';
import type { Card as CardType } from '../types';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

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
      },
      {
        id: 'fortify',
        name: '固本培元',
        description: '最大生命 +4，并立刻恢复 4 点生命。',
        price: 95 + actBonus,
        sold: false,
      },
    ]);
    setMode('idle');
  }, [cardPool, currentAct, currentNodeId]);

  const buyCard = (offer: ShopCardOffer) => {
    if (offer.sold || player.gold < offer.price) return;
    spendGold(offer.price);
    addCardToDeck(offer.card.id);
    setCardOffers((prev) => prev.map((item) => (item.card.id === offer.card.id ? { ...item, sold: true } : item)));
  };

  const buyService = (offer: ShopServiceOffer) => {
    if (offer.sold || player.gold < offer.price) return;
    spendGold(offer.price);
    setServiceOffers((prev) => prev.map((item) => (item.id === offer.id ? { ...item, sold: true } : item)));

    if (offer.id === 'healing') {
      const healAmount = Math.max(8, Math.floor(player.maxHp * 0.2));
      healPlayer(healAmount);
      return;
    }

    increaseMaxHp(4);
  };

  const removeCard = (cardId: string) => {
    if (player.gold < shopRemovalCost) return;
    spendGold(shopRemovalCost);
    removeCardById(cardId);
    increaseShopRemovalCost(25);
    setMode('idle');
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
      tone="immersive"
      headerSurface="plain"
      footerSurface="plain"
      headerClassName="immersive-page__header"
      title="药铺"
      subtitle="购入秘方、补给状态，或净化旧牌，整理下一段巡诊的牌组。"
      kicker="卷轴药铺"
      footer={footer}
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:grid-rows-[minmax(0,1fr)_auto]">
        <Panel className="min-h-0 px-5 py-4 xl:col-start-1 xl:row-start-1">
          <div className="flex h-full min-h-0 flex-col">
            <SectionTitle title="秘方牌库" hint="先看可购秘方，再决定是补强体系还是补足过渡。" />
            <div className="ornate-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(188px,1fr))] gap-3">
                {cardOffers.map((offer) => (
                  <div key={offer.card.id} className="inset-panel flex flex-col items-center px-3 py-2.5">
                    {offer.badge ? <div className="mb-2 text-sm font-semibold text-amber-200">{offer.badge}</div> : null}
                    <Card card={{ ...offer.card, id: `shop_${offer.card.id}` }} disabled={offer.sold} onClick={() => buyCard(offer)} />
                    <div className="mt-3 flex w-full items-center justify-between gap-3">
                      <div className="text-lg font-bold text-amber-200">{offer.price} 金</div>
                      <ActionButton
                        variant={offer.sold ? 'ghost' : 'secondary'}
                        disabled={offer.sold || player.gold < offer.price}
                        onClick={() => buyCard(offer)}
                      >
                        {offer.sold ? '已购' : '购买'}
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="min-h-0 px-5 py-4 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <SectionTitle title="补给服务" hint="右侧只保留恢复与养元服务，方便快速比价。" />
          <div className="mt-3 grid gap-3">
            {serviceOffers.map((offer) => (
              <div key={offer.id} className="inset-panel px-4 py-4">
                <div className="text-xl font-bold text-amber-50">{offer.name}</div>
                <div className="mt-2 text-sm leading-7 text-stone-300">{offer.description}</div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-amber-200">{offer.price} 金</div>
                  <ActionButton
                    variant={offer.sold ? 'ghost' : 'secondary'}
                    disabled={offer.sold || player.gold < offer.price}
                    onClick={() => buyService(offer)}
                  >
                    {offer.sold ? '已购' : '购买'}
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="min-h-0 px-5 py-4 xl:col-start-1 xl:row-start-2">
          <div className="flex min-h-0 flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle title="净化服务" className="mb-0" />
              <ActionButton
                variant={mode === 'remove' ? 'primary' : 'secondary'}
                disabled={player.deck.length === 0 || player.gold < shopRemovalCost}
                onClick={() => setMode(mode === 'remove' ? 'idle' : 'remove')}
              >
                净化 1 张牌（{shopRemovalCost} 金）
              </ActionButton>
            </div>

            {mode === 'remove' ? (
              <div className="ornate-scroll grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(188px,1fr))] gap-4 overflow-y-auto pr-2">
                {player.deck.map((card) => (
                  <div key={card.id} className="flex justify-center transition-transform hover:-translate-y-1">
                    <Card card={card} onClick={() => removeCard(card.id)} descriptionModalEnabled={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="inset-panel px-4 py-4 text-sm leading-7 text-stone-300">
                净化会永久移除 1 张卡牌，完成后下一次净化费用会额外增加 25 金。
              </div>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
