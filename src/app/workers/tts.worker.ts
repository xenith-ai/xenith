import { predict } from "@diffusionstudio/vits-web";

self.onmessage = async (event: MessageEvent) => {
  const { messageOutput, voiceId, guid } = event.data;

  try {
    const wav = await predict({
      text: messageOutput,
      voiceId: voiceId ?? 'en_US-hfc_female-medium', // fallback if voiceId is not passed
    });

    self.postMessage({
      type: 'tts-result',
      wav,
      guid,
    });
  } catch (err) {
    self.postMessage({
      type: 'tts-error',
      error: (err as Error).message,
    });
  }
};
