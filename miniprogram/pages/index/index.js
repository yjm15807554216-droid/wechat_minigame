const app = getApp()

Page({
  data: {
    showJoinModal: false,
    roomCodeInput: '',
    loading: false,
    userInfo: null
  },

  onLoad() {
    this.getUserProfile()
  },

  getUserProfile() {
    // 尝试获取用户信息
    wx.getUserProfile({
      desc: '用于游戏中显示头像和昵称',
      success: (res) => {
        const userInfo = res.userInfo
        app.globalData.userInfo = userInfo
        this.setData({ userInfo })
      },
      fail: () => {
        // 用户拒绝或未授权，使用默认
        app.globalData.userInfo = { nickName: '玩家', avatarUrl: '' }
      }
    })
  },

  // 创建房间
  async createRoom() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const userInfo = app.globalData.userInfo || { nickName: '玩家', avatarUrl: '' }
      const res = await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      })

      const { result } = res
      if (result.success) {
        wx.navigateTo({
          url: `/pages/room/room?roomCode=${result.roomCode}&isOwner=true`
        })
      } else {
        wx.showToast({ title: result.message || '创建失败', icon: 'none' })
      }
    } catch (err) {
      console.error('创建房间失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示加入弹窗
  showJoinModal() {
    this.setData({ showJoinModal: true, roomCodeInput: '' })
  },

  hideJoinModal() {
    this.setData({ showJoinModal: false })
  },

  onRoomCodeInput(e) {
    this.setData({ roomCodeInput: e.detail.value.toUpperCase() })
  },

  // 加入房间
  async joinRoom() {
    const code = this.data.roomCodeInput.trim()
    if (code.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' })
      return
    }

    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const userInfo = app.globalData.userInfo || { nickName: '玩家', avatarUrl: '' }
      const res = await wx.cloud.callFunction({
        name: 'joinRoom',
        data: {
          roomCode: code,
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      })

      const { result } = res
      if (result.success) {
        this.setData({ showJoinModal: false })
        wx.navigateTo({
          url: `/pages/room/room?roomCode=${result.roomCode}&isOwner=false`
        })
      } else {
        wx.showToast({ title: result.message || '加入失败', icon: 'none' })
      }
    } catch (err) {
      console.error('加入房间失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 阻止弹窗穿透
  preventTap() {}
})
