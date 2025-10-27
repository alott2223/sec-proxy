const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    created_by INTEGER,
    used_by INTEGER,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device_fingerprint TEXT NOT NULL,
    client_fingerprint TEXT,
    server_fingerprint TEXT,
    user_agent TEXT,
    ip_address TEXT,
    accept_language TEXT,
    accept_encoding TEXT,
    platform TEXT,
    browser TEXT,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
  CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
`);

// Insert default admin user and invite code if they don't exist
const bcrypt = require('bcrypt');

const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!checkAdmin) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const insertAdmin = db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)');
  insertAdmin.run('admin', hashedPassword);
  console.log('Default admin account created (username: admin, password: admin123)');
  
  // Create a default invite code
  const insertInvite = db.prepare('INSERT INTO invite_codes (code, created_by) VALUES (?, ?)');
  const adminId = db.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
  insertInvite.run('WELCOME2023', adminId);
  console.log('Default invite code created: WELCOME2023');
}

module.exports = db;
