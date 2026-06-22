const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/counters', require('./routes/counters'));
app.use('/api/queue',    require('./routes/queue'));
app.use('/api/cart-hold', require('./routes/cartHold'));
app.use('/api/admin',    require('./routes/admin'));

// Health check
app.get('/', (req, res) => res.json({ status: 'SmartQueue+ API running ⚡' }));

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT     = process.env.PORT     || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartqueue';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.log('Starting server without DB (in-memory mode)...');
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT} [no DB]`));
  });

module.exports = { io };
