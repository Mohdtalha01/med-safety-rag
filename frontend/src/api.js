import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE, timeout: 120000 });

// Safety
export const checkMedicationSafety = (p) => api.post('/api/safety/check', p).then(r => r.data);

// Patients
export const getPatients      = ()           => api.get('/api/patients/').then(r => r.data);
export const getPatient       = (id)         => api.get(`/api/patients/${id}`).then(r => r.data);
export const addPatient       = (data)       => api.post('/api/patients/', data).then(r => r.data);
export const updatePatient    = (id, data)   => api.put(`/api/patients/${id}`, data).then(r => r.data);
export const deletePatient    = (id)         => api.delete(`/api/patients/${id}`).then(r => r.data);
export const addMedication    = (id, med)    => api.post(`/api/patients/${id}/medications`, med).then(r => r.data);
export const removeMedication = (id, name)   => api.delete(`/api/patients/${id}/medications/${name}`).then(r => r.data);

// Drugs
export const getDrugs         = (search)     => api.get('/api/drugs/', { params: search ? { search } : {} }).then(r => r.data);
export const getDrug          = (id)         => api.get(`/api/drugs/${id}`).then(r => r.data);
export const checkDrugPair    = (d1, d2)     => api.get('/api/drugs/check-pair', { params: { drug1: d1, drug2: d2 } }).then(r => r.data);

// History
export const getHistory       = (limit = 50) => api.get('/api/history/', { params: { limit } }).then(r => r.data);
export const clearHistory     = ()           => api.delete('/api/history/').then(r => r.data);

// Health
export const healthCheck      = ()           => api.get('/health').then(r => r.data);

export default api;
