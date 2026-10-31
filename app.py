import os, sqlite3, smtplib, secrets
from email.message import EmailMessage
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session, abort
from werkzeug.security import check_password_hash, generate_password_hash

ROOT=os.path.dirname(os.path.abspath(__file__))
DB=os.path.join(ROOT,'zenvex.db')
app=Flask(__name__, static_folder='static')
app.secret_key=os.environ.get('FLASK_SECRET_KEY','change-this-before-deployment-'+secrets.token_hex(8))
ADMIN_PASSWORD=os.environ.get('ADMIN_PASSWORD','change-me-now')
ADMIN_HASH=generate_password_hash(ADMIN_PASSWORD)

# SQLite is a real SQL database and requires no paid service.
def db():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_db():
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL,project_type TEXT DEFAULT '',details TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,company TEXT DEFAULT '',rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),message TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        ''')
init_db()

def send_email(subject, body, reply_to=None):
    host=os.environ.get('SMTP_HOST'); user=os.environ.get('SMTP_USER'); password=os.environ.get('SMTP_PASSWORD'); to=os.environ.get('CONTACT_EMAIL','profassersab57@gmail.com')
    if not all([host,user,password,to]): return False
    msg=EmailMessage(); msg['Subject']=subject; msg['From']=user; msg['To']=to
    if reply_to: msg['Reply-To']=reply_to
    msg.set_content(body)
    port=int(os.environ.get('SMTP_PORT','587'))
    with smtplib.SMTP(host,port,timeout=15) as s:
        s.starttls(); s.login(user,password); s.send_message(msg)
    return True

@app.get('/')
def home(): return send_from_directory(ROOT,'index.html')
@app.get('/admin')
def admin_page(): return send_from_directory(ROOT,'admin.html')
@app.get('/api/reviews')
def reviews():
    with db() as c: rows=c.execute('SELECT id,name,company,rating,message,created_at FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT 30').fetchall()
    return jsonify([dict(r) for r in rows])
@app.post('/api/reviews')
def add_review():
    d=request.get_json(silent=True) or request.form
    name=str(d.get('name','')).strip()[:100]; company=str(d.get('company','')).strip()[:120]; message=str(d.get('message','')).strip()[:1200]
    try: rating=int(d.get('rating',5))
    except: rating=0
    if not name or not message or rating not in range(1,6): return jsonify(error='Please add your name, a message, and a 1–5 rating.'),400
    with db() as c: c.execute('INSERT INTO reviews(name,company,rating,message) VALUES(?,?,?,?)',(name,company,rating,message))
    return jsonify(ok=True,message='Thanks! Your review is pending approval.'),201
@app.post('/api/contact')
def contact():
    d=request.get_json(silent=True) or request.form
    name=str(d.get('name','')).strip()[:100]; email=str(d.get('email','')).strip()[:200]; project=str(d.get('project','')).strip()[:100]; details=str(d.get('details','')).strip()[:4000]
    if not name or '@' not in email or not details: return jsonify(error='Please provide your name, a valid email, and project details.'),400
    with db() as c: c.execute('INSERT INTO messages(name,email,project_type,details) VALUES(?,?,?,?)',(name,email,project,details))
    sent=False
    try: sent=send_email(f'New ZENVEX inquiry from {name}',f'Name: {name}\nEmail: {email}\nProject: {project}\n\n{details}',email)
    except Exception as e: app.logger.warning('Email delivery failed: %s',e)
    return jsonify(ok=True,email_sent=sent,message=('Thanks — your message has been received.' if sent else 'Thanks — your message is saved. Email delivery needs SMTP settings in .env.')),201

def admin_required(fn):
    @wraps(fn)
    def wrapped(*a,**kw):
        if not session.get('admin'): return jsonify(error='Please sign in first.'),401
        return fn(*a,**kw)
    return wrapped
@app.post('/api/admin/login')
def login():
    d=request.get_json(silent=True) or {}; password=str(d.get('password',''))
    if ADMIN_PASSWORD=='change-me-now' or not check_password_hash(ADMIN_HASH,password): return jsonify(error='Incorrect password, or set a secure ADMIN_PASSWORD first.'),403
    session['admin']=True; return jsonify(ok=True)
@app.post('/api/admin/logout')
@admin_required
def logout(): session.clear(); return jsonify(ok=True)
@app.get('/api/admin/reviews')
@admin_required
def admin_reviews():
    with db() as c: rows=c.execute('SELECT * FROM reviews ORDER BY id DESC').fetchall()
    return jsonify([dict(r) for r in rows])
@app.post('/api/admin/reviews/<int:rid>')
@admin_required
def review_action(rid):
    d=request.get_json(silent=True) or {}; action=d.get('action')
    if action not in ('approve','reject','delete'): return jsonify(error='Unknown action'),400
    with db() as c:
        if action=='approve': c.execute('UPDATE reviews SET approved=1 WHERE id=?',(rid,))
        elif action=='reject': c.execute('UPDATE reviews SET approved=0 WHERE id=?',(rid,))
        else: c.execute('DELETE FROM reviews WHERE id=?',(rid,))
    return jsonify(ok=True)
@app.get('/api/admin/messages')
@admin_required
def admin_messages():
    with db() as c: rows=c.execute('SELECT * FROM messages ORDER BY id DESC LIMIT 100').fetchall()
    return jsonify([dict(r) for r in rows])
if __name__=='__main__': app.run(debug=True,port=int(os.environ.get('PORT','5000')))
