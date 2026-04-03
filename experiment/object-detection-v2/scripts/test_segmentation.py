#!/usr/bin/env python3
"""
Segmentation Test Script
Uses shared base code with dynamic prompts
"""

import sys
from base_vision_analyzer import run_analysis

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python test_segmentation.py <experiment_id>")
        print("Example: python test_segmentation.py v1")
        sys.exit(1)

    experiment_id = sys.argv[1]
    run_analysis(mode="segmentation", output_filename="test_segmentation", experiment_id=experiment_id)

