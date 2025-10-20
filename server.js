const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8, // 100MB buffer for large images
  pingTimeout: 60000,
  pingInterval: 25000
});
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pool = require('./db');
const config = require('./config');

const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(express.static('public'));

// Store active users and messages
const users = new Map(); // socketId -> displayName
const userSockets = new Map(); // displayName -> socketId
const messages = [];
const privateMessages = new Map(); // key: "user1-user2" -> array of messages
const MAX_MESSAGES = 100; // Keep last 100 messages in memory
const MAX_PRIVATE_MESSAGES = 50;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send existing messages to new user
  socket.emit('load messages', messages);

  // Handle user join
  socket.on('user joined', (username) => {
    users.set(socket.id, username);
    userSockets.set(username, socket.id);
    io.emit('user list', Array.from(users.values()));
    io.emit('system message', {
      text: `${username} เข้าร่วมแชท`,
      timestamp: new Date().toISOString()
    });
  });

  // Handle chat message
  socket.on('chat message', (data) => {
    const message = {
      id: Date.now(),
      username: users.get(socket.id) || 'Anonymous',
      type: data.type || 'text',
      text: data.text,
      image: data.image,
      caption: data.caption,
      timestamp: new Date().toISOString()
    };

    messages.push(message);
    
    // Keep only last MAX_MESSAGES
    if (messages.length > MAX_MESSAGES) {
      messages.shift();
    }

    io.emit('chat message', message);
    
    if (message.type === 'image') {
      console.log(`📷 Image sent by ${message.username}`);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit('user typing', { username, isTyping });
    }
  });

  // Handle private messages
  socket.on('private message', (data) => {
    const fromUser = users.get(socket.id);
    const toUser = data.to;

    if (!fromUser || !toUser) return;

    console.log('📨 Received private message:', {
      from: fromUser,
      to: toUser,
      type: data.type,
      hasImage: !!data.image,
      imageSize: data.image ? data.image.length : 0
    });

    const message = {
      id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: fromUser,
      to: toUser,
      type: data.type || 'text',
      text: data.text,
      image: data.image,
      caption: data.caption,
      timestamp: new Date().toISOString()
    };

    // Store message
    const chatKey = getChatKey(fromUser, toUser);
    if (!privateMessages.has(chatKey)) {
      privateMessages.set(chatKey, []);
    }
    const chatMessages = privateMessages.get(chatKey);
    chatMessages.push(message);

    // Keep only last MAX_PRIVATE_MESSAGES
    if (chatMessages.length > MAX_PRIVATE_MESSAGES) {
      chatMessages.shift();
    }

    // Send to recipient if online
    const recipientSocketId = userSockets.get(toUser);
    if (recipientSocketId) {
      try {
        io.to(recipientSocketId).emit('private message', message);
        console.log(`✅ Private message sent to ${toUser} (${recipientSocketId})`);
      } catch (error) {
        console.error(`❌ Error sending private message to ${toUser}:`, error.message);
      }
    } else {
      console.log(`⚠️ User ${toUser} is not online`);
    }

    if (message.type === 'image') {
      console.log(`📷 Private image from ${fromUser} to ${toUser}`);
    } else {
      console.log(`💬 Private message from ${fromUser} to ${toUser}`);
    }
  });

  // Load private messages
  socket.on('load private messages', (otherUser) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    const chatKey = getChatKey(currentUser, otherUser);
    const chatMessages = privateMessages.get(chatKey) || [];

    socket.emit('load private messages', chatMessages);
  });

  // Load general messages (re-send existing messages)
  socket.on('load general messages', () => {
    socket.emit('load messages', messages);
  });

  // Clear general chat
  socket.on('clear general chat', () => {
    const username = users.get(socket.id);
    if (username) {
      messages.length = 0; // Clear array
      io.emit('general chat cleared');
      console.log(`🗑️ General chat cleared by ${username}`);
    }
  });

  // Clear private chat
  socket.on('clear private chat', (otherUser) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    const chatKey = getChatKey(currentUser, otherUser);
    privateMessages.delete(chatKey);
    
    // Notify both users
    socket.emit('private chat cleared');
    const otherSocketId = userSockets.get(otherUser);
    if (otherSocketId) {
      io.to(otherSocketId).emit('private chat cleared');
    }
    
    console.log(`🗑️ Private chat cleared between ${currentUser} and ${otherUser}`);
  });

  // Delete single message from general chat
  socket.on('delete message', (messageId) => {
    const username = users.get(socket.id);
    if (!username) return;

    const messageIndex = messages.findIndex(m => m.id == messageId && m.username === username);
    if (messageIndex !== -1) {
      messages.splice(messageIndex, 1);
      io.emit('message deleted', messageId);
      console.log(`🗑️ Message ${messageId} deleted by ${username}`);
    }
  });

  // Delete single private message
  socket.on('delete private message', (data) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    const { messageId, chatWith } = data;
    const chatKey = getChatKey(currentUser, chatWith);
    const chatMessages = privateMessages.get(chatKey);

    if (chatMessages) {
      const messageIndex = chatMessages.findIndex(m => 
        (m.id === messageId || `${m.from}-${m.timestamp}` === messageId) && 
        m.from === currentUser
      );
      
      if (messageIndex !== -1) {
        chatMessages.splice(messageIndex, 1);
        
        // Notify both users
        socket.emit('private message deleted', messageId);
        const otherSocketId = userSockets.get(chatWith);
        if (otherSocketId) {
          io.to(otherSocketId).emit('private message deleted', messageId);
        }
        
        console.log(`🗑️ Private message ${messageId} deleted by ${currentUser}`);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      userSockets.delete(username);
      io.emit('user list', Array.from(users.values()));
      io.emit('system message', {
        text: `${username} ออกจากแชท`,
        timestamp: new Date().toISOString()
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to generate consistent chat key
function getChatKey(user1, user2) {
  return [user1, user2].sort().join('-');
}

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' 
      });
    }

    // Query user from database
    const result = await pool.query(
      'SELECT * FROM chat_users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.displayName = user.display_name;

    console.log(`✅ User logged in: ${user.display_name} (${user.username})`);

    res.json({ 
      success: true, 
      displayName: user.display_name,
      message: 'เข้าสู่ระบบสำเร็จ' 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ' 
      });
    }
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', users: users.size, messages: messages.length });
});

http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});

