const {
  createGameState, drawCard, advanceTurn,
  resolveNonInteractiveEffect, resolveAssignDrink,
  resolveTruthDare, resolveDuel, resolveGuandanKing,
  getRandomTruth, getRandomDare, getGameStats,
  EFFECT_TYPES, EFFECT_CONFIG
} = require('./gameLogic')

class GameManager {
  constructor() {
    // roomCode -> { state, clients: Map<openId, ws>, turnTimer }
    this.rooms = new Map()
  }

  // --- 房间管理 ---

  createRoom(roomCode) {
    if (this.rooms.has(roomCode)) return false
    this.rooms.set(roomCode, {
      state: null,
      clients: new Map(),
      players: [], // 等待中的玩家列表
      turnTimer: null,
      status: 'waiting'
    })
    return true
  }

  joinRoom(roomCode, openId, nickname, avatarUrl, ws) {
    let room = this.rooms.get(roomCode)
    if (!room) {
      // 自动创建房间（从云函数创建后连WS）
      this.createRoom(roomCode)
      room = this.rooms.get(roomCode)
    }

    // 断线重连
    if (room.clients.has(openId)) {
      room.clients.set(openId, ws)
      ws._openId = openId
      ws._roomCode = roomCode
      // 发送当前状态
      if (room.state) {
        this.sendTo(ws, 'room_state', this._getClientState(room.state, openId))
      }
      return { reconnected: true }
    }

    // 新玩家加入
    const player = { openId, nickname, avatarUrl }
    room.clients.set(openId, ws)
    ws._openId = openId
    ws._roomCode = roomCode

    if (room.status === 'waiting') {
      room.players.push(player)
      // 广播给所有人
      this.broadcast(roomCode, 'player_joined', {
        player,
        players: room.players
      })
    }

    return { reconnected: false }
  }

  leaveRoom(roomCode, openId) {
    const room = this.rooms.get(roomCode)
    if (!room) return

    room.clients.delete(openId)

    if (room.status === 'waiting') {
      room.players = room.players.filter(p => p.openId !== openId)
      this.broadcast(roomCode, 'player_left', {
        openId,
        players: room.players
      })
    }

    // 游戏中断线：保留座位60秒
    if (room.status === 'playing') {
      setTimeout(() => {
        if (room.clients.has(openId)) return // 已重连
        // 标记AFK
        if (room.state) {
          const p = room.state.players.find(p => p.openId === openId)
          if (p) p.afk = true
        }
      }, 60000)
    }

    // 房间空了就清除
    if (room.clients.size === 0) {
      this.clearTurnTimer(roomCode)
      this.rooms.delete(roomCode)
    }
  }

  // --- 游戏控制 ---

  startGame(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || room.status !== 'waiting') return false
    if (room.players.length < 2) return false

    room.status = 'playing'
    room.state = createGameState(roomCode, room.players)

    this.broadcast(roomCode, 'game_started', {
      players: room.state.players,
      currentPlayerIndex: 0,
      deckCount: room.state.deck.length
    })

    this.startTurnTimer(roomCode)
    return true
  }

  handleDrawCard(roomCode, openId) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const state = room.state

    // 验证是否当前玩家
    if (state.players[state.currentPlayerIndex].openId !== openId) return
    if (state.turnPhase !== 'draw') return

    const card = drawCard(state)
    if (!card) {
      // 牌堆空了，结束游戏
      this.endGame(roomCode)
      return
    }

    state.turnPhase = 'effect'

    // 广播抽牌结果
    this.broadcast(roomCode, 'card_drawn', {
      card,
      playerIndex: state.currentPlayerIndex,
      effectType: card.effectType,
      effectConfig: EFFECT_CONFIG[card.effectType],
      deckCount: state.deck.length,
      multiplier: state.multiplier
    })

    // 尝试自动结算非交互效果
    const resolution = resolveNonInteractiveEffect(state, card)
    if (resolution) {
      // 延迟发送结果，让客户端有时间展示卡牌动画
      setTimeout(() => {
        this.broadcast(roomCode, 'effect_resolved', resolution)
        this.nextTurn(roomCode)
      }, 2000)
    } else {
      // 需要交互：发送等待指令
      const pendingData = {
        effectType: card.effectType,
        needTarget: EFFECT_CONFIG[card.effectType].needTarget
      }

      // 真心话/大冒险附带题目
      if (card.effectType === EFFECT_TYPES.TRUTH) {
        pendingData.question = getRandomTruth()
      } else if (card.effectType === EFFECT_TYPES.DARE) {
        pendingData.question = getRandomDare()
      }

      this.broadcast(roomCode, 'effect_pending', pendingData)
      // 重置计时器等待玩家操作
      this.startTurnTimer(roomCode, 30)
    }
  }

  handleSelectTarget(roomCode, openId, targetOpenId) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const state = room.state
    if (state.players[state.currentPlayerIndex].openId !== openId) return
    if (state.turnPhase !== 'effect') return

    const card = state.currentCard
    if (!card) return

    let resolution
    if (card.effectType === EFFECT_TYPES.ASSIGN_DRINK) {
      resolution = resolveAssignDrink(state, targetOpenId)
    } else if (card.effectType === EFFECT_TYPES.DUEL) {
      resolution = resolveDuel(state, targetOpenId)
    }

    if (resolution) {
      this.broadcast(roomCode, 'effect_resolved', resolution)
      this.nextTurn(roomCode)
    }
  }

  handleTruthDareResponse(roomCode, openId, accepted) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const state = room.state
    if (state.players[state.currentPlayerIndex].openId !== openId) return

    const resolution = resolveTruthDare(state, accepted)
    this.broadcast(roomCode, 'effect_resolved', resolution)
    this.nextTurn(roomCode)
  }

  handleGuandanKingChoice(roomCode, openId, choice, targetOpenId) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const state = room.state
    if (state.players[state.currentPlayerIndex].openId !== openId) return

    const resolution = resolveGuandanKing(state, choice, targetOpenId)
    if (resolution) {
      this.broadcast(roomCode, 'effect_resolved', resolution)
      this.nextTurn(roomCode)
    }
  }

  handleUseShield(roomCode, openId) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const player = room.state.players.find(p => p.openId === openId)
    if (player && player.shieldCount > 0) {
      // 护盾在 applyDrinks 中自动使用，这里只是确认
      this.broadcast(roomCode, 'shield_used', { openId })
    }
  }

  // --- 回合管理 ---

  nextTurn(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return

    this.clearTurnTimer(roomCode)
    advanceTurn(room.state)

    // 跳过AFK玩家
    let attempts = 0
    while (room.state.players[room.state.currentPlayerIndex].afk && attempts < room.state.players.length) {
      advanceTurn(room.state)
      attempts++
    }

    this.broadcast(roomCode, 'turn_changed', {
      currentPlayerIndex: room.state.currentPlayerIndex,
      direction: room.state.direction,
      multiplier: room.state.multiplier,
      roundNumber: room.state.roundNumber,
      deckCount: room.state.deck.length
    })

    this.startTurnTimer(roomCode)
  }

  startTurnTimer(roomCode, seconds = 30) {
    this.clearTurnTimer(roomCode)
    const room = this.rooms.get(roomCode)
    if (!room) return

    let remaining = seconds
    room.turnTimer = setInterval(() => {
      remaining--
      if (remaining <= 10) {
        this.broadcast(roomCode, 'timer_tick', { secondsLeft: remaining })
      }
      if (remaining <= 0) {
        this.clearTurnTimer(roomCode)
        this.handleTimeout(roomCode)
      }
    }, 1000)
  }

  clearTurnTimer(roomCode) {
    const room = this.rooms.get(roomCode)
    if (room && room.turnTimer) {
      clearInterval(room.turnTimer)
      room.turnTimer = null
    }
  }

  handleTimeout(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return
    const state = room.state

    if (state.turnPhase === 'draw') {
      // 超时自动抽牌
      this.handleDrawCard(roomCode, state.players[state.currentPlayerIndex].openId)
    } else if (state.turnPhase === 'effect') {
      // 超时自动处理
      const card = state.currentCard
      if (!card) return

      if (card.effectType === EFFECT_TYPES.ASSIGN_DRINK) {
        // 随机选一个目标
        const others = state.players.filter((_, i) => i !== state.currentPlayerIndex)
        const target = others[Math.floor(Math.random() * others.length)]
        this.handleSelectTarget(roomCode, state.players[state.currentPlayerIndex].openId, target.openId)
      } else if (card.effectType === EFFECT_TYPES.TRUTH || card.effectType === EFFECT_TYPES.DARE) {
        // 超时视为拒绝
        this.handleTruthDareResponse(roomCode, state.players[state.currentPlayerIndex].openId, false)
      } else if (card.effectType === EFFECT_TYPES.DUEL) {
        const others = state.players.filter((_, i) => i !== state.currentPlayerIndex)
        const target = others[Math.floor(Math.random() * others.length)]
        this.handleSelectTarget(roomCode, state.players[state.currentPlayerIndex].openId, target.openId)
      } else if (card.effectType === EFFECT_TYPES.GUANDAN_KING) {
        // 超时默认全员喝
        this.handleGuandanKingChoice(roomCode, state.players[state.currentPlayerIndex].openId, 'all')
      }
    }
  }

  // --- 游戏结束 ---

  endGame(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state) return

    this.clearTurnTimer(roomCode)
    const stats = getGameStats(room.state)
    room.status = 'finished'

    this.broadcast(roomCode, 'game_ended', stats)
  }

  // --- 通信 ---

  sendTo(ws, type, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type, data }))
    }
  }

  broadcast(roomCode, type, data) {
    const room = this.rooms.get(roomCode)
    if (!room) return
    const msg = JSON.stringify({ type, data })
    room.clients.forEach(ws => {
      if (ws.readyState === 1) ws.send(msg)
    })
  }

  _getClientState(state, openId) {
    return {
      roomCode: state.roomCode,
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      direction: state.direction,
      multiplier: state.multiplier,
      currentCard: state.currentCard,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      deckCount: state.deck.length
    }
  }

  getRoomInfo(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    return {
      status: room.status,
      playerCount: room.clients.size,
      players: room.players
    }
  }
}

module.exports = new GameManager()
