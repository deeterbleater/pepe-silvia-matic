# Project Synaptic Lattice

Native "Pepe Silvia" inference engine: a Fastify/PostgreSQL backend that creates semantic lattice jobs and a Vercel-ready Next.js dashboard that renders the resulting conspiracy-board graph.

## Layout

- `apps/api`: Vultr-hosted Fastify API, PostgreSQL migrations, async worker.
- `apps/web`: Vercel-ready Next.js UI.

## Quick Start

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d postgres
psql postgres://postgres:postgres@localhost:55432/synaptic_lattice -f apps/api/migrations/001_synaptic_lattice.sql
npm run dev:api
npm run dev:web
```

Apply `apps/api/migrations/001_synaptic_lattice.sql` to PostgreSQL before using persistent storage.

## Production Routing

The Vercel frontend is configured to call:

```text
https://api.ufotoken.app/synaptic-lattice
```

On the VPS, route that prefix to the API process on `127.0.0.1:18090`. The Nginx location snippet is in `deploy/api.ufotoken.app.synaptic-lattice.nginx`, and the systemd unit template is in `deploy/synaptic-lattice-api.service`.

Required API environment for `/etc/synaptic-lattice/api.env`:

```bash
NODE_ENV=production
PORT=18090
DATABASE_URL=postgres://user:password@host:5432/synaptic_lattice
WEB_ORIGIN=https://your-vercel-domain.vercel.app
CLERK_SECRET_KEY=sk_live_or_test_value
DEV_AUTH_BYPASS=false
```

Use a comma-separated `WEB_ORIGIN` value when you want to allow production and preview Vercel domains.

## Vercel

The root package includes helper scripts:

```bash
npm run vercel:login
npm run vercel:link
npm run vercel:env:pull
npm run vercel:deploy
npm run vercel:prod
npm run vercel:inspect -- <deployment-url>
```
