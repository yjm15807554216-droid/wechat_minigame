const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { roomCode, playerStats, totalRounds, duration } = event

  // 更新房间状态
  const { data } = await db.collection('rooms').where({ roomCode }).get()
  if (data.length > 0) {
    await db.collection('rooms').doc(data[0]._id).update({
      data: { status: 'finished', updatedAt: db.serverDate() }
    })
  }

  // 保存游戏历史
  await db.collection('game_history').add({
    data: {
      roomCode,
      playerStats: playerStats || [],
      totalRounds: totalRounds || 0,
      duration: duration || 0,
      finishedAt: db.serverDate()
    }
  })

  return { success: true }
}
