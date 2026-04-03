# Competitive Segmentation Game - 20 Iterations

## Objective
**Competitive game**: Generator vs Analyzer over 20 iterations.
- **Generator wins** if accuracy < 95%
- **Analyzer wins** if accuracy ≥ 90%

## Experiment ID System

**All experiments require a user-defined experiment_id** (e.g., `v1`, `v2`, `v3`, etc.).

Files are organized with experiment_id as suffix:
- Input: `input/test_image_{experiment_id}.png`, `input/ground_truth_{experiment_id}.json`
- Output: `output/test_segmentation_{experiment_id}.json`, `output/evaluation_result_{experiment_id}.json`

**Code will fail if experiment_id is not provided.**

## Game Rules

### Generator (Adversary)
- **Goal**: Create test cases that lower accuracy below 95%
- **Editable file**: `scripts/generate_input.py`
- **Strategy**: Make objects harder to detect (overlapping, small, low contrast, irregular shapes, etc.)
- **Wins**: When accuracy < 95%

### Analyzer (Defender)
- **Goal**: Maintain accuracy ≥ 90% despite harder test cases
- **Editable file**: `scripts/base_vision_analyzer.py` (via test_segmentation.py)
- **Strategy**: Improve mask processing, prompts, and model parameters
- **Wins**: When accuracy ≥ 90%

### Scoring
- **Generator wins**: +1 point per iteration where accuracy < 95%
- **Analyzer wins**: +1 point per iteration where accuracy ≥ 90%
- **Tie**: If 90% ≤ accuracy < 95%, both get +1 point

## Quick Start Workflow

**Option 1: Using Orchestrator (Recommended)**
```bash
# Iteration 1
python orchestrator.py v1

# Iteration 2 (Generator modifies generate_input.py, Analyzer modifies base_vision_analyzer.py)
python orchestrator.py v2

# ... repeat for 20 iterations
```

**Option 2: Manual Steps**
```bash
# Iteration 1
python scripts/generate_input.py v1
python scripts/test_segmentation.py v1
python evaluation/evaluate_script_accuracy.py v1

# Iteration 2
python scripts/generate_input.py v2
python scripts/test_segmentation.py v2
python evaluation/evaluate_script_accuracy.py v2
```

## Iteration Workflow

Each iteration (1-20):

1. **Generator's turn**: Modify `scripts/generate_input.py` to create harder test cases
2. **Analyzer's turn**: Modify `scripts/base_vision_analyzer.py` to improve accuracy
3. **Run test**:
   ```bash
   python scripts/generate_input.py v{N}
   python scripts/test_segmentation.py v{N}
   python evaluation/evaluate_script_accuracy.py v{N}
   ```
4. **Record result** in `output/RESULT.md` with accuracy score and winner

## Key Files
- **Generator**: `scripts/generate_input.py` — Creates test images and ground truth (EDITABLE)
- **Analyzer**: `scripts/base_vision_analyzer.py` — Shared vision analysis logic (EDITABLE)
- **Segmentation**: `scripts/test_segmentation.py` — Segmentation wrapper
- **Evaluator**: `evaluation/evaluate_script_accuracy.py` — Accuracy evaluation
- **Results**: `output/RESULT.md` — Game progress and scoreboard

## Coordinate System
- `box_2d`: normalized coordinates (0-1000 scale) — used by API
- `abs_box_2d`: absolute pixel coordinates — used for ground truth

## Constraints
- **Can edit**: `scripts/generate_input.py` and `scripts/base_vision_analyzer.py` ONLY
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

## Progress Tracking
- Document each iteration in `output/RESULT.md`
- Include: iteration number, generator change, analyzer change, accuracy score, winner
- Track cumulative score: Generator wins vs Analyzer wins

## See Also
- `WORKFLOW.md` — Detailed workflow guide with all commands and options

