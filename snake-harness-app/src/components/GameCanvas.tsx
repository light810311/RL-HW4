import React, { useEffect, useRef } from 'react';
import type { Position } from '../rl/SnakeEnvironment';
import { GRID_SIZE } from '../rl/SnakeEnvironment';

interface GameCanvasProps {
  snake: Position[];
  apple: Position;
  size?: number;
  highlightAction?: number | null; // Just for visual flair if we want
  isIntercepted?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  snake, 
  apple, 
  size = 300,
  isIntercepted = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = size / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, size, size);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * blockSize, 0);
      ctx.lineTo(i * blockSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * blockSize);
      ctx.lineTo(size, i * blockSize);
      ctx.stroke();
    }

    // Draw Apple
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      apple.x * blockSize + blockSize / 2, 
      apple.y * blockSize + blockSize / 2, 
      blockSize / 2.5, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw Snake
    snake.forEach((segment, index) => {
      if (index === 0) {
        // Head
        ctx.fillStyle = isIntercepted ? '#f59e0b' : '#3b82f6'; // amber if intercepted, else blue
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
      } else {
        // Body
        ctx.fillStyle = isIntercepted ? 'rgba(245, 158, 11, 0.8)' : '#60a5fa'; 
        ctx.shadowBlur = 0;
      }

      // Draw segment with rounded corners slightly
      const padding = 2;
      ctx.fillRect(
        segment.x * blockSize + padding, 
        segment.y * blockSize + padding, 
        blockSize - padding * 2, 
        blockSize - padding * 2
      );
    });

  }, [snake, apple, size, isIntercepted]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size} 
        style={{ 
          borderRadius: '8px',
          boxShadow: isIntercepted ? '0 0 20px rgba(245, 158, 11, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.2s ease-in-out'
        }} 
      />
      {isIntercepted && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(245, 158, 11, 0.9)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          animation: 'pulse 1s infinite'
        }}>
          HARNESS INTERCEPT
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
