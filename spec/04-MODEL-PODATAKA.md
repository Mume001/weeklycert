# 04. Model podataka (PostgreSQL 17 + Drizzle)

Ovaj fajl definiše svaku tabelu, kolonu, ključ i pravilo izolacije. Claude Code piše
Drizzle šemu direktno iz ovoga. Nazivi tabela su množina, engleski, snake_case.
Nazivi u kodu (TypeScript) su camelCase preko Drizzle mapiranja.

---

## 1. Odluke koje važe za cijelu bazu

1. **Jedna baza, jedna šema, kolona `tenant_id` na svakoj tabeli firme.** Ne schema
   po firmi, ne baza po firmi. Razlog: 100 do 2.000 firmi, jednostavne migracije,
   jedan backup. Izolacija se rješava kroz RLS, ne kroz odvajanje.
2. **RLS uključen i FORCED na svakoj tabeli s `tenant_id`.** Aplikacija se spaja kao
   `app_user` (nije vlasnik tabela, pa FORCE važi i za njega). Svaki upit prolazi
   kroz transakciju koja prvo radi
   `select set_config('app.tenant_id', $1, true)`. Politika:
   `using (tenant_id = current_setting('app.tenant_id')::uuid)`. Worker za poslove
   jedne firme (generisanje, uvoz) radi kao `app_user` s `set_config` iz podataka
   posla. Samo migracije i platformski poslovi (purge, retention, podsjetnici za
   sve firme) koriste `app_admin` ulogu koja ima BYPASSRLS.
3. **Primarni ključevi su UUID v7** (vremenski sortirani, generisani u aplikaciji).
   Razlog: nema curenja rednih brojeva u URL-ovima, dobar indeks lokalitet.
4. **Novac je `numeric(12,2)`, stope `numeric(10,4)`, sati `numeric(6,2)`.** Nikad
   float. U TypeScriptu se novac drži kao string iz Drizzle-a i računa kroz
   `decimal.js` ili cijele cente u `core/`.
5. **Datumi radne sedmice su `date`, ne timestamp.** Vremenski žigovi su
   `timestamptz`. Vremenska zona firme se čuva u `tenants.timezone` (NY firme su
   `America/New_York`).
6. **Brisanje je meko** gdje postoji istorija (radnici, projekti, planovi): kolona
   `archived_at`. Tvrdo brisanje postoji samo za cijelu firmu (otkaz + 30 dana).
7. **Svaka tabela ima `created_at`, `updated_at`** (trigger za `updated_at`).
8. **PII je šifrovan u koloni**, ne u disku. Vidi odjeljak 6.
9. **Generisani izvještaji su nepromjenjivi.** Kad se izvještaj generiše, njegov
   ulaz se zamrzava kao JSON snimak (`reports.input_snapshot`). Promjena sati poslije
   toga pravi novu verziju, ne mijenja staru.
10. **Bez ON DELETE CASCADE** između poslovnih tabela. Cascade samo od `tenants`
    prema dolje (za tvrdo brisanje firme) i od roditelja prema čisto zavisnim
    redovima (payroll_lines prema payroll_deductions).

## 2. Pregled tabela po grupama

| Grupa | Tabele |
|---|---|
| Identitet | `users`, `sessions`, `accounts`, `verifications`, `two_factors`, `passkeys` (Better Auth), `memberships`, `invitations` |
| Firma | `tenants`, `tenant_settings`, `signers`, `subscriptions`, `billing_events` |
| Referentno | `states`, `classification_catalog`, `wage_schedule_cache`, `wage_schedule_rates` |
| Projekat | `awarding_bodies`, `prime_contractors`, `projects`, `project_classifications`, `work_pauses` |
| Radnici | `workers`, `worker_pii`, `apprentice_records`, `fringe_plans`, `worker_fringe_allocations` |
| Sedmica | `payroll_periods`, `time_entries`, `payroll_lines`, `payroll_deductions`, `payroll_supplements` |
| Izlaz | `reports`, `report_findings`, `submissions`, `files` |
| Uvoz | `import_profiles`, `import_batches`, `import_rows` |
| Sistem | `audit_log`, `notifications`, `pii_access_log`, `feature_flags`, `finding_acknowledgements`, pg-boss šema `pgboss` |

Ukupno 44 tabele (uključujući 6 Better Auth tabela, `feature_flags` i `finding_acknowledgements`). Tabele bez `tenant_id` (globalne): `users`, `sessions`,
`accounts`, `verifications`, `two_factors`, `passkeys`, `states`, `classification_catalog`,
`wage_schedule_cache`, `wage_schedule_rates`, `billing_events` (ima tenant_id ali
piše ga samo webhook worker).

## 3. Tabele, kolona po kolona

Oznake: PK primarni ključ, FK strani ključ, U jedinstveno, N može biti NULL, E enum
(Postgres enum tip). Ako nije N, kolona je NOT NULL.

### 3.1 Identitet

**users** (upravlja Better Auth, mi dodajemo kolone)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| email | citext U | |
| email_verified | boolean | |
| name | text | |
| image | text N | |
| is_super_admin | boolean default false | Mume. Ne daje članstva. |
| locale | text default 'en-US' | |
| last_active_tenant_id | uuid N | Za redirect poslije logina. |
| created_at, updated_at | timestamptz | |

Better Auth **ne** upravlja firmama ni članstvima (bez `organization` plugina);
`tenants`, `memberships` i `invitations` su naše.

**sessions, accounts, verifications, two_factors, passkeys**: standardne Better Auth tabele
(generisati `npx @better-auth/cli generate`). U `sessions` dodajemo
`active_tenant_id uuid N` i `impersonated_by uuid N`.

**memberships**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK tenants | RLS |
| user_id | uuid FK users | |
| role | E membership_role | owner, admin, payroll, signer, viewer, bookkeeper |
| can_sign | boolean default false | Samo za bookkeeper; vlasnik uključuje. |
| status | E membership_status | active, suspended |
| invited_by | uuid FK users N | |
| created_at, updated_at | | |
| U (tenant_id, user_id) | | |
| Parcijalni U indeks: (tenant_id) where role = 'owner' | | Tačno jedan vlasnik. |

**invitations**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| email | citext | |
| role | E membership_role | Ne može owner. |
| token_hash | text U | sha256 tokena iz linka. |
| expires_at | timestamptz | 7 dana. |
| accepted_at | timestamptz N | |
| invited_by | uuid FK users | |

### 3.2 Firma

**tenants**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| slug | text U | Ide u URL /app/[t]. Generisan iz imena, mijenja se samo jednom. |
| legal_name | text | Puni pravni naziv kako stoji na ugovoru. |
| dba_name | text N | |
| fein_encrypted | bytea N | Šifrovan FEIN (poreski broj firme). Pojavljuje se u WH-347 i NY XML. |
| fein_last4 | text N | Za prikaz. |
| address_line1, address_line2 N, city, state_code FK states, zip | text | Adresa firme. |
| phone | text N | |
| nys_registration_number | text N | NYS contractor registration number s Certificate of Contractor Registration (Labor Law §220-i). Portal traži ovaj broj plus FEIN; zasebnog "portal ID-a" nema. |
| timezone | text default 'America/New_York' | |
| status | E tenant_status | trial, active, past_due, paused, cancelled, deleted |
| trial_ends_at | timestamptz N | |
| cancelled_at | timestamptz N | |
| purge_after | timestamptz N | cancelled_at + 30 dana. |
| dek_wrapped | bytea N | Ključ za PII ove firme, umotan master ključem (envelope). NULL samo poslije otkaza (podaci nečitljivi). |
| dek_version | int default 1 | |
| onboarding_step | smallint default 0 | 0 do 7. |
| created_at, updated_at | | |

**tenant_settings** (1:1, odvojeno da se `tenants` ne puni)
| Kolona | Tip | Napomena |
|---|---|---|
| tenant_id | uuid PK FK | |
| default_pay_frequency | E pay_frequency | weekly, biweekly |
| week_ending_dow | smallint default 6 | Dan u sedmici kad završava radna sedmica (0 nedjelja, 6 subota). |
| federal_ot_enabled | boolean default true | Da li se uz NY pravila računa i federalni prag od 40 sati. NY prekovremeni NIKAD ne dolaze odavde nego iz OT kodova klasifikacije (01 §2.1). |
| annual_hours_basis | numeric(6,0) default 2080 | Za anualizaciju fringe. |
| reminder_day | smallint default 1 | Ponedjeljak. |
| reminder_email | boolean default true | |
| reminder_sms | boolean default false | Samo uz zabilježen pristanak. |
| sms_consent_at | timestamptz N | |
| sms_consent_text | text N | Tačan tekst koji je korisnik potvrdio. |
| sms_phone | text N | |
| csv_delimiter | text default ',' | |
| strict_pii | boolean default false | Ako true, SSN4_AND_DOB je hard umjesto info. |
| merge_deductions | boolean default true | Spajanje viška odbitaka u "other" za NY limit 10. |
| logo_file_id | uuid FK files N | |

**signers** (ovlaštena lica koja se pojavljuju na izjavi; nisu isto što i korisnici)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| user_id | uuid FK users | Potpisnik mora imati nalog: potpis traži dozvolu po ulozi (02) I aktivan red ovdje s user_id = onaj ko klikće. |
| full_name | text | Kako se piše na izjavi. |
| title | text | "President", "Payroll Manager". |
| is_active | boolean | |
| created_at | | |

**subscriptions** (jedan aktivan red po firmi, istorija se čuva)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| stripe_customer_id | text | |
| stripe_subscription_id | text U N | |
| plan | E plan_code | standard_79, yearly_790, custom |
| is_founding | boolean default false | Presale kupac (147 $ Founding Member, vidi 08 §4). |
| setup_tier | E setup_tier N | basic_149, standard_299, full_499, waived |
| setup_paid_at | timestamptz N | |
| status | E sub_status | trialing, active, past_due, paused, canceled, incomplete |
| current_period_end | timestamptz N | |
| cancel_at_period_end | boolean | |
| price_cents | int | Zamrznuta cijena za tu firmu (stari kupci zadržavaju cijenu pri poskupljenju). |
| created_at, updated_at | | |

**billing_events** (sirovi Stripe webhook događaji, idempotentnost)
| Kolona | Tip | Napomena |
|---|---|---|
| id | text PK | Stripe event id (evt_...). Duplikat se ignoriše. |
| tenant_id | uuid N | Popunjava se kad se prepozna customer. |
| type | text | |
| payload | jsonb | |
| processed_at | timestamptz N | |
| error | text N | |
| received_at | timestamptz | |

### 3.3 Referentno (globalno, bez RLS, samo čitanje za firme)

**states**: `code text PK` (NY, NJ, ...), `name`, `has_state_prevailing_wage
boolean`, `ot_source E ot_source` (wage_schedule_codes za NY, statutory za države s jednim pravilom), `retention_years smallint`, `portal_url text N`,
`portal_format E portal_format N` (ny_xml, pdf_upload, none), `active boolean`.
U MVP-u aktivan je samo NY. Tabela postoji da se NJ/CA/IL dodaju bez migracije
poslovnih tabela.

**classification_catalog** (zvanična NY lista, seed iz fajla; broj vrijednosti se utvrđuje u koraku 0, spec/13 A11)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| state_code | text FK states | |
| trade | text | "Electrician" |
| subtrade | text N | "Wireman" |
| official_label | text U per state | Tačan string koji ide u XML `workCategory`. Ne mijenjati. |
| aliases | text[] | Za pretragu i uvoz ("elec", "sparky"). |
| catalog_version | text | Datum zvanične liste s koje je uzeto. |
| active | boolean | |

**wage_schedule_cache** (jedna povučena platna tabela)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| state_code | text | |
| kind | E schedule_kind | ny_prc, federal_wd |
| reference | text | PRC broj ili WD broj + modifikacija. |
| county | text N | |
| source_url | text | |
| fetched_at | timestamptz | |
| effective_from, effective_to N | date | |
| raw_file_id | uuid FK files | Original PDF/HTML, uvijek sačuvan. |
| parse_status | E parse_status | pending, parsed, needs_review, approved, failed |
| approved_by | uuid FK users N | Super-admin odobrava prije nego stope idu firmama. |
| U (kind, reference, effective_from) | | |

**wage_schedule_rates** (parsirane stope iz tabele)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| schedule_id | uuid FK wage_schedule_cache | |
| classification_id | uuid FK classification_catalog N | NULL ako nije mapirano. |
| raw_label | text | Kako piše u dokumentu. |
| group_or_level | text N | Zona, grupa, godina pripravništva. |
| base_rate | numeric(10,4) | |
| supplement_rate | numeric(10,4) | |
| ot_codes | text[] | NY OT kodovi iz reda platne tabele. |
| holiday_code | text N | |
| effective_from, effective_to N | date | Stope se mijenjaju 1. jula i sredinom godine. |
| apprentice_pct | numeric(5,2) N | Ako je red pripravnik. |
| notes | text N | |

### 3.4 Projekat

**awarding_bodies**: `id`, `tenant_id`, `name`, `kind E (state_agency, county, city,
school_district, authority, federal, other)`, `address_*`, `contact_name N`,
`contact_email N`, `contact_phone N`, `archived_at N`.

**prime_contractors**: `id`, `tenant_id`, `legal_name`, `fein_last4 N`, `address_*`,
`contact_name N`, `contact_email N` (kome se šalje WH-347), `contact_phone N`,
`portal_hint text N` (npr. "LCPtracker", "email PDF"), `archived_at N`.

**projects**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | text | Interni naziv. |
| project_number | text N | Broj ugovora kod naručioca. |
| state_code | text FK states | |
| county | text N | Određuje NY platnu tabelu. |
| awarding_body_id | uuid FK N | |
| prime_contractor_id | uuid FK N | NULL ako je kupac glavni izvođač. |
| our_role | E project_role | prime, sub, sub_tier2 |
| prc_number | text N | Obavezno ako state_code = NY i ny_reporting = true. Format NEPROVJEREN (zapis u portalu). |
| federal_wd_number | text N | Npr. NY20260012. |
| federal_wd_mod | smallint N | |
| funding | E funding_kind | state_only, federal_only, both, unknown |
| ny_reporting | boolean | Šalje se NY XML u NYSDOL portal. |
| nyc_system | boolean default false | Projekat ide kroz zaseban gradski sistem Njujorka (nyc-oti.ecomply.us), ne kroz NYSDOL portal. MVP ga ne podržava; postavljanje na true samo označava projekat i isključuje generisanje NY XML-a. |
| state_filing_due_every_days | smallint default 30 | Interval roka. Računanje je definisano u 05 §2: prvi rok = start_date + 30, dalje = last_accepted_submission_at + 30. |
| last_accepted_submission_at | date N | Zadnja predaja koju je portal prihvatio; osnova za brojač do 30-dnevnog roka. |
| federal_ot_enabled | boolean | Naslijeđeno iz tenant_settings. Za NY prekovremene se ne koristi; oni idu po OT kodovima klasifikacije (01 §2.1, `project_classifications.ot_codes`). |
| retention_years | smallint default 6 | Čuvanje izvještaja; `retention_until` = greatest(week_ending, actual_end_date) + retention_years. |
| federal_reporting | boolean | Pravi se WH-347. |
| start_date | date | |
| expected_end_date | date N | |
| actual_end_date | date N | Kad se označi završni izvještaj. |
| status | E project_status | draft, active, paused, completed, archived |
| next_payroll_number | int default 1 | Sekvenca; dodjeljuje se i povećava pri **potpisu** (ne pri generisanju). |
| wage_schedule_id | uuid FK wage_schedule_cache N | Keširana tabela vezana za projekat. |
| site_address | text N | Lokacija radova (WH-347 "Project and location"). |
| notes | text N | |
| archived_at | timestamptz N | |
| created_at, updated_at | | |
| U (tenant_id, prc_number, project_number) where prc_number is not null | | |

**project_classifications** (koje klasifikacije se koriste na projektu i po kojoj stopi)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| project_id | uuid FK | |
| classification_id | uuid FK classification_catalog | |
| display_label | text | Kako kupac zove; XML koristi official_label iz kataloga. |
| wd_base_rate | numeric(10,4) | Iz odluke o nadnicama. |
| wd_fringe_rate | numeric(10,4) | |
| paid_base_rate | numeric(10,4) | Stvarno plaćena osnovna satnica (≥ wd_base_rate, inače RATE_BELOW_WD). Podrazumijevano = wd_base_rate. |
| cash_in_lieu_rate | numeric(10,4) default 0 | Beneficija plaćena u gotovini po satu, na nivou klasifikacije; radnik može prepisati kroz worker_fringe_allocations. |
| apprentice_ratio | text N | Dozvoljeni omjer pripravnik:majstor za zanat, npr. "1:1", "1:3". Iz programa; NEPROVJERENO da li je javno po zanatu. |
| ot_codes | text[] | NY OT kodovi za ovu klasifikaciju iz platne tabele, npr. {B,E2,O}. Klasifikacija ih obično nosi više; motor primjenjuje sve i uzima najvišu premiju za taj sat. Legenda u 01 §2.1. |
| holiday_code | text N | Kod s HOLIDAY PAGE platne tabele. Legenda neprovjerena (spec/13 A10). |
| effective_from | date | Verzionisano: promjena stope 1. jula pravi novi red. |
| effective_to | date N | |
| source_rate_id | uuid FK wage_schedule_rates N | Odakle je stopa prepisana. |
| created_at, updated_at | | |
| U (project_id, classification_id, effective_from) | | |

**work_pauses** (sedmice bez rada koje se unaprijed znaju; preslikava "Enter Work
Pause Dates" u portalu)
`id`, `tenant_id`, `project_id`, `from_date`, `to_date`, `reason text N`. Motor iz
ovoga zna da za te sedmice pravi no_work izvještaj bez pitanja.

### 3.5 Radnici

**workers**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| first_name, last_name | text | |
| middle_name | text N | Do 45 znakova, jer XML traži `middleName`, ne inicijal. WH-347 polje 1D koristi prvo slovo. |
| worker_number | text N | Broj iz kupčevog platnog sistema, ključ za uvoz. |
| default_classification_id | uuid FK classification_catalog N | |
| level | E worker_level | J (journeyworker), RA (registered apprentice), F (foreman), O (owner_operator) |
| gender | E gender N | **Nije u strukturi iz 05 §3.2 i nema ga u zvaničnom uputstvu.** Kolona postoji samo dok se ne potvrdi XSD (spec/13 A4); ako je nema u šemi, kolona se briše prije prvog kupca. |
| ethnicity | E ethnicity N | Isto kao gender. Osjetljiva kategorija, prikazuje se samo u formi radnika. |
| hire_date | date N | |
| status | E worker_status | active, inactive |
| pay_frequency | E pay_frequency N | Prepisuje tenant default. |
| archived_at | timestamptz N | |
| created_at, updated_at | | |
| U (tenant_id, worker_number) where worker_number is not null | | |

**worker_pii** (1:1, odvojena tabela da se rijetko dotiče i da se pristup loguje)
| Kolona | Tip | Napomena |
|---|---|---|
| worker_id | uuid PK FK workers | |
| tenant_id | uuid FK | |
| ssn_last4 | text N | Tačno 4 cifre. Nikad puni SSN. Provjera `check (ssn_last4 ~ '^[0-9]{4}$')`. |
| date_of_birth_encrypted | bytea N | Šifrovan. Koristi se samo ako nema SSN4 (NY pravilo XOR). |
| address_encrypted | bytea | Šifrovan JSON {address1, address2, city, state, postalCode, postalCodeExt, country}. Dužine se validiraju na unosu po XML limitima: address1 i address2 do 42, city do 40, state do 50, postalCode 5 cifara, postalCodeExt 4 cifre. |
| address_city, address_state, address_zip | text N | Nešifrovani dijelovi za prikaz u listi i za WH-347 bez otvaranja cijele adrese. |
| phone_encrypted | bytea N | |
| dek_version | int | Verzija ključa kojim je šifrovano. |
| updated_at | | |

**apprentice_records**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id, worker_id | | |
| program_name | text | Registrovani program. |
| program_registration_no | text N | |
| registrar | E registrar N | oa (federalni OA), saa (državna agencija), nysdol. |
| sponsor | text N | |
| trade | text | |
| period_no | smallint | Godina ili period pripravništva. |
| pct_of_journey | numeric(5,2) | 40.00 do 95.00 |
| valid_from, valid_to N | date | |
| certificate_file_id | uuid FK files N | |

**fringe_plans**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | text | "Local 3 Health Fund" |
| kind | E supplement_kind | Isti enum kao `payroll_supplements.kind`, da mapiranje u XML bude 1:1. Zaseban `fringe_kind` ne postoji. |
| funding | E fringe_funding | plan_contribution, cash_in_lieu |
| annual_cost | numeric(12,2) N | Za anualizaciju. |
| annual_hours_basis | numeric(6,0) N | Prepisuje tenant default. |
| hourly_credit | numeric(10,4) N | Ako je poznat direktno. |
| annualize | boolean default true | Da li se primjenjuje anualizacija (isključeno samo za planove koji su izuzeti, npr. odobreni penzioni planovi s trenutnim sticanjem). |
| plan_number | text N | Broj plana kod fonda. |
| provider | text N | |
| is_legally_required | boolean default false | FICA, workers comp: ako true, motor odbija kao fringe. |
| archived_at | timestamptz N | |

**worker_fringe_allocations**: `id`, `tenant_id`, `worker_id`, `fringe_plan_id`,
`hourly_credit_override numeric(10,4) N`, `effective_from`, `effective_to N`.
U (worker_id, fringe_plan_id, effective_from).

### 3.6 Sedmica

**payroll_periods** (jedna radna sedmica na jednom projektu)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| project_id | uuid FK | |
| week_ending | date | |
| status | E period_status | open, in_review, generated, signed, submitted, corrected |
| is_no_work | boolean default false | |
| is_final | boolean default false | Završni izvještaj za projekat. |
| payroll_number | int N | NULL dok period nije potpisan; dodjeljuje se pri potpisu i više se ne mijenja. Ispravka nasljeđuje broj ispravljenog perioda. |
| corrects_period_id | uuid FK payroll_periods N | Ako je ispravka ranije sedmice. |
| locked_at | timestamptz N | Kad je potpisan; sati se više ne mijenjaju bez "Ispravka". |
| created_at, updated_at | | |
| U (project_id, week_ending, corrects_period_id nulls not distinct) | | |

**time_entries** (sirovi unos: radnik, klasifikacija, dan, sati)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| period_id | uuid FK payroll_periods | |
| worker_id | uuid FK workers | |
| project_classification_id | uuid FK | |
| work_date | date | Unutar sedmice perioda (check preko trigera). |
| hours | numeric(5,2) | Ukupno za taj dan i klasifikaciju. Motor dijeli ST/OT. |
| st_hours_override, ot_hours_override | numeric(5,2) N | Ako kupac izričito unese podjelu. |
| is_holiday | boolean default false | Korisnik označava dan kao praznik. Dok legenda praznika nije unesena (spec/13 A10), motor traži multiplikator i diže HOLIDAY_RULE_UNKNOWN. |
| holiday_multiplier | numeric(4,2) N | Potvrđen multiplikator za taj praznik, npr. 2.00. |
| source | E entry_source | manual, import, api |
| import_row_id | uuid FK import_rows N | |
| created_at, updated_at | | |
| U (period_id, worker_id, project_classification_id, work_date) | | |
| check (hours >= 0 and hours <= 24) | | |

**payroll_lines** (izlaz motora po radniku po sedmici, sačuvan da se ne računa
stalno ponovo; rekalkulacija briše i piše ponovo dok je period `open` ili `in_review`)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id, period_id, worker_id | | |
| classification_breakdown | jsonb | [{project_classification_id, st_hours, ot_hours, st_rate, ot_rate, fringe_credit, cash_in_lieu, gross}] |
| st_hours_total, ot_hours_total | numeric(6,2) | |
| regular_rate | numeric(10,4) | Za federalni OT. |
| regular_rate_method | E rr_method | single, weighted_average, rate_in_effect |
| gross_this_project | numeric(12,2) | |
| gross_all_work | numeric(12,2) | Kupac unosi ili uvozi; ako nema, = gross_this_project + upozorenje. |
| net_pay | numeric(12,2) | |
| fringe_shortfall_hourly | numeric(10,4) | 0 ako nema manjka. |
| apprentice_applied | boolean | |
| engine_version | text | Verzija `core/` kojom je računato. |
| computed_at | timestamptz | |
| U (period_id, worker_id) | | |

**payroll_deductions**: `id`, `tenant_id`, `payroll_line_id FK (cascade)`,
`kind E deduction_kind` (NEPROVJERENO prema XSD-u, spec/13 A3: federal_tax, state_tax, local_tax, fica, medicare, sdi,
pfl, union_dues, garnishment, insurance, retirement_401k, other), `label text N`,
`amount numeric(12,2)`, `sort smallint`. Check: najviše 10 po liniji kad je
ny_reporting (radi se u motoru, ne u bazi).

**payroll_supplements**: `id`, `tenant_id`, `payroll_line_id FK (cascade)`,
`kind E supplement_kind`, `explanation text N` (obavezno kad je kind = other),
`paid_to E (plan, cash)`, `st_hourly_amount numeric(10,4)`,
`ot_hourly_amount numeric(10,4)` (jednako st osim uz OT kod V ili W),
`total_amount numeric(12,2)`, `fringe_plan_id FK N`. Najviše 50 po radniku po
sedmici (limit XML-a).

### 3.7 Izlaz

**reports** (jedna generisana verzija)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id, period_id | | |
| version | smallint | 1, 2, 3... po periodu. |
| kind | E report_kind | ny_xml, wh347_pdf, statement_pdf, bundle_zip |
| status | E report_status | draft, final, superseded, failed |
| input_snapshot | jsonb | Zamrznut ulaz motora. Ovo je dokaz šta je predato. |
| engine_version | text | |
| file_id | uuid FK files N | |
| checksum_sha256 | text N | |
| validation_summary | jsonb | {hard: n, soft: n} |
| generated_by | uuid FK users | |
| generated_at | timestamptz | |
| signed_by_signer_id | uuid FK signers N | |
| signed_by_user_id | uuid FK users N | |
| signed_at | timestamptz N | |
| signature_ip, signature_user_agent | text N | |
| attestation_text | text N | Tačan tekst izjave koju je potpisnik vidio. |
| U (period_id, kind, version) | | |

**report_findings** (nalazi validacije uz izvještaj ili uz period dok je otvoren)
`id`, `tenant_id`, `period_id`, `report_id N`, `severity E (hard, soft, info)`,
`code text` (npr. `OT_NY_DAILY`, `FRINGE_SHORTFALL`, `SSN4_AND_DOB`),
`message text`, `worker_id N`, `work_date N`, `field text N`, `suggested_fix text
N`, `acknowledged_by uuid N`, `acknowledged_at N`. Meki nalazi mogu biti potvrđeni
("znam, ide dalje"); tvrdi ne.

**submissions**
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id, period_id, report_id | | |
| channel | E submission_channel | ny_portal_manual, email_to_prime, portal_other, download_only |
| submitted_at | timestamptz | |
| submitted_by | uuid FK users | |
| confirmation_ref | text N | Broj potvrde iz portala. |
| outcome | E submission_outcome default pending | pending, accepted, rejected (ručni unos, portal nema API). |
| outcome_at | timestamptz N | |
| rejection_reason | text N | |
| recipient | text N | Email glavnog izvođača. |
| notes | text N | |
| evidence_file_id | uuid FK files N | Screenshot ili potvrda. |

**files** (metapodaci; sadržaj je u S3-kompatibilnom skladištu)
| Kolona | Tip | Napomena |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid N | NULL za globalne (platne tabele). |
| bucket | text | |
| object_key | text U | `t/{tenant_id}/{yyyy}/{kind}/{uuid}.{ext}` |
| kind | E file_kind | report, import_source, wage_schedule, evidence, logo, export, certificate |
| content_type | text | |
| size_bytes | bigint | |
| sha256 | text | |
| encrypted | boolean | Server-side encryption + naš envelope za PII izvoze. |
| retention_until | date N | Za izvještaje: greatest(week_ending, projects.actual_end_date) + projects.retention_years + 1 dan. |
| created_by | uuid N | |
| created_at | | |

### 3.8 Uvoz

**import_profiles** (sačuvano mapiranje kolona po izvoru)
`id`, `tenant_id`, `name` ("QuickBooks Time export"), `kind E import_kind`,
`source_kind E (generic_csv, generic_xlsx, quickbooks_time, quickbooks_payroll,
adp, gusto, paychex, busybusy, clockshark, weeklycert_template, other)`,
`header_hash text` (za automatsko prepoznavanje), `worker_aliases jsonb`
({"J. Doe": worker_id}), `code_map jsonb` ({"ELEC-J": project_classification_id}), `column_map jsonb` ({"worker":
"Employee", "date": "Date", "hours": "Hours", "class": "Job Code"}), `date_format
text`, `worker_match E (worker_number, full_name, email)`, `delimiter`, `has_header
boolean`, `last_used_at`.

**import_batches**: `id`, `tenant_id`, `kind E import_kind`, `project_id N`, `period_id N`,
`profile_id N`, `source_file_id FK files`, `status E (uploaded, mapped, validated,
applied, rejected)`, `rows_total`, `rows_ok`, `rows_warn`, `rows_error`,
`summary jsonb`, `applied_at N`, `applied_by N`, `created_by`.

**import_rows**: `id`, `tenant_id`, `batch_id FK (cascade)`, `row_no int`, `raw
jsonb`, `parsed jsonb N`, `worker_id N`, `status E (ok, warn, error, skipped)`,
`messages text[]`. Briše se 90 dana poslije `applied_at` (worker posao).

### 3.9 Sistem

**audit_log** (append-only; app_user ima samo INSERT i SELECT, nema UPDATE/DELETE)
| Kolona | Tip | Napomena |
|---|---|---|
| id | bigint identity PK | |
| tenant_id | uuid N | |
| actor_user_id | uuid N | |
| impersonator_user_id | uuid N | |
| action | text | `worker.update`, `report.sign`, `member.invite`, `pii.read` ... |
| entity_type | text | |
| entity_id | uuid N | |
| before | jsonb N | Bez PII polja (maskirano). |
| after | jsonb N | |
| ip | inet N | |
| user_agent | text N | |
| request_id | text | |
| at | timestamptz default now() | |
| Indeksi: (tenant_id, at desc), (entity_type, entity_id) | | |

**pii_access_log**: `id bigint`, `tenant_id`, `user_id`, `worker_id`, `fields
text[]`, `purpose E (view, report_generation, export, support)`, `at`. Svako
dešifrovanje adrese, DOB ili telefona piše red. Generisanje izvještaja piše jedan
red po radniku s purpose report_generation.

**notifications**: `id`, `tenant_id`, `user_id N`, `kind E (reminder_due,
report_failed, invite, billing_failed, signature_needed, retention_notice)`,
`channel E (email, sms, in_app)`, `payload jsonb`, `sent_at N`, `read_at N`,
`error N`.

**feature_flags**: `id`, `tenant_id N` (NULL = globalno), `key text`, `enabled
boolean`, U (tenant_id, key). Helper `flag(key, tenantId)` (09 §4).

**finding_acknowledgements** (potvrde mekih nalaza koje preživljavaju
rekalkulaciju): `id`, `tenant_id`, `project_id`, `worker_id N`, `code text`,
`acknowledged_by uuid`, `acknowledged_at`, `note text N`. U (project_id,
worker_id nulls not distinct, code). Motor pri pisanju `report_findings` označava
nalaz potvrđenim ako postoji red ovdje.

**pgboss.***: pg-boss pravi svoju šemu. Ne dirati ručno.

## 4. Enum tipovi (Postgres)

```
membership_role: owner, admin, payroll, signer, viewer, bookkeeper
membership_status: active, suspended
tenant_status: trial, active, past_due, paused, cancelled, deleted
pay_frequency: weekly, biweekly
ot_source: wage_schedule_codes, statutory
plan_code: standard_79, yearly_790, custom
setup_tier: basic_149, standard_299, full_499, waived
sub_status: trialing, active, past_due, paused, canceled, incomplete
portal_format: ny_xml, pdf_upload, none
schedule_kind: ny_prc, federal_wd
parse_status: pending, parsed, needs_review, approved, failed
project_role: prime, sub, sub_tier2
funding_kind: state_only, federal_only, both, unknown
project_status: draft, active, paused, completed, archived
worker_level: J, RA, F, O
worker_status: active, inactive
gender: male, female, nonbinary, undisclosed
fringe_funding: plan_contribution, cash_in_lieu
period_status: open, in_review, generated, signed, submitted, corrected
entry_source: manual, import, api
rr_method: single, weighted_average, rate_in_effect
deduction_kind: federal_tax, state_tax, local_tax, fica, medicare, sdi, pfl, union_dues, garnishment, insurance, retirement_401k, other
supplement_kind: health_welfare, vacation_holiday, apprenticeship_training, pension, other
  (u XML se ispisuju kao "Health/Welfare", "Vacation/Holiday",
  "Apprenticeship/Training", "Pension", "Other Benefit"; tačan token za zadnji
  potvrditi u XSD-u, spec/13 A3)
report_kind: ny_xml, wh347_pdf, statement_pdf, bundle_zip
report_status: draft, final, superseded, failed
severity: hard, soft, info
submission_channel: ny_portal_manual, email_to_prime, portal_other, download_only
submission_outcome: pending, accepted, rejected
import_kind: hours, payroll, workers
registrar: oa, saa, nysdol
file_kind: report, import_source, wage_schedule, evidence, logo, export, certificate
```

Napomena: `tenant_status` koristi `cancelled` (naš), `sub_status` koristi
`canceled` (Stripeov pravopis, da mapiranje bude 1:1). Namjerno.

Enum se proširuje s `ALTER TYPE ... ADD VALUE` (bez migracije podataka). Nikad ne
uklanjati vrijednost, samo prestati koristiti.

## 5. Ključni indeksi (osim PK i U)

- svaki `tenant_id` (RLS planer to voli), složeni `(tenant_id, created_at desc)`
  na listama
- `time_entries (period_id, worker_id)`, `time_entries (tenant_id, work_date)`
- `payroll_periods (project_id, week_ending desc)`, `(tenant_id, status)`
- `reports (period_id, kind, status)`
- `workers` GIN trigram na `(last_name || ' ' || first_name)` za pretragu
- `classification_catalog` GIN trigram na `official_label` i `aliases`
- `audit_log (tenant_id, at desc)`, particionisati po mjesecu kad pređe 10 M redova
- `files (retention_until)` za posao brisanja

## 6. Šifrovanje PII (envelope)

- Master ključ (KEK) je 32 bajta u Docker secretu, nikad u bazi ni u env fajlu
  koji se komituje. Rotacija KEK-a: novi KEK, prepakuju se svi `dek_wrapped`,
  podaci se ne dešifruju.
- Svaka firma ima svoj DEK (32 bajta), generisan pri kreiranju, čuvan umotan
  (AES-256-GCM s KEK) u `tenants.dek_wrapped`.
- Polja `*_encrypted` su AES-256-GCM s DEK-om te firme; format bajtova:
  `version(1) | iv(12) | tag(16) | ciphertext`. AAD je `tenant_id || column_name`
  da se šifrat ne može premjestiti u drugu kolonu ili firmu.
- Dešifrovanje radi samo `packages/data/src/pii.ts` (dostupno i webu i workeru) i
  svaki poziv piše `pii_access_log`.
- Brisanje firme: prvo se `dek_wrapped` postavi na NULL (podaci postaju
  nečitljivi odmah), pa se redovi brišu poslom.
- Ne šifruje se: imena radnika (potrebna za pretragu i mrežu), grad/država/ZIP,
  zadnje 4 SSN (već skraćeno i potrebno za XML), iznosi.

## 7. Tok podataka za jednu sedmicu (da se vidi kako tabele sarađuju)

1. `payroll_periods` red nastaje automatski (worker svake nedjelje pravi `open`
   period za svaki `active` projekat, osim ako pada u `work_pauses`).
2. Sati ulaze u `time_entries` (ručno iz mreže ili iz `import_rows`).
3. Svaka snimljena promjena `time_entries` zove motor na serveru (isti `core`
   koji preglednik već izvršio lokalno za trenutni prikaz): motor čita period,
   entries, workers, project_classifications, fringe alokacije, apprentice
   records, tenant_settings i piše `payroll_lines` + `payroll_deductions` +
   `payroll_supplements` + `report_findings` (period-level, report_id NULL).
4. "Pregledaj" mijenja status u `in_review`. "Generiši" pravi `reports` v1 s
   `input_snapshot`, worker pravi fajlove (XML, PDF), piše `files`, status
   `generated`. Ako postoji tvrdi nalaz, generisanje je odbijeno.
5. "Potpiši" traži re-autentikaciju, piše `signed_*` na report, `locked_at` na
   period, status `signed`, `payroll_number` se dodjeljuje ako je NULL
   (`next_payroll_number` na projektu se poveća u istoj transakciji).
6. "Označi predato" piše `submissions`, status `submitted`.
7. "Ispravka" pravi novi period s `corrects_period_id`, kopira entries, sve ide
   ispočetka; kad novi bude potpisan, stari period dobija status `corrected`, a
   njegovi izvještaji `superseded`.

### 7.1 Tabela prelaza stanja perioda (jedini dozvoljeni prelazi)

| Iz | Akcija | Ko | U | Nuspojave |
|---|---|---|---|---|
| (nema) | worker nedjeljom / ručno | sistem, payroll+ | open | |
| open | "Pregledaj" | payroll+ | in_review | puni prolaz validacije |
| in_review | "Uredi" | payroll+ | open | |
| in_review | "Generiši" (0 hard nalaza) | payroll+ | generated | reports v(n) `draft`, worker pravi fajlove |
| generated | "Uredi" | payroll+ | open | reports v(n) ostaju `draft`, sljedeće generisanje pravi v(n+1) |
| generated | "Potpiši" (re-auth) | signer/owner/admin/bookkeeper s can_sign | signed | reports v(n) → `final`, `locked_at`, `payroll_number` |
| signed | "Označi predato" | payroll+ | submitted | red u `submissions` |
| signed, submitted | "Ispravka" | payroll+ | (novi period open) | novi red s `corrects_period_id` |
| signed, submitted | potpis ispravke | | corrected | reports → `superseded` |
| submitted | portal odbio | payroll+ | submitted (outcome rejected) | `submissions.outcome = rejected`, dashboard traži ispravku |

Sve ostalo je 409 Conflict. `time_entries` se mijenjaju samo u `open` i `in_review`
(u `in_review` promjena vraća u `open`). Statusi izvještaja: `draft` (generisan,
nepotpisan), `final` (potpisan), `superseded` (zamijenjen ispravkom), `failed`.

Boje u UI (03 §1) mapiraju se ovako: Nacrt = open; Treba pažnju = open/in_review s
hard nalazima ili rok prošao; Validirano = generated; Potpisano = signed; Predato =
submitted s outcome accepted ili pending; Odbijeno = submitted s outcome rejected;
Ispravljeno = corrected.

## 8. Šta NE modelirati sada

- Puni obračun plata (porezi po saveznoj državi, W-2). Kupac to radi u svom
  platnom sistemu; mi tražimo samo bruto, odbitke i neto po radniku.
- Više jurisdikcija odjednom (NJ, CA). `states` tabela je spremna, pravila nisu.
- Integracije s platnim sistemima preko API-ja. Prvo CSV.
- Elektronska predaja u NY portal. **API ne postoji, potvrđeno zvanično** (05
  §3.1); kupac uploaduje XML ručno, mi bilježimo potvrdu.

## 9. Kapacitet (100.000 korisnika, provjera brojeva)

Pretpostavka gornje granice: 2.000 firmi × 3 projekta × 15 radnika × 52 sedmice.
- `time_entries`: 2.000 × 3 × 15 × 6 dana × 52 ≈ 28 M redova godišnje, oko 4 GB s
  indeksima. Postgres na 8 GB RAM-a to nosi bez particionisanja prve dvije godine;
  particionisati po `work_date` (godina) kad pređe 50 M.
- `payroll_lines`: 4,7 M godišnje, jsonb breakdown ≈ 1 KB → 5 GB.
- `reports` fajlovi: 312.000 sedmica × 3 fajla × ~150 KB ≈ 140 GB godišnje u S3
  skladištu. To je 0,8 $ mjesečno po TB na Backblaze; trošak je zanemariv.
- `audit_log`: najveća tabela; particionisati od početka po mjesecu.
- Špic opterećenja: ponedjeljak i utorak, svi rade sedmicu istovremeno. Motor je
  čista funkcija, jedna sedmica < 50 ms; generisanje PDF-a ide u worker red.
- Zaključak: šema podnosi 100.000 korisnika (to je oko 30.000 firmi, daleko iznad
  tržišta) uz particionisanje dvije tabele i jedan read replica. Nema potrebe za
  shardingom.
