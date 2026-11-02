# Deployment Guide A: Static PWA on Standard cPanel HTTPS Host

This guide describes how to deploy the **NONONICK Forge Frontend PWA** onto any standard cPanel web hosting account or static file host (Netlify, Vercel, Cloudflare Pages, Apache, Nginx).

---

## Architecture Overview
The frontend of NONONICK Forge is an installable, standalone Progressive Web App (PWA):
* Written in standard HTML5, CSS3, and modern ES JavaScript.
* Stores projects and source code in the browser's persistent **IndexedDB** engine.
* Functions 100% offline for project creation, file editing, and file management using Service Workers (`sw.js`).
* Connects to the configured Execution Server API (`/api/execute` or external VPS URL) over HTTPS.

---

## Step-by-Step Deployment Instructions

### 1. Build Static Production Assets
On your development machine, run the build command:
```bash
npm run build
```
This generates optimized static files inside the `dist/` directory:
* `index.html`
* `manifest.json`
* `sw.js`
* `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `icon.svg`
* Compiled JS & CSS bundles inside `dist/assets/`

### 2. Log in to cPanel
1. Navigate to your cPanel login portal (`https://yourdomain.com:2083`).
2. Enter your cPanel username and password.

### 3. Upload to File Manager
1. In cPanel, click **File Manager**.
2. Navigate to your website's document root (typically `public_html/` or a subdomain folder like `public_html/forge/`).
3. Upload the contents of the `dist/` folder.
4. Ensure files are extracted directly so `index.html` is at the root of your target directory.

### 4. Enable HTTPS SSL Certificate
PWAs and Service Workers require HTTPS:
1. In cPanel, open **SSL/TLS Status** or **AutoSSL**.
2. Run AutoSSL or issue a free Let's Encrypt / cPanel AutoSSL certificate for your domain.
3. Ensure "Force HTTPS Redirection" is toggled ON under **Domains**.

### 5. Configure `.htaccess` for SPA Routing & PWA Headers
Create or edit the `.htaccess` file inside `public_html/` with the following rules:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Service Worker header - prevent aggressive caching of sw.js
<Files "sw.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</Files>

# Web App Manifest MIME type
AddType application/manifest+json .json

# Single Page Application fallback for deep links
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### 6. Connect to Execution API
Once loaded on your iPhone or browser:
1. Open the app at `https://yourdomain.com/`.
2. Tap the **Settings** or **API Connection** icon.
3. Enter your dedicated Cloud Execution Server URL (Deployment Guide B), for example:
   `https://api.forge.yourdomain.com`
4. Enter your secret API Bearer Token if configured.
5. Tap **Test Connection**. Once green, your static cPanel PWA can execute real Python and Node.js code securely in the cloud!
