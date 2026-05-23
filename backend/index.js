const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  socket.on('joinBoard', (boardId) => {
    socket.join(boardId);
  });
  socket.on('leaveBoard', (boardId) => {
    socket.leave(boardId);
  });
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://taskflow-alpha-henna.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/boards', require('./src/routes/boardRoutes'));
app.use('/api/boards', require('./src/routes/memberRoutes'));
app.use('/api/tasks', require('./src/routes/taskRoutes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running' });
});

const { query } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

query('SELECT NOW()')
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  });

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});