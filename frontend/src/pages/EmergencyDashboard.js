import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../components/common/DashboardLayout';
import CrimeMap from '../components/common/CrimeMap';
import StatCard from '../components/common/StatCard';
import { getEmergencyRoute } from '../services/api';
import { FiZap, FiNavigation, FiClock, FiAlertTriangle, FiShield, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { localityData, cityLocations, cityProfiles, cityCoords, cities } from '../data/localityData';
import { readEmergencies, resolveEmergency, readLiveTracking, subscribeToKey, BUS_KEYS } from '../utils/citizenBus';

function timeSince(dateStr) {
  if (!dateStr) return 'N/A';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const getTimeShift = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return '🌅 Morning';
  if (h >= 12 && h < 17) return '☀️ Afternoon';
  if (h >= 17 && h < 20) return '🌆 Evening';
  if (h >= 20 && h < 24) return '🌙 Night';
  return '🕛 Midnight';
};

// Generate city-wide SOS alerts sorted by urgency
const generateCityAlerts = (city) => {
  const locs = localityData[city] || {};
  const alerts = [];
  let id = 1;
  Object.entries(locs)
    .sort(([, a], [, b]) => b.risk - a.risk)
    .forEach(([name, loc]) => {
      if (loc.risk >= 68) {
        alerts.push({
          id: `sos-${id++}-${name}`,
          message: `${loc.area === 'slum' ? 'Assault reported' : 'Robbery in progress'} near ${loc.places[0]}`,
          location: `${name}, ${city}`,
          severity: loc.risk >= 72 ? 'critical' : 'high',
          status: 'active',
          latitude: loc.lat + 0.001,
          longitude: loc.lng - 0.001,
          created_at: new Date(Date.now() - Math.floor(Math.random() * 600000)).toISOString(),
        });
      }
      if (loc.risk >= 55) {
        alerts.push({
          id: `sos-${id++}-${name}`,
          message: `Chain snatching reported near ${loc.places[1] || loc.places[0]}`,
          location: `${name}, ${city}`,
          severity: 'medium',
          status: 'active',
          latitude: loc.lat - 0.001,
          longitude: loc.lng + 0.002,
          created_at: new Date(Date.now() - Math.floor(Math.random() * 1800000)).toISOString(),
        });
      }
    });
  return alerts;
};

// Response time: higher patrol = faster, higher risk = slower
const getResponseTime = (city, locality) => {
  const loc     = localityData[city]?.[locality];
  const profile = cityProfiles[city];
  if (!loc || !profile) return '8–12 mins';
  const base      = Math.max(4, 12 - profile.patrol);   // patrol 3→9 min, patrol 7→5 min
  const riskExtra = loc.risk >= 68 ? 3 : loc.risk >= 55 ? 1 : 0;
  const lo = base + riskExtra - 1;
  const hi = base + riskExtra + 2;
  return `${lo}–${hi} mins`;
};

export default function EmergencyDashboard() {
  const [city, setCity]               = useState('Chennai');
  const [locality, setLocality]       = useState('T. Nagar');
  const [alerts, setAlerts]           = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [routePath, setRoutePath]     = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [, setTick]                   = useState(0);
  const [citizenEmergencies, setCitizenEmergencies] = useState([]);
  const [liveTrack, setLiveTrack]     = useState(null);
  const timerRef                      = useRef(null);

  const fetchAlerts = useCallback(() => {
    setAlerts(generateCityAlerts(city));
    const allLocs = Object.values(localityData[city] || {});
    if (allLocs.length > 0) setHeatmapData(allLocs.map(l => [l.lat, l.lng, l.risk / 100]));
  }, [city]);

  // Sync citizen bus
  const syncBus = useCallback(() => {
    setCitizenEmergencies(readEmergencies().filter(e => !e.city || e.city === city));
    setLiveTrack(readLiveTracking());
  }, [city]);

  useEffect(() => {
    const locs = Object.keys(localityData[city] || {});
    if (locs.length > 0) setLocality(locs[0]);
    setSelectedAlert(null);
    setRoutePath([]);
  }, [city]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    syncBus();
    const unsub1 = subscribeToKey(BUS_KEYS.EMERGENCIES, syncBus);
    const unsub2 = subscribeToKey(BUS_KEYS.TRACKING,    syncBus);
    return () => { unsub1(); unsub2(); };
  }, [syncBus]);

  // Tick every second so timeSince updates live
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleRespond = async (alert) => {
    setSelectedAlert(alert);
    setRouteLoading(true);
    const locInfo    = localityData[city]?.[locality];
    const unitCoords = locInfo ? [locInfo.lat, locInfo.lng] : cityCoords[city];
    try {
      const res = await getEmergencyRoute(alert.latitude, alert.longitude, unitCoords[0], unitCoords[1], city);
      if (res.data?.route) {
        setRoutePath(res.data.route.map(p => [p.latitude || p[0], p.longitude || p[1]]));
      } else if (Array.isArray(res.data)) {
        setRoutePath(res.data.map(p => [p.latitude || p[0], p.longitude || p[1]]));
      }
    } catch {
      const steps = 8;
      const path = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curve = Math.sin(t * Math.PI) * 0.002;
        path.push([
          unitCoords[0] + (alert.latitude  - unitCoords[0]) * t + curve,
          unitCoords[1] + (alert.longitude - unitCoords[1]) * t + curve * 0.6,
        ]);
      }
      setRoutePath(path);
    }
    setRouteLoading(false);
  };

  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    if (selectedAlert?.id === id) { setSelectedAlert(null); setRoutePath([]); }
  };

  const localityCoord  = cityLocations[city]?.find(l => l.name === locality);
  const mapCenter      = localityCoord ? [localityCoord.lat, localityCoord.lng] : cityCoords[city];
  const loc            = localityData[city]?.[locality];
  const profile        = cityProfiles[city] || cityProfiles['Chennai'];
  const responseTime   = getResponseTime(city, locality);
  const locRisk        = loc?.risk ?? 60;

  // Locality-adjusted conditions (same formula as Citizen/Police)
  const adjL = Math.max(1, Math.min(10, Math.round(profile.lighting - (locRisk - 50) / 20)));
  const adjC = Math.max(1, Math.min(10, Math.round(profile.cctv    - (locRisk - 50) / 25)));
  const adjP = Math.max(1, Math.min(10, Math.round(profile.patrol  - (locRisk - 50) / 30)));
  const locArea     = loc?.area ?? profile.area_type;
  const areaColors  = { commercial: '#00f0ff', residential: '#00cc66', slum: '#ff7700', industrial: '#aa55ff', mixed: '#ffcc00' };

  // Merge citizen SOS at the top, marked as citizen
  const citizenAlertItems = citizenEmergencies
    .filter(e => e.status !== 'resolved')
    .map(e => ({
      id:        e.id,
      message:   e.message || 'Citizen Emergency SOS',
      location:  e.locality ? `${e.locality}, ${e.city || city}` : (e.city || city),
      severity:  e.type === 'SOS' ? 'critical' : 'high',
      status:    'active',
      latitude:  e.lat,
      longitude: e.lng,
      created_at: e.timestamp,
      isCitizen: true,
    }));

  const activeAlerts  = [...citizenAlertItems, ...alerts.filter(a => a.status !== 'resolved')];
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  const alertMarkers = activeAlerts
    .filter(a => a.latitude && a.longitude)
    .map(a => ({
      latitude: a.latitude, longitude: a.longitude,
      score: a.severity === 'critical' ? 95 : a.severity === 'high' ? 75 : 55,
      popup: `${a.isCitizen ? '🆘 CITIZEN SOS: ' : ''}${a.message} — ${a.location}`,
    }));

  return (
    <DashboardLayout>
      {/* Selectors + Time */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>City</label>
          <select value={city} onChange={e => setCity(e.target.value)}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>Locality (Unit Base)</label>
          <select value={locality} onChange={e => setLocality(e.target.value)}>
            {Object.keys(localityData[city] || {}).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {getTimeShift()}
        </div>
      </div>

      {/* Condition Chips — consistent with Citizen & Police */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { label: '💡 Lighting', value: `${adjL}/10`, color: adjL >= 6 ? 'var(--green)' : adjL >= 4 ? 'var(--yellow)' : 'var(--red)' },
          { label: '📷 CCTV',    value: `${adjC}/10`, color: adjC >= 6 ? 'var(--green)' : adjC >= 4 ? 'var(--yellow)' : 'var(--red)' },
          { label: '👮 Patrol',  value: `${adjP}/10`, color: adjP >= 5 ? 'var(--green)' : adjP >= 3 ? 'var(--yellow)' : 'var(--red)' },
          { label: '🕐 Time',    value: getTimeShift(), color: 'var(--cyan)' },
          { label: '🏘️ Area',   value: locArea,        color: areaColors[locArea] ?? 'var(--text-secondary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
            <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<FiZap />}          title="Active Alerts"  value={activeAlerts.length}  type="danger" />
        <StatCard icon={<FiAlertTriangle />} title="Critical"       value={criticalCount}         type="danger" />
        <StatCard icon={<FiShield />}        title="Locality Risk"  value={locRisk}               type={locRisk >= 68 ? 'danger' : locRisk >= 54 ? 'warning' : 'safe'} />
        <StatCard icon={<FiClock />}         title="Est. Response"  value={responseTime}          type="info" />
      </div>

      {/* AI Response Info Bar */}
      {loc && (
        <div className="glass-card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <FiShield style={{ fontSize: '1.5rem', color: locRisk >= 68 ? 'var(--red)' : locRisk >= 54 ? 'var(--yellow)' : 'var(--green)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Estimated Response Time</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: locRisk >= 68 ? 'var(--red)' : 'var(--cyan)' }}>{responseTime}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: 20 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Unit Base</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{locality}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: 20 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Focus Locations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {loc.places.slice(0, 3).map((p, i) => (
                <span key={i} style={{ padding: '2px 8px', background: 'rgba(0,240,255,0.08)', borderRadius: 10, fontSize: '0.72rem', color: 'var(--cyan)', border: '1px solid rgba(0,240,255,0.15)' }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Alert Feed */}
        <div id="alerts" className="glass-card panel">
          <h3 className="section-title">
            Active Alerts — {city}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({activeAlerts.length} active)
            </span>
            {citizenAlertItems.length > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(255,51,102,0.2)', color: 'var(--red)', border: '1px solid rgba(255,51,102,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                🆘 {citizenAlertItems.length} CITIZEN SOS
              </span>
            )}
          </h3>

          {/* Live Tracking Banner */}
          {liveTrack?.active && (
            <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.35)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)', animation: 'pulse 1s infinite', flexShrink: 0 }} />
              <div>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>📡 CITIZEN LIVE TRACKING ACTIVE</span>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
                  {liveTrack.locality}, {liveTrack.city}
                  {liveTrack.from && liveTrack.to && <> — Route: {liveTrack.from} → {liveTrack.to}</>}
                  {liveTrack.progress !== undefined && <> · <strong style={{ color: 'var(--cyan)' }}>{liveTrack.progress}% complete</strong></>}
                </div>
              </div>
              <button className="btn btn-danger" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '0.72rem' }}
                onClick={() => handleRespond({ id: 'live-track', message: 'Live Tracking Assist', location: `${liveTrack.locality}, ${liveTrack.city}`, latitude: liveTrack.lat, longitude: liveTrack.lng, severity: 'medium', created_at: liveTrack.timestamp })}>
                <FiNavigation /> Assist
              </button>
            </div>
          )}

          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <FiZap style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.3 }} />
                <div>No active alerts</div>
              </div>
            ) : (
              <AnimatePresence>
                {activeAlerts.map((alert, i) => {
                  const isSelected = selectedAlert?.id === alert.id;
                  const sevColor = alert.isCitizen ? 'var(--red)' : alert.severity === 'critical' ? 'var(--red)' : alert.severity === 'high' ? 'var(--yellow)' : 'var(--cyan)';
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(0,240,255,0.06)',
                        background: alert.isCitizen ? 'rgba(255,51,102,0.05)' : isSelected ? 'rgba(0,240,255,0.06)' : 'transparent',
                        borderLeft: `3px solid ${isSelected ? 'var(--cyan)' : sevColor}`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor, boxShadow: `0 0 8px ${sevColor}`, animation: 'pulse 2s infinite', flexShrink: 0 }} />
                            {alert.isCitizen && (
                              <span style={{ background: 'rgba(255,51,102,0.2)', color: 'var(--red)', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(255,51,102,0.4)' }}>🆘 CITIZEN SOS</span>
                            )}
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{alert.message}</span>
                            <span className={`badge ${alert.severity === 'critical' || alert.severity === 'high' ? 'badge-danger' : alert.severity === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                              {alert.severity}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>📍 {alert.location}</span>
                            <span><FiClock style={{ marginRight: 3 }} />{timeSince(alert.created_at)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => handleRespond(alert)}
                            disabled={routeLoading}
                          >
                            <FiNavigation /> {isSelected ? 'Responding' : 'Respond'}
                          </button>
                          <button
                            className="btn btn-success"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            onClick={() => {
                              if (alert.isCitizen) resolveEmergency(alert.id);
                              else handleResolve(alert.id);
                            }}
                          >
                            <FiCheckCircle />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Response Map */}
        <div id="map" className="glass-card panel">
          <h3 className="section-title">
            {selectedAlert ? `Response Route → ${selectedAlert.location}` : liveTrack?.active ? `📡 Live Track — ${liveTrack.locality}` : `Alert Map — ${city}`}
            {liveTrack?.active && !selectedAlert && (
              <span style={{ marginLeft: 10, fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>LIVE</span>
            )}
          </h3>
          {routeLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : (
            <CrimeMap
              center={selectedAlert ? [selectedAlert.latitude, selectedAlert.longitude] : liveTrack?.active ? [liveTrack.lat, liveTrack.lng] : mapCenter}
              zoom={selectedAlert ? 14 : liveTrack?.active ? 15 : 12}
              markers={alertMarkers}
              routePath={routePath}
              heatmapData={heatmapData}
              livePos={liveTrack?.active ? [liveTrack.lat, liveTrack.lng] : null}
            />
          )}
          {selectedAlert && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(0,240,255,0.04)', borderRadius: 8, border: '1px solid var(--border-glass)', fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiNavigation style={{ color: 'var(--green)' }} />
              Navigating to: <strong style={{ color: 'var(--cyan)' }}>{selectedAlert.location}</strong>
              <span style={{ marginLeft: 'auto', color: 'var(--cyan)', fontWeight: 600 }}>ETA: {responseTime}</span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
