Component({
  properties: {
    value: { type: Number, value: 1 },
    rolling: { type: Boolean, value: false }
  },

  observers: {
    rolling(val) {
      if (val) {
        this._startRolling()
      }
    }
  },

  data: {
    displayValue: 1,
    dots: [1]
  },

  methods: {
    _startRolling() {
      let count = 0
      const interval = setInterval(() => {
        const rand = Math.floor(Math.random() * 6) + 1
        this.setData({
          displayValue: rand,
          dots: this._getDots(rand)
        })
        count++
        if (count >= 10) {
          clearInterval(interval)
          // 显示最终值
          this.setData({
            displayValue: this.data.value,
            dots: this._getDots(this.data.value)
          })
          this.triggerEvent('settled', { value: this.data.value })
        }
      }, 100)
    },

    _getDots(n) {
      // 返回骰子点位布局标记
      return Array.from({ length: n }, (_, i) => i)
    },

    onTap() {
      this.triggerEvent('tap')
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        displayValue: this.data.value,
        dots: this._getDots(this.data.value)
      })
    }
  }
})
