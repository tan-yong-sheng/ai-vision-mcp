#!/bin/bash
# Test local video upload and analysis with Gemini API
# This script demonstrates the full workflow for E2E testing

set -e

# Configuration
GEMINI_API_KEY="${GEMINI_API_KEY:?GEMINI_API_KEY is required}"
GEMINI_BASE_URL="${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com}"

# Sample video URL (W3Schools test video - ~10 sec, small file)
SAMPLE_VIDEO_URL="https://www.w3schools.com/html/mov_bbb.mp4"
VIDEO_FILE="/tmp/test-video.mp4"

echo "=== Step 1: Download sample video ==="
curl -L -o "$VIDEO_FILE" "$SAMPLE_VIDEO_URL"
VIDEO_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE" 2>/dev/null || echo "unknown")
echo "Downloaded: $VIDEO_FILE ($VIDEO_SIZE bytes)"

echo ""
echo "=== Step 2: Upload video to Gemini Files API ==="
UPLOAD_RESPONSE=$(curl -s -X POST "${GEMINI_BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
  -H "Content-Type: multipart/form-data" \
  -F "metadata={\"display_name\":\"test-video\"};type=application/json" \
  -F "file=@${VIDEO_FILE};type=video/mp4")

echo "Upload response:"
echo "$UPLOAD_RESPONSE" | jq .

# Extract file URI
FILE_URI=$(echo "$UPLOAD_RESPONSE" | jq -r '.file.uri')
FILE_NAME=$(echo "$UPLOAD_RESPONSE" | jq -r '.file.name')
echo ""
echo "File URI: $FILE_URI"
echo "File Name: $FILE_NAME"

echo ""
echo "=== Step 3: Wait for video processing ==="
echo "Checking processing status..."
for i in {1..30}; do
  STATUS_RESPONSE=$(curl -s "${GEMINI_BASE_URL}/v1beta/${FILE_NAME}?key=${GEMINI_API_KEY}")
  STATE=$(echo "$STATUS_RESPONSE" | jq -r '.state')
  echo "Attempt $i: State = $STATE"

  if [ "$STATE" = "ACTIVE" ]; then
    echo "Video is ready!"
    break
  elif [ "$STATE" = "FAILED" ]; then
    echo "Video processing failed!"
    exit 1
  fi

  sleep 2
done

echo ""
echo "=== Step 4: Analyze video WITHOUT offsets (full video) ==="
curl -X POST "${GEMINI_BASE_URL}/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"file_data": {"mime_type": "video/mp4", "file_uri": "'"$FILE_URI"'"}},
        {"text": "Summarize this video in one sentence."}
      ]
    }]
  }' | jq .

echo ""
echo "=== Step 5: Analyze video WITH startOffset/endOffset (first 10 seconds) ==="
curl -X POST "${GEMINI_BASE_URL}/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"file_data": {"mime_type": "video/mp4", "file_uri": "'"$FILE_URI"'"}},
        {"text": "What happens in this clip?"}
      ]
    }],
    "video_metadata": {
      "start_offset": "0s",
      "end_offset": "10s"
    }
  }' | jq .

echo ""
echo "=== Step 6: Cleanup - Delete uploaded file ==="
curl -X DELETE "${GEMINI_BASE_URL}/v1beta/${FILE_NAME}?key=${GEMINI_API_KEY}"
echo "File deleted."

echo ""
echo "=== Test Complete ==="
