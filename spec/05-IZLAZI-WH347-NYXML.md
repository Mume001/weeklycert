# 05. Izlazi: NY XML, WH-347 PDF, izjava o usklađenosti

Ovo su tri stvari koje kupac stvarno plaća. Sve ostalo služi da ove tri budu tačne.
Svaki izlaz se pravi iz `reports.input_snapshot` (zamrznuti ulaz), nikad direktno iz
živih tabela, da bi se isti izvještaj mogao regenerisati bajt za bajt.

**Verzija 2, 13.9.2026.** Prva verzija je bila rekonstrukcija. Ova je pisana iz
zvaničnog NYSDOL uputstva za grupni upload i iz obrasca WH-347 revizija januar
2025. Šta je i dalje neprovjereno stoji u spec/13.

---

## 1. Zajednička načela

1. Izlaz se pravi u worker procesu (pg-boss posao `report.generate`), ne u HTTP
   zahtjevu. Web samo stavi posao u red i vraća `report_id`; ekran anketira status.
2. Prije pisanja fajla, motor još jednom pokreće validaciju nad snapshotom. Ako
   postoji tvrdi nalaz, posao pada s jasnom porukom i report dobija `failed`.
3. Svaki fajl dobija `sha256`, ide u S3 skladište pod ključ
   `t/{tenant}/{yyyy}/report/{report_id}.{ext}`, s `retention_until` po formuli iz
   04 (greatest(week_ending, actual_end_date) + retention_years + 1 dan).
4. Regeneracija iste verzije (isti snapshot, ista verzija motora) mora dati isti
   XML tekst i isti PDF sadržaj (PDF metapodaci s datumom se fiksiraju na
   `generated_at`).
5. Golden test za svaki izlaz: ulazni JSON → očekivani XML / očekivane vrijednosti
   PDF polja, u `core/__golden__/`.
6. **Pravilo koje se ne krši: aplikacija nikad ne smije biti jedini put do
   predaje.** Dugme "Skini XML" i "Skini WH-347 PDF" postoje od prvog dana i rade
   i kad je sve ostalo pokvareno. To je cijeli plan oporavka od katastrofe.

## 2. Ritam predaje (ispravka prve verzije)

Ovo je pogrešno stajalo u prvoj verziji speca i mijenja podsjetnike, kontrolnu
tablu i marketing.

| | NY (Article 8, NYSDOL portal) | Federalno (Davis-Bacon) |
|---|---|---|
| Šta se predaje | XML fajl, **jedan projekat, jedna sedmica po fajlu** | WH-347 (ili ekvivalent) sedmično |
| Kada | **najmanje svakih 30 dana.** Prvi rok = `start_date` + 30. Svaki sljedeći = datum zadnje **prihvaćene** predaje + 30 (`last_accepted_submission_at`). Ovo je jedina definicija; 03, 04, 07 i 17 je referišu. | **u roku od 7 dana** od datuma isplate (29 CFR 3.4(a)) |
| Kašnjenje | poslije **14 dana** preko roka: **100 $ po danu** | agencija i GC traže odmah; zadržavanje isplate |
| Trenutno stanje | NYSDOL javno kaže da **privremeno ne izriče kazne** dok se izvođači naviknu. Nedatirano. Ne graditi marketing na tome. | |
| Prozor za izmjenu | portal dozvoljava izmjenu do **44 dana** od početka projekta (podignuto s 30) | |

Praktično za proizvod: **sedmični artefakt, mjesečni državni rok, sedmični
federalni rok.** Kupac svake sedmice pravi fajl, a upload u portal radi u paketu
od 4 do 5 fajlova unutar svakog 30-dnevnog prozora. Kontrolna tabla mora
prikazivati oba brojača: "sedmica 12.9. nije zatvorena" i "12 dana do 30-dnevnog
roka za PRC 2026004512".

## 3. NY XML

### 3.1 Šta je zvanično potvrđeno

- Portal: `https://mpwr-public.labor.ny.gov`, ulazna stranica
  `https://dol.ny.gov/Electronic-Payroll`. Obavezan od 1.1.2026, prve predaje do
  30.1.2026.
- **XSD postoji i objavljen je**: `https://dol.ny.gov/certpayrollxsd` (fajl
  `NYDOL_CertPayroll.xsd`). Primjer XML-a: `https://dol.ny.gov/certpayrollsamplexml`.
  Uputstvo za grupni upload:
  `https://dol.ny.gov/certified-payroll-bulk-upload-formatting-guide`.
- **Nisam mogao skinuti sam XSD** (domen je blokiran za moj sandbox, fajl se
  servira kao binarni download). Struktura ispod je iz zvaničnog uputstva za
  grupni upload, koje je polje po polje ogledalo XSD-a. **Prije pisanja buildera
  Mume skida XSD i primjer i stavlja ih u `packages/core/src/ny/schema/`**
  (spec/12 korak 0). Builder se testira `xmllint --schema`.
- **Nema API-ja ni SFTP-a.** Doslovno iz uputstva: "an API for the Certified
  Payroll portal is not available at this time". Upload je ručan, kroz web
  portal. Ovo je trajno ograničenje proizvoda, ne privremeno.
- **Samo XML.** Nema CSV ni Excel uploada.
- **Najviše 500 zapisa radnika po fajlu.**
- **Jedan fajl = jedan projekat + jedna sedmica.**
- **Upload ide samo u praznu sedmicu.** Uputstvo: fajl se može uploadovati samo
  za sedmice koje nemaju unesenih zapisa; ako je sedmica ručno započeta, mora se
  dovršiti ručno ili obrisati. **Nema spajanja i nema ponovnog uploada preko
  postojećeg.** Ispravka poslije uploada radi se ručno u portalu.
- Greške validacije portal prijavljuje s brojem linije i pozicije znaka u fajlu.
- Ograničenje veličine fajla u MB: **nije objavljeno.**

### 3.2 Struktura (iz zvaničnog uputstva)

Nivo, obaveznost i ograničenja su iz uputstva. Redoslijed elemenata mora se
potvrditi u XSD-u prije prve predaje.

```
ProjectRollup                             obavezno, korijen
  prcNumber                               obavezno
  weekEndingDate                          obavezno, ISO s vremenom: 2026-09-12T12:00:00.000Z
  employeeWorkWeeks                       obavezno, kontejner
    employeeWorkWeek                      obavezno, najviše 500
      employee                            obavezno
        firstName                         obavezno, do 45
        middleName                        opciono, do 45
        lastName                          obavezno, do 45
        dateOfBirth                       uslovno   \ tačno jedno od ova dva
        ssnLast4                          uslovno   /
        nysRegisteredApprentice           obavezno, boolean
        address                           obavezno
          address1                        obavezno, do 42
          address2                        opciono, do 42
          city                            obavezno, do 40
          state                           obavezno, do 50
          postalCode                      obavezno, 5 cifara
          postalCodeExt                   opciono, 4 cifre
          country                         opciono, do 50
      deductionGrossEarnings              obavezno, do 999.999,99
      netWages                            obavezno, do 999.999,99
      workWeeks                           obavezno
        workWeek                          obavezno, jedan po klasifikaciji
          workCategory                    obavezno, do 300, doslovno iz zvanične liste
          stHourlyRate                    obavezno, do 9.999,99
          otHourlyRate                    obavezno, do 9.999,99
          days                            obavezno
            day                           obavezno, YYYY-MM-DD, najviše 7
            standardTimeHours             obavezno, do 24,00
            overTimeHours                 obavezno, do 24,00
      deductions                          opciono, najviše 10
        deduction
          type                            do 50
          amount
      supplementalPayments                OBAVEZNO, najviše 50
        supplementalPayment               opciono
          type                            obavezno, enum (dolje)
          explanation                     obavezno ako je type "Other Benefit"
          standardHourlyRate              obavezno, do 9.999,99
          overtimeHourlyRate              obavezno, do 9.999,99
```

Razlike u odnosu na prvu verziju speca, da se ne prepiše stara pretpostavka:
- `stHourlyRate` i `otHourlyRate`, ne `standardRate`/`overtimeRate`.
- `middleName` (do 45 znakova), ne inicijal.
- `weekEndingDate` je puni ISO timestamp, ne datum.
- Adresa je razložena na `address1/address2/city/state/postalCode/postalCodeExt/country`.
- `nysRegisteredApprentice` je obavezan boolean na svakom radniku.
- Dodatak (supplement) **nije** polje na `workWeek` nego zaseban blok
  `supplementalPayments` na nivou radnika, s odvojenom redovnom i prekovremenom
  satnicom po vrsti.
- `supplementalPayments` je **obavezan kontejner** (može biti prazan, ali element
  mora postojati).
- `deductions` su opcione, najviše 10.

### 3.3 Enum vrijednosti `supplementalPayment/type`

```
Health/Welfare
Vacation/Holiday
Apprenticeship/Training
Pension
Other Benefit
```

NEPROVJERENO: uputstvo na jednom mjestu piše `Other Benefit (Type)`, a na drugom
`Other Benefit`. Tačan token uzeti iz XSD-a (spec/13 A3). Kad je tip
`Other Benefit`, polje `explanation` je obavezno.

Ovo mijenja enum `supplement_kind` u 04: vrijednosti su
`health_welfare, vacation_holiday, apprenticeship_training, pension, other`, a u
XML se ispisuju gornji stringovi.

### 3.4 Šta se unosi u portalu, a nije u fajlu

- ID izvođača: **FEIN** i **NYS contractor registration number** s Certificate of
  Contractor Registration (Labor Law §220-i). Nema zasebnog "portal ID-a".
- Redni broj izvještaja.
- **Sedmica bez rada.** Ovo je važno: no-work sedmica se **ne može predati
  XML-om.** U portalu se čekira "No Work Week", ili se dani unesu s 0 sati, ili se
  koristi "Enter Work Pause Dates" za više sedmica odjednom. Obaveza postoji:
  NYSDOL izričito traži prijavu sedmica bez rada.
- Završni izvještaj i potvrda izjave.

Proizvod zato ima ekran "Predaja" koji za svaku sedmicu pokaže tačno šta se
prepisuje u portal, a za no-work sedmice ne pravi XML nego uputstvo i podsjetnik.
Naša tabela `work_pauses` preslikava portalov "Work Pause Dates".

### 3.5 Pravila mapiranja iz snapshota

| XML polje | Izvor | Pravilo |
|---|---|---|
| prcNumber | projects.prc_number | Bez razmaka, kako piše u odluci o nadnicama. |
| weekEndingDate | payroll_periods.week_ending | ISO s vremenom, podne UTC, kako uputstvo pokazuje. |
| employeeWorkWeek | payroll_lines, jedan po radniku | Radnik bez ijednog sata se ne uključuje. |
| ssnLast4 / dateOfBirth | worker_pii | Ako postoji ssn_last4, šalje se on i DOB se izostavlja. Oboje → šalje se ssn_last4, nalaz SSN4_AND_DOB (info; hard uz strict_pii). Nijedno → tvrda greška WORKER_ID_MISSING. |
| address* | worker_pii (dešifrovano) | Svi obavezni dijelovi. Dužine se validiraju na unosu, ne tek ovdje. Piše pii_access_log. |
| nysRegisteredApprentice | workers.level = RA i važeći apprentice_record | Boolean. |
| workCategory | classification_catalog.official_label | Nikad display_label. Provjera da string postoji u katalogu je tvrda. |
| stHourlyRate / otHourlyRate | payroll_lines.classification_breakdown | Stvarno plaćena stopa, ne WD minimum. OT stopa po OT kodu klasifikacije (01 §2.1). |
| day.standardTimeHours / overTimeHours | motor, po danu | Zbir svih klasifikacija za isti dan ≤ 24. |
| deductionGrossEarnings | payroll_lines.gross_all_work | Bruto za sav rad te sedmice, ne samo ovaj projekat. |
| netWages | payroll_lines.net_pay | Provjera: gross_all_work minus zbir odbitaka = net_pay (tolerancija 0,01). |
| deductions | payroll_deductions | Najviše 10; preko toga spajanje u "Other" uz meko upozorenje, ili tvrda greška ako je spajanje isključeno. |
| supplementalPayments | payroll_supplements | Po vrsti, s redovnom i prekovremenom satnicom. Prekovremena satnica dodatka je ista kao redovna osim uz OT kod V ili W. |

### 3.6 Tehnički detalji buildera

- Biblioteka: `xmlbuilder2`. Kodiranje UTF-8, bez BOM-a.
- Decimale: dvije za novac i sate. Zaokruživanje half-up, nikad bankersko.
- Redoslijed elemenata tačno kao u XSD-u. Builder ima jednu funkciju po elementu,
  bez generičkog "objekat u XML".
- Validacija u dva sloja: naš validator (poruke razumljive kupcu) pa
  `xmllint --noout --schema NYDOL_CertPayroll.xsd out.xml` (poruke za nas). Ako
  xmllint padne a naš validator nije, to je bug: dodaj pravilo.
- **Prevođenje portalovih grešaka.** Portal vraća grešku s brojem linije i
  pozicije. Ekran predaje ima polje "Zalijepi grešku iz portala" koje mapira
  liniju u konkretnog radnika i polje i kaže šta popraviti. Ovo je jedna od
  najvrednijih sitnica u proizvodu; konkurencija ostavlja kupca s kriptičnom
  porukom.
- Više od 500 radnika: tvrda greška OVER_500_WORKERS. Dijeljenje fajla tek kad se
  potvrdi da portal prima više fajlova za istu sedmicu (spec/13 A7).
- Ime fajla: `{prc}_{week_ending}_v{version}.xml`.

### 3.7 Testovi

- Golden testovi iz 01 §5, svaki daje i XML.
- Test "XSD prolazi" nad svima.
- Test "isti ulaz, isti bajtovi".
- Test "workCategory nije u katalogu" → tvrda greška prije pisanja.
- Test dužina: address1 43 znaka → tvrda greška na unosu, ne u builderu.
- Test 11 odbitaka → spajanje ili greška po postavci.

## 4. WH-347 PDF (federalni obrazac)

### 4.1 Zvanično stanje obrasca

- **Revizija januar 2025**, OMB 1235-0008, važi do 31.1.2028.
- PDF: `https://www.dol.gov/sites/dolgov/files/WHD/legacy/files/wh347.pdf`
- Uputstvo: `https://www.dol.gov/agencies/whd/forms/wh347`
- Upotreba samog obrasca je opciona, ali sedmična predaja podataka nije.
- **8 redova radnika po strani.** Uputstvo: ako ima više od 8 stavki, red 1 na
  strani 2 je stavka 9, red 1 na strani 3 je stavka 17, i tako dalje.

### 4.2 Kolone na strani 1 (tačan redoslijed)

```
(1A) Worker Entry No.
(1B) Worker Last Name
(1C) Worker First Name
(1D) Worker Middle Initial
(1E) Worker Identifying No.
(2)  J/RA Classification
(3)  Labor Classification
(4)  Days of Work / Dates
(5)  Total Hours Worked
(6A) Hourly Wage Rate
(6B) Total Fringe Benefit Credit
(6C) Payment in Lieu of Fringe Benefits
(7A) Gross Amt Earned
(7B) Gross Amt for All Work
(8)  Deductions
(9)  Net Pay
```

Redizajn 2025. je razdvojio ime radnika na 1B do 1D, uveo kolonu **(2) J/RA** za
majstora ili registrovanog pripravnika, i razdvojio fringe kredit (6B) od
gotovine umjesto fringea (6C). Stari predlošci s interneta se ne koriste.

### 4.3 Mapiranje

| Polje | Izvor | Pravilo |
|---|---|---|
| 1A | redni broj u izvještaju | 1 do 8 po strani, nastavlja se na sljedeću. |
| 1B, 1C, 1D | workers | |
| 1E Worker Identifying No. | worker_pii.ssn_last4 | Format `XXX-XX-1234`. Puni SSN se nikad ne štampa (29 CFR 5.5(a)(3)(ii)(B)). Adresa radnika **ne ide** na obrazac. |
| (2) J/RA | workers.level | `J` ili `RA`. |
| (3) Labor Classification | project_classifications.display_label | |
| (4) Days / Dates | motor | 7 kolona: prva = week_ending minus 6 dana, zadnja = week_ending. U zaglavlje se upisuje dan u mjesecu. Gornji red O (prekovremeni), donji S (redovni). |
| (5) Total Hours | Σ po redu | |
| (6A) Hourly Wage Rate | ST stopa | |
| (6B) Total Fringe Benefit Credit | kredit iz planova po satu | |
| (6C) Payment in Lieu | gotovina umjesto fringea po satu | Odvojeno od 6B, ne kao razlomak kao u starom obrascu. |
| (7A) Gross Amt Earned | bruto na ovom projektu | |
| (7B) Gross Amt for All Work | bruto za sav rad | Ako su jednaki a radnik ima druge projekte, meko upozorenje. |
| (8) Deductions | payroll_deductions | Razloženo koliko stane; ostatak u "Other" i navesti u Remarks. |
| (9) Net Pay | net_pay | |

Podaci u zaglavlju strane 2: `PROJECT NAME`, `PROJECT NO. or CONTRACT NO.`,
`PAYROLL NO.`, `PRIME CONTRACTOR'S/SUBCONTRACTOR'S BUSINESS NAME`,
`PROJECT LOCATION`, `WEEK ENDING DATE`, `CERTIFYING OFFICIAL's NAME AND TITLE`.

### 4.4 Izjava o usklađenosti, strana 2 (tačan tekst)

Uvod: *"I paid or supervised the payment of the laborers or mechanics working on
the above project during the stated time period. I certify the following:"*

Šest numerisanih kućica, doslovno:

1. "The payroll information submitted with this statement is correct and complete
   for the above project during the above period, and the wage and fringe benefit
   rates paid to the workers, including credit taken for the reasonably
   anticipated costs of a bona fide fringe benefit plan, fund or program, are not
   less than the applicable wage and fringe benefits rates for the
   classification(s) of work actually performed, as specified in the wage
   determination(s) incorporated into the contract."
2. "All regular payrolls and all other basic records that the contractor is
   required to maintain for this payroll period are complete and accurate and will
   be made available upon request from the agency or the Department of Labor."
3. "The classifications reported for each laborer or mechanic are the
   classification(s) of work that each worker actually performed."
4. "Any workers paid as apprentices during the above period are duly registered in
   a bona fide apprenticeship program registered with the Office of Apprenticeship,
   Employment and Training Administration, United States Department of Labor
   (\"OA\"), or a State Apprenticeship Agency (\"SAA\") recognized by Department of
   Labor. I have verified the registered apprenticeship program information
   provided below as accurate and applicable to any apprentices identified on page
   1 of this form."
5. "Fringe benefits have been paid in cash and/or to bona fide fringe benefit
   plans, funds, or programs. Where the contractor is claiming an hourly credit for
   their contributions to or reasonably anticipated costs of a bona fide fringe
   benefit plan, fund, or program, provide plan information and the hourly credit
   claimed for each worker listed on the previous page of this form."
6. "All workers on the project have been paid the full weekly wages earned, and no
   rebates or deductions have been or will be made either directly or indirectly,
   other than permissible deductions as defined in 29 CFR part 3."

**Koje se čekiraju:** 1, 2, 3 i 6 uvijek. 4 samo ako su na izvještaju pripravnici.
5 samo gdje postoje beneficije. Motor to izvodi iz podataka i pokazuje korisniku
zašto je svaka kućica čekirana ili nije.

Slijedi `ADDITIONAL REMARKS`, pa potpisni blok
`SIGNATURE OF CERTIFYING OFFICIAL | DATE | TELEPHONE NUMBER | EMAIL ADDRESS`, pa
upozorenje o krivičnoj odgovornosti (18 U.S.C. 1001, 31 U.S.C. 3729) i o tome da
podaci mogu biti objavljeni po FOIA zahtjevu. Taj tekst se prikazuje korisniku u
cijelosti prije potpisa.

### 4.5 Elektronski potpis

Zvanično uputstvo WH-347: *"Legally valid electronic signatures are acceptable. A
legally valid electronic signature includes any electronic process that indicates
acceptance of the certified payroll record and includes an electronic method of
verifying the signer's identity."* I izričito: *"Photocopies or scanned copies of
signatures do not satisfy this requirement."* Isto u 29 CFR 5.5(a)(3)(ii)(E).

Naš potpis zato **nije slika**. U polje potpisa ide:

```
/s/ Mirza Hodzic
Electronically signed 2026-09-14 09:12 ET via WeeklyCert
Identity verified by password and time-based one-time code
Record id 018f2c...  SHA-256 3f9a...c2
```

To je "electronic process that indicates acceptance" plus "method of verifying the
signer's identity", što je tačno ono što propis traži. Slika potpisa bi bila
gora, ne bolja.

### 4.6 Tehnički detalji

- `pdf-lib` učitava zvanični PDF iz `core/federal/wh347-2025.pdf`, kopira strane za
  svakih 8 radnika, popunjava AcroForm polja, `form.flatten()` na kraju.
- **Prvi zadatak**: `scripts/dump-pdf-fields.ts` ispiše sva imena polja iz
  zvaničnog PDF-a u `core/federal/wh347-fields.json`. Mapiranje iznad koristi
  logičke nazive dok se ne dobiju stvarni (spec/13 A8b).
- Font Helvetica 8 pt, automatsko smanjenje po dužini.
- Metapodaci: Title "WH-347 {firma} {week_ending}", Producer "WeeklyCert",
  CreationDate = generated_at.
- Uz PDF se pravi `wh347-values.json` sa svim vrijednostima polja; testovi idu
  preko njega, ne preko piksela.

### 4.7 Testovi

- Golden testovi → očekivane vrijednosti polja.
- Test "9 radnika → 2 strane, stavka 9 je prvi red druge strane".
- Test "dvije klasifikacije → dva reda, isti radnik, redni brojevi 1A rastu".
- Test "adresa radnika se ne pojavljuje nigdje u PDF tekstu".
- Test "puni SSN se ne pojavljuje": regex `\d{3}-\d{2}-\d{4}` smije se pojaviti
  samo u obliku `XXX-XX-nnnn`.
- Test "kućice 1,2,3,6 uvijek čekirane; 4 samo s pripravnikom; 5 samo s fringeom".

## 5. Paket za glavnog izvođača (bundle_zip)

Većina podizvođača šalje WH-347 glavnom izvođaču emailom ili ga uploaduje u
LCPtracker, eMars ili B2Gnow. Pravimo ZIP:
- `WH347_{firma}_{week_ending}.pdf`
- `NY_{prc}_{week_ending}.xml` (ako ny_reporting)
- `Cover_{week_ending}.pdf`: jedna strana, ko, koji projekat, koja sedmica, redni
  broj, kontakt, "generisano WeeklyCert".
- Opciono `WorkerAddresses_{week_ending}.pdf` ako glavni izvođač traži adrese
  (posebno dugme, posebno logovanje).

Dugme "Pošalji glavnom izvođaču" šalje email kroz Resend sa ZIP-om u prilogu (do
10 MB) na `prime_contractors.contact_email`, kopiju kupcu, i piše `submissions` s
kanalom email_to_prime.

## 6. Arhiva i izvoz

- Arhiva prikazuje `reports` sa statusom final i superseded, po projektu i godini.
- "Izvezi godinu" pravi ZIP svih finalnih izvještaja + CSV indeks (project,
  week_ending, payroll_no, version, sha256, signed_by, signed_at).
- "Izvezi sve podatke firme" (vlasnik, pri otkazu): svi izvještaji + CSV svih
  tabela firme, PII dešifrovan, ZIP šifrovan lozinkom koju vlasnik unese, link
  važi 7 dana.

## 7. Šta je izričito izvan opsega

- Automatski upload u NY portal. **Nema API-ja, potvrđeno zvanično.** Kupac
  uploaduje XML ručno; mi bilježimo potvrdu.
- Sedmice bez rada kroz XML. Portal to ne prima; radi se u portalu.
- **NYC.** Javni radovi grada Njujorka i iskopi na kolovozu idu kroz zaseban
  gradski sistem (`nyc-oti.ecomply.us`), ne kroz NYSDOL portal. To je zasebna
  integracija i **pitanje u kvalifikaciji kupca**, ne otkriće na peti dan
  postavke. MVP pokriva NY državu izvan NYC sistema.
- Automatski upload u LCPtracker i slične (API imaju samo glavni izvođači).
- Obrasci drugih država (NJ MW-562, CA A-1-131) dok NY ne bude profitabilan.
- Crtanje WH-347 iz nule. Samo popunjavanje zvaničnog.
