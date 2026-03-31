#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recovered snippets from Codex logs for llm_extract_pipeline.py."""

import argparse
import csv
import json
import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from openai import OpenAI
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WDQS_ENDPOINT = "https://query.wikidata.org/sparql"
DEFAULT_USER_AGENT = "project_vis/1.0 (Windows; +https://example.com; contact: you@example.com) requests"

@dataclass
class ApiConfig:
    api_key: str
    model: str
    base_url: str


def build_requests_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=5, connect=5, read=5, backoff_factor=1.0, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset(["GET"]), raise_on_status=False)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def setup_logger(log_path: Path) -> logging.Logger:
    logger = logging.getLogger("llm_extract_pipeline")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    fh = logging.FileHandler(log_path, mode="w", encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger


def load_api_config(example_path: Path) -> ApiConfig:
    text = example_path.read_text(encoding="utf-8")
    api_key = ""
    model = ""
    base_url = "https://apis.iflow.cn/v1"
    m_key = re.search(r"api\s*:\s*([^\s]+)", text)
    if m_key:
        api_key = m_key.group(1).strip()
    m_model = re.search(r"模型名称\s*:\s*([^\s]+)", text)
    if m_model:
        model = m_model.group(1).strip()
    m_url = re.search(r'base_url\s*=\s*"([^"]+)"', text)
    if m_url:
        base_url = m_url.group(1).strip()
    if not api_key:
        raise ValueError("未在心流api调用示例.txt中解析到 api_key")
    if not model:
        raise ValueError("未在心流api调用示例.txt中解析到 模型名称")
    return ApiConfig(api_key=api_key, model=model, base_url=base_url)


def load_wiki_article_context(path: Path) -> Dict[str, Dict[str, Any]]:
    mapping: Dict[str, Dict[str, Any]] = {}
    if not path.exists():
        return mapping
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            name = str(row.get("name", "")).strip()
            if not name:
                continue
            article = row.get("article") or {}
            mapping[name] = {
                "wiki_title": row.get("wiki_title", ""),
                "wiki_url": row.get("wiki_url", ""),
                "match_method": row.get("match_method", ""),
                "article_text": flatten_article_text(article),
            }
    return mapping


def analyze_structure(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    keys = set()
    dynasty_values = set()
    for row in rows:
        keys.update(row.keys())
        era = str(row.get("时代", "")).strip()
        if era:
            dynasty_values.add(era)
    return {"rows": len(rows), "keys": sorted(keys), "dynasty_value_count": len(dynasty_values)}


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    fields = ["序号", "编号", "名称", "朝代", "年份", "主要建筑结构", "主要建筑材料", "主要建筑类型", "省", "市县", "wikidata_qid", "wikidata_label", "wiki_title", "置信度"]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


def call_llm_extract(client: OpenAI, model: str, name: str, source_row: Dict[str, Any], article_text: str, rule_cand: Dict[str, Any], wd_info: Dict[str, Any], wd_cand: Dict[str, Any]) -> Dict[str, Any]:
    prompt = {
        "task": "从古建筑信息中抽取结构化字段，并做事实校验。输出必须是JSON对象。",
        "constraints": {
            "no_sentence_values": "每个字段只能是名词或短语，不得输出完整句子。",
            "unknown_token": "无法确定时使用“未知”。",
            "year_format": "年份仅保留数字，如 594；多个年份用数组。",
            "location_format": "province与city_county分别输出，均为地名短语。",
            "no_guess_year": "若没有直接证据，不得推断年份，必须输出“未知”。",
        },
        "target_fields": ["朝代", "年份", "主要建筑结构", "主要建筑材料", "主要建筑类型", "省", "市县", "置信度", "校验结论"],
        "source_row": source_row,
        "article_text": article_text[:1800],
        "rule_candidates": rule_cand,
        "wikidata_entity": {"qid": wd_info.get("qid", ""), "label": wd_info.get("label", "")},
        "wikidata_facts_candidates": wd_cand,
        "required_output_json_schema": {
            "dynasty": "string",
            "year": "array[string]",
            "structure": "array[string]",
            "material": "array[string]",
            "building_type": "array[string]",
            "province": "string",
            "city_county": "string",
            "confidence": "number_between_0_and_1",
            "validation_note": "string_short_noun_phrase",
        },
        "building_name": name,
    }
    messages = [
        {"role": "system", "content": "你是古建筑知识抽取与事实校验助手。你必须只输出JSON对象，不要输出markdown，不要输出解释。"},
        {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
    ]
    resp = client.chat.completions.create(model=model, temperature=0.1, messages=messages)
    text = resp.choices[0].message.content or ""
    m = re.search(r"\{.*\}", text, flags=re.S)
    if not m:
        raise ValueError(f"LLM返回非JSON: {text[:200]}")
    return json.loads(m.group(0))


def main():
    parser = argparse.ArgumentParser(description="基于LLM+Wikidata的古建筑结构化字段提取管道")
    parser.add_argument("--input", default="", help="输入jsonl路径，默认自动匹配*1到8批.jsonl")
    parser.add_argument("--wiki-articles", default="wiki_articles.jsonl", help="包含爬取文章正文的jsonl")
    parser.add_argument("--api-example", default="心流api调用示例.txt", help="心流API示例文件路径")
    parser.add_argument("--output-jsonl", default="古建筑_结构化提取结果.jsonl", help="输出jsonl路径")
    parser.add_argument("--output-csv", default="古建筑_结构化提取结果.csv", help="输出csv路径")
    parser.add_argument("--analysis-json", default="jsonl结构分析.json", help="输入结构分析输出")
    parser.add_argument("--log", default="extract_pipeline.log", help="运行日志")
    parser.add_argument("--limit", type=int, default=0, help="只处理前N条，0表示全量")
    parser.add_argument("--sleep", type=float, default=0.2, help="每条之间sleep秒数")
    args = parser.parse_args()
