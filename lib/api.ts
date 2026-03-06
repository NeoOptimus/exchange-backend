import axios from "axios";

const API = axios.create({
baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

API.interceptors.request.use((config) => {
if (typeof window !== "undefined") {
const token = localStorage.getItem("access_token");
if (token) config.headers.Authorization = 'Bearer ${token}';
}
return config;
});

export default API;