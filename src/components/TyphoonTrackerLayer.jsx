import React from 'react';
import { Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

const TyphoonTrackerLayer = ({ typhoons = [], activeTyphoonId, setActiveTyphoonId, selectedNodeIndex, setSelectedNodeIndex }) => {
  const map = useMap();
  if (typhoons.length === 0) return null;

  // Create a sleek, premium animated hurricane icon
  const createHurricaneIcon = (severity) => {
    const safeSeverity = severity || 'yellow';
    const color = safeSeverity.toLowerCase() === 'red' ? '#ef4444' 
                : safeSeverity.toLowerCase() === 'orange' ? '#f97316' 
                : '#eab308';
                
    return L.divIcon({
      className: 'custom-hurricane-icon',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <!-- Outer Pulsing Glow -->
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.3; animation: customPulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1);"></div>
          
          <!-- Inner Solid Circle -->
          <div style="position: absolute; width: 60%; height: 60%; border-radius: 50%; background-color: ${color}; box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.5);"></div>
          
          <!-- Standard Accurate Hurricane SVG -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" class="bi bi-hurricane" viewBox="0 0 16 16" style="z-index: 10; animation: customSpin 3s linear infinite;">
            <path d="M6.999 2.6A5.5 5.5 0 0 1 15 7.5a.5.5 0 0 0 1 0 6.5 6.5 0 1 0-13 0 5 5 0 0 0 6.001 4.9A5.5 5.5 0 0 1 1 7.5a.5.5 0 0 0-1 0 6.5 6.5 0 1 0 13 0 5 5 0 0 0-6.001-4.9M10 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>
          </svg>
        </div>
        <style>
          @keyframes customPulse {
            0% { transform: scale(0.6); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes customSpin {
            100% { transform: rotate(-360deg); }
          }
        </style>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'D': return '#3b82f6';
      case 'S': return '#10b981'; // Green for Tropical Storm
      case 'T': return '#f59e0b'; // Orange for Severe
      case 'ST': return '#ea580c'; // Dark Orange for Typhoon
      case 'VT': return '#dc2626';
      case 'SU': return '#db2777';
      default: return '#64748b';
    }
  };

  return (
    <>
      {typhoons.map(storm => {
        const isActive = activeTyphoonId === storm.id;
        
        return (
          <React.Fragment key={storm.id}>
            <Marker 
              position={[storm.lat, storm.lng]} 
              icon={createHurricaneIcon(storm.severity)}
              zIndexOffset={1000}
              eventHandlers={{
                click: (e) => {
                  if (e.originalEvent) e.originalEvent.stopPropagation();
                  if (setActiveTyphoonId) setActiveTyphoonId(storm.id);
                  map.flyTo([storm.lat, storm.lng], 7, { duration: 1.5 });
                }
              }}
            >
              <Popup>
                <div style={{ padding: '8px', minWidth: '220px', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ 
                      background: (storm.severity || '').toLowerCase() === 'red' ? '#fef2f2' : '#fff7ed', 
                      color: (storm.severity || '').toLowerCase() === 'red' ? '#ef4444' : '#f97316', 
                      border: `1px solid ${(storm.severity || '').toLowerCase() === 'red' ? '#fca5a5' : '#fdba74'}`,
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.65rem', 
                      fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}>
                      {(storm.severity || 'WARNING').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{storm.type} TRACK</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '700', letterSpacing: '-0.3px' }}>{storm.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                    {storm.description}
                  </p>
                </div>
              </Popup>
            </Marker>
            
            {/* Render the forecast and past trajectory line ONLY if clicked (active) */}
            {isActive && storm.track && storm.track.length > 0 && (
              <>
                {/* Connecting Polyline */}
                <Polyline 
                  positions={storm.track.map(t => [t.lat, t.lng])} 
                  pathOptions={{ color: 'rgba(255, 255, 255, 0.6)', weight: 3, dashArray: '5, 8' }} 
                />
                {/* Dots along the track */}
                {storm.track.map((t, idx) => {
                  const nodeTime = storm.timeline && storm.timeline[idx];
                  const nodeColor = nodeTime ? getTypeColor(nodeTime.type) : (t.intensity === 'red' ? '#ef4444' : t.intensity === 'orange' ? '#f97316' : '#eab308');
                  return (
                    <CircleMarker 
                      key={idx}
                      center={[t.lat, t.lng]}
                      radius={idx === selectedNodeIndex ? 8 : 5}
                      eventHandlers={{
                        click: (e) => {
                          if (e.originalEvent) e.originalEvent.stopPropagation();
                          if (setSelectedNodeIndex) setSelectedNodeIndex(idx);
                        }
                      }}
                      pathOptions={{ 
                        color: idx === selectedNodeIndex ? '#ffffff' : 'rgba(0,0,0,0.8)', 
                        weight: idx === selectedNodeIndex ? 2 : 1, 
                        fillColor: nodeColor,
                        fillOpacity: 1 
                      }}
                    >
                      {nodeTime && (
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div style={{ fontFamily: 'Inter, sans-serif', padding: '6px', minWidth: '180px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{nodeTime.date}</span>
                              <span style={{ color: '#ef4444' }}>{nodeTime.time}</span>
                            </div>
                            <div style={{ color: '#475569', fontSize: '12px', lineHeight: '1.5' }}>
                              <strong>{nodeTime.isPast ? 'Recorded' : 'Forecast'}:</strong> {nodeTime.wind} km/h winds.<br/>
                              <strong>Status:</strong> {nodeTime.type === 'ST' || nodeTime.type === 'VT' || nodeTime.type === 'SU' ? 'Typhoon' : nodeTime.type === 'T' ? 'Severe Tropical Storm' : 'Tropical Storm'}.
                            </div>
                          </div>
                        </Tooltip>
                      )}
                    </CircleMarker>
                  );
                })}
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default TyphoonTrackerLayer;
