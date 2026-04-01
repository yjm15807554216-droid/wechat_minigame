const gameManager = require('./gameManager')

function handleConnection(ws) {
  console.log('[WS] 新连接')

  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch (e) {
      console.error('[WS] 消息解析失败:', e.message)
      return
    }

    const { type, data } = msg
    if (!type) return

    try {
      handleMessage(ws, type, data || {})
    } catch (e) {
      console.error(`[WS] 处理消息 ${type} 出错:`, e.message)
      gameManager.sendTo(ws, 'error', { message: '服务器处理出错' })
    }
  })

  ws.on('close', () => {
    console.log('[WS] 连接关闭:', ws._openId || 'unknown')
    if (ws._roomCode && ws._openId) {
      gameManager.leaveRoom(ws._roomCode, ws._openId)
    }
  })

  ws.on('error', (err) => {
    console.error('[WS] 连接错误:', err.message)
  })
}

function handleMessage(ws, type, data) {
  switch (type) {
    case 'join_room': {
      const { roomCode, openId, nickname, avatarUrl } = data
      if (!roomCode || !openId) {
        gameManager.sendTo(ws, 'error', { message: '缺少必要参数' })
        return
      }
      const result = gameManager.joinRoom(roomCode, openId, nickname, avatarUrl, ws)
      gameManager.sendTo(ws, 'join_result', {
        success: true,
        reconnected: result.reconnected,
        roomInfo: gameManager.getRoomInfo(roomCode)
      })
      break
    }

    case 'start_game': {
      const { roomCode } = data
      const ok = gameManager.startGame(roomCode)
      if (!ok) {
        gameManager.sendTo(ws, 'error', { message: '无法开始游戏，请确保至少2人' })
      }
      break
    }

    case 'draw_card': {
      const { roomCode, openId } = data
      gameManager.handleDrawCard(roomCode, openId)
      break
    }

    case 'select_target': {
      const { roomCode, openId, targetOpenId } = data
      gameManager.handleSelectTarget(roomCode, openId, targetOpenId)
      break
    }

    case 'truth_dare_response': {
      const { roomCode, openId, accepted } = data
      gameManager.handleTruthDareResponse(roomCode, openId, accepted)
      break
    }

    case 'duel_roll': {
      // 决斗骰子由服务端掷，客户端只是触发
      const { roomCode, openId, targetOpenId } = data
      gameManager.handleSelectTarget(roomCode, openId, targetOpenId)
      break
    }

    case 'use_shield': {
      const { roomCode, openId } = data
      gameManager.handleUseShield(roomCode, openId)
      break
    }

    case 'guandan_king_choice': {
      const { roomCode, openId, choice, targetOpenId } = data
      gameManager.handleGuandanKingChoice(roomCode, openId, choice, targetOpenId)
      break
    }

    case 'end_game': {
      const { roomCode } = data
      gameManager.endGame(roomCode)
      break
    }

    case 'heartbeat': {
      gameManager.sendTo(ws, 'heartbeat_ack', { time: Date.now() })
      break
    }

    default:
      console.log('[WS] 未知消息类型:', type)
  }
}

module.exports = { handleConnection }
