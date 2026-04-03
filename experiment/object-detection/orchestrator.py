#!/usr/bin/env python3
"""
Orchestrator for segmentation mask accuracy experiments.
Runs the complete workflow: generate input → run segmentation → evaluate results.
"""

import subprocess
import sys
import json
from pathlib import Path
from datetime import datetime

def run_command(cmd, description):
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Step: {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    if result.returncode != 0:
        print(f"\n❌ Failed: {description}")
        return False
    print(f"✓ Completed: {description}")
    return True

def load_evaluation_results(experiment_id):
    """Load evaluation results from JSON."""
    eval_path = Path(__file__).parent / "output" / f"evaluation_result_{experiment_id}.json"
    if eval_path.exists():
        with open(eval_path, "r") as f:
            return json.load(f)
    return None

def print_results_summary(experiment_id, results):
    """Print a formatted summary of evaluation results."""
    if not results:
        print("⚠ No evaluation results found")
        return

    metrics = results.get("metrics", {})
    print(f"\n{'='*60}")
    print(f"EVALUATION RESULTS - {experiment_id}")
    print(f"{'='*60}")
    print(f"Accuracy Score:  {metrics.get('accuracy_score', 'N/A')}/100")
    print(f"Precision:       {metrics.get('precision', 'N/A')}")
    print(f"Recall:          {metrics.get('recall', 'N/A')}")
    print(f"F1 Score:        {metrics.get('f1_score', 'N/A')}")
    print(f"Avg IoU:         {metrics.get('avg_iou', 'N/A')}")
    print(f"Coverage:        {metrics.get('coverage_pct', 'N/A')}%")
    print(f"Spillover:       {metrics.get('spillover_pct', 'N/A')}%")
    print(f"Matched:         {metrics.get('matched_count', 'N/A')}/{results.get('ground_truth_count', 'N/A')}")
    print(f"{'='*60}\n")

def append_to_result_md(experiment_id, results):
    """Append results to output/RESULT.md."""
    result_path = Path(__file__).parent / "output" / "RESULT.md"

    if not results:
        return

    metrics = results.get("metrics", {})
    timestamp = results.get("timestamp", datetime.utcnow().isoformat() + "Z")

    entry = f"""
## Iteration ({experiment_id}): Experiment Run

**Date**: {timestamp}

**Results**:
- Accuracy Score: {metrics.get('accuracy_score', 'N/A')}/100
- Matched: {metrics.get('matched_count', 'N/A')}/{results.get('ground_truth_count', 'N/A')} objects
- Precision: {metrics.get('precision', 'N/A')}
- Recall: {metrics.get('recall', 'N/A')}
- F1 Score: {metrics.get('f1_score', 'N/A')}
- Avg IoU: {metrics.get('avg_iou', 'N/A')}
- Coverage: {metrics.get('coverage_pct', 'N/A')}%
- Spillover: {metrics.get('spillover_pct', 'N/A')}%

**Output Files**:
- Ground Truth: `input/ground_truth_{experiment_id}.json`
- Test Image: `input/test_image_{experiment_id}.png`
- Segmentation: `output/test_segmentation_{experiment_id}.json`
- Evaluation: `output/evaluation_result_{experiment_id}.json`
"""

    with open(result_path, "a") as f:
        f.write(entry)

def parse_experiment_ids(spec):
    """Parse experiment ID specification (e.g., 'v1,v2,v3' or 'v1-v20')."""
    if '-' in spec:
        parts = spec.split('-')
        if len(parts) == 2:
            start_str, end_str = parts
            # Extract number from v1, v2, etc.
            start_num = int(''.join(filter(str.isdigit, start_str)))
            end_num = int(''.join(filter(str.isdigit, end_str)))
            prefix = ''.join(filter(str.isalpha, start_str))
            return [f"{prefix}{i}" for i in range(start_num, end_num + 1)]
    return spec.split(',')

def append_batch_rerun_results(results_summary):
    """Append batch rerun results to RESULT.md with comparison."""
    result_path = Path(__file__).parent / "output" / "RESULT.md"

    if not results_summary:
        return

    timestamp = datetime.utcnow().isoformat() + "Z"

    entry = f"""
---

## Batch Rerun Results (Latest Analyzer)

**Date**: {timestamp}

**Summary**: Re-evaluated all {len(results_summary)} experiments with current analyzer

| Exp ID | Accuracy | Precision | Recall | F1 Score | Avg IoU |
|--------|----------|-----------|--------|----------|---------|
"""

    for r in results_summary:
        entry += f"| {r['exp_id']} | {r['accuracy']:.1f}/100 | {r['precision']:.3f} | {r['recall']:.3f} | {r['f1']:.3f} | {r['avg_iou']:.3f} |\n"

    # Summary stats
    accuracies = [r['accuracy'] for r in results_summary]
    avg_acc = sum(accuracies) / len(accuracies)
    min_acc = min(accuracies)
    max_acc = max(accuracies)
    wins = sum(1 for a in accuracies if a >= 90)
    losses = sum(1 for a in accuracies if a < 95)

    entry += f"""
**Statistics**:
- Average Accuracy: {avg_acc:.1f}/100
- Min Accuracy: {min_acc:.1f}/100
- Max Accuracy: {max_acc:.1f}/100
- Analyzer Wins (≥90%): {wins}/{len(results_summary)}
- Generator Wins (<95%): {losses}/{len(results_summary)}
"""

    with open(result_path, "a") as f:
        f.write(entry)

def run_batch_rerun(experiment_ids):
    """Run segmentation and evaluation on existing images (skip generation)."""
    print(f"\n{'='*60}")
    print(f"BATCH RERUN MODE: Testing {len(experiment_ids)} experiments")
    print(f"{'='*60}\n")

    results_summary = []

    for exp_id in experiment_ids:
        exp_id = exp_id.strip()
        print(f"\n{'='*60}")
        print(f"Rerunning: {exp_id}")
        print(f"{'='*60}")

        # Check if ground truth exists
        gt_path = Path(__file__).parent / "input" / f"ground_truth_{exp_id}.json"
        if not gt_path.exists():
            print(f"⚠ Skipping {exp_id}: ground truth not found")
            continue

        # Step 1: Run segmentation (skip generation)
        segment_cmd = ["python", "scripts/test_segmentation.py", exp_id]
        if not run_command(segment_cmd, "Run segmentation analysis"):
            print(f"❌ Failed: {exp_id}")
            continue

        # Step 2: Evaluate results
        eval_cmd = ["python", "evaluation/evaluate_script_accuracy.py", exp_id]
        if not run_command(eval_cmd, "Evaluate accuracy metrics"):
            print(f"❌ Failed: {exp_id}")
            continue

        # Step 3: Load and display results
        results = load_evaluation_results(exp_id)
        print_results_summary(exp_id, results)

        if results:
            metrics = results.get("metrics", {})
            accuracy = metrics.get('accuracy_score', 0)
            results_summary.append({
                'exp_id': exp_id,
                'accuracy': accuracy,
                'precision': metrics.get('precision', 0),
                'recall': metrics.get('recall', 0),
                'f1': metrics.get('f1_score', 0),
                'avg_iou': metrics.get('avg_iou', 0)
            })

    # Print summary table
    print(f"\n{'='*60}")
    print("BATCH RERUN SUMMARY")
    print(f"{'='*60}")
    print(f"{'Exp ID':<10} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1':<10} {'Avg IoU':<10}")
    print("-" * 70)
    for r in results_summary:
        print(f"{r['exp_id']:<10} {r['accuracy']:<12.1f} {r['precision']:<12.3f} {r['recall']:<12.3f} {r['f1']:<10.3f} {r['avg_iou']:<10.3f}")

    # Summary stats
    if results_summary:
        accuracies = [r['accuracy'] for r in results_summary]
        print("-" * 70)
        print(f"{'Average':<10} {sum(accuracies)/len(accuracies):<12.1f}")
        print(f"{'Min':<10} {min(accuracies):<12.1f}")
        print(f"{'Max':<10} {max(accuracies):<12.1f}")

        # Count wins/losses
        wins = sum(1 for a in accuracies if a >= 90)
        losses = sum(1 for a in accuracies if a < 95)
        print(f"\nAnalyzer wins (≥90%): {wins}/{len(results_summary)}")
        print(f"Generator wins (<95%): {losses}/{len(results_summary)}")

        # Append to RESULT.md
        append_batch_rerun_results(results_summary)
        print(f"\n✓ Batch rerun results appended to: output/RESULT.md")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id or --batch-rerun is required")
        print("Usage: python orchestrator.py <experiment_id> [--hard] [--randomize] [--num-objects N]")
        print("       python orchestrator.py --batch-rerun <exp_ids>")
        print("Example: python orchestrator.py v1")
        print("Example: python orchestrator.py v2_hard --hard --num-objects 8")
        print("Example: python orchestrator.py --batch-rerun v1,v2,v3")
        print("Example: python orchestrator.py --batch-rerun v1-v20")
        sys.exit(1)

    if sys.argv[1] == "--batch-rerun":
        if len(sys.argv) < 3:
            print("Error: experiment IDs required for batch rerun")
            print("Usage: python orchestrator.py --batch-rerun v1,v2,v3")
            print("       python orchestrator.py --batch-rerun v1-v20")
            sys.exit(1)
        experiment_ids = parse_experiment_ids(sys.argv[2])
        run_batch_rerun(experiment_ids)
    else:
        experiment_id = sys.argv[1]
        extra_args = sys.argv[2:]

        print(f"\n{'='*60}")
        print(f"ORCHESTRATOR: Segmentation Accuracy Experiment")
        print(f"Experiment ID: {experiment_id}")
        print(f"{'='*60}")

        # Step 1: Generate input
        generate_cmd = ["python", "scripts/generate_input.py", experiment_id] + extra_args
        if not run_command(generate_cmd, "Generate test image and ground truth"):
            sys.exit(1)

        # Step 2: Run segmentation
        segment_cmd = ["python", "scripts/test_segmentation.py", experiment_id]
        if not run_command(segment_cmd, "Run segmentation analysis"):
            sys.exit(1)

        # Step 3: Evaluate results
        eval_cmd = ["python", "evaluation/evaluate_script_accuracy.py", experiment_id]
        if not run_command(eval_cmd, "Evaluate accuracy metrics"):
            sys.exit(1)

        # Step 4: Display and log results
        results = load_evaluation_results(experiment_id)
        print_results_summary(experiment_id, results)
        append_to_result_md(experiment_id, results)

        print(f"✓ Experiment {experiment_id} completed successfully")
        print(f"Results appended to: output/RESULT.md")
