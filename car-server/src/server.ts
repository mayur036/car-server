import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// Type definitions for our events
interface CarCommand {
  action: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;
}

interface Telemetry {
  battery?: number;
  rssi?: number;
  status?: string;
}

// Define the shape of events flowing through Socket.IO
interface ServerToClientEvents {
  command: (cmd: CarCommand) => void;
  telemetry: (data: Telemetry) => void;
}

interface ClientToServerEvents {
  register: (role: 'car' | 'remote') => void;
  command: (cmd: CarCommand) => void;
  telemetry: (data: Telemetry) => void;
}

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' }
});

app.use(express.static('public'));

// Health check endpoint — useful for debugging
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('register', (role) => {
    socket.join(role);
    console.log(`→ Registered as: ${role}`);
  });

  socket.on('command', (cmd) => {
    console.log('Command:', cmd);
    io.to('car').emit('command', cmd);
  });

  socket.on('telemetry', (data) => {
    io.to('remote').emit('telemetry', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
  });
});

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} on this PC`);
  console.log(`Or http://<your-PC-IP>:${PORT} on other devices`);
});