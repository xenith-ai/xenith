# [xenith.ai](https://xenith.ai)

[![Netlify Status](https://api.netlify.com/api/v1/badges/70139d0b-6e4a-4332-9d8d-4809fa0921ee/deploy-status)](https://app.netlify.com/sites/xenith/deploys) ![Discord](https://img.shields.io/discord/1221688220580843550?label=discord&logo=discord)

<img align="left" src="https://cdn.shaneduffy.io/shaneduffy/mikudance.gif" width="120"/>

**Create and interact with LLM powered voice assistants with Web Assembly!**

The goal of xenith is to provide a platform to create your own highly configurable voice assistants, with their own wake words, voices, LLMs and MCP connections, all running fully in-browser.

<div style="clear: both;"></div>

## Requirements

- **Dedicated GPU** - This runs AI models directly on your machine via WebAssembly, meaning you'll need a GPU or it will be extremely slow.
- **WebGPU Support** - Your browser must support WebGPU, check [WebGPU Report](https://webgpureport.org/) to see if your browser supports it.

## Credits

- [OpenAI](https://github.com/openai) - Creating (and open sourcing) the [Whisper Model](https://github.com/openai/whisper)
- [Georgi Gerganov](https://github.com/ggerganov) - Writing the C++ and WebAssembly [Whisper Port](https://github.com/ggerganov/whisper.cpp)
- [Alexander Veysov](https://github.com/snakers4) - Creating the very capable voice detection model [Silero VAD](https://github.com/snakers4/silero-vad).
- [Diffusion Studio](https://github.com/diffusionstudio) - Compiling the VITS models into an accessible WebAssembly framework [vits-web](https://github.com/diffusionstudio/vits-web)
- [MLC AI](https://github.com/mlc-ai) - Creating the engine for running LLMs in the browser [WebLLM](https://github.com/mlc-ai/web-llm)