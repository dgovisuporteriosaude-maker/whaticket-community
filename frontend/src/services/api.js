import axios from "axios";
import { getBackendUrl } from "../config";

const api = axios.create({
	baseURL: "http://localhost:8085",
	withCredentials: true,
});

export default api;


