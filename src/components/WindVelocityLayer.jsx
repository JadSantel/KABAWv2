import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-velocity/dist/leaflet-velocity.css';
import 'leaflet-velocity';

const WindVelocityLayer = ({ typhoons = [] }) => {
  const map = useMap();

  useEffect(() => {
    let velocityLayer = null;
    let isMounted = true;

    fetch('/wind-global.json')
      .then(response => response.json())
      .then(data => {
        if (!isMounted) return;

        velocityLayer = L.velocityLayer({
          displayValues: false,
          displayOptions: {
            velocityType: 'Global Wind',
            displayPosition: 'bottomleft',
            displayEmptyString: 'No wind data'
          },
          data: data,
          maxVelocity: 25,
          velocityScale: 0.01, // Smoother streams
          particleMultiplier: 1 / 800, // Drastically reduced density for performance (fixes panning stutter)
          lineWidth: 1.2, // Thinner lines to compensate for speed
          colorScale: [
            "rgba(255,255,255,0.4)", // very light breeze
            "rgba(255,255,255,0.7)", // moderate
            "rgba(200,220,255,0.9)", // strong
            "rgba(150,200,255,1.0)", // very strong
            "rgba(255,100,100,1.0)", // extreme (typhoon core)
            "rgba(220,38,38,1.0)"    // violent
          ]
        });

        // Add to map only if component hasn't unmounted while fetching
        if (map && isMounted) {
          velocityLayer.addTo(map);
          
          // Fix: Hide the wind canvas when moving the map so the wind doesn't "slide" with the screen
          const toggleWind = (opacity) => {
            if (velocityLayer && velocityLayer._canvasLayer && velocityLayer._canvasLayer._canvas) {
              velocityLayer._canvasLayer._canvas.style.opacity = opacity;
              velocityLayer._canvasLayer._canvas.style.transition = 'opacity 0.2s';
            }
          };
          
          map.on('movestart dragstart zoomstart', () => toggleWind('0'));
          map.on('moveend dragend zoomend', () => toggleWind('1'));
        }
      })
      .catch(error => console.error("Error loading wind data:", error));

    return () => {
      isMounted = false;
      if (velocityLayer && map) {
        map.off('movestart dragstart zoomstart');
        map.off('moveend dragend zoomend');
        map.removeLayer(velocityLayer);
      }
    };
  }, [map]);

  return null;
};

export default WindVelocityLayer;
