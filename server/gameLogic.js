const { shuffleArray } = require('./utils')

// 镜像小程序端的效果类型
const EFFECT_TYPES = {
  ASSIGN_DRINK: 'assign_drink',
  REVERSE: 'reverse',
  TRUTH: 'truth',
  DARE: 'dare',
  SELF_DRINK: 'self_drink',
  ALL_DRINK: 'all_drink',
  DOUBLE: 'double',
  SHIELD: 'shield',
  DUEL: 'duel',
  LEFT_DRINK: 'left_drink',
  RIGHT_DRINK: 'right_drink',
  GUANDAN: 'guandan',
  IMMUNE: 'immune',
  GUANDAN_KING: 'guandan_king'
}

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

const EFFECT_CONFIG = {
  [EFFECT_TYPES.ASSIGN_DRINK]: { name: '指定喝', baseDrinks: 1, needTarget: true },
  [EFFECT_TYPES.REVERSE]: { name: '反转', baseDrinks: 0, needTarget: false },
  [EFFECT_TYPES.TRUTH]: { name: '真心话', baseDrinks: 2, needTarget: false },
  [EFFECT_TYPES.DARE]: { name: '大冒险', baseDrinks: 2, needTarget: false },
  [EFFECT_TYPES.SELF_DRINK]: { name: '自饮', baseDrinks: 1, needTarget: false },
  [EFFECT_TYPES.ALL_DRINK]: { name: '全员喝', baseDrinks: 1, needTarget: false },
  [EFFECT_TYPES.DOUBLE]: { name: '翻倍炸弹', baseDrinks: 0, needTarget: false },
  [EFFECT_TYPES.SHIELD]: { name: '免罪金牌', baseDrinks: 0, needTarget: false },
  [EFFECT_TYPES.DUEL]: { name: '决斗', baseDrinks: 2, needTarget: true },
  [EFFECT_TYPES.LEFT_DRINK]: { name: '左邻喝', baseDrinks: 1, needTarget: false },
  [EFFECT_TYPES.RIGHT_DRINK]: { name: '右邻喝', baseDrinks: 1, needTarget: false },
  [EFFECT_TYPES.GUANDAN]: { name: '灌蛋', baseDrinks: 2, needTarget: false },
  [EFFECT_TYPES.IMMUNE]: { name: '天选之人', baseDrinks: 0, needTarget: false },
  [EFFECT_TYPES.GUANDAN_KING]: { name: '灌蛋王', baseDrinks: 5, needTarget: true }
}

// 真心话题库
const TRUTH_QUESTIONS = [
  '你现在手机里最不想让别人看到的是什么？',
  '你最近一次说谎是什么时候，对谁说的？',
  '你暗恋过在座的谁？',
  '你最尴尬的一次经历是什么？',
  '你手机里最近删除的一张照片是什么？',
  '你做过最疯狂的事情是什么？',
  '你觉得在座谁最好看？',
  '你上一次哭是因为什么？',
  '你手机里最多的联系人类型是？',
  '你最近一次心动是什么时候？'
]

// 大冒险题库
const DARE_TASKS = [
  '给你的第一个微信好友发一句"我想你了"',
  '模仿一个动物叫30秒',
  '用搞怪语气说"我是全场最靓的仔"',
  '发一条朋友圈：今晚我是灌蛋王！',
  '给最近聊天的人发一个飞吻表情',
  '学一段广告台词',
  '大声唱一首歌的副歌部分',
  '做10个深蹲',
  '对着手机前置摄像头做一个鬼脸并截图',
  '用方言说一句"我爱你们每一个人"'
]

function createDeck() {
  const suits = ['spade', 'heart', 'diamond', 'club']
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        effectType: RANK_EFFECT_MAP[rank]
      })
    }
  }

  // 小王 = 天选之人, 大王 = 灌蛋王
  deck.push({ suit: 'joker', rank: 'small_joker', effectType: EFFECT_TYPES.IMMUNE })
  deck.push({ suit: 'joker', rank: 'big_joker', effectType: EFFECT_TYPES.GUANDAN_KING })

  return shuffleArray(deck)
}

function createGameState(roomCode, players) {
  return {
    roomCode,
    players: players.map((p, i) => ({
      openId: p.openId,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      index: i,
      totalDrinks: 0,
      shieldCount: 0,
      immuneRounds: 0
    })),
    deck: createDeck(),
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    multiplier: 1,
    currentCard: null,
    turnPhase: 'draw', // draw | effect | resolve
    roundNumber: 1,
    gameLog: [],
    startedAt: Date.now()
  }
}

function drawCard(state) {
  // 牌堆空了，回收弃牌堆
  if (state.deck.length === 0) {
    if (state.discardPile.length === 0) {
      return null // 所有牌用完
    }
    state.deck = shuffleArray(state.discardPile)
    state.discardPile = []
  }
  const card = state.deck.pop()
  state.currentCard = card
  return card
}

function getNextPlayerIndex(state) {
  const count = state.players.length
  let next = state.currentPlayerIndex + state.direction
  if (next >= count) next = 0
  if (next < 0) next = count - 1
  return next
}

function advanceTurn(state) {
  // 减少免疫回合
  state.players.forEach(p => {
    if (p.immuneRounds > 0) p.immuneRounds--
  })
  state.currentPlayerIndex = getNextPlayerIndex(state)
  state.currentCard = null
  state.turnPhase = 'draw'
  state.roundNumber++
}

function applyDrinks(state, playerIndex, drinks) {
  const player = state.players[playerIndex]
  if (player.immuneRounds > 0) {
    return { openId: player.openId, drinks: 0, shielded: false, immune: true }
  }
  if (player.shieldCount > 0 && drinks > 0) {
    player.shieldCount--
    return { openId: player.openId, drinks: 0, shielded: true, immune: false }
  }
  player.totalDrinks += drinks
  return { openId: player.openId, drinks, shielded: false, immune: false }
}

function resolveNonInteractiveEffect(state, card) {
  const effectType = card.effectType
  const config = EFFECT_CONFIG[effectType]
  const drinks = config.baseDrinks * state.multiplier
  const currentPlayer = state.players[state.currentPlayerIndex]
  const results = []

  switch (effectType) {
    case EFFECT_TYPES.REVERSE:
      state.direction *= -1
      // 重置倍率
      if (state.multiplier > 1) state.multiplier = 1
      break

    case EFFECT_TYPES.SELF_DRINK:
      results.push(applyDrinks(state, state.currentPlayerIndex, drinks))
      if (state.multiplier > 1) state.multiplier = 1
      break

    case EFFECT_TYPES.ALL_DRINK:
      state.players.forEach((_, i) => {
        results.push(applyDrinks(state, i, drinks))
      })
      if (state.multiplier > 1) state.multiplier = 1
      break

    case EFFECT_TYPES.DOUBLE:
      state.multiplier *= 2
      break

    case EFFECT_TYPES.SHIELD:
      currentPlayer.shieldCount++
      if (state.multiplier > 1) state.multiplier = 1
      break

    case EFFECT_TYPES.LEFT_DRINK: {
      const count = state.players.length
      const leftIndex = (state.currentPlayerIndex - 1 + count) % count
      results.push(applyDrinks(state, leftIndex, drinks))
      if (state.multiplier > 1) state.multiplier = 1
      break
    }

    case EFFECT_TYPES.RIGHT_DRINK: {
      const rightIndex = (state.currentPlayerIndex + 1) % state.players.length
      results.push(applyDrinks(state, rightIndex, drinks))
      if (state.multiplier > 1) state.multiplier = 1
      break
    }

    case EFFECT_TYPES.GUANDAN:
      state.players.forEach((_, i) => {
        if (i !== state.currentPlayerIndex) {
          results.push(applyDrinks(state, i, drinks))
        }
      })
      if (state.multiplier > 1) state.multiplier = 1
      break

    case EFFECT_TYPES.IMMUNE:
      currentPlayer.immuneRounds = 2
      if (state.multiplier > 1) state.multiplier = 1
      break

    default:
      return null // 需要交互的效果
  }

  // 弃牌
  if (card.effectType !== EFFECT_TYPES.DOUBLE) {
    state.discardPile.push(card)
  }

  return { effectType, results, drinks, multiplier: state.multiplier }
}

function resolveAssignDrink(state, targetOpenId) {
  const drinks = EFFECT_CONFIG[EFFECT_TYPES.ASSIGN_DRINK].baseDrinks * state.multiplier
  const targetIndex = state.players.findIndex(p => p.openId === targetOpenId)
  if (targetIndex === -1) return null
  const result = applyDrinks(state, targetIndex, drinks)
  state.discardPile.push(state.currentCard)
  if (state.multiplier > 1) state.multiplier = 1
  return { effectType: EFFECT_TYPES.ASSIGN_DRINK, results: [result], drinks }
}

function resolveTruthDare(state, accepted) {
  const effectType = state.currentCard.effectType
  const results = []
  if (!accepted) {
    const drinks = EFFECT_CONFIG[effectType].baseDrinks * state.multiplier
    results.push(applyDrinks(state, state.currentPlayerIndex, drinks))
  }
  state.discardPile.push(state.currentCard)
  if (state.multiplier > 1) state.multiplier = 1
  return { effectType, accepted, results }
}

function resolveDuel(state, targetOpenId) {
  const challengerRoll = Math.floor(Math.random() * 6) + 1
  const defenderRoll = Math.floor(Math.random() * 6) + 1
  const drinks = EFFECT_CONFIG[EFFECT_TYPES.DUEL].baseDrinks * state.multiplier
  const targetIndex = state.players.findIndex(p => p.openId === targetOpenId)
  if (targetIndex === -1) return null

  let loserIndex
  if (challengerRoll <= defenderRoll) {
    loserIndex = state.currentPlayerIndex
  } else {
    loserIndex = targetIndex
  }
  const result = applyDrinks(state, loserIndex, drinks)
  state.discardPile.push(state.currentCard)
  if (state.multiplier > 1) state.multiplier = 1

  return {
    effectType: EFFECT_TYPES.DUEL,
    challengerRoll,
    defenderRoll,
    loserOpenId: state.players[loserIndex].openId,
    results: [result],
    drinks
  }
}

function resolveGuandanKing(state, choice, targetOpenId) {
  const results = []
  if (choice === 'single') {
    const targetIndex = state.players.findIndex(p => p.openId === targetOpenId)
    if (targetIndex === -1) return null
    results.push(applyDrinks(state, targetIndex, 5 * state.multiplier))
  } else {
    // all: 全员喝3口
    state.players.forEach((_, i) => {
      if (i !== state.currentPlayerIndex) {
        results.push(applyDrinks(state, i, 3 * state.multiplier))
      }
    })
  }
  state.discardPile.push(state.currentCard)
  if (state.multiplier > 1) state.multiplier = 1
  return { effectType: EFFECT_TYPES.GUANDAN_KING, choice, results }
}

function getRandomTruth() {
  return TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)]
}

function getRandomDare() {
  return DARE_TASKS[Math.floor(Math.random() * DARE_TASKS.length)]
}

function getGameStats(state) {
  const duration = Math.floor((Date.now() - state.startedAt) / 1000)
  const playerStats = state.players.map(p => ({
    openId: p.openId,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    totalDrinks: p.totalDrinks
  })).sort((a, b) => b.totalDrinks - a.totalDrinks)

  return {
    roomCode: state.roomCode,
    playerStats,
    totalRounds: state.roundNumber,
    duration,
    drinkKing: playerStats[0],
    luckyOne: playerStats[playerStats.length - 1]
  }
}

module.exports = {
  EFFECT_TYPES,
  EFFECT_CONFIG,
  createDeck,
  createGameState,
  drawCard,
  getNextPlayerIndex,
  advanceTurn,
  applyDrinks,
  resolveNonInteractiveEffect,
  resolveAssignDrink,
  resolveTruthDare,
  resolveDuel,
  resolveGuandanKing,
  getRandomTruth,
  getRandomDare,
  getGameStats
}
