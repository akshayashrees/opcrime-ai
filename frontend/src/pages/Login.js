import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { FiMail, FiLock } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userRole = await login(email, password);
      const routes = {
        citizen: '/citizen',
        police: '/police',
        municipal: '/municipal',
        emergency: '/emergency',
      };
      navigate(routes[userRole] || '/citizen');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,240,255,0.06), transparent)',
          top: '10%',
          left: '10%',
          animation: 'float 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,51,102,0.06), transparent)',
          bottom: '15%',
          right: '15%',
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s',
          pointerEvents: 'none',
        }}
      />

      <div className="auth-card">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '40%',
              background:
                'linear-gradient(180deg, transparent 0%, rgba(0, 240, 255, 0.02) 50%, transparent 100%)',
              animation: 'scanline 8s linear infinite',
            }}
          />
        </div>

        <h1 className="auth-title gradient-text">OPCRIME AI</h1>
        <p className="auth-subtitle">Predictive Crime Analytics Platform</p>

        {/* Quick-access credentials hint */}
        <div style={{
          background: 'rgba(0,240,255,0.05)',
          border: '1px solid rgba(0,240,255,0.15)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
        }}>
          <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Demo credentials</span>
          <br />
          citizen@opcrime.ai · police@opcrime.ai · municipal@opcrime.ai · emergency@opcrime.ai
          <br />
          <span style={{ color: 'var(--text-dim)' }}>Password: <code style={{ color: 'var(--cyan)' }}>citizen123</code></span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <FiMail
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                className="form-input"
                placeholder="agent@opcrime.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <FiLock
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Authenticating...
              </span>
            ) : (
              'Access System'
            )}
          </button>
        </form>

        <div className="auth-link">
          New operative? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
