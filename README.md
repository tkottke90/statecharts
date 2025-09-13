# Statecharts.js

In the world of AI (and Agentic AI) it has become expected that applications leveraging LLMs provide an environment for LLM responses to be experienced as decisions.  This environment trusts the LLM responses to be relevant to the context and recursively calls the LLM until the response identifies that it has reached a terminal state or canceled externally.  

This environment interestingly enough sounds like a _Finite State Machine_.  After each LLM text generation, the state machine evaluates the response and determines the next state to transition too.

LLMs primary strength is in text generation, particularly in the patterns of it's training data.  This has empowered LLMs like _Chat GPT_ and _Claude_ to serve many roles 