#!/usr/bin/env python3
"""
Object Detection Test Script
Uses shared base code with dynamic prompts
"""

import sys
from base_vision_analyzer import run_analysis

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python test_object_detection.py <experiment_id>")
        print("Example: python test_object_detection.py v1")
        sys.exit(1)

    experiment_id = sys.argv[1]
    run_analysis(mode="detection", output_filename="test_object_detection", experiment_id=experiment_id)

