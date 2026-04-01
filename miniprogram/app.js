App({
  globalData: {
    openId: '',
    userInfo: null
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
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        this.globalData.openId = res.result.openid
      },
      fail: err => {
        console.error('登录失败', err)
      }
    })
  }
})
