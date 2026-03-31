#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recovered snippets from Codex logs for ancient_building_llm_pipeline.py."""

from __future__ import annotations

import csv
import html
import json
import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import quote

from bs4 import BeautifulSoup, Tag
from openai import OpenAI

SRC_KEY_NAME = "名称"
SRC_KEY_ERA = "时代"
SRC_KEY_ADDR = "地址"
SRC_KEY_REMARK = "备注"
DEFAULT_BASE_URL = "https://apis.iflow.cn/v1"
TARGET_BUILDING_TYPES = ["民居", "宫殿", "官府", "桥梁"]
DIMENSIONS = ["建筑结构体系", "建筑材料", "建筑功能", "营造技艺", "建筑空间布局"]
RELIGIOUS_KEYWORDS = ["庙", "寺", "寺庙", "道观", "宝塔", "塔", "教堂", "清真寺", "祠庙", "坛庙"]
TYPE_RULE_KEYWORDS = {
    "民居": ["民居", "宅", "院", "大院", "故居", "民宅", "村落", "会馆"],
    "宫殿": ["宫", "殿", "王府", "行宫", "皇城", "宫城"],
    "官府": ["府衙", "衙署", "官署", "公署", "县衙", "州衙", "总督署", "行署", "驿站"],
    "桥梁": ["桥", "梁桥", "拱桥", "廊桥", "浮桥"],
}
DIMENSION_HINTS = {
    "建筑结构体系": ["抬梁", "穿斗", "井干", "砖木", "木构", "砖石", "拱券", "结构", "梁架", "斗拱", "桁架"],
    "建筑材料": ["木材", "木", "砖", "石", "青砖", "夯土", "生土", "琉璃瓦", "灰浆", "糯米灰浆", "瓦"],
    "建筑功能": ["居住", "礼制", "办公", "防御", "祭祀", "交通", "仓储", "商贸", "驿传", "行政"],
    "营造技艺": ["榫卯", "斗拱", "彩画", "砌筑", "夯筑", "营造", "雕刻", "油饰", "抹灰", "维修"],
    "建筑空间布局": ["院落", "中轴", "轴线", "前后院", "四合院", "进深", "面阔", "布局", "围院", "组群"],
}

@dataclass
class ApiConfig:
    api_key: str
    model: str
    base_url: str = DEFAULT_BASE_URL


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_text(x: Any) -> str:
    if x is None:
        return ""
    return re.sub(r"\s+", " ", str(x)).strip()


def clean_text(x: str) -> str:
    return re.sub(r"\s+", " ", str(x or "")).strip()


def unique_keep_order(items: Iterable[str]) -> List[str]:
    out: List[str] = []
    seen = set()
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def split_sentences(text: str) -> List[str]:
    chunks = re.split(r"[。！？；;\n\r]+", text or "")
    out = []
    for c in chunks:
        t = normalize_text(c)
        if len(t) >= 8:
            out.append(t)
    return out


def pick_snippets_by_keywords(text: str, keywords: Sequence[str], max_count: int = 3) -> List[str]:
    sentences = split_sentences(text)
    hits: List[str] = []
    for sentence in sentences:
        if any(k in sentence for k in keywords):
            hits.append(sentence[:140])
            if len(hits) >= max_count:
                break
    return unique_keep_order(hits)


def parse_aliases_from_remark(remark: str) -> List[str]:
    out: List[str] = []
    text = normalize_text(remark)
    if not text:
        return out
    m = re.search(r"名称[:：]\s*([^\s，。；;、]+)", text)
    if m:
        out.append(m.group(1).strip())
    m2 = re.search(r"又名[:：]\s*([^\s，。；;、]+)", text)
    if m2:
        out.append(m2.group(1).strip())
    return unique_keep_order(out)


def generate_name_candidates(name: str, source_row: Dict[str, Any]) -> List[str]:
    base = normalize_text(name)
    no_paren = re.sub(r"[\(\uff08][^\)\uff09]*[\)\uff09]", "", base).strip()
    split_parts = [x.strip() for x in re.split(r"[、及和\-—/]", no_paren) if x.strip()]
    aliases = parse_aliases_from_remark(normalize_text(source_row.get(SRC_KEY_REMARK)))
    cands = [base, no_paren, *split_parts, *aliases]
    return unique_keep_order([c for c in cands if c])


def block_to_text(block: Dict[str, Any]) -> str:
    block_type = block.get("type")
    if block_type == "paragraph":
        return normalize_text(block.get("text"))
    if block_type in {"list", "definition_list"}:
        items = block.get("items") or []
        return "；".join([normalize_text(i) for i in items if normalize_text(i)])
    if block_type == "table":
        rows = block.get("rows") or []
        chunks = []
        for row in rows[:8]:
            line = "|".join([normalize_text(c) for c in row if normalize_text(c)])
            if line:
                chunks.append(line)
        return "；".join(chunks)
    return ""


def flatten_article_text(article: Dict[str, Any], max_chars: int = 12000) -> str:
    parts: List[str] = []
    for block in article.get("lead", []):
        txt = block_to_text(block)
        if txt:
            parts.append(txt)
    def walk_sections(sections: List[Dict[str, Any]]) -> None:
        for sec in sections:
            title = normalize_text(sec.get("title"))
            if title:
                parts.append(f"[{title}]")
            for block in sec.get("content", []):
                txt = block_to_text(block)
                if txt:
                    parts.append(txt)
            walk_sections(sec.get("sections", []))
    walk_sections(article.get("sections", []))
    full = clean_text(" ".join(parts))
    return full[:max_chars] if len(full) > max_chars else full


def has_any_class(tag: Tag, class_names: set[str]) -> bool:
    cls = set(tag.get("class") or [])
    return bool(cls.intersection(class_names))


def parse_wiki_heading(tag: Tag) -> Optional[Tuple[int, str]]:
    heading_tag: Optional[Tag] = None
    if tag.name in {"h2", "h3", "h4", "h5", "h6"}:
        heading_tag = tag
    elif tag.name == "div" and "mw-heading" in (tag.get("class") or []):
        for child in tag.children:
            if isinstance(child, Tag) and child.name in {"h2", "h3", "h4", "h5", "h6"}:
                heading_tag = child
                break
    if heading_tag is None:
        return None
    title_node = heading_tag.select_one(".mw-headline")
    title = clean_text(title_node.get_text(" ", strip=True) if title_node else heading_tag.get_text(" ", strip=True))
    if not title:
        return None
    return int(heading_tag.name[1]), title


def normalize_dimension_extract(obj: Dict[str, Any], text: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for dim in DIMENSIONS:
        item = obj.get(dim, {})
        if not isinstance(item, dict):
            item = {}
        snippets = item.get("snippets", [])
        if not isinstance(snippets, list):
            snippets = [snippets]
        cleaned_snippets = []
        for s in snippets:
            t = normalize_text(s)
            if len(t) >= 8:
                cleaned_snippets.append(t[:180])
        cleaned_snippets = unique_keep_order(cleaned_snippets)[:3]
        if not cleaned_snippets:
            cleaned_snippets = pick_snippets_by_keywords(text, DIMENSION_HINTS[dim], max_count=2)
        conf = float(item.get("confidence", 0) or 0)
        if cleaned_snippets and conf == 0.0:
            conf = 0.55
        out[dim] = {"snippets": cleaned_snippets, "confidence": conf}
    return out


def fallback_extract_dimensions(text: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for dim in DIMENSIONS:
        snippets = pick_snippets_by_keywords(text, DIMENSION_HINTS[dim], 3)
        conf = 0.55 if snippets else 0.15
        out[dim] = {"snippets": snippets, "confidence": conf}
    return out
