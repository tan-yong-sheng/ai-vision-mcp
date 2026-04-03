# Analyzer Optimization Results - 20 Iterations

## Overview

This document tracks segmentation accuracy improvements through iterative refinement of the analyzer on a fixed dataset of 21 images with 177 total objects.

**Dataset**: Udacity Self-Driving Cars dataset (21 images, 177 objects)
**Object Classes**: car, truck, pedestrian, bicyclist, light
**Analyzer**: `scripts/base_vision_analyzer.py`
**Model**: gemini-robotics-er-1.5
**Goal**: Achieve average accuracy ≥ 90% across all images

*Dataset credit: Udacity*

## Iteration 1 - Baseline Analysis

**Date**: 2026-04-03T02:10:00Z
**Status**: In Progress (API rate limit hit, 3/21 images completed)

**Analyzer Configuration**:
- System prompt: Generalized object detection and segmentation instructions
- Detection prompt: BASE_PROMPT (detect all objects with extreme precision)
- Segmentation prompt: SEGMENTATION_APPEND (pixel-level masks with sharp boundaries)
- Model parameters: temperature=0, top_k=1, top_p=0.95, max_output_tokens=4000, thinking_budget=0

**Results (3/21 completed)**:

| Image ID | Accuracy | Precision | Recall | F1 Score | Avg IoU | Matched | Status |
|----------|----------|-----------|--------|----------|---------|---------|--------|
| 1479505644958006299 | 37.7/100 | 0.160 | 0.444 | 0.235 | 0.675 | 4/9 | ✓ |
| 1479505646457912353 | 71.2/100 | 0.857 | 0.600 | 0.706 | 0.644 | 6/10 | ✓ |
| 1479505647958901189 | 82.4/100 | 0.875 | 0.778 | 0.824 | 0.816 | 7/9 | ✓ |

**Baseline Statistics**:
- Average Accuracy: 63.8/100
- Min Accuracy: 37.7/100
- Max Accuracy: 82.4/100
- Analyzer Wins (≥90%): 0/3
- Images Failed: 18/21 (API rate limit)

**Key Observations**:
- High variance in accuracy (37.7% to 82.4%)
- Spillover (false positives) is significant on image 1 (84.0%)
- Best performance on image 3 (82.4%) with balanced precision/recall
- API rate limiting prevents full batch analysis

**Next Steps**:
- Wait for API cooldown to expire
- Continue batch analysis on remaining 18 images
- Analyze failure patterns
- Iterate on analyzer improvements

---

**Date**: 2026-04-02T17:57:45.640077Z

**Results**:
- Accuracy Score: 37.7/100
- Matched: 4/9 objects
- Precision: 0.16
- Recall: 0.444
- F1 Score: 0.235
- Avg IoU: 0.675
- Coverage: 44.4%
- Spillover: 84.0%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505644958006299.json`
- Test Image: `input/test_image_1479505644958006299.png`
- Segmentation: `output/test_segmentation_1479505644958006299.json`
- Evaluation: `output/evaluation_result_1479505644958006299.json`

## Iteration (1479505644958006299): Experiment Run

**Date**: 2026-04-02T17:58:15.715949Z

**Results**:
- Accuracy Score: 49.8/100
- Matched: 4/9 objects
- Precision: 0.444
- Recall: 0.444
- F1 Score: 0.444
- Avg IoU: 0.711
- Coverage: 44.4%
- Spillover: 55.6%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505644958006299.json`
- Test Image: `input/test_image_1479505644958006299.png`
- Segmentation: `output/test_segmentation_1479505644958006299.json`
- Evaluation: `output/evaluation_result_1479505644958006299.json`

## Iteration (1479505646457912353): Experiment Run

**Date**: 2026-04-02T17:59:13.806361Z

**Results**:
- Accuracy Score: 71.2/100
- Matched: 6/10 objects
- Precision: 0.857
- Recall: 0.6
- F1 Score: 0.706
- Avg IoU: 0.644
- Coverage: 60.0%
- Spillover: 14.3%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505646457912353.json`
- Test Image: `input/test_image_1479505646457912353.png`
- Segmentation: `output/test_segmentation_1479505646457912353.json`
- Evaluation: `output/evaluation_result_1479505646457912353.json`

---

## Batch Rerun Results (Latest Analyzer)

**Date**: 2026-04-02T18:10:14.248199Z

**Summary**: Re-evaluated all 3 experiments with current analyzer

| Exp ID | Accuracy | Precision | Recall | F1 Score | Avg IoU |
|--------|----------|-----------|--------|----------|---------|
| 1479505644958006299 | 37.7/100 | 0.160 | 0.444 | 0.235 | 0.675 |
| 1479505646457912353 | 71.2/100 | 0.857 | 0.600 | 0.706 | 0.644 |
| 1479505647958901189 | 82.4/100 | 0.875 | 0.778 | 0.824 | 0.816 |

**Statistics**:
- Average Accuracy: 63.8/100
- Min Accuracy: 37.7/100
- Max Accuracy: 82.4/100
- Analyzer Wins (≥90%): 0/3
- Generator Wins (<95%): 3/3

## Iteration (1479505648958548594): Experiment Run

**Date**: 2026-04-03T05:56:47.115132Z

**Results**:
- Accuracy Score: 35.9/100
- Matched: 3/8 objects
- Precision: 0.12
- Recall: 0.375
- F1 Score: 0.182
- Avg IoU: 0.806
- Coverage: 37.5%
- Spillover: 88.0%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505648958548594.json`
- Test Image: `input/test_image_1479505648958548594.png`
- Segmentation: `output/test_segmentation_1479505648958548594.json`
- Evaluation: `output/evaluation_result_1479505648958548594.json`

## Iteration (1479505649956581237): Experiment Run

**Date**: 2026-04-03T05:58:26.475680Z

**Results**:
- Accuracy Score: 77.6/100
- Matched: 5/6 objects
- Precision: 0.714
- Recall: 0.833
- F1 Score: 0.769
- Avg IoU: 0.783
- Coverage: 83.3%
- Spillover: 28.6%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505649956581237.json`
- Test Image: `input/test_image_1479505649956581237.png`
- Segmentation: `output/test_segmentation_1479505649956581237.json`
- Evaluation: `output/evaluation_result_1479505649956581237.json`

## Iteration (1479505650957260361): Experiment Run

**Date**: 2026-04-03T06:00:05.292001Z

**Results**:
- Accuracy Score: 79.2/100
- Matched: 5/8 objects
- Precision: 1.0
- Recall: 0.625
- F1 Score: 0.769
- Avg IoU: 0.708
- Coverage: 62.5%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_1479505650957260361.json`
- Test Image: `input/test_image_1479505650957260361.png`
- Segmentation: `output/test_segmentation_1479505650957260361.json`
- Evaluation: `output/evaluation_result_1479505650957260361.json`
