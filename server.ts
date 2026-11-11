import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const UPLOADS_DIR = path.join(process.cwd(), 'static', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Higher limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static directory
app.use('/static', express.static(path.join(process.cwd(), 'static')));

// Admin session check middleware (matches client-side token)
function checkAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Simple token check as implemented in the client
  if (token === 'zenvex_admin_valid_token') {
    return next();
  }
  return res.status(401).json({ error: 'Please sign in first.' });
}

// ---------------- API ROUTES ----------------

// Admin Image Upload Endpoint
app.post('/api/admin/upload-image', checkAdmin, (req, res) => {
  const { dataUrl, filename } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid image file is required.' });
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      return res.status(400).json({ error: 'Invalid base64 image data.' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('+xml', '');
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const sanitizedName = String(filename || 'image').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const safeFilename = `upload_${Date.now()}_${sanitizedName}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/static/uploads/${safeFilename}`;
    console.log(`[Upload] Success: ${publicUrl}`);
    return res.json({ ok: true, url: publicUrl, message: 'Image uploaded successfully!' });
  } catch (err) {
    console.error('[Upload] Error:', err);
    return res.status(500).json({ error: 'Failed to save uploaded image.' });
  }
});

// SEO & SEARCH CONSOLE ROUTES
app.get('/robots.txt', (req, res) => {
  const host = req.headers.host || 'portfolio.zenvexdev.workers.dev';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  res.type('text/plain');
  return res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

Sitemap: ${baseUrl}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const host = req.headers.host || 'portfolio.zenvexdev.workers.dev';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  const now = new Date().toISOString().split('T')[0];

  res.type('application/xml');
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#work</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    // In dev mode, serve HTML through Vite
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = '';
        if (url.startsWith('/admin')) {
          template = fs.readFileSync(path.resolve('admin.html'), 'utf-8');
        } else {
          template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        }
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production: serve built files
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get(['/admin', '/admin/'], (req, res) => {
      res.sendFile(path.join(distPath, 'admin/index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZENVEX Portfolio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

