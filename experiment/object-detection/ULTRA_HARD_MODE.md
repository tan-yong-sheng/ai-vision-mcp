# Ultra-Hard Mode: PyBullet Synthetic Data Generation

## Overview

Ultra-hard mode uses **PyBullet physics simulation** to generate realistic synthetic object detection data. This is a completely different image distribution from the PIL-based v1-20 iterations, testing whether Analyzer improvements generalize to physics-based scenarios.

## Why Ultra-Hard Mode?

1. **Different domain**: PIL creates geometric shapes; PyBullet creates realistic physics-based overlaps and occlusions
2. **Generalization test**: If Analyzer wins on PyBullet data, improvements are robust
3. **Natural arrangements**: Physics simulation creates realistic object interactions
4. **Scalability**: Can generate unlimited variations with different object counts and configurations

## Quick Start

### Install PyBullet
```bash
pip install pybullet
```

### Generate Ultra-Hard Test Data
```bash
# Generate single ultra-hard iteration
python scripts/generate_input_pybullet.py ultra_v1

# Generate with custom object count
python scripts/generate_input_pybullet.py ultra_v2 --num-objects 12

# Generate multiple iterations
for i in {1..5}; do
  python scripts/generate_input_pybullet.py ultra_v$i --num-objects 8
done
```

### Run Segmentation Analysis
```bash
# After generating test data
python scripts/test_segmentation.py ultra_v1
python evaluation/evaluate_script_accuracy.py ultra_v1
```

### Full Iteration Workflow
```bash
# Iteration 1
python scripts/generate_input_pybullet.py ultra_v1 --num-objects 8
python scripts/test_segmentation.py ultra_v1
python evaluation/evaluate_script_accuracy.py ultra_v1

# Record result in RESULT.md
# Analyzer modifies base_vision_analyzer.py if needed

# Iteration 2
python scripts/generate_input_pybullet.py ultra_v2 --num-objects 10
python scripts/test_segmentation.py ultra_v2
python evaluation/evaluate_script_accuracy.py ultra_v2
```

## How It Works

### Physics Simulation
1. Create random 3D boxes in PyBullet world
2. Apply gravity and let objects settle (500 physics steps)
3. Objects naturally overlap and occlude each other
4. Extract final positions and orientations

### Rendering
- Orthographic projection (no perspective distortion)
- Depth-sorted rendering for proper occlusion
- PIL-based rendering (no OpenGL required)

### Ground Truth Extraction
- Project 3D bounding boxes to 2D screen space
- Generate normalized coordinates (0-1000 scale)
- Skip objects too small to detect (<5 pixels)

## Configuration

### Object Count
- Default: 8 objects
- Range: 1-20 recommended
- More objects = harder detection

### Physics Parameters
- Gravity: -9.81 m/s²
- Simulation steps: 500 (settles in ~2 seconds)
- Object size: 0.1-0.3 meters
- Object mass: 0.5 kg

## Comparing PIL vs PyBullet

| Aspect | PIL (v1-20) | PyBullet (ultra) |
|--------|------------|-----------------|
| Objects | Geometric shapes | Physics-based boxes |
| Overlap | Controlled, predictable | Natural, realistic |
| Occlusion | Partial | Full (depth-sorted) |
| Variation | Limited | Unlimited |
| Generation time | <1s | ~2-3s |
| Dependency | PIL only | PyBullet + PIL |

## Scoring

Same as v1-20:
- **Analyzer wins**: accuracy ≥ 90%
- **Generator wins**: accuracy < 95%
- **Tie**: 90% ≤ accuracy < 95%

## Recommended Iterations

Start with 5-10 ultra-hard iterations to test generalization:
- If Analyzer wins 4/5: improvements are robust
- If Analyzer loses 3/5: found a real weakness
- If mixed: need targeted improvements

## Files

- `scripts/generate_input_pybullet.py` — PyBullet data generator
- `scripts/test_segmentation.py` — Segmentation wrapper (unchanged)
- `evaluation/evaluate_script_accuracy.py` — Evaluation (unchanged)
- `ULTRA_HARD_MODE.md` — This file
