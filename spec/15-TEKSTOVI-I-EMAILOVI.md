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
- Ispod imena firme: `{Role} · {n} active projects`
- Zadnja stavka: `See all companies`
- Kad korisnik ima samo jednu firmu, birač se ne prikazuje.

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
- Probni period: `Trial, {n} days left.` dugme `Add a payment method`
- Pauzirano: `Subscription paused. You can read everything, but new reports cannot be generated.` dugme `Resume subscription`
- Neuspjela naplata: `The last payment did not go through. Reports keep working for {n} more days.` dugme `Update card`

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
- Previše pokušaja: `Too many attempts. Try again at 10:14, or reset your password.`
- Magic link: `Click the button below to sign in. The link works once and expires in 15 minutes.`
- Pozivnica: `{Inviter} invited you to {Company} as {Role}. Accepting adds this company to your account.`
- 2FA obavezna: `Your role can sign certifications, so two-factor authentication is required. It takes two minutes to set up.`

### Kontrolna tabla
- Naslov: `{Weekday}, {Month} {D}` · pod njim `week ending Sat {Month} {D}`
- Kartice: `project past the 30-day deadline` · `weeks waiting for hours` ·
  `report waiting for signature` · `filings accepted this year`
- Sekcija rokova: `State filing deadlines` / podnaslov
  `NYSDOL requires a submission at least every 30 days per project`
- Statusi: `{n} days left` · `{n} days late` · `due today`
- Prazno: `No projects yet. A project is one public job with its own PRC number.`
  Dugme `Add your first project`.

### Mreža sati
- Naslov: `Hours` · meta `Sat {date} · payroll no. will be #{n} on signature`
- Dugmad: `Copy last week` · `Import CSV` · `Mark no-work week` ·
  `Review and generate`
- Onemogućeno dugme, tooltip: `{n} errors must be fixed before you can generate the report.`
- Snimanje: `Saved {HH:MM}` · `Saving...` · `Not saved. Check your connection.`
- Prazna sedmica: `No hours yet for this week. Copy last week to bring the same crew over, or import a file.`
- Zaključana sedmica: `This week was signed on {date} and cannot be changed. Create a correction to file a new version.`
- Konflikt: `{Name} changed this week two minutes ago. Your view has been refreshed.`
- Panel: `{n} errors, {n} warnings, {n} notes` / `Errors block generating the report.`
- Neispravan unos u ćeliju: `Enter hours, for example 8, 8.5 or 8/1.`
- Bez nalaza: `Everything checks out. You can generate the report.`

### Pregled i potpis
- Naslov: `Review and certify`
- Uspjeh: `No errors. {n} warnings were confirmed by you on {date}.`
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
- Brojači: `{n} rows in the file` · `{n} ready` · `{n} warnings` · `{n} errors, these block`
- Puni SSN u fajlu: `This file has a column that looks like full Social Security numbers. We do not store those. We can keep the last four digits and delete the original file after import, or you can remove the column and upload again.`
- Primjena: `Imported {n} rows for {n} workers, week ending {date}. {n} rows were skipped.`

### Naplata
- Trial: `{n} days left in your trial. Your card is on file and will be charged $79 on {date}.`
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
| {n} workers are missing hours for {date} | 2 dana prije internog roka | P2 |
| {n} errors block your filing for {date} | validacija pala | P1 |
| {project} is ready to certify | validacija prošla | P2 |
| {Name}, a certification is waiting for your signature | 24 h bez potpisa | P1 |
| Filed: {project}, week ending {date} | zabilježena predaja | P1 |
| The portal rejected {project}, week ending {date} | unesen status rejected | P1 |
| {project}: {n} days to your 30-day state deadline | T-10, T-5, T-2, T-0 | P2 rastuće do P1 |
| {project} is past the deadline. Penalties start in {n} days. | rok prošao | P1 |
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

Subject: `PS 118 Brooklyn: 5 days to your NYSDOL deadline`

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

Mume
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
- Ime čovjeka, kontakt i radno vrijeme u istočnoj zoni. Telefon se dodaje tek kad
  postoji stvaran broj koji neko javlja; do tada email.
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
