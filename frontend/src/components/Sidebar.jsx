import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const hrLinks = [
  { to: '/hr',               label: 'Dashboard',    icon: '📊' },
  { to: '/hr/analytics',     label: 'SQL Analytics',icon: '📈' },
  { to: '/hr/applications',  label: 'Applications', icon: '📝' },
  { to: '/hr/candidates',    label: 'Candidates',   icon: '👥' },
  { to: '/hr/interviews',    label: 'Interviews',   icon: '🗓️'  },
  { to: '/hr/offers',        label: 'Offers',       icon: '📄' },
  { to: '/hr/training',      label: 'Training',     icon: '🎓' },
  { to: '/hr/employees',     label: 'Employees',    icon: '🏢' },
  { to: '/hr/departments',   label: 'Departments',  icon: '🏛️' },
  { to: '/hr/salary',        label: 'Salary',       icon: '💰' },
  { to: '/hr/attendance',    label: 'Attendance',   icon: '📅' },
  { to: '/hr/complaints',    label: 'Complaints',   icon: '📢' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = hrLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>⚡ HR System</h2>
        <p>Recruitment &amp; Management</p>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Management Console</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/hr'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.username || 'Administrator'}</strong>
          HR Management
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%' }}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
