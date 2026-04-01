# 灌蛋 - 线上卡牌喝酒对战小游戏

## 项目概述
微信小程序原生开发，支持2-6人线上实时对战的卡牌喝酒游戏。

## 技术架构

```
微信小程序 (4页面 + 5组件)
    ├── 云函数 (房间管理 + 数据持久化)
    │     └── 云数据库 (rooms, game_history)
    └── WebSocket 客户端 (wsClient.js)
            └── WebSocket 服务端 (server/)
                    └── 内存中的游戏状态
```

- **云函数**: 负责创房、加入、结束等持久化操作
- **WebSocket**: 负责游戏中所有实时状态同步
- **服务端权威**: 所有游戏逻辑由服务端计算，客户端只发送动作、接收结果

## 项目结构

```
wechat/
├── server/                      # WebSocket 服务端 (Node.js)
│   ├── index.js                 # HTTP + WS 服务入口
│   ├── wsHandler.js             # 连接管理、消息路由
│   ├── gameManager.js           # 房间状态、广播、回合逻辑
│   ├── gameLogic.js             # 洗牌、发牌、效果结算
│   └── utils.js                 # 工具函数
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── index/               # 首页: 创建/加入房间
│   │   ├── room/                # 大厅: 玩家列表、开始游戏
│   │   ├── game/                # 游戏: 抽牌、效果交互、计时
│   │   └── result/              # 结算: 排名、统计、再来一局
│   ├── components/
│   │   ├── card/                # 卡牌 + 3D翻转动画
│   │   ├── countdown/           # 圆环倒计时
│   │   ├── dice/                # 3D骰子 (决斗)
│   │   ├── effect-popup/        # 效果弹窗
│   │   └── player-avatar/       # 玩家头像 + 状态标记
│   └── utils/
│       ├── cardConfig.js        # 卡牌效果配置 (已完成)
│       ├── questionBank.js      # 真心话大冒险题库 (已完成)
│       ├── wsClient.js          # WebSocket 客户端
│       └── gameStateManager.js  # 游戏状态管理
└── cloudfunctions/
    ├── createRoom/              # 创建房间
    ├── joinRoom/                # 加入房间
    ├── startGame/               # 开始游戏
    ├── drawCard/                # 抽牌 (WS降级备用)
    ├── executeAction/           # 执行效果 (WS降级备用)
    ├── useShield/               # 使用护盾 (WS降级备用)
    └── endGame/                 # 结束游戏 + 保存记录
```

## 游戏流程

1. **首页** → 创建/加入房间 (云函数)
2. **房间大厅** → 连接 WebSocket → 等待玩家 → 房主开始
3. **游戏中** → 轮流抽牌 → 服务端结算效果 → 广播所有人
4. **结算** → 酒量排名 → 持久化历史 → 再来一局/返回

## 卡牌效果 (20种)

| 牌面 | 效果 | 类型 | 基础杯数 |
|------|------|------|----------|
| A | 指定喝 | 选择目标 | 1 |
| 2 | 反转 | 改变方向 | 0 |
| 3 | 真心话 | 回答问题 | 2(拒绝) |
| 4 | 大冒险 | 完成挑战 | 2(拒绝) |
| 5 | 自饮 | 自己喝 | 1 |
| 6 | 全员喝 | 所有人 | 1 |
| 7 | 翻倍炸弹 | 下张翻倍 | 0 |
| 8 | 免罪金牌 | 获得护盾 | 0 |
| 9 | 指定喝 | 选择目标 | 1 |
| 10 | 决斗 | 骰子对战 | 2 |
| J | 左邻喝 | 左边的人 | 1 |
| Q | 右邻喝 | 右边的人 | 1 |
| K | 灌蛋 | 其他人都喝 | 2 |
| 小王 | 天选之人 | 2回合免疫 | 0 |
| 大王 | 灌蛋王 | 指定或全体 | 5 |

## WebSocket 协议

**客户端 → 服务端**: `join_room`, `draw_card`, `select_target`, `truth_dare_response`, `duel_roll`, `use_shield`, `guandan_king_choice`, `heartbeat`

**服务端 → 客户端**: `room_state`, `player_joined/left`, `game_started`, `card_drawn`, `effect_pending`, `effect_resolved`, `turn_changed`, `duel_start/result`, `game_ended`, `timer_tick`

## 实施计划

### Phase 1: 基础连通
- WebSocket 服务端骨架
- wsClient 客户端
- 云函数: createRoom, joinRoom, startGame
- 页面: index, room
- 组件: player-avatar

### Phase 2: 核心游戏循环
- 服务端游戏逻辑 (非交互效果自动结算)
- gameStateManager
- 组件: card, countdown
- 页面: game 基础结构

### Phase 3: 交互效果
- 所有14种卡牌效果完整实现
- 组件: dice, effect-popup
- 游戏页交互UI (目标选择、真心话、决斗、护盾)

### Phase 4: 收尾打磨
- 云函数: endGame
- 页面: result
- 断线重连、错误处理、分享功能

## 技术约束
- 微信只允许1个 WebSocket 连接 → 单例模式
- 生产环境必须 WSS → 开发时关闭域名校验
- setData 性能 → 按路径更新，不整体替换
- 页面栈上限10 → 用 redirectTo
