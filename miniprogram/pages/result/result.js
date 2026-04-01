const app = getApp()
const { getWsClient } = require('../../utils/wsClient')

Page({
  data: {
    playerStats: [],
    totalRounds: 0,
    duration: '0:00',
    drinkKing: null,
    luckyOne: null,
    totalDrinks: 0,
    roomCode: ''
  },

  onLoad(options) {
    const { roomCode } = options
    this.setData({ roomCode })

    const stats = app.globalData.gameStats
    if (!stats) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    const minutes = Math.floor(stats.duration / 60)
    const seconds = stats.duration % 60
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
    const totalDrinks = stats.playerStats.reduce((sum, p) => sum + p.totalDrinks, 0)

    this.setData({
      playerStats: stats.playerStats,
      totalRounds: stats.totalRounds,
      duration: durationStr,
      drinkKing: stats.drinkKing,
      luckyOne: stats.luckyOne,
      totalDrinks
    })

    // 持久化到云端
    this.saveHistory(stats)
  },

  async saveHistory(stats) {
    try {
      await wx.cloud.callFunction({
        name: 'endGame',
        data: {
          roomCode: this.data.roomCode,
          playerStats: stats.playerStats,
          totalRounds: stats.totalRounds,
          duration: stats.duration
        }
      })
    } catch (err) {
      console.error('保存游戏历史失败:', err)
    }
  },

  playAgain() {
    wx.redirectTo({
      url: `/pages/room/room?roomCode=${this.data.roomCode}&isOwner=true`
    })
  },

  goHome() {
    const wsClient = getWsClient()
    wsClient.disconnect()
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    const king = this.data.drinkKing
    return {
      title: `灌蛋战报：${king ? king.nickname : '???'} 喝了 ${king ? king.totalDrinks : 0} 口！`,
      path: '/pages/index/index'
    }
  }
})
