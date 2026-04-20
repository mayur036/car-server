import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// Type definitions for our events
interface CarCommand {
  action: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;
}

// Extended telemetry — includes MPU6050 readings from the car
interface Telemetry {
  pitch?: number;       // tilt front/back in degrees
  roll?: number;        // tilt left/right in degrees
  accel?: number;       // total acceleration magnitude in G
  speed?: number;       // current motor speed (after safety adjustment)
  emergency?: boolean;  // true during collision / tip-over
  rssi?: number;        // WiFi signal strength
  battery?: number;     // optional battery percentage
  status?: string;
}

type CarStatus = 'online' | 'offline';

interface ServerToClientEvents {
  command: (cmd: CarCommand) => void;
  telemetry: (data: Telemetry) => void;
  car_status: (status: CarStatus) => void;
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

// Health check endpoint — useful for debugging and UptimeRobot keep-alive
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Helper — is any car currently connected?
function isCarOnline(): boolean {
  const carRoom = io.sockets.adapter.rooms.get('car');
  return !!carRoom && carRoom.size > 0;
}

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log('✅ Client connected:', socket.id);
  let registeredRole: 'car' | 'remote' | null = null;

  socket.on('register', (role) => {
    socket.join(role);
    registeredRole = role;
    console.log(`→ Registered as: ${role}`);

    if (role === 'car') {
      // Tell all remotes the car just came online
      io.to('remote').emit('car_status', 'online');
    } else if (role === 'remote') {
      // Send current car status to this newly registered remote
      socket.emit('car_status', isCarOnline() ? 'online' : 'offline');
    }
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
    // If this was the car, tell remotes the car went offline
    if (registeredRole === 'car' && !isCarOnline()) {
      io.to('remote').emit('car_status', 'offline');
    }
  });
});

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} on this PC`);
  console.log(`Or http://<your-PC-IP>:${PORT} on other devices`);
});
