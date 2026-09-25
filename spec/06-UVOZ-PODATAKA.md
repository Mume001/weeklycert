# 06. Uvoz podataka (CSV / XLSX iz platnih i evidencionih sistema)

Uvoz je drugi najvažniji ekran poslije mreže sati. Kupac koji ima 30 radnika neće
kucati 180 brojeva svake sedmice. Ako uvoz radi glatko, kupac ostaje. Ako ne radi,
kupac se vraća na Excel.

---

## 1. Šta kupci stvarno imaju (istraženo)

| Izvor | Šta izvoze | Oblik | Napomena |
|---|---|---|---|
| QuickBooks Time (ex TSheets) | Payroll report, Time entries | CSV, XLSX | Kolone: Employee, Date, Job/Customer, Service item, Hours, Notes. Job code se može mapirati u klasifikaciju. |
| QuickBooks Online Payroll | Payroll summary, Paycheck list | CSV, PDF | Daje bruto, odbitke, neto po radniku po periodu. Nema sate po danu. |
| ADP Run / Workforce Now | Payroll register, Time & attendance | CSV, XLSX | Kolone različite po klijentu; potrebno mapiranje. |
| Gusto | Payroll journal, Time off & hours | CSV | Solidan, ali sati bez datuma po danu osim ako se koristi Gusto Time. |
| Paychex Flex | Payroll journal, Time export | CSV, XLSX | |
| Excel ručno | Šta god | XLSX | Najčešće kod firmi ispod 10 radnika. |
| busybusy | Time entries, Payroll report | CSV, XLSX | Popularan kod građevine, GPS evidencija. Kolone: Employee, Date, Cost Code, Hours. |
| ClockShark | Timesheet export | CSV | Slično, s job i task kolonama. |

Papirni timesheet (slika) je van opsega u MVP-u; kasnije OCR uz obavezan pregled.

Dva različita uvoza u praksi:
- **Sati po danu** (iz evidencije vremena): radnik, datum, sati, klasifikacija ili
  job code. Ovo puni `time_entries`.
- **Obračun** (iz platnog sistema): radnik, bruto za sav rad, odbici po vrsti,
  neto. Ovo puni `payroll_lines.gross_all_work`, `net_pay` i
  `payroll_deductions`.

Kupac obično uvozi oboje: sate s jednog mjesta, odbitke s drugog. Zato su to dvije
vrste uvoza (`import_kind`: hours, payroll), plus treća, jednokratna, `workers`
(§5). Svaka ima svoj profil mapiranja.

## 2. Tok od 4 koraka (ekran /app/[t]/imports/new)

### Korak 1: Fajl
- Drag and drop ili odabir. Prihvata `.csv`, `.tsv` i `.xlsx` do 10 MB. Stari
  `.xls` se odbija s porukom da se sačuva kao `.xlsx` ili `.csv`: `exceljs`
  (09) ga ne čita, a druga biblioteka nije vrijedna jednog formata (Mume,
  26.9.2026).
- Detekcija: kodiranje (UTF-8, UTF-8 BOM, Windows-1252), razdvajač (`,` `;` tab),
  ima li zaglavlje, format datuma (uzorkuje 20 redova: MM/DD/YYYY, YYYY-MM-DD,
  M/D/YY).
- XLSX: uzima se prvi list ili se pita koji, ako ih ima više. Formule se čitaju
  kao vrijednosti.
- Fajl ide u S3 kao `import_source`, pravi se `import_batches` red `uploaded`.
- Ako je fajl već uvezen (isti sha256 za istu firmu), upozorenje "isti fajl već
  uvezen 12.9." s opcijom da se nastavi.

### Korak 2: Mapiranje
- Lijevo naša polja, desno padajući izbor kolona iz fajla, s uzorkom prva 3 reda.
- Za `hours`: obavezno **radnik**, **datum**, **sati**; opciono klasifikacija ili
  job code, projekat, ST/OT odvojeno, napomena.
- Za `payroll`: obavezno **radnik**, **bruto**; opciono neto, i po jedna kolona
  po vrsti odbitka (federal, state, FICA, medicare, union...); ili "dugi" format
  (radnik, vrsta, iznos) koji se prepozna automatski.
- Automatsko predlaganje po nazivu kolone (rječnik sinonima: "Employee",
  "Worker", "Name", "Emp Name" → radnik; "Hrs", "Hours", "Reg Hours" → sati...).
- Ako postoji sačuvani profil s istim zaglavljem (hash sortiranih naziva
  kolona), učitava se odmah i korak 2 je jedan klik "Potvrdi".
- Podešavanja: kako se prepoznaje radnik (`worker_number`, puno ime "Prezime,
  Ime", puno ime "Ime Prezime", email), format datuma, da li su sati decimalni
  (7.5) ili h:mm (7:30).
- "Sačuvaj kao profil": naziv, ide u `import_profiles`.

### Korak 3: Provjera
- Tabela svih redova s bojom: zeleno OK, žuto upozorenje, crveno greška.
- Greške koje blokiraju red: radnik nije pronađen, datum nečitljiv, sati nečitljivi
  ili > 24, klasifikacija nepoznata a nema podrazumijevane.
- Upozorenja: datum izvan izabrane sedmice (red se preskače uz obavijest), sati >
  16 u danu, radnik neaktivan, duplikat reda u fajlu, red već postoji u bazi
  (biće prepisan).
- Za "radnik nije pronađen": inline izbor postojećeg radnika ili "Kreiraj
  radnika" (samo ime; ostalo kasnije). Mapiranje imena se pamti u
  `import_profiles.worker_aliases` (jsonb: {"J. Doe": worker_id}).
- Za "klasifikacija nepoznata": inline izbor iz project_classifications; pamti se
  u `import_profiles.code_map` ({"ELEC-J": project_classification_id}).
- Brojevi na vrhu: ukupno, OK, upozorenja, greške. Dugme "Primijeni" aktivno samo
  kad greške = 0 ili kad korisnik označi "preskoči redove s greškom".

### Korak 4: Usklađivanje i primjena
- Za `payroll` uvoz prvo **usklađivanje**: tabela po radniku "bruto iz fajla" vs
  "bruto koji motor računa s ovog projekta" i vs "bruto za sav rad iz prethodne
  sedmice", s razlikom i bojom. Ovo je najčešća žalba na konkurenciju ("nije
  prenio sve plate"), pa se razlika mora vidjeti prije potvrde. Za `hours` uvoz
  usklađivanje je zbir sati po radniku vs prethodna sedmica (samo informativno).
- Dugme "Potvrdi uvoz", pa transakcija: piše `time_entries` (upsert po jedinstvenom ključu period +
  radnik + klasifikacija + datum; `source = import`, `import_row_id`), ili
  `payroll_lines.gross_all_work` / `net_pay` / `payroll_deductions`.
- Poslije primjene motor rekalkuliše pogođene periode.
- Sažetak: "Uvezeno 148 redova za 24 radnika, sedmica 12.9., 3 reda preskočena".
  Link na mrežu sati.
- `import_batches.status = applied`. Redovi ostaju 90 dana radi "Poništi uvoz"
  (briše entries s tim import_row_id ako period nije zaključan).

## 3. Pravila parsiranja (u `core/import/`, čiste funkcije, testirane)

- Imena: trim, spajanje višestrukih razmaka, poređenje bez velikih slova i
  dijakritika; "Doe, John" i "John Doe" se normalizuju na isto; srednje slovo
  ignorisano pri poređenju ali sačuvano.
- Sati: prihvata `7.5`, `7,5`, `7:30`, `7h30`, `7.50 hrs`. Rezultat numeric(5,2).
  Negativno → greška. Prazno → 0 i red se preskače ako nema sati.
- Datum: format iz profila; ako ne prolazi, pokušaj ISO; ako ne, greška. Dvocifrena
  godina → 20xx.
- Novac: uklanja `$`, razmake, zareze hiljada; zagrade ili minus su negativno.
- Klasifikacija: prvo `code_map` iz profila, pa `classification_catalog.aliases`,
  pa trigram sličnost ≥ 0,85 kao prijedlog (nikad automatski).
- Duplikati u fajlu (isti radnik, datum, klasifikacija): sabiraju se uz upozorenje,
  osim ako profil kaže "posljednji pobjeđuje".
- CSV formula injection: svaka ćelija koja počinje s `=`, `+`, `-`, `@`, tab ili
  CR se čuva kao tekst s prefiksom `'` u našim izvozima i nikad se ne evaluira.
- Veličina: do 50.000 redova po fajlu; parsiranje u workeru ako fajl > 2.000
  redova (ekran čeka s progres trakom).

## 4. Bezbjednost uvoza

- Fajl se skenira tipom sadržaja (magic bytes), ne ekstenzijom. XLSX se otvara
  s `exceljs` u strogom režimu; makroi (.xlsm) odbijeni.
- Fajl se nikad ne izvršava, ne otvara u LibreOffice ni sličnom.
- Izvorni fajl se čuva 90 dana (dokaz šta je kupac poslao), pa se briše poslom;
  kupac ga može obrisati ranije.
- Ako fajl sadrži kolonu koja liči na puni SSN (regex `\d{3}-\d{2}-\d{4}` ili 9
  cifara u koloni nazvanoj SSN), uvoz **odbija** da tu kolonu mapira, prikazuje
  upozorenje "ne čuvamo pune SSN brojeve; uvozimo samo zadnje 4 cifre" i nudi
  automatsko skraćivanje na 4 cifre pri mapiranju u `ssn_last4`. Original fajl s
  punim SSN se u tom slučaju **ne čuva** (briše se odmah poslije parsiranja) i to
  se kaže korisniku.

## 5. Uvoz radnika (jednokratno, u onboardingu)

Poseban, jednostavniji tok: CSV s kolonama ime, prezime, broj radnika, klasifikacija,
grad, država, ZIP, zadnje 4 SSN, datum rođenja (opciono), nivo (J/RA), procenat
pripravnika. Adresa (ulica) se unosi ručno ili iz istog fajla; ide u šifrovanu
kolonu. Isti korak 3 s provjerom, pa upsert u `workers` i `worker_pii`.

## 6. Šablon za kupce koji nemaju izvoz

`/templates/weeklycert-hours.xlsx` i `weeklycert-payroll.xlsx`: naši šabloni s
validacijom ćelija (padajuće liste radnika i klasifikacija se generišu po firmi
na dugme "Preuzmi šablon za ovu sedmicu", s već upisanim datumima). Kupac popuni
i uploaduje; profil je ugrađen pa nema mapiranja.

## 7. Kasnije (ne sada)

- Direktne integracije: QuickBooks Time API (OAuth), Gusto API, ADP Marketplace.
  Svaka traži partnerski program i sedmice rada; raditi tek kad 5 kupaca traži
  istu.
- Email-to-import: kupac proslijedi izvještaj na `import+{token}@getweeklycert.com`.
- OCR papirnih timesheeta.

## 8. Testovi

- Parseri: 40 primjera fajlova u `core/import/__fixtures__/` (po 5 za svaki od 8
  izvora iz tabele 1, uključujući Windows-1252, `;` razdvajač, h:mm sate, "Prezime,
  Ime"). **NEPROVJERENO (13 A16):** dok u `izvori/` nema stvarnih izvoza, fajlove
  pravi deterministička skripta po kolonama iz tabele 1; stvarni izvozi ih
  zamjenjuju kad stignu.
- Test formula injection.
- Test punog SSN u fajlu → kolona odbijena, fajl nije sačuvan.
- Test idempotentnosti: isti fajl dva puta → isti entries, bez duplikata.
- Playwright: cijeli tok od uploada do mreže sati na mock podacima.
