# 问答擂台 Pipelines 技术实现全流程说明（含提示词、模型参数、LLM 示例）

本文完整说明当前项目“建筑问答擂台”的实现细节，目标是给网页版 GPT 直接生成 Word 文本使用。  
范围覆盖：

1. 前端交互与状态机
2. 题库生成与本地判题逻辑
3. 远程 LLM 调用链路
4. 提示词模板（system / opening）
5. 模型参数与代理配置
6. LLM 示例文件中的模型信息
7. 运行与安全注意事项

---

## 1. 模块总览

“建筑问答擂台”核心模块位于以下文件：

- 页面与状态控制：[BuildingQaDemoView.vue](D:/Data/Code/project_vis/src/views/BuildingQaDemoView.vue)
- 聊天组件（消息列表 + 输入）：[BuildingQuizComp.vue](D:/Data/Code/project_vis/src/components/BuildingQuizComp.vue)
- 问答主逻辑（远程/本地双模式）：[buildingQuiz.ts](D:/Data/Code/project_vis/src/utils/buildingQuiz.ts)
- 前端通用消息类型：[llm.ts](D:/Data/Code/project_vis/src/interface/llm.ts)
- 代理服务（模型调用）：[proxy/index.js](D:/Data/Code/project_vis/proxy/index.js)
- 路由入口：[/building/qa](D:/Data/Code/project_vis/src/router/index.ts)
- 题库基础数据：[`building.json`](D:/Data/Code/project_vis/building.json)

页面路由：

- 新路径：`/building/qa`
- 兼容跳转：`/building-qa-demo` -> `/building/qa`

---

## 2. 整体执行链路

当前问答擂台是一个**双通道 pipeline**：

1. 先尝试远程 LLM 通道（`VITE_BUILDING_QA_URL`）
2. 远程失败或未配置时，自动回退到本地题库通道

对应实现入口：

- 开局：`createBuildingQuizOpening(...)`（远程优先，失败 fallback 本地）
- 每回合：`submitBuildingQuizTurn(...)`（远程优先，失败 fallback 本地）

关键常量：

- `REMOTE_URL = import.meta.env.VITE_BUILDING_QA_URL`
- `MAX_HINTS = 3`

---

## 3. 前端页面状态机

来源：[BuildingQaDemoView.vue](D:/Data/Code/project_vis/src/views/BuildingQaDemoView.vue)

`compId` 控制三段 UI：

1. `compId = 0`：规则页（开始游戏按钮）
2. `compId = 1`：主题抽签动效页（20 次滚动）
3. `compId = 2`：正式聊天问答页

流程：

1. 点击“开始游戏” -> 随机抽取 `topic`
2. 滚动动画结束后触发 `startQuiz(topic)`
3. `startQuiz` 调用 `createBuildingQuizOpening(...)` 获取第一轮回复
4. 用户输入后触发 `handleSend` -> `submitBuildingQuizTurn(...)`
5. 每轮返回 `reply + session`，刷新消息与会话状态

聊天输入区支持：

- 普通答案
- `[提示]`
- `[我不会]`
- `[下一题]`

---

## 4. 话题与会话结构

来源：[buildingQuiz.ts](D:/Data/Code/project_vis/src/utils/buildingQuiz.ts)

### 4.1 题目主题

`BuildingQuizTopicId` 共 5 类：

- `dynasty`：朝代考场
- `region`：地域考场
- `category`：类型考场
- `structure`：结构考场
- `landmark`：地标考场

`buildingQuizTopics` 为每个主题定义：

- `title`
- `description`
- `intro`

### 4.2 会话对象

`BuildingQuizSession` 字段：

- `topicId`
- `round`
- `hintUsed`
- `currentQuestion`
- `usedQuestionIds`

初始化函数：

- `createBuildingQuizSession(topicId)`

---

## 5. 题库数据来源与预处理

题库来自 [`building.json`](D:/Data/Code/project_vis/building.json)，当前样本数为 `407` 条。  
记录字段（核心）：

- `id`
- `name`
- `category`（民居/官府/宫殿/桥梁）
- `structureType`
- `dynasty`
- `year`
- `eraLabel`
- `province`
- `city`
- `importance`
- `description`

问答逻辑会先构建一些“高频/代表集合”：

1. `prominentDynasties`：在 `['唐','宋','元','明','清']` 中实际存在的朝代
2. `prominentProvinces`：省份频次 Top 8
3. `prominentStructures`：结构类型频次 Top 8
4. `landmarkBuildings`：按 `importance desc, year asc` 取 Top 10

---

## 6. 本地题库生成 pipeline

本地模式不是固定问卷，而是运行时由数据动态生成题池。

### 6.1 题目构造函数

- `buildDynastyQuestions()`
- `buildRegionQuestions()`
- `buildCategoryQuestions()`
- `buildStructureQuestions()`
- `buildLandmarkQuestions()`

最终拼到：

- `questionPools: Record<BuildingQuizTopicId, LocalQuizQuestion[]>`

### 6.2 题型结构

`LocalQuizQuestion` 字段：

- `id`
- `prompt`
- `hint`
- `explanation`
- `acceptedValues`
- `kind`
- `sampleAnswers`

### 6.3 出题方式

每个主题都混合两类题：

1. **举例题**（请说出一座...）
2. **识别题**（请问【某建筑】属于哪类/哪省/哪朝代）

### 6.4 题目抽取规则

每轮通过 `prepareNextQuestion(session)`：

1. 从当前主题题池中排除 `usedQuestionIds`
2. 若题池用尽，清空已用集合重新轮转
3. 随机选下一题
4. 更新 `round/currentQuestion/usedQuestionIds`

---

## 7. 本地判题 pipeline

入口：`submitLocalTurn(topic, session, answer)`

### 7.1 指令分支

1. `answer == [提示]`
   - 若 `hintUsed >= 3`：返回“提示次数已用完”
   - 否则给 `hint`，并 `hintUsed + 1`
2. `answer == [我不会]` 或 `[下一题]`
   - 先公布 `sampleAnswers[0]`
   - 输出 `explanation`
   - 立即切下一题
3. 普通答案
   - 调 `findMatchedValue(...)`
   - 命中：肯定 + 解释 + 下一题
   - 未命中：给可接受答案 + 解释 + 下一题

### 7.2 命中判定算法

`findMatchedValue` 的规则：

1. 对用户答案和候选值做 `normalizeText`
2. 用 `includes` 判断是否包含任一 `acceptedValues`

`normalizeText` 会去掉：

- 空白
- 标点
- 全角括号等符号
- `·`、连字符

并转小写。

---

## 8. 远程 LLM pipeline（问答擂台）

### 8.1 触发条件

只要 `VITE_BUILDING_QA_URL` 有值，就优先尝试远程。

环境变量定义见：

- [vite-env.d.ts](D:/Data/Code/project_vis/src/vite-env.d.ts)
- [.env.local](D:/Data/Code/project_vis/.env.local)
- [.env.production](D:/Data/Code/project_vis/.env.production)

当前配置：

- 本地：`http://localhost:3000/building-qa`
- 生产：`https://demo-240155-10-1417329093.sh.run.tcloudbase.com/building-qa`

### 8.2 前端请求体

`requestRemoteQuizReply(...)` 向 `REMOTE_URL` POST：

```json
{
  "messages": [...],
  "mode": "building-quiz",
  "topic": "主题名"
}
```

超时：`15000 ms`。

### 8.3 前端消息构造（提示词模板）

由 `buildRemoteMessages(topic, messages)` 生成，结构是：

1. 第一条 `system`（规则提示词）
2. 最近 10 条聊天消息（`messages.slice(-10)`）

`system` 提示词核心内容（原始逻辑）：

- 角色：你是“营造小柿”
- 一次只出一道题
- 用户答后先判断大体正确性，再简评，再出下一题
- `[提示]` 只给线索，不直接给完整答案
- `[我不会]` / `[下一题]` 给可接受答案后继续
- 当前主题标题与描述
- 不编造不在样本上下文中的建筑信息
- 附带“当前可用样本”列表

上下文样本构造：

- 先按主题挑代表建筑（最多 8 或 landmark top10）
- 再截断前 6 条（`slice(0, 6)`）
- 每条格式：
  `序号. 名称｜类别｜时代标注｜省份去后缀｜结构类型`

---

## 9. 开局远程模板（额外 user 指令）

开局 `createBuildingQuizOpening` 远程分支会额外传一条 user 指令：

`我们开始建筑知识问答。请先用“本轮主题是【{title}】。”开头欢迎我，再直接出第一题。`

因此远程开局期望模型输出格式是：

1. 先确认主题
2. 直接给第一题

---

## 10. 远程响应解析 pipeline

`extractRemoteReply(payload)` 做了多种兼容解析，按顺序尝试：

1. `payload` 直接字符串
2. `payload.reply`
3. `payload.content`
4. `payload.data`（字符串）
5. `payload.data.reply`
6. `payload.data.content`
7. `payload.data` 为消息数组时，逆序找最后一条 assistant
8. OpenAI 样式 `payload.choices[0].message.content` / `delta.content`

兜底文案：

- `这一轮没有成功拿到模型回复，你可以再试一次。`

---

## 11. 代理层（proxy）模型调用全细节

来源：[proxy/index.js](D:/Data/Code/project_vis/proxy/index.js)

### 11.1 代理接口

- `POST /chat`：飞花擂台（会注入 FEIHUA system prompt）
- `POST /building-qa`：建筑问答擂台（不注入 FEIHUA prompt）

问答擂台走的是：`/building-qa`。

### 11.2 模型与鉴权配置优先级

`MODEL_NAME`：

1. `IFLOW_MODEL`
2. `LLM_MODEL`
3. `VITE_LLM_ACCESS_POINT`

`API_KEY`：

1. `IFLOW_API_KEY`
2. `LLM_API_KEY`
3. `VITE_LLM_API_KEY`

`API_URL`：

1. `IFLOW_API_URL`
2. `LLM_API_URL`
3. 默认 `https://apis.iflow.cn/v1/chat/completions`

### 11.3 当前 proxy/.env 中的模型信息

文件：[proxy/.env](D:/Data/Code/project_vis/proxy/.env)

- `IFLOW_MODEL=qwen3-max`
- `PORT=3000`
- `IFLOW_API_KEY=...`（当前文件为明文，建议立即轮换并移出仓库）

### 11.4 请求参数（真正传给上游 LLM）

`requestCompletion(messages, temperature)` 固定发送：

- `model: MODEL_NAME`
- `messages: [...]`
- `stream: false`
- `temperature: 0.7`（建筑问答）或 `0.8`（飞花）

HTTP 配置：

- `timeout: 30000 ms`
- `Authorization: Bearer ${API_KEY}`
- `Content-Type: application/json`

### 11.5 /building-qa 的行为

`/building-qa` 直接调用：

- `requestCompletion(messages, 0.7)`

返回：

```json
{
  "code": 200,
  "message": "success",
  "reply": "模型文本"
}
```

失败时返回：

```json
{
  "code": 500,
  "message": "请求失败，请稍后重试",
  "detail": "...",
  "reply": "请求心流失败，请稍后重试。"
}
```

---

## 12. LLM 调用示例文件中的模型信息

来源：[大模型调用示例Qwen3Max.txt](D:/Data/Code/project_vis/pchong/大模型调用示例Qwen3Max.txt)

示例使用 `OpenAI` SDK，关键信息：

- `base_url = "https://apis.iflow.cn/v1"`
- `model = "qwen3-max"`
- 调用接口：`client.chat.completions.create(...)`
- 示例仅传 `messages`，未显式传 `temperature`（走 SDK/服务端默认）

这与 proxy 里的配置方向一致：都走 iflow 网关 + `qwen3-max`。

---

## 13. 本地题库规模（按当前 building.json 推导）

依据当前 407 条建筑样本，题池数量约为：

1. `dynasty`：13 题（5 举例 + 8 识别）
2. `region`：16 题（8 举例 + 8 识别）
3. `category`：14 题（4 举例 + 10 识别）
4. `structure`：16 题（8 举例 + 8 识别）
5. `landmark`：20 题（10 地标 * 2 问）

总计约 `79` 题（运行期随机轮转）。

---

## 14. 失败与降级策略

### 14.1 远程失败回退

开局和每回合都使用 `try/catch`：

- 远程失败 -> 自动 fallback 本地题库
- 用户不会看到中断，只会继续收到可答题内容

### 14.2 本地兜底

- 当 `session.currentQuestion` 丢失时，会自动重新开局本地题
- 当回复解析失败时，返回默认兜底文本

### 14.3 交互可恢复

UI 支持：

- “重新挑战”按钮
- 任意时刻重置状态机与会话

---

## 15. 与飞花擂台的边界

项目里还有“飞花擂台”，但它走的是不同链路：

- 前端 `VITE_CHAT_URL`
- 代理 `POST /chat`
- 会注入 `FEIHUA_PROMPT`
- 温度 `0.8`

建筑问答擂台明确走：

- 前端 `VITE_BUILDING_QA_URL`
- 代理 `POST /building-qa`
- system prompt 在前端 `buildRemoteMessages` 构造
- 温度 `0.7`

---

## 16. 关键安全与工程问题

### 16.1 明文密钥风险

当前 [proxy/.env](D:/Data/Code/project_vis/proxy/.env) 和 [大模型调用示例Qwen3Max.txt](D:/Data/Code/project_vis/pchong/大模型调用示例Qwen3Max.txt) 中存在明文 key。  
建议：

1. 立即轮换 key
2. 清理仓库历史中的泄露 key
3. 用 `.env.example` + CI secret 注入代替明文

### 16.2 上下文可信度

远程模式通过 `buildTopicContext` 注入样本上下文，能降低幻觉，但模型仍可能偏离。  
如果要更稳，可把答案约束成结构化 JSON 再渲染，而不是直接自由文本。

### 16.3 判题标准一致性

当前本地判题是“包含匹配”，远程判题是模型自由判断。  
若想统一评分体验，可让远程也返回结构化判定字段（`is_correct`, `matched_value`, `next_question`）。

---

## 17. 一句话技术定位

当前“建筑问答擂台”是一个**前端状态机 + 远程大模型对话 + 本地题库可回退**的混合式问答 pipeline：  
远程模式负责更自然的互动表达，本地模式保证稳定可用与可控题源，两者通过统一 `session` 与 `messages` 接口无缝切换。

