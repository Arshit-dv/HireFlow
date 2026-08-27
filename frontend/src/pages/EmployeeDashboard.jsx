import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployeeDashboard, submitComplaint, getSalaryBill } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const priorityBadge = { High: 'badge-danger', Medium: 'badge-warning', Low: 'badge-info' };
const statusBadge   = { Open: 'badge-danger', 'Under Review': 'badge-pending', Resolved: 'badge-success', Closed: 'badge-neutral' };

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billModal, setBillModal] = useState(null);
  const [complaintModal, setComplaintModal] = useState(false);
  const [cForm, setCForm] = useState({ Description: '', Priority: 'Medium' });

  const load = async () => {
    if (!user?.reference_id && user?.role === 'employee') {
      setLoading(false);
      return;
    }
    const empId = user?.reference_id || 5;
    try {
      const { data: res } = await getEmployeeDashboard(empId);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load employee dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitComplaint({
        EmployeeID: user?.reference_id || data?.profile?.EmployeeID,
        ...cForm,
      });
      toast.success('Grievance filed successfully! HR will review it.');
      setComplaintModal(false);
      setCForm({ Description: '', Priority: 'Medium' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit grievance');
    }
  };

  const showMyBill = async () => {
    const empId = user?.reference_id || data?.profile?.EmployeeID;
    try {
      const now = new Date();
      const month = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear().toString();
      const { data: billRes } = await getSalaryBill(empId, month, year);
      setBillModal(billRes.data);
    } catch (err) {
      toast.error('Failed to load salary bill');
    }
  };

  if (loading) {
    return <div className="spinner-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  }

  const profile = data?.profile;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px 40px' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            👤 Welcome, {profile?.FirstName ? `${profile.FirstName} ${profile.LastName}` : user?.username}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.875rem' }}>
            Employee Self-Service Portal &bull; ID #{profile?.EmployeeID || user?.reference_id || 'N/A'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {user?.role === 'hr' && (
            <button className="btn btn-outline" onClick={() => navigate('/hr')}>
              📊 Switch to HR Dashboard
            </button>
          )}
          <button className="btn btn-outline" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      {!profile ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h2>No Employee Record Linked</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Your user account is not currently linked to an active employee profile.
          </p>
          <button className="btn btn-primary" onClick={handleLogout}>Back to Login</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Left Column: Profile & Payslip */}
          <div>
            {/* Profile Overview Card */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">🏢 Employment Information</div>
              <div className="form-grid" style={{ gap: 16 }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Designation / Role</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>{profile.Role || 'Staff'}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{profile.DeptName || 'General'}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Joining</div>
                  <div style={{ fontSize: '1rem', fontWeight: 500 }}>{profile.JoinDate?.split('T')[0] || '—'}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Performance Rating</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${profile.Performance === 'Excellent' ? 'badge-success' : 'badge-info'}`}>
                      {profile.Performance || 'Good'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={showMyBill}>
                  📄 View Monthly Payslip
                </button>
                <button className="btn btn-outline" onClick={() => setComplaintModal(true)}>
                  📢 File a Grievance
                </button>
              </div>
            </div>

            {/* Attendance Logs */}
            <div className="card">
              <div className="card-title">🕒 Recent Attendance History</div>
              <div className="table-wrapper" style={{ maxHeight: 300 }}>
                {(!data.attendance || data.attendance.length === 0) ? (
                  <div className="empty-state" style={{ padding: 20 }}><p>No attendance logs recorded</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance.map((a, idx) => (
                        <tr key={idx}>
                          <td>{a.Date?.split('T')[0]}</td>
                          <td>
                            <span className={`badge ${a.Status === 'Present' ? 'badge-success' : a.Status === 'Absent' ? 'badge-danger' : 'badge-neutral'}`}>
                              {a.Status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{a.CheckIn || '—'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{a.CheckOut || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Grievances & Training Supervised */}
          <div>
            {/* My Complaints */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="card-title" style={{ margin: 0 }}>📢 My Grievances &amp; Tickets</div>
                <button className="btn btn-sm btn-primary" onClick={() => setComplaintModal(true)}>+ New Ticket</button>
              </div>
              <div className="table-wrapper" style={{ maxHeight: 300 }}>
                {(!data.complaints || data.complaints.length === 0) ? (
                  <div className="empty-state" style={{ padding: 20 }}><p>No complaints submitted. Everything looks good!</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.complaints.map((c) => (
                        <tr key={c.ComplaintID}>
                          <td><strong>#{c.ComplaintID}</strong></td>
                          <td style={{ maxWidth: 200, fontSize: '0.85rem' }}>{c.Description}</td>
                          <td><span className={`badge ${priorityBadge[c.Priority] || 'badge-neutral'}`}>{c.Priority}</span></td>
                          <td><span className={`badge ${statusBadge[c.ComplaintStatus] || 'badge-neutral'}`}>{c.ComplaintStatus}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Training Sessions Supervised */}
            <div className="card">
              <div className="card-title">🎓 Recruits Mentored / Training Supervised</div>
              <div className="table-wrapper" style={{ maxHeight: 300 }}>
                {(!data.trainingSupervised || data.trainingSupervised.length === 0) ? (
                  <div className="empty-state" style={{ padding: 20 }}><p>No active recruit training assigned</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Recruit</th>
                        <th>Start Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trainingSupervised.map((t, idx) => (
                        <tr key={idx}>
                          <td><strong>{t.FirstName} {t.LastName}</strong></td>
                          <td>{t.TrainingStartDate?.split('T')[0]}</td>
                          <td><span className="badge badge-info">{t.TrainingStatus}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Complaint Modal */}
      {complaintModal && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ width: 450 }}>
            <div className="card-title">📢 Submit Internal Grievance</div>
            <form onSubmit={handleComplaintSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Priority Level</label>
                <select value={cForm.Priority} onChange={(e) => setCForm({ ...cForm, Priority: e.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Describe your issue / grievance *</label>
                <textarea
                  value={cForm.Description}
                  onChange={(e) => setCForm({ ...cForm, Description: e.target.value })}
                  placeholder="Explain the issue clearly..."
                  required
                  rows={4}
                  style={{ width: '100%', padding: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6, resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary">Submit to HR</button>
                <button type="button" className="btn btn-outline" onClick={() => setComplaintModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {billModal && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ width: 500, padding: 30 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>OFFICIAL SALARY PAYSLIP</h2>
              <p style={{ color: 'var(--text-muted)' }}>{billModal.Month} {billModal.Year}</p>
            </div>
            <div style={{ borderTop: '2px solid var(--border)', paddingTop: 15, marginBottom: 15 }}>
              <p><strong>Employee:</strong> {billModal.EmployeeName} (#{billModal.EmployeeID})</p>
              <p><strong>Designation:</strong> {billModal.Designation}</p>
              <p><strong>Department:</strong> {billModal.Department}</p>
              <p><strong>Pay Grade:</strong> {billModal.Grade}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th align="left">Earnings Breakdown</th>
                  <th align="right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Base Salary</td><td align="right">{Number(billModal.Earnings.Base).toLocaleString()}</td></tr>
                <tr><td>House Rent Allowance (HRA)</td><td align="right">{Number(billModal.Earnings.HRA).toLocaleString()}</td></tr>
                <tr><td>Dearness Allowance (DA)</td><td align="right">{Number(billModal.Earnings.DA).toLocaleString()}</td></tr>
                <tr><td>Other Allowances</td><td align="right">{Number(billModal.Earnings.Others).toLocaleString()}</td></tr>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                  <td>Gross Total Earnings</td><td align="right">₹{Number(billModal.TotalEarnings).toLocaleString()}</td></tr>
                <tr><td>Deductions / Taxes</td><td align="right">-₹{Number(billModal.Deductions).toLocaleString()}</td></tr>
                <tr style={{ borderTop: '2px solid var(--accent)', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  <td>NET PAYABLE</td><td align="right">₹{Number(billModal.NetPay).toLocaleString()}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Payslip</button>
              <button className="btn btn-outline" onClick={() => setBillModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
