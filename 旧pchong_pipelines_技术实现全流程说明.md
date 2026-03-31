# 旧 `pchong` Pipelines 技术实现全流程说明

本文用于还原和解释旧版 `pchong` 目录中与古建筑信息抽取、结构术语归纳、结构聚类、材料归类、`dataset/clean_data` 生成有关的完整技术流程。本文面向“给网页版 GPT 继续加工成 Word 文本”的用途编写，因此会尽量把输入、输出、字段血缘、算法逻辑、代码痕迹和不确定边界全部展开。

## 1. 文档依据与可靠性边界

本文不是根据当前工作区下现存的 `pchong` 源码直接整理的，而是综合以下三类证据还原：

1. `pchong_recovered_from_codex/` 下恢复出的关键代码片段：
   - `ancient_building_llm_pipeline.recovered.py`
   - `llm_extract_pipeline.recovered.py`
   - `stage5_enrich_clean_with_llm.recovered.py`
   - `stage6_structure_cluster_pipeline/run_pipeline.recovered.py`
   - `README.md`
   - `file_inventory_from_session.md`
2. 本机 Codex 历史记录：
   - `C:\Users\He\.codex\history.jsonl`
3. 2026-03-13 早期会话日志：
   - `C:\Users\He\.codex\sessions\2026\03\13\rollout-2026-03-13T09-09-12-019ce4bd-886a-7353-9a80-eb0f6221567a.jsonl`

需要明确区分两类信息：

- `已确认`：能从恢复代码或会话日志里直接看到函数、字段、提示词、输出结构。
- `高置信推断`：源码未完整恢复，但能从历史提问、函数名、输入输出文件、最终数据产物反推出实现逻辑。

文中会尽量按这两类来写，不把推断写成“源码已直接确认”。

## 2. 这套 pipelines 的本质

旧 `pchong` 这套方法，不是传统 NER，也不是端到端深度学习分类器。它的真实形态是：

`多源文本构建 -> LLM 证据片段抽取 -> LLM 术语归纳 -> 缺失维度补齐 -> 规则特征构建 -> 基于集合相似度的结构聚类 -> 命名与后处理 -> clean_data 落库`

它更准确的技术标签应当是：

- 基于 LLM 的古建筑证据约束式信息抽取
- 基于证据片段的建筑术语归纳
- 基于可解释符号特征的结构聚类
- 基于固定 taxonomy 的建筑材料多标签归类

这套流程和“诗词情感分析”的多模型深度网络完全不同。它不是“BERT + BiLSTM + Attention + CNN”式分层模型，而是“多阶段数据处理 pipeline”。

## 3. 总体阶段图

从恢复代码和历史记录看，主干可以还原为下面这条链：

1. 原始名录与建筑基础字段输入
2. `stage1_crawled_articles`
   - 抓取 Wikipedia / 百度百科
   - 构建 article tree
   - 拍平成 `combined_text`
3. `clean`
   - 清洗类别
   - 只保留四大类：`民居 / 官府 / 宫殿 / 桥梁`
4. `stage3_extracted_snippets`
   - 按五个维度抽取证据片段 `dimension_extract`
5. `stage4_terms_summary`
   - 按五个维度把证据片段归纳成短术语 `terms_summary`
6. `stage5_final_dataset_enriched_v2`
   - 推断 `start_dynasty / start_year`
   - 对缺失维度补齐术语
   - 输出更完整的 enriched 数据集
7. `stage6_structure_cluster_pipeline`
   - 结构特征构建
   - 按 `building_type × dynasty_bucket` 分组
   - Jaccard + 层次聚类
   - LLM 命名
8. `stage6_material_cluster_pipeline`
   - 固定材料大类 taxonomy 的多标签归类
   - 注意这不是无监督聚类
9. `stage5_postprocess_v2 / stage5_v2_generate_chart_pack`
   - 标准化最终字段
   - 生成 `dataset/clean_data.jsonl/csv`
   - 生成统计图表所需长表、交叉表、频次表

## 4. 输入数据与任务对象

### 4.1 原始对象

任务对象是“全国重点文物保护单位第一到第八批名单中属于古建筑的对象”。

根据当前 `dataset/README.md`，最终数据集仅保留了古建筑类相关数据；中间产物如爬取文章、文章切片、证据片段并未放进 `dataset/`。

### 4.2 早期基础字段

从恢复代码可见，早期原始字段至少包括：

- `名称`
- `时代`
- `地址`
- `备注`

对应常量：

- `SRC_KEY_NAME = "名称"`
- `SRC_KEY_ERA = "时代"`
- `SRC_KEY_ADDR = "地址"`
- `SRC_KEY_REMARK = "备注"`

### 4.3 任务目标

旧 pipeline 的目标并不是“做一个泛化的命名实体识别器”，而是围绕古建筑可视化服务，提取以下信息：

- 建筑类别：`民居 / 官府 / 宫殿 / 桥梁`
- 始建时间：`start_dynasty / start_year`
- 五个建筑维度的证据片段与术语
- 结构聚类结果
- 材料大类归类
- 可视化友好的扁平化结果

## 5. 主干 Pipeline 一：`ancient_building_llm_pipeline`

恢复代码和会话日志中，最关键的主干是 `ancient_building_llm_pipeline.py`。会话日志里这个脚本的 argparse 描述是：

`古建筑 LLM 全流程 Pipeline（抓取->清洗->提取->总结，支持断点恢复）`

支持阶段：

- `crawl`
- `clean`
- `extract`
- `summary`

也就是说，旧版主流程不是一步到位，而是明确分阶段执行和断点续跑。

## 6. Stage 1：文章抓取与文本构建

### 6.1 目标

为每个建筑构建可供 LLM 抽取的文章上下文，而不是直接在原始名录字段上抽取。

### 6.2 输入

- 原始建筑行数据
- 建筑名称
- 备注中的别名信息

### 6.3 名称候选生成

恢复代码里有：

- `parse_aliases_from_remark(remark)`
- `generate_name_candidates(name, source_row)`

这说明 pipeline 不只用主名称检索文章，而是会：

1. 清洗建筑原名
2. 去掉括号说明
3. 按 `、及和-—/` 拆分名称片段
4. 从 `备注` 中抽别名、又名
5. 形成一组名称候选

这一步的目的，是提高百科检索和匹配文章的成功率。

### 6.4 多源抓取

恢复代码明确存在：

- `fetch_wiki_article(...)`
- `fetch_baike_article(...)`
- `build_wiki_article_tree(...)`
- `build_baike_article_tree(...)`

因此可以确认：

1. 文章来源至少包含 Wikipedia 和 百度百科
2. 两类页面不会简单保存原始 HTML，而是解析成统一的文章树结构

### 6.5 文章树结构

恢复代码中的文章对象格式可推断至少包含：

- `title`
- `url`
- `lead`
- `sections`

每个 section 下还有：

- `title`
- `content`
- `sections`

其中 block 级别支持：

- `paragraph`
- `list`
- `definition_list`
- `table`

### 6.6 文本拍平

恢复代码中有：

- `block_to_text(block)`
- `flatten_article_text(article, max_chars=12000)`

逻辑是：

1. 先读取 `lead`
2. 深度遍历 `sections`
3. 保留 section 标题
4. 把段落、列表、表格统一转为文本
5. 拼成单个 `combined_text`
6. 长度超限时截断到 `12000` 字符

所以抽取模块并不是直接对 HTML 做处理，而是对统一拍平后的文章文本做处理。

### 6.7 Stage1 典型输出

从历史与文件名看，至少有：

- `pipeline_outputs/stage1_crawled_articles.jsonl`
- `pipeline_outputs/stage1_crawled_articles.csv`

且 stage1 记录中会保存：

- `name`
- `matched_title`
- `url`
- `article`
- `combined_text`

## 7. Clean 阶段：建筑类别清洗

### 7.1 为什么需要 clean

原始建筑名录不一定天然落在项目需要的四大类里，且存在宗教建筑、塔、祠庙等对象。为了保证后续可视化结构稳定，需要先统一类别。

### 7.2 目标类别

恢复代码中：

- `TARGET_BUILDING_TYPES = ["民居", "宫殿", "官府", "桥梁"]`

同时存在：

- `RELIGIOUS_KEYWORDS`
- `TYPE_RULE_KEYWORDS`

说明这里是“规则 + LLM”混合清洗。

### 7.3 处理逻辑

从恢复代码和日志可确认：

1. 先根据名称、备注、文章内容做候选判断
2. LLM 在固定 schema 下输出 `building_type`
3. 非目标类对象会落到 `其他`
4. 后续主要保留四大类

### 7.4 Clean 阶段的意义

这一层不是“结构抽取”，而是为了给后续的结构分析建立稳定分组边界。后面几乎所有聚类和统计，都会依赖 `building_type`。

## 8. Stage 3：五维证据片段抽取

这是旧 pipeline 最关键的一层，也是最接近你说的“实体片段提取”的地方。

### 8.1 不是传统 NER

这里抽的不是 BIO 边界意义上的“实体 span”，而是更长的、有证据性质的句子或短片段。它的本质是：

- evidence-grounded extraction
- snippet extraction

### 8.2 五个维度

恢复代码中写死了：

- `建筑结构体系`
- `建筑材料`
- `建筑功能`
- `营造技艺`
- `建筑空间布局`

对应：

`DIMENSIONS = ["建筑结构体系", "建筑材料", "建筑功能", "营造技艺", "建筑空间布局"]`

### 8.3 每个维度的提示词

恢复代码中有 `DIMENSION_HINTS`，例如：

- 建筑结构体系：`抬梁 / 穿斗 / 井干 / 砖木 / 木构 / 砖石 / 拱券 / 梁架 / 斗拱 / 桁架`
- 建筑材料：`木材 / 砖 / 石 / 青砖 / 夯土 / 生土 / 琉璃瓦 / 灰浆 / 糯米灰浆 / 瓦`
- 建筑功能：`居住 / 礼制 / 办公 / 防御 / 祭祀 / 交通 / 仓储 / 商贸 / 驿传 / 行政`
- 营造技艺：`榫卯 / 斗拱 / 彩画 / 砌筑 / 夯筑 / 雕刻 / 油饰 / 抹灰 / 维修`
- 空间布局：`院落 / 中轴 / 轴线 / 前后院 / 四合院 / 进深 / 面阔 / 围院 / 组群`

### 8.4 片段抽取的输入

会话日志恢复出的 `llm_extract_dimensions` 提示结构表明，输入至少包括：

- `building_name`
- `building_type`
- `article_text`

输出 schema 明确要求：

```json
{
  "建筑结构体系": { "snippets": ["string"], "confidence": "0_to_1" },
  "建筑材料": { "snippets": ["string"], "confidence": "0_to_1" },
  "建筑功能": { "snippets": ["string"], "confidence": "0_to_1" },
  "营造技艺": { "snippets": ["string"], "confidence": "0_to_1" },
  "建筑空间布局": { "snippets": ["string"], "confidence": "0_to_1" }
}
```

### 8.5 片段抽取的标准化

恢复代码中 `normalize_dimension_extract` 做了这些事：

1. 逐维处理
2. 把返回值统一转为列表
3. 过滤过短片段
4. 单片段截断到约 180 字
5. 去重
6. 每维最多保留 3 个片段
7. 如果有片段但无置信度，则默认给 `0.55`
8. 如果 LLM 没抽到，则触发 fallback

### 8.6 Fallback 抽取

恢复代码中明确存在：

- `split_sentences(text)`
- `pick_snippets_by_keywords(text, keywords, max_count=3)`
- `fallback_extract_dimensions(text)`

也就是说，如果 LLM 没返回有效片段，不会放弃，而是：

1. 把文章切句
2. 用维度关键词扫描句子
3. 抓包含关键词的句子
4. 作为低置信度证据片段补上

这里的默认策略是：

- 有 hit：`confidence = 0.55`
- 无 hit：`confidence = 0.15`

### 8.7 数学表示

若把第 `i` 个建筑在第 `d` 个维度下抽到的证据片段集合记为：

\[
E_i^{(d)} = \{ s_{i1}^{(d)}, s_{i2}^{(d)}, \dots, s_{in}^{(d)} \}
\]

那么 `stage3_extracted_snippets` 存储的就是这组 `E_i^{(d)}`，外加每维的置信度。

### 8.8 Stage3 输出

根据会话日志和文件清单：

- `pipeline_outputs/stage3_extracted_snippets.jsonl`
- `pipeline_outputs/stage3_extracted_snippets.csv`

每条记录至少包含：

- `line_no`
- `name`
- `building_type`
- `dimension_extract`
- `extract_time`

## 9. Stage 4：基于证据片段的术语归纳

这一步是从“证据句”转向“建筑学术语”，也是 `clean_data` 中各类 `*_terms` 的主要来源。

### 9.1 核心思想

Stage3 抽的是句子，Stage4 抽的是短术语。

例如：

- 证据句：`采用抬梁式木构架，梁架高大，前后檐柱分明`
- 归纳术语：`抬梁式`、`木构架`

### 9.2 输入

会话日志中恢复出的总结步骤输入包含：

- `building_name`
- `dimension_extract`

说明 LLM 在这一步并不是重新看全文，而是主要看上一步的五维证据片段。

### 9.3 输出结构

恢复日志中的输出 schema 形式为：

```json
{
  "建筑结构体系": [{ "term": "string", "confidence": "0_to_1" }],
  "建筑材料": [{ "term": "string", "confidence": "0_to_1" }],
  "建筑功能": [{ "term": "string", "confidence": "0_to_1" }],
  "营造技艺": [{ "term": "string", "confidence": "0_to_1" }],
  "建筑空间布局": [{ "term": "string", "confidence": "0_to_1" }]
}
```

即每个维度输出若干术语项，每项有：

- `term`
- `confidence`

### 9.4 Fallback 术语归纳

恢复代码中存在：

- `fallback_terms_summary(extract_row)`

这说明如果 LLM 归纳失败，系统会从 `dimension_extract` 的片段里做规则级回退总结，而不会让整个流程断掉。

### 9.5 术语集合表示

若把第 `i` 个建筑在第 `d` 个维度下的术语集记为：

\[
T_i^{(d)} = \{ (t_{i1}^{(d)}, c_{i1}^{(d)}), (t_{i2}^{(d)}, c_{i2}^{(d)}), \dots \}
\]

则 Stage4 的输出就是这组 `T_i^{(d)}`。

### 9.6 Stage4 产物

文件清单中明确出现：

- `pipeline_outputs/stage4_terms_summary.jsonl`

这一步之后，数据已经具有了适合后续统计和聚类消费的术语结构。

## 10. Stage 5：时间推断、缺失补齐与清洗增强

恢复出的 `stage5_enrich_clean_with_llm.py` 指向一个非常清晰的阶段目标：

- 在已有 `terms_summary` 基础上
- 推断 `start_dynasty / start_year`
- 补齐缺失维度的术语
- 输出更适合 CSV 和后续分析的结构

### 10.1 输入

从恢复代码可直接确认其输入来自：

- `--stage1-jsonl` 默认 `pipeline_outputs/stage1_crawled_articles.jsonl`
- `--stage5-jsonl` 默认 `pipeline_outputs/stage5_final_dataset.jsonl`

这说明此处是“读取已有 stage1 + stage5 基础结果，再做 enrich”。

### 10.2 时间与补齐的 LLM 输入

`llm_infer_start_time_and_terms(...)` 的 payload 中明确包含：

- `building_name`
- `line_no`
- `source_fields`
  - `时代`
  - `地址`
  - `备注`
- `stage1_text`
- `existing_terms_summary`
- `missing_dimensions`
- `dimensions`

可见这一层不是纯时间识别，而是“时间推断 + 缺失术语补齐”的复合任务。

### 10.3 时间与补齐的 LLM 输出

恢复代码中 schema 明确要求输出：

- `start_dynasty`
- `start_year`
- `time_confidence`
- `time_reason`
- `filled_terms`

其中 `filled_terms` 仍然按五个维度组织，且要求：

- 只对缺失维度补词
- 每维只给 `1-3` 个短术语
- 术语必须是短词，不许输出句子

### 10.4 术语清洗

`normalize_terms_summary(raw_obj)` 会：

1. 逐维遍历
2. 过滤未知值：`未知 / 不详 / 无 / 暂无 / 待考 / null / ?` 等
3. 统一截断
4. 去重
5. 最多保留 6 个术语

### 10.5 词表回退补齐

恢复代码中还有：

- `SUMMARY_VOCAB`
- `fallback_terms_by_vocab(text, dim)`

说明若 LLM 对缺失维度仍补不出来，系统会使用每维的预设术语词表进行关键词命中式补充，例如：

- 结构体系：`抬梁式 / 穿斗式 / 拱券结构 / 梁架体系 / 木构架 / 砖木结构 / 砖石结构`
- 空间布局：`围院结构 / 中轴对称 / 四合院 / 多进院落 / 组群布局 / 前朝后寝 / 前店后宅`

### 10.6 扁平化字段构建

恢复代码中：

- `build_flat_term_fields(terms_summary)`

会生成：

- `terms_flat`
- `confidences_flat`

这意味着从这一步开始，系统已经同时维护：

1. 带 term+confidence 的结构化形式
2. 仅用于后续消费的扁平术语列表

### 10.7 Stage5 的关键意义

这一步是旧 pipeline 从“抽取系统”转向“可视化数据准备系统”的桥梁。它把前面较松散的中间结构，整理为更完整、稳定、可统计的数据集。

### 10.8 Stage5 关键产物

历史和文件清单中出现过：

- `pipeline_outputs/stage5_final_dataset.jsonl`
- `pipeline_outputs/stage5_final_dataset_enriched.jsonl`
- `pipeline_outputs/stage5_final_dataset_enriched_v2.jsonl`

其中 `enriched_v2` 是后续结构聚类、材料归类、图表打包的重要基础输入。

## 11. Stage 6-A：建筑结构聚类 Pipeline

这一层的核心不是 embedding，也不是神经网络，而是“规则特征 + 集合距离 + 层次聚类”。

### 11.1 输入来源

根据恢复代码和日志，结构聚类至少读取：

- `stage5_final_dataset_enriched_v2.jsonl`
- 必要时辅以 `stage1_crawled_articles.jsonl`

具体消费字段包括：

- `terms_flat["建筑结构体系"]`
- `terms_flat["建筑空间布局"]`
- `terms_flat["建筑材料"]`
- `dimension_extract["建筑结构体系"]["snippets"]`
- `dimension_extract["建筑空间布局"]["snippets"]`
- `dimension_extract["建筑材料"]["snippets"]`
- `stage1_text / combined_text`

### 11.2 证据句汇总

从日志恢复出的结构很明确：

1. 取三类维度的 `snippets`
   - 结构
   - 布局
   - 材料
2. 合并为 `evidence_sentences`
3. 如果证据句太少，则从 `stage1_text` 中再次挑相关句补充

这说明聚类并不是只吃术语列表，而是仍然保留对原文证据的依赖。

### 11.3 原始术语字段

聚类前的每栋建筑会整理出：

- `raw_structure_terms`
- `raw_layout_terms`
- `raw_material_terms`

这三组是 stage6 的主要结构化输入。

### 11.4 signal texts 的构建

历史代码痕迹表明存在 `build_signal_texts(...)` 之类逻辑，其作用是把：

- 原始术语
- 证据句

合并成统一的文本信号源，供规则命中使用。

### 11.5 规则特征构建

恢复日志中明确提到：

- `BRIDGE_RULES`
- `NON_BRIDGE_RULES`
- `derive_feature_set(building_type, signal_texts)`

说明系统会根据建筑是否为桥梁，走不同的规则表，把术语和证据句映射成可解释的符号特征。

特征大致形态为：

- `frame:抬梁体系`
- `roof:歇山顶`
- `layout:中轴布局`
- `material:石材主导`
- `support:斗拱承托`
- `form:拱桥体系`
- `span:多孔多跨`

然后再派生出去掉前缀的：

- `feature_labels`

### 11.6 特征集合表示

若把第 `i` 个建筑的结构特征集合记为：

\[
F_i = \{ f_{i1}, f_{i2}, \dots, f_{ik} \}
\]

那么 Stage6 结构聚类真正比较的，就是这些 `F_i` 集合，而不是文章向量 embedding。

### 11.7 分组逻辑

恢复日志中直接出现：

`group_key = f"{row['building_type']}__{row['dynasty_bucket']}"`

这说明聚类前会先按以下组合分组：

- `building_type`
- `dynasty_bucket`

也就是先在“同建筑类型、同主要朝代桶”内做聚类，而不是把所有建筑混在一起聚。

### 11.8 朝代分桶

会话日志显示存在：

- `dynasty_to_bucket(dynasty, scheme, year=None)`

并且“优先使用 `start_year` 决定桶位”。主桶方案曾出现：

- `唐及以前`
- `宋辽金西夏`
- `元`
- `明`
- `清`

也提到过简化 `main4` 方案。

### 11.9 相似度与距离

结构聚类采用 Jaccard 相似度。对两个建筑的特征集合 `F_i` 与 `F_j`：

\[
J(F_i, F_j) = \frac{|F_i \cap F_j|}{|F_i \cup F_j|}
\]

距离定义为：

\[
D(F_i, F_j) = 1 - J(F_i, F_j)
\]

这类定义非常适合“多标签、稀疏、可解释”的符号特征集合。

### 11.10 聚类算法

会话日志中直接提到：

- `agglomerative clustering`

即层次聚类。旧 pipeline 不依赖本地训练模型，也不依赖 embedding API。

### 11.11 自动选簇数

恢复出的规则大致是：

- `group_size < min_group_size`：跳过
- `unique_signature_count < 3`：跳过
- `group_size >= 18 且 unique_signature_count >= 4`：聚为 `4` 类
- 否则：聚为 `3` 类

这说明簇数并不是人为每组手工指定，而是根据组规模和特征多样性自动决定。

### 11.12 小组跳过机制

若某组：

- 样本太少
- 特征签名太少

就会不做真正聚类，而只给出单体命名或跳过说明。这是为了防止在非常小的组里强行聚类导致结果失真。

### 11.13 代表样本选择

恢复代码中有 `medoid_index(indices, item_features)`，逻辑是：

选取与簇内其他建筑总距离最小的建筑作为代表样本，即 medoid。

数学形式为：

\[
m = \arg\min_{i \in C}\sum_{j \in C, j \neq i} D(F_i, F_j)
\]

其中 `C` 表示某个聚类簇。

### 11.14 聚类后统计

每个簇会汇总出：

- `top_feature_labels`
- `top_raw_terms`
- `top_evidence`
- `sample_buildings`
- `medoid_line_no`
- `medoid_name`

这些统计值后续既用于命名，也用于解释聚类含义。

### 11.15 LLM 的角色：只做命名与摘要

恢复代码和日志非常明确地表明：

- 聚类边界不是 LLM 算的
- LLM 只在聚类完成后负责：
  - `cluster_name`
  - `cluster_summary`
  - `cluster_keywords`

命名输入包括：

- `building_type`
- `dynasty_bucket`
- `cluster_size`
- `top_feature_labels`
- `top_raw_terms`
- `sample_buildings`
- `top_evidence`
- `article_context`

并且有明确约束：

- `cluster_name` 使用 4 到 12 个中文字符
- 不要包含朝代、地区、内部 id
- `cluster_summary` 30 到 60 个中文字符
- `cluster_keywords` 返回 3 到 5 个短语
- 输出 JSON only

### 11.16 未聚类记录的命名

会话日志还确认，`clustered=false` 的单条建筑也会走同一套命名风格，只是：

- `cluster_id = null`
- 但仍有 `cluster_name / cluster_summary / cluster_keywords`

因此 Stage6 输出不只是聚类簇，也包括“未成簇建筑”的结构画像命名。

### 11.17 Stage6 结构聚类输出字段

从历史日志中的示例记录可恢复出至少这些字段：

- `line_no`
- `name`
- `building_type`
- `start_dynasty`
- `start_year`
- `dynasty_bucket`
- `raw_structure_terms`
- `raw_layout_terms`
- `raw_material_terms`
- `evidence_sentences`
- `article_context`
- `features`
- `feature_labels`
- `feature_text`
- `group_key`
- `group_size`
- `clustered`
- `skip_reason`
- `cluster_id`
- `cluster_name`
- `cluster_summary`
- `cluster_keywords`

### 11.18 Stage6 结构聚类产物

会话日志中明确提到输出：

- `building_cluster_assignments.jsonl`
- `group_summary.jsonl`
- `run_summary.json`
- `pipeline.log`

还提到一次实际运行结果：

- 总建筑 `410` 条
- 已聚类 cluster 命名 `34` 个
- `clustered=false` 未聚类建筑命名 `48` 个

## 12. Stage 6-B：建筑材料“大类归类” Pipeline

这里必须特别注意：虽然文件夹名叫 `stage6_material_cluster_pipeline`，但历史记录里已经明确说明，这层在技术上不应该叫“无监督聚类”，而应叫：

- 固定 taxonomy 的多标签归类 pipeline

### 12.1 输入

历史记录中明确提到该层输入来自：

- `pipeline_outputs/stage5_final_dataset_enriched_v2.jsonl`
- `pipeline_outputs/stage1_crawled_articles.jsonl`

复用字段包括：

- `terms_flat["建筑材料"]`
- `terms_summary["建筑材料"]`
- `dimension_extract["建筑材料"]`
- `stage1.combined_text`

### 12.2 类目体系

固定为 7 类：

- `木材类`
- `石材类`
- `砖瓦类`
- `土类`
- `灰浆胶结类`
- `金属类`
- `其他材料`

### 12.3 方法

历史 plan 说明它采用二阶段策略：

1. 规则优先
   - 先建立 `term -> category_list` 映射
   - 例如：
     - `汉白玉 / 花岗岩 / 青石 / 条石 -> 石材类`
     - `木构 / 木板 / 楠木 -> 木材类`
     - `糯米灰浆 / 石灰砂浆 -> 灰浆胶结类`
     - `铜饰 / 铁件 -> 金属类`
     - `砖石 -> 石材类 + 砖瓦类`
2. LLM 仅处理未命中或歧义术语
   - 输入：
     - 原始术语
     - 建筑名称
     - 相关材料证据句
     - 固定候选类目列表
   - 输出：
     - 只能从既有 7 类中选择，不允许发明新类

### 12.4 建筑级汇总

每栋建筑保留：

- `material_terms_normalized`
- `material_categories`
- `material_primary_category`
- `material_assignment_evidence`
- `material_assignment_confidence`

### 12.5 primary 材料类别

历史说明里提到，primary 的判定会参考：

- 术语置信度加权
- 证据句频次
- 主结构材料优先级

### 12.6 产物

计划中的输出有：

- `material_term_dictionary.csv/jsonl`
- `building_material_assignments.csv/jsonl`
- `material_category_stats.csv/jsonl`
- `type_material_crosstab.csv/jsonl`
- `pipeline_state.json`

### 12.7 和结构聚类的关系

需要把两者明确分开：

- 结构体系：无监督聚类
- 建筑材料：固定 taxonomy 多标签归类

## 13. 旧分支：`llm_extract_pipeline` 的作用

恢复出来的 `llm_extract_pipeline.recovered.py` 代表旧版另一条更偏“结构化字段抽取”的支线。

### 13.1 输入

它的 LLM 输入包含：

- `source_row`
- `article_text`
- `rule_candidates`
- `wikidata_entity`
- `wikidata_facts_candidates`

### 13.2 输出字段

它直接要求 LLM 输出：

- `dynasty`
- `year`
- `structure`
- `material`
- `building_type`
- `province`
- `city_county`
- `confidence`
- `validation_note`

### 13.3 方法特征

这条支线的特点是：

- 更强调结构化字段抽取与事实校验
- 更依赖 Wikidata 辅助
- 不像主干 `ancient_building_llm_pipeline` 那样明确走“片段 -> 术语 -> 聚类”的链

因此，在整理项目主线时，应把它视作“早期或平行方案”，而不是最终 `clean_data` 主链的唯一来源。

## 14. `clean_data` 是怎么得到的

这一部分的完整源码没有恢复，但可以根据：

- `history.jsonl`
- 文件清单
- 当前 `dataset/clean_data.csv/jsonl`
- 当前 `dataset/README.md`

进行高置信还原。

### 14.1 直接上游

历史记录中多次提到：

- `stage5_final_dataset_enriched_v2.jsonl`

是图表统计、后处理、`clean_data` 生成的直接输入基础。

### 14.2 后处理脚本

文件清单里明确出现但源码未完整恢复：

- `stage5_postprocess_v2.py`
- `stage5_v2_generate_chart_pack.py`

根据历史提问可以判断：

- `stage5_postprocess_v2.py` 主要负责标准化最终数据表
- `stage5_v2_generate_chart_pack.py` 主要负责生成画图统计包

### 14.3 `clean_data` 的现有字段

当前 `dataset/clean_data.csv` 的表头为：

- `line_no`
- `name`
- `building_type`
- `start_dynasty`
- `start_year`
- `century`
- `century_num`
- `province`
- `address`
- `start_time_confidence`
- `建筑结构体系_terms`
- `建筑材料_terms`
- `建筑功能_terms`
- `营造技艺_terms`
- `建筑空间布局_terms`
- `material_categories`

### 14.4 后处理逻辑

结合历史记录，可高置信推断出 `clean_data` 至少做了以下处理：

1. 以 `stage5_final_dataset_enriched_v2.jsonl` 为主输入
2. 标准化 `start_dynasty`
3. 标准化 `start_year`
4. 删除 `1911` 年及之后样本
5. 保留四大类建筑
6. 从 `address` 中抽取 `province`
7. 计算 `century` 与 `century_num`
8. 把五个维度的术语列表扁平化为 `;` 分隔字符串
9. 把材料术语进一步映射为 `material_categories`

### 14.5 为什么 `clean_data` 是最终主数据集

因为它已经具备了三个特点：

1. 字段稳定
2. 易读
3. 适合直接做可视化统计

所以后续的桑基图、旭日图、热力图、词云、交叉表，大多都可以直接从 `clean_data` 或 chart pack 中生成。

## 15. `stage5_v2_generate_chart_pack` 大概率做了什么

源码未恢复，但从历史提问和 `dataset/README.md` 几乎可以锁定其职能：

### 15.1 输入

- `stage5_final_dataset_enriched_v2.jsonl`
- 或后处理后的 `clean_data`

### 15.2 主要输出

当前 `dataset/README.md` 列出的统计项包括：

- `01_overview_metrics`
- `02_building_type_distribution`
- `03_dynasty_distribution`
- `04_year_distribution`
- `05_century_distribution`
- `06_province_distribution`
- `07_type_dynasty_crosstab`
- `08_type_century_crosstab`
- `09_type_province_crosstab`
- `10_material_category_distribution`
- `11_type_material_category_crosstab`
- `12_dynasty_material_category_crosstab`
- `13_terms_long_exploded`
- `14_term_frequency_by_dimension`
- `15_top_terms_by_type_dimension`
- `16_year_stats_by_type`
- `17_year_stats_by_dynasty`
- `18_column_multivalue_profile`
- `19_material_focus_counts`
- `20_material_focus_top_terms`

### 15.3 实现推断

因此可以高置信推断，`stage5_v2_generate_chart_pack.py` 至少完成了：

1. 按建筑类别、朝代、世纪、地区做 groupby 统计
2. 对多值术语字段按 `;` 爆炸成长表
3. 统计各维度术语频次
4. 统计各建筑类别在各维度下的 top 术语
5. 统计材料大类覆盖数与 top 术语
6. 输出 csv/jsonl 双份，方便人工看与 AI 读

## 16. 字段血缘图

下面给出一份最重要的字段血缘说明。

### 16.1 文本链

`原始行数据`
-> 名称候选生成
-> `fetch_wiki_article / fetch_baike_article`
-> `article tree`
-> `flatten_article_text`
-> `stage1.combined_text`

### 16.2 抽取链

`stage1.combined_text`
-> `llm_extract_dimensions`
-> `dimension_extract[维度].snippets`
-> `stage3_extracted_snippets`

### 16.3 术语链

`dimension_extract`
-> LLM 术语归纳
-> `terms_summary`
-> `terms_flat`
-> `stage4_terms_summary`

### 16.4 增强链

`stage1_text + existing_terms_summary + source_fields`
-> `llm_infer_start_time_and_terms`
-> `start_dynasty / start_year / filled_terms`
-> `stage5_final_dataset_enriched_v2`

### 16.5 结构聚类链

`raw_structure_terms + raw_layout_terms + raw_material_terms + evidence_sentences`
-> `build_signal_texts`
-> `derive_feature_set`
-> `features / feature_labels`
-> `group by building_type × dynasty_bucket`
-> Jaccard 距离
-> 层次聚类
-> medoid
-> LLM cluster naming
-> `building_cluster_assignments`

### 16.6 材料归类链

`terms_flat["建筑材料"] + dimension_extract["建筑材料"] + stage1_text`
-> 术语规范化
-> 规则映射
-> LLM 消歧
-> `material_categories / material_primary_category`

### 16.7 clean_data 链

`stage5_final_dataset_enriched_v2`
-> 朝代年份标准化
-> 术语扁平化
-> 省份提取
-> 世纪计算
-> 材料大类并入
-> `dataset/clean_data.csv/jsonl`

## 17. 这套方法和传统 NER / 深度模型的区别

### 17.1 和传统 NER 的区别

传统 NER 常见目标是识别人名、地名、机构名等边界，并输出 BIO 或 span 标签。

旧 `pchong` 这里做的不是这个。它做的是：

- 按建筑学维度抽证据句
- 把证据句归纳成术语
- 用术语和证据构造结构特征
- 再做聚类和统计

因此它更接近：

- 信息抽取
- 术语抽取
- 知识归纳

而不是经典命名实体识别。

### 17.2 和深度学习分类网络的区别

它不依赖：

- 本地训练数据集
- 端到端训练
- embedding 主导的黑盒聚类

它依赖的是：

- LLM 的语义理解能力
- 规则表的稳定性
- Jaccard + 层次聚类的可解释性

### 17.3 为什么适合古建筑场景

古建筑文本样本通常：

- 数量有限
- 术语异形多
- 证据分散在长文本里
- 可解释性要求高

因此“证据片段 -> 术语 -> 符号特征 -> 聚类”的路线，比黑盒向量方法更容易控结果，也更适合做可视化解释。

## 18. 可以直接用于报告写作的技术概括

如果需要把这套 pipeline 压缩成一段正式文字，可以这样概括：

本项目采用基于 LLM 与规则融合的古建筑信息抽取与结构聚类流程。首先，系统从原始建筑名录出发，抓取 Wikipedia 与百度百科等多源文本，并构建统一文章树后拍平成长文本；随后，围绕建筑结构体系、建筑材料、建筑功能、营造技艺、建筑空间布局五个维度，利用 LLM 从文章中提取证据片段，再将证据片段归纳为建筑学短术语，并结合词表与规则对缺失维度进行补齐。其后，系统以结构术语、布局术语、材料术语和原文证据句为输入，映射生成可解释的符号特征集合，在建筑类别与朝代分组内基于 Jaccard 距离进行层次聚类，并使用 medoid 代表样本与 LLM 命名机制得到结构类型名称和摘要。最后，系统将 enriched 数据进一步标准化、扁平化，生成 `clean_data` 及一系列统计长表、交叉表和图表数据包，用于后续可视化分析。

## 19. 最后结论

旧 `pchong` 的真实实现重点，不在“训练了什么模型”，而在“怎样用 LLM 组织一条可解释的数据处理链”。其关键创新点可以概括为四点：

1. 不是直接让 LLM 看全文瞎总结，而是先抽证据片段，再做术语归纳。
2. 不是直接做 embedding 聚类，而是先把术语和证据映射成可解释结构特征，再用 Jaccard + 层次聚类。
3. 不是把材料也做无监督聚类，而是使用固定 taxonomy 的多标签归类，更稳定、更适合可视化。
4. 最终目标不是论文式模型评估，而是生成稳定、可复用、可画图的建筑数据产品，如 `clean_data`、结构聚类结果、材料分布表、术语长表和各种交叉统计表。

如果后续需要继续扩写报告，最适合的写法不是“深度神经网络分层公式”，而是“分阶段 pipeline 方法说明 + 局部公式 + 字段血缘 + 工程实现”。
