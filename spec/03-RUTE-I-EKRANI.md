# 03. Rute i ekrani (frontend prvi)

Frontend se gradi prvi, na lažnim podacima (`DATA_SOURCE=mock`), ekran po ekran.
Svaki ekran ovdje ima: svrhu, ko ga vidi, šta je na njemu, glavnu akciju, stanja,
podatke koje troši, pravila, i kriterij prihvatanja. Claude Code gradi jedan ekran
po sesiji i označava ga gotovim kad prođe kriterij.

---

## 1. Dizajn sistem (odluke, ne prijedlozi)

- **Publika:** kancelarijska osoba, petak popodne, rok sutra, navikla na Excel.
  Zato: gusto, tabele prvo, tastatura prvo, bez animacija koje čekaju.
- **Osnova:** Tailwind v4 + shadcn/ui. **Boje, tipografija i sve mjere su u
  14-DIZAJN-SISTEM i tamo su izvor istine**; ovaj fajl ih ne ponavlja. Novac je
  desno poravnat, uvijek `font-variant-numeric: tabular-nums`.
- **Raspored:** lijeva bočna traka 240 px koja nosi **birač firme na vrhu** i
  navigaciju, iznad sadržaja traka stranice s naslovom, putanjom i akcijama
  (pretraga Cmd+K i zvono obavještenja su desno u toj traci), sadržaj do 1.440 px,
  padding 24 px. Mjere redova i ćelija su u 14 §7 i §9. Uže od 1024
  px: bočna traka se sklapa u panel koji otvara dugme `Menu` u traci stranice
  (14 §6), **ne** u donju traku. Unos u mrežu na mobilnom nije podržan, samo
  pregled, potpis i skidanje PDF-a.
- **Redovi u tabelama:** vidi 14 §7 i §9 (48 px u mreži sati, 44 px u običnim
  tabelama, 40 px u listama samo za čitanje). Zaglavlja i redovi zbira su ljepljivi.
- **Status boje**, uvijek uz ikonu i riječ, nikad samo boja:

| Status | Boja | Ikona |
|---|---|---|
| Nacrt | siva | olovka |
| Treba pažnju | jantar | trougao |
| Validirano | plava | kvačica u krugu |
| Potpisano | zelena | pero |
| Predato | tamnozelena | katanac |
| Odbijeno | crvena | X u krugu |
| Ispravljeno (nova verzija) | ljubičasta | strelice |

Mapiranje boja na `period_status` je u 04 §7.1.

- **Panel upozorenja** je desni bočni panel koji ostaje otvoren dok se uređuje
  mreža. Nikad odvojena kartica na koju se mora otići.
- **Svaka greška kaže tri stvari:** koje pravilo, koje brojke, koja popravka. I
  ima dugme koje popravku primijeni ako je jednoznačna.
- **Ništa se ne kuca što sistem zna:** broj izvještaja, datum kraja sedmice,
  podjela ST/OT, kredit beneficije po satu.
- **Prazna stanja** uvijek imaju jednu rečenicu šta je ovo i jedno dugme šta uraditi.
- Bez modala za unos podataka. Modali samo za potvrdu opasnih radnji.

Komponente iz shadcn koje se koriste: Button, Input, Select, Combobox, Table,
Tabs, Sheet (desni panel), Dialog (samo potvrde), Badge, Toast, DropdownMenu,
Command (pretraga), Form (react-hook-form + zod), Skeleton, Alert, Progress,
Tooltip, Card. Mreža sati je TanStack Table s vlastitim ćelijama.

## 2. Mapa ruta

Ukupno **57 ruta**: 50 ekrana i 7 API ruta. Neki redovi ispod pakuju više ruta
(`/legal/*` su tri, auth blok je pet, `/admin/tenants` i njegov detalj su dvije);
kad Claude Code pravi listu ekrana, broji ih razdvojeno.

```
JAVNO
/                                    landing
/pricing                             cijene
/security                            sigurnosna stranica
/legal/terms  /legal/privacy  /legal/dpa
/login  /register  /forgot  /reset/[token]  /verify/[token]
/magic/[token]                       potvrda magic linka (POST klik, ne auto)
/invite/[token]                      prihvatanje pozivnice
/2fa                                 unos TOTP koda poslije lozinke

KORISNIK (prijavljen, izvan firme)
/firms                               moje firme (knjigovođa i svako s više članstava)
/account                             profil
/account/security                    lozinka, 2FA, sesije
/app                                 preusmjeri na zadnju aktivnu firmu ili /firms

FIRMA  /app/[t]/...   ([t] = slug firme; sve ispod traži članstvo)
/app/[t]/dashboard
/app/[t]/onboarding                  čarobnjak, koraci 1 do 7
/app/[t]/projects
/app/[t]/projects/new
/app/[t]/projects/[id]               vremenska linija sedmica
/app/[t]/projects/[id]/settings
/app/[t]/projects/[id]/classifications
/app/[t]/projects/[id]/weeks/[we]    MREŽA SATI  ([we] = week ending, YYYY-MM-DD)
/app/[t]/projects/[id]/weeks/[we]/review
/app/[t]/projects/[id]/weeks/[we]/sign
/app/[t]/projects/[id]/weeks/[we]/reports
/app/[t]/workers
/app/[t]/workers/new
/app/[t]/workers/[id]
/app/[t]/fringe-plans
/app/[t]/imports
/app/[t]/imports/new                 upload → mapiranje → pregled → usklađivanje → potvrda
/app/[t]/imports/[id]
/app/[t]/archive
/app/[t]/settings/company
/app/[t]/settings/team
/app/[t]/settings/signers
/app/[t]/settings/billing
/app/[t]/settings/notifications
/app/[t]/settings/audit
/app/[t]/settings/data               izvoz svega, brisanje firme

PLATFORMA (super-admin)
/admin                               zdravlje, brojke
/admin/tenants  /admin/tenants/[id]  lista firmi, impersonacija s razlogom
/admin/jobs                          red poslova, neuspjeli, ponovi
/admin/wage-schedules                keš platnih tabela, ručna provjera parsiranja
/admin/classifications               seed lista NY klasifikacija

API
/api/health
/api/webhooks/stripe
/api/files/[id]                      autorizovani proxy za skidanje (presigned iza)
/api/v1/periods/[id]/entries         PATCH po ćeliji iz mreže sati (brzo, JSON)
/api/v1/periods/[id]/findings        GET nalazi poslije serverskog proračuna
/api/v1/reports/[id]/status          GET status generisanja (anketiranje)
/api/metrics                         Prometheus, samo interna mreža
```

Sve server akcije žive u `features/<domen>/actions.ts`. Nema javnih REST ruta osim
webhooka, healtha, proxya za fajlove i internih `/api/v1` ruta koje koristi samo
naša mreža sati (iste `requireTenant` provjere kao akcije).

## 3. Zajednički okvir aplikacije

**Bočna traka** (240 px). **Ko vidi koju stavku je tabela u 02 §5 i to je izvor
istine**; redoslijed i engleski nazivi su u 15 §3. Lista ispod je samo podsjetnik:
Dashboard · This week · Projects · Workers · Fringe plans · Import · Archive ·
(grupa Company) Setup · Settings · Help and support.
Birač firme je na vrhu bočne trake, korisnik i pomoć na dnu.

**Kuda vodi "This week".** Stavka nema svoju rutu; ona je prečica i ponaša se po
broju projekata.

**Šta je otvorena sedmica.** "This week" je prečica do unosa sati, pa je otvorena
ona sedmica u koju se sati još smiju unositi. Po 04 §7.1 to su tačno ova stanja:

| `period_status` | Otvorena | Zašto |
|---|---|---|
| nema reda perioda | **da** | sedmica postoji na vremenskoj liniji, samo nije dirana |
| `open` | **da** | |
| `in_review` | **da** | promjena je vraća u `open` |
| `generated` | **da** | nacrt postoji, ali nije potpisan; izmjena pravi v(n+1) |
| `signed` | ne | mreža je zaključana (`locked_at`) |
| `submitted` | ne | isto, bez obzira na ishod |
| `corrected` | ne | vidi ispod |

**`corrected` je zatvorena.** To stanje ne znači "treba je ispraviti" nego "već je
ispravljena": stara verzija je zamijenjena, a rad je prešao u **novi period** s
`corrects_period_id`, koji je sam po sebi `open` dok se ne potpiše. Brojati i
staru i novu značilo bi brojati isti posao dvaput.

Iz istog razloga **odbijena predaja nije zasebno otvorena sedmica**. `submitted` s
ishodom `rejected` ostaje zatvoren; posao koji iz njega slijedi je period
ispravke, i on se broji. Odbijanje se vidi na kontrolnoj tabli, ne u ovom brojaču.

| Stanje firme | Klik vodi na |
|---|---|
| nema aktivnih projekata | `/app/[t]/projects` s praznim stanjem i dugmetom "Add your first project" |
| jedan aktivan projekat | mreža **najstarije otvorene sedmice** tog projekta |
| dva ili više | `/app/[t]/projects?open=1`, lista filtrirana na projekte koji imaju otvorenu sedmicu |
| sve zatvoreno | mreža sedmice koja je u toku, na jedinom ili posljednje otvaranom projektu |

**Najstarija otvorena, ne kalendarski tekuća.** Rok u NY teče od najstarije
nepredate sedmice, ne od ove u kojoj smo. Ako je zaostalo tri sedmice, korisnika
treba odvesti na prvu od njih, jer ona nosi kaznu. Kalendarski tekuća sedmica mu
je uvijek na dohvat s vremenske linije projekta.

**Ne skače se na "posljednje otvarani projekat".** Prošle sedmice je to mogao
biti projekat A, a ove treba B. Tiho skakanje na pogrešan projekat znači sate
unesene u pogrešnu sedmicu, a to je greška koja se vidi tek pri kontroli.

Zato se s dva ili više projekata **uvijek** bira, i bira se na već postojećoj
listi projekata, ne na novom ekranu: ta tabela ionako ima naziv, PRC, sljedeći
rok, status tekuće sedmice i broj upozorenja, dakle tačno ono što treba za izbor.

**Brojač na stavci** je broj otvorenih sedmica na svim aktivnim projektima. Kad
je nula, brojača nema.

**Traka stranice** (iznad sadržaja): putanja, naslov, akcije desno, globalna
pretraga (Cmd+K: projekti, radnici, sedmice) i zvono za obavještenja (rokovi,
neuspjele naplate).

**Traka stanja pretplate** (ispod gornje trake, samo kad treba): "Probni period,
još 9 dana", "Pretplata pauzirana, generisanje isključeno", "Naplata nije
uspjela, ažuriraj karticu".

---

## 4. Ekrani

Format svakog: Svrha · Sadržaj · Glavna akcija · Stanja · Podaci · Pravila ·
Prihvatanje. Ko vidi koji ekran nije ponavljano po ekranu: važi matrica iz 02 §3
i navigacija iz 02 §5; ekran koji uloga ne smije vidjeti vraća stanje "zabranjeno".

### 4.1 Javno

**/ landing**
- Svrha: objasniti u 10 sekundi šta je i za koga, uz dokaz (NY mandat, kazna).
- Sadržaj: naslov, jedna rečenica, tri dokaza s brojkama, kako radi u 3 koraka,
  cijena u kratko, FAQ (8 pitanja, lista je u 16 §5), CTA "Probaj 14 dana besplatno".
- Bez slika ekrana dok proizvod ne postoji. Bez lažnih recenzija.
- Prihvatanje: LCP ispod 1,5 s na 3G (isti cilj kao 16 §8 i 12 korak 3b), radi
  bez JS-a za čitanje.

**/pricing**
- Sadržaj: jedna pretplata 79 $ mjesečno, 14 dana probno s karticom, bez naplate po projektu; tabela tri nivoa
  postavke 149 / 299 / 499 s kriterijima; šta je uključeno; "Pauziraj između
  poslova" objašnjeno; FAQ o naplati.
- Prihvatanje: nijedan skriveni trošak, nema "kontaktiraj prodaju".

**/security**
- Sadržaj: šta čuvamo (tabela), šta ne čuvamo (pun SSN), šifrovanje, gdje su podaci
  (SAD), ko su podprocesori, kako prijaviti ranjivost, link na DPA.

**/register**
- Polja: ime, email, lozinka (min 12, provjera protiv procurjelih), naziv firme,
  država (fiksno New York u v1), checkbox uslovi + DPA.
- Glavna akcija: "Napravi nalog" → email za potvrdu → /verify.
- Stanja: email zauzet (ponudi prijavu), slaba lozinka (objasni), greška servera.
- Pravila: firma se pravi tek poslije potvrde emaila. Slug firme iz naziva,
  jedinstven.

**/login**
- Email + lozinka, ili "Pošalji mi link", ili passkey. Bez Google/social prijave u MVP-u.
- Poslije lozinke, ako je 2FA uključen → /2fa.
- Stanja: pogrešni podaci (isti tekst za oba slučaja), previše pokušaja (poslije 10
  neuspjelih zaključavanje 15 min, poruka kaže kad opet može), nalog nepotvrđen (ponudi ponovno slanje).

**/magic/[token]**
- Stranica s jednim dugmetom "Prijavi me". Token se troši tek na POST, jer email
  skeneri otvaraju linkove.

**/invite/[token]**
- Prikazuje ko poziva, u koju firmu, s kojom ulogom. Ako korisnik nije prijavljen,
  vodi na registraciju/prijavu s istim emailom, u varijanti **bez kreiranja
  firme** (`/register?invite=token` preskače polje naziv firme). Prihvatanje samo
  ako se email poklapa.

### 4.2 Korisnik

**/firms  Moje firme**
- Svrha: početni ekran za knjigovođu i svakog s više firmi.
- Sadržaj: kartica po firmi: naziv, uloga, broj aktivnih projekata, **sljedeći rok**
  (najraniji među projektima) i status te sedmice, dugme "Otvori".
- Sortirano po najbližem roku.
- Prazno: "Nemaš još nijednu firmu. Napravi svoju ili čekaj pozivnicu."
- Prihvatanje: klik na firmu postavlja aktivni tenant i vodi na njen dashboard.

**/account, /account/security**
- Profil: ime, email (promjena traži potvrdu), jezik (en, kasnije es).
- Sigurnost: promjena lozinke, 2FA (QR + kodovi za oporavak, obavezno za uloge iz
  02), lista aktivnih sesija s "odjavi", dugme "Odjavi sve".

### 4.3 Firma: kontrolna tabla i onboarding

**/app/[t]/dashboard**
- Svrha: u tri sekunde odgovoriti "šta mi gori ove sedmice".
- Sadržaj, odozgo:
  1. **Rokovi**: dva brojača, ne jedan. Gore po projektu: "NY predaja, 12 dana do
     30-dnevnog roka" (od `last_accepted_submission_at`), crveno kad prođe i
     tamnocrveno poslije 14 dana grejsa jer tad kazna od 100 $ dnevno postaje
     pravno moguća. Ispod: lista sedmica koje nisu zatvorene, po projektu, sa
     statusom i dugmetom "Otvori sedmicu". Federalni projekti imaju treći red:
     "WH-347 za 5.9., 2 dana do isteka 7 dana od isplate".
  2. **Sedmice bez unosa**: projekti gdje tekuća sedmica nema ni sate ni oznaku
     "bez rada".
  3. **Nedavno**: zadnjih 5 izvještaja s verzijom i statusom.
  4. **Zdravlje podataka**: radnici bez klasifikacije, projekti bez PRC broja,
     istekle stope (poslije 1. jula), pripravnici bez registracije.
- Prazno (nova firma): jedna kartica "Počni ovdje" koja vodi u onboarding.
- Podaci: `DashboardDTO { deadlines[], missingWeeks[], recentReports[], healthIssues[] }`
- Prihvatanje: nijedan podatak se ne učitava sporije od 500 ms na 50 projekata.

**/app/[t]/onboarding  Čarobnjak (7 koraka, može se prekinuti i nastaviti)**

Korak 1, Firma: pravni naziv, adresa, FEIN, NYS registracioni broj i istek, uloga
na poslovima (uglavnom podizvođač), dan kraja sedmice (npr. subota).

Korak 2, Prvi projekat: naziv, PRC broj (provjera formata), naručilac, glavni
izvođač, broj ugovora, okrug, datum početka, federalno finansiran da/ne (ako da,
WD broj i modifikacija). **Prekovremeni se ovdje ne biraju**: NY premije dolaze
iz OT kodova klasifikacije u koraku 4, a federalni prag od 40 sati se uključuje
samo ako je projekat federalno finansiran.

Korak 3, Klasifikacije za projekat: pretraga zvanične NY liste (Combobox sa zvaničnom listom, filtriran po zanatu), za svaku odabranu: osnovna stopa i dodatak po satu,
datum važenja. Dugme "Zalijepi tabelu iz platnog rasporeda" koje parsira
kopirani tekst i predloži redove (korisnik potvrđuje).

Korak 4, Radnici: ručno ili uvoz CSV-a (vodi u tok uvoza i vraća se). Po radniku:
ime, prezime, zadnje 4 SSN **ili** datum rođenja (jedno od dva, UI to forsira),
adresa (puna, jer NY XML traži), klasifikacija po defaultu, majstor ili
pripravnik (ako pripravnik: program, registrar, nivo, procenat).

Korak 5, Beneficije: planovi (naziv, vrsta iz `supplement_kind`: Health/Welfare,
Vacation/Holiday, Apprenticeship/Training, Pension, Other; način: u plan ili u
gotovini; anualizacija da/ne; broj plana), pa po radniku kredit po satu, s pretvaračem "mjesečna premija →
po satu" koji pokazuje djelitelj.

Korak 6, Prva sedmica: bira datum kraja sedmice, otvara mrežu.

Korak 7, Naplata: bira setup nivo (Basic, Standard, Full, ili "Postaviću sam"),
Stripe Checkout s karticom (trial 14 dana za pretplatu, setup se naplaćuje odmah).
Povratak s Checkouta zatvara čarobnjak. Detalji u 08 §2.1.

- Traka napretka gore. Svaki korak se snima odmah. "Preskoči za sada" dozvoljen
  na koracima 4, 5 i 7 (7 se može preskočiti samo dok traje trial), ali dashboard onda pokazuje rupu u zdravlju podataka.
- Prihvatanje: nov korisnik od registracije do nacrta prvog izvještaja za manje od
  30 minuta uz gotov CSV.

### 4.4 Projekti

**/app/[t]/projects**
- Tabela: naziv, PRC, naručilac, uloga, sljedeći rok, sedmica u toku (status),
  broj otvorenih upozorenja, akcije. Filter: aktivni / pauzirani / zatvoreni.
- **`?open=1`** dodatno filtrira na projekte koji imaju otvorenu sedmicu i sortira
  po najstarijoj otvorenoj sedmici, najstarija gore. Tu vodi "This week" kad firma
  ima dva ili više aktivnih projekata (vidi §3). U tom stanju kolona "sedmica u
  toku" pokazuje **najstariju otvorenu**, s njenim datumom, i klik na red otvara
  baš nju, ne vremensku liniju projekta.
- Glavna akcija: "Novi projekat".
- Prazno: kartica s objašnjenjem šta je PRC i dugmetom.

**/app/[t]/projects/new** i **/settings**
- Ista forma kao korak 2 onboardinga, plus: datum očekivanog završetka, adresa
  gradilišta, "work pause" periodi, čuvanje (`retention_years`, default 6, od zatvaranja projekta),
  status (prikaz: nacrt = draft, aktivan = active, pauziran = paused, završen =
  completed, arhiviran = archived).
- Pravila: PRC + broj ugovora jedinstveni u firmi (04: U (tenant_id, prc_number, project_number)). Promjena dana kraja sedmice
  poslije prve sedmice je zabranjena (objašnjenje zašto).

**/app/[t]/projects/[id]  Vremenska linija sedmica**
- Svrha: vidjeti svaku sedmicu od početka projekta do danas, bez rupa.
- Sadržaj: lista sedmica generisana automatski od datuma početka: datum kraja,
  redni broj izvještaja (dodijeljen pri potpisu; prije toga "sljedeći: N"), status, sati ukupno, broj radnika, upozorenja,
  akcije (Otvori, Označi bez rada, Skini). Sedmice bez ikakvog unosa su jasno
  označene "nema unosa".
- Gornji red: kartice PRC, WD, naručilac, glavni izvođač, klasifikacije (broj),
  sljedeći rok.
- Glavna akcija: "Otvori tekuću sedmicu".
- Prihvatanje: nemoguće je "preskočiti" sedmicu a da se ne vidi.

**/app/[t]/projects/[id]/classifications**
- Tabela: klasifikacija (zvanični naziv), osnovna stopa, dodatak, važi od, važi do,
  OT kod, izvor (ručno / zalijepljeno / keš), pripravnički uslovi.
- Akcije: dodaj, uredi, "Nova verzija stope od datuma" (ne prepisuje staru, jer
  stare sedmice moraju ostati tačne).
- Upozorenje ako stopa nema važeći red za tekuću sedmicu (poslije 1. jula).

### 4.5 Mreža sati (srce proizvoda)

**/app/[t]/projects/[id]/weeks/[we]**
- Svrha: unijeti sate za sve radnike na ovom projektu za ovu sedmicu, za manje od
  10 minuta, bez pogreške koja se ne vidi.
- Raspored: lijevo mreža, desno panel upozorenja (Sheet, uvijek otvoren na
  desktopu), gore traka sedmice.
- **Traka sedmice:** ime projekta, "Sedmica koja završava 13.9.2026.", redni broj
  izvještaja (ili "biće #N pri potpisu"), status, dugmad: "Kopiraj prošlu sedmicu", "Uvezi CSV", "Označi
  bez rada", "Pregledaj i generiši" (primarno).
- **Mreža:**
  - Red = radnik + klasifikacija. Ispod radnika dugme "+ Dodaj klasifikaciju"
    pravi drugi uvučeni red.
  - Kolone: Radnik · Klasifikacija · J/RA · **sedam dana** (s datumima u
    zaglavlju) · Ukupno · ST · OT · Stopa ST · Stopa OT · Fringe status ·
    Bruto (projekat).
  - **Redoslijed dana se izvodi, ne hardkodira**: prva kolona je
    `week_ending` minus 6 dana, zadnja je `week_ending` (05 §4). Za firmu kojoj
    sedmica završava subotom to je nedjelja do subota. Dan kraja sedmice je
    podesiv po firmi (`week_ending_dow` u 04).
  - Ćelija dana prima **ukupne sate** (npr. 9). Motor dijeli ST i OT po OT
    kodovima klasifikacije tog reda i po federalnom pragu, i ispod broja pokazuje
    izračunati dio kao `OT 1.0`. Unos `8/1` u ćeliju razdvaja ručno.
  - Tab / Enter / strelice se kreću kao u Excelu. Lijepljenje bloka iz Excela puni
    više ćelija. Escape poništava ćeliju.
  - Ljepljiv red zbira dole: sati po danu, ST, OT, bruto.
  - Radnik bez sata cijele sedmice ostaje u mreži sivo; ne ide u izvještaj.
- **Panel upozorenja (desno):** lista nalaza uživo, grupisano: Blokira (crveno) /
  Provjeri (jantar) / Info. Svaki nalaz: pravilo, brojke, dugme "Popravi" kad je
  jednoznačno, i link koji fokusira ćeliju. Brojač "3 blokira, 2 provjeri" u vrhu.
- **Motor radi u pregledniku**: `core` je čist TypeScript pa se pri svakom unosu
  izvrši lokalno i panel se osvježi odmah; server radi isti proračun pri snimanju
  i njegov rezultat je mjerodavan. **Automatsko snimanje** svake promjene ćelije
  (debounce 800 ms), indikator "Snimljeno 12:41".
- Stanja: prazna sedmica (ponudi kopiranje prošle ili uvoz), zaključana sedmica
  (potpisana ili predata: read-only s dugmetom "Napravi ispravku"), konflikt (neko drugi mijenja:
  pokaži ko i kada, zadnji piše pobjeđuje uz upozorenje).
- Podaci: `WeekGridDTO { project, weekEnding, rows[{workerId, classificationId, days[7]{st,ot}, rates, fringeStatus, gross}], totals, findings[] }`
- Pravila: zbir sati po radniku po danu preko svih redova ≤ 24; prekovremeni po
  OT kodovima klasifikacije reda (01 §2.1); klasifikacija mora imati važeću stopu
  i bar jedan OT kod za tu sedmicu.
- Prihvatanje: 12 radnika × 5 dana unese se za manje od 4 minute samo tastaturom;
  nijedna promjena se ne gubi pri osvježavanju; panel nalaza se osvježi za manje od
  300 ms poslije unosa (lokalni motor), a serverski rezultat stigne u 2 s.

**/app/[t]/projects/[id]/weeks/[we]/review  Pregled i generisanje**
- Svrha: zadnja provjera prije potpisa, s pregledom onoga što će biti poslano.
- Sadržaj: lijevo tabela sažetka po radniku (sati, stope, fringe, bruto projekat,
  bruto sav rad, odbici, neto), desno panel nalaza (isti kao u mreži). Ispod:
  kartice "NY XML" i "WH-347" s pregledom (XML kao formatiran tekst s
  označenim elementima; WH-347 kao PDF pregled).
- Dio "Odbici i sav rad": po radniku bruto za sav rad i odbici po vrstama (ovo
  najčešće fali jer nije u satima). Uvoz iz CSV-a ih puni; inače ručno.
- Glavna akcija: "Generiši nacrt" (radi u pozadini, pokazuje napredak), pa
  "Pošalji na potpis" ili "Potpiši" (po ulozi).
- Blokira dok postoji ijedan crveni nalaz. Jantar dozvoljava uz potvrdu.
- Prihvatanje: XML nacrt prolazi validaciju prema shemi prije nego se prikaže kao
  spreman.

**/app/[t]/projects/[id]/weeks/[we]/sign  Potpis**
- Sadržaj: puni tekst izjave o usklađenosti sa šest tačaka (nova verzija obrasca
  iz januara 2025.), tabele za pripravnike i planove beneficija ako postoje,
  polja: puno ime, naslov, telefon, email potpisnika (predpopunjeno iz profila
  potpisnika), upozorenje 18 U.S.C. 1001, checkbox "Razumijem", ponovni unos
  lozinke ili 2FA koda.
- Glavna akcija: "Potpiši i zaključaj sedmicu".
- Poslije potpisa: period postaje `signed`, izvještaj `final`, mreža zaključana, PDF i
  XML se finaliziraju, ide na /reports.
- Prihvatanje: audit zapis sadrži ko, kada, IP, verziju teksta izjave, hash fajlova.

**/app/[t]/projects/[id]/weeks/[we]/reports  Izvještaji i predaja**
- Sadržaj: verzije (v1, v2 ispravka...) s vremenom, potpisnikom, statusom; za svaku:
  skini XML, skini WH-347 PDF, skini CSV za LCPtracker/B2Gnow; dio "Predaja":
  dugme "Označi kao predato u NYSDOL portal" s poljem za potvrdu i vrijeme,
  "Poslato glavnom izvođaču" s emailom; dio "Odgovor portala": prihvaćeno /
  odbijeno s razlogom (ručni unos, jer portal nema API).
- Akcija "Napravi ispravku": otvara mrežu kao novu verziju s obaveznom napomenom
  šta je ispravljeno; stara verzija ostaje.
- Polje **"Zalijepi grešku iz portala"**: portal vraća grešku s brojem linije i
  pozicije znaka; mi je prevedemo u "radnik Chen, David, polje address1, 51 znak
  a limit je 42" i ponudimo popravku. Ovo je jedna od najvrednijih sitnica u
  proizvodu.
- Ako je sedmica bez rada: umjesto XML-a stoji kartica "Sedmice bez rada se ne
  predaju fajlom. U portalu čekiraj No Work Week za 5.9., ili unesi raspon kroz
  Enter Work Pause Dates." s dugmetom "Označeno, zabilježi predaju".
- Uputstvo korak po korak kako se XML učitava u NYSDOL portal (sa slikama kasnije),
  jer portal traži da sedmica bude prazna prije uvoza.

### 4.6 Radnici i beneficije

**/app/[t]/workers**
- Tabela: ime, default klasifikacija, J/RA, projekti na kojima radi, status, zadnja
  sedmica s satima. Filter aktivni/neaktivni. Pretraga.
- Bez adresa i SSN u listi.
- Akcije: novi, uvezi.

**/app/[t]/workers/[id]**
- Kartice: Osnovno (ime, ID iz payroll sistema), Identifikacija (zadnje 4 SSN ILI
  datum rođenja; polje pokazuje samo "••••1234" i traži klik "Prikaži" koji se
  loguje), Adresa (puna, NY je traži), Pripravnik (program, registrar OA/SAA/NYSDOL,
  broj, datum registracije, nivo, procenat, omjer, dokument), Beneficije po radniku
  (kredit po satu po planu), Istorija sedmica.
- Pravila: SSN polje prima tačno 4 cifre, server odbija duže. Nikad ne postoji
  polje za pun SSN.

**/app/[t]/fringe-plans**
- Tabela planova: naziv, vrsta (Health/Welfare, Vacation/Holiday,
  Apprenticeship/Training, Pension, Other), fondiran, broj plana, anualizacija
  da/ne, broj radnika. Detalj: pretvarač premija → po satu s prikazom djelitelja
  i napomenom o 2.080 satima.

### 4.7 Uvoz

**/app/[t]/imports/new  (4 koraka)**
1. **Upload**: CSV ili XLSX do 10 MB. Bira se profil (Gusto, ADP RUN, Paychex, QBO,
   busybusy, ClockShark, "Drugi") ili snimljeni profil firme. Vrsta uvoza
   (`import_kind`): radnici / platna lista sedmice (payroll) / dnevni sati (hours).
2. **Mapiranje kolona**: lijevo kolone iz fajla s uzorkom vrijednosti, desno ciljna
   polja; automatsko sparivanje s oznakama "sigurno / vjerovatno / provjeri";
   obavezna polja gore; transformacije (format datuma, sati kao decimalno ili
   HH:MM, razdvajanje imena). Snimi kao profil.
3. **Pregled**: prvih 50 redova kako će ući, greške po redu na običnom jeziku,
   brojač "212 ok, 3 greške".
4. **Usklađivanje i primjena**: "Uvezeni bruto po radniku vs. tvoj payroll registar" s
   razlikom, jer je najčešća žalba na konkurenciju "nije prenio sve plate". Tek
   onda "Potvrdi uvoz". Detalji koraka u 06 §2.
- Sigurnost: ćelije koje počinju sa `= + - @` se tretiraju kao tekst; XLSX se
  odbija ako je raspakovan veći od 50 MB.

**/app/[t]/imports i /imports/[id]**
- Istorija uvoza: kad, ko, profil, broj redova, greške, poništi (do 90 dana, ako
  sedmica nije potpisana).

### 4.8 Arhiva

**/app/[t]/archive**
- Svrha: naći bilo koji izvještaj za 10 sekundi tokom kontrole.
- Filteri: projekat, godina, status, verzija, radnik (pretraga po imenu vraća
  sedmice u kojima se pojavljuje). Tabela: projekat, sedmica, verzija, status,
  potpisnik, predato kad, fajlovi.
- Akcija: "Izvezi sve za projekat" (zip: svi PDF + XML + CSV sažetak).
- Prihvatanje: kontrola koja traži "sve za PRC 2010008390 u 2026." se rješava
  jednim klikom.

### 4.9 Postavke

**/settings/company**: sve iz koraka 1, plus logo (za PDF ne treba), vremenska zona.

**/settings/team**: članovi s ulogom, pozovi (email + uloga), promijeni ulogu,
ukloni, pozivnice na čekanju. Objašnjenje uloga inline.

**/settings/signers**: ko smije potpisati, s naslovom i kontaktom; prekidač za
knjigovođu "smije potpisivati u ovoj firmi".

**/settings/billing**: trenutni plan, probni period, sljedeća naplata, kartica
(Stripe Customer Portal za promjenu), računi, dugmad "Pauziraj" (objašnjeno šta
ostaje) i "Otkaži" (tok: razlog → izvezi arhivu → potvrdi imenom firme).
Postavka koja je naplaćena i njen nivo.

**/settings/notifications**: podsjetnici na rok (koliko dana prije, kome), sedmica
bez unosa (ponedjeljak), neuspjela naplata, novi član. Kanali: email; SMS
isključen dok nema pisanog pristanka (checkbox s punim tekstom pristanka i
zapisom).

**/settings/audit**: dnevnik: prijave, promjene uloga, pregled PII, generisanje,
skidanje, potpisi, ispravke. Filter po korisniku i vrsti. Izvoz CSV.

**/settings/data**: izvoz svega (JSON + svi fajlovi), zahtjev za brisanje firme
(30 dana milosti, potvrda, obavijest o obavezi čuvanja).

### 4.10 Platforma (/admin)

- **/admin**: broj firmi, aktivnih pretplata, MRR, izvještaja ove sedmice, red
  poslova (čeka / radi / palo), zadnje greške iz Sentryja (link).
- **/admin/tenants**: lista, pretraga, status pretplate, zadnja aktivnost; detalj s
  dugmetom "Impersoniraj" koje traži razlog, važi 30 minuta, loguje se i vidljivo
  je vlasniku firme u njegovom dnevniku.
- **/admin/jobs**: pg-boss redovi, neuspjeli s greškom, "Ponovi", "Odbaci".
- **/admin/wage-schedules**: keš po PRC/WD, kad povučeno, status parsiranja,
  ručna provjera i odobrenje prije nego stope postanu dostupne firmama.
- **/admin/classifications**: seed lista, verzija, diff prema zvaničnoj stranici.

## 5. Redoslijed izrade ekrana (na mock podacima)

1. Okvir: layout, bočna traka, birač firme, prazna stanja, dizajn tokeni.
2. Mreža sati + panel upozorenja (najteži ekran, radi se prvi da se dizajn provjeri).
3. Pregled i generisanje, potpis, izvještaji.
4. Vremenska linija projekta, lista projekata, klasifikacije.
5. Radnici, detalj radnika, planovi beneficija.
6. Onboarding čarobnjak (koristi već napravljene forme).
7. Uvoz (4 koraka).
8. Arhiva.
9. Dashboard, Moje firme.
10. Postavke (tim, potpisnici, naplata, obavještenja, dnevnik, podaci).
11. Auth ekrani.
12. Admin.
13. Javne stranice.

Svaki ekran se smatra gotovim kad: radi na mock podacima, ima svih **pet** stanja
(učitavanje, prazno, greška, zabranjeno, **zaključano**), radi tastaturom, i ima
Playwright test za glavnu akciju. Puna definicija gotovog, s kriterijima koje
automatske provjere ne hvataju, je u **19 §10**.
