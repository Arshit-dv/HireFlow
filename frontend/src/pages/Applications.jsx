import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllApplications, getApplicationById, screenApplication, submitApplication, updateApplication, deleteApplication } from '../services/api';
import toast from 'react-hot-toast';

const Applications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);    // application to screen
  const [detail, setDetail] = useState(null);  // full detail view
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [sForm, setSForm] = useState({ ExpectedSalary: '', Potential: 'High', ScreeningStatus: 'Passed' });
  const [aForm, setAForm] = useState({
    FirstName: '',
    LastName: '',
    PreferredRole: '',
    Qualification: '',
    Specialization: '',
    YearsOfExperience: '',
    Skills: '',
    Projects: ''
  });

  const load = async () => {
    setLoading(true);
    try { const { data } = await getAllApplications(); setApps(data.data); }
    catch (err) { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    try {
      const { data } = await getApplicationById(id);
      setDetail(data.data);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const doScreen = async (e) => {
    e.preventDefault();
    try {
      const { data } = await screenApplication(modal.ApplicationID, sForm);
      toast.success(`Candidate #${data.CandidateID} created! ✅`);
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Screening failed'); }
  };

  const prepareData = () => {
    return {
      ...aForm,
      FirstName: aForm.FirstName || 'Manual',
      LastName: aForm.LastName || 'Entry',
      Skills: aForm.Skills.split(',').map(s => s.trim()).filter(Boolean),
      Projects: aForm.Projects.split(',').map(p => p.trim()).filter(Boolean),
      YearsOfExperience: Number(aForm.YearsOfExperience) || 0
    };
  };

  const doCreate = async (e) => {
    e.preventDefault();
    try {
      await submitApplication(prepareData());
      toast.success('Application created! 📝');
      setCreateModal(false);
      load();
    } catch (err) { toast.error('Failed to create application'); }
  };

  const doUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateApplication(editModal.ApplicationID, prepareData());
      toast.success('Application updated! ✅');
      setEditModal(null);
      load();
    } catch (err) { toast.error('Update failed'); }
  };

  const doDelete = async (id) => {
    if (!window.confirm('Delete this application and all related resume data?')) return;
    try {
      await deleteApplication(id);
      toast.success('Deleted successfully');
      load();
    } catch (err) { toast.error('Delete failed'); }
  };

  const filteredApps = apps.filter(a =>
    a.ApplicationID.toString().includes(search) ||
    (a.PreferredRole && a.PreferredRole.toLowerCase().includes(search.toLowerCase())) ||
    (a.Qualification && a.Qualification.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>📝 Applications</h1>
            <p>Incoming talent pool and qualification processing</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by ID or Role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ width: 250 }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => {
              setCreateModal(true);
              setAForm({ FirstName: '', LastName: '', PreferredRole: '', Qualification: '', Specialization: '', YearsOfExperience: '', Skills: '', Projects: '' });
            }}>
              + Create Application
            </button>
          </div>
        </div>

        <div className="card">
          <div className="table-header" style={{ padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p>{filteredApps.length} records found</p>
            <div className="pagination-controls" style={{ display: 'flex', gap: 5 }}>
              <button className="btn btn-sm btn-outline" onClick={() => setCurrentIndex(0)}>First</button>
              <button className="btn btn-sm btn-outline" onClick={() => setCurrentIndex(Math.max(0, filteredApps.length - 1))}>Last</button>
            </div>
          </div>
          <div className="table-wrapper">
            {loading ? <div className="spinner" /> : filteredApps.length === 0 ? (
              <div className="empty-state"><div className="icon">📭</div><p>No applications found</p></div>
            ) : (
              <table>
                <thead><tr><th>ID</th><th>Applicant Name</th><th>Target Role</th><th>Education</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredApps.map((a, index) => (
                    <tr key={a.ApplicationID} style={index === currentIndex ? { backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {}}>
                      <td><strong>#{a.ApplicationID}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.FirstName} {a.LastName}</div>
                      </td>
                      <td><span className="badge badge-info">{a.PreferredRole}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.Qualification}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.Specialization || 'General'}</div>
                      </td>
                      <td>{a.ApplicationDate?.split('T')[0]}</td>
                      <td>
                        {!a.HasCandidate ? (
                          <span className="badge badge-pending">Screening</span>
                        ) : a.ScreeningStatus === 'Passed' ? (
                          <span className="badge badge-success">Passed</span>
                        ) : (
                          <span className="badge badge-danger">{a.ScreeningStatus}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-outline" onClick={() => openDetail(a.ApplicationID)} title="View Detail">👁</button>
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            setEditModal(a);
                            setAForm({
                              PreferredRole: a.PreferredRole,
                              Qualification: a.Qualification,
                              Specialization: a.Specialization,
                              YearsOfExperience: a.YearsOfExperience || '',
                              Skills: a.Skills || '',
                              Projects: a.Projects || ''
                            });
                          }} title="Edit">✏️</button>
                          <button className="btn btn-sm btn-outline" onClick={() => doDelete(a.ApplicationID)} style={{ color: 'var(--danger)' }} title="Delete">🗑</button>
                          {!a.HasCandidate && (
                            <button className="btn btn-sm btn-primary" onClick={() => { setModal(a); setSForm({ ExpectedSalary: '', Potential: 'High', ScreeningStatus: 'Passed' }); }}>
                              🔍 Screen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {(createModal || editModal) && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: 500 }}>
              <div className="card-title">{createModal ? '📝 New Application' : `✏️ Edit App #${editModal.ApplicationID}`}</div>
              <form onSubmit={createModal ? doCreate : doUpdate}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input value={aForm.FirstName} onChange={(e) => setAForm({ ...aForm, FirstName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input value={aForm.LastName} onChange={(e) => setAForm({ ...aForm, LastName: e.target.value })} required />
                  </div>
                  <div className="form-group form-full">
                    <label>Preferred Role *</label>
                    <input value={aForm.PreferredRole} onChange={(e) => setAForm({ ...aForm, PreferredRole: e.target.value })} required placeholder="e.g. Full Stack Developer" />
                  </div>
                  <div className="form-group">
                    <label>Qualification *</label>
                    <input value={aForm.Qualification} onChange={(e) => setAForm({ ...aForm, Qualification: e.target.value })} required placeholder="e.g. Master's in CS" />
                  </div>
                  <div className="form-group">
                    <label>Specialization</label>
                    <input value={aForm.Specialization} onChange={(e) => setAForm({ ...aForm, Specialization: e.target.value })} placeholder="e.g. AI/ML" />
                  </div>
                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input type="number" value={aForm.YearsOfExperience} onChange={(e) => setAForm({ ...aForm, YearsOfExperience: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group form-full">
                    <label>Skills (comma separated)</label>
                    <input value={aForm.Skills} onChange={(e) => setAForm({ ...aForm, Skills: e.target.value })} placeholder="e.g. React, Node.js, SQL" />
                  </div>
                  <div className="form-group form-full">
                    <label>Projects (comma separated)</label>
                    <input value={aForm.Projects} onChange={(e) => setAForm({ ...aForm, Projects: e.target.value })} placeholder="e.g. E-commerce Platform, Portfolio" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="submit" className="btn btn-primary">{createModal ? 'Submit' : 'Update Record'}</button>
                  <button type="button" className="btn btn-outline" onClick={() => { setCreateModal(false); setEditModal(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {detail && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: 600 }}>
              <div className="card-title">📄 Application Dossier #{detail.ApplicationID}</div>
              <div className="form-grid" style={{ gap: '20px' }}>
                <div className="form-group">
                  <label>Role Applied For</label>
                  <div style={{ fontWeight: 600 }}>{detail.PreferredRole}</div>
                </div>
                <div className="form-group">
                  <label>Submission Date</label>
                  <div>{detail.ApplicationDate?.split('T')[0]}</div>
                </div>
                <div className="form-group">
                  <label>Qualification</label>
                  <div>{detail.Qualification} ({detail.Specialization || 'N/A'})</div>
                </div>
                <div className="form-group">
                  <label>Experience</label>
                  <div>{detail.YearsOfExperience || 0} Years</div>
                </div>
                <div className="form-group form-full">
                  <label>Core Skills</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {detail.skills?.length > 0
                      ? detail.skills.map((s, i) => <span key={i} className="badge badge-info" style={{ fontSize: '0.75rem' }}>{s.Skill}</span>)
                      : <span style={{ color: 'var(--text-muted)' }}>None listed</span>}
                  </div>
                </div>
                <div className="form-group form-full">
                  <label>Key Projects</label>
                  <div style={{ marginTop: 8 }}>
                    {detail.projects?.length > 0
                      ? detail.projects.map((p, i) => <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 6, fontSize: '0.85rem', border: '1px solid var(--border)' }}>🚀 {p.Project}</div>)
                      : <span style={{ color: 'var(--text-muted)' }}>No projects documented</span>}
                  </div>
                </div>
                {detail.ResumeUrl && (
                  <div className="form-group form-full">
                    <label>Candidate Resume / CV</label>
                    <div style={{ marginTop: 6 }}>
                      <a
                        href={detail.ResumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        📄 Open Uploaded Resume in New Tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <button className="btn btn-outline" style={{ marginTop: 24, width: '100%' }} onClick={() => setDetail(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Screen Modal */}
        {modal && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: 440 }}>
              <div className="card-title">🔍 Screening Evaluation — App #{modal.ApplicationID}</div>
              <form onSubmit={doScreen}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Expected Salary (Monthly)</label>
                    <input type="number" value={sForm.ExpectedSalary} onChange={(e) => setSForm({ ...sForm, ExpectedSalary: e.target.value })} placeholder="e.g. 75000" />
                  </div>
                  <div className="form-group">
                    <label>Candidate Potential</label>
                    <select value={sForm.Potential} onChange={(e) => setSForm({ ...sForm, Potential: e.target.value })}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="form-group form-full">
                    <label>Screening Decision</label>
                    <select value={sForm.ScreeningStatus} onChange={(e) => setSForm({ ...sForm, ScreeningStatus: e.target.value })}>
                      <option value="Passed">Qualify — Promote to Candidate</option>
                      <option value="Failed">Disqualify — Close Application</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="submit" className="btn btn-primary">Submit Decision</button>
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Applications;
