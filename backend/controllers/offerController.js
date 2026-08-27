const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// POST /api/offers  — HR: generate an offer
const generateOffer = async (req, res, next) => {
  try {
    const { CandidateID, SalaryID, ContractID, DateGenerated } = req.body;
    if (!CandidateID || !SalaryID || !ContractID) {
      return res.status(400).json({ success: false, message: 'CandidateID, SalaryID, and ContractID are required' });
    }

    // Verify interview passed
    const [[interview]] = await pool.query(
      "SELECT InterviewID FROM interview WHERE CandidateID = ? AND InterviewStatus = 'Passed' LIMIT 1",
      [CandidateID]
    );
    if (!interview) {
      return res.status(400).json({ success: false, message: 'Candidate must have a Passed interview before generating an offer' });
    }

    // Verify salary and contract exist
    const [[sal]] = await pool.query('SELECT SalaryID FROM salary WHERE SalaryID = ?', [SalaryID]);
    if (!sal) return res.status(404).json({ success: false, message: 'Selected SalaryID does not exist' });
    const [[ct]] = await pool.query('SELECT ContractID FROM contract WHERE ContractID = ?', [ContractID]);
    if (!ct) return res.status(404).json({ success: false, message: 'Selected ContractID does not exist' });

    const OfferID = await nextID('offer', 'OfferID');
    const today = DateGenerated || new Date().toISOString().split('T')[0];

    await pool.query(
      'INSERT INTO offer (OfferID, CandidateID, SalaryID, ContractID, DateGenerated, OfferStatus) VALUES (?, ?, ?, ?, ?, ?)',
      [OfferID, CandidateID, SalaryID, ContractID, today, 'Pending']
    );
    res.status(201).json({ success: true, message: 'Offer generated successfully', OfferID });
  } catch (err) {
    next(err);
  }
};

// GET /api/offers  — HR
const getAllOffers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.OfferID, o.CandidateID, o.SalaryID, o.ContractID,
              a.FirstName, a.LastName,
              o.DateGenerated, o.UpdatedDate, o.OfferStatus,
              s.SalaryAmount, s.SalaryDate,
              ct.ContractDate, ct.NoticePeriod,
              c.ApplicationID, c.Potential, c.ExpectedSalary,
              a.PreferredRole, r.Qualification,
              aw.AwardedDate, aw.AwardedTime
       FROM offer o
       LEFT JOIN salary s      ON o.SalaryID = s.SalaryID
       LEFT JOIN contract ct   ON o.ContractID = ct.ContractID
       LEFT JOIN candidate c   ON o.CandidateID = c.CandidateID
       LEFT JOIN application a ON c.ApplicationID = a.ApplicationID
       LEFT JOIN resume r      ON c.ApplicationID = r.ApplicationID
       LEFT JOIN awarded aw    ON o.CandidateID = aw.CandidateID AND o.OfferID = aw.OfferID
       ORDER BY o.DateGenerated DESC, o.OfferID DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/offers/:id — HR
const getOfferById = async (req, res, next) => {
  try {
    const [[offer]] = await pool.query(
      `SELECT o.*, s.SalaryAmount, s.SalaryDate, ct.ContractDate, ct.NoticePeriod,
              c.Potential, c.ExpectedSalary, a.PreferredRole, r.Qualification, a.FirstName, a.LastName
       FROM offer o
       LEFT JOIN salary s      ON o.SalaryID = s.SalaryID
       LEFT JOIN contract ct   ON o.ContractID = ct.ContractID
       LEFT JOIN candidate c   ON o.CandidateID = c.CandidateID
       LEFT JOIN application a ON c.ApplicationID = a.ApplicationID
       LEFT JOIN resume r      ON c.ApplicationID = r.ApplicationID
       WHERE o.OfferID = ?`,
      [req.params.id]
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
};

// POST /api/offers/:id/award  — HR: candidate accepts offer → insert into awarded
const awardOffer = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { CandidateID } = req.body;
    const OfferID = req.params.id;
    if (!CandidateID) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'CandidateID is required' });
    }

    const [[offer]] = await conn.query('SELECT OfferID FROM offer WHERE OfferID = ?', [OfferID]);
    if (!offer) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const [[existing]] = await conn.query('SELECT AwardID FROM awarded WHERE CandidateID=? AND OfferID=?', [CandidateID, OfferID]);
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Offer has already been awarded to this candidate' });
    }

    const now = new Date();
    const awardedDate = now.toISOString().split('T')[0];
    const awardedTime = now.toTimeString().split(' ')[0];

    await conn.query(
      'INSERT INTO awarded (OfferID, CandidateID, AwardedDate, AwardedTime) VALUES (?, ?, ?, ?)',
      [OfferID, CandidateID, awardedDate, awardedTime]
    );
    await conn.query("UPDATE offer SET OfferStatus='Accepted', UpdatedDate=? WHERE OfferID=?", [awardedDate, OfferID]);

    await conn.commit();
    res.json({ success: true, message: 'Offer awarded and accepted successfully!' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PATCH /api/offers/:id/status  — HR: update offer status
const updateOfferStatus = async (req, res, next) => {
  try {
    const { OfferStatus } = req.body;
    const valid = ['Pending', 'Accepted', 'Rejected', 'Expired'];
    if (!valid.includes(OfferStatus)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` });
    }
    const today = new Date().toISOString().split('T')[0];
    await pool.query('UPDATE offer SET OfferStatus=?, UpdatedDate=? WHERE OfferID=?', [OfferStatus, today, req.params.id]);
    res.json({ success: true, message: `Offer status updated to ${OfferStatus}` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/offers/:id — HR
const updateOffer = async (req, res, next) => {
  try {
    const { SalaryID, ContractID, OfferStatus } = req.body;
    await pool.query(
      'UPDATE offer SET SalaryID=COALESCE(?,SalaryID), ContractID=COALESCE(?,ContractID), OfferStatus=COALESCE(?,OfferStatus), UpdatedDate=? WHERE OfferID=?',
      [SalaryID, ContractID, OfferStatus, new Date().toISOString().split('T')[0], req.params.id]
    );
    res.json({ success: true, message: 'Offer updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/offers/:id — HR
const deleteOffer = async (req, res, next) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM awarded WHERE OfferID = ?', [id]);
    await pool.query('DELETE FROM offer WHERE OfferID = ?', [id]);
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateOffer, getAllOffers, getOfferById, awardOffer, updateOfferStatus, updateOffer, deleteOffer };
