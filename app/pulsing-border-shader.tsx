"use client";

import React from "react";

type PulsingBorderShaderProps = {
  className?: string;
  color?: string; // hex or rgba
};

// Minimal replacement for the missing shader component.
// Renders a circular pulsing ring that matches the prior API shape
// used by app/landing-page.tsx: <PulsingBorderShader className="h-56 w-56" color="#7c3aed" />
export function PulsingBorderShader({
  className = "",
  color = "#8b5cf6",
}: PulsingBorderShaderProps) {
  const outerStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
  };

  const ringStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: "9999px",
    border: `2px solid ${color}`,
    boxShadow: `0 0 14px ${color}55, inset 0 0 6px ${color}33`,
    background: "transparent",
    animation: "gt-pulse 2.4s ease-in-out infinite",
  };

  return (
    <div className={className} style={outerStyle} aria-hidden>
      <style jsx>{`
        @keyframes gt-pulse {
          0%, 100% { box-shadow: 0 0 14px ${color}55, inset 0 0 6px ${color}33; }
          50% { box-shadow: 0 0 28px ${color}88, inset 0 0 12px ${color}55; }
        }
      `}</style>
      <div style={ringStyle} />
    </div>
  );
}
