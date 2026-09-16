# 09. Tehnološki stek (odluke, verzije, struktura repozitorija)

Sve odluke ovdje su konačne za MVP. Claude Code ih ne preispituje bez izričite
promjene u ovom fajlu. Verzije su one koje su stabilne u septembru 2026; zaključati
ih u `package.json` bez `^`.

---

## 1. Zašto baš ovako (za Mumu, bez žargona)

**Baza: PostgreSQL, ne MySQL.** Razlika koja nama znači: Postgres ima Row Level
Security (baza sama ne dozvoljava firmi A da vidi redove firme B, čak i ako
programer pogriješi u kodu), `numeric` tip koji tačno računa novac, `jsonb` za
snimke izvještaja, i pg-boss koji radi red poslova u istoj bazi pa ne treba Redis.
MySQL nema RLS. Za naš proizvod, gdje je greška u izolaciji podataka kraj firme,
to presuđuje. Postgres je i ono što svaki hosting nudi kao upravljanu uslugu.

**Jedan Next.js projekat za aplikaciju, ne odvojen frontend i backend.** Dva
projekta za istu stvar znače dvije verzije tipova i sporije iteracije.
(Marketing sajt je zasebna mala aplikacija `apps/site`, jer ide u produkciju
sedmicama ranije i na drugi host; obrazloženje je u 19 §2. To nije podjela na
frontend i backend.) Next.js App Router daje frontend
i API u istom repozitoriju, dijele TypeScript tipove i validacione šeme. Worker
(PDF, XML, email) je isti kod pokrenut kao drugi proces.

**TypeScript svuda.** Motor (`core/`), web, worker, skripte. Jedan jezik, jedna
šema validacije (zod) od forme do baze.

**Frontend prvo.** Repozitorij od prvog dana ima `data/src/repositories.ts` interfejs s
dvije implementacije: `mock/` (JSON fajlovi u memoriji, deterministički) i
`drizzle/` (prava baza). `DATA_SOURCE=mock` pokreće cijelu aplikaciju bez baze.
Tako se sve rute iz 03 §2 (57: 50 ekrana i 7 API) naprave i klikće na izmišljenim podacima prije nego što
postoji ijedna tabela. Kad se Postgres uključi, ekrani se ne mijenjaju.

## 2. Stek, stavka po stavka

| Sloj | Izbor | Verzija | Zašto ovo, a ne alternativa |
|---|---|---|---|
| Runtime | Node.js | 22 LTS ili noviji (provjereno i na 24) | Next.js 16 traži ≥ 20.9; 22 je LTS do 2027. Ne Bun (pdf-lib i pg imaju rubne probleme). |
| Paket menadžer | pnpm | 10 | Brz, strogi node_modules. |
| Okvir | Next.js (App Router) | 16.x | Server Components, Server Actions za forme, Route Handlers za API. Ne Remix/SvelteKit: manji ekosistem za ovo što nam treba. |
| UI | React | 19.x | Dolazi s Next 16. |
| Stil | Tailwind CSS | 4.x | Bez runtime CSS-a. Dizajn tokeni u `@theme`. |
| Komponente | shadcn/ui (Radix primitive) | aktuelno | Kopira se u repo, mi vlasnici koda. Pristupačnost ugrađena. |
| Tabela/mreža | TanStack Table | 8.x | Mreža sati: headless, virtualizacija preko `@tanstack/react-virtual` za 200+ redova. Ne AG Grid (licenca, težina). |
| Forme | react-hook-form + zod | 7.x / 4.x | Iste zod šeme na klijentu i serveru. |
| Datumi | date-fns + @date-fns/tz | 4.x | Bez moment/dayjs. Sve u vremenskoj zoni firme. |
| Decimale | decimal.js | 10.x | Novac i stope u `core/`. |
| Ikone | lucide-react | | Dolazi sa shadcn. |
| Baza | PostgreSQL | 17 | RLS, numeric, jsonb, particionisanje. |
| ORM | Drizzle ORM + drizzle-kit | 0.45.x / aktuelno | SQL-blizak, migracije kao SQL fajlovi (RLS politike se pišu ručno u migracije), tipovi iz šeme. Ne Prisma: RLS i `set_config` po transakciji su nezgrapni. |
| Drajver | postgres (porsager) | 3.x | Brz, podržava `transaction` s `set_config`. |
| Auth | Better Auth | 1.7.x | Pluginovi: `magicLink`, `twoFactor` (TOTP), `passkey`, `admin` (impersonacija). **Bez `organization` plugina**: firme, članstva i pozivnice su naše tabele iz 04 (trebaju nam `can_sign`, vlastiti enum uloga i RLS), Better Auth radi samo identitet i sesiju. Vlastiti podaci u našoj bazi, bez vanjske usluge. Ne Clerk/Auth0: cijena po korisniku i podaci vani. Ne NextAuth: slabija podrška za organizacije i 2FA. |
| Lozinke | argon2id (kroz Better Auth) | | |
| Red poslova | pg-boss | 12.x | U Postgresu, bez Redisa. Ponavljanja, zakazivanje (cron), prioriteti. Ne BullMQ (traži Redis). |
| PDF | pdf-lib | 1.17.x | Popunjavanje AcroForm polja WH-347. Ne Puppeteer za obrazac (težak, nedeterminističan). |
| PDF iz HTML-a | Playwright Chromium (u workeru) | | Samo za cover stranu i listu adresa. |
| XML | xmlbuilder2 + libxml2 `xmllint` u worker image-u | 3.x | Builder + XSD validacija. |
| CSV/XLSX | papaparse, exceljs | 5.x / 4.x | |
| Email | **Resend** (transakcioni) | 4.x SDK | Besplatno do 3.000 poruka mjesečno i 100 dnevno, 3 domene; Pro je 20 $ za 50.000. Pokriva nas do oko 50 kupaca. **Hladan email nikad ne ide kroz Resend**, njihova pravila ga izričito zabranjuju (vidi 15 §4.1). Postmark (15 $ za 10.000) je nadogradnja ako isporučivost postane problem. |
| Naplata | Stripe (Checkout + Portal + webhooks) | API 2026 aktuelna | |
| Skladište | S3 API kroz AWS SDK v3 `@aws-sdk/client-s3` | 3.x | Backblaze B2 (US East) u produkciji, MinIO lokalno. |
| Šifrovanje | Node `crypto` (AES-256-GCM) | | Bez vanjske biblioteke. |
| Logovi | pino + pino-http | 9.x | JSON, `request_id`, bez PII u logovima. |
| Greške | Sentry (`@sentry/nextjs`) | 9.x | Free plan dovoljan za start. Scrubbing PII uključen. |
| Metrike | Prometheus endpoint `/api/metrics` + Grafana Cloud free | | Kasnije. Prvo Sentry i logovi. |
| Testovi | Vitest, Testing Library, Playwright | 3.x / / 1.5x | Golden testovi u `core/`, komponente u web, E2E na mock podacima. |
| Pokrivenost | `@vitest/coverage-v8` | 3.x | Prag 95 % na `core/engine` (12 korak 2). |
| Env u skriptama | `cross-env` | 7.x | `pnpm dev:mock` mora raditi i u PowerShellu. |
| Lint/format | Biome | 2.x | Jedan alat umjesto ESLint + Prettier. |
| Kontejneri | Docker, Compose | | Jedan `Dockerfile` s dva targeta: `web`, `worker`. |
| Deploy, `apps/web` | Dokploy na VPS-u | aktuelno | Git push → build → zero-downtime. Vidi 10-INFRASTRUKTURA. |
| Deploy, `apps/site` | Cloudflare Pages | | Statički izvoz, besplatno. Vidi 19 §9. |
| Pristupačnost u CI | axe-core + @axe-core/playwright | 4.x | Nijedan prekršaj serious ili critical. Vidi 19 §10. |
| CI | GitHub Actions | | lint, typecheck, unit, golden, E2E, build image. |

## 3. Struktura repozitorija (monorepo, pnpm workspaces)

```
weeklycert/
  apps/
    site/                   Next.js `output: 'export'`: landing, cijene,
                            sigurnost, pravno. Ide na Cloudflare Pages (19 §2).
    web/                    Next.js: UI + API rute + server actions
      app/
        (auth)/             login, register, magic, invite
        app/[t]/            sve rute firme (vidi 03-RUTE)
        admin/              platforma
        api/
          webhooks/stripe/
          v1/               interni JSON API za mrežu sati (real-time upisi)
          health/
      features/             po domenima: grid, findings, projects, workers,
                            imports, archive, reports, billing, team, audit,
                            admin. Unutrašnjost je propisana u 19 §2.
      components/           ui/ (shadcn), app-shell/, patterns/
      lib/
        auth.ts             Better Auth instanca
        tenant.ts           requireTenant (uloga + status pretplate + set_config)
        stripe.ts
        storage.ts
    worker/                 pg-boss potrošači: report.generate, import.parse,
                            billing.process_event, tenant.purge, reminders, retention
  packages/
    core/                   ČISTE FUNKCIJE, bez I/O, bez baze
      src/
        engine/             obračun sedmice (ST/OT, regular rate, fringe, apprentice)
        validate/           katalog nalaza (07)
        ny/                 XML builder, schema/ (XSD, primjeri), classifications seed
        federal/            WH-347 mapiranje, wh347-2025.pdf, wh347-fields.json
        import/             parseri CSV/XLSX, normalizacija
        money.ts, dates.ts
      __golden__/           ulaz.json + očekivani izlazi
    db/                     Drizzle šema, migracije (SQL), seed, RLS politike
      schema/               jedna datoteka po grupi tabela (04)
      migrations/
      seed/                 states, classification_catalog, demo firma
    data/src/               repositories.ts interfejs, dto/*.ts (DTO + zod),
                            mock/ (implementacija + fixtures), drizzle/,
                            pii.ts (šifrovanje, koristi ga i worker)
    ui-tokens/              boje, razmaci, tipografija (14 dizajn sistem)
    copy/                   svaki string koji korisnik vidi; sadržaj je iz 15.
                            Koriste ga i apps/web i apps/site.
    config/                 zajednički tsconfig, biome
  scripts/
    dump-pdf-fields.ts      ispiše AcroForm polja WH-347
    fetch-ny-schedule.ts    povuče PRC tabelu u keš
    make-demo-tenant.ts
  docker/
    Dockerfile              multi-stage; targets web, worker
    compose.yml             lokalno: postgres, minio, mailpit, web, worker
    compose.prod.yml        Dokploy koristi
  spec/                     specifikacija, izvor istine, već postoji
  dizajn/                   referentni vizuali (aplikacija.html, sajt.html)
  izvori/                   zvanični NYSDOL i DOL fajlovi iz koraka 0
  docs/
    screens/                snimci ekrana po ruti, jedan po ekranu (19 §10)
  CLAUDE.md
```

Svi paketi su pod scope-om `@wc/*` (`@wc/core`, `@wc/db`, `@wc/data`,
`@wc/ui-tokens`, `@wc/copy`, `@wc/config`). Aplikacije se ne objavljuju i nemaju
scope.

Pravila zavisnosti (provjerava se `dependency-cruiser` u CI):
- `core` ne uvozi ništa iz `apps/`, `db/`, `data/`. Samo `decimal.js`, `date-fns`,
  `xmlbuilder2`, `pdf-lib`, `zod`.
- `data/mock` i `data/drizzle` implementiraju isti interfejs; `apps/web` uvozi
  samo interfejs i fabriku `getRepositories()`.
- `apps/web` ne piše SQL. Sve kroz repozitorije.
- `worker` koristi `core` i `data/drizzle`, nikad `apps/web`.

## 4. Konvencije koda

- Jezik koda i komentara: engleski. Jezik UI-ja: engleski (kupci su Amerikanci).
  Jezik spec/ i STANJE.md: bosanski.
- Nazivi iz rječnika u 01-DOMEN su obavezni u domenskom kodu (`payrollPeriod`,
  `journeyworker`, ne `journeyman`). Izuzetak: u URL-ovima i DTO poljima okrenutim
  UI-ju `week`/`weekEnding` je dozvoljeno jer je to riječ koju kupac koristi.
- Server Actions za forme (create/update), Route Handlers za: mrežu sati (PATCH
  po ćeliji, brzo), webhookove, preuzimanja, health.
- Svaki Server Action i Route Handler počinje s `const ctx = await
  requireTenant(role)`; `ctx.db` je već u transakciji sa `set_config`.
- Zod šema po DTO-u u `packages/data/src/dto/*.ts`, koristi je i forma i server.
- Nema `any`. `strict: true`. Biome `recommended` + `noNonNullAssertion`.
- Greške: klase `DomainError` (400, poruka za korisnika), `ForbiddenError` (403),
  `NotFoundError` (404), `ConflictError` (409). Sve ostalo 500 + Sentry.
- Logovi: `logger.info({tenantId, userId, action}, 'msg')`. Nikad ime radnika,
  adresa, SSN4, iznosi po radniku.
- Feature flag: jednostavna tabela `feature_flags(tenant_id N, key, enabled)`,
  helper `flag('ny_xml_v2', tenantId)`.
- Migracije: samo naprijed. Bez `drizzle-kit push` u produkciji. Svaka migracija
  s RLS politikom za novu tabelu u istom fajlu.

## 5. Lokalni razvoj

```
pnpm i
cp .env.example .env            # ključevi za lokalno, MinIO, Mailpit
docker compose up -d            # postgres:17, minio, mailpit
pnpm db:migrate && pnpm db:seed # states, klasifikacije, demo firma
pnpm dev                        # web na :3000, worker u drugom terminalu pnpm dev:worker
DATA_SOURCE=mock pnpm dev       # bez baze, za rad na ekranima
```

`.env.example` nabraja svaku varijablu s komentarom. Tajne u produkciji idu kroz
Docker secrets (fajlovi u `/run/secrets/`), a aplikacija ih čita helperom
`secret('MASTER_KEY')` koji prvo gleda fajl pa env.

## 6. CI/CD (GitHub Actions)

1. `check`: biome, tsc, dependency-cruiser, i tri regex kapije iz 19 §2:
   nijedna heks boja van `packages/ui-tokens`, nijedan `toFixed` van
   `lib/format.ts`, nijedna engleska rečenica u JSX-u van `packages/copy`.
2. `unit`: vitest (`core`, `data/mock`, komponente). Golden testovi obavezni.
3. `db`: podigne Postgres 17 servis, primijeni migracije na prazno, pokrene RLS
   izolacione testove (firma A ne vidi B) i `data/drizzle` testove.
4. `e2e`: Playwright na `DATA_SOURCE=mock` buildu, 15 ključnih tokova, plus
   `axe-core` na svakom ekranu (19 §10 stavka 4).
5. `image`: build `web` i `worker` Docker image-a, push u GHCR s tagom SHA.
6. `deploy` (samo `main`): Dokploy webhook povuče novi tag. Staging automatski,
   produkcija ručnim odobrenjem u Actions.

Vrijeme cijelog pipelinea cilj < 10 min.

## 7. Šta izričito ne koristimo

- Prisma, TypeORM (RLS i transakcije s `set_config`).
- Redis (pg-boss pokriva red, Next cache pokriva keš; dodati Redis tek ako
  mjerenje pokaže potrebu).
- Vercel za produkciju (PII podaci, worker procesi, cijena pri rastu, i Hobby
  plan izričito zabranjuje komercijalnu upotrebu). Vercel Hobby se koristi samo
  kao **interni pregled frontenda na mock podacima** dok se gradi; javne
  stranice u produkciji idu na Cloudflare Pages. Obrazloženje i izvori: 19 §9.
- Supabase/Firebase (želimo vlastitu bazu na vlastitom serveru, RLS pišemo
  sami).
- tRPC (Server Actions + par Route Handlera su dovoljni; manje slojeva).
- Bilo koja AI/LLM komponenta u proizvodu za MVP. Motor je determinističan.
  Jedino mjesto gdje LLM ima smisla kasnije: parsiranje PDF platnih tabela u
  keš, uz obavezno ljudsko odobrenje u /admin.
