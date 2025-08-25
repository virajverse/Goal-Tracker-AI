"use client";

import React, { useEffect, useRef } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pulsing-border': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        colors?: string;
        colorBack?: string;
        speed?: number;
        roundness?: number;
        thickness?: number;
        intensity?: number;
        spotsPerColor?: number;
        spotSize?: number;
        pulse?: number;
        smoke?: number;
        smokeSize?: number;
        scale?: number;
        rotation?: number;
        frame?: number;
      }, HTMLElement>;
    }
  }
}

export function PulsingBorderShader({
  className = '',
  color = '#8b5cf6',
  ...props
}: {
  className?: string;
  color?: string;
  [key: string]: any;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is a simplified version of the shader effect
    // In a real implementation, you would use WebGL or a library like Three.js
    // For now, we'll use CSS animations for the pulsing effect
    if (ref.current) {
      ref.current.style.setProperty('--pulse-color', color);
    }
  }, [color]);

  return (
    <div 
      ref={ref}
      className={`relative ${className}`}
      style={{
        '--pulse-color': color,
        '--pulse-scale': 1,
      } as React.CSSProperties}
      {...props}
    >
      <div 
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          padding: '2px',
          background: `linear-gradient(45deg, ${color}00, ${color}80, ${color}00)`,
          backgroundSize: '200% 200%',
          animation: 'pulse 3s ease-in-out infinite',
        }}
      >
        <div className="w-full h-full bg-white rounded-md"></div>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% {
            background-position: 0% 50%;
            opacity: 0.3;
          }
          50% {
            background-position: 100% 50%;
            opacity: 0.8;
          }
          100% {
            background-position: 0% 50%;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

export default PulsingBorderShader;
