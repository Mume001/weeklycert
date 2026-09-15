# 12. Plan izrade (redoslijed za Claude Code)

Ovo je redoslijed kojim se piše kod. Svaki korak ima: šta se pravi, iz kojeg spec
fajla, kako se zna da je gotov. Claude Code radi korak po korak, poslije svakog
pravi commit, i ne prelazi na sljedeći dok kriterij nije zelen.

**Kapija prije koraka 4**: 10 firmi koje su platile (presale 147 $ ili setup).
Koraci 0 do 3 su frontend na mock podacima i služe za demo tim firmama. Bez 10
uplata, backend se ne piše. To je pravilo iz `moj-agent/KONTEKST.md` i iz 00-PROIZVOD.

---

## Korak 0: Provjere prije koda (Mume, pola dana, ručno)

Ovo Claude Code ne može uraditi iz sandboxa. Bez ovoga koraci 5 i 6 su nagađanje.

**Operativna lista s tačnim linkovima i imenima fajlova je
`poslovno/SKINUTI-FAJLOVE.md`.** Sve se skida u `izvori/ny/` i
`izvori/federalno/`, jer repozitorij u ovom trenutku još ne postoji. Korak 1
kopira te fajlove u `packages/core/src/ny/schema/` i `packages/core/src/federal/`.
Ček-lista ispod ostaje kao pregled šta se time zatvara.

- [ ] Skinuti **XSD**: `https://dol.ny.gov/certpayrollxsd` (fajl
      `NYDOL_CertPayroll.xsd`) i **primjer XML-a**:
      `https://dol.ny.gov/certpayrollsamplexml`. Sačuvati u
      `izvori/ny/`. Provjeriti: redoslijed elemenata, tačan
      token za "Other Benefit", da li su gender i ethnicity uopšte u šemi.
- [ ] Skinuti aktuelni **WH-347 PDF** (verzija 2025) s dol.gov/agencies/whd/forms
      i uputstvo. Sačuvati u `izvori/federalno/`.
- [ ] Skinuti **listu klasifikacija** s
      `dol.ny.gov/electronic-payroll-xml-work-classification-list` (samo HTML,
      nema fajla). Sačuvati sirovi HTML i prebrojati stvarni broj stavki.
      Razdvajač je ` – ` (U+2013 s razmacima). U `classifications.seed.json`.
- [ ] Preuzeti jednu stvarnu PRC platnu tabelu (npr. za Kings County) kao
      primjer za parser, **uključujući OVERTIME PAGE i HOLIDAY PAGE**. Legenda
      praznika (numerisani kodovi 1 do ~29) nije nigdje zasebno objavljena i
      treba je prepisati (spec/13 A10).
- [ ] Ući u portal (`mpwr-public.labor.ny.gov`) i vidjeti uživo: ekran uploada,
      No Work Week čekboks, Enter Work Pause Dates, kako izgleda poruka o grešci,
      i da li se fajl može uploadovati u sedmicu koja već ima unos.
- [ ] Odluka: DigitalOcean ili Hetzner (10 §3). Napraviti nalog.

## Korak 1: Kostur repozitorija i dizajn sistem (Claude Code, 1,5 dan)

Iz: 09-TEHNOLOSKI-STEK i **14-DIZAJN-SISTEM**.
- pnpm workspace, `apps/site`, `apps/web`, `apps/worker`,
  `packages/core|db|data|ui-tokens|copy|config`, scope `@wc/*`.
  Unutrašnjost obje aplikacije je propisana u **19 §2**.
- Next.js 16, Tailwind 4, shadcn init, Biome, Vitest, Playwright, tsconfig strict.
- Ovaj folder **jeste** korijen repozitorija: `git init` ovdje, `.gitignore` je
  već tu, `CLAUDE.md` i `spec/` su već na mjestu i ne kopiraju se nigdje.
- `data/src/repositories.ts` interfejs za sve entitete iz 04, DTO-i i zod šeme u
  `data/src/dto/*.ts` po **19 §3**, i `data/src/mock/` implementacija koja čita
  `data/src/mock/fixtures/*.json`.
- **Demo podaci se pišu ovdje, ne u koraku 3**, jer se okvir aplikacije ne može
  sagraditi nad praznim repozitorijem. Sadržaj je propisan u **19 §4**.
- `packages/copy`: svaki string iz 15, po ključevima.
- Docker Compose za lokalno (postgres, minio, mailpit), ali se još ne koristi.
- **`packages/ui-tokens`: svi tokeni iz 14 §3 do §5 doslovno**, kao CSS varijable
  i kao Tailwind `@theme`. IBM Plex Sans i Mono, samo debljine 400, 500, 600.
- Osnovne komponente iz 14 §9 s punim skupom stanja, i test kontrasta koji
  provjerava da nijedan par boja iz tokena ne pada ispod praga (skripta iz 14).
- CI: check + unit prolaze na praznom projektu.
- **Gotovo kad**: `DATA_SOURCE=mock pnpm dev` otvori praznu stranicu s okvirom
  aplikacije koji izgleda kao `dizajn/aplikacija.html`; CI zelen; test kontrasta
  zelen.

## Korak 2: Motor (`packages/core`), prije ekrana (Claude Code, 3 do 4 dana)

Iz: 01-DOMEN, 07-VALIDACIJA.
Motor prije ekrana, jer mreža sati bez motora nema šta prikazati u panelu.
- `engine/`: ulazni tipovi (zod), ST/OT podjela po **federalnom pragu od 40** i po
  **NY OT kodovima klasifikacije** (puna legenda u 01 §2.1, kodovi se primjenjuju svi
  i uzima se najviša premija za taj sat),
  ponderisani regular rate, fringe kredit i anualizacija, manjak, pripravnici,
  odbici i neto.
- `validate/`: svih 63 koda (60 redova) iz 07 §3 s porukama.
- `__golden__/`: 15 slučajeva iz 01 §5 kao JSON ulaz + očekivani izlaz.
- **Gotovo kad**: svih 15 golden testova zeleno; pokrivenost `core/engine` ≥ 95 %;
  svaki kod nalaza ima pozitivan i negativan test.

## Korak 3: Svi ekrani na mock podacima (Claude Code, 10 do 14 dana)

Iz: 03-RUTE-I-EKRANI (redoslijed iz §5), 02-ULOGE (navigacija po ulozi),
**14-DIZAJN-SISTEM** (mjere, posebno §7 za mrežu sati), **15-TEKSTOVI** (svaki
string dolazi odatle, ništa se ne izmišlja), **07-VALIDACIJA** (oblik i kodovi
nalaza).

**Ugovor za izradu je 19-FRONTEND-IZRADA**: stablo fajlova, DTO-i, potpisi
komponenti, demo podaci, numeracija sesija i definicija gotovog. 19 ne
zamjenjuje nijedan dokument iznad, nego ih veže.

Referentni vizual je `dizajn/aplikacija.html`. Ekran koji odstupa od njega mora
imati razlog zapisan u 03.
- Mock fixtures su već napravljeni u koraku 1 po 19 §4: "Hudson Electric LLC",
  3 projekta (jedan federalni, jedan završen), 12 radnika, 6 sedmica istorije na
  prvom projektu (jedna s greškama), sedmica bez rada na drugom projektu, i
  druga firma za birač.
- Mreža sati poziva pravi motor iz `core` (na mock podacima) pa panel nalaza radi
  stvarno.
- Uloga se bira u mock modu iz padajućeg menija u zaglavlju (samo mock) da se
  provjeri navigacija i skrivanje.
- Svaki ekran: učitavanje, prazno, greška, zabranjeno i **zaključano** stanje
  (pet stanja, 19 §7); tastatura; Playwright test glavne akcije; axe-core čist.
- **Gotovo kad**: svih 51 ruta koje nosi `apps/web` postoji (44 ekrana i 7 API
  ruta); preostalih 6 javnih stranica su korak 3b. Playwright 15 tokova zeleno,
  demo se može pokazati kupcu od registracije do "potpisano" bez baze.
- **Ovo je verzija za prodaju.** Snimiti interaktivni demo bez forme (16 §4) i
  video od 90 sekundi bez zvuka, s titlovima.

## Korak 3b: Javni sajt (Claude Code, 2 dana, paralelno s korakom 3)

Iz: 16-MARKETING-SAJT, vizual `dizajn/sajt.html`.
- Zasebna aplikacija `apps/site` (`output: 'export'`), sav tekst u
  `packages/copy`. Razlog za odvajanje od `apps/web` je u 19 §2: sajt ide u
  produkciju sedmicama prije aplikacije i na drugi host.
- Uzorci za preuzimanje: WH-347 PDF i NY XML iz demo podataka, bez forme za
  email. **Prije koraka 5 ovi uzorci se prave ručno, jednom**, i drže se kao
  statični fajlovi; generator ih zamjenjuje kad korak 5 bude gotov (19 §11).
- Bez izmišljenih izjava kupaca. Prazna mjesta ostaju prazna dok ne bude
  stvarnih.
- **Gotovo kad**: LCP ispod 1,5 s na 3G, radi na telefonu, objavljen na
  Cloudflare Pages (19 §9), i Mume može poslati link u hladnom emailu.

## KAPIJA: 10 uplata. Bez toga se ne ide dalje.

Dok se čeka: prodaja (SISTEM-KONTAKTA), pozivi s kupcima, popravke ekrana po
njihovim primjedbama. Svaki poziv daje popravke u spec fajlovima, ne u kodu
backenda.

## Korak 4: Baza i auth (Claude Code, 4 do 5 dana)

Iz: 04-MODEL-PODATAKA, 02-ULOGE, 11-SIGURNOST §3 i §4.
- Drizzle šema sve 44 tabele, enum tipovi, indeksi; migracije s RLS
  politikama u istom fajlu; `app_user` i `app_admin` uloge.
- Better Auth s pluginovima; 2FA obavezna po ulozi; magic link; pozivnice.
- `requireTenant()` s `set_config` transakcijom.
- `data/drizzle` implementacija repozitorija; `DATA_SOURCE=drizzle` pokreće iste
  ekrane.
- PII šifrovanje (`packages/data/src/pii.ts`, koristi ga i worker) + `pii_access_log`.
- Seed: states, klasifikacije iz koraka 0, demo firma.
- Testovi: RLS izolacija, matrica dozvola, PII round-trip.
- **Gotovo kad**: svi Playwright tokovi iz koraka 3 prolaze na `drizzle` bez
  izmjene testova; RLS i matrica zeleni u CI.

## Korak 5: Izlazi (Claude Code, 4 do 5 dana)

Iz: 05-IZLAZI. Zahtijeva korak 0.
- `scripts/dump-pdf-fields.ts` → `wh347-fields.json`; mapiranje na stvarna imena.
- NY XML builder + `xmllint --schema` test nad 15 golden slučajeva.
- WH-347 popunjavanje + `wh347-values.json` + regex test "nema punog SSN-a".
- Cover strana, ZIP paket.
- Worker: pg-boss, `report.generate`, S3 upload, `files`, `reports` statusi.
- Potpis s ponovnom autentikacijom, `payroll_number` dodjela, zaključavanje.
- **Gotovo kad**: jedan stvarni XML prihvaćen u NY portalu za test ili prvog
  kupca (ovo je jedini pravi kriterij); WH-347 pregledan od jednog glavnog
  izvođača ili kupca.

## Korak 6: Uvoz (Claude Code, 3 do 4 dana)

Iz: 06-UVOZ.
- Parseri za 8 izvora s 40 fixture fajlova; profili; 4 koraka; worker za velike
  fajlove; poništavanje uvoza; puni SSN odbijen.
- **Gotovo kad**: uvoz stvarnog fajla prvog kupca radi bez ručne popravke CSV-a.

## Korak 6b: Emailovi i podsjetnici (Claude Code, 2 dana)

Iz: 15-TEKSTOVI-I-EMAILOVI §4.
- Resend, poddomena `mail.weeklycert.com`, SPF, DKIM, DMARC, oba formata.
- pg-boss zakazani poslovi: ponedjeljni pregled, brojač 30-dnevnog roka na T-10,
  T-5, T-2, T-0, federalni T-2, podsjetnik za potpis poslije 24 h.
- Sva vremena se računaju u `America/New_York` (17 §1).
- **Gotovo kad**: šablon podsjetnika iz 15 §4.3 stiže u Gmail inbox, ne u spam,
  i DMARC izvještaji su čisti.

## Korak 7: Naplata (Claude Code, 2 dana)

Iz: 08-NAPLATA.
- Stripe Checkout, webhook ruta + worker, Portal, pauza, statusna zaštita, presale
  kupon; Test Clocks scenariji.
- **Gotovo kad**: kartica 4242 završi trial → naplata u test modu; pad kartice →
  past_due → email; otkaz → grace → purge posao zakazan.

## Korak 8: Infrastruktura i prvi deploy (Claude Code uz SSH, 2 dana)

Iz: 10-INFRASTRUKTURA §5, 11 §9.
- bootstrap.sh, Dokploy, Managed Postgres, B2, secrets, Cloudflare, staging,
  UptimeRobot, Sentry, backup restore test.
- Kontrolna lista 11 §9 kompletna.
- **Gotovo kad**: `https://app.weeklycert.com` radi, restore test prošao, lista
  čekirana, incident runbook napisan.

## Korak 8b: Pravno i operativno, prije prvog stvarnog kupca (Mume, 1 sedmica)

Iz: 18-PRAVNO §5 i 17-PODRSKA.
- Uslovi, politika privatnosti, DPA i WISP po redoslijedu iz 18 §5, pa advokatski
  pregled za 1.000 do 2.000 $.
- Cyber i E&O osiguranje. **Prije prvog glavnog izvođača, ne na dvadesetom kupcu.**
- Stranica statusa na `status.weeklycert.com`, autoodgovor koji informiše, hitni
  put s riječju DEADLINE.
- **Kontrolna tabla rokova za Mumu** u /admin: svaki kupac, svaki projekat, dana
  od zadnje prihvaćene predaje, dana do praga od 14 dana.
- **Gotovo kad**: kontrolna lista iz 11 §9 je kompletna i sva četiri dokumenta su
  objavljena.

## Korak 9: Onboarding prvih 10 kupaca (Mume + Claude Code, 2 do 3 sedmice)

Iz: 17-PODRSKA §6 i §7. Runbook od sedam radnih dana po kupcu, s budžetom sati po
nivou i s obaveznim odobrenjem podataka šestog dana.
- Setup radimo mi, ali **nikad u kupčevom formatu**: jedan šablon, validiran.
- Svaka sedmica prvog mjeseca: pregledamo njihov izvještaj prije nego ga predaju,
  i javljamo se prije nego što išta propuste.
- Svaki problem → nalaz u 07, tekst u 15 ili popravka u 03; commit isti dan.
- Mjeriti stvarne sate po postavljanju od prvog kupca. Bez deset mjerenja nema
  tačne cijene nivoa.
- **Gotovo kad**: 10 firmi predalo najmanje 4 sedmice svaka bez naše pomoći.

## Korak 10: Poslije (tek kad 9 završi)

Redom po broju kupaca koji traže: podsjetnici SMS-om (uz pristanak), godišnji
plan, email-to-import, QuickBooks Time API, NJ.

## Procjena vremena

| Korak | Dana rada | Ko |
|---|---|---|
| 0 | 0,5 | Mume |
| 1 | 1,5 | Claude Code |
| 2 | 4 | Claude Code |
| 3 | 12 | Claude Code + Mume pregleda ekrane |
| kapija | prodaja, 4 do 8 sedmica | Mume |
| 4 | 5 | Claude Code |
| 5 | 5 | Claude Code |
| 6 | 4 | Claude Code |
| 7 | 2 | Claude Code |
| 3b | 2 | Claude Code |
| 6b | 2 | Claude Code |
| 8 | 2 | Claude Code + Mume (nalozi, DNS) |
| 8b | 5 | Mume + advokat |
| 9 | 15 (razvučeno) | oboje |

Ukupno koda: oko 40 radnih dana Claude Codea, uz Mumin sat do dva dnevno za
pregled i odluke. Prvi kupac s pravim podacima realno 10 do 12 sedmica od
početka, od čega je pola čekanje na uplate, a ne kod.

## Kako Mume vodi Claude Code (praktično)

- Jedna sesija po koraku. Prva poruka: "Pročitaj CLAUDE.md i spec/12 korak N.
  Radi samo taj korak." Ne više.
- Za korake 1, 2, 3 i 3b (sve što je frontend na mock podacima) sesija se otvara
  oblikom iz **19 §10**, koji imenuje i sesiju i tačne odjeljke koje treba
  pročitati.
- Poslije svakog koraka: `pnpm test && pnpm e2e` mora biti zeleno prije commita.
- Kad Claude Code predloži promjenu koja odstupa od spec fajla: prvo se mijenja
  spec (s razlogom u 13-OTVORENA-PITANJA), pa kod. Spec je izvor istine.
- Svaki commit poruka počinje brojem koraka: `[3.4] weekly grid: findings panel`.
- Ne dozvoliti Claude Codeu da preskoči kapiju "jer je backend lako". Lako je;
  poenta nije težina, nego da se ne gradi nešto što niko ne plaća.
