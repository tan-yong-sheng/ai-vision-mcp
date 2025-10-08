## DONE
[x] should we split MAX_TOKENS environment variable into MAX_TOKENS_FOR_IMAGE and MAX_TOKENS_FOR_VIDEO? Justify and don't write the code first.

## TODO
**URGENT**



**ICEBOX**

- set thinkingbudget=0 for all models (except gemini 2.5 pro)

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

- remove STREAM_RESPONSES environment variable? (Reason: discard this because it still works as usual after setting STREAM_RESPONSES=true)

- remove MAX_VIDEO_DURATION environment variable...