const http = require('http')
const { WebSocketServer } = require('ws')
const { handleConnection } = require('./wsHandler')

const PORT = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  // 健康检查
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', time: Date.now() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', handleConnection)

// 心跳检测：30秒无响应断开
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      console.log('[WS] 心跳超时，断开连接:', ws._openId || 'unknown')
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(heartbeatInterval)
})

server.listen(PORT, () => {
  console.log(`[Server] 灌蛋游戏服务启动 -> http://localhost:${PORT}`)
  console.log(`[Server] WebSocket -> ws://localhost:${PORT}/ws`)
})
