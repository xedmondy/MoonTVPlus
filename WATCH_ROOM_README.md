# 观影室功能 - 实现文档

## 当前实现状态 ✅

### 已完成的核心功能

#### 1. 后端架构
- ✅ Socket.IO 服务器逻辑 (`src/lib/watch-room-server.ts`)
  - 房间创建、加入、离开
  - 成员管理
  - 消息转发（播放状态、聊天消息）
  - 心跳机制和自动清理

- ✅ 两种服务器模式
  - **内部服务器**: 集成在 Next.js 应用中 (`server.js`)
  - **外部服务器**: 独立运行的 Node.js 服务器 (`server/watch-room-standalone-server.js`)

#### 2. 前端功能
- ✅ 全局状态管理 (`WatchRoomProvider`)
- ✅ React Hook (`useWatchRoom`)
- ✅ 观影室首页 (`/watch-room`)
  - 创建房间
  - 加入房间
  - 房间列表

- ✅ UI 组件
  - 创建房间弹窗
  - 加入房间弹窗
  - 房间列表页面
  - 聊天悬浮窗（全局）

- ✅ 导航集成
  - 侧边栏添加观影室入口
  - 底部导航栏添加观影室入口

#### 3. 同步功能
- ✅ **播放同步** (`usePlaySync` Hook)
  - 房主播放/暂停/进度跳转实时同步
  - 房主换集、换源自动同步
  - 房员自动跟随房主操作
  - 房员禁用控制器（显示"观影室模式"提示）
  - 防抖机制避免频繁同步
  - 进度差异超过2秒才同步，避免网络抖动

- ✅ **直播同步** (`useLiveSync` Hook)
  - 房主切换频道实时同步
  - 房员自动跟随频道切换
  - 延迟广播机制避免频繁触发

#### 4. 通用功能特性
- ✅ LocalStorage 自动重连
- ✅ 心跳机制（每5秒）
- ✅ 房主断开5分钟后自动删除房间
- ✅ 文字聊天
- ✅ 表情发送
- ✅ 响应式设计（移动端+电脑端）

---

## 使用方法

### 1. 启动开发服务器

```bash
# 使用内部 Socket.IO 服务器（推荐）
pnpm dev

# 或者使用外部 Socket.IO 服务器
pnpm watch-room:server  # 在另一个终端运行
# 然后修改配置使用外部服务器
```

### 2. 访问观影室

1. 打开浏览器访问 `http://localhost:3000`
2. 点击侧边栏或底部导航的"观影室"按钮
3. 选择：
   - **创建房间**: 输入房间信息和昵称
   - **加入房间**: 输入房间号和昵称
   - **房间列表**: 查看所有公开房间

### 3. 房间功能

创建或加入房间后:
- 右下角会出现聊天按钮
- 点击聊天按钮打开聊天窗口
- 可以发送文字和表情

---

## 待实现功能 🚧

### 高优先级（核心功能）
- ⏳ **管理面板配置**
  - 添加观影室开关
  - 配置服务器类型（内部/外部）
  - 外部服务器地址和鉴权配置

### 中优先级（增强功能）
- ⏳ **WebRTC 语音聊天**
  - P2P 连接
  - 服务器中转回退
  - 麦克风和喇叭控制

- ⏳ **房间成员列表**
  - 显示在线成员
  - 显示房主标识

- ⏳ **权限控制优化**
  - 房员禁用某些操作
  - 房主踢人功能（可选）

### 低优先级（优化）
- ⏳ **错误处理和重连优化**
- ⏳ **性能优化**
- ⏳ **更多表情支持**

---

## 技术架构

### 后端
- **Socket.IO 4.8.1**: WebSocket 通信
- **Next.js Custom Server**: 集成 Socket.IO
- **Node.js**: 独立服务器支持

### 前端
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Socket.IO Client**: WebSocket 客户端
- **Tailwind CSS**: 样式框架
- **Lucide React**: 图标库

### 数据流
```
用户操作 → React Hook (useWatchRoom)
         ↓
   Socket.IO Client
         ↓
   Socket.IO Server (watch-room-server.ts)
         ↓
   房间成员 ← WebSocket 推送
```

---

## 文件结构

```
src/
├── types/
│   └── watch-room.ts                    # TypeScript 类型定义
├── lib/
│   ├── watch-room-server.ts             # Socket.IO 服务器逻辑
│   └── watch-room-socket.ts             # Socket 客户端管理
├── hooks/
│   ├── useWatchRoom.ts                  # 房间管理 Hook
│   ├── usePlaySync.ts                   # 播放同步 Hook
│   └── useLiveSync.ts                   # 直播同步 Hook
├── components/
│   ├── WatchRoomProvider.tsx            # 全局状态管理
│   └── watch-room/
│       ├── CreateRoomModal.tsx          # 创建房间弹窗
│       ├── JoinRoomModal.tsx            # 加入房间弹窗
│       └── ChatFloatingWindow.tsx       # 聊天悬浮窗
└── app/
    └── watch-room/
        ├── page.tsx                     # 观影室首页
        └── list/
            └── page.tsx                 # 房间列表页面

server.js                                 # Next.js 自定义服务器
server/
└── watch-room-standalone-server.js       # 独立 Socket.IO 服务器
```

---

## 配置项

### 环境变量

```env
# Socket.IO 配置（可选）
WATCH_ROOM_ENABLED=true
WATCH_ROOM_SERVER_TYPE=internal  # 或 external
WATCH_ROOM_EXTERNAL_URL=http://your-server:3001
WATCH_ROOM_EXTERNAL_AUTH=your_secret_key
```

### 运行时配置（将在管理面板中添加）

```typescript
interface WatchRoomConfig {
  enabled: boolean;                // 是否启用观影室
  serverType: 'internal' | 'external';  // 服务器类型
  externalServerUrl?: string;      // 外部服务器地址
  externalServerAuth?: string;     // 外部服务器鉴权密钥
}
```

---

## 测试清单

### 基础功能测试
- [x] 创建房间
- [x] 加入房间（正确密码）
- [x] 加入房间（错误密码）
- [x] 查看房间列表
- [x] 发送文字消息
- [x] 发送表情
- [x] 心跳机制
- [x] 刷新页面自动重连

### 播放同步测试
- [x] 房主播放/暂停同步
- [x] 房主进度跳转同步
- [x] 房主换集同步
- [x] 房主换源同步
- [x] 房员禁用控制器

### 直播同步测试
- [x] 房主切换频道同步
- [x] 房员自动跟随频道

### 移动端测试
- [x] 底部导航显示正常
- [x] 聊天窗口适配移动端
- [x] 创建/加入弹窗适配移动端
- [x] 房间列表页面适配移动端

---

## 完整测试指南

### 测试场景 1: 创建房间并观看视频

1. **房主操作**:
   - 访问观影室页面，点击"创建房间"
   - 输入房间名称、描述和昵称
   - 创建后，进入播放页面 (`/play`)
   - 选择任意视频并播放
   - 尝试播放/暂停、跳转进度、切换集数、切换源

2. **房员操作** (使用另一个浏览器或无痕模式):
   - 访问观影室页面，点击"加入房间"
   - 输入房间号和昵称
   - 进入相同的播放页面
   - 观察播放器自动同步房主操作
   - 注意: 集数选择器上会显示"观影室模式"覆盖层，无法切换

### 测试场景 2: 聊天功能

1. 房主和房员都能看到右下角的绿色聊天按钮
2. 点击打开聊天窗口
3. 发送文字消息和表情
4. 验证双方都能收到消息
5. 测试最小化和关闭功能

### 测试场景 3: 直播同步

1. **房主操作**:
   - 在房间内，进入直播页面 (`/live`)
   - 切换不同频道

2. **房员操作**:
   - 同样进入直播页面
   - 观察频道自动跟随房主切换

### 测试场景 4: 自动重连

1. 房主或房员刷新页面
2. 验证自动重连到原房间
3. 验证聊天记录不丢失
4. 验证播放状态继续同步

---

## 下一步计划

1. **添加管理面板配置**
   - 在 `src/app/admin/page.tsx` 添加观影室配置项
   - 保存配置到数据库

2. **实现 WebRTC 语音聊天** (可选)
   - 创建 WebRTC 连接管理
   - 添加麦克风/喇叭控制按钮
   - 实现服务器中转回退

---

## 已知问题

1. **管理面板配置未添加**: 目前使用默认配置（启用内部服务器）
2. **语音聊天未实现**: 仅支持文字和表情
3. **房间成员列表未显示**: 可以在聊天窗口顶部看到在线人数，但没有详细成员列表

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

最后更新: 2025-12-06
