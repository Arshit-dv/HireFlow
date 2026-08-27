const pool = require('../config/db');

// GET /api/analytics/org-view — Complex JOIN Query
const getOrgView = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.EmployeeID, a.FirstName, a.LastName, 
             dept.DeptName, des.Role, e.Performance, e.JoinDate
      FROM employee e
      JOIN designation des     ON e.DesignationID = des.DesignationID
      JOIN department dept     ON des.DeptID = dept.DeptID
      JOIN candidate c         ON e.CandidateID = c.CandidateID
      JOIN application a       ON c.ApplicationID = a.ApplicationID
      ORDER BY dept.DeptName, e.JoinDate DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/salary-stats — Complex Aggregation Query
const getSalaryStats = async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT 
        COALESCE(SUM(SalaryAmount), 0) AS TotalExpenditure,
        COALESCE(AVG(SalaryAmount), 0) AS AverageSalary,
        COALESCE(MAX(SalaryAmount), 0) AS MaxSalary,
        COALESCE(MIN(SalaryAmount), 0) AS MinSalary,
        COUNT(*) AS TotalPayments
      FROM salary
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/ready-to-hire — Subquery / Filter Query
const getReadyToHire = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.CandidateID, a.FirstName, a.LastName, a.PreferredRole,
             i.InterviewStatus AS InterviewResult,
             o.OfferStatus
      FROM candidate c
      JOIN application a ON c.ApplicationID = a.ApplicationID
      JOIN interview i ON c.CandidateID = i.CandidateID AND i.InterviewStatus = 'Passed'
      LEFT JOIN offer o ON c.CandidateID = o.CandidateID
      WHERE c.CandidateID NOT IN (SELECT CandidateID FROM employee WHERE CandidateID IS NOT NULL)
      ORDER BY c.CandidateID DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOrgView, getSalaryStats, getReadyToHire };
