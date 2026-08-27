const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// POST /api/employees  — HR: convert trained candidate to employee
const createEmployee = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { CandidateID, SalaryID, DesignationID, ContractID, JoinDate, Performance = 'Good', PayscaleID } = req.body;
    if (!CandidateID || !SalaryID || !DesignationID || !ContractID || !JoinDate) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'CandidateID, SalaryID, DesignationID, ContractID, and JoinDate are required' });
    }

    // Verify training is completed
    const [[training]] = await conn.query(
      "SELECT CandidateID FROM training WHERE CandidateID=? AND TrainingStatus='Completed'",
      [CandidateID]
    );
    if (!training) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Candidate training must be marked as Completed before converting to an employee' });
    }

    // Check not already an employee
    const [[alreadyEmp]] = await conn.query(
      'SELECT EmployeeID FROM employee WHERE CandidateID=?',
      [CandidateID]
    );
    if (alreadyEmp) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Candidate is already an active employee' });
    }

    const EmpID = await nextID('employee', 'EmployeeID', conn);
    await conn.query(
      'INSERT INTO employee (EmployeeID, CandidateID, SalaryID, DesignationID, ContractID, JoinDate, Performance, PayscaleID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [EmpID, CandidateID, SalaryID, DesignationID, ContractID, JoinDate, Performance, PayscaleID || null]
    );

    // Link in employeecandidate junction table
    const [[hasLink]] = await conn.query('SELECT ID FROM employeecandidate WHERE EmployeeID=? AND CandidateID=?', [EmpID, CandidateID]);
    if (!hasLink) {
      await conn.query('INSERT INTO employeecandidate (EmployeeID, CandidateID) VALUES (?, ?)', [EmpID, CandidateID]);
    }

    // Update headcount
    await conn.query('UPDATE designation SET NoOfEmployees = NoOfEmployees + 1 WHERE DesignationID = ?', [DesignationID]);
    const [[desig]] = await conn.query('SELECT DeptID FROM designation WHERE DesignationID = ?', [DesignationID]);
    if (desig?.DeptID) {
      await conn.query('UPDATE department SET DeptNoOfEmployees = DeptNoOfEmployees + 1 WHERE DeptID = ?', [desig.DeptID]);
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Employee created and onboarded successfully!', EmployeeID: EmpID });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/employees  — HR
const getAllEmployees = async (req, res, next) => {
  try {
    const { performance, minSalary } = req.query;
    let query = `
       SELECT e.EmployeeID, e.CandidateID, e.SalaryID, e.DesignationID, e.ContractID, e.JoinDate, e.Performance, e.PayscaleID,
              s.SalaryAmount, s.SalaryDate,
              d.Role, d.DeptID, d.Vacancies, d.NoOfEmployees,
              dept.DeptName, dept.DeptPerformance, dept.DeptNoOfEmployees,
              ct.ContractDate, ct.NoticePeriod,
              c.ApplicationID, a.FirstName, a.LastName, a.PreferredRole, a.ResumeUrl, r.Qualification,
              p.Grade, p.BaseSalary
       FROM employee e
       LEFT JOIN salary s          ON e.SalaryID = s.SalaryID
       LEFT JOIN designation d     ON e.DesignationID = d.DesignationID
       LEFT JOIN department dept   ON d.DeptID = dept.DeptID
       LEFT JOIN contract ct       ON e.ContractID = ct.ContractID
       LEFT JOIN candidate c       ON e.CandidateID = c.CandidateID
       LEFT JOIN application a     ON c.ApplicationID = a.ApplicationID
       LEFT JOIN resume r          ON c.ApplicationID = r.ApplicationID
       LEFT JOIN payscale p        ON e.PayscaleID = p.PayscaleID
       WHERE 1=1
    `;

    const params = [];
    if (performance) {
      query += ` AND e.Performance = ?`;
      params.push(performance);
    }
    if (minSalary !== undefined && minSalary !== '') {
      const salNum = parseFloat(minSalary);
      if (!isNaN(salNum)) {
        query += ` AND (s.SalaryAmount >= ? OR p.BaseSalary >= ?)`;
        params.push(salNum, salNum);
      }
    }

    query += ` ORDER BY e.JoinDate DESC, e.EmployeeID DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
  try {
    const [[emp]] = await pool.query(
      `SELECT e.*, s.SalaryAmount, s.SalaryDate,
              d.Role, d.DeptID, d.Vacancies,
              dept.DeptName, dept.DeptPerformance, dept.DeptNoOfEmployees,
              ct.ContractDate, ct.NoticePeriod,
              p.Grade, p.BaseSalary, p.HRA, p.DA, p.Others, a.FirstName, a.LastName, a.ResumeUrl
       FROM employee e
       LEFT JOIN salary s        ON e.SalaryID = s.SalaryID
       LEFT JOIN designation d   ON e.DesignationID = d.DesignationID
       LEFT JOIN department dept ON d.DeptID = dept.DeptID
       LEFT JOIN contract ct     ON e.ContractID = ct.ContractID
       LEFT JOIN payscale p      ON e.PayscaleID = p.PayscaleID
       LEFT JOIN candidate c     ON e.CandidateID = c.CandidateID
       LEFT JOIN application a   ON c.ApplicationID = a.ApplicationID
       WHERE e.EmployeeID = ?`,
      [req.params.id]
    );
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const [complaints]    = await pool.query('SELECT * FROM complaint WHERE EmployeeID=? ORDER BY ComplaintDateTime DESC', [req.params.id]);
    const [trainingSup]   = await pool.query('SELECT et.*, t.TrainingStatus FROM employeetraining et LEFT JOIN training t ON et.CandidateID=t.CandidateID WHERE et.EmployeeID=?', [req.params.id]);
    const [interviewsCond] = await pool.query(
      `SELECT ec.CandidateID, i.InterviewDate, i.InterviewStatus, a.FirstName, a.LastName 
       FROM employeecandidate ec 
       JOIN interview i ON ec.CandidateID=i.CandidateID 
       JOIN candidate c ON i.CandidateID=c.CandidateID 
       JOIN application a ON c.ApplicationID=a.ApplicationID 
       WHERE ec.EmployeeID=?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...emp, complaints, trainingSupervisedList: trainingSup, interviewsConducted: interviewsCond } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/employees/:id  — HR
const updateEmployee = async (req, res, next) => {
  try {
    const { Performance, JoinDate, SalaryID, DesignationID, ContractID, PayscaleID } = req.body;
    await pool.query(
      `UPDATE employee 
       SET Performance=COALESCE(?,Performance), 
           JoinDate=COALESCE(?,JoinDate),
           SalaryID=COALESCE(?,SalaryID),
           DesignationID=COALESCE(?,DesignationID),
           ContractID=COALESCE(?,ContractID),
           PayscaleID=COALESCE(?,PayscaleID)
       WHERE EmployeeID=?`,
      [Performance, JoinDate, SalaryID, DesignationID, ContractID, PayscaleID || null, req.params.id]
    );
    res.json({ success: true, message: 'Employee details updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id — HR
const deleteEmployee = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;

    await conn.query('DELETE FROM employeetraining WHERE EmployeeID = ?', [id]);
    await conn.query('DELETE FROM employeecandidate WHERE EmployeeID = ?', [id]);
    await conn.query('DELETE FROM complaint WHERE EmployeeID = ?', [id]);
    await conn.query('DELETE FROM attendance WHERE EmployeeID = ?', [id]);
    const [result] = await conn.query('DELETE FROM employee WHERE EmployeeID = ?', [id]);

    await conn.commit();
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { createEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee };
