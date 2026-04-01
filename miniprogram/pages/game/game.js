const app = getApp()
const { getWsClient } = require('../../utils/wsClient')
const { getGameStateManager, resetGameStateManager } = require('../../utils/gameStateManager')
const { EFFECT_CONFIG, getEffectDescription } = require('../../utils/cardConfig')

Page({
  data: {
    // 游戏状态
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    multiplier: 1,
    roundNumber: 1,
    deckCount: 54,
    turnPhase: 'draw',
    currentCard: null,
    timerSeconds: 30,

    // UI状态
    myOpenId: '',
    isMyTurn: false,
    showEffectPopup: false,
    effectPopupData: null,
    pendingEffect: null,
    showTargetSelect: false,
    showTruthDare: false,
    showDuel: false,
    showGuandanKing: false,
    truthDareQuestion: '',
    duelData: null,
    gameLog: [],
    cardFlipped: false,

    // 房间信息
    roomCode: ''
  },

  onLoad(options) {
    const { roomCode } = options
    const openId = app.globalData.openId
    this.setData({ roomCode, myOpenId: openId })

    this.gsm = resetGameStateManager()
    this.wsClient = getWsClient()

    this.setupListeners()
  },

  setupListeners() {
    const ws = this.wsClient
    const gsm = this.gsm

    // 状态变化回调
    gsm.setOnChange((state) => {
      const isMyTurn = gsm.isMyTurn(this.data.myOpenId)
      this.setData({
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        direction: state.direction,
        multiplier: state.multiplier,
        roundNumber: state.roundNumber,
        deckCount: state.deckCount,
        turnPhase: state.turnPhase,
        currentCard: state.currentCard,
        timerSeconds: state.timerSeconds,
        gameLog: state.gameLog.slice(0, 20),
        isMyTurn,
        showEffectPopup: state.showEffectPopup,
        effectPopupData: state.effectPopupData
      })
    })

    // WS消息 -> 状态管理器
    const messageTypes = [
      'room_state', 'game_started', 'card_drawn', 'effect_pending',
      'effect_resolved', 'turn_changed', 'timer_tick', 'shield_used', 'game_ended'
    ]

    messageTypes.forEach(type => {
      ws.on(type, (data) => {
        gsm.handleMessage(type, data)

        // 额外的UI逻辑
        if (type === 'card_drawn') {
          this.setData({ cardFlipped: false })
          setTimeout(() => this.setData({ cardFlipped: true }), 300)
        }

        if (type === 'effect_pending') {
          this.handleEffectPending(data)
        }

        if (type === 'effect_resolved') {
          this.handleEffectResolved(data)
        }

        if (type === 'game_ended') {
          this.handleGameEnded(data)
        }
      })
    })

    ws.on('error', (data) => {
      wx.showToast({ title: data.message || '操作失败', icon: 'none' })
    })
  },

  // 抽牌
  drawCard() {
    if (!this.data.isMyTurn || this.data.turnPhase !== 'draw') return
    this.wsClient.send('draw_card', {
      roomCode: this.data.roomCode,
      openId: this.data.myOpenId
    })
  },

  // 处理待交互效果
  handleEffectPending(data) {
    const { effectType, needTarget, question } = data

    if (effectType === 'assign_drink' || (effectType === 'duel' && needTarget)) {
      this.setData({ showTargetSelect: true, pendingEffect: data })
    } else if (effectType === 'truth' || effectType === 'dare') {
      this.setData({
        showTruthDare: true,
        truthDareQuestion: question || '',
        pendingEffect: data
      })
    } else if (effectType === 'guandan_king') {
      this.setData({ showGuandanKing: true, pendingEffect: data })
    }
  },

  // 处理效果结算
  handleEffectResolved(data) {
    this.setData({
      showTargetSelect: false,
      showTruthDare: false,
      showDuel: false,
      showGuandanKing: false,
      pendingEffect: null
    })

    if (data.effectType === 'duel' && data.challengerRoll !== undefined) {
      this.setData({
        showDuel: true,
        duelData: data
      })
      setTimeout(() => this.setData({ showDuel: false, duelData: null }), 3000)
    }
  },

  // 选择目标玩家
  selectTarget(e) {
    const targetOpenId = e.currentTarget.dataset.openid
    if (!targetOpenId || targetOpenId === this.data.myOpenId) return

    const pending = this.data.pendingEffect
    if (!pending) return

    this.wsClient.send('select_target', {
      roomCode: this.data.roomCode,
      openId: this.data.myOpenId,
      targetOpenId
    })
    this.setData({ showTargetSelect: false })
  },

  // 真心话/大冒险回应
  respondTruthDare(e) {
    const accepted = e.currentTarget.dataset.accepted === 'true'
    this.wsClient.send('truth_dare_response', {
      roomCode: this.data.roomCode,
      openId: this.data.myOpenId,
      accepted
    })
    this.setData({ showTruthDare: false })
  },

  // 灌蛋王选择
  guandanKingChoice(e) {
    const choice = e.currentTarget.dataset.choice
    this.wsClient.send('guandan_king_choice', {
      roomCode: this.data.roomCode,
      openId: this.data.myOpenId,
      choice
    })
    if (choice === 'single') {
      // 需要再选目标
      this.setData({ showGuandanKing: false, showTargetSelect: true })
    } else {
      this.setData({ showGuandanKing: false })
    }
  },

  // 使用护盾
  useShield() {
    this.wsClient.send('use_shield', {
      roomCode: this.data.roomCode,
      openId: this.data.myOpenId
    })
  },

  // 关闭效果弹窗
  dismissPopup() {
    this.setData({ showEffectPopup: false })
  },

  // 游戏结束
  handleGameEnded(data) {
    app.globalData.gameStats = data
    setTimeout(() => {
      wx.redirectTo({ url: `/pages/result/result?roomCode=${this.data.roomCode}` })
    }, 2000)
  },

  // 获取效果描述
  getEffectDesc(effectType) {
    return getEffectDescription(effectType, this.data.multiplier)
  },

  onUnload() {
    if (this.gsm) this.gsm.destroy()
  }
})
