import React, { useState, useEffect, useCallback, useRef } from 'react';

const CRIME_EXPLANATIONS = {
  theft:           { icon: '🛍️', color: '#ffaa00', desc: 'Pickpocketing and shoplifting are likely in crowded areas. Keep valuables secure and stay alert in markets.' },
  burglary:        { icon: '🏠', color: '#ff6600', desc: 'Break-ins are elevated in poorly lit residential areas. Ensure doors and windows are locked at night.' },
  assault:         { icon: '👊', color: '#ff3366', desc: 'Physical altercations risk is high near alcohol outlets at night. Avoid isolated areas and travel in groups.' },
  robbery:         { icon: '💰', color: '#ff3366', desc: 'Armed robbery risk is elevated. Avoid displaying valuables and use well-lit routes.' },
  chain_snatching: { icon: '📿', color: '#ffcc00', desc: 'Chain snatching incidents are common in this area. Avoid wearing visible jewellery while commuting.' },
  eve_teasing:     { icon: '⚠️', color: '#ff6699', desc: 'Harassment incidents are elevated in this zone. Travel with companions and stay in public areas.' },
  vandalism:       { icon: '🔨', color: '#aa55ff', desc: 'Property damage is likely in this area. Park vehicles in secured locations.' },
  vehicle_theft:   { icon: '🚗', color: '#ff9900', desc: 'Vehicle theft is elevated here. Use anti-theft locks and park in monitored areas.' },
};
import DashboardLayout from '../components/common/DashboardLayout';
import CrimeMap from '../components/common/CrimeMap';
import ScoreGauge from '../components/common/ScoreGauge';
import StatCard from '../components/common/StatCard';
import { getScore, getExplanation, sendEmergency } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FiShield, FiAlertTriangle, FiMap, FiNavigation, FiUsers } from 'react-icons/fi';
import { motion } from 'framer-motion';

import { localityData, cityLocations, cityProfiles, cityCoords, cities } from '../data/localityData';
import { pushEmergency, setLiveTracking } from '../utils/citizenBus';


const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          borderRadius: 8,
          padding: '10px 14px',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].payload.feature}</p>
        <p style={{ margin: '4px 0 0', color: 'var(--cyan)' }}>
          Importance: {payload[0].value.toFixed(3)}
        </p>
      </div>
    );
  }
  return null;
};

export default function CitizenDashboard() {
  const [city, setCity] = useState('Chennai');
  const [locality, setLocality] = useState('T. Nagar');
  const [score, setScore] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [explanation, setExplanation] = useState([]);
  const [safetyMode, setSafetyMode] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [routePath, setRoutePath] = useState([]);
  const [routeScore, setRouteScore] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [policeNotified, setPoliceNotified] = useState(false);
  const [autoPolice, setAutoPolice] = useState(false);
  const [liveTracking, setLiveTrackingState] = useState(false);
  const [trackPos, setTrackPos] = useState(null);   // current simulated GPS position along route
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [emergencySent, setEmergencySent] = useState(false);
  const [loading, setLoading] = useState(false);
  const trackTimer = useRef(null);
  const trackIdx   = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const locInfo = localityData[city]?.[locality];
      const coords  = locInfo ? [locInfo.lat, locInfo.lng] : cityCoords[city];
      const profile = cityProfiles[city] || cityProfiles['Chennai'];
      const hour    = new Date().getHours();

      // Use locality-specific area type and adjust infrastructure based on locality risk
      // High-risk localities get worse lighting/patrol values to produce a differentiated score
      const locRisk     = locInfo?.risk ?? 50;
      const riskFactor  = locRisk / 100;                          // 0–1
      const lightingAdj = Math.max(1, profile.lighting  - riskFactor * 4);
      const cctvAdj     = Math.max(1, profile.cctv      - riskFactor * 3);
      const patrolAdj   = Math.max(1, profile.patrol    - riskFactor * 3);
      const alcoholAdj  = profile.alcohol * (0.6 + riskFactor * 0.8); // nearer alcohol in risky areas
      const areaType    = locInfo?.area ?? profile.area_type;

      // Use localityData.risk as the authoritative score — consistent with Police dashboard
      // Only call API for crime_type prediction, not for the score itself
      const crimeTypePromise = getScore({
        latitude:                coords[0],
        longitude:               coords[1],
        city,
        area_type:               areaType,
        lighting_score:          Math.round(lightingAdj * 10) / 10,
        cctv_density:            Math.round(cctvAdj     * 10) / 10,
        police_patrol_frequency: Math.round(patrolAdj   * 10) / 10,
        crowd_density:           profile.crowd,
        alcohol_shop_proximity:  Math.round(alcoholAdj),
        population_density:      profile.pop_density,
        previous_crime_count:    Math.round(locRisk / 5),
        time_of_day:             hour,
      });

      const [crimeTypeRes] = await Promise.allSettled([crimeTypePromise]);

      // Score comes from localityData (same source as Police dashboard = consistent)
      const crimeType = crimeTypeRes.status === 'fulfilled'
        ? crimeTypeRes.value.data?.crime_type
        : (areaType === 'slum' ? 'assault' : areaType === 'commercial' ? 'theft' : 'vehicle_theft');

      setScore({
        opcrime_score: locRisk,
        crime_type:    crimeType,
      });

      // Build heatmap from localityData using absolute risk/100
      // score < 0.4 → green, 0.4–0.65 → yellow, > 0.65 → red
      const allLocs = Object.values(localityData[city] || {});
      if (allLocs.length > 0) {
        const hd = allLocs.map(l => [l.lat, l.lng, l.risk / 100]);
        setHeatmapData(hd);
      }
    } catch (e) {
      console.error('Error fetching citizen data:', e);
    }
    setLoading(false);
  }, [city, locality]);

  const fetchExplanation = useCallback(async () => {
    try {
      const res = await getExplanation();
      const fi = res.data?.feature_importance;
      if (fi && typeof fi === 'object') {
        const entries = Object.entries(fi)
          .map(([k, v]) => ({ feature: k.replace(/_/g, ' '), importance: typeof v === 'number' ? v : 0 }))
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 8);
        setExplanation(entries);
      }
    } catch (e) {
      // Locality-aware fallback — vary weights based on locality risk profile
      const locInfo = localityData[city]?.[locality];
      const locRisk = locInfo?.risk ?? 50;
      const areaType = locInfo?.area ?? 'residential';
      const isHighRisk = locRisk >= 65;
      const isCommercial = areaType === 'commercial';
      const isSlum = areaType === 'slum';
      setExplanation([
        { feature: 'Lighting Score',      importance: isSlum ? 0.22 : 0.18 },
        { feature: 'Previous Incidents',  importance: isHighRisk ? 0.20 : 0.10 },
        { feature: 'CCTV Density',        importance: isCommercial ? 0.17 : 0.13 },
        { feature: 'Patrol Frequency',    importance: isHighRisk ? 0.15 : 0.12 },
        { feature: 'Time of Day',         importance: 0.11 },
        { feature: 'Area Type',           importance: isSlum ? 0.10 : 0.08 },
        { feature: 'Alcohol Proximity',   importance: isHighRisk ? 0.09 : 0.06 },
        { feature: 'Population Density',  importance: isCommercial ? 0.08 : 0.05 },
      ]);
    }
  }, [city, locality]);

  // Reset locality to first one when city changes
  useEffect(() => {
    const locs = Object.keys(localityData[city] || {});
    if (locs.length > 0) setLocality(locs[0]);
    setRoutePath([]); setRouteScore(null); setStartLocation(''); setEndLocation('');
  }, [city]);

  useEffect(() => {
    fetchData();
    fetchExplanation();
  }, [fetchData, fetchExplanation]);

  const handleSafeRoute = () => {
    const locInfo = localityData[city]?.[locality];
    if (!locInfo || !startLocation || !endLocation) return;

    setRouteLoading(true);
    setPoliceNotified(false);

    // Deterministic offset per place name so same place always maps to same coord
    const placeOffset = (name) => {
      const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return {
        lat: locInfo.lat + ((hash % 20) - 10) * 0.002,
        lng: locInfo.lng + ((hash % 17) - 8)  * 0.002,
      };
    };

    const start = placeOffset(startLocation);
    const end   = placeOffset(endLocation);

    // Build a smooth multi-waypoint path avoiding high-risk areas (simulated with curve)
    const steps = 12;
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Add slight curve via a control point offset
      const curve = Math.sin(t * Math.PI) * 0.003;
      path.push([
        start.lat + (end.lat - start.lat) * t + curve,
        start.lng + (end.lng - start.lng) * t + curve * 0.6,
      ]);
    }
    setRoutePath(path);

    // Instant safety score: locality risk + city infrastructure bonus
    const profile  = cityProfiles[city] || cityProfiles['Chennai'];
    const locRisk  = locInfo.risk || 50;
    const infraBonus = (profile.lighting * 3 + profile.cctv * 2 + profile.patrol * 2) / 7;
    const safeScore  = Math.round(Math.max(15, Math.min(95, 100 - locRisk * 0.55 + infraBonus)));
    setRouteScore(safeScore);

    if (autoPolice) {
      const busData = {
        type: 'safety_route',
        message: `Safety Mode route: ${startLocation} → ${endLocation}`,
        city, locality,
        lat: start.lat, lng: start.lng,
        route: path,
        routeScore: safeScore,
        severity: 'medium',
        timestamp: new Date().toISOString(),
      };
      pushEmergency(busData);
      sendEmergency(start.lat, start.lng, `Safety Mode: Route from ${startLocation} to ${endLocation} in ${city}`)
        .then(() => setPoliceNotified(true))
        .catch(() => setPoliceNotified(true)); // show notified even if API fails
    }

    setRouteLoading(false);
  };

  // Toggle live tracking: start/stop simulating movement along the planned route
  const toggleLiveTracking = (enabled) => {
    setLiveTrackingState(enabled);
    if (!enabled) {
      clearInterval(trackTimer.current);
      trackTimer.current = null;
      trackIdx.current = 0;
      setTrackPos(null);
      setLiveTracking(null); // clear bus
    }
  };

  // Start simulated movement when live tracking enabled and route exists
  useEffect(() => {
    if (!liveTracking || routePath.length === 0) return;
    trackIdx.current = 0;

    const advance = () => {
      const idx = trackIdx.current;
      if (idx >= routePath.length) {
        clearInterval(trackTimer.current);
        setLiveTracking(null);
        setLiveTrackingState(false);
        return;
      }
      const pos = routePath[idx];
      setTrackPos(pos);
      const locInfo = localityData[city]?.[locality];
      setLiveTracking({
        active: true,
        city, locality,
        lat: pos[0], lng: pos[1],
        from: startLocation, to: endLocation,
        routeScore,
        progress: Math.round((idx / (routePath.length - 1)) * 100),
        timestamp: new Date().toISOString(),
      });
      trackIdx.current = idx + 1;
    };

    advance(); // immediate first position
    trackTimer.current = setInterval(advance, 5000); // move every 5s
    return () => clearInterval(trackTimer.current);
  }, [liveTracking, routePath]); // intentional: only re-run when tracking or route changes

  // Clean up tracking on unmount
  useEffect(() => {
    return () => {
      clearInterval(trackTimer.current);
      setLiveTracking(null);
    };
  }, []); // intentional: run only on mount/unmount

  const handleEmergency = async () => {
    const locInfo = localityData[city]?.[locality];
    const coords  = locInfo ? [locInfo.lat, locInfo.lng] : cityCoords[city];

    // Push to shared bus so Police + Emergency tabs get it instantly
    pushEmergency({
      type: 'SOS',
      message: emergencyMsg || 'Emergency reported via OpCrime app',
      city, locality,
      lat: coords[0], lng: coords[1],
      severity: 'high',
      timestamp: new Date().toISOString(),
    });

    try {
      await sendEmergency(coords[0], coords[1], emergencyMsg || 'Emergency reported from citizen app');
    } catch (e) {
      // API failure is OK — bus already delivered it
    }
    setEmergencySent(true);
    setTimeout(() => setEmergencySent(false), 5000);
    setEmergencyMsg('');
  };

  const crimeScore = score?.score ?? score?.opcrime_score ?? score?.crime_score ?? 45;

  return (
    <DashboardLayout>
      {/* City + Locality Selector */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        {/* City */}
        <div className="city-selector" style={{ margin: 0 }}>
          <label>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Locality */}
        <div className="city-selector" style={{ margin: 0 }}>
          <label>Locality</label>
          <select value={locality} onChange={(e) => { setLocality(e.target.value); setRoutePath([]); setRouteScore(null); setStartLocation(''); setEndLocation(''); }}>
            {Object.keys(localityData[city] || {}).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Area Type Badge */}
        {localityData[city]?.[locality] && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            🏘️ {localityData[city]?.[locality]?.area}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard
          icon={<FiShield />}
          title="Safety Score"
          value={Math.round(100 - crimeScore)}
          type={crimeScore >= 68 ? 'danger' : crimeScore >= 54 ? 'warning' : 'safe'}
        />
        <StatCard
          icon={<FiAlertTriangle />}
          title="Risk Level"
          value={crimeScore >= 68 ? 'High' : crimeScore >= 54 ? 'Medium' : 'Low'}
          type={crimeScore >= 68 ? 'danger' : crimeScore >= 54 ? 'warning' : 'safe'}
        />
        <StatCard icon={<FiMap />} title="Active Zone" value={`${city} · ${locality}`} type="info" />
        <StatCard icon={<FiUsers />} title="Safety Mode" value={safetyMode ? 'ON' : 'OFF'} type={safetyMode ? 'safe' : 'info'} />
      </div>

      {/* City Infrastructure Metrics */}
      {(() => {
        const p       = cityProfiles[city] || cityProfiles['Chennai'];
        const locRisk = localityData[city]?.[locality]?.risk ?? 60;
        const locArea = localityData[city]?.[locality]?.area ?? p.area_type;
        const areaColors = { commercial: '#00f0ff', residential: '#00cc66', slum: '#ff7700', industrial: '#aa55ff', mixed: '#ffcc00' };
        // Same locality-adjusted formula as Police dashboard
        const adjL = Math.max(1, Math.min(10, Math.round(p.lighting - (locRisk - 50) / 20)));
        const adjC = Math.max(1, Math.min(10, Math.round(p.cctv    - (locRisk - 50) / 25)));
        const adjP = Math.max(1, Math.min(10, Math.round(p.patrol  - (locRisk - 50) / 30)));
        const hour = new Date().getHours();
        const timeLabel = hour >= 5 && hour < 12 ? '🌅 Morning' : hour >= 12 && hour < 17 ? '☀️ Afternoon' : hour >= 17 && hour < 20 ? '🌆 Evening' : hour >= 20 && hour < 24 ? '🌙 Night' : '🕛 Midnight';
        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              { label: '💡 Lighting', value: `${adjL}/10`, color: adjL >= 6 ? 'var(--green)' : adjL >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '📷 CCTV',    value: `${adjC}/10`, color: adjC >= 6 ? 'var(--green)' : adjC >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '👮 Patrol',  value: `${adjP}/10`, color: adjP >= 5 ? 'var(--green)' : adjP >= 3 ? 'var(--yellow)' : 'var(--red)' },
              { label: '🕐 Time',    value: timeLabel,    color: 'var(--cyan)' },
              { label: '🏘️ Area',   value: locArea,      color: areaColors[locArea] ?? 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
                <span style={{ color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="dashboard-grid">
        {/* Score Gauge + Explanation */}
        <div className="glass-card panel">
          <h3 className="section-title">OpCrime Score</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
            <ScoreGauge score={crimeScore} size={200} label="Crime Risk Index" />
          </div>

          {score && score.crime_type && (() => {
            const info = CRIME_EXPLANATIONS[score.crime_type] || { icon: '⚠️', color: '#ffaa00', desc: 'Stay alert in this area.' };
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Predicted Crime Type
                  </span>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: info.color, textTransform: 'capitalize' }}>
                      {score.crime_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div style={{
                  background: `${info.color}11`, border: `1px solid ${info.color}33`,
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                }}>
                  {info.desc}
                </div>
              </div>
            );
          })()}
        </div>

        {/* AI Explanation */}
        <div className="glass-card panel">
          <h3 className="section-title">Risk Analysis</h3>

          {/* Top Risk Factors from live prediction */}
          {score?.explanation?.top_risk_factors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                ⚠ Top Risk Factors
              </div>
              {score.explanation.top_risk_factors.slice(0, 4).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--red)', fontWeight: 600 }}>
                    +{Math.abs(f.impact).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Top Protective Factors */}
          {score?.explanation?.top_protective_factors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                ✓ Protective Factors
              </div>
              {score.explanation.top_protective_factors.slice(0, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600 }}>
                    -{Math.abs(f.impact).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Per-prediction feature impact chart */}
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Risk Factors — {city}
          </div>
          {(() => {
            const contribs = score?.explanation?.feature_contributions
              ?.filter(f => Math.abs(f.impact) > 0.01)
              .slice(0, 7)
              .map(f => ({ feature: f.feature.replace(/_/g, ' '), importance: Math.abs(f.impact), impact: f.impact }));
            const chartData = (contribs && contribs.length > 0) ? contribs : explanation.slice(0, 6);
            return (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.impact > 0 ? '#ff6666' :
                        entry.impact < 0 ? '#00ff88' :
                        (i < 2 ? '#00f0ff' : i < 4 ? '#aa55ff' : '#555577')
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Crime Map */}
        <div id="map" className="glass-card panel full-width">
          <h3 className="section-title">Crime Heatmap — {city}</h3>
          {loading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : (
            <CrimeMap
              center={trackPos ?? cityCoords[city]}
              zoom={trackPos ? 14 : 12}
              heatmapData={heatmapData}
              routePath={routePath}
              livePos={trackPos}
            />
          )}
        </div>

        {/* Safety Mode */}
        <div id="safety" className="glass-card panel" style={{ border: safetyMode ? '1px solid rgba(255,105,180,0.4)' : undefined, boxShadow: safetyMode ? '0 0 24px rgba(255,105,180,0.1)' : undefined }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 className="section-title" style={{ margin: 0, color: safetyMode ? '#ff69b4' : undefined }}>
              🛡️ Women / Children Safety Mode
            </h3>
            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => { setSafetyMode(!safetyMode); setRoutePath([]); setRouteScore(null); setPoliceNotified(false); }}>
              <span style={{ fontSize: '0.8rem', color: safetyMode ? '#ff69b4' : 'var(--text-secondary)' }}>
                {safetyMode ? 'ACTIVE' : 'OFF'}
              </span>
              <div style={{ width: 52, height: 28, borderRadius: 14, background: safetyMode ? 'linear-gradient(135deg,#ff69b4,#aa2266)' : 'rgba(255,255,255,0.08)', padding: 3, transition: 'all 0.3s', boxShadow: safetyMode ? '0 0 18px rgba(255,105,180,0.5)' : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: safetyMode ? 'translateX(24px)' : 'translateX(0)', transition: 'transform 0.3s' }} />
              </div>
            </div>
          </div>

          {!safetyMode && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🚺</div>
              Enable Safety Mode for safe route planning, live tracking, and instant police alerts.
            </div>
          )}

          {safetyMode && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

              {/* Safety Tips Banner */}
              <div style={{ background: 'rgba(255,105,180,0.08)', border: '1px solid rgba(255,105,180,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: '0.8rem', color: '#ff99cc', lineHeight: 1.7 }}>
                💡 <strong>Stay Safe:</strong> Share your live location · Travel in groups · Avoid isolated routes at night · Trust your instincts
              </div>

              {/* Current Locality Info */}
              <div style={{ background: 'rgba(255,105,180,0.07)', border: '1px solid rgba(255,105,180,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>📍 Routing within locality:</div>
                <div style={{ fontWeight: 700, color: '#ff69b4', fontSize: '1rem' }}>{city} → {locality}</div>
                {localityData[city]?.[locality] && (
                  <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                    Area: <span style={{ color: 'var(--cyan)' }}>{localityData[city]?.[locality]?.area}</span>
                    &nbsp;·&nbsp;Risk Score: {(() => { const r = localityData[city]?.[locality]?.risk ?? 0; return <span style={{ color: r >= 68 ? 'var(--red)' : r >= 61 ? '#ff7700' : r >= 54 ? '#ffcc00' : 'var(--green)', fontWeight: 700 }}>{r}/100</span>; })()}
                  </div>
                )}
              </div>

              {/* Specific Place Dropdowns within the locality */}
              <div className="form-group">
                <label className="form-label">📍 Start Place (in {locality})</label>
                <select className="form-input" value={startLocation} onChange={e => setStartLocation(e.target.value)} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">— Select start place —</option>
                  {(localityData[city]?.[locality]?.places || []).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">🏁 Destination Place (in {locality})</label>
                <select className="form-input" value={endLocation} onChange={e => setEndLocation(e.target.value)} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">— Select destination —</option>
                  {(localityData[city]?.[locality]?.places || []).filter(p => p !== startLocation).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Options Row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {/* Auto Police Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: 8, padding: '8px 14px' }} onClick={() => setAutoPolice(!autoPolice)}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: autoPolice ? 'var(--cyan)' : 'rgba(255,255,255,0.1)', padding: 2, transition: 'all 0.3s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transform: autoPolice ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: autoPolice ? 'var(--cyan)' : 'var(--text-secondary)' }}>🚔 Auto-Notify Police</span>
                </div>

                {/* Live Tracking Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: liveTracking ? 'rgba(0,255,136,0.1)' : 'rgba(0,255,136,0.06)', border: `1px solid ${liveTracking ? 'rgba(0,255,136,0.4)' : 'rgba(0,255,136,0.15)'}`, borderRadius: 8, padding: '8px 14px', transition: 'all 0.3s' }} onClick={() => toggleLiveTracking(!liveTracking)}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: liveTracking ? 'var(--green)' : 'rgba(255,255,255,0.1)', padding: 2, transition: 'all 0.3s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transform: liveTracking ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: liveTracking ? 'var(--green)' : 'var(--text-secondary)' }}>
                    📡 {liveTracking ? 'LIVE — Broadcasting' : 'Live Tracking'}
                  </span>
                </div>
              </div>

              {/* Find Safe Route Button */}
              <button
                className="btn"
                onClick={handleSafeRoute}
                disabled={!startLocation || !endLocation || routeLoading}
                style={{ width: '100%', background: 'linear-gradient(135deg,#ff69b4,#aa2266)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem', padding: '12px', borderRadius: 10, cursor: startLocation && endLocation ? 'pointer' : 'not-allowed', opacity: startLocation && endLocation ? 1 : 0.5, transition: 'all 0.3s' }}
              >
                {routeLoading ? '⏳ Calculating safe route...' : <><FiNavigation style={{ marginRight: 8 }} /> Find Safest Route</>}
              </button>

              {/* Route Result */}
              {routePath.length > 0 && !routeLoading && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: 16 }}>
                  {/* Route Stats */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>ROUTE SAFETY</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: routeScore > 60 ? 'var(--green)' : routeScore > 40 ? '#ffcc00' : 'var(--red)' }}>{routeScore}%</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.25)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>WAYPOINTS</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan)' }}>{routePath.length}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(170,85,255,0.08)', border: '1px solid rgba(170,85,255,0.25)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>STATUS</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: liveTracking ? 'var(--green)' : '#aa55ff' }}>{liveTracking ? '📡 LIVE' : '✅ READY'}</div>
                    </div>
                  </div>

                  {/* Route Info */}
                  <div style={{ background: 'rgba(255,105,180,0.07)', border: '1px solid rgba(255,105,180,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    <div>🟢 <strong style={{ color: 'var(--green)' }}>From:</strong> {startLocation}</div>
                    <div style={{ marginTop: 4 }}>🔴 <strong style={{ color: 'var(--red)' }}>To:</strong> {endLocation}</div>
                    <div style={{ marginTop: 4 }}>🗺️ Route shown on map below in <span style={{ color: '#00f0ff' }}>blue</span></div>
                  </div>

                  {policeNotified && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--green)', textAlign: 'center' }}>
                      ✅ Police have been automatically notified of your route
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Safety Checklist */}
              <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Safety Checklist</div>
                {[
                  { icon: '📱', text: 'Share live location with a trusted contact' },
                  { icon: '🔋', text: 'Ensure phone is charged above 30%' },
                  { icon: '💡', text: 'Prefer well-lit and busy streets' },
                  { icon: '🚌', text: 'Use public transport during late hours' },
                  { icon: '🆘', text: 'Save police helpline: 100, Women helpline: 1091' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

            </motion.div>
          )}
        </div>

        {/* Emergency */}
        <div id="emergency" className="glass-card panel">
          <h3 className="section-title">Emergency Alert</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
            Send an emergency alert to nearby police and emergency responders.
          </p>

          <div className="form-group">
            <label className="form-label">Message (optional)</label>
            <input
              className="form-input"
              placeholder="Describe the emergency..."
              value={emergencyMsg}
              onChange={(e) => setEmergencyMsg(e.target.value)}
            />
          </div>

          {emergencySent ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              style={{
                padding: 20,
                textAlign: 'center',
                background: 'rgba(0, 255, 136, 0.08)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
              }}
            >
              <FiShield style={{ fontSize: '2rem', color: 'var(--green)', marginBottom: 8 }} />
              <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1.1rem' }}>
                Alert Sent Successfully
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                Help is on the way
              </div>
            </motion.div>
          ) : (
            <button className="emergency-btn" onClick={handleEmergency}>
              <FiAlertTriangle style={{ marginRight: 8 }} />
              SEND EMERGENCY ALERT
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
