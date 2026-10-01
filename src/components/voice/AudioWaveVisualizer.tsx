import React, { useEffect, useRef } from 'react';
import { micManager } from '../../lib/voice/microphoneManager';

interface AudioWaveVisualizerProps {
  active?: boolean;
  color?: string;
  className?: string;
  height?: number;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  active = true,
  color = '#f59e0b',
  className = '',
  height = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let history: number[] = new Array(60).fill(2);

    const render = () => {
      if (!canvas) return;
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      const analyser = micManager.getAnalyser();
      let currentEnergy = 0;
      let freqArray: Uint8Array | null = null;

      if (analyser && active) {
        freqArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqArray as any);
        let sum = 0;
        for (let i = 0; i < freqArray.length; i++) {
          sum += freqArray[i];
        }
        currentEnergy = sum / freqArray.length; // 0 to 255
      }

      // Normalized amplitude (3 to 28px height)
      const normAmp = active ? Math.max(3, Math.min(26, (currentEnergy / 255) * 45)) : 2;
      history.push(normAmp);
      if (history.length > 55) {
        history.shift();
      }

      phaseRef.current += 0.08;
      const phase = phaseRef.current;

      const barCount = history.length;
      const barSpacing = width / barCount;
      const centerY = h / 2;

      // Draw ChatGPT-style flowing wave bars from right to left
      for (let i = 0; i < barCount; i++) {
        const val = history[i];
        const x = i * barSpacing;
        const waveMod = Math.sin(phase + (i * 0.25)) * 0.25 + 0.75;
        const barHeight = Math.max(3, val * waveMod);

        // Gradient from amber gold to warm orange or bright glow
        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#d97706');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = 1.5;
        const yTop = centerY - barHeight / 2;
        ctx.roundRect(x, yTop, Math.max(2.5, barSpacing - 2.5), barHeight, radius);
        ctx.fill();
      }

      // Draw subtle luminous center horizon line
      ctx.strokeStyle = active ? 'rgba(245, 158, 11, 0.25)' : 'rgba(150, 150, 150, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [active, color]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={height}
      className={`block w-full h-[${height}px] pointer-events-none select-none ${className}`}
    />
  );
};
