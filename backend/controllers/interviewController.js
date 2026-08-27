const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// POST /api/interviews  — HR
// Body: { CandidateID, InterviewDate, Time, Venue, InterviewerEmployeeIDs[] }
const scheduleInterview = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { CandidateID, InterviewDate, Time, Venue, InterviewerEmployeeIDs = [] } = req.body;
    if (!CandidateID || !InterviewDate || !Time) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'CandidateID, InterviewDate, and Time are required' });
    }

    // Verify candidate exists
    const [[cand]] = await conn.query('SELECT CandidateID FROM candidate WHERE CandidateID = ?', [CandidateID]);
    if (!cand) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const IntID = await nextID('interview', 'InterviewID', conn);
    await conn.query(
      'INSERT INTO interview (InterviewID, CandidateID, InterviewDate, Time, Venue, InterviewStatus) VALUES (?, ?, ?, ?, ?, ?)',
      [IntID, CandidateID, InterviewDate, Time, Venue || 'Head Office', 'Scheduled']
    );

    // Add interviewers
    for (const empID of InterviewerEmployeeIDs) {
      const [[exists]] = await conn.query(
        'SELECT ID FROM employeecandidate WHERE EmployeeID = ? AND CandidateID = ?',
        [empID, CandidateID]
      );
      if (!exists) {
        await conn.query('INSERT INTO employeecandidate (EmployeeID, CandidateID) VALUES (?, ?)', [empID, CandidateID]);
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Interview scheduled successfully', InterviewID: IntID });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/interviews  — HR (MySQL 8.0 ONLY_FULL_GROUP_BY compatible)
const getAllInterviews = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.InterviewID, i.CandidateID, i.InterviewDate, i.Time, i.Venue, i.InterviewStatus,
              MAX(a.FirstName) AS FirstName, MAX(a.LastName) AS LastName,
              MAX(c.ApplicationID) AS ApplicationID, MAX(c.Potential) AS Potential, MAX(c.ExpectedSalary) AS ExpectedSalary,
              MAX(a.PreferredRole) AS PreferredRole, MAX(r.Qualification) AS Qualification, MAX(r.Specialization) AS Specialization,
              GROUP_CONCAT(DISTINCT ec.EmployeeID ORDER BY ec.EmployeeID SEPARATOR ', ') AS Interviewers
       FROM interview i
       LEFT JOIN candidate c           ON i.CandidateID = c.CandidateID
       LEFT JOIN application a         ON c.ApplicationID = a.ApplicationID
       LEFT JOIN resume r              ON c.ApplicationID = r.ApplicationID
       LEFT JOIN employeecandidate ec  ON i.CandidateID = ec.CandidateID
       GROUP BY i.InterviewID, i.CandidateID, i.InterviewDate, i.Time, i.Venue, i.InterviewStatus
       ORDER BY i.InterviewDate DESC, i.InterviewID DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/interviews/:id  — HR: update status (Scheduled / Passed / Failed / Cancelled)
const updateInterviewStatus = async (req, res, next) => {
  try {
    const { InterviewStatus } = req.body;
    const valid = ['Scheduled', 'Passed', 'Failed', 'Cancelled'];
    if (!valid.includes(InterviewStatus)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` });
    }

    const [result] = await pool.query(
      'UPDATE interview SET InterviewStatus = ? WHERE InterviewID = ?',
      [InterviewStatus, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, message: `Interview marked as ${InterviewStatus}` });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/interviews/:id — HR
const deleteInterview = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM interview WHERE InterviewID = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, message: 'Interview deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { scheduleInterview, getAllInterviews, updateInterviewStatus, deleteInterview };
