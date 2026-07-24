import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/common/DashboardLayout';
import CrimeMap from '../components/common/CrimeMap';
import ScoreGauge from '../components/common/ScoreGauge';
import StatCard from '../components/common/StatCard';
import { getDashboardStats, simulate } from '../services/api';
import {
  FiAlertTriangle, FiTarget, FiActivity, FiCheckCircle,
  FiClock, FiSun, FiVideo, FiUsers, FiShield,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { localityData, cityLocations, cityProfiles, cityCoords, cities } from '../data/localityData';
import { readEmergencies, resolveEmergency, readLiveTracking, subscribeToKey, BUS_KEYS } from '../utils/citizenBus';


const CRIME_LABELS = {
  assault: 'Assault', robbery: 'Robbery', chain_snatching: 'Chain Snatching',
  theft: 'Theft', vehicle_theft: 'Vehicle Theft', vandalism: 'Vandalism',
  burglary: 'Burglary', eve_teasing: 'Eve Teasing',
};

const getTimeLabel = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return '🌅 Morning';
  if (h >= 12 && h < 17) return '☀️ Afternoon';
  if (h >= 17 && h < 20) return '🌆 Evening';
  if (h >= 20 && h < 24) return '🌙 Night';
  return '🕛 Midnight';
};

// Generate city-wide alerts from all localities sorted by risk
const generateCityAlerts = (city) => {
  const locs = localityData[city] || {};
  const alerts = [];
  let id = 1;
  Object.entries(locs)
    .sort(([, a], [, b]) => b.risk - a.risk)
    .forEach(([name, loc]) => {
      if (loc.risk >= 68) {
        alerts.push({
          id: id++,
          type: loc.area === 'slum' ? 'assault' : 'robbery',
          location: `${name}, ${city}`,
          place: loc.places[0],
          time: `${Math.floor(Math.random() * 30) + 1} mins ago`,
          severity: 'high',
          status: 'active',
          lat: loc.lat, lng: loc.lng,
        });
        alerts.push({
          id: id++,
          type: 'chain_snatching',
          location: `${loc.places[1] || name}, ${city}`,
          place: loc.places[1] || loc.places[0],
          time: `${Math.floor(Math.random() * 60) + 30} mins ago`,
          severity: 'medium',
          status: 'active',
          lat: loc.lat + 0.002, lng: loc.lng + 0.001,
        });
      } else if (loc.risk >= 55) {
        alerts.push({
          id: id++,
          type: loc.area === 'commercial' ? 'theft' : 'vehicle_theft',
          location: `${loc.places[0]}, ${name}`,
          place: loc.places[0],
          time: `${Math.floor(Math.random() * 120) + 40} mins ago`,
          severity: 'medium',
          status: 'active',
          lat: loc.lat - 0.001, lng: loc.lng + 0.002,
        });
      } else if (loc.risk >= 47) {
        alerts.push({
          id: id++,
          type: 'vandalism',
          location: `${name}, ${city}`,
          place: loc.places[0],
          time: `${Math.floor(Math.random() * 240) + 90} mins ago`,
          severity: 'low',
          status: 'active',
          lat: loc.lat, lng: loc.lng,
        });
      }
    });
  return alerts;
};

// AI patrol recommendation based on locality
const getPatrolRecommendation = (city, locality) => {
  const loc = localityData[city]?.[locality];
  if (!loc) return null;
  const profile = cityProfiles[city];
  const priority = loc.risk >= 68 ? 'CRITICAL' : loc.risk >= 58 ? 'HIGH' : 'NORMAL';
  const units    = loc.risk >= 68 ? 4 : loc.risk >= 58 ? 2 : 1;
  const areaColors = { CRITICAL: 'var(--red)', HIGH: 'var(--yellow)', NORMAL: 'var(--green)' };
  return {
    priority,
    units,
    color: areaColors[priority],
    focus: loc.places.slice(0, 3),
    risk: loc.risk,
    area: loc.area,
    recommendation: priority === 'CRITICAL'
      ? `Deploy ${units} units immediately to ${locality}. This is a high-risk ${loc.area} zone with score ${loc.risk}.`
      : priority === 'HIGH'
      ? `Increase patrol frequency at ${locality}. Risk score ${loc.risk} — focus on ${loc.places[0]}.`
      : `Routine patrol at ${locality}. Risk is within normal range (${loc.risk}). Patrol score: ${profile.patrol}/10.`,
    shift: getTimeLabel(),
    cctv: profile.cctv,
    patrol: profile.patrol,
  };
};

export default function PoliceDashboard() {
  const [city, setCity]           = useState('Chennai');
  const [locality, setLocality]   = useState('T. Nagar');
  const [alerts, setAlerts]       = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [stats, setStats]         = useState(null);
  const [lighting, setLighting]       = useState(5);
  const [cctvDensity, setCctv]        = useState(5);
  const [patrolFreq, setPatrol]       = useState(3);
  const [defaultLighting, setDefLighting] = useState(5);
  const [defaultCctv, setDefCctv]         = useState(5);
  const [defaultPatrol, setDefPatrol]     = useState(3);
  const [simResult, setSimResult]     = useState(null);
  const [simLoading, setSimLoading]   = useState(false);
  const [citizenEmergencies, setCitizenEmergencies] = useState([]);
  const [liveTrack, setLiveTrack]     = useState(null);

  // Sync citizen bus data (emergencies + live tracking)
  const syncBus = useCallback(() => {
    const allEmergencies = readEmergencies().filter(e => !e.city || e.city === city);
    setCitizenEmergencies(allEmergencies);
    setLiveTrack(readLiveTracking());
  }, [city]);

  useEffect(() => {
    syncBus();
    const unsub1 = subscribeToKey(BUS_KEYS.EMERGENCIES, syncBus);
    const unsub2 = subscribeToKey(BUS_KEYS.TRACKING,    syncBus);
    return () => { unsub1(); unsub2(); };
  }, [syncBus]);

  const fetchData = useCallback(async () => {
    const profile = cityProfiles[city] || cityProfiles['Chennai'];
    const loc     = localityData[city]?.[locality];
    const locRisk = loc?.risk ?? 60;

    // Slider defaults from locality risk — store so simulator can diff against them
    const defL = Math.max(1, Math.min(10, Math.round(profile.lighting - (locRisk - 50) / 20)));
    const defC = Math.max(1, Math.min(10, Math.round(profile.cctv    - (locRisk - 50) / 25)));
    const defP = Math.max(1, Math.min(10, Math.round(profile.patrol  - (locRisk - 50) / 30)));
    setLighting(defL); setDefLighting(defL);
    setCctv(defC);     setDefCctv(defC);
    setPatrol(defP);   setDefPatrol(defP);

    // Heatmap from locality risk data
    const allLocs = Object.values(localityData[city] || {});
    if (allLocs.length > 0) {
      setHeatmapData(allLocs.map(l => [l.lat, l.lng, l.risk / 100]));
    }

    // City-filtered alerts
    setAlerts(generateCityAlerts(city));

    // Background: fetch stats for stat cards
    try {
      const statsRes = await getDashboardStats(city);
      const d = statsRes.data;
      const avgRisk = Math.round(allLocs.reduce((s, l) => s + l.risk, 0) / allLocs.length);
      setStats({
        total_active_alerts: generateCityAlerts(city).length,
        high_risk_count: allLocs.filter(l => l.risk >= 68).length,
        avg_score: d?.avg_opcrime_score ?? avgRisk,
        patrol_score: profile.patrol,
      });
    } catch (e) {
      const avgRisk = Math.round(allLocs.reduce((s, l) => s + l.risk, 0) / allLocs.length);
      setStats({
        total_active_alerts: generateCityAlerts(city).length,
        high_risk_count: allLocs.filter(l => l.risk >= 68).length,
        avg_score: avgRisk,
        patrol_score: profile.patrol,
      });
    }
  }, [city, locality]);

  useEffect(() => {
    const locs = Object.keys(localityData[city] || {});
    if (locs.length > 0) setLocality(locs[0]);
  }, [city]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  };

  const handleSimulate = async () => {
    setSimLoading(true);
    const loc     = localityData[city]?.[locality];
    const profile = cityProfiles[city] || cityProfiles['Chennai'];
    const areaType = loc?.area ?? profile.area_type;
    const locRisk  = loc?.risk ?? 60;
    try {
      const coords = loc ? [loc.lat, loc.lng] : cityCoords[city];
      const res = await simulate(
        {
          latitude: coords[0], longitude: coords[1], city,
          area_type: areaType,
          lighting_score: 2, cctv_density: 1, police_patrol_frequency: 1,
          time_of_day: new Date().getHours(),
          crowd_density: 60, previous_crime_count: Math.round(locRisk / 5),
        },
        { lighting_score: lighting, cctv_density: cctvDensity, police_patrol_frequency: patrolFreq }
      );
      const apiImprovement = ((lighting - defaultLighting) * 1.5)
                           + ((cctvDensity - defaultCctv)  * 1.2)
                           + ((patrolFreq  - defaultPatrol) * 2.0);
      setSimResult({
        score_before: locRisk,
        score_after:  Math.max(40, Math.round(locRisk - apiImprovement)),
        score_change: -apiImprovement,
      });
    } catch (e) {
      // Improvement = delta from current defaults × weight per factor
      // At default sliders → improvement = 0 (score unchanged)
      const improvement = ((lighting - defaultLighting) * 1.5)
                        + ((cctvDensity - defaultCctv)  * 1.2)
                        + ((patrolFreq  - defaultPatrol) * 2.0);
      setSimResult({
        score_before: locRisk,
        score_after: Math.max(40, Math.round(locRisk - improvement)),
        score_change: -improvement,
        crime_type_before: areaType === 'slum' ? 'assault' : areaType === 'commercial' ? 'theft' : 'vehicle_theft',
      });
    }
    setSimLoading(false);
    // Reset sliders back to current conditions after simulation
    setTimeout(() => {
      setLighting(defaultLighting);
      setCctv(defaultCctv);
      setPatrol(defaultPatrol);
    }, 1500);
  };

  const patrolRec   = getPatrolRecommendation(city, locality);
  const localityLoc = cityLocations[city]?.find(l => l.name === locality);
  const mapCenter   = localityLoc ? [localityLoc.lat, localityLoc.lng] : cityCoords[city];
  const brightnessOverlay = Math.max(0, 0.65 - (lighting / 10) * 0.65);

  const allLocs     = Object.values(localityData[city] || {});
  const highRiskCount  = stats?.high_risk_count ?? allLocs.filter(l => l.risk >= 68).length;
  const totalAlerts    = stats?.total_active_alerts ?? alerts.length;
  const avgScore       = stats?.avg_score ?? Math.round(allLocs.reduce((s, l) => s + l.risk, 0) / (allLocs.length || 1));
  const patrolScore    = stats?.patrol_score ?? cityProfiles[city]?.patrol ?? 5;

  // Merge citizen SOS alerts at the top (severity=high, marked as citizen)
  const citizenAlertItems = citizenEmergencies.map(e => ({
    id:       e.id,
    type:     e.type === 'SOS' ? 'assault' : 'theft',
    location: e.locality ? `${e.locality}, ${e.city || city}` : (e.city || city),
    place:    e.locality || city,
    time:     e.timestamp ? `${Math.max(0, Math.round((Date.now() - new Date(e.timestamp).getTime()) / 60000))} mins ago` : 'just now',
    severity: e.severity || 'high',
    status:   e.status || 'active',
    lat:      e.lat, lng: e.lng,
    isCitizen: true,
    citizenMsg: e.message,
  }));

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const allAlerts     = [...citizenAlertItems.filter(a => a.status !== 'resolved'), ...alerts];
  const sortedAlerts  = allAlerts.sort((a, b) => {
    if (a.isCitizen && !b.isCitizen) return -1; // citizen SOS always first
    if (!a.isCitizen && b.isCitizen) return 1;
    return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
  });

  return (
    <DashboardLayout>
      {/* City + Locality Selector */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>City</label>
          <select value={city} onChange={e => setCity(e.target.value)}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>Locality</label>
          <select value={locality} onChange={e => setLocality(e.target.value)}>
            {Object.keys(localityData[city] || {}).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {getTimeLabel()}
        </div>
      </div>

      {/* Condition Chips — same as Citizen */}
      {(() => {
        const p = cityProfiles[city] || cityProfiles['Chennai'];
        const locRisk = localityData[city]?.[locality]?.risk ?? 60;
        const locArea = localityData[city]?.[locality]?.area ?? p.area_type;
        const areaColors = { commercial: '#00f0ff', residential: '#00cc66', slum: '#ff7700', industrial: '#aa55ff', mixed: '#ffcc00' };
        const adjL = Math.max(1, Math.min(10, Math.round(p.lighting - (locRisk - 50) / 20)));
        const adjC = Math.max(1, Math.min(10, Math.round(p.cctv    - (locRisk - 50) / 25)));
        const adjP = Math.max(1, Math.min(10, Math.round(p.patrol  - (locRisk - 50) / 30)));
        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: '💡 Lighting', value: `${adjL}/10`, color: adjL >= 6 ? 'var(--green)' : adjL >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '📷 CCTV',    value: `${adjC}/10`, color: adjC >= 6 ? 'var(--green)' : adjC >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '👮 Patrol',  value: `${adjP}/10`, color: adjP >= 5 ? 'var(--green)' : adjP >= 3 ? 'var(--yellow)' : 'var(--red)' },
              { label: '🕐 Time',    value: getTimeLabel(), color: 'var(--cyan)' },
              { label: '🏘️ Area',   value: locArea,        color: areaColors[locArea] ?? 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
                <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<FiAlertTriangle />} title="Total Alerts"       value={totalAlerts}    type="info" />
        <StatCard icon={<FiActivity />}      title="High Risk Areas"    value={highRiskCount}  type="danger" />
        <StatCard icon={<FiTarget />}        title="Avg City Score"     value={avgScore}       type={avgScore >= 68 ? 'danger' : avgScore >= 54 ? 'warning' : 'safe'} />
        <StatCard icon={<FiTarget />}        title={`${locality} Risk`} value={localityData[city]?.[locality]?.risk ?? '—'} type={localityData[city]?.[locality]?.risk >= 68 ? 'danger' : localityData[city]?.[locality]?.risk >= 54 ? 'warning' : 'safe'} />
      </div>

      <div className="dashboard-grid">

        {/* Alert Feed */}
        <div id="alerts" className="glass-card panel">
          <h3 className="section-title">
            Alert Feed — {city}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({sortedAlerts.filter(a => a.status !== 'resolved').length} active)
            </span>
            {citizenEmergencies.filter(e => e.status !== 'resolved').length > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(255,51,102,0.2)', color: 'var(--red)', border: '1px solid rgba(255,51,102,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                🆘 {citizenEmergencies.filter(e => e.status !== 'resolved').length} CITIZEN SOS
              </span>
            )}
          </h3>

          {/* Live Tracking Banner */}
          {liveTrack?.active && (
            <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1s infinite' }} />
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>📡 LIVE TRACKING</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Citizen at <strong style={{ color: 'var(--cyan)' }}>{liveTrack.locality}, {liveTrack.city}</strong>
                {liveTrack.from && liveTrack.to && <> · {liveTrack.from} → {liveTrack.to}</>}
              </span>
              {liveTrack.progress !== undefined && (
                <span style={{ marginLeft: 'auto', color: 'var(--cyan)', fontWeight: 700 }}>{liveTrack.progress}%</span>
              )}
            </div>
          )}

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {sortedAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No alerts at this time</div>
            ) : (
              <AnimatePresence>
                {sortedAlerts.map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    className={`alert-item alert-item-${alert.severity}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ opacity: alert.status === 'resolved' ? 0.5 : 1, background: alert.isCitizen ? 'rgba(255,51,102,0.05)' : undefined }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {alert.isCitizen && (
                          <span style={{ background: 'rgba(255,51,102,0.2)', color: 'var(--red)', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(255,51,102,0.4)' }}>
                            🆘 SOS
                          </span>
                        )}
                        <FiAlertTriangle style={{
                          color: alert.status === 'resolved' ? 'var(--green)' : alert.severity === 'high' ? 'var(--red)' : alert.severity === 'medium' ? 'var(--yellow)' : 'var(--text-muted)',
                          fontSize: '0.9rem',
                        }} />
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', textTransform: 'capitalize' }}>
                          {alert.isCitizen ? (alert.citizenMsg || 'Citizen Emergency') : (CRIME_LABELS[alert.type] || alert.type?.replace(/_/g, ' '))}
                        </span>
                        <span className={`badge ${alert.severity === 'high' ? 'badge-danger' : alert.severity === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📍 {alert.location}</span>
                        <span><FiClock style={{ marginRight: 3 }} />{alert.time}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {alert.status === 'resolved' ? (
                        <span className="badge badge-success">Resolved</span>
                      ) : (
                        <button
                          className="btn btn-success"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          onClick={() => {
                            if (alert.isCitizen) resolveEmergency(alert.id);
                            else handleResolve(alert.id);
                          }}
                        >
                          <FiCheckCircle /> Resolve
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* AI Patrol Recommendation */}
        {patrolRec && (
          <div className="glass-card panel">
            <h3 className="section-title">Patrol Recommendation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Priority + Units */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: `1px solid ${patrolRec.color}33` }}>
                <FiShield style={{ fontSize: '2rem', color: patrolRec.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: patrolRec.color }}>
                    {patrolRec.priority} PRIORITY
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {locality}, {city} · Risk Score: {patrolRec.risk}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--cyan)', lineHeight: 1 }}>
                    {patrolRec.units}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Units Needed</div>
                </div>
              </div>

              {/* Shift */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--cyan)' }}>
                <FiClock /> {patrolRec.shift}
              </div>

              {/* Recommendation text */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,240,255,0.04)', borderRadius: 8, border: '1px solid var(--border-glass)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {patrolRec.recommendation}
              </div>

              {/* Infrastructure */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'CCTV Coverage', value: `${patrolRec.cctv}/10`, color: patrolRec.cctv >= 6 ? 'var(--green)' : 'var(--yellow)' },
                  { label: 'Patrol Score', value: `${patrolRec.patrol}/10`, color: patrolRec.patrol >= 5 ? 'var(--green)' : 'var(--red)' },
                  { label: 'Area Type', value: patrolRec.area, color: 'var(--cyan)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 700, color, fontSize: '0.9rem', textTransform: 'capitalize' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Focus Areas */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Focus Areas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {patrolRec.focus.map((place, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: 'rgba(0,240,255,0.08)', borderRadius: 20, fontSize: '0.78rem', color: 'var(--cyan)', border: '1px solid rgba(0,240,255,0.18)' }}>
                      📌 {place}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Intervention Simulator */}
        <div id="simulate" className="glass-card panel">
          <h3 className="section-title">Intervention Simulator — {locality}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Adjust infrastructure levels to simulate crime score change
          </p>

          {[
            { label: 'Lighting Score',   icon: <FiSun />,   value: lighting,    set: setLighting, def: defaultLighting },
            { label: 'CCTV Density',     icon: <FiVideo />, value: cctvDensity, set: setCctv,     def: defaultCctv },
            { label: 'Patrol Frequency', icon: <FiUsers />, value: patrolFreq,  set: setPatrol,   def: defaultPatrol },
          ].map(({ label, icon, value, set, def }) => (
            <div key={label} className="slider-group">
              <label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {label}</span>
                <span style={{ color: value >= 7 ? 'var(--green)' : value >= 4 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                  {value}/10
                  {value === def && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>(current)</span>}
                </span>
              </label>
              <input type="range" min="1" max="10" value={value} onChange={e => set(Number(e.target.value))} />
            </div>
          ))}

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleSimulate} disabled={simLoading}>
            {simLoading ? 'Simulating...' : '▶ Run Simulation'}
          </button>

          {simResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 20, marginTop: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>City Avg (Before)</div>
                  <ScoreGauge score={simResult.score_before ?? 65} size={110} />
                </div>
                <div style={{ fontSize: '2rem', color: 'var(--cyan)' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>After</div>
                  <ScoreGauge score={simResult.score_after ?? 40} size={110} />
                </div>
              </div>
              <div style={{ marginTop: 14, textAlign: 'center', padding: '10px 14px', background: 'rgba(0,255,136,0.06)', borderRadius: 8, border: '1px solid rgba(0,255,136,0.15)' }}>
                <span style={{ color: simResult.score_change <= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '1.05rem' }}>
                  {simResult.score_change <= 0 ? '▼' : '▲'} {Math.abs(simResult.score_change ?? 0).toFixed(1)} pts
                  {simResult.score_change <= 0 ? ' reduction' : ' increase'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: 8 }}>in crime risk</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Risk Map */}
        <div id="map" className="glass-card panel full-width">
          <h3 className="section-title">
            Risk Heatmap — {city}
            {liveTrack?.active && (
              <span style={{ marginLeft: 12, fontSize: '0.72rem', color: 'var(--green)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                📡 LIVE CITIZEN TRACKED
              </span>
            )}
          </h3>
          <CrimeMap
            center={liveTrack?.active ? [liveTrack.lat, liveTrack.lng] : mapCenter}
            zoom={liveTrack?.active ? 15 : 12}
            heatmapData={heatmapData}
            livePos={liveTrack?.active ? [liveTrack.lat, liveTrack.lng] : null}
            hotspots={Object.entries(localityData[city] || {})
              .filter(([, d]) => d.risk >= 58)
              .map(([name, d]) => ({
                lat: d.lat, lng: d.lng, score: d.risk, name,
                crime_type: d.area === 'slum' ? 'assault' : d.area === 'commercial' ? 'theft' : 'vehicle_theft',
                cluster: 0,
              }))}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
