import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  isActive?: boolean;
  barCount?: number;
  height?: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isActive = false,
  barCount = 24,
  height = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      sizeRef.current = { width: rect.width, height: rect.height };
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let dataArray: Uint8Array | null = null;

    const accent = getComputedStyle(document.body).getPropertyValue('--accent-red').trim() || '#e11d48';

    const drawIdle = () => {
      const { width, height: canvasHeight } = sizeRef.current;
      if (!width || !canvasHeight) return;
      ctx.clearRect(0, 0, width, canvasHeight);
      ctx.fillStyle = `${accent}55`;
      const gap = 4;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const baseHeight = Math.max(4, canvasHeight * 0.25);
      for (let i = 0; i < barCount; i += 1) {
        const x = i * (barWidth + gap);
        const y = canvasHeight - baseHeight;
        ctx.fillRect(x, y, barWidth, baseHeight);
      }
    };

    const draw = () => {
      if (!ctx || !dataArray || !analyser) return;
      const { width, height: canvasHeight } = sizeRef.current;
      if (!width || !canvasHeight) return;

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, canvasHeight);
      ctx.fillStyle = accent;

      const gap = 4;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const step = Math.max(1, Math.floor(dataArray.length / barCount));

      for (let i = 0; i < barCount; i += 1) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(4, value * canvasHeight);
        const x = i * (barWidth + gap);
        const y = canvasHeight - barHeight;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationId = window.requestAnimationFrame(draw);
    };

    if (!stream || stream.getAudioTracks().length === 0) {
      drawIdle();
      return;
    }

    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    if (isActive && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => undefined);
    }

    draw();

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId);
      source?.disconnect();
      analyser?.disconnect();
      audioCtx?.close();
    };
  }, [stream, isActive, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    />
  );
};

export default AudioVisualizer;
