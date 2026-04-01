const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatarUrl } = event

  // 生成不重复的房间号
  let roomCode, exists
  let attempts = 0
  do {
    roomCode = generateRoomCode()
    const check = await db.collection('rooms').where({ roomCode, status: 'waiting' }).count()
    exists = check.total > 0
    attempts++
  } while (exists && attempts < 10)

  if (exists) {
    return { success: false, message: '房间创建失败，请重试' }
  }

  const room = {
    roomCode,
    ownerId: OPENID,
    players: [{
      openId: OPENID,
      nickname: nickname || '玩家',
      avatarUrl: avatarUrl || '',
      index: 0
    }],
    status: 'waiting',
    maxPlayers: 6,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  await db.collection('rooms').add({ data: room })

  return { success: true, roomCode, ownerId: OPENID }
}
