# Analyzer Optimization Workflow

## Overview

This experiment focuses on continuously improving segmentation accuracy on a fixed dataset of 21 images. The goal is to achieve ≥90% average accuracy by iteratively refining the analyzer.

**Input**: Pre-existing images and ground truth JSON files in `input/`
**Output**: Segmentation results and evaluation metrics in `output/`

## Quick Start

### List Available Images

```bash
python orchestrator.py --list
```

Shows all 21 available images in the `input/` directory.

### Analyze Single Image

```bash
python orchestrator.py <image_id>
```

Runs complete analysis pipeline:
1. Runs segmentation on the image
2. Evaluates accuracy metrics
3. Displays results summary
4. Appends results to `output/RESULT.md`

**Example:**
```bash
python orchestrator.py 1479505644958006299
```

### Batch Analysis (All 21 Images)

```bash
python orchestrator.py --batch-rerun image_001-image_021
```

Or with specific images:
```bash
python orchestrator.py --batch-rerun 1479505644958006299,1479505645458067538,1479505646457912353
```

Outputs:
- Individual results for each image
- Summary table with all metrics
- Batch statistics (average, min, max accuracy)
- Results appended to `output/RESULT.md`

## File Organization

Files are organized with image_id as suffix:
- Input: `input/{image_id}.jpg`, `input/ground_truth_{image_id}.json`
- Output: `output/test_segmentation_{image_id}.json`, `output/evaluation_result_{image_id}.json`

## Iteration Workflow

Each iteration (1-20):

1. **Analyze current state**: Run batch analysis on all 21 images
   ```bash
   python orchestrator.py --batch-rerun <all_image_ids>
   ```

2. **Review results**: Check `output/RESULT.md` for accuracy scores
   - Identify images with low accuracy
   - Analyze failure patterns

3. **Improve analyzer**: Modify `scripts/base_vision_analyzer.py`
   - Adjust prompts for better object detection
   - Improve mask processing and boundary handling
   - Tune model parameters
   - Refine edge detection and spillover reduction

4. **Re-run batch analysis**: Test improvements
   ```bash
   python orchestrator.py --batch-rerun <all_image_ids>
   ```

5. **Record iteration**: Update `output/RESULT.md` with:
   - Iteration number
   - Changes made to analyzer
   - Average accuracy across all 21 images
   - Min/max accuracy
   - Progress toward 90% goal

## Editable Files

### Analyzer: `scripts/base_vision_analyzer.py`
- Modify detection prompts (BASE_PROMPT)
- Modify segmentation prompts (SEGMENTATION_APPEND)
- Adjust mask processing logic
- Tune model parameters:
  - temperature (default: 0)
  - top_k (default: 1)
  - top_p (default: 0.95)
  - max_output_tokens (default: 4000)
  - thinking_budget (default: 0)
- Improve boundary clipping and edge detection
- Goal: Maximize accuracy across all images

## Evaluation Metrics

- **Precision**: Correct detections / total detections
- **Recall**: Correct detections / total ground truth
- **F1 Score**: Harmonic mean of precision and recall
- **Avg IoU**: Average Intersection over Union for matched objects
- **Coverage %**: Percentage of ground truth objects detected
- **Spillover %**: Percentage of false positive detections
- **Accuracy Score**: Weighted score (0-100) = 40% precision + 40% recall + 20% avg IoU

## Coordinate System

- **box_2d**: Normalized coordinates (0-1000 scale) — used by Gemini API
- **abs_box_2d**: Absolute pixel coordinates — used for ground truth

## Key Files

- **Analyzer**: `scripts/base_vision_analyzer.py` — Vision analysis logic (EDITABLE)
- **Segmentation**: `scripts/test_segmentation.py` — Segmentation wrapper
- **Evaluator**: `evaluation/evaluate_script_accuracy.py` — Accuracy evaluation
- **Orchestrator**: `orchestrator.py` — Batch analysis runner
- **Results**: `output/RESULT.md` — Iteration tracking and metrics
