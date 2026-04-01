App({
  globalData: {
    openId: '',
    userInfo: null,
    gameStats: null,
    currentRoomCode: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      traceUser: true
    })

    this.login()
  },

  login() {
    // 先用 wx.login 获取 code，再通过云函数换取 openId
    wx.login({
      success: () => {
        wx.cloud.callFunction({
          name: 'login',
          success: res => {
            if (res.result && res.result.openid) {
              this.globalData.openId = res.result.openid
            }
          },
          fail: err => {
            console.error('登录失败', err)
            // 降级方案：使用本地生成的临时ID
            if (!this.globalData.openId) {
              this.globalData.openId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
            }
          }
        })
      }
    })
  }
})
