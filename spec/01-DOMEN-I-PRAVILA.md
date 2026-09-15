# 01. Domen i poslovna pravila (motor)

Ovo je najvažniji fajl za tačnost proizvoda. Sve što je ovdje ide u `core/` kao
čiste funkcije s golden testovima. Izvori su na dnu; gdje nešto nije provjereno iz
prvog izvora, piše NEPROVJERENO.

---

## 1. Rječnik (koristiti tačno ove termine u kodu i UI-ju)

| Termin (UI) | U kodu | Značenje |
|---|---|---|
| Firma | `tenant` | Kupac, jedan podizvođač. Sve je vezano za tenant_id. |
| Projekat | `project` | Jedan javni posao. Ima PRC broj (NY) i/ili federalni WD broj. |
| PRC broj | `prc_number` | Prevailing Rate Case, identifikator projekta kod NYSDOL. XML ga traži. |
| WD | `wage_determination` | Federalna odluka o nadnicama sa SAM.gov, format `NY20260012`, plus broj modifikacije. |
| Klasifikacija | `classification` | Zanat i podvrsta, npr. `Electrician – Wireman` (razdvajač je U+2013 s razmacima, vidi §3). NY XML traži tačan naziv iz zvanične liste; broj stavki se utvrđuje u koraku 0 (spec/13 A11). |
| Stopa | `wage_rate` | Osnovna satnica po klasifikaciji, iz odluke o nadnicama. |
| Dodatak | `supplement` | NY termin za beneficiju po satu (supplemental benefit). Federalno: fringe. |
| Beneficija | `fringe` | Doprinos poslodavca po satu radnika, u plan ili u gotovini. |
| Anualizacija | `annualization` | Godišnji trošak plana podijeljen sa svim satima u godini (javni i privatni). |
| Pripravnik | `apprentice` | Radnik u registrovanom programu. Plaća se procenat od majstorske stope. |
| Majstor | `journeyworker` | Radnik s punom stopom. U kodu `J`. Pripravnik je `RA`. |
| Sedmica | `payroll_period` | Radna sedmica s datumom kraja sedmice (week ending). |
| Redovni sati | `st_hours` | Standard time. |
| Prekovremeni | `ot_hours` | Overtime. |
| Sedmica bez rada | `no_work_week` | Nije bilo rada na projektu, izvještaj se svejedno predaje. |
| Izvještaj | `report` | Jedna generisana verzija izlaza: NY XML, WH-347 PDF, izjava. |
| Predaja | `submission` | Zapis o tome da je izvještaj poslat u portal ili glavnom izvođaču. |
| Izjava o usklađenosti | `statement_of_compliance` | Strana 2 WH-347, potpisuje ovlašteno lice. |
| Naručilac | `awarding_body` | Državna agencija, okrug, grad, škola koja je raspisala posao. |
| Glavni izvođač | `prime_contractor` | Firma s ugovorom prema naručiocu. Kupac je najčešće podizvođač. |

## 2. Dvije jurisdikcije, dva skupa pravila

Proizvod istovremeno pravi NY izlaz i federalni izlaz. Pravila se razlikuju. Motor
mora znati za koji izlaz računa.

### 2.1 Prekovremeni

**Ovo je najveća ispravka u odnosu na prvu verziju speca.** NY nema jedno pravilo
prekovremenih. Svaka klasifikacija u platnoj tabeli nosi svoj **OT kod**, a kod
kaže kad nastaje premija i kolika je. Motor mora čitati kod, ne pretpostavljati.

| | Federalno (Davis-Bacon / CWHSSA) | NY Article 8 (javni radovi) |
|---|---|---|
| Kad nastaje | preko 40 sati sedmično na pokrivenom radu | **po OT kodu klasifikacije** iz platne tabele za taj PRC |
| Stopa | najmanje 1,5 × **osnovna** satnica | po kodu: 1,5 ×, 2 ×, 2,5 × ili 3 × osnovne, zavisno od dana i sata |
| Osnovica | beneficija se NE uključuje u premiju (29 CFR 5.32) | isto, osim ako kod nosi V ili W (vidi dolje) |
| Ako plaća više od WD | stvarno plaćena stopa je regular rate (29 CFR 5.32(c)) | isto načelo |

Federalno pravilo i NY pravilo se primjenjuju **oba**, i uzima se ono koje daje
veći iznos radniku. Projekat koji je i federalno i državno finansiran mora
zadovoljiti oba.

#### Legenda OT kodova (zvanična, sa OVERTIME PAGE svake platne tabele)

Legenda nije objavljena zasebno; štampa se u svakoj platnoj tabeli. Ovo je puna
lista koju motor mora podržati:

| Kod | Značenje |
|---|---|
| AA | 1,5 × poslije 7,5 sati dnevno |
| A | 1,5 × poslije 7 sati dnevno |
| B | 1,5 × poslije 8 sati dnevno |
| B1 | 1,5 × za 9. i 10. sat radnim danom i prvih 8 sati subotom; 2 × sve preko |
| B2 | 1,5 × poslije 40 sati sedmično |
| B3 | 1,5 × poslije 40 redovnih sati sedmično |
| C | 2 × poslije 7 sati dnevno |
| C1 | 2 × poslije 7,5 sati dnevno |
| D | 2 × poslije 8 sati dnevno |
| D1 | 2 × poslije 9 sati dnevno |
| E | 1,5 × subotom |
| E1 | 1,5 × prva 4 sata subotom, 2 × ostatak subote |
| E2 | subota se smije koristiti kao nadoknada po redovnoj stopi ako je dan izgubljen zbog vremena |
| E3 | isto kao E2, ali samo od 1.11. do 3.3. i ako je radnik te sedmice radio 16 do 32 sata |
| E4 | nedjelja kao nadoknada po redovnoj stopi ako je dan izgubljen zbog vremena |
| E5 | 2 × poslije 8 sati subotom |
| F | 1,5 × subotom i nedjeljom |
| G | 1,5 × subotom i praznikom |
| H | 1,5 × subotom, nedjeljom i praznikom |
| I | 1,5 × nedjeljom |
| J | 1,5 × nedjeljom i praznikom |
| K | 1,5 × praznikom |
| L | 2 × subotom |
| M | 2 × subotom i nedjeljom |
| N | 2 × subotom i praznikom |
| O | 2 × subotom, nedjeljom i praznikom |
| P | 2 × nedjeljom |
| Q | 2 × nedjeljom i praznikom |
| R | 2 × praznikom |
| S | 2,5 × praznikom |
| S1 | 2,5 × prvih 8 sati nedjeljom ili praznikom, 1,5 × ostatak |
| T | 3 × praznikom |
| U | 4 × praznikom |
| V | beneficije se plaćaju s **istom premijom** kao prekovremeni |
| W | 1,5 × i na beneficije za sve prekovremene sate |
| X | beneficije se plaćaju za plaćene praznike po redovnoj stopi; ako se radi, dodatna premija (formulacija NEPROVJERENA, prepisati s aktuelne tabele) |

Jedna klasifikacija najčešće nosi **više kodova odjednom**, npr. `See (B, E2, O) on
OVERTIME PAGE`. Motor primjenjuje sve i uzima najvišu premiju za taj sat.

Kodovi V i W su jedini slučaj kad dodatak (supplement) ulazi u premiju. Bez njih
dodatak se plaća po satu bez množenja.

#### Praznici

Kodovi G, H, J, K, N, O, Q, R, S, S1, T, U zavise od toga koji su dani praznici, a
to je zasebna **HOLIDAY PAGE** s numerisanim kodovima (otprilike 1 do 29) u svakoj
platnoj tabeli. **Tu legendu nisam uspio preuzeti** (vidi spec/13 A10). Bez nje
motor ne može tačno računati praznične premije, pa u MVP-u:
- praznični dani se ne računaju automatski,
- korisnik označi dan kao praznik u mreži i motor pita koji multiplikator,
- nalaz `HOLIDAY_RULE_UNKNOWN` (soft) objašnjava zašto.

#### Primjeri koji moraju proći test

Osnovna 16,00 $ + beneficija 2,50 $, kod B (1,5 × poslije 8 dnevno). Deveti sat je
16,00 × 1,5 + 2,50 = **26,50 $**, ne 18,50 × 1,5 = 27,75 $.

Isti radnik, kod W u tabeli: 16,00 × 1,5 + 2,50 × 1,5 = **27,75 $**.

### 2.2 Više klasifikacija u istoj sedmici

- Federalno: regular rate za prekovremene je **ponderisani prosjek** = ukupna zarada
  ÷ ukupni sati (29 CFR 778.115), osim ako postoji sporazum "rate in effect".
- NY: primjenjuje se stopa klasifikacije za sate stvarno odrađene u njoj.
- Ako radnik radi dvije klasifikacije u istom danu, unose se dva reda (radnik +
  klasifikacija), a sati po danu se dijele.

### 2.3 Beneficije (fringe / supplement)

Anualizacija (29 CFR 5.25(b), i NY praksa):

```
kredit_po_satu = godišnji_trošak_plana ÷ ukupni_godišnji_sati_na_svim_poslovima
```

- Ukupni sati uključuju i privatne poslove, ne samo javne.
- Ako firma nema dokumentovane sate, NY podrazumijeva 2.080 (ili 1.820 za 7-satne
  dane).
- Izuzetak od anualizacije: penzioni planovi s definisanim doprinosom, trenutnim
  učešćem i praktično trenutnim sticanjem prava.
- **Zakonom obavezni doprinosi nisu beneficija**: FICA, osiguranje od povreda na
  radu, osiguranje za nezaposlene se nikad ne priznaju kao fringe.
- Kredit se računa **po svakom radniku posebno**, ne kao prosjek ekipe.
- Doprinosi se moraju uplaćivati najmanje kvartalno.
- Gotovina umjesto beneficije je dozvoljena (29 CFR 5.31). Može i kombinacija.
- NY: nema unakrsnog priznavanja između nadnice i dodatka. Manjak dodatka se ne
  pokriva viškom nadnice.

Provjera dovoljnosti po redu u mreži:

```
plaćeno_ukupno = gotovinska_satnica + gotovina_umjesto_fringe + kredit_plana_po_satu
traženo_ukupno = WD_osnovna + WD_fringe
manjak_po_satu = max(0, traženo_ukupno - plaćeno_ukupno)
```

UI prikazuje "Fringe OK" ili "manjak 5,00 $/h, oko 200 $ ove sedmice".

### 2.4 Pripravnici

- Moraju biti pojedinačno registrovani: federalno kod OA ili državne agencije, u NY
  kod Commissioner of Labor. XML ima boolean `nysRegisteredApprentice`.
- Plaćaju se procenat majstorske stope po nivou programa.
- Omjer pripravnika prema majstorima po programu (npr. "1:1, 1:3"). Radnik izvan
  omjera duguje punu majstorsku stopu.
- Neregistrovan "pripravnik" = puna stopa, i to je nalaz kontrole.
- Ako program šuti o beneficijama, duguje se puna WD beneficija.

### 2.5 Sedmice bez rada, numeracija, završni izvještaj

- NY: svaka sedmica od početka projekta mora biti pokrivena. Sedmica bez rada se
  označi u portalu (No Work Week), duže pauze kroz "work pause" datume.
- Federalno: uobičajeno se predaje "no work" izvještaj; propis traži sedmičnu
  predaju samo za sedmice s pokrivenim radom.
- Certified Payroll No. je uzastopan po ugovoru, bez rupa. Aplikacija ga generiše,
  korisnik ga nikad ne kuca.
- Zadnji izvještaj se označi "Final". NY portal traži i šifru razloga.

### 2.6 Identifikacija radnika i podaci koji se šalju

- Na sedmičnom izvještaju **nikad pun JMBG (SSN)**, adresa, telefon ni email (29 CFR
  5.5(a)(3)(ii)(B)). Šalju se zadnje četiri cifre ili drugi identifikator.
- NY XML: `ssnLast4` **ili** `dateOfBirth`, nikad oboje. Ali NY XML **traži adresu**.
- Interno se čuvaju puni podaci radi evidencije, ali proizvod NE traži pun SSN od
  kupca. Kupac ga čuva u svom payroll sistemu. Vidi 11-SIGURNOST.

### 2.7 Čuvanje

- Federalno: 3 godine poslije završetka **glavnog** ugovora.
- NY Labor Law §220(3-a): **5 godina** od završetka radova. NYSDOL FAQ pominje 6
  godina. Proizvod čuva **najmanje 6 godina** od zatvaranja projekta, i to je
  podesivo po projektu.

### 2.8 Potpis

- Potpisuje izvođač, podizvođač ili ovlašteni službenik koji nadzire isplatu plata.
- Elektronski potpis je prihvatljiv ako je pravno valjan. Skenirani ili
  fotokopirani potpis **izričito nije**.
- Lažna izjava: 18 U.S.C. 1001 i False Claims Act. Izjava mora sadržavati to
  upozorenje.
- Proizvod: tipkano puno ime + naslov + vrijeme + IP + verzija teksta izjave, sve u
  audit log. Crtani potpis nije potreban.

## 3. Odluke o nadnicama: odakle podaci

### NY
- Izdaju se po PRC broju. **Naručilac** (javna agencija) traži tabelu obrascem
  **PW-39**, ne izvođač; NYSDOL dodijeli PRC broj i agencija ga mora staviti u
  specifikaciju posla. Izvođač onda sam skida tabelu po PRC broju.
- Article 8 (gradnja) i Article 9 (usluge u zgradama) su odvojeni.
- **Tri različita ciklusa promjene stopa, ne miješati:**
  1. godišnja odluka važi od 1. jula do 30. juna;
  2. ispravke i dopune objavljuju se **prvog radnog dana svakog mjeseca** i
     primjenjuju se **retroaktivno od 1. jula**;
  3. neke tabele nose i unaprijed zakazana kvartalna povećanja.
- Sadržaj po klasifikaciji: zanat, okruzi, satnica po datumima, dodatak po satu
  (fiksno ili formula tipa "33,5% od satnice + 26,85 $"), OT kodovi, kodovi za
  praznike, uslovi za pripravnike (procenti po terminu, omjer).
- **Format: samo HTML i PDF na apps.labor.ny.gov/wpp.** Nema API-ja ni preuzimanja.
  Pretraga po PRC broju: `apps.labor.ny.gov/wpp/showFindProject.do?method=showIt`.
- Proizvod: čuva snimak tabele po PRC broju kao `wage_schedule_cache`, parsira uz
  ljudsku provjeru, **povlači ponovo prvog radnog dana svakog mjeseca** i svakog
  1. jula. Svaki red stope ima `effective_from` i `effective_to`.
- Retroaktivna ispravka je stvaran slučaj koji proizvod mora podnijeti: nova
  stopa važi od 1. jula, a sedmice između su već potpisane. Rješenje je nalaz
  `RATE_RETROACTIVE_CHANGE` i ponuđena masovna ispravka pogođenih sedmica.

### Federalno
- SAM.gov, broj oblika `NY20260012` + broj modifikacije. Struktura: država, tip
  gradnje (Building / Residential / Heavy / Highway), okruzi, redovi klasifikacija s
  identifikatorom (npr. `ELEC0003-001 07/01/2025`), stopa, fringe.
- Zaključava se u trenutku dodjele posla.
- **Nema zvaničnog API-ja ni grupnog preuzimanja.** Skidanje i normalizacija.

### Klasifikacije u NY XML-u
- Zvanična lista je na
  `dol.ny.gov/electronic-payroll-xml-work-classification-list`, **samo HTML, nema
  fajla za preuzimanje.** Mora se prepisati ili skinuti skriptom.
- **Razdvajač je duga crta U+2013 s razmacima**: `Zanat – Podvrsta`. Nije obična
  crtica. Ovo je jedini dio proizvoda gdje se duga crta koristi namjerno, jer je
  dio zvaničnog stringa; pravilo "bez dugih crta" važi za tekst koji mi pišemo.
- Parsiranje: dijeliti **samo** na ` – ` (razmak, U+2013, razmak). Desna strana
  smije sadržavati obične crtice, kose crte i ampersande
  (`Insulator – Heat & Frost -Asbestos Worker`). Neke stavke nemaju podvrstu
  uopšte (`Sprinkler Fitter`).
- Pravopisne zamke koje se moraju prepisati doslovno: `Sheetmetal` (jedna riječ),
  `Ironworker – Curtin Wall Installer` (tako piše, s greškom), `Boiler Maker`
  (dvije riječi).
- Dužina polja `workCategory` je do **300 znakova**.
- Broj vrijednosti: **NEPROVJEREN.** Dva čitanja iste stranice dala su 227 i 463.
  Prebrojati na živoj stranici prilikom skidanja (spec/13 A11).
- Sprema se kao seed tabela `classification_catalog`, ne hardkodira. Portal traži
  doslovno poklapanje s listom u svom padajućem meniju.

## 4. Šta motor računa, ulaz i izlaz

Ulaz za jednu sedmicu:
- radnici s klasifikacijama i satima po danu (ST/OT ili samo ukupno, pa motor dijeli)
- stope po klasifikaciji (WD osnovna, WD fringe, stvarna gotovinska, gotovina umjesto)
- planovi beneficija i kredit po satu po radniku
- OT kodovi po klasifikaciji iz platne tabele (NY) i federalni prag od 40 sati
- odbici po radniku po vrsti
- status pripravnika i procenat

Izlaz:
- po radniku i klasifikaciji: ST sati, OT sati, ST stopa, OT stopa, fringe kredit,
  gotovina umjesto fringe, bruto na projektu
- po radniku: bruto za sav rad, odbici razloženi, neto, regular rate i metoda
- lista nalaza validacije (tvrdi i meki) s objašnjenjem i predloženom popravkom
- podaci spremni za NY XML i WH-347 mapiranje

Sve je čista funkcija: isti ulaz, isti izlaz. Nema pristupa bazi iz `core/`.

## 5. Golden testovi koje motor mora proći (minimum)

1. Jedan radnik, jedna klasifikacija, 45 sati, federalno: 40 ST + 5 OT, OT na osnovicu.
2. Klasifikacija s kodom **B** (1,5 × poslije 8 dnevno): 4 dana × 10 sati + 1 dan × 5 = 45 sati → NY daje 8 OT, federalno daje 5 OT. Isti ulaz, dva različita izlaza, i uzima se povoljniji za radnika.
3. Klasifikacija s kodovima **B, E1**: 5 dana × 8 sati plus subota 6 sati. Subota je 1,5 × prva 4 sata pa 2 × preostala 2 (kod E1), a radnim danima nema premije.
4. Dvije klasifikacije u sedmici, federalno: ponderisani prosjek regular rate.
5. Dvije klasifikacije u istom danu: dva reda, sati podijeljeni, zbir po danu ≤ 24.
6. Fringe: mjesečna premija 600 $ → kredit po satu uz 2.080 sati = 3,46 $.
7. Fringe manjak: WD traži 30 + 10, plaća se 30 + 6 u plan → manjak 4,00 $/h.
8. Zakonski doprinosi navedeni kao fringe → odbijeni, upozorenje.
9. Pripravnik 60% bez registracije → puna stopa, tvrda greška.
10. Pripravnik izvan omjera → puna stopa za višak.
11. Sedmica bez rada → izvještaj s nula satima, flag.
12. Odbici: zbir odbitaka + neto = bruto za sav rad, inače tvrda greška.
13. NY: 11 odbitaka po radniku → uz `merge_deductions` najmanji se spajaju u "other" i meki nalaz DEDUCTIONS_OVER_10; bez spajanja tvrda greška.
14. NY: više od 500 radnika u fajlu → tvrda greška OVER_500_WORKERS (dijeljenje fajla tek kad se A7 iz spec/13 potvrdi).
15. NY XML: ssnLast4 i dateOfBirth oboje prisutni → izlaz nosi samo ssnLast4, nalaz info; uz `strict_pii` tvrda greška.

## 6. Izvori

- 29 CFR 5.5: https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-A/section-5.5
- 29 CFR 5.25, 5.31, 5.32 (beneficije, gotovina, OT osnovica): https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-B
- 29 CFR 778.115 (ponderisani prosjek): https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-B/part-778
- DOL Prevailing Wage Resource Book, Tab 9: https://www.dol.gov/sites/dolgov/files/WHD/legacy/files/Tab9.pdf
- NY Labor Law §220: https://www.nysenate.gov/legislation/laws/LAB/220
- NY Labor Law §220-j (elektronska predaja, 100 $/dan): https://www.nysenate.gov/legislation/laws/LAB/220-J
- NYSDOL Article 8 FAQ: https://dol.ny.gov/article-8-frequently-asked-questions
- NYSDOL Electronic Payroll FAQ: https://dol.ny.gov/electronic-payroll-faq
- NY XML lista klasifikacija: https://dol.ny.gov/electronic-payroll-xml-work-classification-list
- NY platne tabele: https://dol.ny.gov/prevailing-wage-schedules
- SAM.gov WD: https://sam.gov/wage-determinations
