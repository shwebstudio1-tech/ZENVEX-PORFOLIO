# ☁️ Cloudflare Deployment Guide for ZENVEX Portfolio

This project is fully configured and ready to deploy on **Cloudflare Pages / Cloudflare Workers**.

---

## ⚡ Option 1: Deploy via Cloudflare Pages (Recommended - Free & Instant)

### Method A: Connect GitHub Repository (Automatic CI/CD)
1. Push your repository to **GitHub**.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository.
4. Set Build Settings:
   - **Framework Preset**: `Vite` (or None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare will build and host your website globally on Cloudflare CDN.

---

### Method B: Deploy via Command Line (Wrangler CLI)
Run the following commands in your project terminal:
```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Build the production files
npm run build

# 3. Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=zenvex-portfolio
```

---

## 🗄️ Option 2: Full-Stack Backend Hosting (Node.js + Express + SQLite)

For running the Node.js Express server (`server.ts`) with active SQLite CMS database online, deploy the Node backend to any of these free/cheap platforms and set Cloudflare proxy DNS:
- **Render.com / Railway.app / Koyeb / Fly.io / VPS (Ubuntu)**:
  - **Build Command**: `npm run build`
  - **Start Command**: `npm start` (Runs `tsx server.ts` on port 3000)

Then in **Cloudflare DNS Settings**, add your custom domain (`zenvex.com` or `zenvex.app`) pointing to your app with **Orange Cloud (Proxied)** enabled for DDoS protection and SSL.

---

## 🔒 Pre-Configured Cloudflare Features Included:
- ✅ **`public/_headers`**: Automatically configures Cloudflare CDN caching and Security Headers (X-Frame-Options, CORS, Content-Type-Options).
- ✅ **`public/_redirects`**: Configures clean routes (`/admin` -> `admin.html`).
- ✅ **`public/sitemap.xml`**: Pre-built search engine sitemap for Cloudflare CDN.
- ✅ **`public/robots.txt`**: Configured crawler directives.
- ✅ **`wrangler.toml`**: Pre-set Cloudflare Wrangler project configuration.
