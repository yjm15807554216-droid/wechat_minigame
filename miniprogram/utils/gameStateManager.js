/**
 * 游戏状态管理器
 * 本地镜像服务端状态，驱动页面 setData 更新
 */

class GameStateManager {
  constructor() {
    this.state = null
    this._onChange = null
  }

  init(fullState) {
    this.state = {
      roomCode: fullState.roomCode,
      players: fullState.players || [],
      currentPlayerIndex: fullState.currentPlayerIndex || 0,
      direction: fullState.direction || 1,
      multiplier: fullState.multiplier || 1,
      currentCard: fullState.currentCard || null,
      turnPhase: fullState.turnPhase || 'draw',
      roundNumber: fullState.roundNumber || 1,
      deckCount: fullState.deckCount || 54,
      // 本地UI状态
      showEffectPopup: false,
      effectPopupData: null,
      pendingEffect: null,
      gameLog: [],
      timerSeconds: 30,
      duelData: null,
      gameEnded: false,
      gameStats: null
    }
    this._notify()
  }

  setOnChange(callback) {
    this._onChange = callback
  }

  getState() {
    return this.state
  }

  getMyPlayer(openId) {
    if (!this.state) return null
    return this.state.players.find(p => p.openId === openId)
  }

  isMyTurn(openId) {
    if (!this.state) return false
    const current = this.state.players[this.state.currentPlayerIndex]
    return current && current.openId === openId
  }

  getCurrentPlayer() {
    if (!this.state) return null
    return this.state.players[this.state.currentPlayerIndex]
  }

  // 处理服务端消息
  handleMessage(type, data) {
    if (!this.state && type !== 'game_started' && type !== 'room_state') return

    switch (type) {
      case 'room_state':
      case 'game_started':
        this.init(data)
        break

      case 'card_drawn':
        this.state.currentCard = data.card
        this.state.turnPhase = 'effect'
        this.state.deckCount = data.deckCount
        this.state.multiplier = data.multiplier
        this.state.showEffectPopup = true
        this.state.effectPopupData = {
          card: data.card,
          effectType: data.effectType,
          effectConfig: data.effectConfig,
          playerName: this.state.players[data.playerIndex].nickname
        }
        this._addLog(`${this.state.players[data.playerIndex].nickname} 抽到了 ${data.effectConfig.name}`)
        break

      case 'effect_pending':
        this.state.pendingEffect = data
        break

      case 'effect_resolved':
        this.state.pendingEffect = null
        this.state.showEffectPopup = false
        if (data.results) {
          data.results.forEach(r => {
            const player = this.state.players.find(p => p.openId === r.openId)
            if (player) {
              if (r.immune) {
                this._addLog(`${player.nickname} 免疫了惩罚!`)
              } else if (r.shielded) {
                player.shieldCount = Math.max(0, (player.shieldCount || 0) - 1)
                this._addLog(`${player.nickname} 使用了护盾!`)
              } else if (r.drinks > 0) {
                player.totalDrinks = (player.totalDrinks || 0) + r.drinks
                this._addLog(`${player.nickname} 喝了 ${r.drinks} 口`)
              }
            }
          })
        }
        if (data.effectType === 'truth' || data.effectType === 'dare') {
          if (data.accepted) {
            this._addLog(`${this.getCurrentPlayer().nickname} 接受了挑战`)
          }
        }
        if (data.effectType === 'duel') {
          const loser = this.state.players.find(p => p.openId === data.loserOpenId)
          this.state.duelData = {
            challengerRoll: data.challengerRoll,
            defenderRoll: data.defenderRoll,
            loserName: loser ? loser.nickname : '未知'
          }
        }
        break

      case 'turn_changed':
        this.state.currentPlayerIndex = data.currentPlayerIndex
        this.state.direction = data.direction
        this.state.multiplier = data.multiplier
        this.state.roundNumber = data.roundNumber
        this.state.deckCount = data.deckCount
        this.state.currentCard = null
        this.state.turnPhase = 'draw'
        this.state.pendingEffect = null
        this.state.showEffectPopup = false
        this.state.duelData = null
        this.state.timerSeconds = 30
        break

      case 'timer_tick':
        this.state.timerSeconds = data.secondsLeft
        break

      case 'shield_used':
        const shieldPlayer = this.state.players.find(p => p.openId === data.openId)
        if (shieldPlayer) {
          shieldPlayer.shieldCount = Math.max(0, (shieldPlayer.shieldCount || 0) - 1)
          this._addLog(`${shieldPlayer.nickname} 使用了护盾!`)
        }
        break

      case 'game_ended':
        this.state.gameEnded = true
        this.state.gameStats = data
        break
    }

    this._notify()
  }

  _addLog(text) {
    if (!this.state) return
    this.state.gameLog.unshift({
      text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    })
    // 保留最近50条
    if (this.state.gameLog.length > 50) {
      this.state.gameLog = this.state.gameLog.slice(0, 50)
    }
  }

  _notify() {
    if (this._onChange && this.state) {
      this._onChange({ ...this.state })
    }
  }

  destroy() {
    this.state = null
    this._onChange = null
  }
}

let instance = null
function getGameStateManager() {
  if (!instance) {
    instance = new GameStateManager()
  }
  return instance
}

function resetGameStateManager() {
  if (instance) {
    instance.destroy()
  }
  instance = new GameStateManager()
  return instance
}

module.exports = { getGameStateManager, resetGameStateManager }
