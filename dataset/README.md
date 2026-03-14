本作品数据集数据来源于全国重点文化保护单位第一到第八批名单中属于古建筑的part。

每个文件会有csv和jsonl两个格式，csv方便vscode查看，jsonl方便AI读取文件，如果让AI读取请用jsonl。

每个csv都含有很多不同列(特征)，需要查看特征请问codex

- `all_data.csv/jsonl`  全国重点文化保护单位第一到第八批古建筑的所有古建筑(未清洗)
- `clean_data.csv/jsonl` 全国重点文化保护单位第一到第八批古建筑的所有古建筑(四大类)
- `01_overview_metrics`: 总量指标
- `02_building_type_distribution`: 建筑类别分布
- `03_dynasty_distribution`: 始建朝代分布
- `04_year_distribution`: 始建年份分布
- `05_century_distribution`: 世纪分布（含公元前）
- `06_province_distribution`: 省级地区分布（由地址提取）
- `07_type_dynasty_crosstab`: 建筑类别 × 朝代
- `08_type_century_crosstab`: 建筑类别 × 世纪
- `09_type_province_crosstab`: 建筑类别 × 省份
- `10_material_category_distribution`: 材料大类分布（木材/砖瓦/石材/土类/灰浆胶结/金属/其他）
- `11_type_material_category_crosstab`: 建筑类别 × 材料大类
- `12_dynasty_material_category_crosstab`: 朝代 × 材料大类
- `13_terms_long_exploded`: 术语长表（每条术语1行，适合桑基图/词频图/热力图）
- `14_term_frequency_by_dimension`: 各维度术语频次
- `15_top_terms_by_type_dimension`: 各建筑类别在各维度的Top术语
- `16_year_stats_by_type`: 建筑类别的年份统计（最小/最大/均值/中位）
- `17_year_stats_by_dynasty`: 朝代内年份统计
- `18_column_multivalue_profile`: 列画像统计（含`;`多值拆分统计）
- `19_material_focus_counts`: 材料重点统计（按术语归类后的木材/砖瓦/石材等建筑覆盖数）
- `20_material_focus_top_terms`: 各材料大类下Top术语（便于做TopN图）

## 可直接画图建议

- 柱状图：`02`/`03`/`06`/`10`
- 折线或面积图：`04`/`05`
- 热力图：`07`/`08`/`11`/`12`
- 词云/条形图：`14`/`15`
- 箱线图：`16`/`17`
- 桑基图：`13`（如“建筑类别 -> 术语维度 -> 术语”）

## 注意

数据集中中间产物数据并未贴上(例如检索的文章，文章的切片等)