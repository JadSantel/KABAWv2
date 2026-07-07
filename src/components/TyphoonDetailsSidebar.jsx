import React, { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import anime from 'animejs/lib/anime.es.js';
import './TyphoonDetailsSidebar.css';

const TyphoonDetailsSidebar = ({ storm, isOpen, onClose, selectedNodeIndex, onNodeSelect }) => {
  const sidebarRef = useRef(null);
  const activeRowRef = useRef(null);
  const [displayStorm, setDisplayStorm] = useState(storm);
  
  // Track open state for animations
  const wasOpenRef = useRef(false);

  // Keep the storm in local state so we can animate it out when it closes
  useEffect(() => {
    if (storm) {
      setDisplayStorm(storm);
    }
  }, [storm]);

  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedNodeIndex, displayStorm]);

  // Anime.js open/close animations
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && sidebarRef.current) {
      // Set pointer events
      sidebarRef.current.style.pointerEvents = 'auto';
      
      // Animate sidebar sliding in
      anime({
        targets: sidebarRef.current,
        translateX: ['100%', '0%'],
        duration: 800,
        easing: 'easeOutExpo'
      });

      // Stagger elements inside the sidebar for a smooth reveal
      const elements = sidebarRef.current.querySelectorAll('.sidebar-header, .status-card, .analysis-card, .table-container');
      anime({
        targets: elements,
        translateX: [40, 0],
        opacity: [0, 1],
        delay: anime.stagger(100, { start: 200 }),
        duration: 600,
        easing: 'easeOutQuad'
      });

      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current && sidebarRef.current) {
      // Set pointer events
      sidebarRef.current.style.pointerEvents = 'none';
      
      // Animate sidebar sliding out
      anime({
        targets: sidebarRef.current,
        translateX: ['0%', '100%'],
        duration: 500,
        easing: 'easeInExpo'
      });
      
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!displayStorm) return null;

  const track = displayStorm.track || [];
  
  // Helper to parse data for a specific point in the track
  const getNodeData = (point, index) => {
    if (!point) return null;
    const timelineNode = displayStorm.timeline && displayStorm.timeline[index];
    const isPast = timelineNode ? timelineNode.isPast : index < Math.floor(track.length / 2);
    
    let dateStr = timelineNode ? timelineNode.date : '';
    let timeStr = timelineNode ? timelineNode.time : (isPast ? 'Past' : 'Forecast');
    
    let day = '', month = '';
    if (dateStr) {
      const parts = dateStr.split(' ');
      if(parts.length >= 2) {
         day = parts[0];
         month = parts[1];
      } else {
         day = dateStr;
      }
    }

    // Determine type and wind
    let type = timelineNode ? timelineNode.type : (point.intensity === 'red' ? 'ST' : point.intensity === 'orange' ? 'T' : 'S');
    if (displayStorm.type === 'LPA') type = 'LPA'; // Hard override for Low Pressure Areas

    const wind = timelineNode ? timelineNode.wind : (point.intensity === 'red' ? '180+' : point.intensity === 'orange' ? '110-180' : '72');
    const statusText = timelineNode ? (timelineNode.isPast ? 'Past' : 'Forecast') : (isPast ? 'Past' : 'Forecast');
    
    // Determine colors based on type
    let typeBg = '#10b981';
    let typeColor = '#ffffff';
    let windColor = '#10b981';
    
    if (type === 'ST' || type === 'SU' || type === 'VT' || type === 'TY') {
       typeBg = '#ef4444';
       windColor = '#ef4444';
    } else if (type === 'T') {
       typeBg = '#f97316';
       windColor = '#f97316';
    } else if (type === 'LPA') {
       typeBg = '#eab308';
       windColor = '#eab308';
       typeColor = '#121620';
    }

    // Name mapping
    const typeNameMap = {
      'ST': 'SUPER TYPHOON',
      'SU': 'SUPER TYPHOON',
      'VT': 'VIOLENT TYPHOON',
      'TY': 'TYPHOON',
      'T': 'SEVERE TROPICAL STORM',
      'S': 'TROPICAL STORM',
      'LPA': 'LOW PRESSURE AREA'
    };
    const typeName = typeNameMap[type] || 'TROPICAL CYCLONE';

    return {
      day, month, timeStr, type, wind, statusText, typeBg, typeColor, windColor, typeName
    };
  };

  // Determine active data based on selection or fallback to current (middle of track)
  let defaultIndex = track.findIndex(pt => pt.type === 'current');
  if (defaultIndex === -1 && displayStorm.timeline) {
    defaultIndex = displayStorm.timeline.findIndex(t => t.isCurrent);
  }
  if (defaultIndex === -1) {
    defaultIndex = Math.floor(track.length / 2);
  }
  const activeIndex = selectedNodeIndex != null ? selectedNodeIndex : defaultIndex;
  const activePoint = track[activeIndex];
  const activeData = getNodeData(activePoint, activeIndex);

  if (!activeData) return null; // Safe guard

  return (
    <div ref={sidebarRef} className="typhoon-sidebar">
      <div className="typhoon-sidebar-inner">
        
        <div className="sidebar-header">
          <h2>{displayStorm.name}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="sidebar-content">
          
          {/* Current Status Card */}
          <div className="status-card">
             <div className="status-card-icon" style={{ background: activeData.typeBg, color: activeData.typeColor }}>
               {activeData.type}
             </div>
             <div className="status-card-info">
                <h3>{activeData.typeName}</h3>
                <p>{activeData.statusText}: {activeData.wind} km/h winds</p>
             </div>
          </div>

          {/* Analysis Card */}
          <div className="analysis-card">
            <div className="analysis-title">KABAW-O Analysis</div>
            <div className="analysis-subtitle" style={{ color: activeData.typeBg }}>
              {activeData.typeName}
            </div>
            <div className="analysis-text">
              {displayStorm.description}
            </div>
          </div>

          {/* Table Container */}
          {track.length > 0 && (
            <div className="table-container">
              <table className="typhoon-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Wind</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {track.map((point, index) => {
                    const rowData = getNodeData(point, index);
                    return (
                      <tr 
                        key={index} 
                        ref={index === selectedNodeIndex ? activeRowRef : null}
                        className={index === selectedNodeIndex ? 'table-row-active' : ''}
                        onClick={() => onNodeSelect && onNodeSelect(index)}
                      >
                        <td className="date-col">
                          <div className="date-day">{rowData.day || '13'}</div>
                          <div className="date-month">{rowData.month || 'Jul'}</div>
                        </td>
                        <td className="time-col">
                          {rowData.timeStr}
                        </td>
                        <td className="badge-col">
                          <div className="type-badge" style={{ background: rowData.typeBg, color: rowData.typeColor }}>
                            {rowData.type}
                          </div>
                        </td>
                        <td className="wind-col" style={{ color: rowData.windColor }}>
                          {rowData.wind}
                        </td>
                        <td className="status-col">
                          {rowData.statusText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TyphoonDetailsSidebar;
