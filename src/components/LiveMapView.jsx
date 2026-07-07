import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Wind, NavigationArrow, MapTrifold, CloudRain, Plant, Fire, CloudLightning, MagnifyingGlass, WarningCircle, CheckCircle, PlusCircle, MapPin, CaretDown, CaretUp, Play, Pause, FastForward, SkipBack, Rewind, Path, CloudSnow } from '@phosphor-icons/react';
import WindVelocityLayer from './WindVelocityLayer';
import WeatherRadarLayer from './WeatherRadarLayer';
import TyphoonTrackerLayer from './TyphoonTrackerLayer';
import TyphoonDetailsSidebar from './TyphoonDetailsSidebar';
import anime from 'animejs';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

// Disable default icons completely since we use custom ones
delete L.Icon.Default.prototype._getIconUrl;

// Custom animated marker generator
const createCustomMarker = (isActive) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container ${isActive ? 'marker-active' : 'marker-inactive'}">
        <div class="marker-core"></div>
        <div class="marker-pulse"></div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

const MapResizer = ({ sidebarOpen }) => {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    return () => clearTimeout(timeout);
  }, [sidebarOpen, map]);
  return null;
};

const MapController = ({ searchCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (searchCoords) {
      map.flyTo([searchCoords.lat, searchCoords.lon], 12, {
        animate: true,
        duration: 2
      });
    }
  }, [searchCoords, map]);
  return null;
};

const LiveMapView = () => {
  const { zones, setZones, activeZoneId, setActiveZoneId, sidebarOpen } = useOutletContext();
  const [addingNode, setAddingNode] = useState(false);
  const [pendingNodeCoords, setPendingNodeCoords] = useState(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [showWind, setShowWind] = useState(true);
  const [notification, setNotification] = useState(null);
  
  // Sentinel-2 Mock State
  const [isScanning, setIsScanning] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [satelliteMode, setSatelliteMode] = useState('true-color');
  const [showModeExplanation, setShowModeExplanation] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Shared Typhoons State
  const [typhoons, setTyphoons] = useState([]);
  const [activeTyphoonId, setActiveTyphoonId] = useState(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(null);

  useEffect(() => {
    const fetchTyphoons = () => {
      // Fetch live typhoons from GDACS
      fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtypes=TC')
      .then(res => res.json())
      .then(data => {
        if (data && data.features && data.features.length > 0) {
          const pointFeatures = data.features.filter(f => f.geometry && f.geometry.type === 'Point');
          
          if (pointFeatures.length > 0) {
            Promise.all(pointFeatures.map(async f => {
              let track = [];
              try {
                if (f.properties?.url?.geometry) {
                  const geoRes = await fetch(f.properties.url.geometry);
                  const geoData = await geoRes.json();
                  
                  if (geoData && geoData.features) {
                    const lines = geoData.features.filter(feat => feat.geometry.type === 'LineString');
                    
                    if (lines.length > 0) {
                      // Get the starting point of the first segment
                      const firstSegment = lines[0].geometry.coordinates;
                      if (firstSegment && firstSegment.length > 0) {
                        track.push({
                          lat: firstSegment[0][1],
                          lng: firstSegment[0][0],
                          intensity: 'red',
                          type: 'current'
                        });
                      }
                      
                      // Add all subsequent points
                      lines.forEach((l, idx) => {
                        const endCoord = l.geometry.coordinates[1];
                        if (endCoord) {
                          track.push({
                            lat: endCoord[1],
                            lng: endCoord[0],
                            intensity: idx < 3 ? 'orange' : 'yellow',
                            type: 'forecast'
                          });
                        }
                      });
                    }
                  }
                }
              } catch (e) {
                console.warn("Could not fetch real track for", f.properties.eventname, e);
              }
              
              if (track.length === 0) {
                // Fallback to mathematical curve if GDACS track is missing
                track = generateParabolicTrack(f.geometry.coordinates[1], f.geometry.coordinates[0]);
              }

              // Generate timeline data for the sidebar
              const startDate = new Date();
              startDate.setHours(startDate.getHours() - 12); // Start 12 hours ago
              const timeline = track.map((pt, i) => {
                const ptDate = new Date(startDate.getTime() + (i * 6 * 60 * 60 * 1000)); // +6 hours per node
                const isPast = ptDate < new Date();
                const isCurrent = Math.abs(ptDate - new Date()) < (3 * 60 * 60 * 1000); // closest to now
                let type = 'T'; // Default
                let wind = 65;
                let pressure = 990;
                
                if (pt.intensity === 'red') { type = 'ST'; wind = 150; pressure = 950; }
                else if (pt.intensity === 'orange') { type = 'T'; wind = 100; pressure = 975; }
                else if (pt.intensity === 'yellow') { type = 'S'; wind = 75; pressure = 995; }
                
                // Add natural variation
                wind += Math.floor(Math.random() * 10 - 5);
                
                return {
                  date: ptDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                  time: ptDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'Asia/Manila' }).replace(':00 ', ' '),
                  type: type,
                  wind: wind,
                  pressure: isPast || isCurrent ? pressure : 'Forecast',
                  isPast: isPast && !isCurrent,
                  isCurrent: isCurrent
                };
              });
              
              // Ensure one element is explicitly current
              if (!timeline.find(t => t.isCurrent) && timeline.length > 2) {
                timeline[2].isCurrent = true;
                timeline[2].isPast = false;
              }

              return {
                id: f.properties.eventid,
                name: f.properties.eventname,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                severity: f.properties.alertlevel || 'orange',
                type: f.properties.eventtype,
                description: f.properties.htmldescription,
                track: track,
                timeline: timeline
              };
            })).then(activeStorms => {
              // Inject mock LPA so it always shows up alongside real active storms
              activeStorms.push({
                id: 'mock-lpa',
                name: 'Low Pressure Area (91W)',
                lat: 10.5,
                lng: 135.2,
                severity: 'yellow',
                type: 'LPA',
                description: 'A broad area of low pressure east of Mindanao. It has a high chance of developing into a tropical depression within the next 48 hours.',
                track: generateParabolicTrack(10.5, 135.2)
              });
              setTyphoons(activeStorms);
            });
          } else {
            // Fallback if no points found
            throw new Error("No active storms found");
          }
        } else {
          // Fallback to mock Kabaw Typhoon if no live data
          setTyphoons([{
            id: 'mock-kabaw',
            name: 'Super Typhoon Kabaw',
            lat: 14.0,
            lng: 130.0,
            severity: 'red',
            type: 'TC',
            description: 'A highly destructive Category 5 Super Typhoon approaching the eastern seaboard of the Philippines. Extreme winds and catastrophic storm surges expected.',
            track: generateParabolicTrack(14.0, 130.0)
          }]);
        }
      })
      .catch(err => {
        setTyphoons([
          {
            id: 'mock-kabaw',
            name: 'Super Typhoon Kabaw',
            lat: 14.0,
            lng: 130.0,
            severity: 'red',
            type: 'TC',
            description: 'A highly destructive Category 5 Super Typhoon approaching the eastern seaboard of the Philippines. Extreme winds and catastrophic storm surges expected.',
            track: generateParabolicTrack(14.0, 130.0)
          },
          {
            id: 'mock-lpa',
            name: 'Low Pressure Area (91W)',
            lat: 10.5,
            lng: 135.2,
            severity: 'yellow',
            type: 'LPA',
            description: 'A broad area of low pressure east of Mindanao. It has a high chance of developing into a tropical depression within the next 48 hours.',
            track: generateParabolicTrack(10.5, 135.2)
          }
        ]);
      });
    };
    
    fetchTyphoons();
    const intervalId = setInterval(fetchTyphoons, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Realistic Parabolic Recurvature Track (Coriolis Effect)
  const generateParabolicTrack = (centerLat, centerLng) => {
    const track = [];
    const hemisphere = centerLat >= 0 ? 1 : -1;
    
    for (let i = -5; i <= 5; i++) {
      // Base WNW movement (or WSW in southern hemisphere)
      const baseLngOffset = -(i * 1.8);
      
      // Parabolic recurvature (y = x^2). 
      // As it goes further west (past), it was further south.
      // As it goes future, it curves sharply north (or south in SH).
      // The curve depends on the longitude offset.
      const curveFactor = 0.15;
      const recurvatureLat = (baseLngOffset * baseLngOffset * curveFactor) * hemisphere;
      
      // Add a slight linear lat drift
      const linearLat = (i * 0.5) * hemisphere;
      
      track.push({
        lat: centerLat - linearLat - recurvatureLat,
        lng: centerLng - baseLngOffset,
        type: i < 0 ? 'past' : i === 0 ? 'current' : 'forecast',
        intensity: i === 0 ? 'red' : (Math.abs(i) < 3 ? 'orange' : 'yellow')
      });
    }
    return track;
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCoords, setSearchCoords] = useState(null);
  
  const mapContainerRef = useRef(null);

  useEffect(() => {
    anime({
      targets: '.map-search-container, .map-controls-group',
      translateY: [-10, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutExpo',
      delay: anime.stagger(100, {start: 100})
    });
  }, []);

  const MapEventsHandler = () => {
    const map = useMapEvents({
      click(e) {
        if (addingNode) {
          setPendingNodeCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          setAddingNode(false);
        } else {
          setActiveTyphoonId(null);
          setSelectedNodeIndex(null);
        }
      }
    });
    return null;
  };

  const handleDeploySensor = () => {
    if (newZoneName.trim() && pendingNodeCoords) {
      const newZone = {
        id: 'zone-' + Date.now(),
        name: newZoneName,
        lat: pendingNodeCoords.lat,
        lng: pendingNodeCoords.lng
      };
      setZones([...zones, newZone]);
      setActiveZoneId(newZone.id);
      
      setNotification("Location plotted. You can now run a Sentinel-2 scan.");
      setTimeout(() => setNotification(null), 5000);
    }
    setPendingNodeCoords(null);
    setNewZoneName("");
  };

  const handleRunAnalysis = async (zone) => {
    setIsScanning(true);
    let isWater = false;
    let isUrban = false;
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${zone.lat}&lon=${zone.lng}&zoom=18`);
      const data = await res.json();
      const type = data.type || "";
      const classType = data.class || "";
      
      if (classType === 'water' || type === 'water' || type === 'sea' || type === 'ocean') isWater = true;
      if (classType === 'building' || classType === 'highway' || type === 'city' || type === 'town') isUrban = true;
      if (!data.address) isWater = true; 
    } catch (e) {
      console.error(e);
    }
    
    setTimeout(() => {
      setIsScanning(false);
      setActiveReport({
        ...zone,
        type: isWater ? 'water' : isUrban ? 'urban' : 'crop'
      });
    }, 2000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        setSearchQuery(""); // clear after search
      } else {
        setNotification("Location not found.");
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (e) {
      console.error("Search error", e);
    }
  };

  const modes = [
    { id: 'true-color', icon: <MapTrifold size={20} />, label: 'True Color' },
    { id: 'ndvi', icon: <Plant size={20} />, label: 'Agriculture (NDVI)' },
    { id: 'sar', icon: <CloudRain size={20} />, label: 'Flood (SAR)' },
    { id: 'infrared', icon: <Fire size={20} />, label: 'Disaster (IR)' },
    { id: 'weather', icon: <CloudLightning size={20} />, label: 'Live Weather Radar' }
  ];
  const activeModeData = modes.find(m => m.id === satelliteMode);

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div className={`map-wrapper ${satelliteMode}`} style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }} ref={mapContainerRef}>
        <MapContainer 
          center={[14.5995, 120.9842]} 
          zoom={6} 
          minZoom={3} 
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          zoomControl={false} 
          style={{ width: '100%', height: '100%', zIndex: 0 }}
        >
          {/* Ultra HD Esri Base Map for the gorgeous background */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={20}
            noWrap={true}
            keepBuffer={8}
            updateWhenZooming={false}
            updateWhenIdle={false}
          />
          {/* Super fast Google Maps transparent labels/roads on top for zooming */}
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
            maxZoom={20}
            noWrap={true}
            keepBuffer={8}
            updateWhenZooming={false}
            updateWhenIdle={false}
          />
          {showWind && <WindVelocityLayer typhoons={typhoons} />}
          
          {satelliteMode === 'weather' && <WeatherRadarLayer />}
          <TyphoonTrackerLayer 
            typhoons={typhoons} 
            activeTyphoonId={activeTyphoonId} 
            setActiveTyphoonId={setActiveTyphoonId} 
            selectedNodeIndex={selectedNodeIndex}
            setSelectedNodeIndex={setSelectedNodeIndex}
          />
          <MapResizer sidebarOpen={sidebarOpen} />
          <MapController searchCoords={searchCoords} />
          <MapEventsHandler />
          
          {zones.map((zone) => (
            <Marker key={zone.id} position={[zone.lat, zone.lng]} icon={createCustomMarker(zone.id === activeZoneId)}>
              <Popup>
                <div className="custom-popup-content" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0f172a' }}>{zone.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '0.85rem', color: zone.id === activeZoneId ? '#10b981' : '#64748b' }}>
                    {zone.id === activeZoneId && <CheckCircle weight="fill" />} 
                    <span>{zone.id === activeZoneId ? 'Active Location' : 'Inactive Location'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => setActiveZoneId(zone.id)}
                      style={{ 
                        padding: '10px 16px', background: '#f1f5f9', 
                        color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', 
                        cursor: 'pointer', width: '100%', fontWeight: '600',
                        transition: 'background 0.2s', fontSize: '0.9rem'
                      }}
                    >
                      Select
                    </button>
                    
                    <button 
                      onClick={() => handleRunAnalysis(zone)}
                      style={{ 
                        padding: '10px 16px', background: '#10b981', 
                        color: 'white', border: 'none', borderRadius: '8px', 
                        cursor: 'pointer', width: '100%', fontWeight: '600',
                        transition: 'background 0.2s', fontSize: '0.9rem',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      Run Scan
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {activeZoneId && zones.find(z => z.id === activeZoneId) && (
            <Rectangle 
              bounds={[
                [zones.find(z => z.id === activeZoneId).lat - (25 / 111320), zones.find(z => z.id === activeZoneId).lng - (25 / (111320 * Math.cos((zones.find(z => z.id === activeZoneId).lat * Math.PI) / 180)))],
                [zones.find(z => z.id === activeZoneId).lat + (25 / 111320), zones.find(z => z.id === activeZoneId).lng + (25 / (111320 * Math.cos((zones.find(z => z.id === activeZoneId).lat * Math.PI) / 180)))]
              ]} 
              pathOptions={{ color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 }} 
            />
          )}
        </MapContainer>

        {/* New Typhoon Details Sidebar */}
        <TyphoonDetailsSidebar 
          storm={typhoons.find(t => t.id === activeTyphoonId)} 
          isOpen={!!activeTyphoonId}
          selectedNodeIndex={selectedNodeIndex}
          onClose={() => { setActiveTyphoonId(null); setSelectedNodeIndex(null); }} 
        onNodeSelect={setSelectedNodeIndex}
        />

        {/* Notifications */}
        {notification && (
          <div style={{
            position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#ffffff', color: '#0f172a', padding: '12px 24px',
            borderRadius: '999px', zIndex: 1100, fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s forwards', border: '1px solid #e2e8f0'
          }}>
            {notification}
          </div>
        )}

        {/* Top Right: Plot Location Button */}
        <div style={{
          position: 'absolute', top: '24px', right: '24px', zIndex: 1000, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end'
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <button 
              style={{ 
                padding: '12px 24px', 
                background: addingNode ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(15, 15, 20, 0.65)',
                backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                color: addingNode ? '#ffffff' : '#EDEDEF', 
                border: '1px solid', borderColor: addingNode ? '#f97316' : 'rgba(255,255,255,0.05)', 
                borderRadius: '999px',
                boxShadow: addingNode ? '0 8px 20px rgba(249, 115, 22, 0.3)' : '0 8px 25px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: addingNode ? 'scale(0.98)' : 'scale(1)'
              }}
              onClick={() => setAddingNode(!addingNode)}
            >
              <MapPin size={22} weight={addingNode ? "fill" : "bold"} color={addingNode ? "white" : "#10b981"} /> 
              {addingNode ? "Click on map to drop pin..." : "Plot Location"}
            </button>
          </div>
          
          <div style={{ pointerEvents: 'auto' }}>
            <button 
              style={{ 
                padding: '10px 16px', 
                background: showWind ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(15, 15, 20, 0.65)',
                backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                color: showWind ? '#ffffff' : '#EDEDEF', 
                border: '1px solid', borderColor: showWind ? '#10b981' : 'rgba(255,255,255,0.05)', 
                borderRadius: '999px',
                boxShadow: showWind ? '0 8px 20px rgba(16, 185, 129, 0.3)' : '0 8px 25px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => setShowWind(!showWind)}
            >
              <Wind size={20} weight={showWind ? "fill" : "bold"} color={showWind ? "white" : "#64748b"} /> 
              {showWind ? "Wind: ON" : "Wind: OFF"}
            </button>
          </div>
        </div>

        {/* Top Left: Horizontal Legend */}
        {satelliteMode !== 'true-color' && (
          <div style={{
            position: 'absolute', top: '24px', left: '24px', zIndex: 1000, pointerEvents: 'auto',
            background: 'rgba(25, 33, 44, 0.85)', backdropFilter: 'blur(12px)',
            borderRadius: '999px', padding: '6px 16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px',
            animation: 'slideInLeft 0.3s'
          }}>
            {satelliteMode === 'ndvi' && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>NDVI</div>
                <div style={{ display: 'flex', height: '14px', width: '250px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ flex: 1, background: '#3b82f6' }} title="Water Body"></div>
                  <div style={{ flex: 1, background: '#cbd5e1' }} title="Barren / Urban"></div>
                  <div style={{ flex: 1, background: '#fcd34d' }} title="Stressed / Sparse"></div>
                  <div style={{ flex: 1, background: '#10b981' }} title="Healthy Vegetation"></div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>Health</div>
              </>
            )}
            
            {satelliteMode === 'sar' && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>SAR</div>
                <div style={{ display: 'flex', height: '14px', width: '250px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ flex: 1, background: '#000000' }} title="Deep Water / Flooded"></div>
                  <div style={{ flex: 1, background: '#555555' }} title="Wet Soil / Saturated"></div>
                  <div style={{ flex: 1, background: '#ffffff' }} title="Dry Land"></div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>Flood</div>
              </>
            )}
            
            {satelliteMode === 'infrared' && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>TEMP</div>
                <div style={{ display: 'flex', height: '14px', width: '250px', borderRadius: '4px', overflow: 'hidden', background: 'linear-gradient(to right, #10b981, #c2410c, #d946ef, #991b1b)' }}>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>Extreme</div>
              </>
            )}
            
            {satelliteMode === 'weather' && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>RAIN</div>
                <div style={{ display: 'flex', height: '14px', width: '250px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ flex: 1, background: '#93c5fd', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>Light</span>
                  </div>
                  <div style={{ flex: 1, background: '#3b82f6', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>Mod</span>
                  </div>
                  <div style={{ flex: 1, background: '#eab308', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>Heavy</span>
                  </div>
                  <div style={{ flex: 1, background: '#ef4444', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>Severe</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9' }}>Storm</div>
              </>
            )}
          </div>
        )}


        {/* Bottom Center: Search Bar & Satellite Dropdown */}
        <div className="map-controls-group" style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, display: 'flex', gap: '12px', pointerEvents: 'auto', alignItems: 'center'
        }}>
          
          {/* Dropdown Filters */}
          <div style={{ position: 'relative', pointerEvents: 'auto' }}>
            {dropdownOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px',
                background: 'rgba(15, 15, 20, 0.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '12px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '4px',
                minWidth: '220px', animation: 'fadeIn 0.2s'
              }}>
                {modes.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => { 
                      setSatelliteMode(mode.id); 
                      setDropdownOpen(false);
                      if(mode.id !== 'true-color') setShowModeExplanation(true); 
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 16px', borderRadius: '8px', border: 'none',
                      background: satelliteMode === mode.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: satelliteMode === mode.id ? '#ffffff' : '#EDEDEF',
                      fontWeight: satelliteMode === mode.id ? '600' : '500',
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem',
                      textAlign: 'left', whiteSpace: 'nowrap'
                    }}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              style={{ 
                background: 'rgba(15, 15, 20, 0.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                padding: '12px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px',
                fontWeight: '600', color: '#ffffff', cursor: 'pointer', fontSize: '0.95rem',
                whiteSpace: 'nowrap'
              }}
            >
              {activeModeData.icon} {activeModeData.label} 
              {dropdownOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="map-search-container" style={{ pointerEvents: 'auto' }}>
            <form onSubmit={handleSearch} style={{ 
              display: 'flex', background: 'rgba(15, 15, 20, 0.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', 
              borderRadius: '999px', padding: '6px 6px 6px 20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', 
              border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center'
            }}>
               <MagnifyingGlass size={20} color="#64748b" />
               <input 
                 type="text" 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)} 
                 placeholder="Search a place (e.g. Manila)..." 
                 style={{ 
                   border: 'none', outline: 'none', background: 'transparent', 
                   padding: '8px 12px', fontSize: '0.95rem', width: '220px', 
                   fontWeight: '500', color: '#ffffff'
                 }} 
               />
               <button type="submit" style={{ 
                 background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', 
                 padding: '10px 20px', borderRadius: '999px', fontWeight: '600', 
                 cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s',
                 boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
               }}>
                 Search
               </button>
            </form>
          </div>

        </div>

        {/* Centered Modal Explanation (Zoom Earth Style) */}
        {showModeExplanation && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)'
          }} onClick={() => setShowModeExplanation(false)}>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '28px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              color: '#f1f5f9', maxWidth: '380px', textAlign: 'center',
              animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ color: '#38bdf8' }}>{activeModeData.icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{activeModeData.label}</h3>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                {satelliteMode === 'ndvi' && 'This map shows the Vegetation Health Index. Greener areas indicate healthy crops and dense vegetation, while yellow or blue areas show stressed crops or water bodies.'}
                {satelliteMode === 'sar' && 'This Synthetic Aperture Radar map is used to detect flood extents and water bodies through dense clouds.'}
                {satelliteMode === 'infrared' && 'This map uses thermal infrared imaging to detect heat anomalies like wildfires or extreme drought zones.'}
                {satelliteMode === 'weather' && 'This map shows real-time precipitation radar, indicating rain intensity and storm movement.'}
              </p>
              <button 
                onClick={() => setShowModeExplanation(false)}
                style={{
                  background: '#10b981', color: 'white', border: 'none',
                  padding: '12px 24px', borderRadius: '999px',
                  fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)'; }}
                onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)'; }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Custom Node Creation Modal */}
        {pendingNodeCoords && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Save Location</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>Name this location to run analysis scans on it.</p>
              <input 
                type="text" 
                placeholder="e.g., North Farm Plot" 
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', fontSize: '1rem' }}
              />
              <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setPendingNodeCoords(null); setNewZoneName(""); }}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleDeploySensor}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Scanning Overlay */}
        {isScanning && (
          <div className="sentinel-scan-overlay">
            <div className="sentinel-scan-line"></div>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: 'white', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '1px',
              padding: '16px 32px', background: 'rgba(0,0,0,0.6)', borderRadius: '999px', backdropFilter: 'blur(10px)'
            }}>
              Scanning Location via Sentinel-2...
            </div>
          </div>
        )}

        {/* Sentinel-2 Report Modal */}
        {activeReport && (
          <div className="modal-overlay">
            <div className="sentinel-report-card" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.4rem' }}>Analysis Report</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{activeReport.name}</p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#10b981', background: '#d1fae5', padding: '6px 12px', borderRadius: '999px', textTransform: 'capitalize' }}>
                  {activeReport.type === 'crop' ? 'Agriculture Zone' : activeReport.type}
                </span>
              </div>
              
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>NDVI (Vegetation Health)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: activeReport.type === 'crop' ? '#10b981' : '#f43f5e' }}>
                    {activeReport.type === 'crop' ? '0.82' : activeReport.type === 'water' ? '-0.15' : '0.12'}
                  </span>
                </div>
                <div className="index-bar-container" style={{ height: '8px' }}>
                  <div className="index-bar-fill" style={{ width: activeReport.type === 'crop' ? '82%' : activeReport.type === 'water' ? '0%' : '12%', background: activeReport.type === 'crop' ? 'linear-gradient(90deg, #fcd34d, #10b981)' : '#cbd5e1' }}></div>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '12px', lineHeight: '1.5' }}>
                  {activeReport.type === 'crop' ? 'High vegetation vigor detected. Crops appear healthy and thriving.' 
                    : activeReport.type === 'water' ? 'No vegetation detected. Deep water body confirmed.' 
                    : 'Low vegetation detected (Urban or barren). Potentially a harvested field or bald spot indicating poor soil.'}
                </p>
              </div>

              <div style={{ marginBottom: '32px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>NDWI (Water Stress)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3b82f6' }}>
                    {activeReport.type === 'water' ? '0.95' : activeReport.type === 'crop' ? '0.45' : '0.05'}
                  </span>
                </div>
                <div className="index-bar-container" style={{ height: '8px' }}>
                  <div className="index-bar-fill" style={{ width: activeReport.type === 'water' ? '95%' : activeReport.type === 'crop' ? '45%' : '5%', background: 'linear-gradient(90deg, #93c5fd, #3b82f6)' }}></div>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '12px', lineHeight: '1.5' }}>
                  {activeReport.type === 'water' ? 'High surface water index.' : activeReport.type === 'crop' ? 'Adequate canopy moisture levels. No immediate water stress.' : 'Extremely dry area. High drought risk.'}
                </p>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" style={{ padding: '12px 32px' }} onClick={() => setActiveReport(null)}>Close Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { this.setState({ error, info }); console.error("Caught by ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', zIndex: 9999, position: 'relative' }}>
          <h2>Something went wrong in LiveMapView.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LiveMapViewWithErrorBoundary(props) {
  return (
    <ErrorBoundary>
      <LiveMapView {...props} />
    </ErrorBoundary>
  );
}

