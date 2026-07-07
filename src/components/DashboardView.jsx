import React, { useState, useEffect } from 'react';
import { CaretDown, DownloadSimple, SignOut, Thermometer, Drop, CloudSun, HandHeart, Plant, Bug } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Realistic historical data
const chartData = [
  { time: '00:00', local: 15, regional: 14 },
  { time: '03:00', local: 18, regional: 15 },
  { time: '06:00', local: 25, regional: 22 },
  { time: '09:00', local: 30, regional: 25 },
  { time: '12:00', local: 42, regional: 28 },
  { time: '15:00', local: 38, regional: 26 },
  { time: '18:00', local: 22, regional: 20 },
  { time: '21:00', local: 18, regional: 16 },
  { time: '24:00', local: 15, regional: 15 },
];

const DashboardView = () => {
  const navigate = useNavigate();
  const handleLogout = () => navigate('/login');
  
  const [hasData, setHasData] = useState(true);
  const [activeTab, setActiveTab] = useState('Today'); // 'Today' or 'Weekly'
  
  // Real weather state
  const [weatherData, setWeatherData] = useState(null);

  // Fetch real weather data from Open-Meteo API
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=14.5995&longitude=120.9842&current_weather=true&daily=precipitation_probability_max,uv_index_max&timezone=auto');
        const data = await response.json();
        
        if (data && data.current_weather) {
          setWeatherData({
            windSpeed: data.current_weather.windspeed, // km/h
            rainChance: data.daily?.precipitation_probability_max?.[0] || 10, // %
            uvIndex: data.daily?.uv_index_max?.[0] || 6,
            temp: data.current_weather.temperature
          });
        }
      } catch (err) {
        console.error('Failed to fetch weather data', err);
      }
    };
    fetchWeather();
  }, []);

  return (
    <div className="main-content">
      {/* Top Header */}
      <div className="main-header">
        <div className="welcome-section">
          <div className="welcome-avatar">
            <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a' }}>A</span>
          </div>
          <div className="welcome-text">
            <span className="sub">Welcome Back,</span>
            <span className="title">Admin</span>
          </div>
        </div>
        <button className="logout-icon-btn" onClick={handleLogout}>
          <SignOut size={20} weight="bold" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="dropdown-btn">
            Farm Zone 1: Tomato Greenhouse <CaretDown size={16} color="#64748b" />
          </button>
          
          <div className="filter-pills">
            <div 
              className={`pill ${activeTab === 'Today' ? 'active' : ''}`}
              onClick={() => setActiveTab('Today')}
            >
              Today's View
            </div>
            <div 
              className={`pill ${activeTab === 'Weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('Weekly')}
            >
              Weekly Forecast
            </div>
          </div>
        </div>
        
        <button className="export-btn">
          <DownloadSimple size={20} /> Download Farm Report
        </button>
      </div>

      {hasData ? (
        <div className="dashboard-grid-content">
          
          {/* Farm Assistant AI Card */}
          <div className="farm-assistant-card">
            <div className="assistant-icon">🌾</div>
            <div className="assistant-text">
              <h3>KABAW Farm Assistant</h3>
              <p>
                <strong>Good Morning!</strong> It's a sunny {weatherData ? weatherData.temp : 28}°C with gentle winds. It is a <strong>perfect day to spray your crops</strong>! The air quality is very safe for you to be outside working. No rain is expected until Tuesday.
              </p>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Air Safety</span>
                <HandHeart size={22} color="#15803d" />
              </div>
              <div className="metric-main">
                <span className="metric-value" style={{ color: '#15803d', fontSize: '1.8rem' }}>Safe</span>
              </div>
              <span className="metric-sub">Great for outdoor manual labor</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Spraying Conditions</span>
                <Drop size={22} color="#0284c7" />
              </div>
              <div className="metric-main">
                <span className="metric-value" style={{ fontSize: '1.8rem' }}>Optimal</span>
              </div>
              <span className="metric-sub">Low wind speed ({weatherData ? weatherData.windSpeed : 12} km/h)</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Temperature</span>
                <Thermometer size={22} color="#ea580c" />
              </div>
              <div className="metric-main">
                <span className="metric-value">{weatherData ? weatherData.temp : 28.5}</span>
                <span className="metric-unit">°C</span>
              </div>
              <span className="metric-sub">Perfect for harvesting</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Disease Risk</span>
                <Bug size={22} color="#eab308" />
              </div>
              <div className="metric-main">
                <span className="metric-value" style={{ fontSize: '1.8rem' }}>Low</span>
              </div>
              <span className="metric-sub">Humidity is safe at 64%</span>
            </div>
          </div>

          {/* Middle Complex Row */}
          <div className="charts-row">
            
            {/* Chart Card */}
            <div className="chart-card main-chart">
              <div className="card-header">
                <h3>Air Quality & Farm Health Trend (24h)</h3>
                <span className="badge">Stable</span>
              </div>
              <div className="chart-placeholder" style={{ height: '300px', width: '100%', marginTop: '16px', overflow: 'hidden' }}>
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="local" name="Your Farm" stroke="#15803d" strokeWidth={3} dot={{ r: 4, fill: '#15803d', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="regional" name="Regional Average" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Earthkit Integration Card */}
            <div className="chart-card side-card">
              <div className="card-header">
                <h3>Farm Weather Forecast</h3>
                <CloudSun size={24} color="#ea580c" />
              </div>
              
              <div className="earthkit-data-box">
                <p className="earthkit-desc">
                  Based on real-time meteorological data, here is what to expect for your crops today:
                </p>
                
                <div className="ek-metric">
                  <span className="ek-label">Rain Chance</span>
                  <span className="ek-val">{weatherData ? weatherData.rainChance : 10}%</span>
                </div>
                <div className="ek-metric">
                  <span className="ek-label">Wind Speed</span>
                  <span className="ek-val">{weatherData ? weatherData.windSpeed : 12} km/h</span>
                </div>
                <div className="ek-metric">
                  <span className="ek-label">Sunlight (UV)</span>
                  <span className="ek-val">Index {weatherData ? weatherData.uvIndex : 6}</span>
                </div>
                <div className="ek-metric">
                  <span className="ek-label">Next Expected Rain</span>
                  <span className="ek-val" style={{ color: '#0284c7' }}>Tuesday</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Plant size={40} weight="bold" />
          </div>
          <h2>No Farm Zone Active</h2>
          <p>
            Add a new sensor node to your field using the button in the bottom left, then select a zone to see simple farming advice!
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
