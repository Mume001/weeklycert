# 15. Tekstovi u sučelju i transakcioni emailovi

Ovaj fajl postoji iz jednog razloga: da Claude Code **ne izmišlja tekst**. Svaki
string koji korisnik vidi dolazi odavde ili iz kataloga nalaza u 07. Ako string
nedostaje, prvo se doda ovdje, pa onda u kod.

Jezik sučelja je engleski. Ovaj fajl je na bosanskom samo u objašnjenjima; sami
tekstovi su na engleskom i kopiraju se doslovno.

---

## 1. Pravila pisanja (glas proizvoda)

1. **Rečenice, ne etikete.** "You have 11 days of grace left" umjesto "Grace: 11".
2. **Nikad "Oops", "Uh oh", "Something went wrong".** Kancelarijska osoba pod
   rokom ne treba veselost. Kaže se šta se desilo i šta sad.
3. **Brojevi i imena u poruci.** "David Chen has 9 straight-time hours on Tue Sep
   8" umjesto "Overtime error found".
4. **Nikad ne kriviti korisnika.** Ne "You entered an invalid value", nego "This
   day has 26 hours. A day has 24."
5. **Svaka blokirajuća poruka nosi izlaz.** Šta uraditi, kao dugme ili kao rečenica.
6. **Bez uzvičnika. Bez emodžija. Bez velikih slova za naglasak.**
7. **Bez dugih crta** (em i en dash) u tekstu koji mi pišemo. Izuzetak su zvanični
   nazivi klasifikacija koji dolaze iz NY liste.
8. **Novac uvijek s dvije decimale i simbolom**: `$55.40`. Sati s jednom: `8.0`.
   Datumi u sučelju: `Sep 12, 2026`. Datumi u fajlovima i mono tekstu: `2026-09-12`.
9. Dugmad su **glagol plus objekat**: "Enter hours", "Sign and lock this week",
   "Record submission". Nikad samo "Submit" ili "OK".
10. Prazna stanja objašnjavaju **zašto je prazno** i nude jednu radnju.
11. **Svaki string s brojem ima dva oblika**, jedninu i množinu, i to su dva
    ključa u `packages/copy`: `..._one` i `..._other`. Nikad "1 active projects"
    i nikad zaobilaženje kroz "1 project(s)". Ovo vrijedi i za nula: engleski
    koristi množinu za nulu (`0 projects`).
12. **Nijedna vrijednost se ne upisuje u string.** Ni dan u sedmici
    (`{WeekEndDay}`, jer ga firma bira), ni vrijeme (`{time}`), ni datum, ni ime.
    Ako u stringu stoji konkretna vrijednost, to je greška, ne primjer.

## 2. Rječnik u sučelju (zamrznut, ne mijenjati)

| Kaže se | Ne kaže se |
|---|---|
| worker | employee (osim u XML polju, gdje je zvanično) |
| week ending | period end, pay period |
| classification | trade, job title |
| wage schedule | rate sheet |
| supplement | NY dodatak, kad se govori o NY |
| fringe | federalni fringe |
| certify / sign | approve, submit (potpis nije predaja) |
| submit / file | send |
| finding | error (kolektivno; pojedinačno je error ili warning) |
| straight time / overtime | regular / extra |
| certifying official | signer (u kodu je `signer`, u tekstu je certifying official) |
| general contractor | prime, GC (u tekstu piše puno) |

## 3. Osnovni tekstovi po ekranu

### Navigacija
`Dashboard` · `This week` · `Projects` · `Workers` · `Fringe plans` · `Import` ·
`Archive` · `Setup` · `Settings` · `Help and support`

Naslov grupe iznad zadnje tri stavke: `Company`.

### Okvir aplikacije

Ovo je dio okvira koji se vidi na svakom ekranu (19 §5), pa se tekst ne izmišlja
po komponenti.

**Birač firme** (vrh bočne trake)
- Naslov padajućeg menija: `Your companies`
- Ispod imena firme: `{Role} · {n} active project` / `{Role} · {n} active projects`
- Zadnja stavka: `See all companies`
- Kad korisnik ima samo jednu firmu, **ime firme se i dalje vidi** na istom
  mjestu, ali nije padajući meni i nema chevron. Korisnik mora u svakom trenutku
  znati čije podatke gleda; to je prvo pitanje pri kontroli.

**Otvaranje trake uže od 1024 px** (14 §6)
- Dugme: `Menu` (isti tekst je i `aria-label`)
- Zatvaranje: `Close`

**Korisnik** (dno bočne trake)
- `Account` · `Security` · `Sign out`

**Traka stranice**
- Pretraga, prazno polje: `Search projects, workers, weeks`
- Pretraga, kratica: `Ctrl K`
- Pretraga, bez rezultata: `Nothing matches that. Try a project name, a PRC number, or a worker's last name.`
- Zvono, prazno: `Nothing needs you right now.`
- Zvono, naslov: `Notifications` · zadnja stavka `Mark all as read`

**Traka stanja pretplate**
- Probni period: `Trial, {n} day left.` / `Trial, {n} days left.` dugme `Add a payment method`
- Pauzirano: `Subscription paused. You can read everything, but new reports cannot be generated.` dugme `Resume subscription`
- Neuspjela naplata: `The last payment did not go through. Reports keep working for {n} more day.` / `The last payment did not go through. Reports keep working for {n} more days.` dugme `Update card`

**Značka statusa** (redoslijed i riječi su fiksni, mapiranje je u 04 §7.1)
`Draft` · `Needs attention` · `Validated` · `Signed` · `Submitted` ·
`Rejected` · `Corrected`

**Uloge** (identifikatori su u 02 §2, ovo su riječi koje korisnik vidi)

| U kodu | Na ekranu |
|---|---|
| `owner` | `Owner` |
| `admin` | `Administrator` |
| `payroll` | `Payroll` |
| `signer` | `Signer` |
| `viewer` | `Viewer` |
| `bookkeeper` | `Bookkeeper` |

Opisi uz uloge, gdje se biraju (`/settings/team`, pozivnica):
- `Owner` : `Everything, including billing and deleting the company.`
- `Administrator` : `Everything except billing and deleting the company.`
- `Payroll` : `Enters hours and prepares reports. Cannot sign.`
- `Signer` : `Everything Payroll can do, plus signing the certification.`
- `Viewer` : `Reads projects, reports and the archive. No addresses, no deductions.`
- `Bookkeeper` : `An outside person who works for more than one company.`

**Prebacivanje uloge** (samo u mock fazi, 19 §4)
- `Viewing as` pa ime uloge. Iznad liste: `Demo only. This picker disappears once sign-in is real.`

**Zabranjeno** (`ForbiddenState`)
- Naslov: `You do not have access to this page.`
- Tekst: `This page needs the {Needed} role. You are signed in as {Current}.`
- Dugme: `Ask {Owner name} for access` (mailto), sekundarno `Back to dashboard`

**Zaključano** (`LockedBanner`)
- Potpisano: `This week was signed on {date} by {Name} and cannot be changed.`
- Predato: `This week was submitted on {date} and cannot be changed.`
- Dugme: `Create a correction`

**Dugmad koja se ponavljaju**
`Save` · `Cancel` · `Delete` · `Back` · `Continue` · `Done` · `Try again` ·
`Download` · `Copy` · `Copied` · `Close`

**Potvrde** (`ConfirmDialog`)
- Naslov je pitanje: `Delete this project?`
- Tekst kaže posljedicu, ne ponavlja naslov.
- Dugmad: opasna radnja nosi svoje ime (`Delete project`), druga je uvijek `Cancel`.
- Kad se traži upisivanje imena: `Type {Company name} to confirm.`

**Lista projekata filtrirana na otvorene sedmice** (`?open=1`, vidi 03 §3)
- Naslov: `Weeks waiting for hours`
- Podnaslov: `Oldest first. New York counts the deadline from the oldest week you have not filed.`
- Kolona: `Oldest open week`
- Kad je lista prazna: `Every week is filed. Nothing is waiting.`

**Prazna stanja, opšti oblik**
Naslov je imenica, ne rečenica (`No workers yet`). Tekst je jedna rečenica koja
kaže šta je to. Dugme je glagol (`Add a worker`).

### Prijava i registracija
- Naslov: `Sign in to WeeklyCert`
- Dugmad: `Sign in` · `Email me a sign-in link` · `Use a passkey`
- Neuspjela prijava: `That email and password do not match. Check both, or use a sign-in link instead.`
- Previše pokušaja: `Too many attempts. Try again at {time}, or reset your password.`
- Magic link: `Click the button below to sign in. The link works once and expires in 15 minutes.`
- Pozivnica: `{Inviter} invited you to {Company} as {Role}. Accepting adds this company to your account.`
- 2FA obavezna: `Your role can sign certifications, so two-factor authentication is required. It takes two minutes to set up.`

### Kontrolna tabla
- Naslov: `{Weekday}, {Month} {D}` · pod njim `week ending {WeekEndDay} {Month} {D}`
- Kartice: `project past the 30-day deadline` · `weeks waiting for hours` ·
  `report waiting for signature` · `filings accepted this year`
- Sekcija rokova: `State filing deadlines` / podnaslov
  `NYSDOL requires a submission at least every 30 days per project`
- Statusi: `{n} day left` / `{n} days left` · `{n} day late` / `{n} days late` · `due today`
- Prazno: `No projects yet. A project is one public job with its own PRC number.`
  Dugme `Add your first project`.

### Mreža sati
- Naslov: `Hours` · meta `{WeekEndDay} {date} · payroll no. will be #{n} on signature`
- Dugmad: `Copy last week` · `Import CSV` · `Mark no-work week` ·
  `Review and generate`
- Onemogućeno dugme, tooltip: `{n} error must be fixed before you can generate the report.` /
  `{n} errors must be fixed before you can generate the report.`
- Snimanje: `Saved {HH:MM}` · `Saving...` · `Not saved. Check your connection.`
- Prazna sedmica: `No hours yet for this week. Copy last week to bring the same crew over, or import a file.`
- Zaključana sedmica: `This week was signed on {date} and cannot be changed. Create a correction to file a new version.`
- Konflikt: `{Name} changed this week {n} minute ago. Your view has been refreshed.` /
  `{Name} changed this week {n} minutes ago. Your view has been refreshed.`
- Panel, brojači (tri odvojena stringa, jer svaki broji svoje; spaja ih zarez u
  prikazu, ne rečenica): `{n} error` / `{n} errors` · `{n} warning` / `{n} warnings` ·
  `{n} note` / `{n} notes`
- Panel, napomena: `Errors block generating the report.`
- Neispravan unos u ćeliju: `Enter hours, for example 8, 8.5 or 8/1.`
- Bez nalaza: `Everything checks out. You can generate the report.`

**Mreža, kolone i ćelija** (redoslijed kolona je iz 03 §4.5, mjere iz 14 §7)
- Kolone: `Worker` · sedam dana · `Total` · `ST` · `OT` · `ST rate` ·
  `OT rate` · `Supplement` · `Gross`
- **Klasifikacija i J/RA nisu zasebne kolone** (03 §4.5). Ćelija radnika nosi
  ime, klasifikaciju ispod njega i značku `J` ili `RA` desno. Značka je kratica,
  pa nosi puni naziv u `title` atributu: `J/RA`.
- Prekidač za izvedene kolone kad mreža nije dovoljno široka: `Show rates and gross`
- Zaglavlje kolone dana nosi kratki dan i broj u mjesecu: `{WeekEndDay} {D}`
- Prva ćelija reda zbira: `Week total`
- Radnik koji cijele sedmice nema sat: `No hours this week`
- Ime ćelije za čitač ekrana: `Hours for {Name} on {date}`
- Podvrijednost u ćeliji: `OT`, puni naziv u `abbr`: `Overtime`
- Status dodatka po redu: `Plan` · `Cash` · `Plan and cash` · `Not set`
- Uz nalaz u panelu: `Apply this fix` · `I understand, this is intentional`
- Naslov panela je brojač iznad, a grupe nose iste te brojače. Ispod 1600 px
  panel je prekrivač koji otvara dugme s tim istim brojačem, a zatvara ga
  `Close` (19 §6). Dugme ne nosi svoj tekst: brojač je i naziv i sadržaj.

### Pregled i potpis
- Naslov: `Review and certify`
- Uspjeh: `No errors. {n} warning was confirmed by you on {date}.` /
  `No errors. {n} warnings were confirmed by you on {date}.`
- XML kartica: `NY XML for the portal` · značka `schema valid`
- Ručni unos: `What you type into the portal by hand` / `the file does not carry these`
- Portal bez API-ja: `The portal has no API. You upload the file yourself and we record the confirmation. A week can only be uploaded once, into an empty week.`
- Potpis: `Sign and lock this week`
- Ponovna prijava: `Re-enter your password or two-factor code` /
  `Required even though you are signed in.`
- Upozorenje o potpisu: `Signature is recorded electronically. Scanned signatures are not accepted by the Department of Labor.`
- Poslije potpisa: `Signed by {Name} on {date} at {time} ET. This week is locked.`

### Predaja
- Naslov: `Submit`
- Koraci: `Open mpwr-public.labor.ny.gov and sign in.` /
  `Pick project PRC {prc}, then week ending {date}. The week must be empty; if you already started it by hand, delete those entries first.` /
  `Choose Upload XML and pick the file below.` / `Copy the confirmation number back here.`
- Odbijanje: `Portal rejected the file?` /
  `Paste the error exactly as the portal shows it. It reports a line and character position; we translate that into the worker and the field.`
- Sedmica bez rada: `A week with no work cannot be filed as a file.` /
  `The portal has no XML for it. Tick No Work Week in the portal, or use Enter Work Pause Dates for a range.`

### Radnici
- Bez punog SSN: `We never store a full Social Security number. The portal accepts the last four digits or a date of birth.`
- Šifrovano: `Home address, phone (encrypted, every read is logged)`
- Duljine: `Address line 1 is limited to 42 characters and city to 40, because the NY portal rejects anything longer.`

### Uvoz
- Koraci: `File` · `Mapping` · `Check` · `Reconcile and apply`
- Brojači: `{n} row in the file` / `{n} rows in the file` · `{n} ready` ·
  `{n} warning` / `{n} warnings` · `{n} error, this blocks` / `{n} errors, these block`
  (`{n} ready` nema imenicu koja se mijenja, pa nema dva oblika)
- Puni SSN u fajlu: `This file has a column that looks like full Social Security numbers. We do not store those. We can keep the last four digits and delete the original file after import, or you can remove the column and upload again.`
- Primjena, naslov: `Import finished` · pod njim `Week ending {date}`
- Primjena, tri reda ispod naslova, svaki sa svojom jedninom i množinom:
  `{n} row imported` / `{n} rows imported` ·
  `{n} worker` / `{n} workers` ·
  `{n} row skipped` / `{n} rows skipped`

  Jedna rečenica s tri brojača ne može imati ispravnu jedninu i množinu ni na
  jednom jeziku. Tri kratka reda su i čitljivija: oko skenira brojeve, ne
  rečenicu.

### Naplata
- Trial: `{n} day left in your trial. Your card is on file and will be charged $79 on {date}.` /
  `{n} days left in your trial. Your card is on file and will be charged $79 on {date}.`
- Neuspjela naplata: `We could not charge your card on {date}. Nothing is blocked yet. Update the card in the next 14 days to keep filing.`
- Pauza: `Paused. You can read and export everything. Entering hours and generating reports resume when you unpause.`
- Otkaz: `Cancelled. You have read-only access and full export until {date}, 30 days from now. New York requires you to keep these records for six years, so export before then.`

### Prazna stanja, sva
| Ekran | Tekst | Dugme |
|---|---|---|
| Projects | `No projects yet. A project is one public job with its own PRC number.` | `Add your first project` |
| Workers | `No workers yet. Add them one by one, or import a list.` | `Import workers` |
| Archive | `Nothing filed yet. Signed reports show up here and stay for six years.` | |
| Import history | `No imports yet. Bring hours in from QuickBooks Time, Gusto, ADP, Paychex, or your own spreadsheet.` | `Start an import` |
| Findings panel | `Everything checks out. You can generate the report.` | |

### Sistemske greške
- 403: `You do not have access to this. Ask {Owner name} to change your role if you need it.`
- 404: `That page does not exist, or it belongs to a different company. Check the company switcher at the top left.`
- 500: `Something on our side failed. We have been told automatically. Your hours are saved. Try again in a minute, and if it keeps failing, email support@weeklycert.com.`
- Održavanje: `WeeklyCert is being updated. This takes about ten minutes. Your data is untouched.`
- Stanje greške na ekranu (`ErrorState`, 19 §7): naslov `This did not load.`,
  tekst `Your data is safe. Try again, and tell us the reference below if it keeps happening.`,
  dugme `Try again`, ispod `Reference {requestId}`.

### Javni sajt (struktura je 16 §4, redom po sekcijama)

Tri pravila iznad svega ostalog, sva tri iz 19 §8 i 16 §6: **nijedan telefonski
broj i nijedna poštanska adresa dok ne postoje stvarni**, kontakt je
`support@weeklycert.com`; **nijedna tvrdnja o broju kupaca, recenzijama ili
logotipima**; i **nijedan snimak proizvoda koji ne postoji**. Mreža sati postoji
od sesije C, pa hero nosi njen stvarni snimak; WH-347 i XML još ne postoje kao
izlazi (korak 5), pa se pokazuje njihova struktura, a ne izmišljeno popunjen
dokument s izmišljenim radnicima.

**Zaglavlje i podnožje**
- Ime: `WeeklyCert`
- Linkovi: `How it works` · `What you get` · `Pricing` · `Questions` · `Who we are`
- Desno: `Start free`. **`Log in` se ne stavlja u zaglavlje dok aplikacija ne
  postoji** (16 §4 red 1); vraća se kad registracija proradi.
- Ljudski kontakt u zaglavlju, umjesto telefona: `support@weeklycert.com`
- Podnožje, opis: `Certified payroll for New York subcontractors. NYSDOL portal XML and federal WH-347 from one weekly entry.`
- Podnožje, grupe: `Product` · `New York guides` · `Company`
- Podnožje, pravna linija: `Not a law firm and not a payroll provider. You sign your own certifications.`
- Podnožje, zadnja linija: `Built for New York. On purpose.`

**1 Hero**
- Naslov: `Your weekly New York certified payroll, XML and WH-347, done in ten minutes.`
- Podnaslov (ne tvrdi da izlazi već postoje; generator je korak 5):
  `Built for New York subcontractors with 3 to 30 workers. Enter hours once. The overtime codes and the fringe math are checked as you type, and that same entry is what the NYSDOL portal file and the federal WH-347 will be built from.`
- Dugmad: `Start free for 14 days` · `See what you get`
- Tri mikro-tvrdnje: `$79 a month, cancel anytime` · `We do the setup for you` ·
  `New York only, on purpose`
- Snimak mreže, opis za čitač ekrana (broj dana se ne imenuje danima, jer dan
  kraja sedmice bira firma, pravilo 12): `The WeeklyCert hours grid: one row per worker, seven days of the week, and the overtime and the findings worked out while the hours are typed.`

**2 Traka brojeva** (16 §4 red 3, četiri tvrda broja)
- `10 minutes` / `a typical week, from the first hour typed to signed`
- `2 filings` / `from one entry: the NYSDOL portal XML and the federal WH-347`
- `63 checks` / `run against the week before you can certify it`
- `$0` / `to set up, if you would rather do it yourself`

**3 Šta dobijete** (16 §4 red 4)
- Naslov: `The two documents this exists to produce`
- Uvod: `Every other tool in this category shows you a stock photo of a hard hat. These are the two files a New York week ends in, and what goes in each one.`
Nijedan izlaz još ne postoji: generator je korak 5, a XSD i imena polja u
WH-347 obrascu nisu u `izvori/` (13 A1 i A8b). Zato oznake kartica opisuju **šta
obrazac i portal traže**, a ne šta mi već pravimo, i nijedan broj iz šeme se ne
navodi dok se ne pročita iz XSD-a.

- XML kartica: `NYSDOL portal file` · `what the portal requires`
- XML opis: `One project, one week, in the shape the portal expects. When the portal rejects a file, you will be able to paste the error and we will name the worker and the field it came from.`
- WH-347 kartica: `Federal WH-347` · `the federal form`
- WH-347 opis: `It will be filled into the actual government form rather than a lookalike, with the Statement of Compliance on page two. Worker home addresses are never printed.`
- Napomena dok generator ne postoji (korak 5): `Neither file is generated yet. The generator is the next piece of work, and sample downloads go up the day it does.`

**4 Ulog** (16 §4 red 5)
- Nadnaslov: `Why this changed in 2026`
- Naslov: `Paper is gone. The portal is not optional.`
- Uvod (bez datuma u stringu, pravilo 12; tačan datum stupanja na snagu je
  činjenica iz 01, a ne tekst koji se prevodi):
  `Since the start of 2026, certified payroll for New York public work goes through the NYSDOL electronic portal. The file has to match the state schema exactly, and the classification names have to match the state list word for word.`
- Zatvaranje: `Nothing here is a scare tactic. These are the published rules, and you can check every one of them.`
- Tabela činjenica, par po par:
  `Who has to file` / `Every contractor and subcontractor on Article 8 public work` ·
  `How often` / `At least every 30 days from the project start date` ·
  `Grace period` / `14 days` ·
  `After that` / `$100 per day, per the NYSDOL FAQ` ·
  `Federal jobs too` / `WH-347 within 7 days of the pay date, 29 CFR 3.4` ·
  `Records kept` / `Six years`

**5 Kako radi** (16 §4 red 6)
- Nadnaslov: `How it works`
- Naslov: `Three steps, every week`
- Uvod: `The first week we set up with you. After that it is the same three steps, and most of it is already filled in from last week.`
- Korak 1: `Put in the hours` / `Type them into a grid that works like a spreadsheet, or import the export from QuickBooks Time, Gusto, ADP, Paychex or your own file. Last week's crew is already there.`
- Korak 2: `We check the math` / `Overtime by the OT code on your wage schedule, not a guess. Fringe credit against what the determination requires. Apprentice ratios and registration. Deduction totals that have to add up to net pay.`
- Korak 3: `Sign and file` / `Your certifying officer signs electronically, which the Department of Labor accepts. When the generator is finished you will download the XML for the portal and the WH-347 for the general contractor.`

**6 Stari i novi način** (16 §4 red 8, sedam redova)
- Nadnaslov: `The difference`
- Naslov: `What Friday afternoon looks like`
- Kolone: `A spreadsheet` · `WeeklyCert`
- `Entering the crew` / `Retype the same twelve names every week` / `Last week is already loaded`
- `Overtime` / `You remember the rule, or you do not` / `Read from the OT codes on your PRC schedule`
- `Fringe benefits` / `Annualised by hand, if at all` / `Checked against the determination, shortfall shown per hour`
- `Apprentices` / `Nobody checks the ratio until an audit does` / `Flagged the moment the ratio breaks`
- `The portal file` / `Typed into the portal, worker by worker` / `One file for the whole week`
- `A rejected upload` / `A line number and a cryptic message` / `Paste it in and we will name the worker and the field`
- `Six-year records` / `A folder somewhere` / `Every version kept, with the exact input it came from`

**7 Cijena** (16 §4 red 9)
- Nadnaslov: `Pricing`
- Naslov: `One price. Published, because you should not have to ask.`
- Uvod: `The established tools in this category quote you after a discovery call. Their published starting points run from $175 to $400 a month, with setup fees from about $995 to $4,995.`
- Kartica: `Everything, one plan` · `$79` · `per month`
- Ispod cijene: `Unlimited projects, unlimited workers, unlimited filings. Two months free if you pay yearly.`
- Spisak: `NYSDOL portal XML and federal WH-347` ·
  `Overtime, fringe and apprentice checks before you sign` ·
  `Import from your payroll or time system` ·
  `Deadline reminders at 10, 5, 2 and 0 days` ·
  `Six years of records, exportable any time` ·
  `Your bookkeeper and your signer, at no extra cost`
- Dugme i napomena: `Start free for 14 days` / `Card required, nothing charged for 14 days.`
- Postavka, naslov i uvod: `Setup, paid once` /
  `We build your company, projects, classifications, rates, fringe plans and workers from your files, then file the first week together on a call.`
- Nivoi: `Basic` / `one project, up to 10 workers` / `$149` ·
  `Standard` / `up to 5 projects, 30 workers, union fringe plans, one training call` / `$299` ·
  `Complex` / `up to 12 projects, 75 workers, apprentice ratios, 12 weeks of history` / `$499` ·
  `Do it yourself` / `the product is the same` / `$0`
- Jamstvo: `Full refund of the setup fee if we do not have you live within ten business days.`

**8 Sigurnost podataka** (16 §4 red 10; ista lista je i stranica `/security`)
- Nadnaslov: `Your workers' data`
- Naslov: `What we hold, and what we refuse to hold`
- `We never store a full Social Security number. The state accepts the last four digits or a date of birth, so that is all we keep. There is no column for a full Social Security number anywhere in our database.`
- `Home addresses and dates of birth are encrypted with a key that belongs to your company alone. Every time one is read, it is logged, and you can see that log.`
- `All data is stored and processed in United States data centres.`
- `Two-factor authentication is required for anyone who can sign a certification.`
- `We keep a written information security program under the New York SHIELD Act, and we will send it to your general contractor's risk team on request.`
- Šta ne pišemo: `We do not claim a SOC 2 report we do not have, and we do not say "bank-level encryption". The list above is what we actually do.`

**9 Izjave kupaca i značke** (16 §4 red 11)
Sekcija **ostaje prazna dok ne bude stvarnih kupaca koji pristanu**. Bez teksta,
bez rezerviranog mjesta na stranici, bez "coming soon". Prazno znači da se ne
renderuje ništa.

**10 FAQ** (osam pitanja iz 16 §5, tim redom)
- Nadnaslov: `Questions people actually ask`
- Naslov: `Before you sign up`
1. `Do you file with NYSDOL for me, or do I still upload it?` /
   `You upload it. The state portal has no API, which the Department of Labor states plainly in its own bulk upload guide, so no software can file for you. What we will do is produce the file for you, tell you exactly what to type into the portal by hand, and record the confirmation number so your history is complete.`
2. `Do I have to change payroll providers?` /
   `No. Keep Gusto, ADP, Paychex, QuickBooks or your accountant. We only need hours and the pay figures, and we import them from the exports those systems already produce.`
3. `What about weeks when nobody worked?` /
   `You still have to report them, and the portal does not accept a file for them. We track which weeks are missing, tell you which ones to mark as no-work in the portal, and keep the payroll numbers running without gaps, which is what an auditor looks at first.`
4. `My job is in New York City. Does that work?` /
   `Not yet, and we will say so before you pay. New York City public improvement and roadway excavation projects go through the City's own system, not the NYSDOL portal. If all your work is in the five boroughs, we are the wrong tool today. If you have both, we cover the state jobs and tell you plainly which ones we do not.`
5. `How long is setup, really?` /
   `Seven business days from the day you pay, and most of that is waiting on your spreadsheet. Our part is a kickoff call, building your data, and a handover where we file your first week together. If we miss ten business days, the setup fee comes back.`
6. `Who are you?` /
   `WeeklyCert builds certified payroll software for New York public work, and nothing else. Your email is answered by someone who works on the product itself, not by a call centre. What you do not get in exchange is cover around the clock.`
7. `What happens to my records if I cancel?` /
   `New York requires you to keep certified payroll records for six years. You get read-only access and a full export for 30 days after cancelling, and three reminders before that window closes. Export is one button, any time, whether you are a customer or not.`
8. `What if the math is wrong?` /
   `You sign the certification, not us, and the classification you pick is your determination. What we guarantee is the arithmetic and the file format. Every calculation rule we apply is written down, cites the regulation it comes from, and is tested against worked examples we publish.`

**11 Ko smo mi** (16 §4 red 13: o firmi, ne o osobi)

Bez imena, lica, inicijala i lokacije vlasnika. Sekcija govori šta firma radi,
za koga, ko odgovara na email i gdje su podaci. Ne navodi se veličina tima,
kancelarija ni adresa, jer nijedno nije istina koja se može provjeriti.

- Nadnaslov: `Who we are`
- Naslov: `One state, one product`
- Tekst: `WeeklyCert builds certified payroll software for New York public work, and nothing else. Every support email is read and answered by someone who works on the product itself, not a call centre. Your data stays in United States data centres, under the security program described above.`
- Tri činjenice: `Support hours` / `9 to 16 Eastern, Monday to Friday` ·
  `Anything blocking a filing` / `answered within 2 business hours` ·
  `Email` / `support@weeklycert.com`

**12 Zadnji poziv** (16 §4 red 14, isti tekst kao hero)
- Naslov: `Try it on your next week`
- Tekst: `Fourteen days free. If it does not save you an afternoon, cancel in two clicks and take your records with you.`
- Dugme: `Start free for 14 days`

**13 Pravne stranice** (`/legal/terms`, `/legal/privacy`, `/legal/dpa`)
Naslovi: `Terms of Service` · `Privacy Policy` · `Data Processing Agreement`

**Tekst ovih dokumenata se ne piše u kodu i ne izmišlja se.** Redoslijed nabavke
i ko ih piše je u 18 §5: uslovi iz Common Papera, privatnost kroz Termageddon,
DPA iz šablona, pa advokatski pregled. Dok ne postoje, stranica nosi naslov i
jednu istinitu rečenicu:
`This document is being prepared with counsel and will be published here before the first paid account. Ask for the current draft and we will send it.`
Ispod nje kontakt: `support@weeklycert.com`

**14 Poziv na radnju dok registracija ne postoji**

Registracija (`/register`) i aplikacija (`app.weeklycert.com`) nastaju tek
poslije kapije od 10 uplata (19 §9, 12). Do tada nijedno dugme ne smije voditi na
ekran koji ne postoji, jer je slijepi link na sajtu koji prodaje usklađenost
gori od poštene rečenice. Primarna radnja zato vodi na
`mailto:support@weeklycert.com`, s predmetom koji kaže o čemu se radi.
`Log in` se u istoj situaciji ne preusmjerava nego **uklanja** iz zaglavlja
(16 §4 red 1): dugme koje otvara email ne znači "log in".

- Dugme, umjesto `Start free` i `Start free for 14 days`: `Ask for an account`
- Napomena ispod dugmeta: `Sign up is not open yet. Email us and we will set your account up by hand.`
- Predmet tog emaila: `Account request from weeklycert.com`

Kad registracija proradi, vraćaju se `Start free` i `Start free for 14 days` iz
odjeljaka 1 i 7 gore i `Log in` u zaglavlje, a ova tri stringa se brišu. Oni su
privremeni i to je jedini razlog zbog kojeg postoje.

**Nijedan telefonski broj se ne pojavljuje u tekstu dok ne postoji stvaran broj
koji neko javlja.** Izmišljen broj u poruci o grešci je gori od nikakvog, jer
kupac po njemu zove kad mu gori.

## 4. Transakcioni emailovi

### 4.1 Pravila
- Šalje se kroz **Resend**, s poddomene `mail.weeklycert.com`, s vlastitim DKIM i
  Return-Path. **Nikad s domene koja se koristi za hladan email.**
- **Zašto Resend za transakcione a ne i za hladne.** Resendova pravila
  prihvatljive upotrebe izričito zabranjuju hladnu poštu: "You are prohibited from
  sending unsolicited messages of any kind, including cold outreach, purchased
  lists, or scraped contact data" i "All mail must be sent to recipients who have
  explicitly opted in". Slanje hladnih poruka kroz njih znači zatvoren nalog i
  spaljenu domenu. Uz to Resend je API, ne sandučić: kupac odgovori i nemaš iz
  čega odgovoriti nazad u istoj niti. Hladan email zato ide iz pravog sandučića na
  getweeklycert.com.
- Cijena: besplatno do 3.000 poruka mjesečno i 100 dnevno, tri domene. Na 50
  kupaca smo oko 2.600 mjesečno, dakle blizu granice, pa se tada prelazi na Pro,
  20 $ za 50.000. Postmark (15 $ za 10.000, politika samo transakcionog slanja,
  vrlo čist zajednički IP pool) je nadogradnja ako se javi problem s
  isporučivošću.
- `From: WeeklyCert <alerts@weeklycert.com>`, `Reply-To: mume@weeklycert.com`
  (pravi sandučić koji se čita). **Nikad noreply.**
- Uvijek i HTML i plain text verzija.
- **Jedan link po emailu**, direktno na blokirani ekran, ne na dashboard.
- Bez slika osim malog logotipa. Bez trackera kao jedinog sadržaja.
- U podnožju: naziv pravnog lica, adresa, link na postavke obavještenja.
- Transakcioni email je izuzet od obaveznog "unsubscribe" (CAN-SPAM test
  primarne svrhe), **ali samo dok se u njega ne ubaci prodaja.** Nikad ne
  dodavati najavu funkcije u podsjetnik na rok; time email postaje komercijalan
  i gubi izuzeće.
- Ponedjeljni pregled je granični slučaj: dobija `List-Unsubscribe` zaglavlje i
  prekidač u postavkama.

### 4.2 Puna lista

Hitnost: **P1** prekid (vrijedi i push obavještenja), **P2** isti dan, **P3** informativno.

**Nalog**
| Email | Okidač | P | I u aplikaciji |
|---|---|---|---|
| Verify your email | registracija | P1 | traka dok se ne potvrdi |
| Reset your password | zahtjev | P1 | ne |
| Your password was changed | promjena | P1 | dnevnik |
| Two-factor was turned on/off | promjena | P1 | dnevnik |
| New sign-in from a new device | nepoznata sesija | P2 | dnevnik |
| {Name} invited you to {Company} | pozivnica | P2 | da |
| Your role changed to {Role} | promjena uloge | P2 | da |

**Postavljanje (plaćeni setup)**
| Email | Okidač | P |
|---|---|---|
| Welcome: here is what happens in the next seven days | uplaćen setup | P1 |
| We are waiting on your spreadsheet | D+2, D+5 bez unosa | P2 |
| Your kickoff call is {date} | zakazano, pa 24 h i 1 h prije | P2 |
| Your setup is ready. Please review and approve. | završena izgradnja | P1 |
| Your first filing is done | prva prihvaćena predaja | P1 |

**Sedmični rad, srce proizvoda**
| Email | Okidač | P |
|---|---|---|
| Week ending {date} is open | dan poslije kraja sedmice, ponedjeljak 8:00 ET | P2 |
| {n} worker is missing hours for {date} / {n} workers are missing hours for {date} | 2 dana prije internog roka | P2 |
| {n} error blocks your filing for {date} / {n} errors block your filing for {date} | validacija pala | P1 |
| {project} is ready to certify | validacija prošla | P2 |
| {Name}, a certification is waiting for your signature | 24 h bez potpisa | P1 |
| Filed: {project}, week ending {date} | zabilježena predaja | P1 |
| The portal rejected {project}, week ending {date} | unesen status rejected | P1 |
| {project}: {n} day to your NYSDOL filing deadline / {project}: {n} days to your NYSDOL filing deadline | T-10, T-5, T-2, T-0 | P2 rastuće do P1 |
| {project} is past the deadline. Penalties start in {n} day. / {project} is past the deadline. Penalties start in {n} days. | rok prošao | P1 |
| WH-347 for {project} is due in 2 days | federalni projekat | P2 |
| No work on {project} last week? | nema unosa do roka | P2 |
| Your week ahead | ponedjeljak 8:00 ET, sažetak | P3 |
| New wage schedule for PRC {prc} | keš donio novije stope | P2 |

**Naplata**
| Email | Okidač | P |
|---|---|---|
| Receipt for your setup fee | uplata | P2 |
| Your trial ends in 3 days | T-3 | P2 |
| Receipt: $79 | naplata | P3 |
| We could not charge your card | pad naplate, D0, D+3, D+7 | P2 pa P1 |
| Your card expires next month | 30 dana prije | P3 |
| Your yearly plan renews on {date} | T-30, samo godišnji | P2 (NY GOL §5-903) |
| Your account is now read-only | iscrpljena naplata | P1 |
| Cancelled: how to get your records | otkaz | P2 |

**Sigurnost i kraj**
| Email | Okidač | P |
|---|---|---|
| Security notice about your account | potvrđen incident | P1 |
| A full export of your data was started | izvoz | P1 |
| We are changing a subprocessor | 30 dana unaprijed | P3 |
| Planned maintenance on {date} | T-72 h i T-1 h | P3 pa P2 |
| Export your records before {date} | T-30, T-7, T-1 poslije otkaza | P2 pa P1 |

**Pravilo:** svaki P1 iz sedmičnog bloka mora postojati i kao blokirajuće stanje
u aplikaciji. Email nije dovoljno pouzdan kanal kad teče brojač od 100 $ dnevno.
SMS se šalje samo za T-2 i T-0, i samo uz zabilježen pisani pristanak.

### 4.3 Šablon podsjetnika na rok (najvažniji email)

Subject: `PS 118 Brooklyn: 5 days to your NYSDOL filing deadline`

Ne: `URGENT!!`, `FINAL NOTICE`, `Don't miss your deadline!` Velika slova, više
uzvičnika i riječi tipa "urgent" su klasični okidači filtera i čitaju se kao
prevara.

```
Hi Dana,

PS 118 Brooklyn (PRC 2026004512) needs a certified payroll submission by
Friday, September 18. That is 5 days away.

  Last accepted submission   August 12
  Deadline                   September 18
  Weeks not yet filed        2 (Sep 5, Sep 12)
  What is blocking           12 hours missing for 3 workers on Sep 12

  Finish week ending Sep 12  ->  https://app.weeklycert.com/...

NYSDOL assesses $100 per day once records are more than 14 days late.

No work on this project last week? Mark it here and we will stop asking:
https://app.weeklycert.com/...

WeeklyCert
support@weeklycert.com
Support 9:00 to 16:00 Eastern, Monday to Friday
```

Zašto ovako:
- Konkretan projekat, PRC i datum u prvoj rečenici. Generičan podsjetnik čita se
  kao marketing; konkretan se čita kao račun.
- **Tačno šta blokira**, ne "vaš izvještaj je nepotpun".
- **Jedan glavni link**, direktno na blokirani ekran.
- Posljedica **jednom**, kao činjenica s izvorom. Bez podebljanog crvenog teksta.
- Izlaz za slučaj da nije bilo rada.
- Potpis firme, kontakt i radno vrijeme u istočnoj zoni, **bez imena osobe**
  (16 §4 red 13). Telefon se dodaje tek kad postoji stvaran broj koji neko
  javlja; do tada email.
- Eskalacija ide **kroz preciznost, ne kroz količinu.** T-10 je informativan,
  T-2 imenuje prepreke, T-0 nudi da to riješimo zajedno danas. Isti email četiri
  puta uči ljude da nas filtriraju.

### 4.4 Isporučivost

- SPF, DKIM i DMARC na svakoj poddomeni s koje se šalje, poravnati (`From` se
  mora poklapati sa SPF ili DKIM domenom).
- DMARC počinje na `p=none` s `rua` izvještajima, za mjesec dana `p=quarantine`,
  pa `p=reject`. Nema razloga ostati na `none` uz jedan tok slanja.
- Prag "bulk sender" je 5.000 poruka dnevno prema jednom provajderu. Nikad ga
  nećemo doseći, ali se ispunjava svejedno: Gmail od novembra 2025. odbija
  trajno (550) umjesto privremeno, Outlook od maja 2025.
- Stopa prijava spama ispod 0,10 %.
- Google Postmaster Tools v2 i Microsoft SNDS uključeni prvog dana.
- **Tri odvojena kanala**: transakcioni s `mail.weeklycert.com` (Resend),
  eventualni newsletter s `news.weeklycert.com`, hladan email iz pravog sandučića
  na **potpuno drugoj domeni** (`getweeklycert.com`, Zoho Mail). Poddomena daje
  samo djelimičnu izolaciju reputacije; za proizvod gdje odbijen podsjetnik košta
  kupca 100 $ dnevno to nije dovoljno.
- Hladan email se nikad ne šalje alatom za transakcionu poštu, ni Resendom ni
  Postmarkom. Oba to zabranjuju i oba bi zatvorila nalog.
