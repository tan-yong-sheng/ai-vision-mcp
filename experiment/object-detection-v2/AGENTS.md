# Analyzer Optimization - 20 Iterations

## Objective
**Analyzer-only optimization**: Continuously improve segmentation accuracy on a fixed dataset.
- **Goal**: Achieve accuracy ≥ 90% across all 21 images
- **Focus**: Improve `scripts/base_vision_analyzer.py` to maximize detection and segmentation quality

## Dataset

**Fixed dataset**: 21 images with ground truth annotations
- Images: `input/{image_id}.jpg`
- Ground truth: `input/ground_truth_{image_id}.json`
- Total objects: 177 across all images

Files are organized with image_id as suffix:
- Output: `output/test_segmentation_{image_id}.json`, `output/evaluation_result_{image_id}.json`

## Iteration Workflow

Each iteration (1-20):

1. **Analyzer's turn**: Modify `scripts/base_vision_analyzer.py` to improve accuracy
   - Adjust prompts for better object detection
   - Improve mask processing and boundary handling
   - Tune model parameters (temperature, top_k, top_p, max_output_tokens)
   - Refine edge detection and spillover reduction

2. **Run batch analysis**:
   ```bash
   python orchestrator.py --batch-rerun image_001-image_021
   ```

3. **Record results** in `output/RESULT.md` with:
   - Iteration number
   - Changes made to analyzer
   - Accuracy scores for all images
   - Average, min, max accuracy
   - Progress toward 90% goal

## Key Files
- **Analyzer**: `scripts/base_vision_analyzer.py` — Vision analysis logic (EDITABLE)
- **Segmentation**: `scripts/test_segmentation.py` — Segmentation wrapper
- **Evaluator**: `evaluation/evaluate_script_accuracy.py` — Accuracy evaluation
- **Results**: `output/RESULT.md` — Progress tracking and metrics

## Coordinate System
- `box_2d`: normalized coordinates (0-1000 scale) — used by API
- `abs_box_2d`: absolute pixel coordinates — used for ground truth

## Constraints
- **Can edit**: `scripts/base_vision_analyzer.py` ONLY
- **Cannot change**: Model name (gemini-robotics-er-1.5)
- **Can adjust**: Model parameters (temperature, top_k, top_p, max_output_tokens, thinking_budget)

## Model Configuration
- Temperature: 0 (deterministic results)
- Model: gemini-robotics-er-1.5
- Thinking budget: 0 (disabled for better segmentation results)
- Max output tokens: 4000
- Top K: 1
- Top P: 0.95
- Seed: 42

## Success Criteria
- Average accuracy ≥ 90% across all 21 images
- Minimize spillover (false positives)
- Maximize coverage (recall)
- Maintain precision

## See Also
- `WORKFLOW.md` — Detailed workflow guide with all commands and options

