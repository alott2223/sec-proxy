const bcrypt = require('bcrypt');
const db = require('./database');

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
    if (user && user.is_admin === 1) {
      next();
    } else {
      res.status(403).send('Access denied. Admin privileges required.');
    }
  } else {
    res.redirect('/login');
  }
}

// Track device login
function trackDevice(userId, req) {
  const deviceFingerprint = generateDeviceFingerprint(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Check if this device has logged in before
  const existingDevice = db.prepare(
    'SELECT id FROM devices WHERE user_id = ? AND device_fingerprint = ?'
  ).get(userId, deviceFingerprint);

  if (existingDevice) {
    // Update last login time
    db.prepare('UPDATE devices SET last_login = CURRENT_TIMESTAMP, ip_address = ?, user_agent = ? WHERE id = ?')
      .run(ipAddress, userAgent, existingDevice.id);
  } else {
    // Insert new device
    db.prepare('INSERT INTO devices (user_id, device_fingerprint, user_agent, ip_address) VALUES (?, ?, ?, ?)')
      .run(userId, deviceFingerprint, userAgent, ipAddress);
  }
}

// Generate a simple device fingerprint based on user agent and IP
function generateDeviceFingerprint(req) {
  const crypto = require('crypto');
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  return crypto.createHash('sha256').update(userAgent + ip).digest('hex');
}

// Register a new user
function registerUser(username, password, inviteCode, callback) {
  // Verify invite code
  const invite = db.prepare('SELECT id, used_by FROM invite_codes WHERE code = ?').get(inviteCode);
  
  if (!invite) {
    return callback({ error: 'Invalid invite code' });
  }
  
  if (invite.used_by !== null) {
    return callback({ error: 'Invite code has already been used' });
  }

  // Check if username already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return callback({ error: 'Username already exists' });
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return callback({ error: 'Error creating account' });
    }

    try {
      // Create user
      const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
      const userId = result.lastInsertRowid;

      // Mark invite code as used
      db.prepare('UPDATE invite_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(userId, invite.id);

      callback({ success: true, userId });
    } catch (error) {
      callback({ error: 'Error creating account' });
    }
  });
}

// Login user
function loginUser(username, password, req, callback) {
  const user = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return callback({ error: 'Invalid username or password' });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return callback({ error: 'Invalid username or password' });
    }

    // Track device
    trackDevice(user.id, req);

    callback({ success: true, userId: user.id });
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  trackDevice,
  registerUser,
  loginUser
};
