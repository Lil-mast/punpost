# Frontend

See the full frontend guide:

**[docs/frontend.md](../docs/frontend.md)**

Deploy guide: **[docs/deploy.md](../docs/deploy.md)**

## Cloudflare Workers

```bash
npm install
cp .env.production.example .env.production   # set Render API URLs
npx wrangler login
npm run deploy
```

Scripts: `preview`, `deploy` (OpenNext + Wrangler). Config: `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`.
