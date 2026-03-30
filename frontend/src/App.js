import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Apply from './pages/Apply';
import HRDashboard from './pages/HRDashboard';
import Applications from './pages/Applications';
import Candidates from './pages/Candidates';
import Interviews from './pages/Interviews';
import Offers from './pages/Offers';
import Training from './pages/Training';
import Employees from './pages/Employees';
import Salary from './pages/Salary';
import Complaints from './pages/Complaints';
import Departments from './pages/Departments';
import Attendance from './pages/Attendance';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1c2333', color: '#e6edf3', border: '1px solid #30363d' },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/apply"    element={<Apply />} />

          {/* HR routes */}
          <Route path="/hr" element={<PrivateRoute roles={['hr']}><HRDashboard /></PrivateRoute>} />
          <Route path="/hr/applications" element={<PrivateRoute roles={['hr']}><Applications /></PrivateRoute>} />
          <Route path="/hr/candidates"   element={<PrivateRoute roles={['hr']}><Candidates /></PrivateRoute>} />
          <Route path="/hr/interviews"   element={<PrivateRoute roles={['hr']}><Interviews /></PrivateRoute>} />
          <Route path="/hr/offers"       element={<PrivateRoute roles={['hr']}><Offers /></PrivateRoute>} />
          <Route path="/hr/training"     element={<PrivateRoute roles={['hr']}><Training /></PrivateRoute>} />
          <Route path="/hr/employees"    element={<PrivateRoute roles={['hr']}><Employees /></PrivateRoute>} />
          <Route path="/hr/departments"  element={<PrivateRoute roles={['hr']}><Departments /></PrivateRoute>} />
          <Route path="/hr/salary"       element={<PrivateRoute roles={['hr']}><Salary /></PrivateRoute>} />
          <Route path="/hr/attendance"   element={<PrivateRoute roles={['hr']}><Attendance /></PrivateRoute>} />
                    <Route path="/hr/complaints"   element={<PrivateRoute roles={['hr']}><Complaints /></PrivateRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
