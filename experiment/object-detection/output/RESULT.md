# Competitive Segmentation Game - 20 Iteration Loop

**Objective**: Generator vs Analyzer competition over 20 iterations.
- **Generator wins** if accuracy < 95%
- **Analyzer wins** if accuracy ≥ 90%

**Editable files**:
- Generator: `scripts/generate_input.py`
- Analyzer: `scripts/base_vision_analyzer.py`

**Quick Run**: `python orchestrator.py v{N}` (runs all steps automatically)

**Progress**:

## Scoreboard

| Iteration | Generator Change | Analyzer Change | Accuracy | Winner | Notes |
|-----------|------------------|-----------------|----------|--------|-------|
| v1 | Baseline (5 rectangles) | Baseline | 99.4/100 | Analyzer ✓ | Standard mode |

## Game Log

### Iteration v1: Baseline
- **Date**: 2026-04-02T16:02:09.689054Z
- **Accuracy**: 99.4/100
- **Winner**: Analyzer (≥90%)
- **Metrics**: Precision 1.0, Recall 1.0, F1 1.0, Avg IoU 0.971, Coverage 100%, Spillover 0%

---

**Running Score**: 
- Generator wins: 0
- Analyzer wins: 1
- Ties: 0

## Iteration (v2): Experiment Run

**Date**: 2026-04-02T16:05:48.391864Z

**Results**:
- Accuracy Score: 99.0/100
- Matched: 7/7 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.949
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v2.json`
- Test Image: `input/test_image_v2.png`
- Segmentation: `output/test_segmentation_v2.json`
- Evaluation: `output/evaluation_result_v2.json`

## Iteration (v3): Experiment Run

**Date**: 2026-04-02T16:06:16.547182Z

**Results**:
- Accuracy Score: 99.0/100
- Matched: 5/5 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.95
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v3.json`
- Test Image: `input/test_image_v3.png`
- Segmentation: `output/test_segmentation_v3.json`
- Evaluation: `output/evaluation_result_v3.json`

## Iteration (v4): Experiment Run

**Date**: 2026-04-02T16:07:29.942982Z

**Results**:
- Accuracy Score: 99.0/100
- Matched: 5/5 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.95
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v4.json`
- Test Image: `input/test_image_v4.png`
- Segmentation: `output/test_segmentation_v4.json`
- Evaluation: `output/evaluation_result_v4.json`

## Iteration (v5): Experiment Run

**Date**: 2026-04-02T16:09:42.990514Z

**Results**:
- Accuracy Score: 98.7/100
- Matched: 11/11 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.937
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v5.json`
- Test Image: `input/test_image_v5.png`
- Segmentation: `output/test_segmentation_v5.json`
- Evaluation: `output/evaluation_result_v5.json`

## Iteration (v6): Experiment Run

**Date**: 2026-04-02T16:10:32.779127Z

**Results**:
- Accuracy Score: 90.5/100
- Matched: 9/10 objects
- Precision: 0.9
- Recall: 0.9
- F1 Score: 0.9
- Avg IoU: 0.926
- Coverage: 90.0%
- Spillover: 10.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v6.json`
- Test Image: `input/test_image_v6.png`
- Segmentation: `output/test_segmentation_v6.json`
- Evaluation: `output/evaluation_result_v6.json`

## Iteration (v7): Experiment Run

**Date**: 2026-04-02T16:15:48.596379Z

**Results**:
- Accuracy Score: 87.2/100
- Matched: 8/9 objects
- Precision: 0.889
- Recall: 0.889
- F1 Score: 0.889
- Avg IoU: 0.806
- Coverage: 88.9%
- Spillover: 11.1%

**Output Files**:
- Ground Truth: `input/ground_truth_v7.json`
- Test Image: `input/test_image_v7.png`
- Segmentation: `output/test_segmentation_v7.json`
- Evaluation: `output/evaluation_result_v7.json`

## Iteration (v8): Experiment Run

**Date**: 2026-04-02T16:18:59.727765Z

**Results**:
- Accuracy Score: 97.4/100
- Matched: 10/10 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.868
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v8.json`
- Test Image: `input/test_image_v8.png`
- Segmentation: `output/test_segmentation_v8.json`
- Evaluation: `output/evaluation_result_v8.json`

## Iteration (v9): Experiment Run

**Date**: 2026-04-02T16:19:50.256404Z

**Results**:
- Accuracy Score: 96.0/100
- Matched: 16/16 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.799
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v9.json`
- Test Image: `input/test_image_v9.png`
- Segmentation: `output/test_segmentation_v9.json`
- Evaluation: `output/evaluation_result_v9.json`

## Iteration (v10): Experiment Run

**Date**: 2026-04-02T16:20:22.246988Z

**Results**:
- Accuracy Score: 88.8/100
- Matched: 13/15 objects
- Precision: 1.0
- Recall: 0.867
- F1 Score: 0.929
- Avg IoU: 0.708
- Coverage: 86.7%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v10.json`
- Test Image: `input/test_image_v10.png`
- Segmentation: `output/test_segmentation_v10.json`
- Evaluation: `output/evaluation_result_v10.json`

## Iteration (v11): Experiment Run

**Date**: 2026-04-02T16:21:04.377077Z

**Results**:
- Accuracy Score: 93.4/100
- Matched: 13/14 objects
- Precision: 1.0
- Recall: 0.929
- F1 Score: 0.963
- Avg IoU: 0.811
- Coverage: 92.9%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v11.json`
- Test Image: `input/test_image_v11.png`
- Segmentation: `output/test_segmentation_v11.json`
- Evaluation: `output/evaluation_result_v11.json`

## Iteration (v12): Experiment Run

**Date**: 2026-04-02T16:21:36.930914Z

**Results**:
- Accuracy Score: 88.3/100
- Matched: 14/16 objects
- Precision: 0.933
- Recall: 0.875
- F1 Score: 0.903
- Avg IoU: 0.796
- Coverage: 87.5%
- Spillover: 6.7%

**Output Files**:
- Ground Truth: `input/ground_truth_v12.json`
- Test Image: `input/test_image_v12.png`
- Segmentation: `output/test_segmentation_v12.json`
- Evaluation: `output/evaluation_result_v12.json`

## Iteration (v13): Experiment Run

**Date**: 2026-04-02T16:23:35.097161Z

**Results**:
- Accuracy Score: 86.4/100
- Matched: 10/13 objects
- Precision: 1.0
- Recall: 0.769
- F1 Score: 0.87
- Avg IoU: 0.781
- Coverage: 76.9%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v13.json`
- Test Image: `input/test_image_v13.png`
- Segmentation: `output/test_segmentation_v13.json`
- Evaluation: `output/evaluation_result_v13.json`

## Iteration (v14): Experiment Run

**Date**: 2026-04-02T16:24:08.115660Z

**Results**:
- Accuracy Score: 96.7/100
- Matched: 14/14 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.833
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v14.json`
- Test Image: `input/test_image_v14.png`
- Segmentation: `output/test_segmentation_v14.json`
- Evaluation: `output/evaluation_result_v14.json`

## Iteration (v15): Experiment Run

**Date**: 2026-04-02T16:24:46.114625Z

**Results**:
- Accuracy Score: 90.3/100
- Matched: 13/15 objects
- Precision: 1.0
- Recall: 0.867
- F1 Score: 0.929
- Avg IoU: 0.782
- Coverage: 86.7%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v15.json`
- Test Image: `input/test_image_v15.png`
- Segmentation: `output/test_segmentation_v15.json`
- Evaluation: `output/evaluation_result_v15.json`

## Iteration (v16): Experiment Run

**Date**: 2026-04-02T16:26:09.120948Z

**Results**:
- Accuracy Score: 83.0/100
- Matched: 11/14 objects
- Precision: 0.917
- Recall: 0.786
- F1 Score: 0.846
- Avg IoU: 0.743
- Coverage: 78.6%
- Spillover: 8.3%

**Output Files**:
- Ground Truth: `input/ground_truth_v16.json`
- Test Image: `input/test_image_v16.png`
- Segmentation: `output/test_segmentation_v16.json`
- Evaluation: `output/evaluation_result_v16.json`

## Iteration (v17): Experiment Run

**Date**: 2026-04-02T16:26:33.659338Z

**Results**:
- Accuracy Score: 92.7/100
- Matched: 12/13 objects
- Precision: 1.0
- Recall: 0.923
- F1 Score: 0.96
- Avg IoU: 0.788
- Coverage: 92.3%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v17.json`
- Test Image: `input/test_image_v17.png`
- Segmentation: `output/test_segmentation_v17.json`
- Evaluation: `output/evaluation_result_v17.json`

## Iteration (v18): Experiment Run

**Date**: 2026-04-02T16:27:02.966895Z

**Results**:
- Accuracy Score: 91.6/100
- Matched: 13/14 objects
- Precision: 1.0
- Recall: 0.929
- F1 Score: 0.963
- Avg IoU: 0.722
- Coverage: 92.9%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v18.json`
- Test Image: `input/test_image_v18.png`
- Segmentation: `output/test_segmentation_v18.json`
- Evaluation: `output/evaluation_result_v18.json`

## Iteration (v19): Experiment Run

**Date**: 2026-04-02T16:27:53.581134Z

**Results**:
- Accuracy Score: 96.1/100
- Matched: 12/12 objects
- Precision: 1.0
- Recall: 1.0
- F1 Score: 1.0
- Avg IoU: 0.803
- Coverage: 100.0%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v19.json`
- Test Image: `input/test_image_v19.png`
- Segmentation: `output/test_segmentation_v19.json`
- Evaluation: `output/evaluation_result_v19.json`

## Iteration (v20): Experiment Run

**Date**: 2026-04-02T16:28:23.142899Z

**Results**:
- Accuracy Score: 93.0/100
- Matched: 14/15 objects
- Precision: 1.0
- Recall: 0.933
- F1 Score: 0.966
- Avg IoU: 0.784
- Coverage: 93.3%
- Spillover: 0.0%

**Output Files**:
- Ground Truth: `input/ground_truth_v20.json`
- Test Image: `input/test_image_v20.png`
- Segmentation: `output/test_segmentation_v20.json`
- Evaluation: `output/evaluation_result_v20.json`

---

## Batch Rerun Results (Latest Analyzer)

**Date**: 2026-04-02T16:42:47.670803Z

**Summary**: Re-evaluated all 20 experiments with current analyzer

| Exp ID | Accuracy | Precision | Recall | F1 Score | Avg IoU |
|--------|----------|-----------|--------|----------|---------|
| v1 | 99.1/100 | 1.000 | 1.000 | 1.000 | 0.955 |
| v2 | 99.0/100 | 1.000 | 1.000 | 1.000 | 0.949 |
| v3 | 99.0/100 | 1.000 | 1.000 | 1.000 | 0.950 |
| v4 | 99.0/100 | 1.000 | 1.000 | 1.000 | 0.950 |
| v5 | 98.2/100 | 1.000 | 1.000 | 1.000 | 0.912 |
| v6 | 90.5/100 | 0.900 | 0.900 | 0.900 | 0.923 |
| v7 | 56.6/100 | 0.556 | 0.556 | 0.556 | 0.607 |
| v8 | 97.4/100 | 1.000 | 1.000 | 1.000 | 0.868 |
| v9 | 96.5/100 | 1.000 | 1.000 | 1.000 | 0.824 |
| v10 | 90.3/100 | 1.000 | 0.867 | 0.929 | 0.779 |
| v11 | 93.6/100 | 1.000 | 0.929 | 0.963 | 0.825 |
| v12 | 88.3/100 | 0.933 | 0.875 | 0.903 | 0.796 |
| v13 | 86.4/100 | 1.000 | 0.769 | 0.870 | 0.781 |
| v14 | 96.7/100 | 1.000 | 1.000 | 1.000 | 0.833 |
| v15 | 90.3/100 | 1.000 | 0.867 | 0.929 | 0.782 |
| v16 | 83.2/100 | 0.917 | 0.786 | 0.846 | 0.754 |
| v17 | 91.1/100 | 1.000 | 0.923 | 0.960 | 0.711 |
| v18 | 91.0/100 | 1.000 | 0.929 | 0.963 | 0.695 |
| v19 | 96.1/100 | 1.000 | 1.000 | 1.000 | 0.803 |
| v20 | 93.0/100 | 1.000 | 0.933 | 0.966 | 0.784 |

**Statistics**:
- Average Accuracy: 91.8/100
- Min Accuracy: 56.6/100
- Max Accuracy: 99.1/100
- Analyzer Wins (≥90%): 16/20
- Generator Wins (<95%): 11/20
