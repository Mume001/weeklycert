# 19. Frontend, ugovor za izradu

Ovaj dokument postoji zato što 03 kaže **šta** svaki ekran radi, a 14 kaže **kako
izgleda**, ali nijedan ne kaže Claude Codeu **koje fajlove da napravi, kojim
imenima, s kojim propsima i s kojim podacima**. Bez toga svaka sesija izmisli
svoju verziju i poslije se ne slaže ništa.

**Izvori istine se ne ponavljaju ovdje:**

| Pitanje | Dokument |
|---|---|
| Šta ekran radi, koja stanja, kriterij prihvatanja | 03 |
| Boje, mjere, tipografija, pristupačnost | 14 |
| Tekst na engleskom, svaka poruka | 15 |
| Nalazi: kodovi, težine, oblik, poruke | 07 |
| Uloge i dozvole | 02 |
| Struktura monorepa, verzije biblioteka | 09 |
| Tabele, enumi, prelazi stanja | 04 |
| Pravila obračuna | 01 |
| Kolone i redoslijed u izlazima | 05 |
| Sadržaj marketing sajta | 16 |
| Redoslijed koraka i kapija | 12 |

Ako se ovaj dokument s nekim od njih ne slaže, **oni su u pravu** i ovaj se
ispravlja.

**Jedini izuzetak** su četiri izmjene koje 19 unosi namjerno i koje su **već
primijenjene** u tim dokumentima 15.9.2026: podjela na `apps/site` i `apps/web`
(§2, mijenja 09 §1 i §3 i 12 korak 3b), peto stanje ekrana (§7, mijenja 03 §5 i
12 korak 3), mjesto objavljivanja (§9, mijenja 09 §2 i §7 i 10 §5, §6 i §8), i
demo podaci u koraku 1 umjesto koraka 3 (§4, mijenja 12). Van te četiri, 19 je
podređen.

---

## 1. Pravila faze

Frontend se gradi **prije bilo kakvog backenda**. Kapija od 10 uplata je ukinuta
24.9.2026 (12 §KAPIJA), ali redoslijed ostaje: backend počinje tek kad je korak 3
gotov.

1. `DATA_SOURCE=mock` je jedina vrijednost dok traje ova faza. Nema `.env` s
   bazom, nema Dockera, nema migracije.
2. Nijedna komponenta ne uvozi Drizzle, `pg`, Better Auth ni Stripe SDK. Uvozi
   se **samo** `@wc/data` interfejs. `dependency-cruiser` u CI ovo obara.
3. Svi podaci dolaze iz `packages/data/src/mock/fixtures/`. Jedna firma, fiksni
   podaci, isti na svakom ekranu. Nema `faker`, nema `Math.random()` i nema `new Date()`
   bez `MOCK_TODAY` (§4), jer se onda snimci ekrana razlikuju između pokretanja,
   a demo stari sa svakim danom.
4. Motor (`packages/core`) je **stvaran, ne lažan**, i pravi se u **koraku 2 iz
   12, prije ekrana**. Mreža sati bez motora nema šta prikazati u panelu nalaza.
   Core nema I/O, pa isti kod radi i u pregledniku i na serveru.
5. Autentikacija je lažna: `mockSession()` vraća fiksnog korisnika i dozvoljava
   prebacivanje uloge, jer se bez toga ne mogu provjeriti skrivanje navigacije i
   stanje "zabranjeno". Ekrani za prijavu su forme koje samo navigiraju.

---

## 2. Dvije aplikacije, ne jedna

Ovo mijenja 09 §3 i 12 korak 3b, s razlogom.

**Marketing sajt mora biti živ sedmicama prije aplikacije**, jer hladan email
bez sajta na koji kupac slijeće nema smisla. Aplikacija ide na VPS tek poslije
kapije od 10 uplata. Jedan Next.js projekat ne može biti i statički izvezen na
Cloudflare Pages i pokrenut kao server na VPS-u bez dvije konfiguracije build-a,
a dvije konfiguracije jednog projekta su teže za održavanje od dva mala projekta
koji dijele iste pakete.

| Aplikacija | Šta nosi | Kako se gradi | Gdje živi |
|---|---|---|---|
| `apps/site` | landing, cijene, sigurnost, pravno | `output: 'export'`, bez server akcija | `weeklycert.com` i `www`, Cloudflare Pages |
| `apps/web` | sve ostalo: auth, aplikacija, admin, API | standardni Next.js server | `app.weeklycert.com`, VPS |

Dijele `packages/ui-tokens`, `packages/copy` i `packages/config`. Ne dijele
komponente, jer marketing komponente i aplikacijske komponente nemaju istu
publiku ni iste mjere.

### `apps/site`

```
apps/site/
  app/
    layout.tsx                      gornja navigacija, podnožje
    page.tsx                        /
    pricing/page.tsx
    security/page.tsx
    legal/[doc]/page.tsx            generateStaticParams: terms | privacy | dpa
                                    sve ostalo je 404
    globals.css
  components/                       Hero, ProofRow, HowItWorks, PriceTable,
                                    Faq, Cta, SiteNav, SiteFooter
  next.config.ts                    output: 'export'
```

Tri ruta u `legal/[doc]` se broje odvojeno (03 §2), pa `apps/site` daje **šest**
od 50 ekrana.

### `apps/web`

```
apps/web/
  app/
    layout.tsx                      html, fontovi, providers
    globals.css                     @import tailwindcss; @import "@wc/ui-tokens"
    (auth)/
      layout.tsx                    centrirana kartica, širina iz 14 §9
      login/page.tsx  register/page.tsx  forgot/page.tsx
      reset/[token]/page.tsx  verify/[token]/page.tsx
      magic/[token]/page.tsx  invite/[token]/page.tsx  2fa/page.tsx
    (user)/
      firms/page.tsx
      account/page.tsx  account/security/page.tsx
    app/
      page.tsx                      preusmjeravanje
      [t]/
        layout.tsx                  AppShell: bočna traka + traka stranice
        dashboard/page.tsx
        onboarding/page.tsx
        projects/page.tsx  projects/new/page.tsx
        projects/[id]/page.tsx
        projects/[id]/settings/page.tsx
        projects/[id]/classifications/page.tsx
        projects/[id]/weeks/[we]/page.tsx        MREŽA
        projects/[id]/weeks/[we]/review/page.tsx
        projects/[id]/weeks/[we]/sign/page.tsx
        projects/[id]/weeks/[we]/reports/page.tsx
        workers/page.tsx  workers/new/page.tsx  workers/[id]/page.tsx
        fringe-plans/page.tsx
        imports/page.tsx  imports/new/page.tsx  imports/[id]/page.tsx
        archive/page.tsx
        settings/company/page.tsx   pa team, signers, billing,
                                    notifications, audit, data
    admin/
      page.tsx  tenants/page.tsx  tenants/[id]/page.tsx
      jobs/page.tsx  wage-schedules/page.tsx  classifications/page.tsx
    api/
      health/route.ts               vraća {ok:true}, stvarno već sada
      metrics/route.ts              404 u mock fazi, fajl postoji s TODO
      webhooks/stripe/route.ts      410 u mock fazi, fajl postoji s TODO
      files/[id]/route.ts           servira fajl iz fixtures
      v1/periods/[id]/entries/route.ts    PATCH, mock, koristi ga autosave
      v1/periods/[id]/findings/route.ts   GET, mock, vraća core rezultat
      v1/reports/[id]/status/route.ts     GET, mock, lažni napredak
  features/
    grid/                           MREŽA SATI, najveći modul
      WeekGrid.tsx                  orkestrator, TanStack Table
      GridHeader.tsx                ljepljivo zaglavlje sa datumima
      GridRow.tsx                   red radnik + klasifikacija
      DayCell.tsx                   ćelija s dvije vrijednosti
      TotalsRow.tsx                 ljepljiv red zbira
      WeekToolbar.tsx               traka sedmice
      useGridKeyboard.ts            strelice, Enter, Tab, Ctrl+D
      useGridEngine.ts              poziva core pri svakoj promjeni
      useAutosave.ts                debounce 800 ms, indikator
      parseCell.ts                  "9" | "8/1" | "" -> {st, ot, manual}
      grid.css                      SVE mjere iz 14 §7
    findings/
      FindingsPanel.tsx             desni Sheet, uvijek otvoren na desktopu
      FindingItem.tsx               poruka, detalj, pravilo, popravka
      FindingsBadge.tsx             "3 blokira, 2 provjeri"
    onboarding/  projects/  workers/  fringe/  imports/  archive/
    reports/     billing/  team/     audit/    admin/
  components/
    ui/                             shadcn, generisano njihovim CLI-jem
    app-shell/
      AppShell.tsx  Sidebar.tsx  TenantSwitcher.tsx  PageBar.tsx
      SubscriptionBanner.tsx  CommandPalette.tsx  NotificationBell.tsx
      RoleSwitcher.tsx              samo u mock fazi, mijenja lažnu ulogu
    patterns/
      DataTable.tsx                 omotač oko TanStack Table za obične tabele
      StatusBadge.tsx  EmptyState.tsx  ErrorState.tsx  ForbiddenState.tsx
      LockedBanner.tsx  LoadingTable.tsx  Money.tsx  Hours.tsx  DateText.tsx
      ConfirmDialog.tsx  InlineHelp.tsx  CopyButton.tsx
  lib/
    session.ts                      mockSession(), mockRole()
    tenant.ts                       useTenant(), slug iz rute
    format.ts                       novac, sati, datumi, jedino mjesto
    nav.ts                          definicija bočne trake po ulozi (02 §5)
  test/
    e2e/                            Playwright
    setup.ts
```

`apps/web` daje preostalih 44 ekrana i svih 7 API ruta, pa je zbir s
`apps/site` tačno 57 ruta iz 03 §2.

**Pravila koja CI provjerava:**

- Ništa u `app/` ne sadrži logiku. Stranica uvozi iz `features/` i prosljeđuje
  podatke.
- `features/*` ne uvoze jedni druge osim kroz `components/patterns`.
- Jedini `*.css` fajlovi su `globals.css` u obje aplikacije i
  `features/grid/grid.css`.
- Nijedna hardkodirana heks boja nigdje osim u `packages/ui-tokens`.
- Nijedan `toFixed` van `lib/format.ts`.
- Nijedan tekst vidljiv korisniku nije napisan u komponenti. Sve iz
  `packages/copy`, čiji je sadržaj iz 15.

---

## 3. Ugovor podataka

Frontend nikad ne vidi tabele iz 04. Vidi DTO-e. Oni žive u
`packages/data/src/dto/*.ts`, **jedan fajl po DTO-u** (repozitorij je
`packages/data/src/repositories.ts`, mock implementacija i fixtures su
`packages/data/src/mock/`), i svaki nosi i svoju zod
šemu, jer istu šemu koristi i forma (react-hook-form) i budući server (09 §4).

```ts
// dto/common.ts
export type Uuid = string
export type IsoDate = string           // "2026-09-12"
export type Money = string             // decimalni string, NIKAD number
export type Hours = string             // "8.5", decimalni string

// Isti enum kao period_status u 04 §4. Ovo je stanje u bazi.
export type PeriodStatus =
  | 'open' | 'in_review' | 'generated' | 'signed' | 'submitted' | 'corrected'

export type SubmissionOutcome = 'pending' | 'accepted' | 'rejected'

// Ovo je ono što vidi značka na ekranu. Motor ga izvodi, ne čuva se.
// Mapiranje je na kraju 04 §7.1 i ne smije se izvoditi u komponenti.
export type DisplayStatus =
  | 'draft' | 'needs_attention' | 'validated'
  | 'signed' | 'submitted' | 'rejected' | 'corrected'
```

**Nalaz je tačno onaj oblik iz 07 §2 i ne prepisuje se ovdje drukčije:**

```ts
// dto/finding.ts  (oblik preuzet iz 07 §2, ne mijenjati)
export type Finding = {
  code: string                    // iz kataloga 07 §3, UPPER_SNAKE
  severity: 'hard' | 'soft' | 'info'
  message: string
  detail?: string
  suggestedFix?: string
  workerId?: string
  workDate?: IsoDate
  classificationId?: string
  field?: string
  rule?: string                   // "29 CFR 5.32", "Labor Law 220"
}
```

UI **nikad** ne sastavlja poruku nalaza. Dolazi iz `core/validate`. Dugme
"Popravi" postoji samo kad `suggestedFix` postoji i kad je popravka jednoznačna;
listu takvih kodova drži `core`, ne komponenta.

```ts
// dto/week-grid.ts
export interface GridDay { st: Hours; ot: Hours; manual: boolean; holiday: boolean }

export interface GridRow {
  id: string                           // `${workerId}:${classificationId}`
  workerId: Uuid
  workerName: string                   // "Prezime, Ime"
  classificationId: Uuid
  classificationName: string           // "Electrician – Inside Wireman"
  otCodes: string[]                    // ["A","W","R"], legenda u 01 §2.1
  isApprentice: boolean
  apprenticeLevel?: string
  baseRate: Money                      // iz platne tabele
  supplementRate: Money                // dodatak po satu iz platne tabele
  stRate: Money                        // stvarno plaćena redovna stopa
  otRate: Money                        // izračunata stopa prekovremenih
  days: [GridDay,GridDay,GridDay,GridDay,GridDay,GridDay,GridDay]
  totalHours: Hours; stHours: Hours; otHours: Hours
  grossProject: Money
  fringeStatus: 'plan' | 'cash' | 'mixed' | 'missing'
}

export interface WeekGridDTO {
  project: { id: Uuid; name: string; prcNumber: string; federallyFunded: boolean }
  weekEnding: IsoDate
  weekEndsOn: 0|1|2|3|4|5|6            // 0 nedjelja, 6 subota (04 tenants)
  isNoWork: boolean
  status: PeriodStatus
  displayStatus: DisplayStatus
  submissionOutcome?: SubmissionOutcome
  payrollNumber: number | null         // NULL dok nije potpisano (04 §periods)
  rows: GridRow[]
  totals: { byDay: Hours[]; st: Hours; ot: Hours; gross: Money }
  findings: Finding[]
  lockedReason?: 'signed' | 'submitted'
}
```

**Redoslijed sedam dana nije ponedjeljak do nedjelja.** Po 05 §4 prva kolona je
`weekEnding` minus 6 dana, zadnja je `weekEnding`. Za firmu kojoj sedmica
završava subotom to je nedjelja do subota. Dan kraja sedmice je podesiv po firmi
(`week_ending_dow` u 04), pa se redoslijed **uvijek izvodi**, nikad ne
hardkodira. Fiksni ponedjeljak bi u izvještaj uveo dan izvan perioda i izostavio
jedan dan unutar njega, i to bi prošlo neopaženo do prve kontrole.

Ista disciplina za `DashboardDTO`, `ProjectTimelineDTO`, `ReviewDTO`,
`WorkerDTO`, `ImportPreviewDTO`, `ArchiveRowDTO`, `AdminHealthDTO`.

**Novac i sati su stringovi, nikad `number`.** Jedan `0.1 + 0.2` u platnom
spisku je tužba. Konverzija ide isključivo kroz `decimal.js` u `core`.

### Repozitorij

```ts
// packages/data/src/repositories.ts
export interface Repositories {
  dashboard: { get(tenantId: Uuid): Promise<DashboardDTO> }
  projects:  { list(...): Promise<ProjectRowDTO[]>; timeline(...): Promise<ProjectTimelineDTO> }
  weeks:     {
    grid(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<WeekGridDTO | null>
    patchCell(tenantId: Uuid, periodId: Uuid, rowId: string, day: number, raw: string): Promise<GridRow>
    copyPreviousWeek(tenantId: Uuid, periodId: Uuid): Promise<WeekGridDTO>
    markNoWork(tenantId: Uuid, periodId: Uuid): Promise<void>
  }
  workers: {...}; fringe: {...}; imports: {...}; archive: {...}; admin: {...}
}
export function getRepositories(): Repositories   // bira mock ili drizzle
```

`mock/` implementira ovo nad fixtures u memoriji, s vještačkim kašnjenjem od 120
do 250 ms da se stanja učitavanja stvarno vide i testiraju.

**Svaka metoda koja prima ID prima i tenantId, i firma je dio pretrage. Tuđi ID
vraća isto što i nepostojeći.** To je oblik koji RLS nameće u koraku 4. Firma
dolazi iz sesije (straža), nikad iz ID-a u URL-u, a ruta koja dobije tuđi ID
odgovara 404, ne 403, jer 403 potvrđuje da taj ID postoji. Jedini izuzetak su
`users.get` i `tenants.listForUser`: korisnik nije red neke firme, nego sesija
sama. `packages/data/test/tenant-isolation.test.ts` provjerava pravilo nad
izvorom interfejsa i za svaku takvu metodu traži red firme A kao firma B; nova
metoda s ID-om bez `tenantId` ili bez probe obara test.

---

## 4. Demo podaci

Jedna firma, fiksna, u `packages/data/src/mock/fixtures/`. Ovo je scenografija za
svaki ekran, svaki snimak i svaki test.

> **Sve je izmišljeno.** Stope nisu prepisane iz stvarne platne tabele. Format
> PRC broja je **NEPROVJEREN** (13 A6), ovi brojevi samo liče na stvarne.
> Ništa odavde se ne smije upotrijebiti ni za jedan stvarni obračun ni za
> stvarnu predaju.

**Firma:** Hudson Electric LLC, slug `hudson-electric`, FEIN 47-0000000, sedmica
završava subotom (`weekEndsOn: 6`), sjedište Poughkeepsie NY. Isto ime i slug
koje već koristi referentni vizual `dizajn/aplikacija.html`.

**Korisnici** (identifikatori uloga su tačno oni iz 02 §2):

| Email | Uloga | Zašto postoji |
|---|---|---|
| `owner@` | `owner` | vidi naplatu i brisanje firme |
| `admin@` | `admin` | vidi sve osim naplate |
| `payroll@` | `payroll` | unosi sate, **ne potpisuje** |
| `signer@` | `signer` | uloga zbog koje ekran potpisa postoji; potpisati smiju i owner, admin i bookkeeper s `can_sign` (02 §3) |
| `viewer@` | `viewer` | ne vidi adrese ni odbitke, provjera `ForbiddenState` |
| `bookkeeper@` | `bookkeeper` | član i druge firme, ekran "Moje firme" |
| `super@` | super-admin (globalna zastavica, ne članstvo) | `/admin` |

`RoleSwitcher` u mock fazi mijenja aktivnu ulogu bez ponovne prijave, jer se
inače navigacija po ulogama (02 §5) ne može provjeriti.

**Druga firma** `riverside-mechanical` postoji samo zato da birač firmi i ekran
`/firms` imaju šta pokazati knjigovođi.

**Projekti:**

| Naziv | PRC | Naručilac | Federalni | Počeo | Status |
|---|---|---|---|---|---|
| Dutchess County Courthouse Lighting | 2010008390 | Dutchess County | ne | 2026-04-06 | active |
| Kingston WTP Electrical Upgrade | 2026001122 | City of Kingston | **da**, WD NY20260014 mod 3 | 2026-06-01 | active |
| Beacon HS Fire Alarm Replacement | 2025009911 | Beacon CSD | ne | 2025-09-15 | completed |

**Klasifikacije** (naziv uvijek `Zanat – Podvrsta`; razdvojnik je en crta U+2013
sa razmacima, jer tako stoji u zvaničnoj NYSDOL listi i po tome se uparuje,
vidi 12 korak 0 i nalaz `CLASSIFICATION_NOT_OFFICIAL` u 07):

| Klasifikacija | OT kodovi | Osnovna | Dodatak |
|---|---|---|---|
| Electrician – Inside Wireman | A, W, R | 63.20 | 52.40 |
| Electrician – Teledata Technician | B, E, I | 44.85 | 28.70 |
| Ironworker – Structural | B, E1, V | 57.40 | 49.60 |
| Laborer – Group 1 | B2, F | 42.10 | 31.80 |
| Operating Engineer – Class A | AA, E, K | 58.90 | 44.05 |

Kodovi **V** i **W** su namjerno u skupu: to su jedina dva slučaja u kojima
dodatak ulazi u premiju (01 §2.1), i to na dva različita načina, pa bez oba
nalaz `OT_NY_SUPPLEMENT_PREMIUM` nikad ne bi bio pokriven.

Imena, adrese i sitni detalji koji nisu nabrojani ovdje biraju se **jednom** pri
pisanju fixtures i od tada su `packages/data/src/mock/fixtures/` izvor istine za
njih. Ne prepisuju se u ovaj dokument; ovdje stoji samo ono što nosi pravilo
(broj radnika, stanja sedmica, OT kodovi, nalazi).

**Radnici:** 12 ukupno, isto koliko traži kriterij prihvatanja mreže u 03 §4.5.
Devet majstora, tri pripravnika (nivoi 2, 3 i 5, procenti 55, 65 i 85). Jedan
radnik ima **dvije klasifikacije u istoj sedmici** (Laborer i Operating
Engineer), da se testiraju drugi uvučeni red i ponderisani prosjek iz 01 §2.2.
Jedan radnik ima samo datum rođenja umjesto zadnje 4 SSN. Jedan radnik nema
adresu, što obara NY XML.

**Fiksni datum "danas": `2026-09-15`.** Mock sloj ga čita iz `MOCK_TODAY` i
nikad ne zove `new Date()` bez njega. Bez toga demo stari: za mjesec dana bi svaki
rok bio probijen, snimci ekrana se ne bi poklapali, a testovi koji broje "dana do
roka" bi padali svakog ponedjeljka.

**Sedmice: istorija se popunjava, ne preskače.** Po 03 §4.4 vremenska linija
projekta postoji od datuma početka bez rupa, a po 03 §3 sedmica bez unosa se
računa kao otvorena. Projekat koji je počeo u aprilu, a ima samo šest sedmica u
fixtures, prikazao bi sedamnaest otvorenih sedmica i demo bi izgledao kao firma u
teškom prekršaju. Zato svaki projekat ima **sve** svoje sedmice.

Istorijske sedmice nose **samo zbirne brojeve** (ukupno sati, broj radnika,
bruto, redni broj izvještaja, datum predaje), bez pojedinačnih unosa po radniku.
Pojedinačni unosi postoje samo u šest detaljnih sedmica na prvom projektu. Tako
arhiva i vremenska linija izgledaju stvarno, a fixtures ostaju mali.

**Projekat 1, Dutchess County Courthouse Lighting** (počeo 2026-04-06, sedmica
završava subotom, prva sedmica završava 2026-04-11):

| Sedmice | Broj | `status` | Redni broj | Napomena |
|---|---|---|---|---|
| 2026-04-11 do 2026-08-01 | 17 | `submitted`, outcome `accepted` | 1 do 17 | samo zbirni brojevi |
| 2026-08-08 | **2 reda** | v1 `corrected`, v2 `submitted`/`accepted` | oba 18 | ispravka: v2 nosi `corrects_period_id` na v1 i nasljeđuje redni broj (04) |
| 2026-08-15 | 1 | `submitted`, outcome `rejected` | 19 | tekst greške iz portala |
| 2026-08-22 | 1 | `submitted`, outcome `accepted` | 20 | skidanje fajlova iz arhive |
| 2026-08-29 | 1 | `signed` | 21 | zaključana mreža, "Create a correction" |
| 2026-09-05 | 1 | `in_review` | null | 3 hard i 3 soft nalaza |
| 2026-09-12 | 1 | `open` | null | zadana sedmica koju mreža otvara |

Ukupno 23 sedmice i **24 reda perioda** (08-08 ima dva, original i ispravku).
`next_payroll_number` je 22.

**Projekat 2, Kingston WTP Electrical Upgrade** (federalni, počeo 2026-06-01,
prva sedmica završava 2026-06-06):

| Sedmice | Broj | `status` | Redni broj |
|---|---|---|---|
| 2026-06-06 do 2026-08-22 | 12 | `submitted`, outcome `accepted` | 1 do 12 |
| 2026-08-29 | 1 | `submitted`, `isNoWork: true` | 13 |
| 2026-09-05 | 1 | `signed` | 14 |
| 2026-09-12 | 1 | `open` | null |

Ukupno 15 sedmica. Sedmica bez rada je tu da se vidi kartica koja objašnjava da
se takva sedmica ne predaje fajlom nego čekiranjem u portalu.

**Projekat 3, Beacon HS Fire Alarm Replacement** (završen, počeo 2025-09-15,
prva sedmica završava 2025-09-20, posljednja 2026-02-28): **24 sedmice**, sve
`submitted` s outcome `accepted`, redni brojevi 1 do 24, samo zbirni brojevi.
Postoji da arhiva ima šta pokazati i da se vidi projekat u stanju `completed`.

**Otvorenih sedmica ukupno: tri** (09-05 i 09-12 na prvom projektu, 09-12 na
drugom). Nijedna istorijska sedmica se ne broji, jer su sve `submitted`, a
08-08 se ne broji jer je `corrected`, dakle već ispravljena (03 §3). Brojač na stavci "This week" pokazuje `3`, a pošto firma ima dva aktivna
projekta, klik vodi na `/app/[t]/projects?open=1` (03 §3). To je i razlog zašto
fixtures imaju baš dva aktivna projekta: bez toga se to pravilo ne može provjeriti.

**Namjerni nalazi u sedmici 2026-09-05.** Kodovi i težine su doslovno iz
kataloga 07 §3 i ne izmišljaju se:

| Kod | Težina | Šta je u podacima |
|---|---|---|
| `WORKER_ADDRESS_MISSING` | hard | radnik bez adrese, NY XML je traži |
| `RATE_EXPIRED` | hard | klasifikacija bez važećeg reda poslije 1. jula |
| `DAY_OVER_24` | hard | zbir sati jednog radnika u jednom danu je 26 |
| `FRINGE_NOT_ANNUALIZED` | soft | plan bez anualizacije, a traži je |
| `APPRENTICE_PCT_MISMATCH` | soft | procenat ne odgovara nivou iz programa |
| `DAY_OVER_16` | soft | okida se sam, uz `DAY_OVER_24`, na istih 26 sati |

Zato je brojač u panelu za tu sedmicu **3 blokira, 3 provjeri**, ne 3 i 2.

Dva hard nalaza imaju jednoznačnu popravku i zato dugme "Popravi": `DAY_OVER_24`
i `RATE_EXPIRED`. `WORKER_ADDRESS_MISSING` nema, jer adresu sistem ne zna.

---

## 5. Katalog komponenti

Svaka ima sedam stanja iz 14 §9. Ovdje su potpisi, ne izgled.

### Okvir

```ts
AppShell({ children, tenant, user, nav, subscription })
Sidebar({ items: NavItem[], activeHref, collapsed })
TenantSwitcher({ tenants: TenantBrief[], activeId })
PageBar({ title, breadcrumb, actions?, search?, notifications? })
SubscriptionBanner({ state: 'trial'|'paused'|'past_due', daysLeft?, onAction })
RoleSwitcher({ role, onChange })                 // samo mock faza
```

### Obrasci

```ts
DataTable<T>({ columns, data, rowHeight?: 40|44, empty, loading, onRowClick? })
StatusBadge({ status: DisplayStatus })         // ikona + riječ, nikad sama boja
EmptyState({ icon, title, body, action })
ErrorState({ title, body, requestId, onRetry })
ForbiddenState({ role, needed })
LockedBanner({ reason: 'signed'|'submitted', signedAt, onCreateCorrection })
Money({ value: Money, align?: 'right' })       // tabular-nums, uvijek desno
Hours({ value: Hours })
ConfirmDialog({ title, body, confirmLabel, danger?, requireText?, onConfirm })
```

`Money` i `Hours` postoje zato da nijedna komponenta nikad ne zove `toFixed`
sama.

### Mreža

```ts
WeekGrid({ data: WeekGridDTO, readOnly, onCellChange, onFindingFocus })
DayCell({ value: GridDay, rowId, day, state: 'idle'|'editing'|'committing'|'error',
          finding?: Finding, onCommit(raw: string) })
FindingsPanel({ findings: Finding[], onFocus, onFix, open, onOpenChange })
```

Mreža je jedini dio s vlastitim CSS fajlom (`features/grid/grid.css`), jer 14 §7
propisuje mjere koje Tailwind klase ne pogađaju pouzdano. Taj fajl nosi **sve**
iz 14 §7, ne samo ćeliju: ljepljivo zaglavlje (40 px, `z-index: 3`), ljepljiv red
zbira (44 px), ljepljivu kolonu radnika (220 px, `z-index: 2`, ugaona ćelija
`z-index: 4`), kolone zbira (80 px), liniju reda, i izričito **bez zebra pruga**.

---

## 6. Mreža sati, implementacioni ugovor

Ovo je ekran zbog kojeg proizvod postoji ili ne postoji.

**Model stanja ćelije:** `idle -> editing -> committing -> idle | error`.
Commit se okida na blur, Enter i Tab. Escape vraća staru vrijednost i ide u
`idle`.

**Konflikt.** Pravilo je iz 03 §4.5: zadnji koji piše pobjeđuje, uz upozorenje.
Kad stigne tuđa izmjena, prikaz se osvježava i pojavi se traka s porukom iz
15 §3 ("{Name} changed this week..."). Jedini izuzetak je ćelija koja je u tom
trenutku u stanju `editing`: ona se ne osvježava dok korisnik kuca, jer bi mu
broj nestao ispod prstiju. Čim je potvrdi ili otkaže, i ona se uskladi.

**Parsiranje** (`parseCell.ts`), tačno ovo i ništa više:

| Unos | Rezultat |
|---|---|
| `""` | `{st:"0", ot:"0", manual:false}` |
| `9` | ukupno 9, motor dijeli po OT kodovima |
| `9.5` ili `9,5` | isto, zarez se prihvata |
| `8/1` | `{st:"8", ot:"1", manual:true}` |
| `9:30` | 9,5 sati |
| bilo šta drugo | ćelija ostaje, `aria-invalid`, poruka iz 15 §3 |

Maksimum po ćeliji je 24. Zbir svih redova jednog radnika u jednom danu preko 24
je nalaz `DAY_OVER_24`, ne blokada unosa: korisnik mora moći vidjeti grešku koju
je napravio.

**Tastatura** je tabela iz 14 §7, doslovno. Enter ide **dolje**, Tab **desno**.
Ovo se često obrne, i onda unos po radniku niz kolonu dana postane dvostruko
sporiji.

**`scroll-padding-block` je obavezan.** `.grid-scroll{ scroll-padding-block-start:40px;
scroll-padding-block-end:44px; }` iz 14 §7. Bez toga `element.focus()` pri
kretanju strelicama odskrola fokusiranu ćeliju ispod ljepljivog zaglavlja i pada
WCAG 2.4.11. **`axe-core` ovo ne hvata**, pa je to zasebna stavka u definiciji
gotovog (§10, stavka 5) i provjerava se ručno, strelicom nadolje kroz cijelu
mrežu.

**Lijepljenje iz Excela:** `paste` na fokusiranoj ćeliji čita `text/plain`,
razdvaja po `\t` i `\n`, puni pravougaonik od te ćelije nadesno i nadolje, staje
na kraju mreže, i pravi **jedan** commit, ne po ćeliji.

**Motor u pregledniku:** `useGridEngine` poziva `computeWeek()` iz `core` na
svakoj promjeni, sinhrono, jer je to čist proračun. Panel nalaza se mora
osvježiti ispod 300 ms (03 §4.5) na najgorem slučaju iz fixtures: 12 radnika, od
kojih jedan ima dvije klasifikacije, dakle 13 redova puta 7 kolona. Ako neka
firma dovede mrežu preko 200 redova, tek tada dolazi `@tanstack/react-virtual`
(09 §2) i tek tada se mjeri; preventivno se ne uvodi, jer virtualizacija lomi
lijepljenje i kretanje strelicama.

**Automatsko snimanje:** `useAutosave` debounce 800 ms, poziva
`PATCH /api/v1/periods/[id]/entries`. Tri stanja indikatora su iz 15 i ne
izmišljaju se. Nikad tiho ne pada.

**Panel nalaza po širini.** Na **1600 px i šire** je stalna kolona od 352 px uz
mrežu, kako 03 §4.5 traži ("uvijek otvoren"). **Ispod 1600 px** je prekrivač koji
se otvara klikom na brojač nalaza i zatvara se Escapeom, s istim ponašanjem
modala kao panel navigacije (14 §6).

Prag nije okrugao broj nego rezultat računa. Mreža u režimu unosa je
220 (radnik) + 7 × 64 (dani) + 3 × 80 (Ukupno, ST, OT) = **908 px**. Uz bočnu
traku 240 i padding 48, stalni panel od 352 px traži 1548 px prozora. 1600 je
prva vrijednost iznad toga s malo zraka.

Na 1366 px bez ovoga mreži ostane 726 px, što nije dovoljno ni za sedam dana i
zbir. S prekrivačem dobija 1078 px, pa 908 stane s viškom.

Panel se **ne smanjuje** ispod 352 px. Nalaz mora stati u tri reda s brojkama i
dugmetom; uži panel prelama brojeve i gubi smisao.

**Ispod 900 px** mreža prelazi u prikaz po radniku (14 §6). Unos na mobilnom
nije podržan, samo pregled.

**Provjera širine je dio definicije gotovog.** E2E mjeri ukupnu širinu mreže na
1366 px sa zatvorenim panelom i pada ako pređe raspoloživu širinu. Mjera kolone
dana od 64 px se provjerava zasebno, jer se najlakše tiho razvuče
podvrijednošću `OT 0.0`.

---

## 7. Stanja, obavezno na svakom ekranu

Ekran nije gotov dok nema svih pet, i svako se mora moći prikazati iz URL-a radi
testa: `?state=loading|empty|error|forbidden|locked`.

| Stanje | Šta se vidi |
|---|---|
| Učitavanje | `Skeleton` u obliku sadržaja, nikad vrteška duže od 400 ms bez teksta |
| Prazno | `EmptyState`, jedna rečenica i jedno dugme |
| Greška | `ErrorState` s dugmetom i ID-om zahtjeva |
| Zabranjeno | `ForbiddenState` koja kaže koja uloga treba, bez curenja podataka |
| Zaključano | `LockedBanner`, sadržaj se čita, nudi se ispravka |

Peto stanje (zaključano) dolazi iz 03 §4.5, 04 §7.1 i `locked_at` u 04. 03 §5 i
12 korak 3 su usklađeni na pet 15.9.2026; ne treba ih ponovo mijenjati.

**Šesto stanje, konflikt, postoji samo u mreži sati** i opisano je u §6, jer
nijedan drugi ekran ne trpi istovremeno uređivanje.

---

## 8. Marketing sajt

`dizajn/sajt.html` je izvor izgleda, 16 je izvor strukture i teksta.

**Prije nego se objavi, ovo mora izaći:**

1. Svi isprekidani okviri s bosanskim napomenama u `dizajn/sajt.html`.
2. Izmišljeni telefon i adresa u `dizajn/sajt.html`. Isti problem u 15 je već
   ispravljen 15.9.2026 (poruka o grešci 500 i potpis u podsjetniku na rok sada
   nose `support@weeklycert.com`), i 15 §3 sada nosi pravilo: nijedan telefonski
   broj u tekstu dok ne postoji stvaran broj koji neko javlja. 16 §4 redovi 1, 13
   i 15 su usklađeni s istim pravilom. Ostaje samo prototip sajta.
3. Sve što tvrdi broj kupaca, recenzije ili logotipe.
4. **Slike ekrana proizvoda dok proizvod ne postoji.** 03 §4.1 to zabranjuje.
   16 §4 redovi 2 i 6 su već usklađeni: dok nema proizvoda, umjesto snimka ide
   statična ilustracija mreže; snimci ulaze tek kad mreža radi.

**Tehnički:** sve stranice statične, bez JS-a za čitanje sadržaja. **LCP ispod
1,5 s na 3G**, kako traže 16 §8 i 12 korak 3b. Fontovi se hostuju lokalno, nikad
s Google CDN-a, ali na dva različita načina i to nije nedosljednost:

| Gdje | Kako | Zašto |
|---|---|---|
| `apps/site` | `next/font/local` | automatski `preload`, `font-display` i stabilan `size-adjust`. Marketing stranica ima cilj LCP 1,5 s na 3G i tu svaka desetinka vrijedi |
| `apps/web` | `@font-face` u `packages/ui-tokens` | aplikacija je iza prijave, LCP nije prodajni cilj, a token ostaje doslovan kao u 14 §4 |

Ako se ide na `@font-face`, obavezno je `font-display: swap` i ručni
`<link rel="preload">` za dvije debljine koje se vide bez skrolanja (400 i 600
Sans). Bez toga se dobije prazan tekst na sporoj vezi. Interaktivni demo iz 16 §4 dolazi tek kad mreža sati radi, i to
kao ugrađena mreža na mock podacima, ne video.

---

## 9. Gdje se objavljuje

Ovo mijenja 09 §2 i §7 i 10 §5, §6 i §8. Provjereno 15.9.2026, izvori su u
SOURCES.md.

**Vercel Hobby ne smije nositi ovaj proizvod.** Pravila poštene upotrebe su
izričita: "Hobby teams are restricted to non-commercial personal use only", a
komercijalnom upotrebom se smatra i samo oglašavanje prodaje proizvoda ili
usluge. Marketing sajt koji prodaje pretplatu je po toj definiciji komercijalan.
Vercel Pro je 20 $ mjesečno, uključuje 20 $ kredita i jedno mjesto.

**Vercel ne može nositi ni radnika.** Nema procesa koji stalno radi. Najduže
trajanje funkcije je 300 s na Hobbyju i 800 s na Prou, a 1800 s je i dalje beta.
Vercel Queues postoji ali je u beti. `pg-boss` na tome ne radi.

| Šta | Gdje | Cijena | Zašto |
|---|---|---|---|
| Interni pregled cijelog frontenda dok se gradi | Vercel Hobby, privatan projekat, bez vlastite domene, regija `iad1` | 0 $ | nije objavljeno, ne prodaje ništa; Mume otvara s telefona i odobrava dizajn |
| `apps/site`, javno | Cloudflare Pages | 0 $ | neograničen protok, 500 build-ova mjesečno, DNS je već tamo, nema klauzule o nekomercijalnoj upotrebi |
| `apps/web`, produkcija | VPS po 10 | po 10 | treba `pg-boss` radnik, Postgres s RLS-om i S3 |

**Odnos prema `staging` iz 10 §6:** Vercel preview je samo za **izgled**, na mock
podacima, i živi do kapije od 10 uplata. `staging.weeklycert.com` na VPS-u je za
**ponašanje**, s bazom i radnikom, i nastaje tek u koraku 8. Ne postoje
istovremeno kao dva ista okruženja.

Ako se ikad poželi Vercel i za produkciju, to znači Pro (20 $), plaćeni Postgres
i prepisivanje radnika na Queues kad izađe iz bete. Nije zabranjeno, ali je
skuplje i mijenja arhitekturu, pa se ne radi usput.

---

## 10. Redoslijed sesija za Claude Code

Redoslijed ekrana je iz 03 §5 i ne mijenja se. Sesije se numerišu ovako, da se
zna šta s čim ide:

| Sesija | Odgovara | Sadržaj |
|---|---|---|
| A | 12 korak 1 + 03 §5 stavka 1 | `packages/ui-tokens` (14 §3), `packages/copy` (15), `packages/config`, `dto/*`, `repositories.ts`, mock fixtures iz §4, shadcn init, `AppShell`, `Sidebar`, `TenantSwitcher`, `PageBar`, `RoleSwitcher`, svi obrasci iz §5, `api/health` |
| B | 12 korak 2 | **Motor.** `packages/core`: obračun, validacija, 15 golden testova, svih 63 koda iz 07 §3. Nijedan ekran. |
| C, D | 03 §5 stavka 2 | Mreža sati i panel nalaza |
| **Z** | 12 korak 3b + 03 §5 stavka 13 | `apps/site`, javne stranice |
| E nadalje | 03 §5 stavke 3 do 12 | jedan ekran po sesiji, veliki ekrani po dva |

**Sajt se pomjerio naprijed, odmah iza mreže.** 03 §5 ga stavlja posljednjeg, po
logici "prvo proizvod, pa izlog". Dva razloga to mijenjaju:

1. Zagrijavanje domene je već počelo i hladan email kreće za sedmicu do dvije.
   Poruka koja vodi na domenu bez sajta je bačena poruka; kupac prvo proguglja,
   pa tek onda odgovori. Sajt je preduslov za prodaju, a prodaja je kapija za
   ostatak izrade.
2. Tek poslije sesije D postoji stvarna mreža sati, pa hero iz 16 §4 može nositi
   **pravi snimak ekrana** umjesto ilustracije. Dan ranije to ne bi bilo moguće,
   dan kasnije nema razloga čekati.

Sesija A završava kad `/app/hudson-electric/dashboard` prikaže prazan okvir s
ispravnom bočnom trakom, biračem firme i prebacivanjem uloga. Sesija B završava
kad golden testovi prođu, i **tek tada** počinje mreža, jer mreža bez motora
nema šta pokazati u panelu.

**Definicija gotovog** za svaki ekran, sve mora biti ispunjeno:

1. Radi na mock podacima, bez ijedne greške u konzoli.
2. Ima svih pet stanja iz §7 i sva su dostupna preko `?state=`. **Ovo važi samo
   za ekrane u `apps/web`.** Statične stranice u `apps/site` nemaju učitavanje,
   zabranjeno ni zaključano, i ne izmišljaju ih se da bi lista izgledala potpuna.
3. Prolazi se samo tastaturom, fokus je uvijek vidljiv.
4. `axe-core` bez ijednog prekršaja ozbiljnosti serious ili critical.
5. **Ručna provjera koju axe ne hvata:** fokus nikad ne završi ispod ljepljivog
   zaglavlja (14 §7, WCAG 2.4.11). Na mreži se provjerava strelicom nadolje kroz
   sve redove.
6. Nijedan tekst nije hardkodiran, sve iz `packages/copy`.
7. Jedan Playwright test za glavnu akciju s ekrana.
8. Snimak ekrana u `docs/screens/<ruta>.png`.
9. Kriterij prihvatanja iz 03 za taj ekran je ispunjen doslovno, uključujući
   brojke (za mrežu: 12 radnika puta 5 dana ispod 4 minute samo tastaturom).
   **Svaka brojka iz 03 se mjeri testom, ne procjenjuje.** Brojka koja danas
   prolazi sama od sebe sutra je jedini alarm koji imaš: motor raste, validacija
   raste, a granica ostaje ista. To izričito uključuje osvježavanje panela
   nalaza ispod 300 ms poslije unosa (03 §4.5).

**Kako se sesija otvara** (dopunjava oblik iz 12 §"Kako Mume vodi Claude Code"):

> Pročitaj `CLAUDE.md`, pa `spec/19` §2, §3, §5 i §7, pa `spec/03` §4.5 i
> `spec/14` §7. Radi sesiju C: ekran `/app/[t]/projects/[id]/weeks/[we]`.
> Ne diraj nijedan drugi ekran. Kad završiš, prođi definiciju gotovog iz
> `spec/19` §10 stavku po stavku i napiši šta je ispunjeno.

---

## 11. Šta se u ovoj fazi NE radi

- Nema baze, migracija, Drizzlea, Better Autha, Stripea, S3, emaila. Rute
  `api/webhooks/stripe` i `api/metrics` postoje kao fajlovi s TODO-om i vraćaju
  410 odnosno 404, da lista ruta iz 03 §2 bude potpuna.
- Nema stvarnog generisanja PDF-a i XML-a. Na ekranu pregleda stoji **statičan
  primjer** iz `fixtures/`, jasno označen kao primjer. Stvarni izlazi su korak 5
  i čekaju zvaničnu shemu iz koraka 0.
- Nema tamne teme. Jedna tema, svijetla.
- Nema internacionalizacije. Engleski, jedan jezik. `packages/copy` je ipak
  strukturiran po ključevima da se kasnije može dodati španski.
- Nema animacija osim prelaza od 120 ms na hover i otvaranju panela.
