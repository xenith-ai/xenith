# Xenith

[![Netlify Status](https://api.netlify.com/api/v1/badges/70139d0b-6e4a-4332-9d8d-4809fa0921ee/deploy-status)](https://app.netlify.com/sites/xenith/deploys) ![Discord](https://img.shields.io/discord/1221688220580843550?label=discord&logo=discord)

Create and interact with LLM powered voice assistants with WebAssembly!

The goal of xenith is to provide a platform for users to create their own custom voice assistants. Long term goals:
- Support for a variety of remote APIs for LLM/STT/TTS
- Deployment to Desktop/Mobile platforms for native hardware support
- Self-hosted model processing for remote access to your assistants
- Machine integrations for triggering local automations and workflows from your assistant

## Requirements

- **Dedicated GPU** - This runs LLMs directly on your machine via WebAssembly, meaning you'll need a GPU or it will be extremely slow.
- **WebGPU Support** - Your browser must support WebGPU, check [WebGPU Report](https://webgpureport.org/) to see if your browser supports it.

## Credits

- [OpenAI](https://github.com/openai) - Creating (and open sourcing) the [Whisper Model](https://github.com/openai/whisper)
- [Georgi Gerganov](https://github.com/ggerganov) - Writing the C++ and WebAssembly [Whisper Port](https://github.com/ggerganov/whisper.cpp)
- [Alexander Veysov](https://github.com/snakers4) - Creating the very capable voice detection model [Silero VAD](https://github.com/snakers4/silero-vad).
- [Diffusion Studio](https://github.com/diffusionstudio) - Compiling the VITS models into an accessible WebAssembly framework [vits-web](https://github.com/diffusionstudio/vits-web)
