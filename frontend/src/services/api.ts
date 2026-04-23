// src/services/api.ts
const API_URL = "http://localhost:8000/api";

export const fetchData = async (endpoint: string) => {
  const res = await fetch(`${API_URL}/${endpoint}`);
  return res.json();
};