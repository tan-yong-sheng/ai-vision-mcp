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
- add detect_objects_in_image mcp function ... (Note: not sure if we need to use `sharp` library to output image, i tend not to do so... )

**ICEBOX**
- optional dependencies to download when define, for example, ai-vision-mcp[google] (Reason: a bit hard to manage, currently only two providers so the dependencies not that large yet ...)


**DISPOSAL**

- remove MAX_VIDEO_DURATION environment variable...

- let user to add their custom SYSTEM_INSTRUCTIONS_FOR_IMAGE_MODEL and SYSTEM_INSTRUCTIONS_FOR_VIDEO_MODEL ... (Reason: hard to control the behaviour, for example, somebody may inject harmful prompt?)

- add analyze_image description for prompt params: "Detailed text prompt. If the task is **front-end code replication**, the prompt you provide must be: "Describe in detail the layout structure, color style, main components, and interactive elements of the website in this image to facilitate subsequent code generation by the model." + your additional requirements. \ For **other tasks**, the prompt you provide must clearly describe what to analyze, extract, or understand from the image." (Reason: wait too long for such task to complete, but can try to add `timeout` params to mcp client in future)

- add metadata params per model level like supportsThinking, supportsNoThinking - set thinkingbudget=0 for all models (except gemini 2.5 pro) - (Reason: hard to add another layer `thinking` as I think thinking_budget is not that useful for image analysis - unsure about this...)
