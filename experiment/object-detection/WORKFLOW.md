# Competitive Segmentation Game - Workflow Guide

## Overview

**Competitive game**: Generator vs Analyzer over 20 iterations.
- **Generator** (edits `scripts/generate_input.py`) tries to lower accuracy below 95%
- **Analyzer** (edits `scripts/base_vision_analyzer.py`) tries to keep accuracy ≥ 90%

All experiments require a user-defined **experiment_id** (e.g., `v1`, `v2`, `v3`, etc.).

## File Organization

Files are organized with experiment_id as suffix:
- Input: `input/test_image_{experiment_id}.png`, `input/ground_truth_{experiment_id}.json`
- Output: `output/test_segmentation_{experiment_id}.json`, `output/evaluation_result_{experiment_id}.json`

## Iteration Workflow

### Quick Run (Using Orchestrator)

```bash
python orchestrator.py v{N}
```

This runs all steps automatically:
1. Generates test case
2. Runs segmentation
3. Evaluates results
4. Displays results summary

**Options:**
- `--hard`: Enable hard mode (overlapping shapes)
- `--randomize`: Random object positions
- `--num-objects N`: Number of objects (default: 5)

**Example:**
```bash
python orchestrator.py v1 --hard --num-objects 8
```

---

### Manual Steps (If Needed)

#### Step 1: Generator Creates Test Case

Edit `scripts/generate_input.py` to make objects harder to detect:
- Overlapping shapes
- Small objects
- Low contrast
- Irregular patterns
- Varied opacity
- Dense clustering

```bash
python scripts/generate_input.py v{N}
```

**Options:**
- `--hard`: Enable hard mode (overlapping shapes)
- `--randomize`: Random object positions
- `--num-objects N`: Number of objects (default: 5)

**Output:**
- `input/test_image_v{N}.png` — Test image
- `input/ground_truth_v{N}.json` — Ground truth coordinates

#### Step 2: Analyzer Processes Test Case

Edit `scripts/base_vision_analyzer.py` to improve accuracy:
- Optimize mask processing
- Adjust model parameters
- Refine prompts
- Improve boundary clipping
- Enhance edge detection

```bash
python scripts/test_segmentation.py v{N}
```

**Output:**
- `output/test_segmentation_v{N}.json` — Segmentation results
- `output/test_segmentation_v{N}.png` — Annotated image

#### Step 3: Evaluate Results

```bash
python evaluation/evaluate_script_accuracy.py v{N}
```

**Output:**
- `output/evaluation_result_v{N}.json` — Evaluation metrics

#### Step 4: Record Result

Update `output/RESULT.md` with:
- Iteration number
- Generator's change
- Analyzer's change
- Accuracy score
- Winner (Generator if < 95%, Analyzer if ≥ 90%, Tie if 90-95%)

## Complete Iteration Example

**Using Orchestrator (Recommended):**
```bash
# Iteration 1
python orchestrator.py v1
# Record result in RESULT.md

# Iteration 2 (both sides modify their files)
python orchestrator.py v2
# Record result in RESULT.md

# ... repeat for 20 iterations
```

**Manual Steps:**
```bash
# Iteration 1
python scripts/generate_input.py v1
python scripts/test_segmentation.py v1
python evaluation/evaluate_script_accuracy.py v1
# Record result in RESULT.md

# Iteration 2 (both sides modify their files)
python scripts/generate_input.py v2
python scripts/test_segmentation.py v2
python evaluation/evaluate_script_accuracy.py v2
# Record result in RESULT.md

# ... repeat for 20 iterations
```

## Coordinate System

- **box_2d**: Normalized coordinates (0-1000 scale) — used by Gemini API
- **abs_box_2d**: Absolute pixel coordinates — used for ground truth

## Key Files

- **Generator**: `scripts/generate_input.py` — Creates test images (EDITABLE)
- **Analyzer**: `scripts/base_vision_analyzer.py` — Vision analysis logic (EDITABLE)
- **Segmentation**: `scripts/test_segmentation.py` — Segmentation wrapper
- **Evaluator**: `evaluation/evaluate_script_accuracy.py` — Accuracy evaluation
- **Results**: `output/RESULT.md` — Game progress and scoreboard

## Editable Files

### Generator: `scripts/generate_input.py`
- Modify `generate_ground_truth()` function
- Adjust hard mode parameters
- Change object generation strategy
- Goal: Lower accuracy below 95%

### Analyzer: `scripts/base_vision_analyzer.py`
- Modify mask processing logic
- Adjust model parameters (temperature, top_k, top_p, max_output_tokens)
- Refine segmentation prompts
- Improve boundary clipping and edge detection
- Goal: Keep accuracy ≥ 90%

## Evaluation Metrics

- **Precision**: Correct detections / total detections
- **Recall**: Correct detections / total ground truth
- **F1 Score**: Harmonic mean of precision and recall
- **Avg IoU**: Average Intersection over Union for matched objects
- **Coverage %**: Percentage of ground truth objects detected
- **Spillover %**: Percentage of false positive detections
- **Accuracy Score**: Weighted score (0-100) = 40% precision + 40% recall + 20% avg IoU

## Winning Conditions

- **Generator wins**: Accuracy < 95%
- **Analyzer wins**: Accuracy ≥ 90%
- **Tie**: 90% ≤ Accuracy < 95%

## Game Scoreboard

Track cumulative wins across 20 iterations in `output/RESULT.md`:
- Generator wins: Count of iterations where accuracy < 95%
- Analyzer wins: Count of iterations where accuracy ≥ 90%
- Ties: Count of iterations where 90% ≤ accuracy < 95%
