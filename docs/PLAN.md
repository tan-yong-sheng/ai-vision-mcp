## DONE
[x] should we split MAX_TOKENS environment variable into MAX_TOKENS_FOR_IMAGE and MAX_TOKENS_FOR_VIDEO? Justify and don't write the code first.

## TODO

**URGENT**

- let user to add their custom SYSTEM_INSTRUCTIONS_FOR_IMAGE_MODEL and SYSTEM_INSTRUCTIONS_FOR_VIDEO_MODEL ... 

- add metadata params like supportsThinking, supportsNoThinking - set thinkingbudget=0 for all models (except gemini 2.5 pro)

- add analyze_image description for prompt params: "Detailed text prompt. If the task is **front-end code replication**, the prompt you provide must be: "Describe in detail the layout structure, color style, main components, and interactive elements of the website in this image to facilitate subsequent code generation by the model." + your additional requirements. \ For **other tasks**, the prompt you provide must clearly describe what to analyze, extract, or understand from the image." (Reason: wait too long for such task to complete ... but can try one more time again)
- add TEMPERATURE_FOR_IMAGE, TOP_P_FOR_IMAGE, TOP_K_FOR_IMAGE, TEMPERATURE_FOR_VIDEO, TOP_P_FOR_VIDEO, TOP_K_FOR_VIDEO (prepare for future....)

**ICEBOX**

- like LiteLLM, have a centralized metadata handling at src/ folder (e.g., cost for output token, cost for input token, check metadata like support function calling, support thinking budget, structured output, etc).... Not sure if we should put this at src/proivders folder or not...

- add cost metadata into gemini response with formula: `cost = (token_in * price_in + token_out * price_out) / 1000`

```py
token_in = response.usage_metadata.prompt_token_count
token_out = response.usage_metadata.candidates_token_count
price_in = 0.0001  # e.g., per 1K input tokens (depends on model)
price_out = 0.0004 # e.g., per 1K output tokens
cost = (token_in * price_in + token_out * price_out) / 1000
``` 


**DISPOSAL**

- warn user that MAX_TOKENS_FOR_* is smaller than llm-assigned value for both image and video, if happens... (Reason: it's better to let llm to decide and override this)


- remove MAX_VIDEO_DURATION environment variable...

