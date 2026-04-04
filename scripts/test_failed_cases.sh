#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="node "$ROOT_DIR/dist/index.js""
RESULT_FILE="$ROOT_DIR/TEST_RESULT_VERTEX_RETRY.md"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ -z "${VERTEX_CLIENT_EMAIL:-}" || -z "${VERTEX_PRIVATE_KEY:-}" || -z "${VERTEX_PROJECT_ID:-}" || -z "${GCS_BUCKET_NAME:-}" ]]; then
  echo "VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, and GCS_BUCKET_NAME are required" >&2
  exit 1
fi

export IMAGE_PROVIDER="${IMAGE_PROVIDER:-vertex_ai}"
export VIDEO_PROVIDER="${VIDEO_PROVIDER:-vertex_ai}"

IMAGE_URL="https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500"
IMAGE_URL_2="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500"
IMAGE_URL_3="https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=500"
LOCAL_IMAGE="$TMP_DIR/local-image.jpg"

curl -L -sS "$IMAGE_URL" -o "$LOCAL_IMAGE"

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
  echo "# AI Vision CLI Test Results (Vertex AI - Failed Cases Retry)"
  echo
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Environment"
  echo "- IMAGE_PROVIDER: ${IMAGE_PROVIDER}"
  echo "- VIDEO_PROVIDER: ${VIDEO_PROVIDER}"
  echo "- VERTEX_CLIENT_EMAIL: ${VERTEX_CLIENT_EMAIL:+set}${VERTEX_CLIENT_EMAIL:-unset}"
  echo "- VERTEX_PROJECT_ID: ${VERTEX_PROJECT_ID:-unset}"
  echo "- GCS_BUCKET_NAME: ${GCS_BUCKET_NAME:-unset}"
  echo
} >> "$RESULT_FILE"

# Only run the 5 failing cases
run_case "analyze-image url" $CLI analyze-image "$IMAGE_URL" --prompt "Describe the scene in one sentence." --max-tokens 100
sleep 15
run_case "analyze-image local file" $CLI analyze-image "$LOCAL_IMAGE" --prompt "Describe the image in one sentence." --max-tokens 100
sleep 15
run_case "compare-images two urls" $CLI compare-images "$IMAGE_URL" "$IMAGE_URL_2" --prompt "Compare these two images." --max-tokens 200
sleep 15
run_case "compare-images three urls" $CLI compare-images "$IMAGE_URL" "$IMAGE_URL_2" "$IMAGE_URL_3" --prompt "Compare these three images." --json
sleep 15
run_case "detect-objects url" $CLI detect-objects "$IMAGE_URL_2" --prompt "Detect visible objects in this image." --json

{
  echo "## Summary"
  echo "- Completed 5 failed cases (retry)"
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
