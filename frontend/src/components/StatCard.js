import React from 'react';
import { motion } from 'framer-motion';

const typeStyles = {
  danger: {
    borderColor: 'rgba(255, 51, 102, 0.45)',
    glowColor:   'rgba(255, 51, 102, 0.14)',
    iconColor:   'var(--red)',
    shimmer:     'rgba(255, 51, 102, 0.08)',
  },
  safe: {
    borderColor: 'rgba(0, 255, 136, 0.45)',
    glowColor:   'rgba(0, 255, 136, 0.14)',
    iconColor:   'var(--green)',
    shimmer:     'rgba(0, 255, 136, 0.08)',
  },
  warning: {
    borderColor: 'rgba(255, 204, 0, 0.45)',
    glowColor:   'rgba(255, 204, 0, 0.14)',
    iconColor:   'var(--yellow)',
    shimmer:     'rgba(255, 204, 0, 0.08)',
  },
  info: {
    borderColor: 'rgba(0, 240, 255, 0.45)',
    glowColor:   'rgba(0, 240, 255, 0.14)',
    iconColor:   'var(--cyan)',
    shimmer:     'rgba(0, 240, 255, 0.08)',
  },
};

export default function StatCard({ icon, title, value, trend, type = 'info' }) {
  const styles = typeStyles[type] || typeStyles.info;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.025 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className="glass-card"
      style={{
        padding: '22px 24px',
        borderColor: styles.borderColor,
        boxShadow: `0 0 28px ${styles.glowColor}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: 2,
        background: `linear-gradient(90deg, ${styles.iconColor}, transparent)`,
        opacity: 0.7,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {value}
          </div>
          {trend !== undefined && trend !== null && (
            <div style={{
              marginTop: 8, fontSize: '0.8rem', fontWeight: 600,
              color: trend >= 0 ? 'var(--red)' : 'var(--green)',
            }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
              <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>vs last week</span>
            </div>
          )}
        </div>

        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${styles.iconColor}15`,
            border: `1px solid ${styles.iconColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', color: styles.iconColor,
          }}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
