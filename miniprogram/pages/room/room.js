const app = getApp()
const { getWsClient } = require('../../utils/wsClient')

Page({
  data: {
    roomCode: '',
    isOwner: false,
    players: [],
    maxPlayers: 6,
    connecting: false,
    canStart: false
  },

  onLoad(options) {
    const { roomCode, isOwner } = options
    this.setData({
      roomCode,
      isOwner: isOwner === 'true'
    })

    this.connectWebSocket()
  },

  async connectWebSocket() {
    this.setData({ connecting: true })
    const wsClient = getWsClient()
    const userInfo = app.globalData.userInfo || { nickName: '玩家', avatarUrl: '' }
    const openId = app.globalData.openId || `test_${Date.now()}`

    // 保存openId到全局
    app.globalData.openId = openId

    try {
      await wsClient.connect(
        this.data.roomCode,
        openId,
        userInfo.nickName,
        userInfo.avatarUrl
      )

      // 监听事件
      wsClient.on('join_result', (data) => {
        if (data.roomInfo) {
          this.setData({
            players: data.roomInfo.players || [],
            canStart: (data.roomInfo.players || []).length >= 2
          })
        }
      })

      wsClient.on('player_joined', (data) => {
        this.setData({
          players: data.players,
          canStart: data.players.length >= 2
        })
      })

      wsClient.on('player_left', (data) => {
        this.setData({
          players: data.players,
          canStart: data.players.length >= 2
        })
      })

      wsClient.on('game_started', (data) => {
        wx.redirectTo({
          url: `/pages/game/game?roomCode=${this.data.roomCode}`
        })
      })

      wsClient.on('error', (data) => {
        wx.showToast({ title: data.message || '操作失败', icon: 'none' })
      })

    } catch (err) {
      console.error('WebSocket连接失败:', err)
      wx.showToast({ title: '连接服务器失败', icon: 'none' })
    } finally {
      this.setData({ connecting: false })
    }
  },

  startGame() {
    if (!this.data.canStart) {
      wx.showToast({ title: '至少需要2人', icon: 'none' })
      return
    }

    const wsClient = getWsClient()
    wsClient.send('start_game', { roomCode: this.data.roomCode })

    // 同时调用云函数更新数据库状态
    wx.cloud.callFunction({
      name: 'startGame',
      data: { roomCode: this.data.roomCode }
    }).catch(err => console.error('云函数startGame失败:', err))
  },

  copyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => {
        wx.showToast({ title: '已复制房间号', icon: 'success' })
      }
    })
  },

  exitRoom() {
    wx.showModal({
      title: '退出房间',
      content: '确定要退出房间吗？',
      success: (res) => {
        if (res.confirm) {
          const wsClient = getWsClient()
          wsClient.disconnect()
          wx.navigateBack()
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: `来灌蛋！房间号: ${this.data.roomCode}`,
      path: `/pages/index/index?joinCode=${this.data.roomCode}`
    }
  },

  onUnload() {
    // 页面卸载不断开WS（可能是跳转到游戏页）
  }
})
