# 20. Sesije za Claude Code (korak 3 završen, korak 4 u toku)

Ovo je red čekanja za Claude Code poslije sesije E (pregled, potpis,
izvještaji). Svaka sesija je jedan unos ovdje. Mume otvara sesiju jednom
rečenicom:

> Pročitaj CLAUDE.md i spec/20, pa radi sesiju F. Ništa drugo.

Za svaku sesiju važi isto, i ne ponavlja se dolje:

- Pročitaj CLAUDE.md, spec/19 §2, §3, §5, §7 i §10, i odjeljke navedene uz
  sesiju.
- Sav tekst iz packages/copy, prvo u spec/15. Bez dugih crta.
- Svih pet stanja iz 19 §7, tastatura, axe čist, Playwright test glavne akcije,
  snimak u docs/screens/.
- Svaka brojka iz 03 se mjeri testom (19 §10 stavka 9).
- Ako se dva spec fajla ne slažu, ili string fali: stani i pitaj.
- Ne diraj nijedan ekran koji nije naveden uz sesiju.
- Kad pnpm check i e2e prođu: commit, pa git push na origin main.

Redoslijed je iz 03 §5 i ne mijenja se.

---

## F. Projekti

Čitaj: 03 §3 ("Kuda vodi This week") i §4.4, 04 (projects,
project_classifications), 01 §2.1.

Ekrani: `/app/[t]/projects`, `/projects/new`, `/projects/[id]`,
`/projects/[id]/settings`, `/projects/[id]/classifications`.

Obavezno:
- Lista projekata mora podržati `?open=1` po 03 §4.4, jer na nju već vodi
  "This week" kad firma ima dva aktivna projekta. Kolona tada pokazuje
  najstariju otvorenu sedmicu, a klik vodi baš na nju.
- Vremenska linija nema rupa: svaka sedmica od početka projekta postoji,
  sedmice bez unosa su jasno označene. Redni broj prije potpisa piše
  "biće #N".
- Dan kraja sedmice se ne smije mijenjati poslije prve sedmice, s objašnjenjem.
- PRC i broj ugovora jedinstveni u firmi.
- Stopa klasifikacije se nikad ne prepisuje: "nova verzija od datuma", stare
  sedmice ostaju tačne.
- Sidebar linkovi na ove ekrane dobijaju prefetch nazad (README repoa).

## G. Radnici i beneficije

Čitaj: 03 §4.6, 02 §3 (šta viewer smije vidjeti), 04 (workers, fringe_plans),
11 §5.

Ekrani: `/app/[t]/workers`, `/workers/new`, `/workers/[id]`,
`/app/[t]/fringe-plans`.

Obavezno:
- Polje za SSN prima tačno 4 cifre. Polje za pun SSN ne postoji nigdje.
- Zadnje 4 SSN ili datum rođenja, jedno od dva, forma to forsira.
- Prije "Prikaži" samo "••••", poslije "••••1234"; svaki "Prikaži" se bilježi.
- U listi radnika nema adresa ni SSN-a.
- Viewer vidi samo ime i klasifikaciju (02 §3); adrese mu ne idu ni u
  preglednik, isto pravilo kao engineInput() u mreži.
- Pretvarač "mjesečna premija u iznos po satu" pokazuje djelitelj i napomenu o
  2.080 sati.

## H. Onboarding

Čitaj: 03 §4.3 (onboarding), 02 §5 (zaključani koraci po ulozi), 08 §2.1.

Ekran: `/app/[t]/onboarding`, svih 7 koraka.

Obavezno:
- Svaki korak se snima odmah, čarobnjak se može prekinuti i nastaviti.
- "Preskoči za sada" samo na koracima 4, 5 i 7; korak 7 samo dok traje trial.
- Za payroll, signer i bookkeeper koraci 1 i 7 su zaključani i kažu ko ih može
  unijeti (02 §5).
- Korak 7 (naplata) je u mocku lažan: nema Stripea, samo izbor nivoa i povratak.
- "Zalijepi tabelu iz platnog rasporeda" predlaže redove, korisnik ih potvrđuje.
- Koristi forme koje već postoje iz sesija F i G, ne pravi nove.

## I. Uvoz

Čitaj: 03 §4.7, 06 u cijelosti.

Ekrani: `/app/[t]/imports`, `/imports/new` (4 koraka), `/imports/[id]`.

Obavezno:
- Ćelije koje počinju sa `= + - @` se tretiraju kao tekst.
- XLSX veći od 50 MB kad se raspakuje se odbija.
- Korak 4 poredi uvezeni bruto s payroll registrom i pokazuje razliku prije
  potvrde.
- Poništavanje uvoza do 90 dana, samo ako sedmica nije potpisana.
- Dugme "Import CSV" u mreži sati prestaje biti mrtvo i vodi ovdje.

## J. Arhiva

Čitaj: 03 §4.8.

Ekran: `/app/[t]/archive`.

Obavezno:
- Filteri: projekat, godina, status, verzija, radnik.
- Pretraga po PRC-u vraća sve izvještaje za taj PRC u jednom koraku.
- "Izvezi sve za projekat" je u mocku statičan zip iz fixtures, jasno označen.

## K. Kontrolna tabla i Moje firme

Čitaj: 03 §4.2 (/firms) i §4.3 (dashboard), 05 (ritam predaje), 19 §4
(MOCK_TODAY).

Ekrani: `/app/[t]/dashboard`, `/firms`, `/app` (preusmjeravanje).

Obavezno:
- Dva brojača roka po projektu: 30 dana od zadnje prihvaćene predaje, crveno kad
  prođe, tamnocrveno poslije 14 dana grejsa. Federalni projekat ima i treći
  red za WH-347.
- Kartica "report waiting for signature" je red čekanja potpisnika (02 §5) i
  vodi pravo na ekran potpisa.
- Sve se računa od MOCK_TODAY, nikad od new Date().
- Učitavanje ispod 500 ms na 50 projekata, izmjereno testom.
- `/firms` sortirano po najbližem roku.

## L. Postavke

Čitaj: 03 §4.9, 02 §3, 08, 11 §4.

Ekrani: `/app/[t]/settings/company`, `/team`, `/signers`, `/billing`,
`/notifications`, `/audit`, `/data`.

Obavezno:
- Unutar Settings se pod-stranice skrivaju po 02 §3 (payroll vidi samo Company
  za čitanje i Notifications).
- Naplata je mock: bez Stripea. "Otkaži" ide kroz razlog, izvoz arhive i
  potvrdu upisivanjem imena firme.
- SMS je isključen dok ne postoji pisani pristanak s punim tekstom.
- Brisanje firme: 30 dana milosti i napomena o obavezi čuvanja.

## M. Prijava i nalog

Čitaj: 03 §4.1 (auth dio) i §4.2 (/account), 11 §3 i §4 (auth rute bez
straže), 15 §3 (prijava).

Ekrani: `/login`, `/register`, `/forgot`, `/reset/[token]`, `/verify/[token]`,
`/magic/[token]`, `/invite/[token]`, `/2fa`, `/account`, `/account/security`.

Obavezno:
- Sve su forme koje u mocku samo navigiraju. Nema Better Autha.
- Pogrešni podaci daju isti tekst za oba slučaja.
- Magic link troši token tek na klik dugmeta, ne pri otvaranju stranice.
- `/register?invite=...` ne traži naziv firme.
- "Log in" se i dalje NE vraća na sajt (16 §4 red 1). To se radi tek kad
  registracija stvarno proradi, poslije kapije.

## N. Admin

Čitaj: 03 §4.10, 02 §1 (super-admin nije uloga u firmi), 11 §4.

Ekrani: `/admin`, `/admin/tenants`, `/admin/tenants/[id]`, `/admin/jobs`,
`/admin/wage-schedules`, `/admin/classifications`.

Obavezno:
- Samo super-admin. Svaka druga uloga dobija ForbiddenState.
- Impersonacija traži razlog, traje 30 minuta, bilježi se i vidljiva je
  vlasniku firme u njegovom dnevniku.

## O. Demo za prodaju

Čitaj: 12 korak 3 ("Ovo je verzija za prodaju"), 16 §4 red 7.

- Provjeri da svih 57 ruta iz 03 §2 postoji i da Playwright tokovi prolaze.
- Interaktivni demo na sajtu: ugrađena mreža na mock podacima, bez forme,
  završava na pregledu izvještaja. Zamjenjuje prazan red 7 na početnoj.
- Video od 90 sekundi bez zvuka, s titlovima, snimljen Playwrightom, u
  docs/demo/.

Poslije sesije O korak 3 je gotov i odmah počinje korak 4 iz spec/12 (kapija je
ukinuta 24.9.2026). Korak 3 je završen 29.9.2026. Sesije koraka 4 su ispod.

---

# Korak 4: prava baza, prijava i šifrovanje

Cilj koraka 4 iz 12: iste ekrane i iste Playwright tokove pokrenuti na
`DATA_SOURCE=drizzle`, s pravom Postgres bazom, pravom prijavom i RLS-om.
Nijedan ekran se ne mijenja izgledom. Mock ostaje i dalje radi (demo, sajt,
brzi testovi).

Za svaku sesiju koraka 4 važi, uz pravila s vrha ovog fajla:

- Ugovorni testovi repozitorija su jedan skup testova koji se pokreće i na
  `mock` i na `drizzle`. Isti test, isti očekivani rezultat. Kad se ne slažu,
  mock je bio pogrešan ili drizzle jeste; ispravlja se kod, ne test.
- Nijedan test ne smije zavisiti od kolačića `wc-mock-*` kad radi na drizzle.
  Stanje za test (pauzirana firma, pomjeren sat, uključena zastavica) postavlja
  Playwright fixture direktno u testnoj bazi. Aplikacija nema nijednu testnu
  rutu ni testni prekidač u produkcijskom buildu.
- Lozinke, ključevi i tokeni za lokalni rad su u `.env` koji se ne komituje;
  `.env.example` ima samo imena i opis.
- Ništa iz koraka 5 (XML, PDF), 6b (emailovi osim onih koje prijava traži),
  7 (Stripe) ni 8 (server).

## P. Lokalna baza, šema i RLS

Čitaj: 12 korak 4, 04 cijeli, 09 §2, §3, §5 i §6, 11 §4, 10 §6.

- Prvo provjeri `docker --version` i `docker compose version`. Ako Docker nije
  instaliran ili ne radi, **stani** i javi tačno šta fali. Ništa ne instaliraj
  sam na Mumin računar.
- `docker/compose.yml`: postgres:17, minio, mailpit. Web i worker lokalno i dalje
  idu kroz pnpm.
- Drizzle šema svih tabela iz 04, enum tipovi, indeksi, jedinstvena ograničenja
  (uključujući NULLS NOT DISTINCT iz 04). Broj tabela mora odgovarati 04 §2;
  test to broji.
- Migracije su SQL fajlovi. RLS politike su u istoj migraciji kao tabela.
  Uloge `app_user` (bez BYPASSRLS, nije vlasnik tabela) i `app_admin`.
- `audit_log`: `app_user` smije samo INSERT i SELECT svoje firme. Bez UPDATE i
  DELETE granta.
- `rls.isolation.test.ts`: sam pronađe svaku tabelu s `tenant_id` iz
  information_schema, pa kao firma A pokuša SELECT, UPDATE i DELETE nad
  redovima firme B kroz `app_user`. Očekuje 0 redova. Pada ako neka tabela s
  `tenant_id` nema politiku.
- Seed: države, katalog klasifikacija (dok u `izvori/` nema zvanične liste,
  koristi listu iz fixtures, označenu NEPROVJERENO), demo firma Hudson Electric
  sa istim podacima i istim ID-jevima kao fixtures.
- CI: posao `db` iz 09 §6 (Postgres 17 servis, migracije na prazno, RLS test).
- **Gotovo kad**: `docker compose up -d`, `pnpm db:migrate` i `pnpm db:seed`
  rade na praznoj bazi; RLS test zelen lokalno i u CI.

## Q. Repozitoriji na bazi, prvi dio, i šifrovanje

Čitaj: 04 §6, 09 §3, 11 §4 i §5, 19 §3 (Repozitorij).

- `requireTenant()` otvara transakciju i postavlja `app.tenant_id` i
  `app.user_id` sa `set_config(..., true)`. Svaki upit ide kroz tu transakciju.
- `data/drizzle` za: projekte i klasifikacije, sedmice (mreža, ćelije,
  kopiranje prošle sedmice, "nema rada"), radnike, planove i beneficije po
  radniku.
- `packages/data/src/pii.ts` tačno po 04 §6: KEK iz secreta, DEK po firmi,
  AES-256-GCM, format bajtova i AAD kako piše. Svako dešifrovanje piše
  `pii_access_log`.
- Testovi: PII round-trip; šifrat iz jedne kolone ili firme ne dešifruje se u
  drugoj (AAD); u sirovoj bazi nigdje nema čitljive adrese ni datuma rođenja
  (test pretraži sve tekstualne i bytea kolone); pravilo iz 19 §3 (tuđi ID je
  404) važi i na drizzle.
- Ugovorni testovi za sve navedeno prolaze na `mock` i na `drizzle`.
- **Gotovo kad**: ekrani projekata, mreže i radnika rade na `drizzle` s istim
  e2e testovima.

## R. Repozitoriji na bazi, drugi dio, i fajlovi

Čitaj: 04, 06, 08 §2, 11 §5 i §7, 19 §3.

- `data/drizzle` za sve ostalo: pregled i potpis, izvještaji i predaje (s
  kanalom), korekcije, uvoz i poništavanje, arhiva, kontrolna tabla i /firms,
  postavke, dnevnik, zastavice, admin i pristup podrške.
- Skladište fajlova kroz S3 API (MinIO lokalno): ključ fajla nikad ne sadrži
  ime radnika ni SSN; preuzimanje ide samo kroz `/api/files/[id]` sa stražom.
  Certifikat pripravnika se sad može uploadovati (03 §4.6).
- Pretraga arhive po radniku radi i za starije sedmice.
- Zadnja aktivna firma se pamti po korisniku.
- Brzina: kontrolna tabla na 50 projekata ispod 500 ms na pravoj bazi, mjereno
  testom sa seedom od 50 projekata.
- **Gotovo kad**: ugovorni testovi 100% zeleni na obje implementacije.

## S. Prijava (Better Auth)

Čitaj: 11 §3 i §4, 09 §2 (Auth), 02, 15 §3 (Prijava i nalog), 03 §4.1.

- Better Auth samo za identitet i sesiju, bez `organization` plugina (09 §2).
  Firme, članstva i pozivnice su naše tabele.
- Lozinke argon2id, najmanje 12 znakova, provjera kroz HaveIBeenPwned
  k-anonimity. Ako HIBP ne odgovori, prijava ne pada; to se bilježi.
- Magic link 15 minuta, jednokratan, troši se tek na klik (kao u M).
- TOTP 2FA obavezna po ulozi iz 11 §3, s QR kodom i kodovima za oporavak.
  Passkey kao opcija.
- Sesija: httpOnly, Secure, SameSite=Lax, 12 h klizno, 30 dana uz "zapamti me",
  rotacija pri promjeni uloge, sve sesije se gase pri promjeni lozinke ili
  isključenju 2FA. "Sign out everywhere" radi stvarno.
- Zaključavanje: 10 promašaja, 15 minuta, rate limit po IP-u i po emailu.
- Pozivnice: token 32 bajta, u bazi samo sha256, 7 dana, jednokratan, samo za
  email na koji je poslan.
- Potpis izjave traži ponovnu potvrdu (lozinka ili TOTP) unutar 5 minuta.
- Registracija pravi stvarnu firmu i DEK firme. Brisanje firme se može povući
  u roku od 30 dana; DEK se briše tek na kraju roka.
- Emailovi koje prijava treba (potvrda, magic link, nova lozinka, pozivnica) idu
  u Mailpit lokalno, tekstovi iz 15. Ostali emailovi čekaju 6b.
- Dnevnik bilježi prijave, neuspjele prijave i preuzimanja fajlova.
- Demo prijava (lozinka "demo") ostaje samo na mock (19 §4).
- Testovi: seed korisnici s testnim lozinkama iz seed fajla; TOTP kod test
  računa iz seed tajne.
- **Gotovo kad**: svi tokovi iz sesije M rade na `drizzle` s pravom prijavom.

## T. Zatvaranje koraka 4

Čitaj: 12 korak 4 i 8c, 11 §4 i §9.

- Cijeli Playwright skup prolazi na `DATA_SOURCE=drizzle`. Testovi se ne
  mijenjaju osim što kolačiće `wc-mock-*` zamjenjuju fixture-i nad bazom.
- `guards.test.ts`: prolazi kroz sve Route Handlere i server akcije i pada ako
  neka nema stražu ili je javna a nije na listi iz 11 §4.
- `permissions.matrix.test.ts`: za svaku ulogu i akciju iz 02 poziva stvarnu
  server akciju na `drizzle` i očekuje dozvoljeno ili 403 tačno po tabeli.
- Test da produkcijski build nema nijednu mock ili testnu rutu ni kolačić.
- Upiši u 12 korak 4 šta je urađeno i šta je prebačeno dalje, s razlogom.
- **Gotovo kad**: sve gore zeleno u CI dva pokretanja zaredom. Onda stani i
  javi; sesije za korak 5 dolaze ovdje.

