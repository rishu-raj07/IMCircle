import { io } from "socket.io-client";
import { getAccessToken } from "../utils/storage";
import { SOCKET_URL } from "../config/platform.js";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  // The server authenticates every connection (see socket.js on the
  // backend) — it tries the accessToken cookie first, then this. Sending it
  // explicitly here means the socket still authenticates correctly even if
  // the frontend and API end up on different domains where the cookie
  // wouldn't ride along. Using a function (not a plain object) so the
  // freshest token is read on every (re)connect, including after a refresh.
  auth: (cb) => cb({ token: getAccessToken() }),
});