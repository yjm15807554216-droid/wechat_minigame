Component({
  properties: {
    show: { type: Boolean, value: false },
    effectName: { type: String, value: '' },
    effectIcon: { type: String, value: '' },
    effectColor: { type: String, value: '#fff' },
    description: { type: String, value: '' },
    playerName: { type: String, value: '' }
  },

  observers: {
    show(val) {
      if (val) {
        // 2.5秒后自动关闭
        this._timer = setTimeout(() => {
          this.triggerEvent('dismiss')
        }, 2500)
      } else {
        if (this._timer) {
          clearTimeout(this._timer)
          this._timer = null
        }
      }
    }
  },

  methods: {
    onTap() {
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
      this.triggerEvent('dismiss')
    }
  },

  lifetimes: {
    detached() {
      if (this._timer) clearTimeout(this._timer)
    }
  }
})
