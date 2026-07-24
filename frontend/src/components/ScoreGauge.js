import React, { useState, useEffect } from 'react';

function getColor(score) {
  if (score >= 68) return '#ff3366';
  if (score >= 61) return '#ff7700';
  if (score >= 54) return '#ffcc00';
  return '#00cc66';
}

function getGlow(score) {
  if (score >= 68) return 'rgba(255, 51, 102, 0.55)';
  if (score >= 61) return 'rgba(255, 119, 0, 0.55)';
  if (score >= 54) return 'rgba(255, 204, 0, 0.55)';
  return 'rgba(0, 204, 102, 0.55)';
}

function getLabel(score) {
  if (score >= 68) return 'CRITICAL';
  if (score >= 61) return 'HIGH RISK';
  if (score >= 54) return 'MODERATE';
  return 'SAFE';
}

export default function ScoreGauge({ score = 0, size = 180, label }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const end = score;
    const duration = 1400;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(end * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const cx = size / 2;
  const cy = size / 2;
  const sw = Math.max(8, Math.round(size * 0.056)); // stroke width
  const r  = (size - sw * 2 - 8) / 2;
  const C  = 2 * Math.PI * r;

  // 270° arc: starts at bottom-left (135° from 3-o'clock), gap at bottom
  const ARC_FRAC = 0.75;
  const ARC     = ARC_FRAC * C;
  const START   = 135; // degrees from 3-o'clock

  const fillLen = (animatedScore / 100) * ARC;

  // Dot at leading edge of fill arc
  const dotAngleDeg = START + (animatedScore / 100) * 270;
  const dotAngleRad = (dotAngleDeg * Math.PI) / 180;
  const dotX = cx + r * Math.cos(dotAngleRad);
  const dotY = cy + r * Math.sin(dotAngleRad);

  // 0 / 100 text positions just outside arc endpoints
  const rLabel = r + sw + 7;
  const zeroX  = cx + rLabel * Math.cos((START            * Math.PI) / 180);
  const zeroY  = cy + rLabel * Math.sin((START            * Math.PI) / 180);
  const hundX  = cx + rLabel * Math.cos(((START + 270)    * Math.PI) / 180);
  const hundY  = cy + rLabel * Math.sin(((START + 270)    * Math.PI) / 180);

  // Tick marks at 0 / 25 / 50 / 75 / 100 %
  const ticks = [0, 25, 50, 75, 100].map(pct => {
    const a = ((START + (pct / 100) * 270) * Math.PI) / 180;
    const r1 = r - sw * 0.55;
    const r2 = r + sw * 0.55;
    return {
      x1: cx + r1 * Math.cos(a), y1: cy + r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a), y2: cy + r2 * Math.sin(a),
    };
  });

  // Inner thin ring (decorative)
  const rInner = r - sw - 4;

  const color = getColor(animatedScore);
  const glow  = getGlow(animatedScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ filter: `drop-shadow(0 0 20px ${glow})`, overflow: 'visible' }}>
          {/* Inner decorative ring */}
          <circle cx={cx} cy={cy} r={rInner} fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth={1.5} />

          {/* Track arc */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={`${ARC} ${C - ARC}`}
            transform={`rotate(${START} ${cx} ${cy})`} />

          {/* Colored fill arc */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={`${fillLen} ${C - fillLen}`}
            transform={`rotate(${START} ${cx} ${cy})`}
            style={{ transition: 'stroke 0.5s ease' }} />

          {/* Tick marks */}
          {ticks.map(({ x1, y1, x2, y2 }, i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} strokeLinecap="round" />
          ))}

          {/* Glowing dot at fill leading edge */}
          {animatedScore > 2 && (
            <>
              <circle cx={dotX} cy={dotY} r={sw * 0.85} fill={color} opacity={0.25} />
              <circle cx={dotX} cy={dotY} r={sw * 0.52} fill={color}
                style={{ filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})` }} />
            </>
          )}

          {/* Score number */}
          <text x={cx} y={cy - size * 0.03}
            textAnchor="middle" dominantBaseline="central"
            fill={color}
            fontFamily="'Inter', sans-serif" fontWeight="800" fontSize={size * 0.24}>
            {Math.round(animatedScore)}
          </text>

          {/* Risk label */}
          <text x={cx} y={cy + size * 0.16}
            textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.38)"
            fontFamily="'Inter', sans-serif" fontWeight="600" fontSize={size * 0.062}>
            {getLabel(animatedScore)}
          </text>

          {/* 0 / 100 endpoint labels */}
          <text x={zeroX} y={zeroY} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.22)" fontFamily="'Inter',sans-serif"
            fontWeight="600" fontSize={size * 0.063}>0</text>
          <text x={hundX} y={hundY} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.22)" fontFamily="'Inter',sans-serif"
            fontWeight="600" fontSize={size * 0.063}>100</text>
        </svg>
      </div>

      {label && (
        <span style={{
          fontSize: '0.78rem', color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
