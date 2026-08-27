import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { getOrgAnalytics, getSalaryAnalytics, getReadyToHireAnalytics } from '../services/api';

const Analytics = () => {
  const [orgView, setOrgView] = useState([]);
  const [salaryStats, setSalaryStats] = useState(null);
  const [readyToHire, setReadyToHire] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, salaryRes, readyRes] = await Promise.all([
          getOrgAnalytics(),
          getSalaryAnalytics(),
          getReadyToHireAnalytics(),
        ]);

        if (orgRes.data?.success) setOrgView(orgRes.data.data);
        if (salaryRes.data?.success) setSalaryStats(salaryRes.data.data);
        if (readyRes.data?.success) setReadyToHire(readyRes.data.data);
      } catch (err) {
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>📊 Advanced Relational Analytics</h1>
          <p>Real-time insights generated via complex SQL JOINs, Aggregations, and Subqueries</p>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {/* Section 1: Complex 4-Table JOIN */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">1. 🔗 Multi-Table Relational JOIN: Organizational Hierarchy</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                Executes a 4-table SQL JOIN across <code>employee</code>, <code>designation</code>, <code>department</code>, and <code>application</code>.
              </p>
              <div className="table-wrapper">
                {orgView.length === 0 ? (
                  <div className="empty-state"><p>No employee records found</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Emp ID</th>
                        <th>Full Name</th>
                        <th>Department</th>
                        <th>Designation (Role)</th>
                        <th>Performance</th>
                        <th>Date of Joining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgView.map((e) => (
                        <tr key={e.EmployeeID}>
                          <td><strong>#{e.EmployeeID}</strong></td>
                          <td><div style={{ fontWeight: 600 }}>{e.FirstName} {e.LastName}</div></td>
                          <td><span className="badge badge-info">{e.DeptName}</span></td>
                          <td>{e.Role}</td>
                          <td>
                            <span className={`badge ${e.Performance === 'Excellent' ? 'badge-success' : e.Performance === 'Good' ? 'badge-info' : 'badge-pending'}`}>
                              {e.Performance}
                            </span>
                          </td>
                          <td>{e.JoinDate?.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 2: Aggregations & Subquery Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Aggregation Card */}
              <div className="card">
                <div className="card-title">2. 📈 Statistical Aggregation: Payroll Metrics</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                  Demonstrates <code>SUM()</code>, <code>AVG()</code>, <code>MAX()</code>, <code>MIN()</code> and <code>COUNT()</code>.
                </p>
                {salaryStats && (
                  <div className="form-grid" style={{ gap: 16 }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Payroll Expenditure</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>
                        ₹{Number(salaryStats.TotalExpenditure || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Monthly Salary</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--info)' }}>
                        ₹{Math.round(salaryStats.AverageSalary || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highest Salary Package</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{Number(salaryStats.MaxSalary || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Active Pay Structures</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                        {salaryStats.TotalPayments || 0}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subquery Filter Card */}
              <div className="card">
                <div className="card-title">3. 🎯 Nested Subquery: Qualified &amp; Ready to Hire</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                  Filters candidates who <code>PASSED</code> interviews but are not yet present in <code>employee</code> table.
                </p>
                <div className="table-wrapper" style={{ maxHeight: 260 }}>
                  {readyToHire.length === 0 ? (
                    <div className="empty-state" style={{ padding: 20 }}><p>All passed candidates have been hired!</p></div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Cand. ID</th>
                          <th>Candidate Name</th>
                          <th>Role</th>
                          <th>Offer Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readyToHire.map((c) => (
                          <tr key={c.CandidateID}>
                            <td><strong>#{c.CandidateID}</strong></td>
                            <td>{c.FirstName} {c.LastName}</td>
                            <td><span className="badge badge-info">{c.PreferredRole}</span></td>
                            <td>
                              <span className={`badge ${c.OfferStatus === 'Accepted' ? 'badge-success' : c.OfferStatus ? 'badge-pending' : 'badge-neutral'}`}>
                                {c.OfferStatus ? `Offer: ${c.OfferStatus}` : 'Offer Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
