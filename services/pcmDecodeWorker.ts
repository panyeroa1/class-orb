/// <reference lib="webworker" />

type WorkerRequest = {
  base64: string;
  sampleRate: number;
  channels: number;
};

type WorkerResponse = {
  float32: ArrayBuffer;
  sampleRate: number;
  channels: number;
};

const decodeBase64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { base64, sampleRate, channels } = event.data;
  const bytes = decodeBase64ToBytes(base64);
  const int16 = new Int16Array(bytes.buffer);
  const frameCount = int16.length / channels;
  const float32 = new Float32Array(frameCount * channels);

  for (let i = 0; i < frameCount; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const idx = i * channels + channel;
      float32[idx] = int16[idx] / 32768;
    }
  }

  const response: WorkerResponse = {
    float32: float32.buffer,
    sampleRate,
    channels,
  };

  self.postMessage(response, [float32.buffer]);
};
