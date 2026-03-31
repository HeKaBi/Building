#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recovered snippets from Codex logs.
Source session: 2026-03-13 rollout, call ids: call_pOnHY..., call_ii0..., call_lvl7..., call_x8u...
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Sequence, Set

from openai import OpenAI


def fallback_name_from_parts(top_features: List[str], raw_terms: List[str], building_type: str) -> str:
    labels = [x for x in top_features[:2] if x]
    if labels:
        return "-".join(labels)
    terms = [x for x in raw_terms[:2] if x]
    if terms:
        return "-".join(terms) + "系"
    return f"{building_type}结构类"


def default_keywords_for_row(row: Dict[str, Any]) -> List[str]:
    raw_terms: List[str] = []
    raw_terms.extend(row.get("raw_structure_terms", []))
    raw_terms.extend(row.get("raw_layout_terms", []))
    raw_terms.extend(row.get("raw_material_terms", []))
    seen = set()
    out = []
    for item in raw_terms:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out[:5]


def naming_constraints() -> List[str]:
    return [
        "cluster_name uses 4 to 12 Chinese characters",
        "do not include dynasty, region, or internal ids in cluster_name",
        "cluster_summary uses 30 to 60 Chinese characters",
        "cluster_keywords returns 3 to 5 short phrases",
        "output JSON object only",
    ]


def normalize_name_result(result: Dict[str, Any], fallback_name: str) -> Dict[str, Any]:
    cluster_name = str(result.get("cluster_name") or "").strip() or fallback_name
    cluster_summary = str(result.get("cluster_summary") or "").strip()
    raw_keywords = result.get("cluster_keywords", [])
    if not isinstance(raw_keywords, list):
        raw_keywords = [raw_keywords]
    seen = set()
    cluster_keywords = []
    for x in raw_keywords:
        t = str(x or "").strip()
        if t and t not in seen:
            seen.add(t)
            cluster_keywords.append(t)
    return {
        "cluster_name": cluster_name[:20],
        "cluster_summary": cluster_summary[:120],
        "cluster_keywords": cluster_keywords[:5],
    }


def fallback_cluster_name(cluster_info: Dict[str, Any]) -> str:
    top_features = [item.get("value", "") for item in cluster_info.get("top_feature_labels", [])]
    top_terms = [item.get("value", "") for item in cluster_info.get("top_raw_terms", [])]
    return fallback_name_from_parts(top_features, top_terms, str(cluster_info.get("building_type") or "").strip())


def fallback_single_name(row: Dict[str, Any]) -> str:
    raw_terms: List[str] = []
    raw_terms.extend(row.get("raw_structure_terms", []))
    raw_terms.extend(row.get("raw_layout_terms", []))
    raw_terms.extend(row.get("raw_material_terms", []))
    return fallback_name_from_parts(row.get("feature_labels", []), raw_terms, str(row.get("building_type") or "").strip())


def medoid_index(indices: Sequence[int], item_features: Sequence[Set[str]]) -> int:
    best_idx = indices[0]
    best_score = 10.0
    for idx in indices:
        total = 0.0
        for other in indices:
            if idx == other:
                continue
            total += jaccard_distance(item_features[idx], item_features[other])
        if total < best_score:
            best_score = total
            best_idx = idx
    return best_idx


def single_row_profile(row: Dict[str, Any], group_key: str) -> Dict[str, Any]:
    raw_terms: List[str] = []
    raw_terms.extend(row.get("raw_structure_terms", []))
    raw_terms.extend(row.get("raw_layout_terms", []))
    raw_terms.extend(row.get("raw_material_terms", []))
    seen = set()
    uniq_terms = []
    for item in raw_terms:
        if item and item not in seen:
            seen.add(item)
            uniq_terms.append(item)
    return {
        "group_key": group_key,
        "cluster_id": None,
        "building_type": row.get("building_type"),
        "dynasty_bucket": row.get("dynasty_bucket"),
        "size": 1,
        "fallback_name": "",
        "cluster_name": "",
        "cluster_summary": "",
        "cluster_keywords": [],
        "top_feature_labels": [{"value": item, "count": 1} for item in row.get("feature_labels", [])[:6]],
        "top_raw_terms": [{"value": item, "count": 1} for item in uniq_terms[:6]],
        "top_evidence": [{"value": item, "count": 1} for item in row.get("evidence_sentences", [])[:5]],
        "sample_buildings": [{"line_no": row.get("line_no"), "name": row.get("name")}],
        "medoid_line_no": row.get("line_no"),
        "medoid_name": row.get("name"),
        "article_context": row.get("article_context", ""),
        "source_scope": "single_building",
    }


def build_cluster_naming_payload(cluster_info: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "task": "Name a Chinese ancient-building structure category and summarize its structural profile.",
        "group_context": {
            "building_type": cluster_info.get("building_type"),
            "dynasty_bucket": cluster_info.get("dynasty_bucket"),
            "cluster_size": cluster_info.get("size"),
            "source_scope": cluster_info.get("source_scope", "cluster"),
        },
        "cluster_profile": {
            "top_feature_labels": cluster_info.get("top_feature_labels", []),
            "top_raw_terms": cluster_info.get("top_raw_terms", []),
            "sample_buildings": cluster_info.get("sample_buildings", []),
            "top_evidence": cluster_info.get("top_evidence", []),
            "article_context": cluster_info.get("article_context", ""),
        },
        "output_schema": {
            "cluster_name": "string",
            "cluster_summary": "string",
            "cluster_keywords": ["string"],
        },
        "constraints": naming_constraints(),
    }


def name_cluster_with_llm(client: OpenAI, model: str, logger: logging.Logger, cluster_info: Dict[str, Any], max_retries: int) -> Dict[str, Any]:
    payload = build_cluster_naming_payload(cluster_info)
    result = base.llm_json_call(
        client=client,
        model=model,
        system_prompt="You name Chinese ancient-building structure categories. Output JSON only.",
        payload=payload,
        logger=logger,
        call_name=f"stage6_cluster_name:{cluster_info.get('group_key')}:{cluster_info.get('cluster_id')}",
        max_retries=max_retries,
    )
    return normalize_name_result(result, cluster_info.get("fallback_name", "结构类型"))


def name_single_building_with_llm(client: OpenAI, model: str, logger: logging.Logger, row: Dict[str, Any], group_key: str, max_retries: int) -> Dict[str, Any]:
    profile = single_row_profile(row, group_key)
    profile["fallback_name"] = fallback_single_name(row)
    payload = build_cluster_naming_payload(profile)
    payload["task"] = "Name one Chinese ancient building with the same style used for structure clusters."
    result = base.llm_json_call(
        client=client,
        model=model,
        system_prompt="You name Chinese ancient-building structure categories. Output JSON only.",
        payload=payload,
        logger=logger,
        call_name=f"stage6_single_name:{group_key}:{row.get('line_no')}",
        max_retries=max_retries,
    )
    named = normalize_name_result(result, profile["fallback_name"])
    if not named["cluster_keywords"]:
        named["cluster_keywords"] = default_keywords_for_row(row)
    return named
