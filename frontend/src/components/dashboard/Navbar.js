import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth';
import { FiLogOut, FiShield } from 'react-icons/fi';

const roleLabels = {
  citizen:   'Citizen',
  police:    'Police',
  municipal: 'Municipal',
  emergency: 'Emergency',
};

const roleBadgeColors = {
  citizen:   'var(--cyan)',
  police:    'var(--red)',
  municipal: 'var(--yellow)',
  emergency: 'var(--red)',
};

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <nav
      className="dashboard-navbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 'var(--sidebar-width)',
        right: 0,
        height: 'var(--navbar-height)',
        background: 'rgba(8, 8, 22, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 99,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FiShield style={{ color: 'var(--cyan)', fontSize: '1.2rem' }} />
        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '1px' }}>
          OpCrime
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.5px', fontWeight: 500 }}>
          Tamil Nadu
        </span>
      </div>

      {/* Live clock — center */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '1px' }}>
          {timeStr}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {dateStr}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {role && (
          <span
            className="badge"
            style={{
              background: `${roleBadgeColors[role]}18`,
              color: roleBadgeColors[role],
              border: `1px solid ${roleBadgeColors[role]}50`,
              boxShadow: `0 0 10px ${roleBadgeColors[role]}22`,
            }}
          >
            {roleLabels[role] || role}
          </span>
        )}

        {user && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {user.name || user.email}
          </span>
        )}

        <button
          onClick={logout}
          className="btn btn-ghost"
          style={{ padding: '7px 14px', fontSize: '0.82rem' }}
        >
          <FiLogOut />
          Logout
        </button>
      </div>
    </nav>
  );
}
