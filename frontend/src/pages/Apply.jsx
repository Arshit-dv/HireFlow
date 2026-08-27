import React, { useState } from 'react';
import { submitApplication } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const positions = ['Software Developer', 'Marketing Lead', 'Sales Manager', 'HR Specialist', 'Financial Analyst', 'QA Engineer'];

const Apply = () => {
  const [form, setForm] = useState({
    FirstName: '', LastName: '', PreferredRole: '', Qualification: '', Specialization: '', YearsOfExperience: ''
  });
  const [resumeFile, setResumeFile]     = useState(null);
  const [skillInput, setSkillInput]     = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [skills, setSkills]     = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const addSkill = () => {
    if (skillInput.trim()) { setSkills([...skills, skillInput.trim()]); setSkillInput(''); }
  };
  const addProject = () => {
    if (projectInput.trim()) { setProjects([...projects, projectInput.trim()]); setProjectInput(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('FirstName', form.FirstName);
      formData.append('LastName', form.LastName);
      formData.append('PreferredRole', form.PreferredRole);
      formData.append('Qualification', form.Qualification);
      formData.append('Specialization', form.Specialization || '');
      formData.append('YearsOfExperience', form.YearsOfExperience || '0');
      formData.append('Skills', JSON.stringify(skills));
      formData.append('Projects', JSON.stringify(projects));
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const { data } = await submitApplication(formData);
      setSubmitted(data.ApplicationID);
      toast.success('Application submitted successfully! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="apply-page">
        <div className="apply-card card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Your <strong style={{ color: 'var(--accent)' }}>Application ID is #{submitted}</strong>.<br />
            Please save this number for future reference. Our HR talent acquisition team will review your dossier shortly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setSubmitted(null); setForm({ FirstName: '', LastName: '', PreferredRole: '', Qualification: '', Specialization: '', YearsOfExperience: '' }); setSkills([]); setProjects([]); setResumeFile(null); }}>
              Submit Another Application
            </button>
            <Link to="/login" className="btn btn-outline">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <div className="apply-card">
        <div className="apply-header">
          <h1>🚀 Join Our Team</h1>
          <p>Submit your application, credentials, and resume for open vacancies</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Personal Details & Role */}
            <div className="form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input value={form.FirstName} onChange={(e) => setForm({ ...form, FirstName: e.target.value })} required placeholder="e.g. John" />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input value={form.LastName} onChange={(e) => setForm({ ...form, LastName: e.target.value })} required placeholder="e.g. Doe" />
              </div>
              <div className="form-group">
                <label>Preferred Role *</label>
                <select value={form.PreferredRole} onChange={(e) => setForm({ ...form, PreferredRole: e.target.value })} required>
                  <option value="">— Select Target Position —</option>
                  {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Highest Qualification *</label>
                <input value={form.Qualification} onChange={(e) => setForm({ ...form, Qualification: e.target.value })}
                  placeholder="e.g. B.Tech, MBA, M.Sc" required />
              </div>
              <div className="form-group">
                <label>Specialization / Major</label>
                <input value={form.Specialization} onChange={(e) => setForm({ ...form, Specialization: e.target.value })}
                  placeholder="e.g. Computer Science, Finance, HR" />
              </div>
              <div className="form-group">
                <label>Years of Relevant Experience</label>
                <input type="number" min={0} value={form.YearsOfExperience}
                  onChange={(e) => setForm({ ...form, YearsOfExperience: e.target.value })} placeholder="0" />
              </div>
            </div>

            {/* Resume Upload (S3 Cloud Storage) */}
            <div style={{ marginTop: 20 }}>
              <div className="form-group">
                <label>Upload Resume / CV (PDF, DOCX) 📄</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Supported formats: PDF, DOCX (Max 10MB). Stored securely via AWS S3 / Cloud Storage.
                </span>
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginTop: 20 }}>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Technical &amp; Core Skills</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="e.g. React, Node.js, SQL, AWS, Python..." style={{ flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addSkill}>+ Add Skill</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {skills.map((s, i) => (
                  <span key={i} className="badge badge-info" style={{ cursor: 'pointer' }}
                    onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}>
                    {s} ✕
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div style={{ marginTop: 16 }}>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Key Projects &amp; Portfolio Highlights</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={projectInput} onChange={(e) => setProjectInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProject())}
                    placeholder="e.g. E-Commerce Platform, Inventory Cloud System..." style={{ flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addProject}>+ Add Project</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {projects.map((p, i) => (
                  <span key={i} className="badge badge-neutral" style={{ cursor: 'pointer' }}
                    onClick={() => setProjects(projects.filter((_, idx) => idx !== i))}>
                    {p} ✕
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Uploading &amp; Submitting...' : '📨 Submit Application'}
              </button>
              <Link to="/login" className="btn btn-outline">Already have an account?</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Apply;
