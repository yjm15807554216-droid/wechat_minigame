Component({
  properties: {
    nickname: { type: String, value: '' },
    avatarUrl: { type: String, value: '' },
    isActive: { type: Boolean, value: false },
    isOwner: { type: Boolean, value: false },
    drinkCount: { type: Number, value: 0 },
    hasShield: { type: Boolean, value: false },
    isImmune: { type: Boolean, value: false },
    size: { type: String, value: 'normal' }, // normal | small
    isEmpty: { type: Boolean, value: false }
  },

  methods: {
    onTap() {
      if (!this.data.isEmpty) {
        this.triggerEvent('tap')
      }
    }
  }
})
