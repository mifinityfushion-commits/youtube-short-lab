# YouTube Short Lab

Een privéproductielab voor Tahar, gebouwd als monorepo. Fase 1 bevat de responsieve 3D-arena, sessie-login, mockworkflow, akkoordkaarten, PostgreSQL/Prisma-datamodel, worker- en storage-adapter, CI en Render Blueprint. De interface en alle zichtbare teksten zijn Nederlands; code en configuratie zijn Engels.

## Lokaal starten

Vereist Node.js 22+, npm en Docker Compose.

```sh
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Open http://localhost:5173 en log lokaal in met `tahar-demo`. Zonder provider- of platformgegevens blijft de app in mockmodus. Start de worker apart met `npm run dev:worker`. De API draait op poort 3000 en heeft `/health`.

## Render-deploy (ongeveer 5 minuten)

Render → New → Blueprint → kies repo → vul env group in → deploy.

De Blueprint bouwt de statische Vite-app, API en Docker-worker, maakt PostgreSQL aan en voert `prisma migrate deploy` vóór deploy uit. De frontend gebruikt de API op `https://shortlab-api.onrender.com`; CORS staat alleen de web-origin toe en API-cookies zijn httpOnly, secure in productie en same-site. Pas `WEB_ORIGIN` aan als Render een andere web-hostnaam kiest.

Maak voor Tahar een scrypt-hash in `salt:hex` formaat en zet die als `ADMIN_PASSWORD_HASH` in `shortlab-secrets`. Bijvoorbeeld met Node: `node -e "const c=require('node:crypto');const s=c.randomBytes(16).toString('hex');console.log(s+':'+c.scryptSync('jouw-wachtwoord',s,32).toString('hex'))"`. Zet ook `SESSION_SECRET` op minimaal 32 willekeurige tekens. Gebruik geen echte tokens in GitHub.

## Omgevingsvariabelen

| Variabele | Gebruik |
|---|---|
| `NODE_ENV`, `PORT` | Runtime en API-poort |
| `DATABASE_URL` | PostgreSQL; lokaal staat deze al in `.env.example` |
| `WEB_ORIGIN`, `VITE_API_URL` | CORS-origin en publieke API-url |
| `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `COOKIE_SECURE` | Sessies en Tahars login; productie gebruikt alleen de scrypt-hash |
| `LLM_MODE`, `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` | LLM-keuze; standaard mock |
| `STORAGE_MODE`, `STORAGE_DIR`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Lokale opslag of S3/R2 |
| `TOKEN_ENCRYPTION_KEY` | Sleutel voor platformtokens (gereserveerd voor latere OAuth-fases) |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | YouTube OAuth (latere fase) |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth (latere fase) |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | Instagram Graph API (latere fase) |
| `WHATSAPP_TOKEN`, `SMTP_URL` | Meldingen (latere fase) |

## Platformvereisten voor latere fases

- **YouTube Shorts:** Google Cloud-project, YouTube Data API v3 ingeschakeld, OAuth-client en kanaalautorisatie. Google kan verificatie vereisen voor productiegebruik.
- **TikTok:** TikTok for Developers-app met Content Posting API-producttoegang en OAuth-goedkeuring.
- **Instagram Reels:** Instagram Business- of Creator-account gekoppeld aan een Facebook-pagina, Meta-app en Graph API/Reels-publicatierechten.
- **WhatsApp:** Meta Cloud API-app en goedgekeurd WhatsApp Business-nummer; alternatief is Twilio.
- **E-mail:** SMTP-account of Resend API-sleutel.
- **LLM:** API-sleutel van de gekozen provider; mock vereist geen sleutel.
- **S3/R2:** bucket, toegangssleutels en publieke/presigned URL-configuratie.

De koppelingenpagina en OAuth-flows volgen in latere fases. Tot die tijd publiceren adapters uitsluitend mockresultaten. Publiek publiceren vereist een apart expliciet akkoord per platform.

## Workflow en structuur

- `apps/web`: Vite, React, TypeScript, React Three Fiber, TanStack Query en installeerbare PWA-manifest.
- `apps/api`: Fastify API, sessie-login, server-side workflowregels, SSE en Prisma.
- `apps/worker`: worker-startpunt, mock-LLM en lokale `Storage`-adapter; Docker-image bevat ffmpeg.
- `packages/shared`: Zod-contracten en interfaces voor LLM, video, publicatie, analyse, meldingen en opslag.
- `World → Center`-datamodel ondersteunt toekomstige werelden. `pg-boss` staat klaar voor database-backed taken.

Akkoordkaarten, events, video’s en publicatiestatus worden in PostgreSQL opgeslagen. De inhoud blijft in mockmodus; echte video-rendering, OAuth, analytics en platformpublicatie volgen in latere fases.
