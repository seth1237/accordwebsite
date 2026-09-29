# Tarumed Supplies Limited

Storefront for [tarumed.co.ke](https://tarumed.co.ke).

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `.env.development` keeps the site URL on localhost even if a production `.env` is present.

The homepage loads from the ERP. If that API is slow or down, requests time out after a few seconds and the last successful catalogue is reused from `.cache/` so local work can continue.

## Deploy

Required environment variables are listed in `.env.example`. For this project the filled production file is `.env` (not committed).

### Vercel

1. Import the repo in Vercel.
2. Add every key from `.env` as a project environment variable.
3. Set the production domain to `tarumed.co.ke`.
4. Deploy.

### VPS / Node

Node 20 or newer is required.

```bash
npm ci
npm run build
npm run start
```

`next start` serves the production build (default port 3000, or `PORT`). Point Nginx or Caddy at that port with HTTPS for `tarumed.co.ke`.

## Admin

- URL: `https://tarumed.co.ke/admin/login`
- Email: `info@tarumed.co.ke`
# accordwebsite
