# testamentera

Next.js-appen (**Sista Viljan**) ligger i mappen [`sista-viljan/`](./sista-viljan/).

## Deploy på Vercel

1. Öppna projektet på [Vercel](https://vercel.com) → **Settings** → **General**.
2. Under **Root Directory**, klicka **Edit** och sätt värdet till: `sista-viljan`.
3. Spara och kör **Deployments** → **Redeploy** (eller pusha en ny commit).

Om Root Directory lämnas som repo-rot finns inget `package.json` med Next där, och deployment kan ge **404 NOT_FOUND**.

Lokal utveckling: `cd sista-viljan && npm install && npm run dev`.

Se även [`sista-viljan/.env.local.example`](./sista-viljan/.env.local.example) för miljövariabler.
