import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/common/DashboardLayout';
import CrimeMap from '../components/common/CrimeMap';
import StatCard from '../components/common/StatCard';
import { FiTarget, FiTrendingDown, FiZap, FiCheckCircle, FiShield } from 'react-icons/fi';
import { motion } from 'framer-motion';

import { localityData, cityLocations, cityProfiles, cityCoords, cities } from '../data/localityData';

function riskColor(score) {
  if (score >= 68) return 'var(--red)';
  if (score >= 61) return '#ff7700';
  if (score >= 54) return 'var(--yellow)';
  return 'var(--green)';
}

// Generate risk zones from localityData sorted by risk desc
const generateRiskZones = (city) => {
  return Object.entries(localityData[city] || {})
    .map(([name, d]) => ({
      zone: name,
      score: d.risk,
      area_type: d.area,
      lat: d.lat,
      lng: d.lng,
      latitude: d.lat,
      longitude: d.lng,
      change: d.risk >= 70 ? '+' + Math.round((d.risk - 60) / 3) : d.risk >= 50 ? '+' + Math.round((d.risk - 45) / 4) : '-' + Math.round((55 - d.risk) / 5),
    }))
    .sort((a, b) => b.score - a.score);
};

// Generate locality-aware AI suggestions
const generateSuggestions = (city, locality) => {
  const loc = localityData[city]?.[locality];
  if (!loc) return [];
  const profile = cityProfiles[city];
  const suggestions = [];
  if (profile.lighting < 6) suggestions.push({ priority: 'High', action: `Install 25 LED streetlights along ${loc.places[0]} and ${loc.places[1] || locality} main road`, impact: `Reduces night crime by ~35% in ${locality}`, cost: '₹12.5L', category: 'Infrastructure' });
  if (profile.cctv < 6) suggestions.push({ priority: 'High', action: `Deploy 8 CCTV cameras at ${loc.places[0]}, ${loc.places[2] || locality} junction`, impact: 'Continuous surveillance coverage, 40% deterrence', cost: '₹8.2L', category: 'Surveillance' });
  if (loc.risk >= 65) suggestions.push({ priority: 'Critical', action: `Increase police patrol frequency in ${locality} from ${profile.patrol}/10 to 8/10`, impact: `High-risk ${loc.area} zone — 50% crime reduction expected`, cost: '₹3.8L/month', category: 'Policing' });
  if (loc.area === 'slum') suggestions.push({ priority: 'Medium', action: `Community outreach program at ${locality} — youth engagement and rehabilitation`, impact: 'Long-term 20% crime rate reduction', cost: '₹2.1L', category: 'Social' });
  suggestions.push({ priority: 'Low', action: `Install emergency SOS poles at ${loc.places[Math.floor(loc.places.length / 2)] || locality}`, impact: 'Faster emergency response times', cost: '₹1.5L', category: 'Safety' });
  return suggestions;
};

export default function MunicipalDashboard() {
  const [city, setCity] = useState('Chennai');
  const [locality, setLocality] = useState('T. Nagar');
  const [riskZones, setRiskZones] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [addCctv, setAddCctv] = useState(10);
  const [addLights, setAddLights] = useState(20);
  const [addPatrols, setAddPatrols] = useState(5);
  const [budgetResult, setBudgetResult] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  const fetchData = useCallback(async () => {
    // Generate risk zones from localityData
    const zones = generateRiskZones(city);
    setRiskZones(zones);

    // Generate locality-aware suggestions
    const sug = generateSuggestions(city, locality);
    setSuggestions(sug);

    // Build heatmap using absolute risk/100 — green < 0.4, yellow 0.4–0.65, red > 0.65
    const allLocs = Object.values(localityData[city] || {});
    if (allLocs.length > 0) {
      setHeatmapData(allLocs.map(l => [l.lat, l.lng, l.risk / 100]));
    }
  }, [city, locality]);

  // Reset locality to first of new city when city changes
  useEffect(() => {
    const locs = Object.keys(localityData[city] || {});
    if (locs.length > 0) setLocality(locs[0]);
    setBudgetResult(null);
  }, [city]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBudget = () => {
    setBudgetLoading(true);
    const loc     = localityData[city]?.[locality];
    const locRisk = loc?.risk ?? 60;
    // Always use local calculation for consistency — no API dependency
    const totalCost        = addCctv * 50000 + addLights * 15000 + addPatrols * 80000;
    const reductionPts     = Math.min(18, (addCctv * 0.4 + addLights * 0.25 + addPatrols * 0.7) * (locRisk / 65));
    const reductionPct     = Math.min(35, (addCctv * 0.5 + addLights * 0.3  + addPatrols * 0.8) * (locRisk / 65));
    const months           = totalCost < 500000 ? '1–2 months' : totalCost < 2000000 ? '3–6 months' : '6–12 months';
    setBudgetResult({
      total_cost: totalCost,
      estimated_time: months,
      score_reduction_pts: reductionPts,
      locality_reduction: reductionPct,
      locality,
    });
    setBudgetLoading(false);
  };

  const highRiskCount = riskZones.filter((z) => z.score >= 61).length;
  const avgRisk = riskZones.length
    ? (riskZones.reduce((s, z) => s + z.score, 0) / riskZones.length).toFixed(1)
    : 0;

  // Get locality map center
  const localityCoord = cityLocations[city]?.find(l => l.name === locality);
  const mapCenter = localityCoord ? [localityCoord.lat, localityCoord.lng] : cityCoords[city];

  return (
    <DashboardLayout>
      {/* City + Locality Selector */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="city-selector" style={{ margin: 0 }}>
          <label>Locality</label>
          <select value={locality} onChange={(e) => setLocality(e.target.value)}>
            {Object.keys(localityData[city] || {}).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? '🌅 Morning' : h >= 12 && h < 17 ? '☀️ Afternoon' : h >= 17 && h < 20 ? '🌆 Evening' : h >= 20 && h < 24 ? '🌙 Night' : '🕛 Midnight'; })()}
        </div>
      </div>

      {/* Condition Chips — consistent with Citizen, Police, Emergency */}
      {(() => {
        const p       = cityProfiles[city] || cityProfiles['Chennai'];
        const locRisk = localityData[city]?.[locality]?.risk ?? 60;
        const locArea = localityData[city]?.[locality]?.area ?? p.area_type;
        const areaColors = { commercial: '#00f0ff', residential: '#00cc66', slum: '#ff7700', industrial: '#aa55ff', mixed: '#ffcc00' };
        const adjL = Math.max(1, Math.min(10, Math.round(p.lighting - (locRisk - 50) / 20)));
        const adjC = Math.max(1, Math.min(10, Math.round(p.cctv    - (locRisk - 50) / 25)));
        const adjP = Math.max(1, Math.min(10, Math.round(p.patrol  - (locRisk - 50) / 30)));
        const h = new Date().getHours();
        const timeLabel = h >= 5 && h < 12 ? '🌅 Morning' : h >= 12 && h < 17 ? '☀️ Afternoon' : h >= 17 && h < 20 ? '🌆 Evening' : h >= 20 && h < 24 ? '🌙 Night' : '🕛 Midnight';
        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: '💡 Lighting', value: `${adjL}/10`, color: adjL >= 6 ? 'var(--green)' : adjL >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '📷 CCTV',    value: `${adjC}/10`, color: adjC >= 6 ? 'var(--green)' : adjC >= 4 ? 'var(--yellow)' : 'var(--red)' },
              { label: '👮 Patrol',  value: `${adjP}/10`, color: adjP >= 5 ? 'var(--green)' : adjP >= 3 ? 'var(--yellow)' : 'var(--red)' },
              { label: '🕐 Time',    value: timeLabel,    color: 'var(--cyan)' },
              { label: '🏘️ Area',   value: locArea,      color: areaColors[locArea] ?? 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
                <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="stats-grid">
        <StatCard icon={<FiTarget />}      title="Total Zones"     value={riskZones.length}  type="info" />
        <StatCard icon={<FiZap />}         title="High Risk Areas" value={highRiskCount}      type="danger" />
        <StatCard icon={<FiTrendingDown />} title="Avg City Score"  value={avgRisk}            type={parseFloat(avgRisk) >= 68 ? 'danger' : parseFloat(avgRisk) >= 54 ? 'warning' : 'safe'} />
        <StatCard icon={<FiShield />}      title={`${locality} Risk`} value={localityData[city]?.[locality]?.risk ?? '—'} type={localityData[city]?.[locality]?.risk >= 68 ? 'danger' : localityData[city]?.[locality]?.risk >= 54 ? 'warning' : 'safe'} />
      </div>

      <div className="dashboard-grid">
        {/* Risk Zones Table */}
        <div id="zones" className="glass-card panel">
          <h3 className="section-title">Risk Zones — {city}</h3>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone / Area</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Change</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {riskZones.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                      No risk zone data available
                    </td>
                  </tr>
                ) : (
                  riskZones.map((zone, i) => {
                    const score = zone.score;
                    return (
                      <tr key={i} style={{ background: zone.zone === locality ? 'rgba(0,240,255,0.05)' : 'transparent' }}>
                        <td style={{ fontWeight: zone.zone === locality ? 700 : 500 }}>
                          {zone.zone}
                          {zone.zone === locality && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--cyan)' }}>selected</span>}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{zone.area_type}</td>
                        <td>
                          <span
                            style={{
                              color: riskColor(score),
                              fontWeight: 700,
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {score.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ color: zone.change?.startsWith('+') ? 'var(--red)' : 'var(--green)', fontWeight: 600, fontSize: '0.83rem' }}>
                          {zone.change}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              score < 54 ? 'badge-success' : score < 61 ? 'badge-warning' : score < 68 ? 'badge-warning' : 'badge-danger'
                            }`}
                          >
                            {score < 54 ? 'Safe' : score < 61 ? 'Moderate' : score < 68 ? 'High' : 'Critical'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Suggestions */}
        <div id="suggestions" className="glass-card panel">
          <h3 className="section-title">Recommendations — {locality}</h3>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No suggestions available
              </div>
            ) : (
              suggestions.map((sug, i) => (
                <motion.div
                  key={i}
                  className="rec-card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FiCheckCircle
                      style={{ color: sug.priority === 'Critical' ? 'var(--red)' : sug.priority === 'High' ? 'var(--yellow)' : 'var(--cyan)', fontSize: '1.1rem', marginTop: 2, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {sug.action}
                      </div>
                      {sug.impact && (
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                          {sug.impact}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span
                          className={`badge ${
                            sug.priority === 'Critical' || sug.priority === 'High' ? 'badge-danger' : sug.priority === 'Medium' ? 'badge-warning' : 'badge-success'
                          }`}
                        >
                          {sug.priority} priority
                        </span>
                        {sug.category && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                            {sug.category}
                          </span>
                        )}
                        {sug.cost && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600, marginLeft: 'auto' }}>
                            {sug.cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Budget Estimation */}
        <div id="budget" className="glass-card panel">
          <h3 className="section-title">Budget Estimation — {locality}</h3>

          <div className="form-group">
            <label className="form-label">Additional CCTV Cameras</label>
            <input
              type="number"
              min="0"
              value={addCctv}
              onChange={(e) => setAddCctv(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Street Lights</label>
            <input
              type="number"
              min="0"
              value={addLights}
              onChange={(e) => setAddLights(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Patrol Units</label>
            <input
              type="number"
              min="0"
              value={addPatrols}
              onChange={(e) => setAddPatrols(Number(e.target.value))}
            />
          </div>

          <button
            className="btn btn-warning"
            style={{ width: '100%' }}
            onClick={handleBudget}
            disabled={budgetLoading}
          >
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹</span>
            {budgetLoading ? 'Calculating...' : 'Calculate Budget'}
          </button>

          {budgetResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
              {/* Line-by-line breakdown */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Cost Breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 16 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['Item', 'Qty', 'Unit Cost', 'Total'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Item' ? 'left' : 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'CCTV Cameras', qty: addCctv, unit: 50000 },
                    { label: 'Street Lights (LED)', qty: addLights, unit: 15000 },
                    { label: 'Patrol Units (monthly)', qty: addPatrols, unit: 80000 },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px', color: 'var(--text-secondary)' }}>{row.label}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--cyan)' }}>{row.qty}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>₹{row.unit.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--yellow)' }}>₹{(row.qty * row.unit).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(0,240,255,0.2)', background: 'rgba(0,240,255,0.04)' }}>
                    <td colSpan={3} style={{ padding: '9px 8px', fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>TOTAL INVESTMENT</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--cyan)', fontFamily: "'Inter', sans-serif", fontSize: '1rem' }}>
                      ₹{(typeof budgetResult.total_cost === 'number' ? budgetResult.total_cost : (addCctv * 50000 + addLights * 15000 + addPatrols * 80000)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ textAlign: 'center', padding: 14, background: 'rgba(0,240,255,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(0,240,255,0.15)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Timeline</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--cyan)' }}>
                    {budgetResult.estimated_time || budgetResult.timeline || '3–6 months'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: 14, background: 'rgba(0,255,136,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(0,255,136,0.15)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Crime Reduction</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 700, color: 'var(--green)' }}>
                    −{(budgetResult.locality_reduction ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {budgetResult.score_reduction_pts > 0 && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(0,255,136,0.04)', borderRadius: 'var(--radius)', border: '1px solid rgba(0,255,136,0.12)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Expected OpCrime score drop in <strong style={{ color: 'var(--green)' }}>{budgetResult.locality}</strong>: <strong style={{ color: 'var(--green)' }}>−{budgetResult.score_reduction_pts.toFixed(1)} pts</strong> · Crime rate: <strong style={{ color: 'var(--green)' }}>−{budgetResult.locality_reduction.toFixed(1)}%</strong>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Map */}
        <div id="map" className="glass-card panel">
          <h3 className="section-title">Risk Zone Map — {city}</h3>
          <CrimeMap
            center={mapCenter}
            zoom={13}
            heatmapData={heatmapData}
            hotspots={riskZones.filter((z) => z.latitude && z.longitude)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
