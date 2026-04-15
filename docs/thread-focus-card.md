# 线程焦点卡规范

## 卡片目标

卡片的目标不是复述整段线程，而是快速恢复工作上下文。

## 必填字段

### `title`

一句中文短标题，优先采用“动作 + 代码焦点”的形式。

示例：

- `收敛 ThreadSummaryService.buildBrief 的卡片输出`
- `补 GET /api/thread-briefs 的显式输出过滤`

### `focus_type`

允许值：

- `函数`
- `方法`
- `类`
- `路由`
- `配置键`
- `SQL`
- `模块`
- `流程`

### `focus_name`

具体代码焦点名称。

示例：

- `buildThreadFocusCard`
- `ThreadCardExtractor.resolveFocus`
- `GET /api/thread-briefs`
- `thread.focus.defaultState`

### `focus_file`

焦点所在文件路径。第一版允许为空，但不鼓励。

### `status_key`

内部枚举 key。

### `status_label`

面向用户展示的中文状态。

### `current_action`

当前在做的事。必须是动作句，不得写空泛态度。

允许：

- `在把默认焦点从协议接口改成代码符号`
- `在补 fileChange 优先级高于 agentMessage 的规则`

不允许：

- `在持续优化体验`
- `在推进闭环`

### `next_step`

用户重新切回线程时的第一步动作。

### `confirmed_facts`

已经确认的事实列表，不写猜测。

### `blocker`

无阻塞时写 `无`。

### `latest_visible_output`

从显式输出中摘出的最后一段可见文本。

### `source_apis`

数据来源协议接口。

示例：

- `thread/list`
- `thread/read`

## 状态词

### 允许的状态枚举

- `待开始`
- `在看需求`
- `在定位入口`
- `在看接口`
- `在看对象`
- `在串流程`
- `在改接口`
- `在改对象`
- `在补状态`
- `在跑验证`
- `等待工具结果`
- `等待你决定`
- `已完成`
- `已搁置`

## 展示建议

### 列表卡

列表视图只展示四项：

- `title`
- `focus_name`
- `status_label`
- `next_step`

### 详情卡

详情视图展示：

- `focus_name`
- `focus_type`
- `focus_file`
- `current_action`
- `confirmed_facts`
- `next_step`
- `blocker`
- `latest_visible_output`

## 双锚点原则

每张卡必须有两个锚点：

1. `focus_name`
2. `source_apis`

这样用户同时知道：

- 这张卡从哪来
- 这个线程实际在搞哪段代码

