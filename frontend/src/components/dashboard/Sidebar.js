import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import {
  FiHome, FiMap, FiAlertTriangle, FiShield, FiActivity,
  FiTrendingUp, FiTarget,
  FiNavigation, FiZap, FiMenu, FiX,
} from 'react-icons/fi';

const menuByRole = {
  citizen: [
    { anchor: 'top',       icon: <FiHome />,         label: 'Dashboard'    },
    { anchor: 'map',       icon: <FiMap />,           label: 'Crime Map'    },
    { anchor: 'safety',    icon: <FiShield />,        label: 'Safety Mode'  },
    { anchor: 'emergency', icon: <FiAlertTriangle />, label: 'Emergency'    },
  ],
  police: [
    { anchor: 'top',      icon: <FiHome />,         label: 'Dashboard'  },
    { anchor: 'alerts',   icon: <FiAlertTriangle />,label: 'Alerts'     },
    { anchor: 'map',      icon: <FiMap />,           label: 'Hotspot Map'},
    { anchor: 'simulate', icon: <FiActivity />,      label: 'Simulator'  },
  ],
  municipal: [
    { anchor: 'top',         icon: <FiHome />,        label: 'Dashboard'    },
    { anchor: 'zones',       icon: <FiTarget />,      label: 'Risk Zones'   },
    { anchor: 'suggestions', icon: <FiTrendingUp />,  label: 'AI Suggestions'},
    { anchor: 'budget',      icon: <span style={{ fontWeight: 700, fontSize: '1rem' }}>₹</span>, label: 'Budget Planner'},
  ],
  emergency: [
    { anchor: 'top',    icon: <FiHome />,      label: 'Dashboard'    },
    { anchor: 'alerts', icon: <FiZap />,       label: 'Active Alerts'},
    { anchor: 'map',    icon: <FiNavigation />,label: 'Response Map' },
  ],
};

function scrollToSection(anchor) {
  if (anchor === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const el = document.getElementById(anchor);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function Sidebar() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = menuByRole[role] || menuByRole.citizen;
  const [active, setActive] = useState('top');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClick = (anchor) => {
    setActive(anchor);
    setMobileOpen(false);
    scrollToSection(anchor);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 24px 22px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem' }}>🛡️</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
            OpCrime
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            Tamil Nadu Police
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {items.map((item, idx) => {
          const isActive = active === item.anchor;
          return (
            <div
              key={idx}
              onClick={() => handleClick(item.anchor)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 18px', borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: isActive ? 'var(--cyan)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                marginBottom: 4, fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--cyan)', borderRadius: '0 2px 2px 0', boxShadow: '0 0 10px var(--cyan-glow)' }} />
              )}
              <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
        <div
          onClick={() => { logout(); navigate('/login'); }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 'var(--radius)', 
            cursor: 'pointer', color: '#ff4d4d', fontSize: '1rem', fontWeight: '600', transition: 'all 0.2s', background: 'rgba(255, 77, 77, 0.1)'
          }}
        >
          <FiX /> Logout
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: '15px', left: '15px', zIndex: 1001,
          width: '45px', height: '45px', background: 'rgba(15, 15, 35, 0.95)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'var(--cyan)', fontSize: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', cursor: 'pointer'
        }}
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Mobile background overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 998, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar - RESTORED ORIGINAL CLASSNAME */}
      <aside
        className={`dashboard-sidebar${mobileOpen ? ' sidebar-open' : ''}`}
        style={{
          background: 'rgba(8, 8, 24, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        }}
      >
        {sidebarContent}
      </aside>
      
      {/* Styles to fix Mobile/Desktop layout */}
      <style>{`
        @media (max-width: 1023px) {
          .dashboard-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
          }
          .dashboard-sidebar.sidebar-open {
            transform: translateX(0);
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
          }
        }
        @media (min-width: 1024px) {
          .sidebar-toggle { display: none !important; }
        }
      `}</style>
    </>
  );
}