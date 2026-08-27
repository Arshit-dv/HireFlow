const pool = require('../config/db');

// GET /api/training  — HR (MySQL 8.0 ONLY_FULL_GROUP_BY compatible)
const getAllTraining = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.CandidateID, t.TrainingStatus, t.TrainingStartDate, t.TrainingEndDate, t.Insights,
              MAX(a.FirstName) AS FirstName, MAX(a.LastName) AS LastName,
              MAX(c.ApplicationID) AS ApplicationID, MAX(c.Potential) AS Potential, MAX(c.ExpectedSalary) AS ExpectedSalary,
              MAX(a.PreferredRole) AS PreferredRole, MAX(r.Qualification) AS Qualification,
              GROUP_CONCAT(DISTINCT et.EmployeeID ORDER BY et.EmployeeID SEPARATOR ', ') AS TrainerEmployees,
              MAX(e.EmployeeID) AS ConvertedEmployeeID
       FROM training t
       LEFT JOIN candidate c        ON t.CandidateID = c.CandidateID
       LEFT JOIN application a      ON c.ApplicationID = a.ApplicationID
       LEFT JOIN resume r           ON c.ApplicationID = r.ApplicationID
       LEFT JOIN employeetraining et ON t.CandidateID = et.CandidateID
       LEFT JOIN employee e         ON t.CandidateID = e.CandidateID
       GROUP BY t.CandidateID, t.TrainingStatus, t.TrainingStartDate, t.TrainingEndDate, t.Insights
       ORDER BY t.TrainingStartDate DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/training  — HR: start training for awarded candidate
const startTraining = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { CandidateID, TrainingStartDate, Insights = '', TrainerEmployeeIDs = [] } = req.body;
    if (!CandidateID || !TrainingStartDate) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'CandidateID and TrainingStartDate are required' });
    }

    // Verify candidate has been awarded an offer
    const [[award]] = await conn.query('SELECT CandidateID FROM awarded WHERE CandidateID = ?', [CandidateID]);
    if (!award) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Candidate must have accepted an offer before training can begin' });
    }

    // Check training not already started
    const [[existing]] = await conn.query('SELECT CandidateID FROM training WHERE CandidateID = ?', [CandidateID]);
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Training has already been started for this candidate' });
    }

    await conn.query(
      'INSERT INTO training (CandidateID, TrainingStatus, TrainingStartDate, Insights) VALUES (?, ?, ?, ?)',
      [CandidateID, 'Ongoing', TrainingStartDate, Insights]
    );

    // Add trainer employees
    for (const empID of TrainerEmployeeIDs) {
      const [[exists]] = await conn.query(
        'SELECT ID FROM employeetraining WHERE EmployeeID=? AND CandidateID=?',
        [empID, CandidateID]
      );
      if (!exists) {
        await conn.query('INSERT INTO employeetraining (EmployeeID, CandidateID) VALUES (?, ?)', [empID, CandidateID]);
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Training started successfully', CandidateID });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PATCH /api/training/:candidateId/complete  — HR: finish training
const completeTraining = async (req, res, next) => {
  try {
    const { TrainingEndDate, Insights } = req.body;
    const CandidateID = req.params.candidateId;
    const endDate = TrainingEndDate || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      "UPDATE training SET TrainingStatus='Completed', TrainingEndDate=?, Insights=COALESCE(?,Insights) WHERE CandidateID=?",
      [endDate, Insights || null, CandidateID]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Training record not found' });
    res.json({ success: true, message: 'Training marked as Completed. Ready to convert candidate to active Employee.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/training/:candidateId/feedback  — add trainer feedback
const addTrainerFeedback = async (req, res, next) => {
  try {
    const { EmployeeID, Feedback } = req.body;
    await pool.query(
      'UPDATE employeetraining SET Feedback=? WHERE EmployeeID=? AND CandidateID=?',
      [Feedback, EmployeeID, req.params.candidateId]
    );
    res.json({ success: true, message: 'Trainer feedback saved successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/training/:candidateId  — HR
const deleteTraining = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const CandidateID = req.params.candidateId;

    await conn.query('DELETE FROM employeetraining WHERE CandidateID = ?', [CandidateID]);
    const [result] = await conn.query('DELETE FROM training WHERE CandidateID = ?', [CandidateID]);

    await conn.commit();
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Training record not found' });
    res.json({ success: true, message: 'Training record deleted successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { getAllTraining, startTraining, completeTraining, addTrainerFeedback, deleteTraining };
