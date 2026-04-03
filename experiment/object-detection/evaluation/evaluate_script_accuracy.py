#!/usr/bin/env python3
"""
Objective evaluation script for segmentation mask accuracy.
Compares API output against ground truth coordinates.
Calculates: IoU, spillover %, coverage %, and overall accuracy score.
Outputs results as JSON with experiment_id for tracking.
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Any
from datetime import datetime


def load_json(path: Path) -> dict:
    """Load JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def calculate_iou(box1: list, box2: list) -> float:
    """
    Calculate Intersection over Union for two boxes.
    Boxes are [ymin, xmin, ymax, xmax] in 0-1000 scale.
    """
    y1_min, x1_min, y1_max, x1_max = box1
    y2_min, x2_min, y2_max, x2_max = box2

    # Calculate intersection
    inter_y_min = max(y1_min, y2_min)
    inter_x_min = max(x1_min, x2_min)
    inter_y_max = min(y1_max, y2_max)
    inter_x_max = min(x1_max, x2_max)

    if inter_y_max <= inter_y_min or inter_x_max <= inter_x_min:
        return 0.0

    inter_area = (inter_y_max - inter_y_min) * (inter_x_max - inter_x_min)

    # Calculate union
    box1_area = (y1_max - y1_min) * (x1_max - x1_min)
    box2_area = (y2_max - y2_min) * (x2_max - x2_min)
    union_area = box1_area + box2_area - inter_area

    if union_area == 0:
        return 0.0

    return inter_area / union_area


def match_detections(
    ground_truth: list, detections: list, image_width: int, image_height: int, iou_threshold: float = 0.5
) -> tuple:
    """
    Match detections to ground truth boxes.
    Returns: (matched_pairs, unmatched_gt, unmatched_detections)
    """
    matched_pairs = []
    used_detections = set()

    for gt_idx, gt_box in enumerate(ground_truth):
        best_iou = 0
        best_det_idx = -1

        for det_idx, detection in enumerate(detections):
            if det_idx in used_detections:
                continue

            # API returns box_2d in normalized 0-1000 scale
            if "box_2d" in detection:
                det_box = detection["box_2d"]
            else:
                continue

            iou = calculate_iou(gt_box, det_box)
            if gt_idx == 0 and det_idx == 0:
                print(f"DEBUG: GT[0]={gt_box}, Det[0]={det_box}, IoU={iou}")
            if iou > best_iou:
                best_iou = iou
                best_det_idx = det_idx

        if best_iou >= iou_threshold:
            matched_pairs.append((gt_idx, best_det_idx, best_iou))
            used_detections.add(best_det_idx)

    unmatched_gt = [i for i in range(len(ground_truth)) if i not in [m[0] for m in matched_pairs]]
    unmatched_detections = [i for i in range(len(detections)) if i not in used_detections]

    return matched_pairs, unmatched_gt, unmatched_detections


def calculate_metrics(ground_truth: list, detections: list, image_width: int, image_height: int) -> dict:
    """Calculate comprehensive accuracy metrics."""
    matched_pairs, unmatched_gt, unmatched_detections = match_detections(ground_truth, detections, image_width, image_height)

    # Precision: correct detections / total detections
    precision = len(matched_pairs) / len(detections) if detections else 0.0

    # Recall: correct detections / total ground truth
    recall = len(matched_pairs) / len(ground_truth) if ground_truth else 0.0

    # F1 score
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # Average IoU for matched pairs
    avg_iou = sum(m[2] for m in matched_pairs) / len(matched_pairs) if matched_pairs else 0.0

    # Spillover: false positives (unmatched detections)
    spillover_count = len(unmatched_detections)
    spillover_pct = (spillover_count / len(detections) * 100) if detections else 0.0

    # Coverage: true positives (matched ground truth)
    coverage_count = len(matched_pairs)
    coverage_pct = (coverage_count / len(ground_truth) * 100) if ground_truth else 0.0

    # Overall accuracy score (0-100)
    # Weighted: 40% precision, 40% recall, 20% avg_iou
    accuracy_score = (precision * 40 + recall * 40 + avg_iou * 20)

    return {
        "matched_count": len(matched_pairs),
        "unmatched_gt_count": len(unmatched_gt),
        "unmatched_detections_count": spillover_count,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3),
        "avg_iou": round(avg_iou, 3),
        "coverage_pct": round(coverage_pct, 1),
        "spillover_pct": round(spillover_pct, 1),
        "accuracy_score": round(accuracy_score, 1),
    }


def evaluate(ground_truth_path: Path, api_output_path: Path, output_json_path: Path = None) -> dict:
    """Evaluate API output against ground truth."""
    print(f"Loading ground truth from {ground_truth_path}")
    gt_data = load_json(ground_truth_path)
    ground_truth = [obj["box_2d"] for obj in gt_data.get("ground_truth_objects", [])]
    image_width = gt_data.get("image_metadata", {}).get("width", 1036)
    image_height = gt_data.get("image_metadata", {}).get("height", 558)

    print(f"Loading API output from {api_output_path}")
    api_data = load_json(api_output_path)
    detections = api_data.get("detections", [])
    api_response_id = api_data.get("metadata", {}).get("responseId", "unknown")

    print(f"\nGround truth objects: {len(ground_truth)}")
    print(f"API detections: {len(detections)}")

    metrics = calculate_metrics(ground_truth, detections, image_width, image_height)

    # Generate experiment_id if not already in API output
    experiment_id = api_data.get("metadata", {}).get("experiment_id")
    if not experiment_id:
        experiment_id = str(uuid.uuid4())

    # Create evaluation result with experiment_id
    evaluation_result = {
        "experiment_id": experiment_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ground_truth_path": str(ground_truth_path),
        "api_output_path": str(api_output_path),
        "api_response_id": api_response_id,
        "ground_truth_count": len(ground_truth),
        "api_detections_count": len(detections),
        "metrics": metrics
    }

    print("\n=== Evaluation Results ===")
    print(f"Matched: {metrics['matched_count']}/{len(ground_truth)}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall: {metrics['recall']}")
    print(f"F1 Score: {metrics['f1_score']}")
    print(f"Avg IoU: {metrics['avg_iou']}")
    print(f"Coverage: {metrics['coverage_pct']}%")
    print(f"Spillover: {metrics['spillover_pct']}%")
    print(f"\nAccuracy Score: {metrics['accuracy_score']}/100")
    print(f"Experiment ID: {experiment_id}")

    # Save evaluation result as JSON if output path provided
    if output_json_path:
        output_json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_json_path, "w") as f:
            json.dump(evaluation_result, f, indent=2)
        print(f"\nEvaluation result saved: {output_json_path}")

    return evaluation_result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python evaluate_script_accuracy.py <experiment_id> [output_evaluation_filename]")
        print("Example: python evaluate_script_accuracy.py v1")
        print("Example: python evaluate_script_accuracy.py v1 evaluation_result")
        sys.exit(1)

    experiment_id = sys.argv[1]
    output_filename = sys.argv[2] if len(sys.argv) > 2 else "evaluation_result"

    gt_path = Path(__file__).parent.parent / "input" / f"ground_truth_{experiment_id}.json"
    api_path = Path(__file__).parent.parent / "output" / f"test_segmentation_{experiment_id}.json"
    output_path = Path(__file__).parent.parent / "output" / f"{output_filename}_{experiment_id}.json"

    if not gt_path.exists():
        print(f"Error: Ground truth file not found: {gt_path}")
        sys.exit(1)

    if not api_path.exists():
        print(f"Error: API output file not found: {api_path}")
        sys.exit(1)

    evaluate(gt_path, api_path, output_path)
