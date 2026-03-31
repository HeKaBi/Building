#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recovered snippets from Codex logs for stage5_enrich_clean_with_llm.py."""

import argparse
from typing import Any, Dict, List, Optional

from openai import OpenAI

DEFAULT_BASE_URL = "https://apis.iflow.cn/v1"
DIMENSIONS = ["建筑结构体系", "建筑材料", "建筑功能", "营造技艺", "建筑空间布局"]
SRC_KEY_ERA = "时代"
SRC_KEY_ADDR = "地址"
SRC_KEY_REMARK = "备注"
UNKNOWN_TOKENS = {"", "未知", "不详", "无", "暂无", "待考", "null", "none", "--", "nan", "?", "？"}

SUMMARY_VOCAB = {
    "建筑结构体系": ["抬梁式", "穿斗式", "拱券结构", "梁架体系", "木构架", "砖木结构", "砖石结构"],
    "建筑材料": ["木材", "砖石", "青砖", "条石", "生土", "夯土", "琉璃瓦", "糯米灰浆", "石灰砂浆"],
    "建筑功能": ["居住", "行政办公", "交通通行", "防御", "礼制祭祀", "仓储", "商贸"],
    "营造技艺": ["斗拱", "榫卯", "砖雕", "木雕", "石雕", "夯筑", "砌筑", "彩画"],
    "建筑空间布局": ["围院结构", "中轴对称", "四合院", "多进院落", "组群布局", "前朝后寝", "前店后宅"],
}


def normalize_terms_summary(raw_obj: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    out: Dict[str, List[Dict[str, Any]]] = {}
    for dim in DIMENSIONS:
        raw_items = raw_obj.get(dim, [])
        if not isinstance(raw_items, list):
            raw_items = []
        items: List[Dict[str, Any]] = []
        seen = set()
        for item in raw_items:
            if isinstance(item, dict):
                term = normalize_text(item.get("term"))
                conf = clamp_float(item.get("confidence"), default=0.0)
            else:
                term = normalize_text(item)
                conf = 0.0
            if not term or is_unknown_text(term) or term in seen:
                continue
            seen.add(term)
            items.append({"term": term[:20], "confidence": conf})
        out[dim] = items[:6]
    return out


def fallback_terms_by_vocab(text: str, dim: str) -> List[Dict[str, Any]]:
    vocab = SUMMARY_VOCAB.get(dim, [])
    found: List[Dict[str, Any]] = []
    for token in vocab:
        if token in text:
            found.append({"term": token, "confidence": 0.6})
    if not found and vocab:
        found.append({"term": vocab[0], "confidence": 0.32})
    return found[:3]


def llm_infer_start_time_and_terms(client: OpenAI, model: str, logger, row: Dict[str, Any], stage1_row: Dict[str, Any], missing_dims: List[str], max_retries: int) -> Dict[str, Any]:
    source = row.get("source", {})
    article_text = normalize_text(stage1_row.get("combined_text"))
    if not article_text:
        article_text = " ".join([normalize_text(x) for x in row.get("clean_evidence", []) if normalize_text(x)])
    payload = {
        "task": "推断古建筑最早始建朝代与年份，并补齐缺失术语维度。",
        "building_name": normalize_text(row.get("name")),
        "line_no": safe_line_no(row.get("line_no")),
        "source_fields": {
            "时代": normalize_text(source.get(SRC_KEY_ERA)),
            "地址": normalize_text(source.get(SRC_KEY_ADDR)),
            "备注": normalize_text(source.get(SRC_KEY_REMARK)),
        },
        "stage1_text": article_text[:12000],
        "existing_terms_summary": normalize_terms_summary(row.get("terms_summary", {})),
        "missing_dimensions": missing_dims,
        "dimensions": DIMENSIONS,
        "output_schema": {
            "start_dynasty": "string",
            "start_year": "integer_or_null",
            "time_confidence": "0_to_1",
            "time_reason": "string",
            "filled_terms": {
                "建筑结构体系": [{"term": "string", "confidence": "0_to_1"}],
                "建筑材料": [{"term": "string", "confidence": "0_to_1"}],
                "建筑功能": [{"term": "string", "confidence": "0_to_1"}],
                "营造技艺": [{"term": "string", "confidence": "0_to_1"}],
                "建筑空间布局": [{"term": "string", "confidence": "0_to_1"}],
            },
        },
        "constraints": [
            "start_year 返回最早始建年份；公元前年份使用负数表示",
            "若无法判断年份，start_year 返回 null，并在 time_reason 解释",
            "filled_terms 只需对缺失维度补词，每个维度给1-3个短术语",
            "术语必须是短词，不要句子",
            "只输出 JSON 对象",
        ],
    }
    system_prompt = "你是中国古建筑信息抽取助手，只输出JSON对象，不输出Markdown。"
    result = llm_json_call(client=client, model=model, system_prompt=system_prompt, payload=payload, logger=logger, call_name=f"llm_enrich:{row.get('line_no')}:{row.get('name')}", max_retries=max_retries)
    return {
        "start_dynasty": normalize_text(result.get("start_dynasty")),
        "start_year": parse_optional_int(result.get("start_year")),
        "time_confidence": clamp_float(result.get("time_confidence"), default=0.0),
        "time_reason": normalize_text(result.get("time_reason")),
        "filled_terms": normalize_terms_summary(result.get("filled_terms", {})),
        "inference_source": "llm",
    }


def build_flat_term_fields(terms_summary: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, List[Any]]]:
    terms_flat: Dict[str, List[str]] = {}
    confidences_flat: Dict[str, List[float]] = {}
    for dim in DIMENSIONS:
        arr = terms_summary.get(dim, [])
        terms_flat[dim] = [normalize_text(item.get("term")) for item in arr if normalize_text(item.get("term"))]
        confidences_flat[dim] = [clamp_float(item.get("confidence"), default=0.0) for item in arr if normalize_text(item.get("term"))]
    return {"terms_flat": terms_flat, "confidences_flat": confidences_flat}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="基于 stage1+stage5 调用 LLM 推断古建筑始建朝代/年份，并清洗 terms 输出为适合 CSV 的列。")
    parser.add_argument("--stage1-jsonl", default="pipeline_outputs/stage1_crawled_articles.jsonl")
    parser.add_argument("--stage5-jsonl", default="pipeline_outputs/stage5_final_dataset.jsonl")
    parser.add_argument("--output-jsonl", default="pipeline_outputs/stage5_final_dataset_enriched.jsonl")
    parser.add_argument("--output-csv", default="pipeline_outputs/stage5_final_dataset_enriched_clean.csv")
    parser.add_argument("--state-path", default="pipeline_outputs/stage5_enrich_clean_state.json")
    parser.add_argument("--log-file", default="pipeline_outputs/stage5_enrich_clean.log")
    return parser.parse_args()
