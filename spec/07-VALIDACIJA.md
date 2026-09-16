# 07. Validacija (nalazi, kodovi, poruke)

Validacija je ono što kupac vidi u desnom panelu mreže sati i ono što odlučuje da
li se izvještaj smije generisati. Svaki nalaz ima kod, težinu, poruku razumljivu
kancelarijskom radniku, i prijedlog popravke. Motor vraća listu nalaza; UI ih
samo prikazuje. Nikad se poruke ne sastavljaju u UI-ju.

---

## 1. Težine

| Težina | Značenje | Ponašanje |
|---|---|---|
| `hard` | Izvještaj bi bio odbijen ili netačan | Generisanje blokirano. Crveno. Ne može se potvrditi. |
| `soft` | Vjerovatno greška, ali može biti namjerno | Generisanje dozvoljeno tek kad korisnik klikne "Razumijem" uz nalaz. Žuto. Potvrda se loguje s korisnikom i vremenom. |
| `info` | Obavještenje | Sivo. Ne blokira. |

## 2. Oblik nalaza

```ts
type Finding = {
  code: string            // stabilan, UPPER_SNAKE, nikad se ne mijenja
  severity: 'hard' | 'soft' | 'info'
  message: string         // jedna rečenica, jezik kupca
  detail?: string         // druga rečenica, zašto
  suggestedFix?: string   // šta da uradi
  workerId?: string
  workDate?: string       // YYYY-MM-DD
  classificationId?: string
  field?: string          // koje polje u mreži da se fokusira
  rule?: string           // referenca (29 CFR 5.32, Labor Law 220)
}
```

## 3. Katalog nalaza

### 3.1 Sati

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| DAY_OVER_24 | hard | zbir sati radnika u danu > 24 | "John Doe ima 26 sati 9.9. Dan ima 24." |
| DAY_OVER_16 | soft | zbir > 16 | "John Doe ima 17 sati 9.9. Provjeri da nije greška u kucanju." |
| NEGATIVE_HOURS | hard | sati < 0 | |
| DATE_OUTSIDE_WEEK | hard | work_date izvan perioda | Ne bi trebalo biti moguće kroz UI; štiti od uvoza. |
| NO_HOURS_NOT_MARKED | soft | period ima 0 sati a nije no_work | "Nema unesenih sati. Ako nije bilo rada, označi 'Sedmica bez rada'." |
| NO_WORK_WITH_HOURS | hard | is_no_work = true a ima sati | |
| WORKER_INACTIVE | soft | sati za radnika status inactive | |
| WORKER_NO_CLASSIFICATION | hard | unos bez klasifikacije | |
| CLASSIFICATION_NOT_ON_PROJECT | hard | klasifikacija nije u project_classifications za taj datum | "Klasifikacija 'Laborer' nema stopu na ovom projektu za 9.9. Dodaj je u Klasifikacije." |
| OT_SPLIT_MISMATCH | hard | st_override + ot_override ≠ hours | |
| OT_FEDERAL_UNDERCOUNT | hard | federal_reporting, `federal_ot_enabled` i Σ ST > 40 | "Više od 40 redovnih sati sedmično. Višak mora biti prekovremeni." |
| OT_NY_CODE | hard | ny_reporting i sati prekoračuju prag nekog OT koda klasifikacije (01 §2.1) | "Electrician nosi OT kod B: prekovremeni poslije 8 sati dnevno. Uto 8.9. ima 9 redovnih." |
| OT_NY_CODE_MISSING | hard | ny_reporting i klasifikacija nema nijedan OT kod | "Za Electrician nije unesen OT kod s platne tabele. Bez njega ne mogu tačno računati prekovremene." |
| OT_NY_WEEKEND | hard | OT kod nosi E/F/L/M/O i sati subotom ili nedjeljom uneseni kao ST | |
| OT_NY_MAKEUP_DAY | info | kod E2, E3 ili E4 i rad vikendom po redovnoj stopi | "Kod E2 dozvoljava subotu kao nadoknadu po redovnoj stopi kad je dan izgubljen zbog vremena. Ako je tako, ovo je uredu." |
| OT_NY_SUPPLEMENT_PREMIUM | info | kod V ili W | "Kod W: beneficije se za prekovremene sate plaćaju s premijom 1,5." |
| HOLIDAY_RULE_UNKNOWN | soft | dan označen kao praznik a legenda praznika nije unesena | "You marked Jul 4 as a holiday, so we applied the {x} premium that code {code} requires. The holiday list for this wage schedule is not in the system, so check the HOLIDAY PAGE of your schedule and confirm that Jul 4 is on it." Nalaz mora reći **koji je multiplikator primijenjen i po kojem kodu**, jer se na osnovu njega isplaćuje novac. |

### 3.2 Stope i beneficije

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| RATE_BELOW_WD | hard | `paid_base_rate` < `wd_base_rate` | "Stopa 28,00 $ je ispod odluke o nadnicama 31,50 $ za Electrician." |
| OT_RATE_BELOW_1_5 | hard | OT stopa < 1,5 × ST stopa (federalno) ili < NY OT kod | |
| OT_RATE_INCLUDES_FRINGE | soft | OT stopa = 1,5 × (ST + fringe) tačno | "Prekovremeni izgleda računat na osnovicu s beneficijom. Pravilo: 1,5 × osnovna + beneficija." |
| FRINGE_SHORTFALL | hard | kredit + gotovina < wd_fringe_rate | "Beneficije: odluka traži 10,00 $/h, obezbjeđeno 6,00 $ u plan. Manjak 4,00 $/h mora u gotovini." |
| FRINGE_LEGALLY_REQUIRED | hard | plan s is_legally_required korišten kao kredit | "FICA i osiguranje od povreda nisu beneficija po zakonu. Ukloni iz plana." |
| FRINGE_NOT_ANNUALIZED | soft | plan ima annual_cost bez annual_hours_basis | |
| FRINGE_NO_ALLOCATION | soft | radnik bez ijedne alokacije a projekat ima wd_fringe > 0 | "Za John Doe nije određeno kako se plaća beneficija. Pretpostavljam gotovinu." |
| RATE_EXPIRED | hard | nema project_classification važeće za work_date | "Stope za Electrician važe do 30.6. Unesi nove stope od 1.7." |
| RATE_RETROACTIVE_CHANGE | soft | keš platne tabele donio stopu s `effective_from` prije već potpisanih sedmica | "NYSDOL je objavio ispravku stope za Electrician s važenjem od 1.7. Tri već predate sedmice su pogođene. Napravi ispravke?" |
| RATE_CHANGE_MIDWEEK | info | stopa se mijenja unutar sedmice | "Stopa se mijenja 1.7., sredinom sedmice. Računam po danu." |
| WEIGHTED_AVERAGE_USED | info | radnik ima 2+ klasifikacije, federalno | "Regular rate za prekovremene je ponderisani prosjek: 33,12 $." |

### 3.3 Pripravnici

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| APPRENTICE_NO_RECORD | hard | level RA bez važećeg apprentice_records | "John Doe je označen kao pripravnik, ali nema registrovan program. Bez registracije mora se platiti puna stopa." |
| APPRENTICE_RECORD_EXPIRED | hard | valid_to < work_date | |
| APPRENTICE_RATIO | hard | omjer RA:J na dan veći od `project_classifications.apprentice_ratio` (ako je unesen; bez njega info) | "9.9. rade 2 pripravnika i 1 majstor. Omjer za Electrician je 1:1. Višak se plaća kao majstor." |
| APPRENTICE_PCT_MISMATCH | soft | plaćena stopa ≠ pct × journey stopa (±0,01) | |

### 3.4 Odbici i neto

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| NET_MISMATCH | hard | gross_all_work − Σ deductions ≠ net_pay (±0,01) | "Bruto 1.850,00 minus odbici 412,30 nije 1.400,00. Razlika 37,70." |
| GROSS_ALL_BELOW_PROJECT | hard | gross_all_work < gross_this_project | |
| GROSS_ALL_MISSING | soft | gross_all_work nije unesen | "Bruto za sav rad nije unesen; koristim bruto s ovog projekta. Ako je radnik radio drugdje, uvezi obračun." |
| DEDUCTIONS_OVER_10 | hard/soft | > 10 odbitaka, NY | Tvrdo ako je `tenant_settings.merge_deductions` = false; meko uz "spojeno u Other". |
| DEDUCTION_UNKNOWN_KIND | soft | kind other bez label | |
| DEDUCTION_NEGATIVE | hard | iznos < 0 | |

### 3.5 Radnik i PII

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| WORKER_ID_MISSING | hard | NY i nema ni ssn_last4 ni DOB | "NY portal traži zadnje 4 cifre SSN ili datum rođenja za John Doe." |
| SSN4_AND_DOB | hard | NY i oba prisutna | Motor bira ssn_last4 i briše DOB iz izlaza; nalaz je hard samo ako je `tenant_settings.strict_pii`. Podrazumijevano: info "koristim SSN4". |
| WORKER_ADDRESS_MISSING | hard | NY i nema adrese | |
| WORKER_ADDRESS_TOO_LONG | hard | address1 ili address2 > 42, city > 40, state > 50 znakova | "Adresa je duža nego što NY portal prima. address1 smije imati 42 znaka, ovdje ih je 51." |
| WORKER_ZIP_FORMAT | hard | postalCode nije 5 cifara ili ext nije 4 | |
| WORKER_NAME_SUSPICIOUS | soft | ime ima cifre ili je jedno slovo | |
| WORKER_DUPLICATE | soft | dva aktivna radnika s istim imenom i istim ssn_last4 | |

### 3.6 Projekat i period

| Kod | Težina | Uslov | Poruka |
|---|---|---|---|
| PRC_MISSING | hard | ny_reporting bez prc_number | |
| WD_MISSING | soft | federal_reporting bez federal_wd_number | "Federalni WD broj nije unesen; ide na obrazac kao prazno." |
| CLASSIFICATION_NOT_OFFICIAL | hard | official_label nije u katalogu | Ne bi trebalo biti moguće; štiti od ručnih izmjena. |
| PAYROLL_GAP | soft | postoji potpisan period, pa nedostaje sedmica, pa ovaj | "Sedmica 5.9. nema izvještaj. Redni brojevi moraju biti uzastopni; napravi je (može biti bez rada)." |
| PERIOD_LOCKED | hard | pokušaj izmjene poslije potpisa | UI to ne dozvoljava; API vraća 409. |
| FINAL_ALREADY_SET | hard | novi period poslije završnog | "Projekat je označen završenim 29.8. Ako ima još rada, poništi završni." |
| PROJECT_NOT_ACTIVE | soft | sati na projektu status paused | |
| OVER_500_WORKERS | hard | NY, > 500 radnika u fajlu | |

### 3.7 Obavještajni (info)

| Kod | Kada |
|---|---|
| STATE_DEADLINE_T10 / T5 / T2 / T0 | 30-dnevni rok za NY predaju: 10, 5, 2 i 0 dana prije isteka (računa se od `last_accepted_submission_at`, ili od početka projekta ako predaje još nije bilo) |
| STATE_DEADLINE_PENALTY | rok prošao prije više od 14 dana; kazna 100 $ po danu je pravno moguća |
| FEDERAL_DUE_T2 | federalni projekat, 2 dana do isteka 7 dana od datuma isplate |
| NO_WORK_WEEK_PORTAL | sedmica označena kao bez rada: podsjetnik da se to unosi u portalu, ne XML-om |
| REMINDER_DUE | ponedjeljak, period otvoren |
| RATE_UPDATE_AVAILABLE | keš platne tabele ima novije stope od project_classifications |
| RETENTION_APPROACHING | izvještaji stariji od 5 godina i 9 mjeseci |

## 4. Redoslijed i izvođenje

1. Validacija se izvršava kao dio motora (`core/validate.ts`), nad istim ulazom
   kao obračun, i vraća se zajedno s `payroll_lines`.
2. Pokreće se: pri svakoj promjeni (debounce 500 ms, samo pogođeni radnik radi
   brzine u UI-ju; puni prolaz pri "Pregledaj" i "Generiši").
3. Nalazi se čuvaju u `report_findings` s `report_id NULL` dok je period otvoren;
   pri generisanju kopiraju se uz report (dokaz šta je korisnik vidio i
   potvrdio).
4. Panel prikazuje: prvo hard, pa soft nepotvrđene, pa soft potvrđene (sklopljene),
   pa info. Klik fokusira ćeliju (`workerId + workDate + field`).
5. Brojač u zaglavlju: "3 greške, 2 upozorenja". Dugme "Generiši" je onemogućeno
   dok je hard > 0, s tooltipom koji nabraja kodove.

## 5. Kalibracija (ne biti "suviše strog")

Iskustvo iz konkurencije: alati koji blokiraju sve gube kupce, jer kupac zna
nešto što alat ne zna (odobren 4×10, poseban sporazum). Pravilo:
- hard samo kad je izlaz **sigurno** netačan ili portal **sigurno** odbija.
- Sve što zavisi od konteksta je soft s mogućnošću potvrde, a potvrda se pamti
  po radniku i po kodu do kraja projekta ("ne pitaj više za ovo") u tabeli
  `finding_acknowledgements` (04), pa preživljava rekalkulaciju.
- Svaki hard nalaz mora imati suggestedFix. Bez izuzetka.

## 6. Testovi

- Svaki kod iz kataloga ima najmanje jedan test koji ga izaziva i jedan koji
  potvrđuje da se ne javlja lažno (u `core/validate.test.ts`).
- Golden testovi iz 01-DOMEN provjeravaju i tačan skup kodova.
- Poruke se testiraju snapshotom (da se ne promijene slučajno).
