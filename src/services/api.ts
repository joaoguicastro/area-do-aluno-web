import axios from 'axios';

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: base,           // ex.: https://api.infinitycurso.com.br
  
});
