# 10. Infrastruktura i hosting

Pitanje je bilo: gdje, koji server, koja jačina, Hetzner, kako postaviti. Odgovor u
tri faze, s cijenama iz septembra 2026. i s jednom nezgodnom činjenicom o
Hetzneru koja mijenja plan.

---

## 1. Ograničenja koja određuju izbor

1. **Podaci moraju biti u SAD.** Kupci su NY firme, podaci su lični podaci
   američkih radnika. Nije zakonska obaveza za privatnu firmu, ali je prodajna:
   glavni izvođači i njihovi pravnici pitaju "where is the data hosted" i odgovor
   "Njemačka" gubi posao. Hosting u EU je isključen.
2. **Latencija prema NY.** Server na istočnoj obali. Ashburn (VA) je 10 ms od NY.
3. **Backup van servera, šifrovan, u drugoj lokaciji.**
4. **Trošak ispod 100 $ mjesečno prvih 12 mjeseci**, jer prihod u 6. mjesecu je
   oko 2.000 $ i svaki dolar hostinga je dolar manje Mumi.
5. **Jedan čovjek održava.** Bez Kubernetesa, bez ručnog patchovanja tri servera.

## 2. Hetzner: šta istraživanje pokazuje (nezgodno)

- Hetzner ima US lokacije: **Ashburn (VA)** i Hillsboro (OR). U US lokacijama od
  2026. dostupni su samo CPX (Gen1 dijeljeni AMD) i CCX (namjenski) planovi;
  jeftini CX planovi su samo u EU. Cijene u SAD su porasle: **CPX21 (3 vCPU, 4
  GB, 80 GB) ≈ 37,49 $/mj** s IPv4; CPX31 (4 vCPU, 8 GB) ≈ 60 $; CCX23 (4
  namjenska vCPU, 16 GB) ≈ 90 $.
- **Hetzner Object Storage NE postoji u SAD** (samo Falkenstein, Nürnberg,
  Helsinki). Za fajlove u SAD treba drugi provajder.
- **Hetzner nema upravljanu bazu** (managed Postgres). Bazu održavamo sami:
  instalacija, backup, nadogradnje, nadzor.
- Volumes u Ashburnu postoje (≈ 0,06 $/GB), Snapshots i Backups (20 % cijene
  servera) postoje.
- Zaključak: Hetzner u SAD je i dalje najjeftiniji **server**, ali nije najjeftiniji
  **sistem** kad se doda vlastito održavanje baze i vanjsko skladište.

## 3. Poređenje dvije opcije za fazu 1

| | A: Hetzner Ashburn + Backblaze B2 | B: DigitalOcean NYC3 |
|---|---|---|
| Aplikacija + worker | CPX21 (3 vCPU, 4 GB) 37,49 $ | Droplet Basic 2 vCPU 4 GB 24 $ |
| Baza | na istom serveru (Postgres u Dockeru) 0 $ | Managed Postgres 1 GB 15 $ (automatski backup, PITR 7 dana, nadogradnje) |
| Skladište fajlova | Backblaze B2 US-East: prvih 10 GB besplatno, pa 6 $/TB; izlaz besplatan do 3× | Spaces 5 $ (250 GB uključeno) |
| Backup servera | Hetzner Backups 7,50 $ | Droplet backups 4,80 $ |
| Backup baze van servera | pgBackRest u B2, ≈ 1 $ | uključeno u Managed |
| Firewall, LB | Hetzner Cloud Firewall 0 $ | Cloud Firewall 0 $ |
| **Ukupno** | **≈ 46 $/mj** | **≈ 49 $/mj** |
| Održavanje baze | Mume/Claude Code (upgrade, vacuum, backup provjera) | DO |
| Latencija do NY | ≈ 10 ms | ≈ 2 ms |
| Ograničenje | 4 GB RAM dijeli web + worker + Postgres | Managed 1 GB Postgres je malen; 25 $ za 2 GB |

**Preporuka: B (DigitalOcean NYC3) za fazu 1.** Razlika u cijeni je 3 $ mjesečno,
a upravljana baza uklanja najopasniji dio posla za jednog čovjeka (izgubljen
backup = kraj firme). Kad baza preraste 2 GB plan (≈ 400 firmi), prelazi se na
Hetzner CCX ili DO namjenski, i tada se vlastito održavanje isplati.

Ako Mume ipak hoće Hetzner (poznat mu je, jeftiniji server), varijanta A radi,
uz obavezno: pgBackRest s dnevnim punim i satnim WAL arhivama u B2, testirano
vraćanje jednom mjesečno, i alarm ako backup zakaže.

## 4. Tri faze rasta

### Faza 1: 0 do 200 firmi (mjesec 1 do 12)
- 1 server (DO 4 GB ili Hetzner CPX21), Dokploy na njemu, Docker: `web` (1
  replika), `worker` (1 replika), Traefik (Dokploy ga donosi) za TLS.
- Baza: DO Managed 1 GB → 2 GB kad `pg_database_size` pređe 700 MB.
- Fajlovi: B2 (ili Spaces), bucket `weeklycert-prod`, versioning uključen,
  lifecycle: verzije se brišu poslije 30 dana, objekti nikad automatski.
- Trošak ≈ 50 $/mj.
- Kapacitet: 200 firmi × 3 projekta = 600 izvještaja sedmično; motor < 50 ms,
  PDF ≈ 1 s. Ponedjeljak špic: 200 istovremenih korisnika, Next.js na 2 vCPU
  nosi ≈ 300 req/s server-rendered. Dovoljno s rezervom 10×.

### Faza 2: 200 do 2.000 firmi
- Odvojiti: `web` 2 replike na 2 servera (DO 8 GB × 2 ili Hetzner CPX31 × 2)
  iza DO Load Balancera (12 $) ili Hetzner LB (≈ 6 $); `worker` 2 replike na
  jednom od njih.
- Baza: DO Managed 4 GB s 1 standby (HA) ≈ 120 $, ili Hetzner CCX23 s vlastitim
  Postgresom + streaming replika (≈ 180 $ za dva).
- Particionisati `audit_log` i `time_entries`.
- Trošak ≈ 250 $/mj pri prihodu ≈ 40.000 $/mj. Zanemarivo.

### Faza 3: do 100.000 korisnika (≈ 30.000 firmi; nije realno za NY nišu, ali
sistem to mora moći)
- 3 do 4 web čvora iza LB, 3 worker čvora, Postgres primar 16 do 32 GB + 2 read
  replike (izvještaji i arhiva čitaju s replike), PgBouncer (transaction pooling
  radi s `set_config` samo ako je u istoj transakciji, što i jeste).
- Fajlovi ostaju u S3 skladištu; CDN ispred za preuzimanja (B2 + Cloudflare je
  bez naknade za izlaz).
- Trošak ≈ 1.500 do 2.500 $/mj. Prihod pri 30.000 firmi bi bio 2,4 M $/mj.
- Ništa u kodu se ne mijenja između faza osim broja replika i connection
  stringa. To je svrha odluka u 04 i 09.

## 5. Postavka faze 1, korak po korak (Claude Code ovo može uraditi uz SSH)

1. **Nalog i regija**: DigitalOcean, projekat "weeklycert", regija NYC3. Uključiti
   2FA na nalogu. (Hetzner: Cloud projekat, lokacija Ashburn.)
2. **Server**: Ubuntu 24.04 LTS, 2 vCPU / 4 GB, SSH ključ (nikad lozinka),
   hostname `wc-app-1`. Cloud Firewall: 22 samo s Mumine IP (ili Tailscale), 80 i
   443 svima. Ništa drugo otvoreno.
3. **Osnovno očvršćavanje** (jedan skript `infra/bootstrap.sh`): `apt upgrade`,
   `unattended-upgrades`, korisnik `deploy` sa sudo, `sshd` bez root logina i bez
   lozinki, `ufw` kao drugi sloj, `fail2ban`, vremenska zona UTC, swap 2 GB.
4. **Dokploy**: `curl -sSL https://dokploy.com/install.sh | sh`. Dokploy panel
   na `deploy.weeklycert.com` iza Traefika, s 2FA, pristup ograničen
   firewallom.
5. **Baza**: DO Managed Postgres 17, isti VPC, "trusted sources" samo naš
   server. Dvije uloge: `app_user` (bez BYPASSRLS, bez vlasništva tabela) i
   `app_admin` (vlasnik šeme, BYPASSRLS, samo za migracije i platformske poslove;
   worker za poslove jedne firme koristi `app_user`). Postaviti
   `statement_timeout = 30s` za app_user, `idle_in_transaction_session_timeout
   = 60s`.
6. **Skladište**: B2 bucket privatan, application key samo za taj bucket, CORS
   za presigned upload s naše domene. (Ili DO Spaces.)
7. **Tajne**: u Dokployu kao environment + Docker secrets za `MASTER_KEY`,
   `DATABASE_URL`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
   `S3_KEY`, `S3_SECRET`, `BETTER_AUTH_SECRET`, `SENTRY_DSN`. `MASTER_KEY`
   generisan s `openssl rand -hex 32`, kopija u Muminom password manageru, nikad
   u repozitoriju.
8. **DNS (Cloudflare, proxy uključen)**: `app.weeklycert.com` → server; `www` i
   apex → **Cloudflare Pages** (`apps/site`, statički, vidi 19 §2 i §9), ne na
   server; `deploy.weeklycert.com` → server bez proxyja (Dokploy);
   `getweeklycert.com` ostaje samo za email (Zoho Mail), bez A, AAAA i CNAME
   zapisa i bez web sadržaja; DNS za tu domenu je u poslovno/DNS-POSTAVKA.md i
   tamo se ne dodaje ništa. Cloudflare: SSL Full (strict), HSTS, WAF
   osnovna pravila, rate limit na `/api/auth/*` 30/min po IP.
9. **Deploy**: Dokploy Compose aplikacija iz `docker/compose.prod.yml`, GitHub
   webhook na `main`; staging isto s granom `staging` na poddomeni
   `staging.weeklycert.com` s vlastitom malom bazom.
10. **Nadzor**: Sentry (greške), UptimeRobot free (HTTPS ping `/api/health` svaki
    5 min, alarm na email i telefon), Dokploy grafikoni CPU/RAM, DO alarmi za
    bazu (disk > 80 %, CPU > 80 %). Log rotacija Docker json-file 50 MB × 5.
11. **Backup provjera**: sedmični pg-boss posao koji povuče zadnji backup u
    izolovani kontejner, pokrene `select count(*) from tenants`, i pošalje email
    "restore test OK" ili alarm. Bez ovoga backup ne postoji.
12. **Runbook** u `docs/runbook.md`: kako vratiti bazu, kako rotirati MASTER_KEY,
    kako zamijeniti server za 30 minuta (Dokploy export + restore), koga zvati.

## 6. Okruženja

| Okruženje | Gdje | Baza | Podaci | Svrha |
|---|---|---|---|---|
| local | Muminov PC, Docker Compose | Postgres 17 kontejner | seed + demo firma | razvoj |
| mock | bilo gdje, `DATA_SOURCE=mock` | nema | JSON | frontend, E2E, demo kupcima |
| preview | Vercel Hobby, privatan projekat, `iad1` | nema | fixtures | **samo izgled**, da Mume odobri dizajn s telefona. Živi do kapije od 10 uplata. Vidi 19 §9. |
| staging | isti server, drugi Compose stack | odvojena mala baza | anonimizovana kopija ili seed | **ponašanje** s bazom i radnikom, nastaje tek u koraku 8 |
| prod | server | Managed | stvarni | |

Staging ne smije imati stvarne PII. Skripta `scripts/anonymize-dump.ts` zamjenjuje
imena, adrese i SSN4 prije učitavanja u staging.

## 7. Domene i email (ponovljeno da bude na jednom mjestu)

- `weeklycert.com`: brend, aplikacija (`app.`), landing. Nikad slanje hladnih
  emailova.
- `getweeklycert.com`: **Zoho Mail, besplatan plan, evropski data centar**, jedan
  sandučić, hladni email. SPF, DKIM i DMARC su postavljeni i provjereni
  14.9.2026; tačne vrijednosti i stanje su u poslovno/DNS-POSTAVKA.md, koji je
  izvor istine za DNS. Zagrijavanje 3 sedmice.
- `tryweeklycert.com`: rezerva, zaključana (SPF `-all`, DMARC `p=reject`,
  opozvan DKIM ključ); ista postavka kad prva domena bude "vruća".
- Transakcioni email (pozivnice, podsjetnici, računi): **Resend** s poddomene
  `mail.weeklycert.com`, vlastiti DKIM i Return-Path. Odvojen od hladnog emaila
  da reputacija hladnog nikad ne sruši transakcioni. Resend zabranjuje hladan
  email u pravilima korišćenja, pa se kroz njega šalju samo poruke kupcima koji
  su već u sistemu.

## 8. Troškovi, sve zajedno (faza 1, mjesečno)

| Stavka | $ |
|---|---|
| DO server 4 GB | 24 |
| DO Managed Postgres 1 GB | 15 |
| Backup servera | 4,80 |
| B2 ili Spaces | 5 |
| Cloudflare (DNS, Pages za apps/site) | 0 |
| Vercel Hobby (interni pregled) | 0 |
| Sentry, UptimeRobot, GitHub | 0 |
| Resend, transakcioni email (besplatno do 3.000/mj, pa 20 $) | 0 do 20 |
| Zoho Mail, besplatan plan | 0 |
| Domene (3 × ≈ 12 $/god) | 3 |
| **Ukupno** | **≈ 52 do 72 $/mj** |

Ovo je unutar broja koji je korišten u Zarada-troskovi-porezi.pdf.
