import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

function connectToSocket() {
    const token = localStorage.getItem("token");
    return openSocket("http://localhost:8085", {
      transports: ["websocket", "polling", "flashsocket"],
      query: {
        token: JSON.parse(token),
      },
    });
}

export default connectToSocket;
