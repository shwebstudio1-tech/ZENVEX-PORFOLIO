# ZENVEX Portfolio — full-stack starter

A responsive white / soft-gray agency portfolio with a layered interactive 3D-inspired hero, mouse tilt + drag rotation, moving ticker, project-card hover previews, WhatsApp CTAs, contact form, SQL database, and client review moderation.

## Run locally (Windows)

1. Install Python 3.10+ if it is not already installed.
2. Open this folder in VS Code.
3. In the VS Code terminal run:

   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   py app.py
   ```

4. Open `http://127.0.0.1:5000` for the website and `http://127.0.0.1:5000/admin` for review moderation.
5. Edit `.env` and set a strong `ADMIN_PASSWORD` and `FLASK_SECRET_KEY`. Restart the server after changes.

## Contact email delivery

Contact submissions are saved to SQLite regardless of SMTP setup. To also send email, configure SMTP variables in `.env`. For Gmail, enable 2-Step Verification and create a Google App Password; use that App Password as `SMTP_PASSWORD`, not your normal Gmail login password. Keep `.env` private and out of GitHub.

## Review workflow

Visitors submit a review from the Reviews section. It is stored as pending and will not be shown publicly until an admin signs in at `/admin` and approves it. The public page shows approved reviews only. The current version uses initials rather than client photos; do not publish client photos without permission.

## Database

The backend creates `zenvex.db` automatically using SQLite (SQL). Tables: `messages` and `reviews`. For a larger production deployment, use managed PostgreSQL and migrations/backups.

## Deploying free

The Flask backend and SQLite database need a Python-capable host with persistent storage. A static-only deployment to Vercel or Cloudflare Pages will serve the front end but will **not** run this Flask backend or persist SQLite. Keep the whole app on a Python host for this version, or later move the backend/database to a hosted service. Free-tier policies and sleep/storage limits vary by provider; check them before choosing.

## Before public launch

- Replace demo project concepts with real work and label concepts honestly.
- Verify the phone and social links; the WhatsApp number is formatted as `923710870570` based on the number supplied.
- Configure strong secrets and SMTP.
- Add HTTPS, backups, rate limiting/spam protection, and admin login throttling before production use.
- The provided favicon is an SVG Z mark. The supplied logo image is used in the header and footer.
