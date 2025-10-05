DONE
[x] should we split MAX_TOKENS environment variable into MAX_TOKENS_FOR_IMAGE and MAX_TOKENS_FOR_VIDEO? Justify and don't write the code first.

TODO
- analyze_image() mcp function from local filesystem fail - 'what this image is about: "C:\Users\tys\Pictures\visualization-with-looker-studio.png"'
- haven't tested with google ai studio's gemini to upload image/video file from local filesystem...
- remove MAX_VIDEO_DURATION environment variable...

- warn user that MAX_TOKENS_FOR_* is smaller than llm-assigned value for both image and video, if happens...
- add MAX_TEMPERATURE env variable and remove TEMPERATURE env variable.... warn user that MAX_TEMPERATURE is smaller than llm-assigned values for both image and video, if happens...

- haven't tested with vertex ai's gemini
- Make it array for imageSource, videoSource params for analyze_image and analyze_video. But, will it be very slow? (should we do? need to research zai_org/mcp first)
- use countTokens API: https://ai.google.dev/api/tokens to validate before uploading... (should we do, or just upload first then fail? Not sure because context window limit may change for each model...)

- remove STREAM_RESPONSES=false?