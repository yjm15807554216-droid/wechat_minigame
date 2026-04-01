/**
 * 牌组效果配置
 */

const EFFECT_TYPES = {
  ASSIGN_DRINK: 'assign_drink',     // 指定喝
  REVERSE: 'reverse',               // 反转
  TRUTH: 'truth',                   // 真心话
  DARE: 'dare',                     // 大冒险
  SELF_DRINK: 'self_drink',         // 自饮
  ALL_DRINK: 'all_drink',           // 全员喝
  DOUBLE: 'double',                 // 翻倍炸弹
  SHIELD: 'shield',                 // 免罪金牌
  DUEL: 'duel',                     // 决斗
  LEFT_DRINK: 'left_drink',         // 左邻喝
  RIGHT_DRINK: 'right_drink',       // 右邻喝
  GUANDAN: 'guandan',               // 灌蛋
  IMMUNE: 'immune',                 // 天选之人
  GUANDAN_KING: 'guandan_king'      // 灌蛋王
}

// 牌面 → 效果映射
const RANK_EFFECT_MAP = {
  'A': EFFECT_TYPES.ASSIGN_DRINK,
  '2': EFFECT_TYPES.REVERSE,
  '3': EFFECT_TYPES.TRUTH,
  '4': EFFECT_TYPES.DARE,
  '5': EFFECT_TYPES.SELF_DRINK,
  '6': EFFECT_TYPES.ALL_DRINK,
  '7': EFFECT_TYPES.DOUBLE,
  '8': EFFECT_TYPES.SHIELD,
  '9': EFFECT_TYPES.ASSIGN_DRINK,
  '10': EFFECT_TYPES.DUEL,
  'J': EFFECT_TYPES.LEFT_DRINK,
  'Q': EFFECT_TYPES.RIGHT_DRINK,
  'K': EFFECT_TYPES.GUANDAN
}

// 效果详情配置
const EFFECT_CONFIG = {
  [EFFECT_TYPES.ASSIGN_DRINK]: {
    name: '指定喝',
    icon: '👉',
    color: '#FF6B6B',
    description: '指定任意一名玩家喝{drinks}口',
    baseDrinks: 1,
    needTarget: true
  },
  [EFFECT_TYPES.REVERSE]: {
    name: '反转',
    icon: '🔄',
    color: '#4ECDC4',
    description: '出牌方向反转！',
    baseDrinks: 0,
    needTarget: false
  },
  [EFFECT_TYPES.TRUTH]: {
    name: '真心话',
    icon: '💬',
    color: '#45B7D1',
    description: '回答一个真心话问题，拒绝则喝{drinks}口',
    baseDrinks: 2,
    needTarget: false
  },
  [EFFECT_TYPES.DARE]: {
    name: '大冒险',
    icon: '🎯',
    color: '#F7DC6F',
    description: '完成一个大冒险任务，拒绝则喝{drinks}口',
    baseDrinks: 2,
    needTarget: false
  },
  [EFFECT_TYPES.SELF_DRINK]: {
    name: '自饮',
    icon: '🍺',
    color: '#F39C12',
    description: '自己喝{drinks}口',
    baseDrinks: 1,
    needTarget: false
  },
  [EFFECT_TYPES.ALL_DRINK]: {
    name: '全员喝',
    icon: '🍻',
    color: '#E74C3C',
    description: '所有人各喝{drinks}口',
    baseDrinks: 1,
    needTarget: false
  },
  [EFFECT_TYPES.DOUBLE]: {
    name: '翻倍炸弹',
    icon: '💣',
    color: '#9B59B6',
    description: '下一张牌的惩罚翻倍！当前倍率 x{multiplier}',
    baseDrinks: 0,
    needTarget: false
  },
  [EFFECT_TYPES.SHIELD]: {
    name: '免罪金牌',
    icon: '🛡️',
    color: '#2ECC71',
    description: '获得一张免罪牌，可抵消一次惩罚',
    baseDrinks: 0,
    needTarget: false
  },
  [EFFECT_TYPES.DUEL]: {
    name: '决斗',
    icon: '⚔️',
    color: '#E67E22',
    description: '指定一人决斗！双方掷骰子，点数小者喝{drinks}口',
    baseDrinks: 2,
    needTarget: true
  },
  [EFFECT_TYPES.LEFT_DRINK]: {
    name: '左邻喝',
    icon: '👈',
    color: '#3498DB',
    description: '你左边的人喝{drinks}口',
    baseDrinks: 1,
    needTarget: false
  },
  [EFFECT_TYPES.RIGHT_DRINK]: {
    name: '右邻喝',
    icon: '👉',
    color: '#1ABC9C',
    description: '你右边的人喝{drinks}口',
    baseDrinks: 1,
    needTarget: false
  },
  [EFFECT_TYPES.GUANDAN]: {
    name: '灌蛋',
    icon: '🥚',
    color: '#FF4757',
    description: '灌蛋！其他所有人各喝{drinks}口！',
    baseDrinks: 2,
    needTarget: false
  },
  [EFFECT_TYPES.IMMUNE]: {
    name: '天选之人',
    icon: '✨',
    color: '#FFD700',
    description: '接下来2轮免疫所有惩罚！',
    baseDrinks: 0,
    needTarget: false
  },
  [EFFECT_TYPES.GUANDAN_KING]: {
    name: '灌蛋王',
    icon: '👑',
    color: '#FF6348',
    description: '选择：指定一人喝5口 或 全员喝3口',
    baseDrinks: 5,
    needTarget: true
  }
}

// 花色配置
const SUIT_CONFIG = {
  spade: { name: '黑桃', symbol: '♠', color: '#333' },
  heart: { name: '红心', symbol: '♥', color: '#e94560' },
  diamond: { name: '方块', symbol: '♦', color: '#e94560' },
  club: { name: '梅花', symbol: '♣', color: '#333' },
  joker: { name: '鬼牌', symbol: '🃏', color: '#9B59B6' }
}

/**
 * 获取效果描述（替换占位符）
 */
function getEffectDescription(effectType, multiplier) {
  const config = EFFECT_CONFIG[effectType]
  if (!config) return ''
  const drinks = config.baseDrinks * (multiplier || 1)
  return config.description
    .replace('{drinks}', drinks)
    .replace('{multiplier}', multiplier || 1)
}

/**
 * 获取牌面显示文本
 */
function getCardDisplayText(card) {
  if (card.suit === 'joker') {
    return card.rank === 'small_joker' ? '小王' : '大王'
  }
  const suit = SUIT_CONFIG[card.suit]
  return suit.symbol + card.rank
}

module.exports = {
  EFFECT_TYPES,
  RANK_EFFECT_MAP,
  EFFECT_CONFIG,
  SUIT_CONFIG,
  getEffectDescription,
  getCardDisplayText
}
