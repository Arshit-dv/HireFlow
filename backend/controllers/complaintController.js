const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// POST /api/complaints  — employee or HR submits grievance
const submitComplaint = async (req, res, next) => {
  try {
    let { EmployeeID, ComplaintStatus = 'Open', Priority = 'Medium', Description } = req.body;

    // Security: if user is employee, force EmployeeID to their own ReferenceID
    if (req.user && req.user.Role === 'employee') {
      if (!req.user.ReferenceID) {
        return res.status(400).json({ success: false, message: 'Your user account is not linked to an Employee record yet.' });
      }
      EmployeeID = req.user.ReferenceID;
    }

    if (!EmployeeID) {
      return res.status(400).json({ success: false, message: 'EmployeeID is required' });
    }
    if (!Description) {
      return res.status(400).json({ success: false, message: 'Complaint description is required' });
    }

    const [[emp]] = await pool.query('SELECT EmployeeID FROM employee WHERE EmployeeID=?', [EmployeeID]);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const ComplaintID = await nextID('complaint', 'ComplaintID');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      'INSERT INTO complaint (ComplaintID, EmployeeID, ComplaintStatus, Description, ComplaintDateTime, Priority) VALUES (?, ?, ?, ?, ?, ?)',
      [ComplaintID, EmployeeID, ComplaintStatus, Description, now, Priority]
    );
    res.status(201).json({ success: true, message: 'Complaint logged successfully', ComplaintID });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints  — HR
const getAllComplaints = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.ComplaintID, c.EmployeeID, c.Description, c.ComplaintStatus, c.ComplaintDateTime, c.Priority,
              e.DesignationID, e.JoinDate, e.Performance,
              d.Role AS DesignationRole,
              a.FirstName, a.LastName
       FROM complaint c
       LEFT JOIN employee e    ON c.EmployeeID = e.EmployeeID
       LEFT JOIN designation d ON e.DesignationID = d.DesignationID
       LEFT JOIN candidate cd  ON e.CandidateID = cd.CandidateID
       LEFT JOIN application a ON cd.ApplicationID = a.ApplicationID
       ORDER BY c.ComplaintDateTime DESC, c.ComplaintID DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/employee/:employeeId
const getComplaintsByEmployee = async (req, res, next) => {
  try {
    const targetEmpId = req.params.employeeId;

    // Security check: Employee can only access their own complaints
    if (req.user && req.user.Role === 'employee' && String(req.user.ReferenceID) !== String(targetEmpId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own complaints' });
    }

    const [rows] = await pool.query(
      `SELECT c.*, d.Role AS DesignationRole
       FROM complaint c
       LEFT JOIN employee e    ON c.EmployeeID = e.EmployeeID
       LEFT JOIN designation d ON e.DesignationID = d.DesignationID
       WHERE c.EmployeeID=? 
       ORDER BY c.ComplaintDateTime DESC`,
      [targetEmpId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/complaints/:id/status  — HR updates complaint status
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { ComplaintStatus, Priority } = req.body;
    const valid = ['Open', 'Under Review', 'Resolved', 'Closed'];
    if (ComplaintStatus && !valid.includes(ComplaintStatus)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` });
    }
    await pool.query(
      'UPDATE complaint SET ComplaintStatus=COALESCE(?,ComplaintStatus), Priority=COALESCE(?,Priority) WHERE ComplaintID=?',
      [ComplaintStatus, Priority, req.params.id]
    );
    res.json({ success: true, message: 'Complaint status updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/complaints/:id — HR
const deleteComplaint = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM complaint WHERE ComplaintID = ?', [req.params.id]);
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitComplaint, getAllComplaints, getComplaintsByEmployee, updateComplaintStatus, deleteComplaint };
