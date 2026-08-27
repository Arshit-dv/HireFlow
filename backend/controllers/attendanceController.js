const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// GET /api/attendance
const getAttendance = async (req, res, next) => {
  try {
    let { employee_id, start_date, end_date } = req.query;

    // If employee is requesting, restrict to their own ID
    if (req.user && req.user.Role === 'employee') {
      employee_id = req.user.ReferenceID;
    }

    let query = `
      SELECT a.*, e.Performance, d.Role as Designation,
             app.FirstName, app.LastName
      FROM attendance a
      JOIN employee e ON a.EmployeeID = e.EmployeeID
      LEFT JOIN designation d ON e.DesignationID = d.DesignationID
      LEFT JOIN candidate c ON e.CandidateID = c.CandidateID
      LEFT JOIN application app ON c.ApplicationID = app.ApplicationID
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) {
      query += " AND a.EmployeeID = ?";
      params.push(employee_id);
    }
    if (start_date) {
      query += " AND a.Date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND a.Date <= ?";
      params.push(end_date);
    }
    query += " ORDER BY a.Date DESC, a.AttendanceID DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance (Mark daily attendance)
const markAttendance = async (req, res, next) => {
  try {
    const { EmployeeID, Date: attDate, Status = 'Present', CheckIn, CheckOut } = req.body;
    if (!EmployeeID || !attDate) {
      return res.status(400).json({ success: false, message: 'EmployeeID and Date are required' });
    }

    // Verify employee exists
    const [[emp]] = await pool.query('SELECT EmployeeID FROM employee WHERE EmployeeID=?', [EmployeeID]);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Check if attendance already marked for this date
    const [[existing]] = await pool.query(
      'SELECT AttendanceID FROM attendance WHERE EmployeeID=? AND Date=?',
      [EmployeeID, attDate]
    );
    if (existing) {
      // Update existing record
      await pool.query(
        'UPDATE attendance SET Status=?, CheckIn=COALESCE(?, CheckIn), CheckOut=COALESCE(?, CheckOut) WHERE AttendanceID=?',
        [Status, CheckIn || null, CheckOut || null, existing.AttendanceID]
      );
      return res.json({ success: true, message: 'Attendance updated successfully', AttendanceID: existing.AttendanceID });
    }

    const id = await nextID('attendance', 'AttendanceID');
    await pool.query(
      'INSERT INTO attendance (AttendanceID, EmployeeID, Date, Status, CheckIn, CheckOut) VALUES (?, ?, ?, ?, ?, ?)',
      [id, EmployeeID, attDate, Status, CheckIn || '09:00:00', CheckOut || '18:00:00']
    );
    res.status(201).json({ success: true, message: 'Attendance recorded successfully', AttendanceID: id });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/report (Aggregated monthly report)
const getAttendanceReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    let query = `
      SELECT e.EmployeeID, 
             app.FirstName, app.LastName, d.Role,
             COUNT(CASE WHEN a.Status = 'Present' THEN 1 END) as PresentDays,
             COUNT(CASE WHEN a.Status = 'Absent' THEN 1 END) as AbsentDays,
             COUNT(CASE WHEN a.Status = 'Leave' THEN 1 END) as LeaveDays,
             COUNT(CASE WHEN a.Status = 'Half-Day' THEN 1 END) as HalfDays
      FROM employee e
      LEFT JOIN candidate c ON e.CandidateID = c.CandidateID
      LEFT JOIN application app ON c.ApplicationID = app.ApplicationID
      LEFT JOIN designation d ON e.DesignationID = d.DesignationID
      LEFT JOIN attendance a ON e.EmployeeID = a.EmployeeID
    `;
    const params = [];
    if (month && year) {
      query += " AND MONTH(a.Date) = ? AND YEAR(a.Date) = ?";
      params.push(month, year);
    }
    query += " GROUP BY e.EmployeeID, app.FirstName, app.LastName, d.Role ORDER BY e.EmployeeID";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAttendance, markAttendance, getAttendanceReport };
