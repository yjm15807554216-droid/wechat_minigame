// 生成4位房间号 (排除易混淆字符 0/O/1/I/L)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

module.exports = { generateRoomCode, generateId, shuffleArray }
