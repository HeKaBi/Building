# `stage10_lineage_pipeline` 技术实现全流程说明

本文用于完整解释工作区下 [pchong/stage10_lineage_pipeline](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline) 的技术实现。目标是把这条 pipeline 的输入来源、字段融合、相似度计算、建图策略、社区发现、个体子图抽取、前端消费方式和输出文件结构一次讲清楚，方便后续交给网页版 GPT 继续整理成 Word 文本。

## 1. 结论先行

`stage10_lineage_pipeline` 不是“LLM embedding + GAT + K-Means”那类深度图学习模型，而是一条明确写成 `no_embedding_no_training` 的**无训练建筑谱系发现 pipeline**。这一点可以直接从 [lineage_manifest.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_manifest.json) 确认。

它的真实流程是：

1. 读取 `clean_data`、结构聚类结果、材料归类结果
2. 标准化建筑术语
3. 计算建筑之间的多分量相似度
4. 在四大建筑类型内构建加权无向图
5. 用 Louvain 做社区发现，得到“建筑谱系”
6. 为每栋建筑提取一个以它为中心的 top-k 局部谱系图
7. 输出图数据、谱系目录、成员归属表
8. 再把这些 JSON 打包给一个纯前端 demo 可视化使用

所以它更准确的描述是：

- 基于结构化术语和规则特征的古建筑谱系图构建
- 基于加权相似度图的社区发现
- 基于 Personalized PageRank 的个体局部谱系提取

## 2. 目录结构

`stage10` 目录下的关键文件如下：

- [run_pipeline.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py)
- [build_frontend_bundle.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/build_frontend_bundle.py)
- [serve_demo.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/serve_demo.py)
- [frontend/index.html](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/frontend/index.html)
- [frontend/app.js](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/frontend/app.js)
- [outputs/lineage_manifest.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_manifest.json)
- [outputs/lineage_catalog.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_catalog.json)
- [outputs/building_index.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/building_index.json)
- [outputs/lineage_membership.csv](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_membership.csv)
- [outputs/type_graphs](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/type_graphs)
- [outputs/topk_graphs](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/topk_graphs)

## 3. 它与 PDF 里 3.2.3 的区别

报告里 3.2.3 的路线是：

- 大模型做诗人 embedding
- GAT 学节点嵌入
- K-Means 做社区发现
- t-SNE 做降维展示

`stage10` 完全不是这条路线。

它没有：

- embedding API
- GAT 训练
- negative sampling
- K-Means
- t-SNE

它有的是：

- 上游抽好的建筑结构术语和聚类标签
- IDF 加权的 Weighted Jaccard
- 结构簇、材料类、时间、地域的规则性加权
- mutual-kNN 图筛边
- Louvain 社区发现
- Personalized PageRank 子图抽取

因此，若要写文档，不应叫“基于大模型与 GAT 的建筑社区发现”，而应叫：

- 基于多维结构特征的古建筑谱系图构建与社区发现
- 或 基于无训练图算法的古建筑谱系分析 pipeline

## 4. 这条 pipeline 的输入来源

### 4.1 直接输入文件

[run_pipeline.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py) 在 [load_building_records](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L254) 中会读取三类输入：

1. `dataset/clean_data.csv`
2. `stage6_structure_cluster_pipeline/outputs/building_cluster_assignments.csv`
3. `stage6_material_cluster_pipeline/outputs/building_material_assignments.csv`

### 4.2 当前工作区路径注意事项

需要注意一个现实问题：当前代码中的 `ROOT = Path(__file__).resolve().parent.parent`，对当前目录结构来说会解析到 `D:\Data\Code\project_vis\pchong`，所以脚本内部写的：

- `ROOT / 'dataset' / 'clean_data.csv'`
- `ROOT / 'stage6_structure_cluster_pipeline' / ...`

在当前工作区下并不完全对应真实位置，因为当前的 `dataset` 在 [dataset](D:/Data/Code/project_vis/dataset)，而不是 `pchong/dataset`。这说明：

1. 当前 `stage10` 输出大概率来自先前已跑完的环境
2. 若要在当前工作区重跑，可能需要改相对路径，或把输入复制到脚本预期位置

这不影响对算法逻辑的还原，但在文档中应单独备注。

### 4.3 输入字段来源

从 [00_building_records.csv](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/00_building_records.csv) 可以确认，`stage10` 汇总后的建筑记录至少包含：

- `line_no`
- `name`
- `building_type`
- `start_dynasty`
- `century_num`
- `province`
- `region`
- `address`
- `start_time_confidence`
- `structure_terms`
- `layout_terms`
- `material_terms`
- `craft_terms`
- `function_terms`
- `material_categories`
- `structure_cluster`
- `structure_cluster_summary`
- `material_primary_category`
- `structure_evidence`
- `semantic_terms`

这说明 `stage10` 并不是“从原始建筑文本直接建图”，而是建立在前面 stage5/stage6 已经整理好的结构化数据之上。

## 5. 数据融合与统一记录构建

### 5.1 `clean_data` 提供的基础字段

`clean_data.csv` 提供：

- 五个维度的扁平化术语字段
- 起始朝代、世纪、省份、地址
- 材料大类

### 5.2 `stage6_structure_cluster_pipeline` 提供的补充

在 [run_pipeline.py#L286](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L286) 附近，结构聚类结果会补充：

- `structure_cluster`
- `structure_cluster_summary`
- `feature_text`
- `evidence_sentences`

并且 `feature_text` 还会额外并入 `structure_terms`，也就是：

原始结构术语 + 结构聚类阶段生成的高层结构标签

### 5.3 `stage6_material_cluster_pipeline` 提供的补充

材料归类结果会补充：

- `material_categories`
- `material_primary_category`

### 5.4 最终统一记录

每条建筑记录最终会被组装成一个统一的 `record`，后续所有图算法都基于这个 `record` 展开。  
在 [topk_graphs/11.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/topk_graphs/11.json) 可以看到一条完整示例。

## 6. 术语标准化层

`stage10` 的第一层核心不是图，而是**术语归一化**。如果这层不做，图边会非常稀疏。

### 6.1 字符串处理函数

[run_pipeline.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py) 先定义了：

- `norm_text`
- `compact_text`
- `split_terms`
- `normalize_token`
- `normalize_term_list`

### 6.2 TOKEN_NORMALIZATION 映射

在 [run_pipeline.py#L42](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L42) 定义了一组显式归一规则，例如：

- `四合院 -> 合院布局`
- `中轴布局 -> 中轴对称`
- `抬梁式木构架 -> 抬梁式`
- `穿斗体系 -> 穿斗式`
- `木构体系 -> 木构架`
- `榫卯 -> 榫卯结构`
- `交通功能 -> 交通桥梁`

### 6.3 模糊规则归一

除了字典映射，还加了规则化补充：

- 包含“抬梁”统一为 `抬梁式`
- 包含“穿斗”统一为 `穿斗式`
- 包含“木构”且伴随“架/体系/结构”统一为 `木构架`
- 含“中轴”统一为 `中轴对称`
- 含“合院/四合院”统一为 `合院布局`
- 含“拱桥”且含“石”统一为 `石拱桥`

### 6.4 目的

这一层的目的，是把不同数据源、不同 stage、不同写法产生的术语对齐到同一 token 空间，使相似建筑更容易连边。

## 7. 地域标准化层

### 7.1 省份去后缀

在 [strip_province_suffix](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L153) 中，会把：

- `河北省 -> 河北`
- `北京市 -> 北京`

等统一化处理。

### 7.2 大区映射

在 [PROVINCE_REGION](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L72) 中，省份会进一步映射到大区：

- 华北
- 华东
- 华中
- 华南
- 西南
- 西北
- 东北

这使得“同省”和“同区域”可以分别作为不同强度的图边信号。

## 8. 建筑记录的语义字段组织

`stage10` 使用了五类主要术语集合：

- `structure_terms`
- `layout_terms`
- `material_terms`
- `craft_terms`
- `function_terms`

对应 `TERM_SPECS`，权重分别为：

- 结构：`0.28`
- 布局：`0.22`
- 材料：`0.12`
- 技艺：`0.10`
- 功能：`0.08`

此外还有四类标量特征：

- `structure_cluster`：`0.10`
- `material_cluster`：`0.04`
- `time`：`0.04`
- `region`：`0.02`

全部加起来总权重为 `1.00`。

## 9. IDF 计算：弱化高频泛词

### 9.1 为什么引入 IDF

如果所有共享词一视同仁，那么“木材”“结构”“院落”这类泛词会过度抬高相似度。  
因此 `stage10` 在 [compute_idf](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L303) 中，按建筑类型单独计算各维 token 的 IDF。

### 9.2 计算方式

对某建筑类型下某一维度 token 的文档频次 `df(token)`，IDF 定义为：

\[
\mathrm{IDF}(token) = \log \frac{1 + N}{1 + df(token)} + 1
\]

其中 `N` 是该建筑类型下建筑样本数。

### 9.3 设计含义

这意味着：

- 冷门但区分性强的结构词更有价值
- 高频公共词的区分力被削弱
- 不同建筑类型各自独立计算，不混在一起

## 10. 建筑对相似度计算

真正的图边不是“根据人工规则硬连”，而是先为任意两栋同类建筑计算一个综合相似度。

### 10.1 Weighted Jaccard

在 [weighted_jaccard](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L324) 中，对两栋建筑在某维术语集合上的相似度计算为加权 Jaccard：

\[
\mathrm{WJ}(A,B)=
\frac{\sum_{t \in A \cap B} w_t}
{\sum_{t \in A \cup B} w_t}
\]

其中 `w_t` 就是前面按建筑类型计算出的 IDF。

### 10.2 各维度共享词提取

在 [top_shared_terms](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L338) 中，会把共享 token 按：

1. IDF 权重
2. token 长度
3. token 字面值

排序，选前 `3` 个，用来给边生成解释语句。

### 10.3 结构簇相似度

在 [structure_cluster_similarity](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L344) 中：

- 若 `cluster_name` 完全相同，得分 `1.0`
- 否则若 cluster 名称拆词后有交集，则返回：

\[
0.6 \times \frac{|A \cap B|}{|A \cup B|}
\]

### 10.4 材料簇相似度

在 [material_cluster_similarity](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L357) 中：

- 若 `material_primary_category` 相同，得分 `1.0`
- 否则用 `material_categories` 做普通 Jaccard

### 10.5 时间相似度

在 [time_similarity](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L369) 中：

- 若有世纪信息，则使用：

\[
\mathrm{century\_score} = \exp\left(-\frac{|c_i-c_j|}{2.5}\right)
\]

再和同朝代匹配组合：

\[
\mathrm{time\_score}=0.65\times \mathrm{century\_score}+0.35\times \mathrm{dynasty\_match}
\]

- 若世纪缺失，则只保留朝代信号：

\[
0.6 \times \mathrm{dynasty\_match}
\]

### 10.6 地域相似度

在 [region_similarity](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L379) 中：

- 同省：`1.0`
- 同大区：`0.6`
- 否则：`0.0`

### 10.7 总边权

在 [build_pair_metrics](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L386) 中，总相似度由以上分量加权求和：

\[
S =
0.28S_{\text{structure}}+
0.22S_{\text{layout}}+
0.12S_{\text{material}}+
0.10S_{\text{craft}}+
0.08S_{\text{function}}+
0.10S_{\text{structure\_cluster}}+
0.04S_{\text{material\_cluster}}+
0.04S_{\text{time}}+
0.02S_{\text{region}}
\]

### 10.8 边过滤阈值

若同时满足：

- `semantic_score < 0.09`
- `structure_cluster_score < 0.45`
- `material_cluster_score < 0.45`

则直接丢弃。  

若总权重：

- `total_weight < 0.15`

也直接丢弃。

这一步用于避免图中出现“仅因为同省或同朝代就被弱连边”的噪声边。

### 10.9 边解释

每条通过筛选的候选边，都会记录：

- `components`
- `shared_terms`
- `reasons`

例如：

- `共享结构：抬梁式、合院布局`
- `同属结构簇：明-合院布局·木构架-青砖谱系`
- `同省：山西`
- `同朝代：明`

因此图的每条边是可解释的。

## 11. 图构建策略

### 11.1 按建筑类型分别建图

在 [build_type_graph](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L438) 中，图是按四大类分别构建的：

- 民居
- 官府
- 桥梁
- 宫殿

不会跨类型连边。

### 11.2 图的基本形态

图是：

- `networkx.Graph`
- 无向图
- 节点属性来自统一 `record`
- 边属性包括：
  - `weight`
  - `cost`
  - `reasons`
  - `components`
  - `shared_terms`

其中：

\[
\mathrm{cost} = \frac{1}{\max(\mathrm{weight}, 10^{-6})}
\]

这个 `cost` 后面用于最短路。

### 11.3 mutual-kNN 过滤

不是所有候选边都会进入图。  
策略是：

1. 为每个节点按边权降序排序所有候选邻居
2. 只取每个节点前 `k` 个邻居，`k` 默认 `12`
3. 当且仅当 A 在 B 的 top-k 中，且 B 也在 A 的 top-k 中，这条边才真正入图

这就是 mutual-kNN。

### 11.4 孤点回补

如果某节点经过 mutual-kNN 后度仍然为 0，则会用它最强的候选边补一条 fallback 边。  
这样可以减少图中的孤立节点。

## 12. 社区发现：建筑谱系识别

### 12.1 使用算法

在 [detect_lineages](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L557) 中，核心社区发现算法是：

- `networkx.algorithms.community.louvain_communities`

### 12.2 处理特殊情况

- 若图为空：返回空结果
- 若图只有一个节点：该节点自己构成一个社区
- 若图有节点但无边：每个节点自己是一个社区
- 否则：运行 Louvain

### 12.3 当前参数

在 [lineage_manifest.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_manifest.json) 中可以看到当前运行参数：

- `mutual_k = 12`
- `min_weight = 0.18`
- `resolution = 1.12`
- `top_k = 10`

### 12.4 谱系 ID

每个社区会被编号为：

- `民居-L01`
- `官府-L03`
- `桥梁-L02`

这种形式。

## 13. 谱系签名与命名

`stage10` 社区命名不是 LLM 调的，而是规则拼装的。

### 13.1 计数器统计

在 [build_lineage_signature](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L505) 中，会统计每个社区内的：

- 结构术语频次
- 布局术语频次
- 材料术语频次
- 技艺术语频次
- 省份频次
- 朝代频次
- 大区频次
- 主材料大类频次

### 13.2 泛词过滤

在 [GENERIC_TERMS](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L35) 中，像：

- 木材
- 石材
- 民居
- 官府
- 结构
- 布局

这类过泛的词会在命名时尽量跳过，不作为优先 signature。

### 13.3 作用域标签选择

社区命名时，首先决定 `scope_label`：

1. 若某省份占比 `>= 0.4`，优先用省份
2. 否则若某朝代占比 `>= 0.35`，用朝代
3. 否则若某大区占比 `>= 0.4`，用区域
4. 否则退回到建筑类型

### 13.4 核心与支撑特征

- `core_parts = [primary_layout, primary_structure]`
- `support_label = support_material or support_craft or building_type`

### 13.5 命名模板

最终命名模板是：

\[
\text{lineage\_name}
=
\text{scope\_label}
-\text{core\_parts}
-\text{support\_label}
\text{谱系}
\]

例如：

- `清-合院布局-青砖谱系`
- `明-中轴对称·合院布局-青砖谱系`
- `明-围院结构·砖石混合-砖雕谱系`

### 13.6 谱系摘要

摘要模板是：

`以{核心特征}为核心，辅以{支撑特征}，在{scope_label}样本中形成稳定的营造共同体。`

这也是规则生成，不是 LLM 生成。

## 14. 个体 top-k 谱系图提取

这是 `stage10` 很关键的一层。它不是只输出“这个建筑属于哪个社区”，而是为每一栋建筑都生成一张局部谱系图。

### 14.1 中心点

对每个建筑，把它自己视为中心节点 `center_id`。

### 14.2 社区子图

只在该建筑所属的社区内做局部图抽取，不跨社区。

### 14.3 最短路层级

在 [extract_topk_graph](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L656) 中，会先计算：

- `nx.single_source_shortest_path_length(community_graph, center_id, cutoff=3)`

得到 hop 层级：

- `hop = 1`
- `hop = 2`
- `hop >= 3`

### 14.4 Personalized PageRank

再在社区图上跑以中心建筑为 personalization 的 PageRank，函数在 [personalized_pagerank](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L619)。

它的特点是：

- 初始概率全部压到中心节点
- 传播时按边权分配
- `alpha = 0.85`
- 若有 dangling mass，回流到中心节点

这一步实际上在回答：

“在当前谱系中，哪些节点相对于这个中心建筑最重要、最贴近？”

### 14.5 谱系签名重叠

`extract_topk_graph` 还会计算：

- `signature_overlap(center, record, lineage_entry['signature_features'])`

即目标建筑和谱系签名特征的重叠度。

### 14.6 邻居综合排序分数

对每个候选邻居，最终排序分数定义为：

\[
\mathrm{score}
=
0.45 \times \mathrm{ppr\_norm}
0.35 \times \mathrm{direct\_weight}
0.20 \times \mathrm{overlap\_score}
\]

其中：

- `ppr_norm`：归一化 personalized PageRank
- `direct_weight`：中心建筑与该节点直接边权
- `overlap_score`：与谱系签名特征的重合度

### 14.7 top-k 保留

按建筑类型默认保留数量不同，在 [TYPE_DEFAULT_TOP_K](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/run_pipeline.py#L38)：

- 民居：`12`
- 官府：`10`
- 桥梁：`10`
- 宫殿：`8`

### 14.8 桥接节点补入

如果某个被选中的节点距离中心大于 1，则会沿最短路把中间桥接节点补进子图：

- 这样局部图不会碎成几块
- 用户能看到“它是怎么被连接到中心建筑的”

### 14.9 局部图节点角色

最终子图中的节点角色分成：

- `center`
- `member`
- `bridge`

并保存：

- `hop`
- `score`
- `shared_features`

## 15. 输出文件结构

### 15.1 基础记录

- [00_building_records.jsonl](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/00_building_records.jsonl)
- [00_building_records.csv](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/00_building_records.csv)

记录融合后的统一建筑数据。

### 15.2 类型级全图

在 [type_graphs](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/type_graphs) 下，每类一个文件，例如：

- [民居_graph.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/type_graphs/民居_graph.json)
- [官府_graph.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/type_graphs/官府_graph.json)

包含：

- `node_count`
- `edge_count`
- `community_count`
- 全部 `nodes`
- 全部 `edges`

### 15.3 个体局部谱系图

在 [topk_graphs](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/topk_graphs) 下，每栋建筑一个文件，例如：

- [11.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/topk_graphs/11.json)

内容包括：

- `center_building`
- `lineage_id`
- `lineage_name`
- `signature_features`
- `signature_summary`
- `community_member_count`
- `nodes`
- `edges`

### 15.4 谱系目录

[lineage_catalog.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_catalog.json) 记录所有社区：

- `lineage_id`
- `building_type`
- `member_count`
- `members`
- `lineage_name`
- `summary`
- `signature_features`

### 15.5 成员归属表

[lineage_membership.csv](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_membership.csv) 记录每栋建筑属于哪个谱系。

### 15.6 建筑索引

[building_index.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/building_index.json) 是前端查询入口索引，记录：

- 建筑基本信息
- `lineage_id`
- `lineage_name`
- 对应 `graph_file`

### 15.7 运行摘要

[lineage_manifest.json](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/outputs/lineage_manifest.json) 记录本次运行概要。

当前结果为：

- 建筑总数 `410`
- 谱系总数 `68`
- 民居 `195` 栋，`18` 个社区
- 官府 `105` 栋，`23` 个社区
- 桥梁 `92` 栋，`13` 个社区
- 宫殿 `18` 栋，`14` 个社区

## 16. 前端打包与 demo 渲染

### 16.1 打包脚本

[build_frontend_bundle.py](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/build_frontend_bundle.py) 的作用非常简单：

1. 读取：
   - `lineage_manifest.json`
   - `building_index.json`
   - `lineage_catalog.json`
2. 生成 `defaultByType`
3. 输出到：
   - [frontend/data.js](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/frontend/data.js)

也就是把静态元数据打包成前端可直接引用的 JS 变量。

### 16.2 前端加载机制

[frontend/index.html](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/frontend/index.html) 会加载：

- `echarts.min.js`
- `data.js`
- `app.js`

### 16.3 前端数据流

[frontend/app.js](D:/Data/Code/project_vis/pchong/stage10_lineage_pipeline/frontend/app.js) 的流程是：

1. 从 `window.__STAGE10_LINEAGE__` 读取：
   - `manifest`
   - `buildingIndex`
   - `lineages`
   - `defaultByType`
2. 按建筑类型切换
3. 根据输入的名称或 `line_no` 检索建筑
4. 按需 fetch 对应的：
   - `../outputs/topk_graphs/{line_no}.json`
5. 用 ECharts graph 渲染

### 16.4 前端图中节点语义

在前端里，节点被区分为：

- 中心建筑 `center`
- 桥接节点 `bridge`
- 一跳节点 `hop1`
- 二跳节点 `hop2`
- 三跳外缘 `hop3`

同时还会识别对象是：

- 单体建筑
- 建筑群/聚落等集合节点

### 16.5 前端布局策略

虽然 ECharts 使用 `layout: 'force'`，但它不是完全随机启动，而是先做一层**人工初始布局**：

- 中心放中间
- bridge 放近环
- hop1、hop2、hop3 分层放在更远的椭圆环上

对应逻辑在 `buildInitialLayout(...)`。

然后再叠加 force 参数：

- 小图更紧凑
- 大图更分散

### 16.6 前端显示边筛选

前端并不一定把 `topk_graph` 中的所有边全显示，而会再做一层 `visibleEdges` 过滤：

- 优先保留和中心或桥接节点相关的重要边
- 再按预算补若干高权重辅助边

这能减少视觉杂乱。

### 16.7 前端节点大小

节点大小由 `scoreToSize` 决定：

- 中心节点最大
- 其余节点根据 `score` 映射
- 集合节点会用胶囊形 roundRect

### 16.8 前端 tooltip

节点 tooltip 会显示：

- 名称
- 节点角色
- score
- 建筑类型、省份、朝代
- `shared_features`

边 tooltip 会显示：

- 边权 `weight`
- `reasons`

因此前端不是“纯装饰可视化”，而是把 pipeline 里存下来的解释信息继续暴露给用户。

## 17. 运行流程总结

如果按工程运行顺序概括，这条 pipeline 可以写成：

1. 汇总上游数据  
   读取 `clean_data`、结构聚类、材料归类结果，构造统一建筑记录。

2. 术语清洗与归一  
   对结构、布局、材料、技艺、功能术语做规范化。

3. 类型内 IDF 建模  
   在四大建筑类型内部，按维度计算 token 的区分性权重。

4. 建筑对相似度计算  
   用 weighted Jaccard、结构簇相似度、材料主类相似度、时间相似度、地域相似度等构造建筑对边权。

5. mutual-kNN 图构建  
   在每个建筑类型内构建加权无向图，并回补孤点。

6. Louvain 社区发现  
   在类型图上识别建筑谱系社区。

7. 谱系签名生成  
   从社区中抽取主结构、主布局、支撑材料、支撑技艺、省份/朝代/区域特征，并拼出 `lineage_name` 与 `summary`。

8. 个体局部谱系图抽取  
   对每栋建筑，在其谱系社区内利用最短路、Personalized PageRank 和谱系签名重叠分数选出 top-k 邻居和桥接节点。

9. JSON 与索引落盘  
   生成 type 级图、个体局部图、成员归属表、谱系目录和运行摘要。

10. 前端打包与可视化  
    将 manifest/index/catalog 打成 `data.js`，再由前端按需加载每栋建筑对应的局部谱系图。

## 18. 它的优点与局限

### 18.1 优点

- 不需要训练模型
- 不需要 embedding API
- 图边完全可解释
- 谱系命名稳定、可控
- 和上游建筑术语抽取、结构聚类、材料归类高度衔接
- 适合可视化场景中的交互检索与局部图浏览

### 18.2 局限

- 强依赖上游术语质量
- 规则归一化词表需要持续维护
- Louvain 结果受参数和图稠密度影响
- 没有学习到潜在隐式语义，只能使用显式特征和规则相似度
- 当前目录结构下，脚本的相对路径假设和现有工作区不完全一致，若要重跑需要先修路径

## 19. 最适合的报告表述

如果要把它写进报告，最准确的概括不是“基于大模型与 GAT 的图算法”，而是：

“本项目在前序古建筑术语抽取、结构聚类与材料归类结果的基础上，构建了一个无训练的古建筑谱系图发现 pipeline。该方法通过对结构、布局、材料、技艺和功能术语进行标准化，并结合结构簇、材料主类、时间与地域信息构造建筑间的综合相似度，在四类建筑内部生成加权关系图，随后采用 Louvain 社区发现识别建筑谱系，并利用 Personalized PageRank 为每一栋建筑提取局部谱系子图，从而实现可解释、可交互、可视化友好的建筑谱系分析。”

这就是 `stage10` 的真实技术定位。
