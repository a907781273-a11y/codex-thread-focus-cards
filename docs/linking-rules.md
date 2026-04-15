# 线程串联规则

## 总原则

串线程不是把相似文本硬拼在一起，而是从显式输出里提取“工作接力信号”。

只有当系统能回答下面的问题时，才允许建立关系：

- 这两条线程为什么有关？
- 是前后步骤、实验分支，还是技能来源？
- 关系证据来自哪段显式输出？

如果只看出“都在聊线程卡”，不允许硬连。

## 允许使用的输入

第一版只允许使用这些显式信息：

- `userMessage`
- `agentMessage`
- `plan`
- `fileChange`
- 线程所属目录
- 显式提到的技能路径

不允许使用：

- `reasoning`
- 命令全文
- MCP 工具返回全文

## 关系推断优先级

### 优先级 1：显式线程引用

如果当前线程显式提到另一个线程 id、标题或工作目标，优先建立关系。

示例：

- `下一步切到 thr_plugin_map 把图接到侧边栏`
- `这个线程只负责技能抽取，验证放到 dashboard 线程`

### 优先级 2：显式目录接力

如果一条线程明确说“先在 A 目录做，再到 B 目录验证”，建立 `workspace_handoff` 或 `next_step`。

示例信号：

- `先在 G:\temp\codex-thread-focus-cards 里补模型`
- `再去另一个仓库接前端`

### 优先级 3：显式技能来源

如果一条线程焦点是具体技能文件，另一条线程明确在接入该技能的规则，建立 `skill_source`。

允许的来源例子：

- `C:\Users\90778\.codex\skills\pua\SKILL.md`
- `C:\Users\90778\.codex\skills\plain-language-tech-explanations\SKILL.md`

### 优先级 4：显式动作词

如果显式输出中出现了强关系动作词，可以建立顺序或依赖关系。

动作词和对应关系：

- `下一步`
  - `next_step`
- `先...再...`
  - `next_step`
- `验证`
  - `verification_branch`
- `实验`
  - `experiment_branch`
- `要等`
  - `blocked_by`
- `改到另一个目录`
  - `workspace_handoff`
- `来源于某个 skill`
  - `skill_source`

### 优先级 5：共享目标兜底

如果两条线程没有直接前后关系，但共享同一个明确目标，而且代码焦点属于同一模块家族，可以建立 `same_goal`。

只允许在这些条件同时满足时使用：

- `goal` 可以用一句人话说清楚
- 两条线程的 `focus_name` 或 `focus_file` 明显属于同一个模块
- 没有更强的关系类型可用

## 不允许的串联方式

以下情况一律不允许连边：

- 只因为都出现了 `thread/read`
- 只因为都在说“优化”
- 只因为都提到了“卡片”
- 只因为两个线程都来自同一个目录

这些信号太弱，连起来只会制造噪音。

## 证据写法

每条关系边都必须带 `reason`，说明证据是什么。

允许：

- `当前线程明确说下一步去插件目录接 CodexSidebarThreadMap.renderGraph`
- `这个线程在读 $pua 技能定义，目标线程在接入同一套状态描述规则`

不允许：

- `看起来相关`
- `可能是下一步`

## 前沿线程规则

串好图之后，系统还要告诉用户“先切哪条线程”。

规则如下：

1. `done`、`paused`、`duplicate_of`、`superseded_by` 默认进入 `parked_thread_ids`
2. 有 `blocked_by` 且依赖线程未完成的线程进入 `blocked_thread_ids`
3. 其余仍然打开的线程进入 `active_thread_ids`
4. `next_suggested_thread_id` 优先选第一个未阻塞的主线线程

这一步的目的不是做完美调度，而是帮用户先回到正确的工作入口。
