import React from 'react';
import { List, SquaresFour, ChartLineUp, MapTrifold, Lifebuoy, Gear, CaretDown, PlusCircle } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import textLogo from '../assets/kabaw_text_logo.png';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <SquaresFour size={20} weight="fill" /> },
    { label: 'Live Map', path: '/dashboard/map', icon: <MapTrifold size={20} /> },
    { label: 'Analytics', path: '/dashboard/analytics', icon: <ChartLineUp size={20} /> },
    { label: 'Support Tickets', path: '/dashboard/support', icon: <Lifebuoy size={20} /> },
  ];

  return (
    <div className={`sidebar ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <div className="logo-area">
        <List size={24} color="#ffffff" style={{ cursor: 'pointer', minWidth: '24px' }} onClick={() => setSidebarOpen(!sidebarOpen)} />
        <img src={textLogo} alt="KABAW.net" className="nav-label" style={{ height: '18px', marginLeft: '4px' }} />
      </div>
      
      <ul className="nav-links" style={{ listStyle: 'none', padding: 0 }}>
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard/');
          return (
            <li 
              key={index} 
              className={isActive ? 'active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </li>
          );
        })}
        <li style={{ justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Gear size={20} style={{ minWidth: '20px' }} /> <span className="nav-label">System Settings</span>
          </div>
          {sidebarOpen && <CaretDown size={16} className="nav-label" />}
        </li>
      </ul>

      <div className="sidebar-bottom">
        <button className="upload-btn">
          <PlusCircle size={20} weight="bold" style={{ minWidth: '20px' }} /> <span className="nav-label">Add Sensor Node</span>
        </button>

        <div className="user-block">
          <div className="user-block-avatar">
            <span style={{ fontWeight: '700', color: '#ffffff' }}>A</span>
          </div>
          <div className="user-block-info">
            <span className="name">Admin</span>
            <span className="role">Admin Account</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
