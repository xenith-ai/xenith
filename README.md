# Xenith

[![Netlify Status](https://api.netlify.com/api/v1/badges/70139d0b-6e4a-4332-9d8d-4809fa0921ee/deploy-status)](https://app.netlify.com/sites/xenith/deploys) ![Discord](https://img.shields.io/discord/1221688220580843550?label=discord&logo=discord)

Create and interact with LLM powered voice assistants with WebAssembly!

The goal of xenith is to provide a platform for users to create their own voice assistants. This means supporting remote _and_ local Speech-to-Text, Text-to-Speech and Large Language Models. I'd also like to deploy this to desktop/mobile applications with native GPU support for better performance at some point.

## Credits

- [OpenAI](https://github.com/openai) - Creating (and open sourcing) the [Whisper Model](https://github.com/openai/whisper)
- [Georgi Gerganov](https://github.com/ggerganov) - Writing the C++ and WebAssembly [Whisper Port](https://github.com/ggerganov/whisper.cpp)
- [Alexander Veysov](https://github.com/snakers4) - Creating the very capable voice detection model [Silero VAD](https://github.com/snakers4/silero-vad).
- [Diffusion Studio](https://github.com/diffusionstudio) - Compiling the VITS models into an accessible WebAssembly framework [vits-web](https://github.com/diffusionstudio/vits-web)
