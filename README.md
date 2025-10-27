# sec-proxy

A secure web proxy based on Ultraviolet with authentication, invite-only registration, and device tracking.

## Features

- 🔒 **Secure Authentication System** - Login/Register with session management
- 🎫 **Invite-Only Registration** - Users need a valid invite code to register
- 📱 **Advanced Device Tracking** - Multi-point fingerprinting to prevent account sharing
  - Canvas fingerprinting
  - WebGL fingerprinting
  - Audio fingerprinting
  - Font detection
  - Screen properties
  - Browser/platform detection
  - Timezone and language settings
  - Maximum 3 devices per account
- 👨‍💼 **Admin Dashboard** - View all users, their devices, and manage invite codes
- 🌐 **Ultraviolet Proxy** - Browse the web securely through Ultraviolet proxy technology
- 🔐 **Password Hashing** - Secure password storage using bcrypt
- 💾 **SQLite Database** - Lightweight database for user and device data

## Screenshots

### Login Page
![Login Page](https://github.com/user-attachments/assets/9125e3c0-0e35-4aff-8fcd-5f8fa128c2b8)

### Registration Page
![Register Page](https://github.com/user-attachments/assets/c9ffffde-1738-429b-a0a6-f62c8732c492)

### Proxy Interface
![Proxy Page](https://github.com/user-attachments/assets/dbc3537f-9359-469f-b7af-21e362818282)

### Admin Dashboard
![Admin Panel](https://github.com/user-attachments/assets/38ec7245-bc4f-4838-9bfe-9297f9da718f)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/alott2223/sec-proxy.git
cd sec-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Default Credentials

On first run, a default admin account and invite code are created:

- **Username:** `admin`
- **Password:** `admin123`
- **Invite Code:** `WELCOME2023`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

## Usage

### For Users

1. **Registration:**
   - Navigate to `/register`
   - Enter a username and password
   - Enter a valid invite code (obtain from admin)
   - Click Register

2. **Login:**
   - Navigate to `/login`
   - Enter your credentials
   - Click Login

3. **Using the Proxy:**
   - After logging in, enter any URL in the search box
   - Click "Go" to browse through the proxy
   - Your session is tracked for security

### For Admins

1. **Access Admin Panel:**
   - Login with an admin account
   - Click "Admin Panel" button in the navbar

2. **Generate Invite Codes:**
   - In the admin panel, click "Generate New Invite Code"
   - Share the generated code with users who need to register

3. **View User Devices:**
   - The admin panel shows all users and their devices
   - Device information includes:
     - Platform and Browser
     - User Agent
     - IP Address
     - Language preferences
     - Unique device fingerprint (hash)
     - Last Login time
     - First Seen time
   - Device count displayed per user
   - Advanced fingerprinting prevents account sharing

4. **Account Sharing Prevention:**
   - Each account is limited to 3 devices
   - Attempting to login from a 4th device will be blocked
   - Admin can monitor all devices per account

4. **Monitor Invite Codes:**
   - View all invite codes (used and unused)
   - See who created each code
   - See who used each code and when

## Database Schema

The application uses SQLite with three main tables:

- **users** - Stores user accounts and admin status
- **invite_codes** - Manages invite codes and their usage
- **devices** - Tracks device fingerprints and login history

## Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Session-based authentication with HTTP-only cookies
- ✅ Invite-only registration system
- ✅ **Advanced device fingerprinting** to prevent account sharing:
  - Canvas fingerprinting
  - WebGL fingerprinting (GPU identification)
  - Audio context fingerprinting
  - Font detection
  - Screen properties and resolution
  - Browser and platform detection
  - Timezone and language settings
  - Combined client + server fingerprinting
  - Maximum 3 devices per account limit
- ✅ Admin-only routes protected by middleware
- ✅ SQL injection prevention via prepared statements
- ✅ Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- ✅ Rate limiting on API endpoints (100 requests per 15 minutes)
- ✅ Secure cookies in production mode

## Configuration

You can modify the following in `server.js`:

- **Port:** Default is 3000 (or `process.env.PORT`)
- **Session Secret:** Change `your-secret-key-change-this-in-production`
- **Cookie Security:** Set `secure: true` if using HTTPS

## Development

For development with auto-reload:

```bash
npm run dev
```

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** bcrypt, express-session
- **Proxy:** Ultraviolet, bare-server-node
- **Frontend:** Vanilla HTML/CSS/JavaScript

## API Endpoints

### Authentication
- `POST /api/login` - Login with username/password
- `POST /api/register` - Register new user with invite code
- `POST /api/logout` - Logout current user
- `GET /api/user` - Get current user info

### Admin (Requires Admin Role)
- `GET /api/admin/users` - Get all users with their devices
- `GET /api/admin/invites` - Get all invite codes
- `POST /api/admin/invite` - Generate new invite code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For issues or questions, please open an issue on GitHub.
