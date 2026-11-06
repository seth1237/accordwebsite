# Accord Medical Supplies

Storefront for [accordmedical.co.ke](https://accordmedical.co.ke).

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `.env.development` keeps the site URL on localhost even if a production `.env` is present.

The homepage loads from the local MySQL catalog after products have been copied in. Before that copy, it can fall back to the previous shop API.

## Deploy

Required environment variables are listed in `.env.example`. For this project the filled production file is `.env` (not committed).

### Vercel

1. Import the repo in Vercel.
2. Add every key from `.env` as a project environment variable.
3. Set the production domain to `accordmedical.co.ke`.
4. Deploy.

### VPS / Node

Node 20 or newer is required.

```bash
npm ci
npm run build
PORT=4140 HOSTNAME=127.0.0.1 npm run start
```

Do not run `next dev` or `next start` on the VPS. This app builds a standalone server; `npm run start` copies CSS/JS into it and runs `node .next/standalone/server.js`. Point Nginx at that port with HTTPS for `accordmedical.co.ke`. Restart PM2 after the build so it is not still serving an old `next start` / `next dev` process.

## Admin

- URL: `https://accordmedical.co.ke/admin/login`
- Email: `info@accordmedical.co.ke`
