const pool = require('../config/db');
const { uploadToStorage } = require('../config/s3');

/* Helper: get next auto-ID safely using transaction connection */
const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// POST /api/applications  — public
// Supports JSON body or multipart/form-data with resume file upload
const submitApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { FirstName, LastName, PreferredRole, Qualification, Specialization, YearsOfExperience } = req.body;
    let { Skills = [], Projects = [] } = req.body;

    if (!PreferredRole || !Qualification || !FirstName || !LastName) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'FirstName, LastName, Role, and Qualification are required fields',
      });
    }

    // Parse Skills/Projects if sent as JSON string or comma-separated
    if (typeof Skills === 'string') {
      try { Skills = JSON.parse(Skills); } catch { Skills = Skills.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    if (typeof Projects === 'string') {
      try { Projects = JSON.parse(Projects); } catch { Projects = Projects.split(',').map((p) => p.trim()).filter(Boolean); }
    }

    // Handle resume file upload (S3 or local storage)
    let resumeUrl = req.body.ResumeUrl || null;
    if (req.file) {
      resumeUrl = await uploadToStorage(req.file, 'resumes');
    }

    const AppID = await nextID('application', 'ApplicationID', conn);
    const today = new Date().toISOString().split('T')[0];

    await conn.query(
      'INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [AppID, FirstName, LastName, PreferredRole, today, resumeUrl]
    );

    await conn.query(
      'INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (?, ?, ?, ?)',
      [AppID, Qualification, Specialization || 'General', Number(YearsOfExperience) || 0]
    );

    if (Array.isArray(Skills)) {
      for (const skill of Skills.filter(Boolean)) {
        await conn.query('INSERT INTO resumeskills (ApplicationID, Skill) VALUES (?, ?)', [AppID, skill]);
      }
    }

    if (Array.isArray(Projects)) {
      for (const project of Projects.filter(Boolean)) {
        await conn.query('INSERT INTO resumeprojects (ApplicationID, Project) VALUES (?, ?)', [AppID, project]);
      }
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      ApplicationID: AppID,
      ResumeUrl: resumeUrl,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/applications  — HR
const getAllApplications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.ApplicationID, a.FirstName, a.LastName, a.PreferredRole, a.ApplicationDate, a.ResumeUrl,
              MAX(r.Qualification) AS Qualification, MAX(r.Specialization) AS Specialization, MAX(r.YearsOfExperience) AS YearsOfExperience,
              GROUP_CONCAT(DISTINCT rs.Skill ORDER BY rs.Skill SEPARATOR ', ') AS Skills,
              GROUP_CONCAT(DISTINCT rp.Project ORDER BY rp.Project SEPARATOR ', ')  AS Projects,
              MAX(s.ApplicationID) AS HasCandidate,
              MAX(s.ScreeningStatus) AS ScreeningStatus
       FROM application a
       LEFT JOIN resume r         ON a.ApplicationID = r.ApplicationID
       LEFT JOIN resumeskills rs   ON a.ApplicationID = rs.ApplicationID
       LEFT JOIN resumeprojects rp ON a.ApplicationID = rp.ApplicationID
       LEFT JOIN screening s       ON a.ApplicationID = s.ApplicationID
       GROUP BY a.ApplicationID, a.FirstName, a.LastName, a.PreferredRole, a.ApplicationDate, a.ResumeUrl
       ORDER BY a.ApplicationDate DESC, a.ApplicationID DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id  — HR
const getApplicationById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [[app]] = await pool.query(
      `SELECT a.*, r.Qualification, r.Specialization, r.YearsOfExperience FROM application a
       LEFT JOIN resume r ON a.ApplicationID = r.ApplicationID
       WHERE a.ApplicationID = ?`,
      [id]
    );
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const [skills]    = await pool.query('SELECT Skill FROM resumeskills WHERE ApplicationID = ?', [id]);
    const [projects]  = await pool.query('SELECT Project FROM resumeprojects WHERE ApplicationID = ?', [id]);
    const [screening] = await pool.query('SELECT * FROM screening WHERE ApplicationID = ?', [id]);

    res.json({ success: true, data: { ...app, skills, projects, screening } });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/screen  — HR: evaluate & convert application to candidate
const screenApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { ExpectedSalary, Potential, ScreeningStatus = 'Passed' } = req.body;
    const AppID = req.params.id;

    // Check application exists
    const [[app]] = await conn.query('SELECT ApplicationID FROM application WHERE ApplicationID = ?', [AppID]);
    if (!app) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Check not already screened
    const [[existing]] = await conn.query('SELECT CandidateID FROM screening WHERE ApplicationID = ?', [AppID]);
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Application has already been screened' });
    }

    const CandID = await nextID('candidate', 'CandidateID', conn);

    await conn.query(
      'INSERT INTO candidate (CandidateID, ApplicationID, ExpectedSalary, Potential) VALUES (?, ?, ?, ?)',
      [CandID, AppID, ExpectedSalary ? Number(ExpectedSalary) : null, Potential || 'Medium']
    );
    await conn.query(
      'INSERT INTO screening (ApplicationID, CandidateID, ScreeningStatus) VALUES (?, ?, ?)',
      [AppID, CandID, ScreeningStatus]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      message: ScreeningStatus === 'Passed' ? 'Candidate qualified and created' : 'Screening recorded as Failed',
      CandidateID: CandID,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PATCH /api/applications/:id  — HR
const updateApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;
    const { FirstName, LastName, PreferredRole, Qualification, Specialization, YearsOfExperience, Skills, Projects } = req.body;

    await conn.query(
      `UPDATE application a 
       LEFT JOIN resume r ON a.ApplicationID = r.ApplicationID
       SET a.FirstName = COALESCE(?, a.FirstName),
           a.LastName = COALESCE(?, a.LastName),
           a.PreferredRole = COALESCE(?, a.PreferredRole),
           r.Qualification = COALESCE(?, r.Qualification),
           r.Specialization = COALESCE(?, r.Specialization),
           r.YearsOfExperience = COALESCE(?, r.YearsOfExperience)
       WHERE a.ApplicationID = ?`,
      [FirstName, LastName, PreferredRole, Qualification, Specialization, YearsOfExperience, id]
    );

    if (Array.isArray(Skills)) {
      await conn.query('DELETE FROM resumeskills WHERE ApplicationID = ?', [id]);
      for (const skill of Skills.filter(Boolean)) {
        await conn.query('INSERT INTO resumeskills (ApplicationID, Skill) VALUES (?, ?)', [id, skill]);
      }
    }

    if (Array.isArray(Projects)) {
      await conn.query('DELETE FROM resumeprojects WHERE ApplicationID = ?', [id]);
      for (const project of Projects.filter(Boolean)) {
        await conn.query('INSERT INTO resumeprojects (ApplicationID, Project) VALUES (?, ?)', [id, project]);
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Application updated successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// DELETE /api/applications/:id  — HR
const deleteApplication = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;

    const [cands] = await conn.query('SELECT CandidateID FROM candidate WHERE ApplicationID = ?', [id]);
    for (const c of cands) {
      const cid = c.CandidateID;
      await conn.query('DELETE FROM employeetraining WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM training WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM awarded WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM offer WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM interview WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM employeecandidate WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM screening WHERE CandidateID = ?', [cid]);
      await conn.query('DELETE FROM candidate WHERE CandidateID = ?', [cid]);
    }

    await conn.query('DELETE FROM screening WHERE ApplicationID = ?', [id]);
    await conn.query('DELETE FROM resumeprojects WHERE ApplicationID = ?', [id]);
    await conn.query('DELETE FROM resumeskills WHERE ApplicationID = ?', [id]);
    await conn.query('DELETE FROM resume WHERE ApplicationID = ?', [id]);
    const [result] = await conn.query('DELETE FROM application WHERE ApplicationID = ?', [id]);

    await conn.commit();
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, message: 'Application and all related data deleted' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  screenApplication,
  updateApplication,
  deleteApplication,
};
