# sec-proxy Deployment Guide

## 🚀 Deployment Options

sec-proxy is a Node.js backend application and cannot be deployed directly to GitHub Pages (which only supports static files). Here are your deployment options:

---

## Option 1: Deploy to Vercel (Recommended ⭐)

Vercel is free, includes automatic SSL, and works perfectly with Node.js applications.

### Steps:

1. **Connect your repository to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select `alott2223/sec-proxy`
   - Click "Import"

2. **Configure environment variables:**
   - In the "Environment Variables" section, add:
     ```
     SESSION_SECRET = your-secret-key-here
     NODE_ENV = production
     ```
   - Click "Deploy"

3. **Vercel will automatically:**
   - Detect the `vercel.json` configuration
   - Install dependencies
   - Deploy your application
   - Provide a live URL (e.g., `https://sec-proxy-xxx.vercel.app`)

4. **Your app is live!**
   - Access it at: `https://sec-proxy-xxx.vercel.app`
   - Default credentials:
     - Username: `admin`
     - Password: `admin123`
     - Invite Code: `WELCOME2023`

⚠️ **Important:** Change default credentials immediately!

---

## Option 2: Deploy to Heroku

1. **Install Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli
2. **Create Heroku app:**
   ```bash
   heroku create sec-proxy
   ```
3. **Set environment variables:**
   ```bash
   heroku config:set SESSION_SECRET=your-secret-key-here
   ```
4. **Deploy:**
   ```bash
   git push heroku copilot/add-login-register-invite-system:main
   ```
5. **View app:**
   ```bash
   heroku open
   ```

---

## Option 3: Deploy to Railway.app

1. **Go to:** https://railway.app
2. **Click "New Project"**
3. **Select "Deploy from GitHub"**
4. **Connect your GitHub account**
5. **Select `alott2223/sec-proxy` repository**
6. **Add environment variables:**
   - `SESSION_SECRET`: your-secret-key
   - `NODE_ENV`: production
7. **Railway auto-deploys!**

---

## Option 4: Local Deployment (Development)

### Run Locally:

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Or run in production
PORT=3000 npm start
```

Access at: `http://localhost:3000`

### Deploy to Your Own Server:

1. **SSH into your server**
2. **Clone the repository:**
   ```bash
   git clone https://github.com/alott2223/sec-proxy.git
   cd sec-proxy
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export SESSION_SECRET=your-secret-key-here
   ```
5. **Start the server:**
   ```bash
   PORT=3000 npm start
   ```
6. **Use PM2 for persistence:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "sec-proxy" --watch
   pm2 save
   pm2 startup
   ```
7. **Set up reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🌐 GitHub Pages Landing Page

A landing page has been created on the `gh-pages` branch:

- **Branch:** `gh-pages`
- **URL:** `https://alott2223.github.io/sec-proxy/` (once enabled)

To enable:
1. Go to: https://github.com/alott2223/sec-proxy/settings/pages
2. Select branch: `gh-pages`
3. Save

---

## 📋 Recommended Deployment Checklist

Before deploying to production:

- [ ] Change default admin password
- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS (automatic on Vercel/Railway/Heroku)
- [ ] Set `NODE_ENV=production`
- [ ] Remove default invite code or restrict it
- [ ] Monitor server logs for errors
- [ ] Set up backups for SQLite database
- [ ] Test all authentication flows
- [ ] Test device fingerprinting
- [ ] Verify admin dashboard works

---

## 🔐 Security Considerations

1. **Database Persistence:**
   - SQLite stores data locally
   - For production, consider migrating to PostgreSQL
   - Ensure database backups are created

2. **Session Management:**
   - Change `SESSION_SECRET` to a long, random string
   - Use HTTPS only (automatic on cloud platforms)
   - Consider using Redis for session storage at scale

3. **Default Credentials:**
   - Change admin password immediately
   - Rotate invite codes regularly
   - Implement login attempt limiting (already included)

4. **Environment Variables:**
   - Never commit secrets to Git
   - Use platform secrets management
   - Rotate secrets periodically

---

## 📊 Database Backup

With SQLite, backup your database file:

```bash
# On your server
cp database.sqlite database.sqlite.backup

# Download to local machine
scp user@server:path/to/database.sqlite ./backup/
```

---

## 🆘 Troubleshooting

### "Port 3000 already in use"
```bash
# Use different port
PORT=8080 npm start
```

### "Cannot find module 'better-sqlite3'"
```bash
# Rebuild native modules
npm install --build-from-source
```

### "Session not persisting"
- Check `SESSION_SECRET` is set
- Verify cookies are not being blocked
- Check browser console for errors

### Database locked error
- Ensure only one instance is running
- Delete `database.sqlite-wal` and `database.sqlite-shm` files
- Restart the application

---

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/alott2223/sec-proxy/issues
- GitHub Discussions: https://github.com/alott2223/sec-proxy/discussions

---

**Ready to deploy? Start with Vercel - it takes 2 minutes! 🚀**
