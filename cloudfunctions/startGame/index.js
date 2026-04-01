const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomCode } = event

  const { data } = await db.collection('rooms').where({
    roomCode,
    status: 'waiting'
  }).get()

  if (data.length === 0) {
    return { success: false, message: '房间不存在' }
  }

  const room = data[0]

  if (room.ownerId !== OPENID) {
    return { success: false, message: '只有房主可以开始游戏' }
  }

  if (room.players.length < 2) {
    return { success: false, message: '至少需要2名玩家' }
  }

  await db.collection('rooms').doc(room._id).update({
    data: {
      status: 'playing',
      updatedAt: db.serverDate()
    }
  })

  return { success: true, players: room.players }
}
