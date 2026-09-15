# CLAUDE.md (WeeklyCert)

Ti si jedini programer na ovom projektu. Mume je vlasnik i ne piše kod; pregleda
ekrane i donosi odluke. Ovaj fajl i `spec/` su tvoja jedina uputstva.

**Korijen repozitorija je ovaj folder.** Specifikacija već živi u `spec/` i tu
ostaje; ne pravi `docs/spec/` i ne kopiraj je. Kod dolazi pored nje, u `apps/`,
`packages/`, `scripts/` i `docker/`. Folderi `dizajn/`, `izvori/`, `skice/` i
`poslovno/` nisu kod: `dizajn/` i `izvori/` čitaj, `poslovno/` i `skice/` ne
diraj.

## Prije bilo čega

1. Pročitaj `spec/00-PROIZVOD.md` i `spec/12-PLAN-IZRADE.md`.
   Za sve što je frontend na mock podacima (koraci 1, 2, 3 i 3b) pročitaj i
   `spec/19-FRONTEND-IZRADA.md` u cijelosti. 19 je ugovor za izradu;
   01, 02, 03, 04, 05, 07, 09, 12, 14, 15 i 16 su iznad njega,
   osim četiri izmjene koje 19 uvodi namjerno i koje su nabrojane na početku 19.
2. Radi **samo korak** koji ti je Mume rekao. Ne počinji sljedeći.
3. Spec je izvor istine. Ako misliš da spec griješi: stani, objasni u jednoj
   rečenici, predloži izmjenu spec fajla. Ne mijenjaj ponašanje "usput".
4. Kapija: koraci 4 i dalje se ne rade dok Mume ne kaže "imamo 10 uplata". Ako te
   zamoli da preskočiš, podsjeti ga na pravilo jednom, pa uradi šta kaže.

## Pravila koja se ne krše

- Nikad kolona, polje, log ni test podatak s punim SSN-om. Samo `ssn_last4`.
- Svaka tabela s `tenant_id` ima RLS politiku u istoj migraciji u kojoj nastaje.
- Svaki Server Action i Route Handler počinje jednom stražom: `requireTenant`,
  `requireSession`, `requireSuperAdmin`, `verifyStripeSignature` ili
  `internalOnly`. Bez straže su samo `/api/health` i auth rute, i to je
  **zatvorena lista** u `spec/11` §4 s uslovima koje svaka od njih mora
  ispuniti. Nova javna ruta traži izmjenu tog odjeljka, ne izuzetak u kodu.
- `packages/core` nema I/O. Ako ti treba baza u `core`, dizajn je pogrešan.
- Novac i stope: `numeric` u bazi, `decimal.js` u kodu. Nikad `number` za novac.
- PII (adresa, DOB, telefon) samo kroz `packages/data/src/pii.ts`; svako čitanje piše
  `pii_access_log`.
- Nema `any`, nema `dangerouslySetInnerHTML`, nema `drizzle-kit push` u produkciji.
- U mock fazi: `DATA_SOURCE=mock` je jedina vrijednost; nijedan uvoz Drizzlea,
  `pg`, Better Autha ni Stripe SDK-a; nema `faker` ni `Math.random()` u
  fixtures; nijedna heks boja van `packages/ui-tokens`; nijedan `toFixed` van
  `lib/format.ts`. Sve su to tvrde kapije u CI (19 §1 i §2).
- Nema tamne teme i nema internacionalizacije u MVP-u (19 §11).
- Poruke validacije dolaze iz `core/validate`, nikad se ne sastavljaju u UI-ju.
- Nazivi iz `spec/01` §1 su obavezni (`payrollPeriod`, `journeyworker`,
  `supplement`, `fringe`...).
- U tekstu koji vidi korisnik (UI, email, PDF) ne koristiti duge crte (em/en
  dash). Tačka, zarez ili novi red. **Jedini izuzetak su zvanični nazivi NYSDOL
  klasifikacija**, gdje je razdvajač ` – ` (U+2013 s razmacima) dio zvaničnog
  naziva po kojem se vrši uparivanje (12 korak 0, nalaz
  `CLASSIFICATION_NOT_OFFICIAL` u 07). Taj znak se ne zamjenjuje.
- Jezik koda i UI-ja: engleski. Jezik poruka Mumi: bosanski, kratko, bez
  uljepšavanja.

## Kako radiš

- Prije pisanja: pročitaj spec fajl za taj korak do kraja. Ne pogađaj.
- Piši test prvo za `core/` (golden fajlovi), poslije za ostalo.
- Poslije svake logičke cjeline: `pnpm check && pnpm test`. Commit s prefiksom
  koraka: `[3.2] weekly grid: cell editing`.
- Kad nešto nije moguće provjeriti iz koda (XSD, portal, obrazac): **prvo
  pogledaj `izvori/`**, gdje Mume ostavlja zvanične fajlove skinute u koraku 0
  (lista je u `poslovno/SKINUTI-FAJLOVE.md`). Ako fajl postoji, on je izvor
  istine i pitanje više nije otvoreno. Ako ga nema, napiši NEPROVJERENO u kodu
  kao komentar s referencom na `spec/13` i nastavi s najboljom
  pretpostavkom iz speca.
- Kad završiš korak: kratak izvještaj Mumi: šta radi, šta ne radi, šta on treba
  da uradi ručno (nalozi, DNS, fajlovi), koje pitanje iz spec/13 je otvoreno.
- Ne dodaji biblioteke koje nisu u `spec/09` bez pitanja.
- Ne pravi "poboljšanja" koja spec ne traži. Manje koda, manje grešaka.

## Komande

```
pnpm dev                 web (DATA_SOURCE iz .env)
DATA_SOURCE=mock pnpm dev
pnpm dev:worker
pnpm check               biome + tsc + dependency-cruiser
pnpm test                vitest (uključuje golden)
pnpm e2e                 playwright na mock buildu
pnpm db:migrate | db:seed | db:studio
```

## Struktura

Monorepo: `spec/09` §3. Unutrašnjost `apps/site` i `apps/web`:
`spec/19` §2. Ne mijenjaj ih bez izmjene speca.

## Dizajn i tekst

- Izgled dolazi iz `spec/14-DIZAJN-SISTEM.md`. Tokeni se kopiraju doslovno;
  vrijednosti su provjerene na kontrast i ne mijenjaju se "da bude ljepše".
- Referentni vizuali su `dizajn/aplikacija.html` i `dizajn/sajt.html`. Ekran koji
  odstupa mora imati razlog zapisan u 03.
- **Nijedan tekst koji korisnik vidi ne izmišljaš.** U kodu svaki string dolazi
  iz `packages/copy`, čiji je sadržaj iz `spec/15`. Poruke nalaza dolaze iz
  `core/validate`, čiji je sadržaj iz `spec/07`. Ako string nedostaje:
  prvo u 15 ili 07, pa u `packages/copy`, pa u kod. Nikad direktno u komponentu.
- Bez tamnog režima u MVP-u. Bez emodžija u sučelju. Bez animacija preko 200 ms.
