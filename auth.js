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

// Track device login with advanced fingerprinting
function trackDevice(userId, req, clientFingerprint) {
  const serverFingerprint = generateServerFingerprint(req);
  const combinedFingerprint = generateCombinedFingerprint(serverFingerprint, clientFingerprint);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  // Extract additional headers for fingerprinting
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const platform = extractPlatform(userAgent);
  const browser = extractBrowser(userAgent);

  // Check if this exact device has logged in before
  const existingDevice = db.prepare(
    'SELECT id FROM devices WHERE user_id = ? AND device_fingerprint = ?'
  ).get(userId, combinedFingerprint);

  if (existingDevice) {
    // Update last login time and metadata
    db.prepare('UPDATE devices SET last_login = CURRENT_TIMESTAMP, ip_address = ?, user_agent = ?, accept_language = ?, accept_encoding = ? WHERE id = ?')
      .run(ipAddress, userAgent, acceptLanguage, acceptEncoding, existingDevice.id);
  } else {
    // Check for potential account sharing (same user, different fingerprint)
    const userDevices = db.prepare('SELECT COUNT(*) as count FROM devices WHERE user_id = ?').get(userId);
    
    // Insert new device with metadata
    db.prepare(`INSERT INTO devices (
      user_id, device_fingerprint, user_agent, ip_address, 
      accept_language, accept_encoding, platform, browser,
      client_fingerprint, server_fingerprint
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, combinedFingerprint, userAgent, ipAddress, 
           acceptLanguage, acceptEncoding, platform, browser,
           clientFingerprint, serverFingerprint);
    
    // Log warning if multiple devices detected (potential account sharing)
    if (userDevices.count > 0) {
      console.log(`[SECURITY] User ${userId} logged in from new device. Total devices: ${userDevices.count + 1}`);
    }
  }
  
  return combinedFingerprint;
}

// Generate advanced server-side fingerprint
function generateServerFingerprint(req) {
  const crypto = require('crypto');
  
  // Collect multiple fingerprint components
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.headers['accept'] || '',
    req.ip || req.connection.remoteAddress || '',
    // DNT (Do Not Track) header
    req.headers['dnt'] || '',
    // Screen resolution hints from headers
    req.headers['sec-ch-ua'] || '',
    req.headers['sec-ch-ua-mobile'] || '',
    req.headers['sec-ch-ua-platform'] || '',
  ];
  
  const fingerprintString = components.join('||');
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

// Combine client and server fingerprints for maximum uniqueness
function generateCombinedFingerprint(serverFp, clientFp) {
  const crypto = require('crypto');
  const combined = `${serverFp}::${clientFp || 'no-client-fp'}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Extract platform from user agent
function extractPlatform(userAgent) {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

// Extract browser from user agent
function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown';
}

// Verify device fingerprint on authentication
function verifyDeviceFingerprint(userId, req, clientFingerprint, callback) {
  const serverFingerprint = generateServerFingerprint(req);
  const combinedFingerprint = generateCombinedFingerprint(serverFingerprint, clientFingerprint);
  
  // Check if this device is authorized for this user
  const device = db.prepare(
    'SELECT id FROM devices WHERE user_id = ? AND device_fingerprint = ?'
  ).get(userId, combinedFingerprint);
  
  if (device) {
    callback({ authorized: true, deviceId: device.id });
  } else {
    // New device detected - check if account sharing rules are violated
    const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices WHERE user_id = ?').get(userId);
    
    // Allow up to 3 devices per account (configurable)
    const maxDevices = 3;
    
    if (deviceCount.count >= maxDevices) {
      callback({ 
        authorized: false, 
        error: `Maximum device limit reached (${maxDevices} devices). Please contact admin to authorize new device.`,
        requiresApproval: true 
      });
    } else {
      callback({ authorized: true, newDevice: true });
    }
  }
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

// Login user with advanced fingerprint verification
function loginUser(username, password, req, clientFingerprint, callback) {
  const user = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return callback({ error: 'Invalid username or password' });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return callback({ error: 'Invalid username or password' });
    }

    // Verify device fingerprint
    verifyDeviceFingerprint(user.id, req, clientFingerprint, (verifyResult) => {
      if (!verifyResult.authorized) {
        return callback({ 
          error: verifyResult.error || 'Device not authorized',
          requiresApproval: verifyResult.requiresApproval 
        });
      }
      
      // Track device (updates existing or creates new)
      trackDevice(user.id, req, clientFingerprint);

      callback({ 
        success: true, 
        userId: user.id,
        newDevice: verifyResult.newDevice 
      });
    });
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  trackDevice,
  registerUser,
  loginUser,
  verifyDeviceFingerprint
};
