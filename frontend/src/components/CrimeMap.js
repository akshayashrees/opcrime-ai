import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const crimeIcons = {
  theft:           '🔴',
  burglary:        '🟠',
  assault:         '🔴',
  robbery:         '🟣',
  chain_snatching: '🟡',
  eve_teasing:     '🔶',
  vandalism:       '🔵',
  vehicle_theft:   '🟠',
};

function createPulsingIcon(score) {
  const color = score >= 68 ? '#ff3366' : score >= 61 ? '#ff7700' : score >= 54 ? '#ffcc00' : '#00cc66';
  const size  = score >= 68 ? 22 : score >= 61 ? 18 : score >= 54 ? 16 : 14;
  const html = `
    <div style="
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; border:2px solid #fff;
      box-shadow:0 0 12px ${color}, 0 0 24px ${color}44;
      animation: mapPulse 2s ease-in-out infinite;
      position:relative;
    ">
      <div style="
        position:absolute; inset:-6px; border-radius:50%;
        border:2px solid ${color}; opacity:0.4;
        animation: mapRipple 2s ease-out infinite;
      "></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size] });
}

function createRouteIcon(type) {
  const emoji = type === 'start' ? '🟢' : '🏁';
  return L.divIcon({ html: `<div style="font-size:24px;filter:drop-shadow(0 0 6px #00ff88)">${emoji}</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

// Colour based on absolute 0-1 intensity (risk/100)
// Recalibrated scores range 45–74, so thresholds are shifted accordingly
function riskColor(intensity) {
  if (intensity >= 0.68) return '#ff3366';   // critical  ≥ 68
  if (intensity >= 0.61) return '#ff7700';   // high      61–68
  if (intensity >= 0.54) return '#ffcc00';   // medium    54–61
  return '#00cc66';                          // safe      < 54
}

// Geographic circles — zoom-consistent at any level
function HeatmapLayer({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <>
      {data.map((point, i) => {
        const intensity = point[2] ?? 0.5;
        const color = riskColor(intensity);
        const opacity = 0.18 + intensity * 0.22;   // 0.18 (safe) → 0.40 (critical)
        return (
          <React.Fragment key={`heat-${i}`}>
            {/* Outer glow ring */}
            <Circle
              center={[point[0], point[1]]}
              radius={1800}
              pathOptions={{ color, fillColor: color, fillOpacity: opacity * 0.4, weight: 0, opacity: 0 }}
            />
            {/* Core circle */}
            <Circle
              center={[point[0], point[1]]}
              radius={900}
              pathOptions={{ color, fillColor: color, fillOpacity: opacity, weight: 0.5, opacity: 0.3 }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
}

// Risk legend overlay
function MapLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 30, right: 10, zIndex: 1000,
      background: 'rgba(10,12,30,0.88)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.75rem', color: '#ccc',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#00f0ff', letterSpacing: 1 }}>RISK LEVEL</div>
      {[['#00cc66','Low  (< 54)'],['#ffcc00','Medium (54–61)'],['#ff7700','High (61–68)'],['#ff3366','Critical (≥ 68)']].map(([c, l]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

// Live tracking citizen icon (glowing green dot)
function createLivePosIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#00ff88;box-shadow:0 0 14px #00ff88,0 0 28px rgba(0,255,136,0.5);animation:mapPulse 1s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid #00ff88;opacity:0.4;animation:mapRipple 1.5s ease-out infinite;"></div>
      <div style="position:absolute;inset:6px;border-radius:50%;background:#fff;"></div>
    </div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

export default function CrimeMap({
  center = [13.0827, 80.2707],
  zoom = 12,
  heatmapData = [],
  hotspots = [],
  routePath = [],
  markers = [],
  livePos = null,   // [lat, lng] — citizen live tracking position
  style = {},
  height = '480px',
}) {
  const [selectedSpot, setSelectedSpot] = useState(null);

  return (
    <div className="map-container" style={{ height, position: 'relative', borderRadius: 12, overflow: 'hidden', ...style }}>
      <style>{`
        @keyframes mapPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.3);} }
        @keyframes mapRipple { 0%{transform:scale(1);opacity:0.5;} 100%{transform:scale(2.5);opacity:0;} }
        .leaflet-popup-content-wrapper { background:rgba(10,12,30,0.95)!important; border:1px solid rgba(0,240,255,0.3)!important; border-radius:10px!important; color:#e0e0ff!important; backdrop-filter:blur(12px); }
        .leaflet-popup-tip { background:rgba(10,12,30,0.95)!important; }
        .leaflet-popup-close-button { color:#00f0ff!important; }
      `}</style>

      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <RecenterMap center={center} />
        {heatmapData.length > 0 && <HeatmapLayer data={heatmapData} />}

        {/* Hotspot markers with pulse animation */}
        {hotspots.map((spot, i) => {
          const lat = spot.lat ?? spot.latitude ?? 0;
          const lng = spot.lng ?? spot.longitude ?? 0;
          const score = spot.avg_score ?? spot.score ?? 50;
          const crimeType = spot.crime_type ?? 'theft';
          if (!lat || !lng) return null;
          return (
            <React.Fragment key={`hs-${i}`}>
              <Circle
                center={[lat, lng]}
                radius={score >= 68 ? 600 : score >= 54 ? 480 : 360}
                pathOptions={{
                  color: score >= 68 ? '#ff3366' : score >= 61 ? '#ff7700' : score >= 54 ? '#ffcc00' : '#00cc66',
                  fillColor: score >= 68 ? '#ff3366' : score >= 61 ? '#ff7700' : score >= 54 ? '#ffcc00' : '#00cc66',
                  fillOpacity: 0.12,
                  weight: 1,
                  opacity: 0.5,
                }}
              />
              <Marker
                position={[lat, lng]}
                icon={createPulsingIcon(score)}
                eventHandlers={{ click: () => setSelectedSpot(i) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>{crimeIcons[crimeType] || '🔴'}</span>
                      <strong style={{ color: '#00f0ff', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                        {spot.name || `Hotspot #${i + 1}`}
                      </strong>
                    </div>
                    <div style={{ display: 'grid', gap: 4, fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>OpCrime Score</span>
                        <strong style={{ color: score >= 68 ? '#ff3366' : score >= 61 ? '#ff7700' : score >= 54 ? '#ffcc00' : '#00cc66' }}>
                          {score.toFixed(1)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Crime Type</span>
                        <strong style={{ color: '#ffaa00', textTransform: 'capitalize' }}>
                          {crimeType.replace(/_/g, ' ')}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Cluster</span>
                        <span style={{ color: '#aa55ff' }}>Zone {spot.cluster ?? i}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Coords</span>
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>{lat.toFixed(3)}, {lng.toFixed(3)}</span>
                      </div>
                    </div>
                    <div style={{
                      marginTop: 8, padding: '4px 8px', borderRadius: 4, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700,
                      background: score >= 68 ? 'rgba(255,51,102,0.2)' : score >= 61 ? 'rgba(255,119,0,0.2)' : score >= 54 ? 'rgba(255,204,0,0.2)' : 'rgba(0,204,102,0.2)',
                      color: score >= 68 ? '#ff3366' : score >= 61 ? '#ff7700' : score >= 54 ? '#ffcc00' : '#00cc66',
                      border: `1px solid ${score >= 68 ? '#ff336644' : score >= 61 ? '#ff770044' : score >= 54 ? '#ffcc0044' : '#00cc6644'}`,
                    }}>
                      {score >= 68 ? '⚠ CRITICAL ZONE' : score >= 61 ? '🔶 HIGH RISK' : score >= 54 ? '⚡ MODERATE RISK' : '✓ SAFE ZONE'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Custom markers */}
        {markers.map((m, i) => (
          <Marker key={`m-${i}`} position={[m.latitude ?? m.lat, m.longitude ?? m.lng]} icon={createPulsingIcon(m.score || 50)}>
            {m.popup && <Popup><div style={{ color: '#e0e0ff', fontSize: '0.85rem' }}>{m.popup}</div></Popup>}
          </Marker>
        ))}

        {/* Safe route path */}
        {routePath.length > 1 && (
          <>
            <Polyline positions={routePath} pathOptions={{ color: '#00ff88', weight: 5, opacity: 0.9, dashArray: '12 6' }} />
            <Marker position={routePath[0]} icon={createRouteIcon('start')}>
              <Popup><div style={{ color: '#e0e0ff' }}>🟢 Start Point</div></Popup>
            </Marker>
            <Marker position={routePath[routePath.length - 1]} icon={createRouteIcon('end')}>
              <Popup><div style={{ color: '#e0e0ff' }}>🏁 Destination</div></Popup>
            </Marker>
            <FitBounds bounds={[routePath[0], routePath[routePath.length - 1]]} />
          </>
        )}

        {/* Live citizen position — glowing green dot */}
        {livePos && (
          <Marker position={livePos} icon={createLivePosIcon()}>
            <Popup>
              <div style={{ color: '#00ff88', fontWeight: 700, minWidth: 140 }}>
                📡 Citizen Live Position
                <div style={{ color: '#888', fontWeight: 400, fontSize: '0.8rem', marginTop: 4 }}>
                  {livePos[0].toFixed(4)}, {livePos[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Risk Legend */}
      <MapLegend />

      {/* Stats bar */}
      {hotspots.length > 0 && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 1000,
          background: 'rgba(10,12,30,0.88)', border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem',
          display: 'flex', gap: 16, backdropFilter: 'blur(8px)',
        }}>
          <span style={{ color: '#ff3366' }}>🔴 {hotspots.filter(h => (h.score ?? h.avg_score ?? 0) >= 68).length} Critical</span>
          <span style={{ color: '#ff7700' }}>🟠 {hotspots.filter(h => { const s = h.score ?? h.avg_score ?? 0; return s >= 54 && s < 68; }).length} Med</span>
          <span style={{ color: '#00cc66' }}>🟢 {hotspots.filter(h => (h.score ?? h.avg_score ?? 0) < 54).length} Safe</span>
        </div>
      )}
    </div>
  );
}
