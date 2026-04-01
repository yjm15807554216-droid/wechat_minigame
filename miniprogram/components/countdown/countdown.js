Component({
  properties: {
    seconds: { type: Number, value: 30 },
    total: { type: Number, value: 30 },
    warning: { type: Number, value: 10 }
  },

  observers: {
    seconds(val) {
      const pct = (val / this.data.total) * 100
      let color = '#2ECC71' // 绿
      if (val <= this.data.warning) color = '#E74C3C' // 红
      else if (val <= this.data.warning * 2) color = '#F39C12' // 黄

      this.setData({
        percentage: pct,
        color,
        isWarning: val <= this.data.warning,
        displayTime: val
      })
    }
  },

  data: {
    percentage: 100,
    color: '#2ECC71',
    isWarning: false,
    displayTime: 30
  }
})
