import axios from "axios";
import { getBackendUrl } from "../config";

const api = axios.create({
<<<<<<< Updated upstream
	baseURL: getBackendUrl(),
	withCredentials: true,
=======
  baseURL: getBackendUrl(),
  withCredentials: true,
>>>>>>> Stashed changes
});

export default api;
