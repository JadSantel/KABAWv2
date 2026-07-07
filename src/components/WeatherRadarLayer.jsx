import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TileLayer } from 'react-leaflet';

const WeatherRadarLayer = () => {
  const [timestamps, setTimestamps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const fetchRadar = () => {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          const past = data?.radar?.past;
          if (past && past.length > 0) {
            const host = data.host;
            const recentFrames = past.slice(-10).map(p => ({
              time: p.time,
              path: p.path,
              host: host
            }));
            setTimestamps(recentFrames);
          }
        })
        .catch(err => console.error("Error fetching RainViewer data:", err));
    };

    fetchRadar();
    const intervalId = setInterval(fetchRadar, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying && timestamps.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % timestamps.length);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timestamps.length]);

  if (timestamps.length === 0) return null;

  const currentTs = timestamps[currentIndex];

  return (
    <>
      {timestamps.map((ts, index) => (
        <TileLayer
          key={ts.time}
          url={`${ts.host}${ts.path}/256/{z}/{x}/{y}/2/1_1.png`}
          opacity={index === currentIndex ? 0.65 : 0}
          zIndex={10}
          className="animated-radar-layer"
        />
      ))}
    </>
  );
};

export default WeatherRadarLayer;
