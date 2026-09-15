# 11. Sigurnost i usklađenost

Čuvamo imena, adrese, zadnje 4 cifre SSN-a i plate građevinskih radnika u NY.
Curenje znači: obavještavanje po NY SHIELD Actu, gubitak svih kupaca, i kraj.
Zato je ovo lista obaveza, ne prijedloga. Svaka stavka ima "kako se provjerava".

---

## 1. Zakoni koji nas se tiču

| Propis | Šta traži od nas | Kako ispunjavamo |
|---|---|---|
| NY SHIELD Act (GBL §899-bb) | "Razumne" administrativne, tehničke i fizičke mjere za privatne podatke NY stanovnika. Da li su **zadnje 4 cifre SSN-a** navedeni element nije razjašnjeno (vidi 18 §4); u opsegu smo svejedno jer držimo pristupne podatke naloga, što jeste navedeni element | Ovaj dokument je program sigurnosti; imenovan odgovorni (Mume); procjena rizika godišnje; ugovori s dobavljačima (DO, B2, Stripe, Resend, Zoho) |
| NY GBL §899-aa | Obavijest o curenju pogođenim osobama i NY AG "u najkraćem mogućem roku", najkasnije 30 dana | Plan odgovora na incident (odjeljak 8), kontakt lista, šablon obavijesti |
| 29 CFR 5.5(a)(3)(ii)(B) | Puni SSN i adrese se ne šalju u certified payroll; identifikator je zadnje 4 | Nema kolone za puni SSN; adrese samo na zasebnoj listi |
| NY Labor Law §220 / 12 NYCRR 220 | Čuvanje evidencije (5 godina; 6 za sigurnost) | `retention_until` = 6 godina; brisanje samo poslije |
| CAN-SPAM | Odjava, fizička adresa, tačan pošiljalac u komercijalnim emailovima | U SISTEM-KONTAKTA; ovdje: transakcioni kanal (Resend) odvojen od hladnog |
| TCPA | SMS samo uz prethodni izričiti pristanak | `sms_consent_at` + tekst pristanka; bez pristanka SMS se ne šalje, tačka |
| PCI DSS | Kartice | Stripe Checkout i Portal; nikad ne dodirujemo broj kartice (SAQ A) |
| Wyoming LLC obaveze | Godišnji izvještaj, registrovani agent, Form 5472 | U poslovno/; nije tehničko, ali kalendarski podsjetnik ide u /admin |

Nema GDPR obaveze (bez EU kupaca ni EU radnika); ipak, izvoz i brisanje na
zahtjev su ugrađeni jer ih traže i NY kupci.

## 2. Model prijetnji (šta nas može pogoditi, po vjerovatnoći)

1. **Ukraden nalog kupca** (phishing, ponovna upotreba lozinke). Najvjerovatnije.
   Mjere: 2FA obavezna za owner/admin/signer/bookkeeper; magic link ili
   passkey; obavijest o novoj prijavi s nepoznatog uređaja; sesije 12 h, 30 dana
   uz "zapamti me" s rotacijom.
2. **Greška u izolaciji firmi** (IDOR: promijeniš ID u URL-u i vidiš tuđe).
   Mjere: RLS FORCE na svakoj tabeli; test u CI koji za svaki repozitorijski
   metod pokušava pristup tuđem ID-u i očekuje 404; UUID v7 (nema pogađanja).
3. **Curenje kroz log, Sentry, backup, staging.** Mjere: pino redaction lista;
   Sentry `beforeSend` scrubber; backup šifrovan; staging anonimizovan.
4. **Kompromitovan server** (ranjivost, loš SSH). Mjere: firewall, samo ključevi,
   unattended upgrades, Docker bez root, tajne u secrets, PII šifrovan po firmi
   (dump baze bez KEK-a je beskoristan).
5. **Uvoz fajla kao vektor** (CSV injection, XLSX bomba, XXE u XML-u koji bi
   kupac "uploadovao"). Mjere: mi ne primamo XML; CSV neutralizacija; exceljs
   strict; limit veličine; parsiranje u workeru s memorijskim limitom.
6. **Insajder / Mume sam** (impersonacija bez traga). Mjere: impersonacija traži
   razlog, ističe za 30 min, vidljiva vlasniku firme u dnevniku, email vlasniku.
7. **Dobavljač pao** (DO, B2). Mjere: backup na drugom provajderu (B2 ako je
   baza na DO; DO Spaces ako su fajlovi na B2), runbook za selidbu 30 min.
8. **DDoS / credential stuffing.** Mjere: Cloudflare ispred, rate limit
   `/api/auth/*`, argon2id (spor za napadača), zaključavanje poslije 10 pokušaja.

## 3. Autentikacija i sesije

- Better Auth: email + lozinka (argon2id, min 12 znakova, provjera protiv
  HaveIBeenPwned k-anonimity API), magic link (15 min, jednokratan), TOTP 2FA,
  passkeys (WebAuthn) kao opcija od dana 1 (Better Auth plugin).
- 2FA **obavezna** za `owner`, `admin`, `signer`, `bookkeeper`; `payroll` i
  `viewer` podsticani, obavezni ako vlasnik uključi "2FA za sve".
- Sesija: httpOnly, Secure, SameSite=Lax kolačić; 12 h klizno; "zapamti me" 30
  dana; rotacija tokena pri promjeni privilegija; sve sesije se ponište pri
  promjeni lozinke ili isključenju 2FA.
- Potpis izjave traži **ponovnu autentikaciju** (lozinka ili TOTP) unutar 5
  minuta prije klika, bez obzira na sesiju.
- Pozivnice: token 32 bajta, sha256 u bazi, 7 dana, jednokratan, vezan za email.
- Zaključavanje: 10 neuspjelih prijava → 15 min; obavijest korisniku.
- Odjava svuda: dugme u postavkama naloga.

## 4. Autorizacija

- **Svaki Server Action i Route Handler počinje jednom stražom.** Koja straža,
  zavisi od rute, ali "nijedna" nije opcija:

| Straža | Gdje | Šta provjerava |
|---|---|---|
| `requireTenant(minRole \| permission)` | sve rute firme, sve server akcije, `/api/v1/*`, `/api/files/[id]` | sesija, članstvo, uloga, status pretplate; vraća `ctx` s `db` u transakciji koja je postavila `app.tenant_id` i `app.user_id` |
| `requireSession()` | `/account`, `/account/security`, `/firms` | prijavljen korisnik bez firme u kontekstu |
| `requireSuperAdmin()` | `/admin/*` | `is_super_admin`, obavezna 2FA, IP allowlist |
| `verifyStripeSignature()` | `/api/webhooks/stripe` | potpis webhooka nad sirovim tijelom, prozor za ponavljanje. Nikad se ne vjeruje `tenant_id` iz tijela poruke |
| `internalOnly()` | `/api/metrics` | samo interna mreža (10 §5), nikad javno |
| bez straže | `/api/health`, auth rute (`login`, `register`, `magic`, `invite`, `reset`, `verify`) | vidi ispod |

**Zašto `/api/health` nema stražu.** Nadzor je vanjski i nema nalog; da traži
sesiju, ne bi mogao javiti da je aplikacija pala. Zato ta ruta smije biti javna,
ali pod tri uslova, i sva tri su obavezna:

1. Vraća isključivo `{"ok":true}` sa statusom 200, ili `{"ok":false}` sa 503.
   **Nikad** verziju, ime baze, dužinu reda poslova, broj firmi ni bilo šta
   drugo. Detaljno zdravlje ide na `/api/metrics`, koji je interni.
2. Radi jedan jeftin `SELECT 1` s kratkim tajmautom, da "ok" nešto i znači.
   Zdravlje koje vraća 200 dok je baza pala je gore od nikakvog.
3. Ima rate limit kao i ostale javne rute.

**Auth rute nemaju firmu po prirodi stvari** (korisnik se tek prijavljuje), pa
ih čuva nešto drugo: rate limit po IP-u i po emailu, tokeni koji se troše jednom
i imaju rok, i poređenje tokena u konstantnom vremenu. Pozivnica se prihvata samo
ako se email poklapa.

**Ovo je zatvorena lista.** Nova javna ruta se ne dodaje bez izmjene ovog
odjeljka. CI test `guards.test.ts` prolazi kroz sve Route Handlere i server akcije
i pada ako neka nema stražu ili je javna a nije na listi.
- Matrica iz 02-ULOGE se prepisuje u kod (`packages/data/src/permissions.ts`);
  CI test poredi kod s tabelom u 02 (parsira markdown) i pada ako se razlikuju.
  Spec ostaje izvor istine.
- RLS politike: `tenant_isolation` na svakoj tabeli s tenant_id (SELECT, INSERT
  WITH CHECK, UPDATE, DELETE). `audit_log`: INSERT za app_user, SELECT samo za
  vlastiti tenant, bez UPDATE/DELETE grant-a.
- Test `rls.isolation.test.ts`: pravi firmu A i B, kao A pokušava svaki
  SELECT/UPDATE/DELETE na B-ove redove direktno SQL-om kroz app_user;
  očekuje 0 redova. Pokreće se u CI na svakoj migraciji.
- Test `permissions.matrix.test.ts`: za svaku ulogu i svaku akciju iz matrice
  poziva stvarni Server Action i provjerava 200 ili 403.
- Super-admin: `is_super_admin` na korisniku, plus obavezna 2FA, plus IP
  allowlist za `/admin` (Cloudflare Access ili naš middleware).

## 5. Zaštita podataka

- **U prenosu**: TLS 1.2+, HSTS 1 godina s preload, Cloudflare Full (strict),
  interna veza app → baza TLS (DO Managed to traži).
- **U mirovanju**: disk šifrovan (DO i Hetzner nude); baza: PII kolone
  šifrovane po firmi (04 §6); S3: server-side šifrovanje + naše šifrovanje ZIP
  izvoza; backup: pgBackRest `repo-cipher-type=aes-256-cbc` ili DO Managed
  (šifrovan).
- **Minimizacija**: nema punog SSN-a nigdje (kolona ne postoji, uvoz odbija,
  test traži regex u svim izlazima); DOB samo ako nema SSN4; adresa radnika samo
  gdje je zakon traži.
- **Pristup PII**: svaka dešifracija piše `pii_access_log`; vlasnik firme vidi
  "ko je gledao adrese radnika" u dnevniku.
- **Logovi**: pino `redact: ['*.ssn_last4', '*.address*', '*.date_of_birth',
  '*.password', 'req.headers.authorization', 'req.headers.cookie']`; nikad tijelo
  zahtjeva u logu.
- **Sentry**: `sendDefaultPii: false`, `beforeSend` briše `request.data`,
  `user.email` zamjenjuje hash-om.
- **Čuvanje i brisanje**: izvještaji do `retention_until`; import fajlovi 90
  dana; audit log 7 godina; sesije 30 dana; obrisana firma tvrdo poslije 30 dana
  (DEK uništen prvi dan).
- **Izvoz na zahtjev**: vlasnik firme, ZIP šifrovan lozinkom, link 7 dana.

## 6. Sigurnost aplikacije (OWASP lista, primijenjena)

| Rizik | Mjera |
|---|---|
| Injection | Drizzle parametrizovani upiti; nikad string SQL; zod na svakom ulazu |
| XSS | React escaping; CSP `default-src 'self'; script-src 'self' 'nonce-…'; frame-ancestors 'none'`; bez `dangerouslySetInnerHTML` (Biome pravilo) |
| CSRF | Server Actions imaju ugrađenu zaštitu (Origin provjera); Route Handlers koji mijenjaju stanje traže `Sec-Fetch-Site: same-origin` ili token |
| IDOR | RLS + repozitoriji koji uvijek filtriraju po tenant_id; 404 umjesto 403 za tuđe ID-ove |
| SSRF | Server ne fetch-uje URL-ove koje unosi korisnik (nema takve funkcije); `fetch-ny-schedule` ima allowlist domena |
| Upload | magic bytes, veličina, tip, obrada u workeru, S3 presigned PUT s `Content-Type` i `Content-Length` uslovima |
| Preuzimanje | presigned GET 5 min, `Content-Disposition: attachment`, provjera dozvole prije potpisa |
| Zaglavlja | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimalan |
| Zavisnosti | `pnpm audit` u CI (fail na high), Renovate sedmično, lockfile obavezan |
| Tajne | nikad u repou (`gitleaks` pre-commit i u CI), Docker secrets, rotacija Stripe i Resend ključeva godišnje |
| Rate limit | auth 30/min/IP, API 600/min/tenant, upload 20/h/tenant, generisanje 60/h/tenant |
| Enumeracija | "Ako nalog postoji, poslali smo email" na svim auth porukama |

## 7. Dnevnik i nadzor

- `audit_log` za svaku promjenu poslovnih podataka i svaki sigurnosni događaj
  (prijava, neuspjela prijava, 2FA promjena, pozivnica, promjena uloge, potpis,
  impersonacija, izvoz, brisanje).
- Vlasnik vidi dnevnik svoje firme u `/app/[t]/settings/audit` s filterima.
- Alarmi (email + Sentry): > 20 neuspjelih prijava za 5 min na jedan nalog ili
  IP; impersonacija; izvoz cijele firme; backup nije uspio; disk > 80 %;
  greške 5xx > 1 % za 5 min.

## 8. Odgovor na incident (plan na jednoj strani, u docs/runbook.md)

1. **Otkrivanje**: alarm, prijava kupca, ili Mume primijeti. Zabilježi vrijeme.
2. **Zadržavanje** (prvih 60 min): rotiraj kompromitovane tajne; poništi sve
   sesije (`delete from sessions`); ako je server: isključi iz LB-a, snapshot
   diska za forenziku, podigni novi iz Dokploy backupa.
3. **Procjena** (24 h): koje firme, koji radnici, koja polja; da li je PII bio
   dešifrovan (pii_access_log + da li je KEK kompromitovan).
4. **Obavijest**: ako je privatni podatak NY stanovnika bio pristupačan
   neovlaštenom: pogođene osobe (preko kupca, jer mi nemamo kontakt radnika),
   NY AG, Division of Consumer Protection i State Police po §899-aa, najkasnije 30 dana; šablon u runbooku.
   Kupcima: uvijek, u 72 h, čak i ako zakon ne traži.
5. **Popravka i pouka**: uzrok, promjena, test koji bi to uhvatio, zapis u
   `docs/incidents/YYYY-MM-DD.md`.

## 9. Prije prvog kupca s pravim podacima (kontrolna lista)

- [ ] RLS izolacioni test zelen u CI
- [ ] Matrica dozvola test zelen
- [ ] Regex test "nema punog SSN-a" nad svim izlazima
- [ ] 2FA radi i obavezna je za owner
- [ ] Backup vraćen na čist server uspješno (zapisati datum)
- [ ] MASTER_KEY u password manageru, ne u repou (`gitleaks` čist)
- [ ] Sentry scrubber provjeren (pošalji test grešku s lažnim SSN-om, provjeri da
      nije stigao)
- [ ] CSP bez `unsafe-inline` u produkciji
- [ ] Cloudflare WAF i rate limiti uključeni
- [ ] Privacy Policy i Terms objavljeni (šablon: Termly ili advokat, 300 do 800 $)
- [ ] DPA šablon za kupce koji traže (glavni izvođači traže)
- [ ] Stranica /security opisuje tačno ovo (ne više)
- [ ] Runbook napisan i jednom uvježban

## 10. Šta ne obećavamo

- Ne SOC 2 (košta 20.000 $+ godišnje; nijedan podizvođač to ne traži; glavni
  izvođači traže upitnik, koji popunjavamo iz ovog dokumenta).
- Ne HIPAA (nema zdravstvenih podataka; fringe plan "health" je iznos, ne
  dijagnoza).
- Ne "bank-level encryption" fraze na sajtu. Pišemo tačno šta radimo.
