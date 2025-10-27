const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createBareServer } = require('bare-server-node');
const http = require('http');
const rateLimit = require('express-rate-limit');

const db = require('./database');
const auth = require('./auth');

const app = express();
const bareServer = createBareServer('/bare/');

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve service worker from root
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Routes
// Home page - redirect to login if not authenticated
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'proxy.html'));
  } else {
    res.redirect('/login');
  }
});

// Login page
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
  }
});

// Admin dashboard
app.get('/admin', auth.requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Login
app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  
  auth.loginUser(username, password, req, (result) => {
    if (result.success) {
      req.session.userId = result.userId;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: result.error });
    }
  });
});

// API: Register
app.post('/api/register', authLimiter, (req, res) => {
  const { username, password, inviteCode } = req.body;
  
  auth.registerUser(username, password, inviteCode, (result) => {
    if (result.success) {
      req.session.userId = result.userId;
      auth.trackDevice(result.userId, req);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  });
});

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// API: Get current user
app.get('/api/user', auth.requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(req.session.userId);
  res.json(user);
});

// API: Admin - Get all users with their devices
app.get('/api/admin/users', auth.requireAdmin, apiLimiter, (req, res) => {
  const users = db.prepare('SELECT id, username, is_admin, created_at FROM users').all();
  
  const usersWithDevices = users.map(user => {
    const devices = db.prepare(
      'SELECT id, device_fingerprint, user_agent, ip_address, last_login, created_at FROM devices WHERE user_id = ? ORDER BY last_login DESC'
    ).all(user.id);
    
    return {
      ...user,
      devices
    };
  });
  
  res.json(usersWithDevices);
});

// API: Admin - Create invite code
app.post('/api/admin/invite', auth.requireAdmin, apiLimiter, (req, res) => {
  const code = generateInviteCode();
  const result = db.prepare('INSERT INTO invite_codes (code, created_by) VALUES (?, ?)').run(code, req.session.userId);
  res.json({ success: true, code });
});

// API: Admin - Get all invite codes
app.get('/api/admin/invites', auth.requireAdmin, apiLimiter, (req, res) => {
  const invites = db.prepare(`
    SELECT 
      ic.id, 
      ic.code, 
      ic.created_at,
      ic.used_at,
      creator.username as created_by_username,
      user.username as used_by_username
    FROM invite_codes ic
    LEFT JOIN users creator ON ic.created_by = creator.id
    LEFT JOIN users user ON ic.used_by = user.id
    ORDER BY ic.created_at DESC
  `).all();
  
  res.json(invites);
});

// Generate random invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Proxy routes - require authentication
app.use('/uv/', auth.requireAuth, express.static(path.join(__dirname, 'node_modules/@titaniumnetwork-dev/ultraviolet/dist')));

const server = http.createServer();

server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Default credentials: username=admin, password=admin123');
  console.log('Default invite code: WELCOME2023');
});
