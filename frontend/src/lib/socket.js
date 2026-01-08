// frontend/src/lib/socket.js
import { io } from 'socket.io-client';

// Change this to your deployed backend URL on Render
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const socket = io(BACKEND_URL, { withCredentials: true });
