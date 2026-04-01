const { SUIT_CONFIG, EFFECT_CONFIG, RANK_EFFECT_MAP, EFFECT_TYPES } = require('../../utils/cardConfig')

Component({
  properties: {
    card: { type: Object, value: null }, // { suit, rank, effectType }
    flipped: { type: Boolean, value: false },
    size: { type: String, value: 'normal' } // small | normal | large
  },

  observers: {
    card(val) {
      if (!val) return
      const suitConfig = SUIT_CONFIG[val.suit] || {}
      const effectConfig = EFFECT_CONFIG[val.effectType] || {}

      let displayRank = val.rank
      if (val.suit === 'joker') {
        displayRank = val.rank === 'small_joker' ? '小' : '大'
      }

      this.setData({
        suitSymbol: suitConfig.symbol || '',
        suitColor: suitConfig.color || '#333',
        suitName: suitConfig.name || '',
        displayRank,
        effectName: effectConfig.name || '',
        effectIcon: effectConfig.icon || '',
        effectColor: effectConfig.color || '#fff',
        isJoker: val.suit === 'joker',
        isRed: val.suit === 'heart' || val.suit === 'diamond'
      })
    }
  },

  data: {
    suitSymbol: '',
    suitColor: '#333',
    displayRank: '',
    effectName: '',
    effectIcon: '',
    effectColor: '#fff',
    isJoker: false,
    isRed: false
  },

  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
