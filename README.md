# Portfolio – Web Design & Development

A Django-based static portfolio site to showcase your work and sell website design/development services.

## Pages

- **Home** – Hero, value proposition, and call-to-actions
- **About** – Your story and why clients should work with you
- **Templates** – Website template options (business, portfolio, landing, multi-page)
- **Pricing** – Starter, Professional, and Custom packages
- **Contact** – Contact form and email

## Setup

1. Create and activate a virtual environment (optional but recommended):

   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:

   ```bash
   python manage.py runserver
   ```

4. Open **http://127.0.0.1:8000/** in your browser.

## Customize

- **Branding**: Edit `pages/templates/pages/base.html` (logo text, footer).
- **Content**: Edit the HTML in `pages/templates/pages/` for each page.
- **Styling**: Edit `pages/static/pages/css/style.css` (colors, fonts, layout).
- **Contact form**: The form currently has `action="#"`. To handle submissions:
  - Use a service like [Formspree](https://formspree.io/) and set the form `action` to your Formspree URL, or
  - Add a Django view that processes the form and sends email (e.g. with `django.core.mail`).

## Production

- Set `DEBUG = False` and configure `ALLOWED_HOSTS`.
- Set a strong `SECRET_KEY` (e.g. via environment variable `DJANGO_SECRET_KEY`).
- Run `python manage.py collectstatic` and serve static files with your web server or CDN.
