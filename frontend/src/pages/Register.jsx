import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import toast from 'react-hot-toast';

const Register = () => {
  const [form, setForm] = useState({ username: '', password: '', role: 'hr' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerUser(form);
      toast.success('HR Account created! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>⚡ HR System</h1>
          <p>Create HR Administrator Account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Username</label>
            <input type="text" placeholder="Choose a username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Password</label>
            <input type="password" placeholder="Create a password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={loading}>
            {loading ? '⏳ Creating Account...' : '🚀 Create HR Account'}
          </button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
