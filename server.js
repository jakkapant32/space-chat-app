const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8,
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax'
  }
}));
app.use(express.static('public'));

// Store active users
const users = new Map(); // socketId -> {userId, username, displayName}
const userSockets = new Map(); // username -> socketId

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน' 
      });
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT * FROM chat_users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' 
      });
    }

    // Check if already in pending
    const pendingUser = await pool.query(
      'SELECT * FROM pending_users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (pendingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'คำขอของคุณอยู่ระหว่างการพิจารณา' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into pending users
    await pool.query(
      'INSERT INTO pending_users (username, password_hash, display_name) VALUES ($1, $2, $3)',
      [username.toLowerCase(), hashedPassword, displayName]
    );

    console.log(`📝 New registration request: ${displayName} (${username})`);

    res.json({ 
      success: true, 
      message: 'ส่งคำขอสมัครสมาชิกแล้ว รอการอนุมัติจากแอดมิน' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' 
    });
  }
});

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

    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'บัญชีของคุณถูกระงับ' 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.displayName = user.display_name;
    req.session.role = user.role;

    console.log(`✅ User logged in: ${user.display_name} (${user.username})`);

    res.json({ 
      success: true, 
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
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

// Check session status
app.get('/api/session', (req, res) => {
  console.log('🔍 Session check:', {
    userId: req.session.userId,
    username: req.session.username,
    displayName: req.session.displayName,
    role: req.session.role,
    sessionID: req.sessionID
  });
  
  if (req.session.userId) {
    res.json({ 
      success: true, 
      loggedIn: true,
      userId: req.session.userId,
      username: req.session.username,
      displayName: req.session.displayName,
      role: req.session.role
    });
  } else {
    res.json({ 
      success: true, 
      loggedIn: false 
    });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get pending users
app.get('/api/admin/pending-users', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const result = await pool.query(
      'SELECT id, username, display_name, requested_at FROM pending_users ORDER BY requested_at DESC'
    );

    res.json({ success: true, users: result.rows });

  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Approve user
app.post('/api/admin/approve-user/:id', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const { id } = req.params;

    // Get pending user
    const pendingUser = await pool.query(
      'SELECT * FROM pending_users WHERE id = $1',
      [id]
    );

    if (pendingUser.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบคำขอ' 
      });
    }

    const user = pendingUser.rows[0];

    // Move to chat_users
    await pool.query(
      'INSERT INTO chat_users (username, password_hash, display_name, role, status) VALUES ($1, $2, $3, $4, $5)',
      [user.username, user.password_hash, user.display_name, 'user', 'active']
    );

    // Delete from pending
    await pool.query('DELETE FROM pending_users WHERE id = $1', [id]);

    console.log(`✅ User approved: ${user.display_name} (${user.username})`);

    res.json({ 
      success: true, 
      message: 'อนุมัติผู้ใช้สำเร็จ' 
    });

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Reject user
app.post('/api/admin/reject-user/:id', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const { id } = req.params;

    await pool.query('DELETE FROM pending_users WHERE id = $1', [id]);

    console.log(`❌ User rejected: ID ${id}`);

    res.json({ 
      success: true, 
      message: 'ปฏิเสธคำขอสำเร็จ' 
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Get all users (admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const result = await pool.query(
      'SELECT id, username, display_name, role, status, created_at FROM chat_users ORDER BY created_at DESC'
    );

    res.json({ success: true, users: result.rows });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Suspend/Activate user
app.post('/api/admin/toggle-user-status/:id', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      'UPDATE chat_users SET status = $1 WHERE id = $2',
      [status, id]
    );

    console.log(`✅ User status updated: ID ${id} -> ${status}`);

    res.json({ 
      success: true, 
      message: 'อัปเดตสถานะสำเร็จ' 
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Delete user
app.delete('/api/admin/delete-user/:id', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const { id } = req.params;

    // Check if user exists and is not admin
    const user = await pool.query(
      'SELECT id, username, display_name, role FROM chat_users WHERE id = $1',
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    if (user.rows[0].role === 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'ไม่สามารถลบแอดมินได้' 
      });
    }

    // Delete user and related data
    await pool.query('BEGIN');
    
    // Delete friendships
    await pool.query('DELETE FROM friendships WHERE user1_id = $1 OR user2_id = $1', [id]);
    
    // Delete friend requests
    await pool.query('DELETE FROM friend_requests WHERE from_user_id = $1 OR to_user_id = $1', [id]);
    
    // Delete messages
    await pool.query('DELETE FROM messages WHERE user_id = $1', [id]);
    
    // Delete private messages
    await pool.query('DELETE FROM private_messages WHERE from_user_id = $1 OR to_user_id = $1', [id]);
    
    // Delete user
    await pool.query('DELETE FROM chat_users WHERE id = $1', [id]);
    
    await pool.query('COMMIT');

    console.log(`✅ User deleted: ID ${id} (${user.rows[0].display_name})`);

    res.json({ 
      success: true, 
      message: `ลบผู้ใช้ "${user.rows[0].display_name}" สำเร็จ` 
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Clear all chat data (admin only)
app.post('/api/admin/clear-all-chat', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    await pool.query('BEGIN');
    
    // Clear all messages
    await pool.query('DELETE FROM messages');
    
    // Clear all private messages
    await pool.query('DELETE FROM private_messages');
    
    await pool.query('COMMIT');

    console.log(`🗑️ All chat data cleared by admin: ${req.session.displayName}`);

    res.json({ 
      success: true, 
      message: 'ล้างข้อมูลแชททั้งหมดสำเร็จ' 
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error clearing all chat data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Change user password (admin only)
app.post('/api/admin/change-password/:id', async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'คุณไม่มีสิทธิ์เข้าถึง' 
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // Check if user exists
    const user = await pool.query(
      'SELECT id, username, display_name FROM chat_users WHERE id = $1',
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE chat_users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, id]
    );

    console.log(`🔑 Password changed for user: ${user.rows[0].display_name} (${user.rows[0].username})`);

    res.json({ 
      success: true, 
      message: `เปลี่ยนรหัสผ่านของ "${user.rows[0].display_name}" สำเร็จ` 
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Toggle sleep mode
app.post('/api/sleep-mode', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const { enabled } = req.body;

    await pool.query(
      'UPDATE chat_users SET sleep_mode = $1 WHERE id = $2',
      [enabled, req.session.userId]
    );

    console.log(`😴 Sleep mode ${enabled ? 'enabled' : 'disabled'} for user: ${req.session.displayName}`);

    res.json({ 
      success: true, 
      message: `โหมดสลีป${enabled ? 'เปิด' : 'ปิด'}แล้ว` 
    });

  } catch (error) {
    console.error('Error toggling sleep mode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Get user sleep mode status
app.get('/api/sleep-mode', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const result = await pool.query(
      'SELECT sleep_mode FROM chat_users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    res.json({ 
      success: true, 
      sleepMode: result.rows[0].sleep_mode 
    });

  } catch (error) {
    console.error('Error getting sleep mode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// ============================================
// FRIEND SYSTEM ENDPOINTS
// ============================================

// Search users
app.get('/api/users/search', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const { q } = req.query;

    const result = await pool.query(
      `SELECT id, username, display_name FROM chat_users 
       WHERE (username ILIKE $1 OR display_name ILIKE $1) 
       AND id != $2 AND status = 'active' 
       LIMIT 20`,
      [`%${q}%`, req.session.userId]
    );

    res.json({ success: true, users: result.rows });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Send friend request
app.post('/api/friends/request', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const { toUserId } = req.body;

    // Check if already friends
    const friendship = await pool.query(
      `SELECT * FROM friendships 
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [req.session.userId, toUserId]
    );

    if (friendship.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'คุณเป็นเพื่อนกับผู้ใช้นี้อยู่แล้ว' 
      });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT * FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2',
      [req.session.userId, toUserId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'คุณได้ส่งคำขอเป็นเพื่อนไปแล้ว' 
      });
    }

    // Insert friend request
    await pool.query(
      'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES ($1, $2, $3)',
      [req.session.userId, toUserId, 'pending']
    );

    // Notify the other user via socket
    const toUser = await pool.query('SELECT username FROM chat_users WHERE id = $1', [toUserId]);
    if (toUser.rows.length > 0) {
      const toSocketId = userSockets.get(toUser.rows[0].username);
      if (toSocketId) {
        io.to(toSocketId).emit('friend request', {
          from: req.session.displayName,
          fromUserId: req.session.userId
        });
      }
    }

    console.log(`👥 Friend request: ${req.session.displayName} -> User ${toUserId}`);

    res.json({ 
      success: true, 
      message: 'ส่งคำขอเป็นเพื่อนแล้ว' 
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Get friend requests
app.get('/api/friends/requests', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const result = await pool.query(
      `SELECT fr.id, fr.from_user_id, u.display_name, u.username, fr.created_at
       FROM friend_requests fr
       JOIN chat_users u ON fr.from_user_id = u.id
       WHERE fr.to_user_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.session.userId]
    );

    res.json({ success: true, requests: result.rows });

  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Accept friend request
app.post('/api/friends/accept/:requestId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const { requestId } = req.params;

    // Get request
    const request = await pool.query(
      'SELECT * FROM friend_requests WHERE id = $1 AND to_user_id = $2',
      [requestId, req.session.userId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบคำขอ' 
      });
    }

    const { from_user_id, to_user_id } = request.rows[0];

    // Create friendship (ensure user1_id < user2_id for consistency)
    const user1 = Math.min(from_user_id, to_user_id);
    const user2 = Math.max(from_user_id, to_user_id);

    await pool.query(
      'INSERT INTO friendships (user1_id, user2_id) VALUES ($1, $2)',
      [user1, user2]
    );

    // Delete friend request
    await pool.query('DELETE FROM friend_requests WHERE id = $1', [requestId]);

    console.log(`✅ Friend request accepted: ${from_user_id} <-> ${to_user_id}`);

    res.json({ 
      success: true, 
      message: 'ยอมรับคำขอเป็นเพื่อนแล้ว' 
    });

  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Reject friend request
app.post('/api/friends/reject/:requestId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const { requestId } = req.params;

    await pool.query(
      'DELETE FROM friend_requests WHERE id = $1 AND to_user_id = $2',
      [requestId, req.session.userId]
    );

    console.log(`❌ Friend request rejected: ${requestId}`);

    res.json({ 
      success: true, 
      message: 'ปฏิเสธคำขอแล้ว' 
    });

  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// Get friends list
app.get('/api/friends', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'กรุณาเข้าสู่ระบบ' 
      });
    }

    const result = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.display_name 
       FROM friendships f
       JOIN chat_users u ON (
         CASE 
           WHEN f.user1_id = $1 THEN u.id = f.user2_id
           WHEN f.user2_id = $1 THEN u.id = f.user1_id
         END
       )
       WHERE (f.user1_id = $1 OR f.user2_id = $1) AND u.status = 'active'
       ORDER BY u.display_name`,
      [req.session.userId]
    );

    res.json({ success: true, friends: result.rows });

  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด' 
    });
  }
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user join
  socket.on('user joined', async (data) => {
    const { username, userId, displayName } = data;
    
    users.set(socket.id, { userId, username, displayName });
    userSockets.set(username, socket.id);
    
    // Send online users list
    const onlineUsers = Array.from(users.values());
    io.emit('user list', onlineUsers);
    
    // Load general messages from database
    try {
      const result = await pool.query(
        `SELECT m.id, m.type, m.text, m.image, m.caption, m.created_at, u.display_name as username
         FROM messages m
         JOIN chat_users u ON m.user_id = u.id
         ORDER BY m.created_at DESC
         LIMIT 50`
      );
      
      const messages = result.rows.reverse(); // Show oldest first
      socket.emit('load messages', messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    
    // Welcome message
    socket.emit('system message', {
      text: `${displayName} เข้าร่วมแชท`,
      timestamp: new Date().toISOString()
    });
  });


  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('user typing', { username: user.displayName, isTyping });
    }
  });

  // Handle general chat messages
  socket.on('chat message', async (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    try {
      // Sleep mode check removed - allow all messages

      // Save to database
      const result = await pool.query(
        `INSERT INTO messages (user_id, username, type, text, image, caption) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
        [user.userId, user.displayName, data.type || 'text', data.text, data.image, data.caption]
      );

      const message = {
        id: result.rows[0].id,
        username: user.displayName,
        type: data.type || 'text',
        text: data.text,
        image: data.image,
        caption: data.caption,
        created_at: result.rows[0].created_at
      };

      // Broadcast to all users
      io.emit('chat message', message);

      console.log(`💬 General message from ${user.displayName}`);
    } catch (error) {
      console.error('Error sending general message:', error);
    }
  });

  // Load general messages
  socket.on('load messages', async () => {
    const user = users.get(socket.id);
    if (!user) return;

    try {
      const result = await pool.query(
        `SELECT m.id, m.type, m.text, m.image, m.caption, m.created_at, u.display_name as username
         FROM messages m
         JOIN chat_users u ON m.user_id = u.id
         ORDER BY m.created_at DESC
         LIMIT 50`
      );
      
      const messages = result.rows.reverse(); // Show oldest first
      socket.emit('load messages', messages);
    } catch (error) {
      console.error('Error loading general messages:', error);
    }
  });

  // Clear general chat from database (Pluto and Saturn only)
  socket.on('clear general chat from db', async () => {
    const user = users.get(socket.id);
    if (!user) return;

    // Check if user has permission
    if (user.displayName !== 'Pluto' && user.displayName !== 'Saturn') {
      socket.emit('system message', {
        text: 'คุณไม่มีสิทธิ์ลบแชทจากฐานข้อมูล',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      // Delete all messages from database
      await pool.query('DELETE FROM messages');
      
      // Notify all users
      io.emit('general chat cleared');
      
      console.log(`🗑️ General chat cleared from database by ${user.displayName}`);
    } catch (error) {
      console.error('Error clearing general chat:', error);
    }
  });

  // Clear private chat from database (Pluto and Saturn only)
  socket.on('clear private chat from db', async (otherUser) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    // Check if user has permission
    if (currentUser.displayName !== 'Pluto' && currentUser.displayName !== 'Saturn') {
      socket.emit('system message', {
        text: 'คุณไม่มีสิทธิ์ลบแชทจากฐานข้อมูล',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      // Get other user ID
      const otherUserResult = await pool.query(
        'SELECT id FROM chat_users WHERE display_name = $1',
        [otherUser]
      );

      if (otherUserResult.rows.length === 0) return;

      const otherUserId = otherUserResult.rows[0].id;

      // Delete all private messages between these two users
      await pool.query(
        'DELETE FROM private_messages WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)',
        [currentUser.userId, otherUserId]
      );
      
      // Notify both users
      socket.emit('private chat cleared');
      
      // Notify the other user if online
      const otherSocketId = userSockets.get(otherUser.toLowerCase());
      if (otherSocketId) {
        io.to(otherSocketId).emit('private chat cleared');
      }
      
      console.log(`🗑️ Private chat between ${currentUser.displayName} and ${otherUser} cleared from database`);
    } catch (error) {
      console.error('Error clearing private chat:', error);
    }
  });

  // Handle private messages
  socket.on('private message', async (data) => {
    const fromUser = users.get(socket.id);
    if (!fromUser) return;

    try {
      // Sleep mode check removed - allow all messages

      // Get recipient user ID
      const toUserResult = await pool.query(
        'SELECT id, username FROM chat_users WHERE display_name = $1',
        [data.to]
      );

      if (toUserResult.rows.length === 0) return;

      const toUserId = toUserResult.rows[0].id;
      const toUsername = toUserResult.rows[0].username;

      // Save to database
      const result = await pool.query(
        `INSERT INTO private_messages (from_user_id, to_user_id, type, text, image, caption) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
        [fromUser.userId, toUserId, data.type || 'text', data.text, data.image, data.caption]
      );

      const message = {
        id: result.rows[0].id,
        from: fromUser.displayName,
        to: data.to,
        type: data.type || 'text',
        text: data.text,
        image: data.image,
        caption: data.caption,
        created_at: result.rows[0].created_at
      };

      // Send to recipient if online
      const recipientSocketId = userSockets.get(toUsername);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('private message', message);
      }

      // Send back to sender
      socket.emit('private message', message);

      console.log(`💬 Private message from ${fromUser.displayName} to ${data.to}`);
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  });

  // Load private messages
  socket.on('load private messages', async (otherUser) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    try {
      const otherUserResult = await pool.query(
        'SELECT id FROM chat_users WHERE display_name = $1',
        [otherUser]
      );

      if (otherUserResult.rows.length === 0) return;

      const otherUserId = otherUserResult.rows[0].id;

      const result = await pool.query(
        `SELECT pm.id, 
                u1.display_name as from_name, 
                u2.display_name as to_name,
                pm.type, pm.text, pm.image, pm.caption,
                pm.created_at
         FROM private_messages pm
         JOIN chat_users u1 ON pm.from_user_id = u1.id
         JOIN chat_users u2 ON pm.to_user_id = u2.id
         WHERE (pm.from_user_id = $1 AND pm.to_user_id = $2)
            OR (pm.from_user_id = $2 AND pm.to_user_id = $1)
         ORDER BY pm.created_at`,
        [currentUser.userId, otherUserId]
      );

      const messages = result.rows.map(row => ({
        id: row.id,
        from: row.from_name,
        to: row.to_name,
        type: row.type,
        text: row.text,
        image: row.image,
        caption: row.caption,
        created_at: row.created_at
      }));

      socket.emit('load private messages', messages);
    } catch (error) {
      console.error('Error loading private messages:', error);
    }
  });

  // Delete message (only sender's side)
  socket.on('delete message', async (messageId) => {
    const user = users.get(socket.id);
    if (!user) return;

    try {
      await pool.query(
        'DELETE FROM messages WHERE id = $1 AND user_id = $2',
        [messageId, user.userId]
      );

      // Notify all users to remove the message
      io.emit('message deleted', messageId);

      console.log(`🗑️ Message ${messageId} deleted by ${user.displayName}`);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // Delete private message (Pluto can delete both sides)
  socket.on('delete private message', async (data) => {
    const currentUser = users.get(socket.id);
    if (!currentUser) return;

    try {
      const { messageId } = data;

      // Pluto can delete any message, others can only delete their own
      let deleteQuery;
      if (currentUser.displayName === 'Pluto') {
        // Pluto can delete any message in the conversation
        deleteQuery = 'DELETE FROM private_messages WHERE id = $1';
      } else {
        // Others can only delete their own messages
        deleteQuery = 'DELETE FROM private_messages WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)';
      }

      await pool.query(deleteQuery, [messageId, currentUser.userId]);

      socket.emit('private message deleted', messageId);

      console.log(`🗑️ Private message ${messageId} deleted by ${currentUser.displayName} (${currentUser.displayName === 'Pluto' ? 'FULL ACCESS' : 'OWN MESSAGES ONLY'})`);
    } catch (error) {
      console.error('Error deleting private message:', error);
    }
  });

  // WebRTC Signaling for Video/Voice calls
  socket.on('call-user', (data) => {
    const { to, offer, callType } = data;
    const fromUser = users.get(socket.id);
    
    const toSocketId = userSockets.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('incoming-call', {
        from: fromUser.displayName,
        offer,
        callType
      });
    }
  });

  socket.on('call-answer', (data) => {
    const { to, answer } = data;
    const toSocketId = userSockets.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-answered', { answer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    const toSocketId = userSockets.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    const toSocketId = userSockets.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-ended');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      userSockets.delete(user.username);
      io.emit('user list', Array.from(users.values()));
      io.emit('system message', {
        text: `${user.displayName} ออกจากแชท`,
        timestamp: new Date().toISOString()
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', users: users.size });
});

http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
