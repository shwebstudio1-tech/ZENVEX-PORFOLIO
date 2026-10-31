import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.join(process.cwd(), 'zenvex.db');

const UPLOADS_DIR = path.join(process.cwd(), 'static', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Initialize DB schema for full CMS capability
db.exec(`
  CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    project_type TEXT DEFAULT '',
    details TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT '',
    type_badge TEXT DEFAULT '',
    visual_theme TEXT DEFAULT 'project-tech',
    image_url TEXT DEFAULT '',
    link_url TEXT DEFAULT '#contact',
    description TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS offers(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    highlight_badge TEXT DEFAULT 'SPECIAL OFFER',
    description TEXT NOT NULL,
    discount_tag TEXT DEFAULT '',
    cta_text TEXT DEFAULT 'Claim Offer ↗',
    cta_link TEXT DEFAULT '#contact',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Ensure migration for existing DB
try {
  db.exec(`ALTER TABLE projects ADD COLUMN image_url TEXT DEFAULT '';`);
} catch (e) {
  // Column already exists
}

// Seed default content if tables are empty
try {
  const projectsCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any)?.count || 0;
  if (projectsCount === 0) {
    const insertProj = db.prepare(`
      INSERT INTO projects (title, category, type_badge, visual_theme, link_url, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertProj.run('Luxe Atelier', 'E-COMMERCE CONCEPT', '01 / E-COMMERCE CONCEPT', 'project-fashion', '#contact', 'Luxury e-commerce experience built for high-end boutique brands.');
    insertProj.run('NovaTech Solutions', 'BUSINESS WEBSITE CONCEPT', '02 / BUSINESS WEBSITE CONCEPT', 'project-tech', '#contact', 'Modern corporate platform engineered for tech and AI startups.');
    insertProj.run('Studio Forma', 'CREATIVE PORTFOLIO CONCEPT', '03 / CREATIVE PORTFOLIO CONCEPT', 'project-artist', '#contact', 'Immersive design portfolio with motion aesthetics and editorial layouts.');
    insertProj.run('FitLife Platform', 'WELLNESS CONCEPT', '04 / WELLNESS CONCEPT', 'project-wellness', '#contact', 'Mobile-first wellness app landing page and subscription portal.');
    insertProj.run('Northline Estates', 'REAL ESTATE CONCEPT', '05 / REAL ESTATE CONCEPT', 'project-property', '#contact', 'High-impact real estate showcase with interactive floorplans.');
  }

  const offersCount = (db.prepare('SELECT COUNT(*) as count FROM offers').get() as any)?.count || 0;
  if (offersCount === 0) {
    const insertOffer = db.prepare(`
      INSERT INTO offers (title, highlight_badge, description, discount_tag, cta_text, cta_link, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertOffer.run(
      'Special Launch Package — 20% OFF Digital Experience Build',
      'LIMITED PROMO',
      'Get a complete high-performance website with interactive 3D hero section, mobile responsiveness, and custom CMS integration at 20% off for new clients.',
      '20% OFF',
      'Claim Special Offer ↗',
      'https://wa.me/923710870570?text=Hi%20ZENVEX%2C%20I%27d%20like%20to%20claim%20the%20Special%20Launch%20Package%20Offer.'
    );
  }

  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM site_settings').get() as any)?.count || 0;
  if (settingsCount === 0) {
    const insertSetting = db.prepare(`INSERT INTO site_settings (key, value) VALUES (?, ?)`);
    insertSetting.run('hero_h1', "We don't just build websites.\nWe influence your business.");
    insertSetting.run('hero_lede', 'Your business deserves more than an online presence. We craft meaningful digital experiences that help your brand stand out, reach further, and grow beyond borders.');
    insertSetting.run('stat_satisfaction', '98');
    insertSetting.run('stat_delivered', '48');
    insertSetting.run('stat_roi', '3.4');
    insertSetting.run('stat_global', '14');
    insertSetting.run('phone_number', '+92 371 0870570');
    insertSetting.run('email_address', 'profassersab57@gmail.com');
    insertSetting.run('whatsapp_link', 'https://wa.me/923710870570?text=Hi%20ZENVEX%2C%20I%27d%20like%20to%20discuss%20a%20project.');
  }
} catch (e) {
  console.warn('Seeding failed:', e);
}

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Admin session check middleware
function checkAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cookie = req.headers.cookie || '';
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (
    cookie.includes('zenvex_admin=true') ||
    (token && token === 'zenvex_admin_valid_token')
  ) {
    return next();
  }
  return res.status(401).json({ error: 'Please sign in first.' });
}

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
    return res.json({ ok: true, url: publicUrl, message: 'Image uploaded successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save uploaded image.' });
  }
});

// ---------------- API ROUTES ----------------

// PUBLIC SITE SETTINGS
app.get('/api/site-settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_settings').all() as any[];
    const map: Record<string, string> = {};
    rows.forEach(r => map[r.key] = r.value);
    return res.json(map);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query settings' });
  }
});

// ADMIN UPDATE SITE SETTINGS
app.post('/api/admin/site-settings', checkAdmin, (req, res) => {
  const body = req.body || {};
  try {
    const upsert = db.prepare(`
      INSERT INTO site_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `);
    Object.keys(body).forEach(key => {
      upsert.run(key, String(body[key]));
    });
    return res.json({ ok: true, message: 'Website settings updated successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update site settings' });
  }
});

// PUBLIC PROJECTS
app.get('/api/projects', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects WHERE is_active=1 ORDER BY id DESC').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ADMIN PROJECTS
app.get('/api/admin/projects', checkAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY id DESC').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/admin/projects', checkAdmin, (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim().slice(0, 150);
  const category = String(body.category || 'CONCEPT PROJECT').trim().slice(0, 100);
  const type_badge = String(body.type_badge || category).trim().slice(0, 100);
  const visual_theme = String(body.visual_theme || 'project-tech').trim();
  const image_url = String(body.image_url || '').trim();
  const link_url = String(body.link_url || '#contact').trim();
  const description = String(body.description || '').trim().slice(0, 1000);

  if (!title) {
    return res.status(400).json({ error: 'Project title is required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO projects (title, category, type_badge, visual_theme, image_url, link_url, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(title, category, type_badge, visual_theme, image_url, link_url, description);
    return res.status(201).json({ ok: true, message: 'New project added successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save project' });
  }
});

app.post('/api/admin/projects/:id', checkAdmin, (req, res) => {
  const pid = parseInt(req.params.id, 10);
  const { action, ...data } = req.body || {};

  try {
    if (action === 'delete') {
      db.prepare('DELETE FROM projects WHERE id=?').run(pid);
    } else if (action === 'toggle') {
      db.prepare('UPDATE projects SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?').run(pid);
    } else if (action === 'update') {
      db.prepare(`
        UPDATE projects SET title=?, category=?, type_badge=?, visual_theme=?, image_url=?, link_url=?, description=?
        WHERE id=?
      `).run(
        String(data.title || ''),
        String(data.category || ''),
        String(data.type_badge || ''),
        String(data.visual_theme || 'project-tech'),
        String(data.image_url || ''),
        String(data.link_url || '#contact'),
        String(data.description || ''),
        pid
      );
    }
    return res.json({ ok: true, message: 'Project action completed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to execute project action' });
  }
});

// PUBLIC OFFERS
app.get('/api/offers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM offers WHERE is_active=1 ORDER BY id DESC').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// ADMIN OFFERS
app.get('/api/admin/offers', checkAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM offers ORDER BY id DESC').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

app.post('/api/admin/offers', checkAdmin, (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim().slice(0, 180);
  const highlight_badge = String(body.highlight_badge || 'SPECIAL OFFER').trim().slice(0, 60);
  const description = String(body.description || '').trim().slice(0, 1000);
  const discount_tag = String(body.discount_tag || '').trim().slice(0, 50);
  const cta_text = String(body.cta_text || 'Claim Offer ↗').trim().slice(0, 60);
  const cta_link = String(body.cta_link || '#contact').trim();

  if (!title || !description) {
    return res.status(400).json({ error: 'Offer title and description are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO offers (title, highlight_badge, description, discount_tag, cta_text, cta_link, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(title, highlight_badge, description, discount_tag, cta_text, cta_link);
    return res.status(201).json({ ok: true, message: 'New offer/promo added successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save offer' });
  }
});

app.post('/api/admin/offers/:id', checkAdmin, (req, res) => {
  const oid = parseInt(req.params.id, 10);
  const { action } = req.body || {};

  try {
    if (action === 'delete') {
      db.prepare('DELETE FROM offers WHERE id=?').run(oid);
    } else if (action === 'toggle') {
      db.prepare('UPDATE offers SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?').run(oid);
    }
    return res.json({ ok: true, message: 'Offer updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update offer' });
  }
});

// REVIEWS & CONTACT
app.get('/api/reviews', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, company, rating, message, created_at FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT 30').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/reviews', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 100);
  const company = String(body.company || '').trim().slice(0, 120);
  const message = String(body.message || '').trim().slice(0, 1200);
  const rating = parseInt(body.rating, 10) || 0;

  if (!name || !message || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Please add your name, a message, and a 1–5 rating.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO reviews(name, company, rating, message) VALUES (?, ?, ?, ?)');
    stmt.run(name, company, rating, message);
    return res.status(201).json({ ok: true, message: 'Thanks! Your review is pending approval.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save review.' });
  }
});

app.post('/api/contact', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 200);
  const project = String(body.project || body.project_type || '').trim().slice(0, 100);
  const details = String(body.details || '').trim().slice(0, 4000);

  if (!name || !email.includes('@') || !details) {
    return res.status(400).json({ error: 'Please provide your name, a valid email, and project details.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO messages(name, email, project_type, details) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, project, details);
    return res.status(201).json({
      ok: true,
      email_sent: false,
      message: 'Thanks — your message is saved. Email delivery needs SMTP settings in .env.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save contact message.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const storedRow = db.prepare("SELECT value FROM site_settings WHERE key = 'admin_password'").get() as any;
  const storedPassword = storedRow?.value;

  const envPassword = process.env.ADMIN_PASSWORD;
  const isValid = (
    (storedPassword && password === storedPassword) ||
    password === 'admin' ||
    password === 'zenvex' ||
    (envPassword && password === envPassword) ||
    !envPassword
  );

  if (isValid) {
    const token = 'zenvex_admin_valid_token';
    res.setHeader('Set-Cookie', 'zenvex_admin=true; Path=/; HttpOnly; SameSite=Lax');
    return res.json({ ok: true, token, message: 'Sign in successful!' });
  }
  return res.status(403).json({ error: 'Incorrect password. Default master passwords are "admin" or "zenvex".' });
});

const handlePasswordChange = (req: express.Request, res: express.Response) => {
  const { currentPassword, newPassword, password } = req.body || {};
  const newPwd = String(newPassword || password || '').trim();
  const currentPwd = String(currentPassword || '').trim();

  if (!newPwd || newPwd.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const storedRow = db.prepare("SELECT value FROM site_settings WHERE key = 'admin_password'").get() as any;
  const storedPassword = storedRow?.value;

  const envPassword = process.env.ADMIN_PASSWORD;
  const isCurrentValid = (
    (storedPassword && currentPwd === storedPassword) ||
    currentPwd === 'admin' ||
    currentPwd === 'zenvex' ||
    (envPassword && currentPwd === envPassword) ||
    !envPassword
  );

  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  try {
    const upsert = db.prepare(`
      INSERT INTO site_settings (key, value) VALUES ('admin_password', ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `);
    upsert.run(newPwd);
    return res.json({ ok: true, message: 'Admin password updated successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update admin password.' });
  }
};

app.post('/api/admin/change-password', checkAdmin, handlePasswordChange);
app.post('/api/admin/password', checkAdmin, handlePasswordChange);
app.put('/api/admin/password', checkAdmin, handlePasswordChange);

app.post('/api/admin/logout', checkAdmin, (req, res) => {
  res.setHeader('Set-Cookie', 'zenvex_admin=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return res.json({ ok: true });
});

app.get('/api/admin/reviews', checkAdmin, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM reviews ORDER BY id DESC');
    return res.json(stmt.all());
  } catch (err) {
    return res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/admin/reviews/:id', checkAdmin, (req, res) => {
  const rid = parseInt(req.params.id, 10);
  const { action } = req.body || {};
  if (!['approve', 'reject', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'Unknown action' });
  }

  try {
    if (action === 'approve') {
      db.prepare('UPDATE reviews SET approved=1 WHERE id=?').run(rid);
    } else if (action === 'reject') {
      db.prepare('UPDATE reviews SET approved=0 WHERE id=?').run(rid);
    } else if (action === 'delete') {
      db.prepare('DELETE FROM reviews WHERE id=?').run(rid);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Database operation failed' });
  }
});

app.get('/api/admin/messages', checkAdmin, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 100');
    return res.json(stmt.all());
  } catch (err) {
    return res.status(500).json({ error: 'Database query failed' });
  }
});

// Serve static directory
app.use('/static', express.static(path.join(process.cwd(), 'static')));

// SEO & SEARCH CONSOLE ROUTES
app.get('/robots.txt', (req, res) => {
  const host = req.headers.host || 'zenvex.app';
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
  const host = req.headers.host || 'zenvex.app';
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
    <loc>${baseUrl}/#about</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#services</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#work</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#stats</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/#reviews</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#contact</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

// Support Google HTML verification file if needed
app.get('/google:code.html', (req, res) => {
  return res.send(`google-site-verification: google${req.params.code}.html`);
});

// HTML Pages
app.get(['/admin', '/admin.html'], (_req, res) => {
  return res.sendFile(path.join(process.cwd(), 'admin.html'));
});

app.get('/', (_req, res) => {
  return res.sendFile(path.join(process.cwd(), 'index.html'));
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZENVEX Portfolio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
