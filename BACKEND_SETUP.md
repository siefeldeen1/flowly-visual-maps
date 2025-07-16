# Backend Setup Guide

This document provides instructions for setting up the Node.js/Express backend with MongoDB and Socket.IO for the Mind Map Editor.

## Tech Stack

- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **Socket.IO** for real-time collaboration
- **JWT** for authentication
- **bcryptjs** for password hashing

## Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── mapController.js
│   │   └── nodeController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── models/
│   │   ├── User.js
│   │   ├── MindMap.js
│   │   └── Node.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── maps.js
│   │   └── nodes.js
│   ├── socket/
│   │   └── handlers.js
│   └── server.js
├── package.json
└── .env
```

## Installation

1. Create a new directory and initialize the project:
```bash
mkdir mindmap-backend
cd mindmap-backend
npm init -y
```

2. Install dependencies:
```bash
npm install express mongoose socket.io jsonwebtoken bcryptjs cors dotenv helmet express-rate-limit
npm install -D nodemon
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mindmap
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

## Database Schemas

### User Schema
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### MindMap Schema
```javascript
const mindMapSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nodes: [{
    id: String,
    type: { type: String, enum: ['rectangle', 'ellipse', 'diamond'] },
    position: { x: Number, y: Number },
    size: { width: Number, height: Number },
    text: String,
    fill: String,
    stroke: String,
    strokeWidth: Number
  }],
  edges: [{
    id: String,
    sourceNodeId: String,
    targetNodeId: String,
    sourceAnchor: { x: Number, y: Number },
    targetAnchor: { x: Number, y: Number }
  }],
  isPublic: { type: Boolean, default: false },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Mind Maps
- `GET /api/maps` - Get user's mind maps (protected)
- `POST /api/maps` - Create new mind map (protected)
- `GET /api/maps/:id` - Get specific mind map (protected)
- `PUT /api/maps/:id` - Update mind map (protected)
- `DELETE /api/maps/:id` - Delete mind map (protected)

### Nodes & Edges
- `POST /api/maps/:id/nodes` - Add node to map (protected)
- `PUT /api/maps/:id/nodes/:nodeId` - Update node (protected)
- `DELETE /api/maps/:id/nodes/:nodeId` - Delete node (protected)
- `POST /api/maps/:id/edges` - Add edge to map (protected)
- `DELETE /api/maps/:id/edges/:edgeId` - Delete edge (protected)

## Socket.IO Events

### Client to Server
- `join-map` - Join a specific mind map room
- `leave-map` - Leave a mind map room
- `node-update` - Update node position/properties
- `node-add` - Add new node
- `node-delete` - Delete node
- `edge-add` - Add new edge
- `edge-delete` - Delete edge

### Server to Client
- `node-updated` - Broadcast node updates to other users
- `node-added` - Broadcast new node to other users
- `node-deleted` - Broadcast node deletion to other users
- `edge-added` - Broadcast new edge to other users
- `edge-deleted` - Broadcast edge deletion to other users
- `user-joined` - Notify when user joins the map
- `user-left` - Notify when user leaves the map

## Sample Server Code

### server.js
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/maps');
const socketHandlers = require('./socket/handlers');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);

// Socket.IO
socketHandlers(io);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Socket Handlers Example
```javascript
const jwt = require('jsonwebtoken');
const MindMap = require('../models/MindMap');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-map', async (data) => {
      const { mapId, token } = data;
      
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        
        // Verify user has access to this map
        const map = await MindMap.findById(mapId);
        if (!map || (map.userId.toString() !== decoded.userId && !map.collaborators.includes(decoded.userId))) {
          socket.emit('error', 'Access denied');
          return;
        }
        
        socket.join(mapId);
        socket.currentMap = mapId;
        
        // Notify others in the room
        socket.to(mapId).emit('user-joined', { userId: decoded.userId });
        
      } catch (error) {
        socket.emit('error', 'Authentication failed');
      }
    });

    socket.on('node-update', (data) => {
      if (socket.currentMap) {
        socket.to(socket.currentMap).emit('node-updated', data);
      }
    });

    socket.on('disconnect', () => {
      if (socket.currentMap) {
        socket.to(socket.currentMap).emit('user-left', { userId: socket.userId });
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
```

## Running the Backend

1. Start MongoDB:
```bash
# Using MongoDB Community Edition
mongod
```

2. Start the backend server:
```bash
npm run dev
```

The server will run on `http://localhost:5000` by default.

## Frontend Integration

Update the frontend API calls to point to your backend:

```javascript
// In your frontend store
const API_BASE_URL = 'http://localhost:5000/api';

// For Socket.IO connection
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token')
  }
});
```

## Deployment

For production deployment, consider:

1. Use environment variables for all sensitive data
2. Enable MongoDB Atlas for cloud database
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Set up proper CORS policies
5. Implement proper logging and monitoring
6. Use HTTPS in production

## Security Considerations

- Always validate user input
- Implement proper rate limiting
- Use HTTPS in production
- Sanitize data before saving to database
- Implement proper error handling
- Use strong JWT secrets
- Implement proper session management