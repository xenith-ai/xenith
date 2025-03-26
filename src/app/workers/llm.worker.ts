import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Create a handler for incoming messages in the worker context
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
