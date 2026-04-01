const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomCode, nickname, avatarUrl } = event

  if (!roomCode) {
    return { success: false, message: '请输入房间号' }
  }

  const { data } = await db.collection('rooms').where({
    roomCode: roomCode.toUpperCase(),
    status: 'waiting'
  }).get()

  if (data.length === 0) {
    return { success: false, message: '房间不存在或已开始游戏' }
  }

  const room = data[0]

  // 已在房间中
  if (room.players.some(p => p.openId === OPENID)) {
    return { success: true, roomCode: room.roomCode, ownerId: room.ownerId, players: room.players }
  }

  if (room.players.length >= room.maxPlayers) {
    return { success: false, message: '房间已满' }
  }

  const newPlayer = {
    openId: OPENID,
    nickname: nickname || '玩家',
    avatarUrl: avatarUrl || '',
    index: room.players.length
  }

  await db.collection('rooms').doc(room._id).update({
    data: {
      players: _.push(newPlayer),
      updatedAt: db.serverDate()
    }
  })

  return {
    success: true,
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    players: [...room.players, newPlayer]
  }
}
