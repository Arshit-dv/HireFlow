import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hr_token');
      localStorage.removeItem('hr_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const loginUser    = (d) => API.post('/auth/login', d);
export const registerUser = (d) => API.post('/auth/register', d);
export const getMe        = ()  => API.get('/auth/me');

// ── Applications ─────────────────────────────────────────────
export const submitApplication  = (d)  => {
  if (d instanceof FormData) {
    return API.post('/applications', d, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return API.post('/applications', d);
};
export const getAllApplications  = ()   => API.get('/applications');
export const getApplicationById = (id) => API.get(`/applications/${id}`);
export const updateApplication  = (id, d) => API.patch(`/applications/${id}`, d);
export const deleteApplication  = (id)   => API.delete(`/applications/${id}`);
export const screenApplication  = (id, d) => API.post(`/applications/${id}/screen`, d);

// ── Candidates ───────────────────────────────────────────────
export const getAllCandidates  = (p)  => API.get('/candidates', { params: p });
export const getCandidateById  = (id) => API.get(`/candidates/${id}`);
export const createCandidate   = (d)  => API.post('/candidates', d);
export const updateCandidate   = (id, d) => API.patch(`/candidates/${id}`, d);
export const deleteCandidate   = (id)   => API.delete(`/candidates/${id}`);

// ── Interviews ───────────────────────────────────────────────
export const scheduleInterview      = (d)       => API.post('/interviews', d);
export const getAllInterviews        = ()        => API.get('/interviews');
export const updateInterviewStatus  = (id, d)   => API.patch(`/interviews/${id}`, d);
export const deleteInterview        = (id)      => API.delete(`/interviews/${id}`);

// ── Offers ───────────────────────────────────────────────────
export const generateOffer     = (d)       => API.post('/offers', d);
export const getAllOffers       = ()        => API.get('/offers');
export const getOfferById      = (id)      => API.get(`/offers/${id}`);
export const updateOffer       = (id, d)   => API.patch(`/offers/${id}`, d);
export const deleteOffer       = (id)      => API.delete(`/offers/${id}`);
export const awardOffer        = (id, d)   => API.post(`/offers/${id}/award`, d);
export const updateOfferStatus = (id, d)   => API.patch(`/offers/${id}/status`, d);

// ── Training ─────────────────────────────────────────────────
export const startTraining      = (d)             => API.post('/training', d);
export const getAllTraining      = ()              => API.get('/training');
export const completeTraining   = (candidateId, d) => API.patch(`/training/${candidateId}/complete`, d || {});
export const addTrainerFeedback = (candidateId, d) => API.post(`/training/${candidateId}/feedback`, d);
export const deleteTraining      = (candidateId)    => API.delete(`/training/${candidateId}`);

// ── Employees ────────────────────────────────────────────────
export const createEmployee  = (d)   => API.post('/employees', d);
export const getAllEmployees  = (p)  => API.get('/employees', { params: p });
export const getEmployeeById = (id) => API.get(`/employees/${id}`);
export const updateEmployee  = (id, d) => API.patch(`/employees/${id}`, d);
export const deleteEmployee  = (id)   => API.delete(`/employees/${id}`);

// ── Salary ───────────────────────────────────────────────────
export const getAllSalary    = ()   => API.get('/salary');
export const getPayscales    = ()   => API.get('/salary/payscales');
export const calculateSalary = (d)  => API.post('/salary/calculate', d);
export const getSalaryBill   = (id, m, y) => API.get(`/salary/bill/${id}?month=${m || ''}&year=${y || ''}`);
export const createSalary    = (d)  => API.post('/salary', d);
export const updateSalary    = (id, d) => API.patch(`/salary/${id}`, d);
export const deleteSalary    = (id)   => API.delete(`/salary/${id}`);
export const getSalaryById   = (id) => API.get(`/salary/${id}`);
export const deletePayscale = (id) => API.delete(`/salary/payscales/${id}`);

// ── Org: Contracts / Departments / Designations ───────────────
export const getAllContracts   = ()  => API.get('/org/contracts');
export const createContract    = (d) => API.post('/org/contracts', d);
export const updateContract    = (id, d) => API.patch(`/org/contracts/${id}`, d);
export const deleteContract    = (id)   => API.delete(`/org/contracts/${id}`);
export const getAllDepartments = ()  => API.get('/org/departments');
export const createDepartment  = (d)  => API.post('/org/departments', d);
export const updateDepartment  = (id, d) => API.patch(`/org/departments/${id}`, d);
export const deleteDepartment  = (id)   => API.delete(`/org/departments/${id}`);
export const getAllDesignations = () => API.get('/org/designations');
export const createDesignation  = (d)  => API.post('/org/designations', d);
export const updateDesignation  = (id, d) => API.patch(`/org/designations/${id}`, d);
export const deleteDesignation  = (id)   => API.delete(`/org/designations/${id}`);

// ── Complaints ───────────────────────────────────────────────
export const submitComplaint       = (d)     => API.post('/complaints', d);
export const getAllComplaints       = ()      => API.get('/complaints');
export const getComplaintsByEmp    = (id)    => API.get(`/complaints/employee/${id}`);
export const updateComplaintStatus = (id, d) => API.patch(`/complaints/${id}/status`, d);
export const deleteComplaint       = (id)    => API.delete(`/complaints/${id}`);

// ── Attendance ───────────────────────────────────────────────
export const getAttendance       = (q) => API.get('/attendance', { params: q });
export const markAttendance      = (d) => API.post('/attendance', d);
export const getAttendanceReport = (q) => API.get('/attendance/report', { params: q });

// ── Dashboard ────────────────────────────────────────────────
export const getHRDashboard       = ()   => API.get('/dashboard/hr');
export const getEmployeeDashboard = (id) => API.get(`/dashboard/employee/${id}`);

// ── Analytics ────────────────────────────────────────────────
export const getOrgAnalytics        = () => API.get('/analytics/org-view');
export const getSalaryAnalytics     = () => API.get('/analytics/salary-stats');
export const getReadyToHireAnalytics = () => API.get('/analytics/ready-to-hire');

export default API;
