# CRUVO Static Web & APK Distribution Portal

A zero-backend, high-performance static website for downloading and sharing the **CRUVO Android APK**. Built with pure HTML, CSS, and Vanilla JavaScript with CRUVO's dark glassmorphic design system.

---

## 📁 Directory Structure

```
cruvo-web/
├── index.html            # Main landing & download portal
├── css/
│   └── style.css         # Dark glassmorphic design system
├── js/
│   └── app.js            # QR code generator, modal & parallax
├── assets/
│   ├── CRUVO LOGO.jpg    # Brand identity logo
│   └── favicon.png       # Web favicon
└── downloads/
    └── CRUVO.apk         # Direct production Android APK binary
```

---

## 🚀 Free Static Deployment Options (0 Backend / 0 Render Required)

You can host this entire folder anywhere without needing any database or backend server:

### Option 1: GitHub Pages (Recommended - 100% Free)
1. In your repository settings on GitHub (`mohdrameez-entrepreneur/CRUVO`), go to **Settings → Pages**.
2. Set the source branch to `main` and folder to `/cruvo-web` (or deploy from a `gh-pages` branch).
3. Your site will be live instantly with a direct APK download link!

### Option 2: Cloudflare Pages / Netlify / Vercel
1. Connect your GitHub repository.
2. Set the **Root directory** to `cruvo-web`.
3. Leave build command empty (static).
4. Deploy!

### Option 3: Local Testing
To preview the website locally:
```bash
# Python 3
cd cruvo-web
python3 -m http.server 8080
# Visit http://localhost:8080 in your browser
```

---

## 📦 Updating the APK File
Whenever you build a new version of the app:
1. Replace `cruvo-web/downloads/CRUVO.apk` with your newly compiled APK.
2. Update the version string in `index.html` (e.g. `v1.0.1`).
3. Commit and push to git!
