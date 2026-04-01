/**
 * WebSocket 客户端单例
 * 微信小程序只允许1个并发 WebSocket 连接
 */

// 开发环境地址，上线后需替换为 wss:// 域名
const WS_URL = 'ws://localhost:3000/ws'

class WsClient {
  constructor() {
    this.ws = null
    this.connected = false
    this.listeners = {}
    this.heartbeatTimer = null
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this._roomCode = null
    this._openId = null
    this._nickname = null
    this._avatarUrl = null
  }

  connect(roomCode, openId, nickname, avatarUrl) {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        this.disconnect()
      }

      this._roomCode = roomCode
      this._openId = openId
      this._nickname = nickname
      this._avatarUrl = avatarUrl

      this.ws = wx.connectSocket({
        url: WS_URL,
        success: () => {
          console.log('[WS] 连接中...')
        },
        fail: (err) => {
          console.error('[WS] 连接失败:', err)
          reject(err)
        }
      })

      this.ws.onOpen(() => {
        console.log('[WS] 连接成功')
        this.connected = true
        this.reconnectAttempts = 0

        // 发送加入房间
        this.send('join_room', {
          roomCode: this._roomCode,
          openId: this._openId,
          nickname: this._nickname,
          avatarUrl: this._avatarUrl
        })

        this._startHeartbeat()
        resolve()
      })

      this.ws.onMessage((res) => {
        try {
          const msg = JSON.parse(res.data)
          const { type, data } = msg
          if (type && this.listeners[type]) {
            this.listeners[type].forEach(cb => cb(data))
          }
        } catch (e) {
          console.error('[WS] 消息解析失败:', e)
        }
      })

      this.ws.onClose((res) => {
        console.log('[WS] 连接关闭:', res.code, res.reason)
        this.connected = false
        this._stopHeartbeat()
        this._tryReconnect()
      })

      this.ws.onError((err) => {
        console.error('[WS] 错误:', err)
        this.connected = false
      })
    })
  }

  disconnect() {
    this._stopHeartbeat()
    this._stopReconnect()
    if (this.ws) {
      this.ws.close({})
      this.ws = null
    }
    this.connected = false
    this.listeners = {}
  }

  send(type, data) {
    if (!this.connected || !this.ws) {
      console.warn('[WS] 未连接，无法发送:', type)
      return false
    }
    this.ws.send({
      data: JSON.stringify({ type, data }),
      fail: (err) => {
        console.error('[WS] 发送失败:', err)
      }
    })
    return true
  }

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
  }

  off(type, callback) {
    if (!this.listeners[type]) return
    if (callback) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback)
    } else {
      delete this.listeners[type]
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send('heartbeat', {
        roomCode: this._roomCode,
        openId: this._openId
      })
    }, 15000)
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  _tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] 已达最大重连次数')
      this._emit('reconnect_failed', {})
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000)
    this.reconnectAttempts++
    console.log(`[WS] ${delay}ms 后第 ${this.reconnectAttempts} 次重连...`)

    this.reconnectTimer = setTimeout(() => {
      if (this._roomCode && this._openId) {
        this.connect(this._roomCode, this._openId, this._nickname, this._avatarUrl)
          .catch(() => {})
      }
    }, delay)
  }

  _stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  _emit(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(cb => cb(data))
    }
  }
}

// 单例
let instance = null
function getWsClient() {
  if (!instance) {
    instance = new WsClient()
  }
  return instance
}

module.exports = { getWsClient }
