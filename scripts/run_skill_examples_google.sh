#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="node "$ROOT_DIR/dist/index.js""
RESULT_FILE="$ROOT_DIR/RESULT.md"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "GEMINI_API_KEY is required" >&2
  exit 1
fi

IMAGE_URL="https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500"
IMAGE_URL_2="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500"
IMAGE_URL_3="https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=500"
VIDEO_URL="https://www.w3schools.com/html/mov_bbb.mp4"
YOUTUBE_URL="https://www.youtube.com/watch?v=9hE5-98ZeCg"
LOCAL_IMAGE="$TMP_DIR/local-image.jpg"
LOCAL_VIDEO="$TMP_DIR/local-video.mp4"
BASE64_IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

curl -L -sS "$IMAGE_URL" -o "$LOCAL_IMAGE"
curl -L -sS "$VIDEO_URL" -o "$LOCAL_VIDEO"

PASS_COUNT=0
FAIL_COUNT=0
FAILED_CASES=()

run_case() {
  local title="$1"
  shift
  local output_file="$TMP_DIR/${title//[^a-zA-Z0-9_-]/_}.log"
  local status=0

  echo "== $title ==" | tee -a "$RESULT_FILE"
  if output=$("$@" 2>&1); then
    status=0
  else
    status=$?
  fi

  printf '%s\n' "$output" > "$output_file"
  {
    echo "Status: $([[ $status -eq 0 ]] && echo PASS || echo FAIL)"
    echo "Command: $*"
    echo "Output:"
    printf '%s\n' "$output" | tail -n 40
    echo
  } >> "$RESULT_FILE"

  printf '%s\n' "$output"

  if [[ $status -eq 0 ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_CASES+=("$title")
  fi

  return 0
}

: > "$RESULT_FILE"
{
  echo "# AI Vision CLI Test Results"
  echo
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Environment"
  echo "- GEMINI_API_KEY: set"
  echo "- GEMINI_BASE_URL: ${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com}"
  echo "- YOUTUBE_API_KEY: ${YOUTUBE_API_KEY:+set}${YOUTUBE_API_KEY:-unset}"
  echo
} >> "$RESULT_FILE"

run_case "analyze-image url" $CLI analyze-image "$IMAGE_URL" --prompt "Describe the scene in one sentence." --max-tokens 100
run_case "analyze-image local file" $CLI analyze-image "$LOCAL_IMAGE" --prompt "Describe the image in one sentence." --max-tokens 100
run_case "analyze-image base64" $CLI analyze-image "$BASE64_IMAGE" --prompt "What color is this?" --json
run_case "compare-images two urls" $CLI compare-images "$IMAGE_URL" "$IMAGE_URL_2" --prompt "Compare these two images." --max-tokens 200
run_case "compare-images three urls" $CLI compare-images "$IMAGE_URL" "$IMAGE_URL_2" "$IMAGE_URL_3" --prompt "Compare these three images." --json
run_case "detect-objects url" $CLI detect-objects "$IMAGE_URL_2" --prompt "Detect visible objects in this image." --json
run_case "detect-objects local file" $CLI detect-objects "$LOCAL_IMAGE" --prompt "Detect visible objects in this image." --output "$TMP_DIR/annotated-local-image.png"
run_case "analyze-video remote url" $CLI analyze-video "$VIDEO_URL" --prompt "Summarize this video in one sentence." --max-tokens 200
run_case "analyze-video local file" $CLI analyze-video "$LOCAL_VIDEO" --prompt "Summarize this local video in one sentence." --max-tokens 200
run_case "analyze-video youtube" $CLI analyze-video "$YOUTUBE_URL" --prompt "Summarize this YouTube video in one sentence." --max-tokens 200

{
  echo "## Summary"
  echo "- Completed 10 CLI cases"
  echo "- Passed: $PASS_COUNT"
  echo "- Failed: $FAIL_COUNT"
  if [[ ${#FAILED_CASES[@]} -gt 0 ]]; then
    echo "- Failed cases:"
    for case_name in "${FAILED_CASES[@]}"; do
      echo "  - $case_name"
    done
  fi
  echo "- See sections above for per-case status and output"
} >> "$RESULT_FILE"

if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi

exit 0
