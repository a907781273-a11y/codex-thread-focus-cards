# 代码焦点抽取规则

## 总原则

抽取顺序不是“哪段字最多就信哪段”，而是优先信最贴近实际改动的结构化信号。

## 抽取优先级

### 优先级 1：`fileChange`

如果线程显式输出中已经出现 `fileChange`，优先从改动文件和 diff 对应的代码符号提取焦点。

优先抽取：

- `Class.method`
- `function_name`
- 路由定义
- 配置键
- SQL 对象

原因：

- 最贴近真实改动
- 噪音最低
- 可回溯

### 优先级 2：`agentMessage`

仅当 `fileChange` 不能稳定解析时，才从 `agentMessage` 里抽显式提到的代码符号。

只接受这些模式：

- `foo.ts::buildCard`
- `ThreadCardWriter.build`
- `ThreadController#list`
- `GET /api/thread-briefs`

不接受抽象短语：

- 摘要逻辑
- 线程能力
- 当前流程

### 优先级 3：`plan`

如果 `fileChange` 和 `agentMessage` 都没有明确符号，再从 `plan` 里解析即将处理的对象。

示例：

- `更新 FocusResolver 的优先级规则`

### 优先级 4：模块级兜底

如果前三层都失败，可以退回模块级别。

允许：

- `线程卡片抽取模块`
- `摘要聚合服务`

不允许进一步退化为协议接口名：

- `thread/read`
- `thread/list`

协议接口只能出现在 `source_apis`，不能出现在 `focus_name`。

## 过滤规则

### 忽略的输入

- `reasoning`
- 原始隐藏推理内容
- `commandExecution` 全量输出
- `mcpToolCall.result` 全量输出

### 禁止词

如果抽取结果只包含以下词汇之一，则判定失败并重新回退：

- 闭环
- 对齐
- 推进
- 优化体验
- 深入排查
- 完善逻辑

除非它们后面紧跟具体对象。

允许：

- `补 ThreadCardExtractor 的状态映射`

不允许：

- `完善逻辑`

## 写卡阶段约束

焦点抽出来后，再单独进入写卡阶段。

写卡阶段禁止修改：

- `focus_type`
- `focus_name`
- `focus_file`

写卡器只能补这些字段：

- `title`
- `status_label`
- `current_action`
- `next_step`
- `confirmed_facts`
- `blocker`
- `latest_visible_output`

## 失败处理

如果无法抽到可信代码焦点，卡片应显式标记：

- `focus_type = "模块"`
- `focus_name = "待人工确认"`

而不是胡编一个看起来像真的方法名。

