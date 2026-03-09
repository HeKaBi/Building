from __future__ import annotations

import argparse
import json
import math
import random
from collections import defaultdict
from pathlib import Path


DEFAULT_SOURCE = Path(__file__).resolve().parents[1] / 'building.json'
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / 'building-jittered.json'
DEFAULT_SEED = 20260309
GRID_PRECISION = 2
CLUSTER_RADIUS_KM = 12
RING_SIZE = 6
BASE_RADIUS_METERS = 18000
RING_GAP_METERS = 9000
ANGLE_JITTER_DEGREES = 15
RADIUS_JITTER_METERS = 1200
CITY_SPREAD_TRIGGER_KM = 6
CITY_BASE_RADIUS_METERS = 26000
CITY_RING_GAP_METERS = 12000
MUNICIPALITIES = {
    '\u5317\u4eac\u5e02',
    '\u5929\u6d25\u5e02',
    '\u4e0a\u6d77\u5e02',
    '\u91cd\u5e86\u5e02',
}


def meters_to_degree_offsets(dx_meters: float, dy_meters: float, latitude: float) -> tuple[float, float]:
    lat_radians = math.radians(latitude)
    lat_scale = 111320
    lon_scale = max(111320 * math.cos(lat_radians), 1000)
    return dx_meters / lon_scale, dy_meters / lat_scale


def distance_km(left: tuple[float, float], right: tuple[float, float]) -> float:
    left_longitude, left_latitude = left
    right_longitude, right_latitude = right
    delta_latitude = math.radians(right_latitude - left_latitude)
    delta_longitude = math.radians(right_longitude - left_longitude)
    latitude_one = math.radians(left_latitude)
    latitude_two = math.radians(right_latitude)
    value = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(latitude_one) * math.cos(latitude_two) * math.sin(delta_longitude / 2) ** 2
    )
    return 6371 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def build_group_key(record: dict) -> tuple[str, str, float, float]:
    longitude, latitude = record['coordinates']
    return (
        record['province'],
        record['city'],
        round(longitude, GRID_PRECISION),
        round(latitude, GRID_PRECISION),
    )


def build_exact_coordinate_key(record: dict) -> tuple[float, float]:
    longitude, latitude = record['coordinates']
    return round(longitude, 6), round(latitude, 6)


def build_city_key(record: dict) -> tuple[str, str]:
    if record['province'] in MUNICIPALITIES:
        return record['province'], record['province']
    return record['province'], record['city']


def cluster_nearby_records(
    records: list[dict],
    original_coordinates: dict[str, tuple[float, float]],
) -> list[list[dict]]:
    visited_indexes: set[int] = set()
    clusters: list[list[dict]] = []

    for index, record in enumerate(records):
        if index in visited_indexes:
            continue

        queue = [index]
        visited_indexes.add(index)
        cluster_indexes: list[int] = []

        while queue:
            current_index = queue.pop()
            cluster_indexes.append(current_index)
            current_record = records[current_index]
            current_coordinate = original_coordinates[current_record['id']]

            for candidate_index, candidate_record in enumerate(records):
                if candidate_index in visited_indexes:
                    continue

                candidate_coordinate = original_coordinates[candidate_record['id']]
                if distance_km(current_coordinate, candidate_coordinate) <= CLUSTER_RADIUS_KM:
                    visited_indexes.add(candidate_index)
                    queue.append(candidate_index)

        if len(cluster_indexes) > 1:
            clusters.append([records[cluster_index] for cluster_index in cluster_indexes])

    return clusters


def minimum_pair_distance_km(records: list[dict]) -> float:
    if len(records) < 2:
        return float('inf')

    best_distance = float('inf')

    for index, record in enumerate(records):
        for candidate in records[index + 1:]:
            best_distance = min(
                best_distance,
                distance_km(tuple(record['coordinates']), tuple(candidate['coordinates'])),
            )

    return best_distance


def jitter_group(
    records: list[dict],
    rng: random.Random,
    *,
    base_radius_meters: float = BASE_RADIUS_METERS,
    ring_gap_meters: float = RING_GAP_METERS,
) -> set[str]:
    if len(records) < 2:
        return set()

    center_longitude = sum(record['coordinates'][0] for record in records) / len(records)
    center_latitude = sum(record['coordinates'][1] for record in records) / len(records)

    sorted_records = sorted(records, key=lambda item: (item['year'], item['id']))
    jittered_ids: set[str] = set()

    for index, record in enumerate(sorted_records):
        ring = index // RING_SIZE
        ring_start = ring * RING_SIZE
        items_on_ring = min(RING_SIZE, len(sorted_records) - ring_start)
        index_in_ring = index - ring_start
        angle = (
            -math.pi / 2
            + (2 * math.pi * index_in_ring) / items_on_ring
            + math.radians(rng.uniform(-ANGLE_JITTER_DEGREES, ANGLE_JITTER_DEGREES))
        )
        radius = base_radius_meters + ring * ring_gap_meters + rng.uniform(
            -RADIUS_JITTER_METERS,
            RADIUS_JITTER_METERS,
        )
        dx = math.cos(angle) * radius
        dy = math.sin(angle) * radius
        offset_longitude, offset_latitude = meters_to_degree_offsets(dx, dy, center_latitude)
        record['coordinates'] = [
            round(center_longitude + offset_longitude, 6),
            round(center_latitude + offset_latitude, 6),
        ]
        jittered_ids.add(record['id'])

    return jittered_ids


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate a lightly jittered building dataset for map display.')
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--seed', type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    data = json.loads(args.source.read_text(encoding='utf-8'))
    grouped_records: dict[tuple[str, str, float, float], list[dict]] = defaultdict(list)
    province_records: dict[str, list[dict]] = defaultdict(list)
    city_records: dict[tuple[str, str], list[dict]] = defaultdict(list)
    original_coordinates = {
        record['id']: tuple(record['coordinates'])
        for record in data
    }

    for record in data:
        grouped_records[build_group_key(record)].append(record)
        province_records[record['province']].append(record)
        city_records[build_city_key(record)].append(record)

    rng = random.Random(args.seed)
    jittered_ids: set[str] = set()

    for records in province_records.values():
        for cluster in cluster_nearby_records(records, original_coordinates):
            jittered_ids.update(jitter_group(cluster, rng))

    for records in grouped_records.values():
        jittered_ids.update(jitter_group(records, rng))

    exact_coordinate_groups: dict[tuple[float, float], list[dict]] = defaultdict(list)
    for record in data:
        exact_coordinate_groups[build_exact_coordinate_key(record)].append(record)

    for records in exact_coordinate_groups.values():
        jittered_ids.update(jitter_group(records, rng))

    for records in city_records.values():
        if len(records) < 2:
            continue
        if minimum_pair_distance_km(records) < CITY_SPREAD_TRIGGER_KM:
            jittered_ids.update(
                jitter_group(
                    records,
                    rng,
                    base_radius_meters=CITY_BASE_RADIUS_METERS,
                    ring_gap_meters=CITY_RING_GAP_METERS,
                ),
            )

    args.output.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )

    print(f'wrote {args.output} with {len(jittered_ids)} jittered records')


if __name__ == '__main__':
    main()
