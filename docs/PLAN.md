## DONE
[x] should we split MAX_TOKENS environment variable into MAX_TOKENS_FOR_IMAGE and MAX_TOKENS_FOR_VIDEO? Justify and don't write the code first.
[x] add native support to change GEMINI_BASE_URL to be switched to another proxy provider

## TODO

**IMPLEMENTED BUT TO BE TESTED**
- add TEMPERATURE_FOR_IMAGE, TOP_P_FOR_IMAGE, TOP_K_FOR_IMAGE, TEMPERATURE_FOR_VIDEO, TOP_P_FOR_VIDEO, TOP_K_FOR_VIDEO (prepare for future....)
- add MAX_TOKEN, TOP_P, TOP_K, TEMPERATURE configurable as environment variable for each function
- add MAX_TOKENS, since above set the standard for TOP_P, TOP_K, TEMPERATURE...
- add ANALYZE_IMAGE_MODEL, COMPARE_IMAGES_MODEL , ANALYZE_VIDEO_MODEL environment variable...
- actually could we use @google/genai in vertex ai library so that we can add native support for VERTEX_ENDPOINT to be switched to another proxy provider

**URGENT**
- add metadata params per model level like supportsThinking, supportsNoThinking - set thinkingbudget=0 for all models (except gemini 2.5 pro)
- add detect_objects_in_image mcp function ... (Note: not sure if we need to use `sharp` library to output image, i tend not to do so... )


**ICEBOX**
- optional dependencies to download when define, for example, ai-vision-mcp[google] (Reason: a bit hard to manage, currently only two providers so the dependencies not that large yet ...)

**DISPOSAL**

- warn user that MAX_TOKENS_FOR_* is smaller than llm-assigned value for both image and video, if happens... (Reason: it's better to let llm to decide and override this)

- remove MAX_VIDEO_DURATION environment variable...

- let user to add their custom SYSTEM_INSTRUCTIONS_FOR_IMAGE_MODEL and SYSTEM_INSTRUCTIONS_FOR_VIDEO_MODEL ... (Reason: hard to control the behaviour, for example, somebody may inject harmful prompt?)

- add analyze_image description for prompt params: "Detailed text prompt. If the task is **front-end code replication**, the prompt you provide must be: "Describe in detail the layout structure, color style, main components, and interactive elements of the website in this image to facilitate subsequent code generation by the model." + your additional requirements. \ For **other tasks**, the prompt you provide must clearly describe what to analyze, extract, or understand from the image." (Reason: wait too long for such task to complete, but can try to add `timeout` params to mcp client in future)


- like LiteLLM, have a centralized metadata handling at src/ folder (e.g., cost for output token, cost for input token, check metadata like support function calling, support thinking budget, structured output, etc).... Not sure if we should put this at src/proivders folder or not...

- add cost metadata into gemini response with formula: `cost = (token_in * price_in + token_out * price_out) / 1000`

```py
token_in = response.usage_metadata.prompt_token_count
token_out = response.usage_metadata.candidates_token_count
price_in = 0.0001  # e.g., per 1K input tokens (depends on model)
price_out = 0.0004 # e.g., per 1K output tokens
cost = (token_in * price_in + token_out * price_out) / 1000
``` 
