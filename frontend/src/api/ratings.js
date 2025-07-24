import axios from 'axios';
import { API_BASE_URL } from '../config';

export async function createRating({ project_id, rater_id, ratee_id, value, comment, token }) {
  const res = await axios.post(`${API_BASE_URL}/ratings`,
    { project_id, rater_id, ratee_id, value, comment },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.rating;
}

export async function updateRating({ id, rater_id, value, comment, token }) {
  const res = await axios.put(`${API_BASE_URL}/ratings/${id}`,
    { rater_id, value, comment },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.rating;
}

export async function deleteRating({ id, rater_id, token }) {
  const res = await axios.delete(`${API_BASE_URL}/ratings/${id}`,
    { data: { rater_id }, headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function fetchRatings({ project_id, ratee_id, rater_id, token }) {
  const params = {};
  if (project_id) params.project_id = project_id;
  if (ratee_id) params.ratee_id = ratee_id;
  if (rater_id) params.rater_id = rater_id;
  const res = await axios.get(`${API_BASE_URL}/ratings`, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.ratings;
}

export async function fetchLeaderboard({ project_id, limit = 20, token }) {
  const params = {};
  if (project_id) params.project_id = project_id;
  if (limit) params.limit = limit;
  const res = await axios.get(`${API_BASE_URL}/ratings/leaderboard`, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.leaderboard;
} 