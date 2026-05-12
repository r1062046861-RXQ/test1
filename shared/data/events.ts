export interface GameEvent {
  id: string;
  title: string;
  description: string;
  options: EventOption[];
  actRequirement?: 1 | 2 | 3;
  minLayer?: number;
  continuationMarker?: string;
  clearMarkerOnTrigger?: string;
}

export interface EventOption {
  label: string;
  description: string;
  effects: EventEffect[];
  setMarker?: string;
}

export interface EventEffect {
  type: 'heal' | 'damage' | 'maxHpChange' | 'goldChange' | 'shopPriceChange' | 'addCard' | 'removeCard' | 'addEquipment' | 'addRelic';
  value?: number;
  cardId?: string;
  equipmentId?: string;
  relicId?: string;
  count?: number;
}

export type MainlineEventStage = 'act1' | 'act2' | 'act3';

export const MAINLINE_EVENT_STAGES: Record<number, MainlineEventStage> = {
  1: 'act1',
  2: 'act2',
  3: 'act3',
};

export const MAINLINE_EVENT = {
  id: 'mainline_three_brothers',
  act1: {
    title: '三兄弟择师',
    description: '三位名医在山村收徒：大哥专教"治未病"，二哥专教"治初病"，扁鹊专教"治重病"。\n你只能拜入一人门下。大哥的门前最冷清，扁鹊的门前车水马龙。',
    options: [
      {
        label: '拜入大哥门下',
        description: '"病未发而先防，是谓上工。"\n村民笑你"没出息"——但你心知，最好的医生让人不生病。',
        effects: [{ type: 'addRelic' as const, relicId: 'equipment_zhiweibing', count: 1 }],
        setMarker: 'three_brothers=dade',
      },
      {
        label: '拜入二哥门下',
        description: '"病初起而速治，是为中工。"\n二哥赠言："见微知著，截断病势。这条路虽不显赫，却最踏实。"',
        effects: [{ type: 'heal' as const, value: 999 }, { type: 'goldChange' as const, value: 50 }],
        setMarker: 'three_brothers=erge',
      },
      {
        label: '拜入扁鹊门下',
        description: '"病入膏肓而回天，是为神工。"\n扁鹊叹气："你选了最难的路。记住——救得了十个人，不如让一百个人不生病。"',
        effects: [],
        setMarker: 'three_brothers=bianque',
      },
    ],
  },
};

export const getMainlineActData = (act: number, markers: Record<string, string>): { title: string; description: string; options: EventOption[] } | null => {
  const choice = markers['three_brothers'];
  if (act === 1) return MAINLINE_EVENT.act1 as { title: string; description: string; options: EventOption[] };

  if (act === 2) {
    if (choice === 'dade') {
      return {
        title: '各从其道',
        description: '多年行医，你教人防病于未然。村里人笑你"没本事的医生才教人养生"。\n你沉默不语，只是继续教。一日，邻村瘟疫爆发，唯独你所在的村子无人染病。\n村民这才明白——你早就在井水里下了防疫的草药。他们跪谢时，你想起大哥的话：\n"上工治未病，无功便是功。"',
        options: [
          {
            label: '继续坚守',
            description: '"无功便是功。"大哥的教诲，你已刻入骨髓。',
            effects: [{ type: 'heal', value: 999 }, { type: 'maxHpChange', value: 2 }],
            setMarker: 'three_brothers_act2=steadfast',
          },
          {
            label: '心生动摇',
            description: '开始怀疑——也许教人防病，不如亲手救人性命来得踏实。你偷学了扁鹊的急救术。',
            effects: [{ type: 'addCard', cardId: 'qinggusan' }, { type: 'maxHpChange', value: -2 }],
            setMarker: 'three_brothers_act2=doubt',
          },
        ],
      };
    }
    if (choice === 'erge') {
      return {
        title: '各从其道',
        description: '你随二哥行医多年，救人无数，但名声始终不大。百姓说：\n"这大夫不错，小病一治就好。"可一旦有人得了重病，他们扭头就去找扁鹊。\n你心中渐生不甘。二哥看出你的心思，淡淡道：\n"怎么，嫌跟我学医没出息？你救的人，哪个没有好好活着？"',
        options: [
          {
            label: '坚守初心',
            description: '继续跟二哥踏实行医。二哥点头："见微知著，足矣。"',
            effects: [{ type: 'addRelic', relicId: 'equipment_ziwuliuzhu', count: 1 }],
            setMarker: 'three_brothers_act2=steadfast',
          },
          {
            label: '心生悔意',
            description: '后悔当初没拜大哥或扁鹊。你偷师他人，走了捷径。',
            effects: [{ type: 'addCard', cardId: 'danggui' }, { type: 'shopPriceChange', value: 10 }],
            setMarker: 'three_brothers_act2=regret',
          },
        ],
      };
    }
    if (choice === 'bianque') {
      return {
        title: '各从其道',
        description: '因师从扁鹊，你名声大噪，求诊者络绎不绝。可你发现，\n来的都是重病将死之人——你拼尽全力，十人中只能救回两三个。\n深夜独坐，你满手是血，开始怀疑：早知如此，当初是不是该跟大哥或二哥学？',
        options: [
          {
            label: '割然醒悟',
            description: '回头向大哥求教。大哥不计前嫌，从头教你"治未病"之理。',
            effects: [{ type: 'addRelic', relicId: 'equipment_zhiweibing', count: 1 }, { type: 'maxHpChange', value: -3 }],
            setMarker: 'three_brothers_act2=awaken',
          },
          {
            label: '坚持到底',
            description: '继续钻研起死回生之术。扁鹊叹道："你选了我的路，就得走到底。"',
            effects: [{ type: 'addCard', cardId: 'qinggusan' }, { type: 'maxHpChange', value: -5 }],
            setMarker: 'three_brothers_act2=persist',
          },
        ],
      };
    }
    return null;
  }

  if (act === 3) {
    if (choice === 'dade') {
      return {
        title: '三兄弟重聚',
        description: '多年后，你已是白发苍苍的老医者。一日，三兄弟再次齐聚。\n二哥拱手道："当年你选大哥，我心有不甘。如今方知——你那条路，才是最难的。"\n扁鹊点头："我们治的是病，你治的是天下。"\n大哥拍你的肩："你救了千万人，损了自己。值吗？"',
        options: [
          {
            label: '答：值了',
            description: '"这是我的选择。"三兄弟齐声道："你已得道。"',
            effects: [{ type: 'heal', value: 999 }, { type: 'maxHpChange', value: 3 }],
          },
          {
            label: '答：不悔，但偶尔羡慕',
            description: '"若当初选了另一条路……"大哥递来最后一副药方："收下吧。你早就是自己的师父了。"',
            effects: [],
          },
        ],
      };
    }
    if (choice === 'erge') {
      return {
        title: '三兄弟重聚',
        description: '多年后，你已是白发苍苍的老医者。一日，三兄弟再次齐聚。\n大哥点头："你走的是最踏实的路。不显赫，但每一步都踩得稳。"\n扁鹊难得沉默，良久才说："我救将死之人，你救初病之人。我们救的都是人。"\n二哥看着你："没给我丢人。"',
        options: [
          {
            label: '答：值了',
            description: '"这是我的选择。"三兄弟齐声道："你已得道。"',
            effects: [{ type: 'heal', value: 999 }, { type: 'maxHpChange', value: 3 }],
          },
          {
            label: '答：不悔，但偶尔羡慕',
            description: '"若当初选了另一条路……"大哥递来最后一副药方："收下吧。你早就是自己的师父了。"',
            effects: [],
          },
        ],
      };
    }
    if (choice === 'bianque') {
      return {
        title: '三兄弟重聚',
        description: '多年后，你已是白发苍苍的老医者。一日，三兄弟再次齐聚。\n大哥打量你："你走最险的路，救最难的人。你的手满是血，你的心满是痕。"\n二哥轻轻说："若当初跟我……" 扁鹊打断："他走的是他自己的路。"',
        options: [
          {
            label: '答：值了',
            description: '"这是我的选择。"三兄弟齐声道："你已得道。"',
            effects: [{ type: 'heal', value: 999 }, { type: 'maxHpChange', value: 3 }],
          },
          {
            label: '答：不悔，但偶尔羡慕',
            description: '"若当初选了另一条路……"大哥递来最后一副药方："收下吧。你早就是自己的师父了。"',
            effects: [],
          },
        ],
      };
    }
    return null;
  }

  return null;
};

export const SIDE_EVENTS: GameEvent[] = [
  {
    id: 'side_needle_stage1',
    title: '古医馆求针',
    description: '破旧医馆中，老针灸师墙上挂着十二时辰经络图。他说："想学子午流注？替我试针——时辰不同，同一穴位功效天差地别。你敢让我在你身上试吗？"',
    options: [
      {
        label: '以身试针',
        description: '老翁大笑："忍得住痛，这手札归你了。"',
        effects: [{ type: 'heal', value: 10 }, { type: 'addCard', cardId: 'gancao' }, { type: 'maxHpChange', value: -2 }],
        setMarker: 'needle_stage1=needle',
      },
      {
        label: '献金学艺',
        description: '老翁点头："花钱买命，不亏。但针法真谛，不在针，在时。"',
        effects: [{ type: 'goldChange', value: -150 }, { type: 'addCard', cardId: 'zusanli' }],
        setMarker: 'needle_stage1=needle_gold',
      },
      {
        label: '偷针逃跑',
        description: '老翁对着空针盒叹息。',
        effects: [{ type: 'addCard', cardId: 'sanyinjiao' }, { type: 'goldChange', value: -30 }, { type: 'shopPriceChange', value: 10 }],
      },
    ],
  },
  {
    id: 'side_needle_stage2',
    title: '继承衣钵',
    description: '再次见到老翁，他已病入膏肓。他将一本手札交给你："子午流注的真谛，不在于针，而在于\'时\'。我年轻时试针太多，经络已损……这便是代价。"',
    continuationMarker: 'needle_stage1',
    clearMarkerOnTrigger: 'needle_stage1',
    options: [
      {
        label: '继承衣钵',
        description: '老翁闭目而逝，手札浸满了他的体温。',
        effects: [
          { type: 'addRelic', relicId: 'equipment_ziwuliuzhu', count: 1 },
        ],
      },
      {
        label: '拒绝继承',
        description: '你心生畏惧，不敢再碰针法。但老翁的叹息在你耳边久久不散。',
        effects: [{ type: 'heal', value: 20 }],
      },
    ],
  },
  {
    id: 'side_yaowang',
    title: '药王义诊',
    description: '药王孙思邈在山村义诊。病人中有衣衫褴褛的贫民，也有眼神凶悍的逃犯。\n"你既为医，可愿一视同仁？"',
    options: [
      {
        label: '一视同仁',
        description: '药王说："你救他性命，他偷你盘缠。世间因果，便是整体。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_zhengti', count: 1 }, { type: 'heal', value: 999 }, { type: 'goldChange', value: -80 }],
      },
      {
        label: '区别对待',
        description: '药王摇头："你只见贫富，不见疾苦。还差得远。"',
        effects: [{ type: 'goldChange', value: 50 }, { type: 'heal', value: 15 }],
      },
      {
        label: '拒绝义诊',
        description: '药王叹息。你转身离开，心里却有些发虚。',
        effects: [{ type: 'goldChange', value: -30 }],
      },
    ],
  },
  {
    id: 'side_bianzheng',
    title: '同病异治',
    description: '两名病人同是发热头痛。甲外感风寒需发汗，乙内伤食积需泻下。\n同行医者劝你："开同样的药最保险，何必冒险？"',
    options: [
      {
        label: '辨证开方',
        description: '两人皆愈！华佗闻讯称赞："此人知同病异治之理。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_bianzheng', count: 1 }, { type: 'goldChange', value: 130 }],
      },
      {
        label: '保守治疗',
        description: '乙病情加重——你不得不全力补救。最终从错误中真正学会了辨证。',
        effects: [{ type: 'addRelic', relicId: 'equipment_bianzheng', count: 1 }, { type: 'goldChange', value: 50 }, { type: 'maxHpChange', value: -1 }],
      },
      {
        label: '拒诊',
        description: '病人家属闹上门来索赔。',
        effects: [{ type: 'goldChange', value: -30 }],
      },
    ],
  },
  {
    id: 'side_yinyang',
    title: '太极悟道',
    description: '山间道长打太极拳，口中念道："阴平阳秘，精神乃治。\n你可知阴阳消长，如昼夜交替？"',
    options: [
      {
        label: '拜师学艺',
        description: '道长说："入门需清心。"道长祝福："阴阳互根，你已入门。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_yinyang', count: 1 }, { type: 'heal', value: 999 }, { type: 'removeCard', count: 1 }],
      },
      {
        label: '切磋求悟',
        description: '道长手下不留情。但推手中你确有所悟。',
        effects: [{ type: 'addRelic', relicId: 'equipment_yinyang', count: 1 }, { type: 'heal', value: 30 }, { type: 'maxHpChange', value: -1 }],
      },
      {
        label: '质疑阴阳',
        description: '道长一笑："无缘不强求。"',
        effects: [{ type: 'goldChange', value: 80 }],
      },
    ],
  },
  {
    id: 'side_tianren',
    title: '四时养生',
    description: '老农在田间说："春生夏长秋收冬藏，顺天者昌，逆天者亡。\n连我这老农都懂——冬天种稻，只配烂在地里。"',
    options: [
      {
        label: '虚心受教',
        description: '老农递来一碗谷雨茶："顺应天时，这茶才香。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_tianren', count: 1 }, { type: 'maxHpChange', value: 3 }, { type: 'goldChange', value: -80 }],
      },
      {
        label: '半信半疑',
        description: '老农叹道："逆时而行的代价，你迟早会懂。"',
        effects: [{ type: 'goldChange', value: 50 }],
      },
      {
        label: '嗤之以鼻',
        description: '忽然风邪入体。',
        effects: [{ type: 'goldChange', value: 60 }, { type: 'maxHpChange', value: -2 }],
      },
    ],
  },
  {
    id: 'side_zhengxie',
    title: '正邪交争',
    description: '军营中医官选拔勇士进行"正气淬炼"——在重伤边缘反复锤炼，激发潜能。\n"正气存内，邪不可干。扛得住，便是铁骨；扛不住，就躺着出去。"',
    actRequirement: 2,
    options: [
      {
        label: '接受淬炼',
        description: '医官点头："好胆色！"',
        effects: [{ type: 'addRelic', relicId: 'equipment_zhengxie', count: 1 }],
      },
      {
        label: '温和养生',
        description: '医官说："稳扎稳打，也不错。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_zhengxie', count: 1 }, { type: 'goldChange', value: -100 }, { type: 'heal', value: 20 }],
      },
      {
        label: '贪生怕死',
        description: '医官摇头。不过军中还是教了你一些防身技巧。',
        effects: [],
      },
    ],
  },
  {
    id: 'side_zangxiang',
    title: '藏象之谜',
    description: '古籍残卷："五脏藏精气而不泻，六腑传化物而不藏。\n藏泻有度，病安从来？"后半页被撕毁。',
    options: [
      {
        label: '彻夜抄录',
        description: '数日后你在临床中顿悟——五脏如官，各司其职。',
        effects: [{ type: 'addRelic', relicId: 'equipment_zangxiang', count: 1 }, { type: 'maxHpChange', value: -2 }],
      },
      {
        label: '请教前辈',
        description: '老医官说："书中是死的，活人身上才是活的。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_zangxiang', count: 1 }, { type: 'goldChange', value: -80 }],
      },
      {
        label: '丢弃残卷',
        description: '错过机缘。',
        effects: [],
      },
    ],
  },
  {
    id: 'side_jingluo',
    title: '经络奇遇',
    description: '盲人按摩师正在为患者推拿，他虽眼盲，却能精准摸到每一条经络。\n"你可愿以身为器，感受经络？我按哪里，你便知哪条经不通。"',
    options: [
      {
        label: '以身体验',
        description: '盲师说："十二经络如江河。痛，便是淤堵之处。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_jingluo', count: 1 }, { type: 'heal', value: 30 }, { type: 'maxHpChange', value: -2 }],
      },
      {
        label: '赠盲杖结缘',
        description: '盲师摸索着盲杖，将自己的手札递给你。',
        effects: [{ type: 'addRelic', relicId: 'equipment_jingluo', count: 1 }, { type: 'goldChange', value: -100 }],
      },
      {
        label: '偷师',
        description: '盲师察觉："唉，心盲则经络永不通。"',
        effects: [{ type: 'goldChange', value: -50 }],
      },
    ],
  },
  {
    id: 'side_qiji',
    title: '气机升降',
    description: '气功大师一呼一吸间，落叶随之盘旋。"清气升，浊气降。\n你看这落叶——升不是永远升，降不是永远降。升降有道，气机自转。"',
    options: [
      {
        label: '潜心修习',
        description: '大师点头："你已有自转之力，不必再来找我。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_qiji', count: 1 }, { type: 'maxHpChange', value: -3 }],
      },
      {
        label: '求大师灌顶',
        description: '大师摇头："速成有代价。以后每逢气机不稳，伤口便会隐隐作痛。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_qiji', count: 1 }, { type: 'damage', value: 15 }],
      },
      {
        label: '畏惧痛苦',
        description: '你省下拜师费继续赶路。',
        effects: [{ type: 'goldChange', value: 50 }],
      },
    ],
  },
  {
    id: 'side_qixue',
    title: '气血同源',
    description: '药田里满地当归。白发老妪采药时问："年轻人，你可知——\n为何有人喝了半辈子当归汤，血还是虚？"',
    options: [
      {
        label: '答：血虚不补气，如无火煮水',
        description: '老妪眼睛一亮："你懂阳中求阴。气为血之帅，血为气之母。这玉牌归你了。"',
        effects: [{ type: 'addRelic', relicId: 'equipment_qixue_jinye', count: 1 }],
      },
      {
        label: '答：补得不够多',
        description: '老妪摇头，但怜你诚心，送了你一碗补汤。',
        effects: [{ type: 'heal', value: 10 }],
      },
      {
        label: '不耐烦',
        description: '"区区气血，回去翻书便是。"老妪不再言语。',
        effects: [{ type: 'goldChange', value: 50 }],
      },
    ],
  },
];
