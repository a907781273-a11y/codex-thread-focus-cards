# Codex Thread Focus Cards

把 Codex 线程从“摘要墙”改成“恢复心流卡”。

这个仓库关注的问题不是如何生成更花的总结，而是当线程一多时，如何让人用最短时间重新回答这四个问题：

1. 这个线程为什么开？
2. 现在具体卡在什么代码焦点上？
3. 我重新切回线程后第一步该做什么？
4. 这个线程和别的线程是什么关系？

## 核心原则

- 卡片优先服务于恢复工作上下文，不服务于写长摘要。
- 卡片主焦点必须是代码里的具体符号，不允许退化成 `thread/read` 这类协议接口。
- 只读取显式输出：
  - `userMessage`
  - `agentMessage`
  - `plan`
- 明确忽略：
  - `reasoning`
  - 原始隐藏推理
  - 命令流输出全文
  - MCP 工具返回全文

## 设计方向

- 展示层：接口/流程/对象三种视角，但主标题始终锚定代码符号。
- 抽取层：先解析“代码焦点是谁”，再写中文卡片。
- 状态层：只允许固定中文枚举，禁止模型自由发挥黑话。
- 关系层：把单线程卡挂到工作流图上，明确前后步骤、实验分支、技能来源和跨目录接力。

## 仓库结构

- `docs/problem-statement.md`
  - 为什么线程一多就会丢心流，以及为什么“自由摘要”不够用。
- `docs/thread-focus-card.md`
  - 卡片字段、状态词、展示规则。
- `docs/thread-workstream-graph.md`
  - 多线程如何组成一张工作流图。
- `docs/extraction-rules.md`
  - 代码焦点抽取优先级和降级规则。
- `docs/linking-rules.md`
  - 线程之间的关系如何从显式输出里推断出来。
- `schemas/thread-focus-card.schema.json`
  - 卡片结构 JSON Schema。
- `schemas/thread-workstream-graph.schema.json`
  - 工作流图结构 JSON Schema。
- `examples/`
  - 接口导向、对象导向和多线程串联示例。
- `src/domain/`
  - 领域模型、焦点解析器、卡片写入器和线程关系图骨架。

## 当前范围

第一阶段先把这些内容定死：

- 领域对象
- 卡片字段
- 状态枚举
- 抽取优先级
- 示例输出
- 线程关系类型
- 工作流前沿线程规则

第二阶段再接 `Codex App Server` 做真实数据接入。

## 第一版目标

输入一段线程的显式输出后，系统应该能稳定给出：

- `代码焦点`
- `焦点类型`
- `所在文件`
- `当前动作`
- `下一步`
- `状态`
- `所属工作流`
- `相关线程`
- `推荐先切回哪条线程`

而不是再产出一段“正在推进闭环、持续优化体验”的废话。

## 现在怎么启动

当前仓库已经带了一个本地 demo，可以直接看“线程工作流图”长什么样。

```bash
cd G:\temp\codex-thread-focus-cards
npm run demo
```

启动后打开：

- `http://127.0.0.1:4173`

这个 demo 现在读取的是：

- `examples/demo-thread-workbench.json`

也就是说，你现在看到的是一张可交互的示例工作流图，不是还没接真数据的空壳。

## 现在怎么切到外部 LLM

如果你要的不是 Codex 自己总结，而是别的 LLM 供应商来做总结和串联，先在启动前设置这三个环境变量：

```powershell
$env:THREAD_FOCUS_LLM_API_KEY="你的 Key"
$env:THREAD_FOCUS_LLM_BASE_URL="https://你的供应商地址/v1"
$env:THREAD_FOCUS_LLM_MODEL="你的模型名"
```

可选：

```powershell
$env:THREAD_FOCUS_LLM_NAME="你想显示在页面上的供应商名字"
```

然后再启动：

```powershell
cd G:\temp\codex-thread-focus-cards
npm run demo
```

页面里会出现“用外部 LLM 重新分析”按钮。点它之后，浏览器会把：

- `examples/provider-thread-source.json`

这份显式线程源数据发给你配置的外部供应商。供应商返回 `cards + graph` JSON 后，页面再渲染结果。

也就是说：

- Codex 负责读线程和展示页面
- 外部 LLM 负责总结和串联
