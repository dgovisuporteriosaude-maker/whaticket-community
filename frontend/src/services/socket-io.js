import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

function connectToSocket() {
<<<<<<< Updated upstream
    const token = localStorage.getItem("token");
    return openSocket(getBackendUrl(), {
      transports: ["websocket", "polling", "flashsocket"],
      query: {
        token: JSON.parse(token),
      },
    });
=======
  const rawToken = localStorage.getItem("token");
  const token = rawToken ? JSON.parse(rawToken) : null;

  return openSocket(getBackendUrl(), {
    transports: ["websocket", "polling", "flashsocket"],
    query: token ? { token } : {},
  });
>>>>>>> Stashed changes
}

export default connectToSocket;