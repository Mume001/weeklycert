# Sistem kontakta: detaljna analiza

Napisano 12.09.2026. Sve provjereno, izvori na dnu.
Ovo nije pravni savjet. Prije nego pošalješ ijednu poruku, pročitaj poglavlje 0.

---

## 0. SMS se NE radi. Ovo je jedina stvar u projektu koja te može uništiti.

Tražio si sistem koji šalje poruke na brojeve telefona. Provjerio sam i odgovor
je jednoznačan: **hladan SMS na te brojeve je zabranjen dvostruko, zakonom i
pravilima mobilnih operatera, a operateri te zaustave prvi.**

### Zašto zakon

Zakon koji to reguliše je TCPA (47 U.S.C. §227). Ključne stavke:

- **500 $ po jednoj poruci**, a **1.500 $ po poruci** ako se ocijeni namjernim.
  Nema gornje granice. Nema potrebe da tužilac dokaže bilo kakvu štetu.
  Hiljadu poslanih poruka = 500.000 $ osnovno, 1.500.000 $ uvećano.
- **Nema izuzetka za B2B.** Postoji jedna B2B iznimka u američkom pravu, ali je
  u pravilima FTC-a za telefonske pozive, ne u TCPA. Sam §227(b) pokriva „bilo
  koji broj dodijeljen mobilnoj usluzi", bez razlike firma/građanin.
- **Presedan je napravljen na tvom tačnom scenariju.** *Chennette v. Porch.com*
  (Deveti žalbeni sud, 2022), tužbu su podnijeli **građevinski izvođači** koji
  su dobili hladne SMS poruke. Sud je presudio da se mobilni broj koji se
  koristi i privatno i poslovno **pretpostavlja privatnim**. Kod firmi s jednim
  do pet ljudi, broj iz registra je gotovo uvijek vlasnikov mobitel.
- **Javna objava broja nije pristanak.** Ne postoji nijedna odluka koja kaže da
  objava u državnom registru znači saglasnost. FCC je 2012. ukinuo čak i izuzetak
  za postojeći poslovni odnos, ako ni raniji posao s nekim nije dovoljan,
  spisak sigurno nije.
- **LLC te ne štiti.** Tužioci rutinski tuže i vlasnika lično. To što si u
  Bosni otežava dostavu tužbe, ne odgovornost.
- **Države naslažu svoje.** Florida i Oklahoma imaju svoje zakone: opet 500 $ po
  poruci, trostruko za namjeru, bez B2B izuzetka. Tamo je i najviše advokata
  koji od ovoga žive.

### Zašto operateri: i ovo te stopira prije zakona

Da bi uopšte slao SMS na američke brojeve s obične desetocifrene numeracije,
moraš proći **A2P 10DLC registraciju**. Neregistrovan saobraćaj AT&T, T-Mobile
i Verizon blokiraju bez pitanja. Registracija je jeftina (40-ak dolara) i tvoj
LLC je može proći, ali **formular traži da opišeš kako ljudi daju pristanak.**
Ti ga nemaš. Ne postoji tačan odgovor koji možeš upisati.

A pravila platformi to imenuju doslovno. Telnyx zabranjuje:

> „Prikupljanje broja telefona primaoca u drugu svrhu, pa slanje poruka."

To je tačno ono što bi radio sa spiskom iz registra. Twilio zabranjuje „slanje
neželjenih poruka u velikom broju". CTIA smjernice traže pisani pristanak prije
prve poruke.

Šta se stvarno desi ako probaš: kampanja se odbije na registraciji. Ako je
provučeš netačnim opisom, filteri operatera prepoznaju obrazac za nekoliko sati
, velika količina prema brojevima koji ne odgovaraju, nula odgovora, prijave za
spam. Slijedi tiho blokiranje, pa blokiranje broja, pa suspenzija kampanje, pa
gašenje naloga i zadržavanje sredstava, a EIN tvoje firme ostaje obilježen za
svaku buduću registraciju.

### Šta radimo umjesto toga

SMS ostaje u planu, ali **na drugom mjestu u lijevku**: kad kupac sam potvrdi
pristanak, SMS postaje kanal za podsjetnike na rok. Za ovu nišu je to i dobra
funkcija proizvoda, ne samo marketing, „u utorak ti ističe rok za predaju".
Detalji u poglavlju 8.

---

## 1. Kanali, poredani po pravnom riziku

| # | Kanal | Rizik | Presuda |
|---|---|---|---|
| 1 | **Fizička pošta** na poslovnu adresu | Zanemariv | Nema pristanka, nema opt-outa, nema privatne tužbe. Potcijenjen kod izvođača. |
| 2 | **Hladan email** uz CAN-SPAM | Nizak | **Glavni kanal.** Ne postoji privatno pravo na tužbu, samo FTC i državni tužioci. Ograničenje je isporučivost, ne zakon. |
| 3 | **LinkedIn poruke** | Nizak | Nema TCPA ni CAN-SPAM izloženosti. Rizik je gašenje naloga. |
| 4 | **SMS poslije pristanka** | Nizak | Legalno uz uredan zapis pristanka i poštovanje STOP u 10 radnih dana. |
| 5 | Ručni poziv na fiksni broj firme | Srednji | Dozvoljeno uz interni DNC pravilnik i provjeru registra. Nekoliko država traži registraciju. |
| 6 | Poziv na mobilni | Visok | Jedna snimljena govorna poruka i pao si pod §227(b). |
| 7 | **Hladan SMS sa spiska** | **Egzistencijalan** | **Ne radi se.** |

---

## 2. Šta gradimo: cijela arhitektura

```
KORAK 1   Registar države NY  →  sirovi CSV, 14.176 firmi
KORAK 2   Filtriranje kodom   →  ciljna lista, 2.000-4.000 firmi
KORAK 3   Obogaćivanje        →  web sajt, email, verifikacija
KORAK 4   Email sekvenca      →  3 dodira, 60-80 dnevno
KORAK 5   Fizička pošta       →  onima bez emaila (40-60% liste)
KORAK 6   Stranica za odgovor →  obrazac s pristankom
KORAK 7   SMS podsjetnici     →  tek poslije pristanka
```

Sve osim koraka 7 gradimo odmah. Korak 7 tek kad ima prvog kupca.

---

## 3. Lista: od registra do kontakta, korak po korak

### 3.1 Skidanje

Izvor je javni, besplatan, bez ključa i bez registracije:

```
https://data.ny.gov/api/views/i4jv-zkey/rows.csv?accessType=DOWNLOAD
```

Provjerio sam sadržaj uživo. Polja koja stvarno dolaze:

| Polje | Šta je |
|---|---|
| `certificate_number` | broj registracije |
| `business_name`, `dba_name` | naziv i trgovački naziv |
| `business_type` | pravni oblik |
| `address`, `city`, `state`, `zip_code` | **poštanska adresa, za fizičku poštu** |
| `phone` | broj telefona (deset cifara, bez formata) |
| `issued_date`, `expiration_date` | datum izdavanja i isteka |
| `status` | Active / ostalo |
| `business_is_associated_with_an_apprenticeship_program` | **najjači signal kvalifikacije** |
| `business_is_sponsor_of_a_program_`, `business_is_signatory_to_a_group_program` | vrsta programa |
| `business_has_outstanding_wage_assessments` | ima neizmirenih naloga za nadnice |
| `business_has_been_debarred` | bio zabranjen |
| `business_has_final_determination_for_violation_of_labor_or_tax_law` | pravosnažna odluka o prekršaju |
| `business_is_mwbe_owned`, `business_is_publicly_traded` | vlasništvo |
| `business_has_workers_compensation_insurance` | osiguranje |

### 3.2 Filtriranje: redoslijed i razlog svakog filtera

1. `status == "Active"`, ostalo ne radi javne poslove.
2. `expiration_date` u budućnosti, isteklu registraciju ne obnavlja onaj ko je
   odustao od javnih poslova.
3. `business_is_publicly_traded == false`, javna preduzeća su prevelika.
4. Izbaci sve gdje `business_has_been_debarred == true`, ne mogu raditi javne
   poslove, dakle nemaju problem koji rješavaš.
5. **Zadrži** one gdje je `business_has_outstanding_wage_assessments == true`, 
   to je firma koja je već imala problem s nadnicama. Nije diskvalifikacija nego
   suprotno: ima razloga da se boji.
6. **Prvi krug: samo oni s pripravničkim programom.** Firma koja vodi
   pripravnike ima najsloženiji obračun (omjeri, nivoi, procenti) i najviše
   izgubi ako pogriješi. To je uža i bolja lista.
7. Ukloni duplikate po `certificate_number`, pa po normalizovanom nazivu.
8. Podijeli po regijama (NYC, Long Island, Hudson Valley, Upstate), koristi se
   u tekstu poruke.

Ovo je jedan Python skript od tridesetak linija. Rezultat: dvije liste, 
**„zlatna"** (pripravnički program, aktivni) i **„šira"**.

### 3.3 Obogaćivanje: nalaženje emaila

Registar **nema email polje**. To je normalno; nijedan državni izvor ga nema.
Očekivano pokrivanje kod malih izvođača: **30-50%**. Ostatak nema sajt uopšte.

Redoslijed:
1. Za svaku firmu potraži zvanični sajt (naziv + grad + „NY").
2. Ako sajt postoji: pokupi `info@`, `office@`, `contact@` sa stranice.
3. Ako ne piše, pogodi obrazac (`ime@domen`, `imeprezime@domen`) pa **verifikuj**.
4. Ako sajt ne postoji, firma ide na listu za **fizičku poštu**, ne forsiraj email.

**Verifikacija je obavezna, ne opcija.** MillionVerifier ili sličan, oko
1,50-2 $ na hiljadu adresa. Za par hiljada kontakata to je 5-15 $ ukupno.
Razlog je u poglavlju 9: odbijene poruke ubijaju domenu brže od svega drugog.

**Pravno o prikupljanju.** CAN-SPAM zabranjuje „harvesting", ali zakon to
definiše usko: **automatsko** preuzimanje adresa sa sajta koji je **objavio da
ih ne daje**, ili generisanje adresa pogađanjem. Ručno prikupljanje i
preuzimanje sa sajta koji nema takvu zabranu nije to. Automatsko skidanje s
LinkedIna, Facebooka ili Yelpa **jeste** kršenje njihovih uslova i oni to
provode. Kupljene liste ne dolaze u obzir: mjereno 0,8% odgovora naspram 4,6%
kod verifikovanih, i 3-8% odbijenih poruka.

**Kanada se isključuje.** CASL traži pristanak unaprijed i ima ozbiljne kazne.
Filtriraj po državi, šalji samo u SAD.

---

## 4. Email infrastruktura: najsitniji detalji

### 4.1 Domene

**Nikad ne šalji hladan email sa glavne domene.** Ako je spališ, tvoje fakture,
lozinke i odgovori kupaca idu u spam s njom. Reputacija domene se ne popravlja
brzo.

- Kupi **2-3 slične domene**: `getIME.com`, `IME.io`, `try-IME.com`.
- Svaka radi 301 preusmjerenje na glavni sajt.
- Hladan email ide isključivo s njih.

### 4.2 Sandučići i količine

Realan limit po sanduku u 2026: **20-50 dnevno za razrađen, 10-20 za nov.**
Google mehanički dozvoljava 2.000, ali to nema veze s tim šta prolazi filtere.

Za 80 dnevno: **2 domene × 3 sandučića = 6 sandučića po ~15 dnevno.** Ostaje
rezerva i jedan pokvaren sanduk ne ruši cijelu operaciju.

### 4.3 DNS: postavi tačno ovako, na svakoj domeni

| Zapis | Vrijednost | Zašto |
|---|---|---|
| **SPF** | TXT, jedan zapis, sa `~all` | Bez njega Gmail od novembra 2025. **odbija** poruku (`550-5.7.26`), ne šalje je u spam |
| **DKIM** | 2048-bitni ključ kod provajdera | Isto |
| **DMARC** | `v=DMARC1; p=none; rua=mailto:...` | `p=none` je dovoljan po Googleovoj dokumentaciji. Ko ti tvrdi da treba `p=quarantine`, prodaje ti nešto. |
| **PTR** | reverzni DNS na IP-u | Traži se od svih pošiljalaca |
| **List-Unsubscribe** | `<https://...>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | RFC 8058. Traži se od 5.000 dnevno, ali stavi odmah, besplatno je |

### 4.4 Zagrijavanje

- Nova domena **stoji 2-4 sedmice** prije prvog pravog slanja.
- Rampa: 5 dnevno prve sedmice, 10 druge, 20 treće, 30-40 do pete.
- Google sanduk dostiže punu brzinu za 14-16 dana, Microsoft za 17-21.
- **O automatskim mrežama za zagrijavanje postoje dva mišljenja.** Protiv: mali
  bazeni prave prepoznatljive obrasce koje filteri sad hvataju. Za: svaki
  ozbiljan alat ih još uključuje besplatno. Obje strane imaju interes, jedni
  prodaju zagrijavanje, drugi infrastrukturu bez njega. **Praktično: uključi ga
  na niskoj i neujednačenoj količini kao osiguranje, ali ne računaj na njega.**
  Najjači signal je pravi ljudski odgovor. Piši s tih sandučića stvarnim ljudima
  koje znaš i vodi prave razgovore.

### 4.5 Šta se NE koristi

- **Amazon SES, Mailgun, SendGrid** i slični relayi. Njihova pravila to
  zabranjuju izričito: Mailgun, „slanje na listu treće strane je zabranjeno";
  SES, „šalji samo primaocima koji su izričito tražili". Gase naloge.
- Google Workspace uslovi takođe zabranjuju „neželjenu masovnu poštu". Provođenje
  je po prijavi, ne unaprijed, ali znaj da si na tankom ledu i drži količine male.

### 4.6 Alati i trošak

| Stavka | Šta | Mjesečno |
|---|---|---|
| Sekvencer | Smartlead Base (neograničeno naloga, 6.000 poruka) | 39 $ |
| Domene | 2-3 komada | ~3 $ |
| Sandučići | 1 × Zoho Mail, besplatan plan (postavljeno 14.9.2026) | 0 $ |
| Verifikacija | ~2 $ na hiljadu | 5-10 $ |
| **Ukupno** | | **~48 $** |

Jeftinija varijanta: namjenski sandučići za hladan email umjesto Workspacea,
2-3 $ po komadu → ukupno **60-65 $**.

---

## 5. CAN-SPAM: obavezna lista, svaka stavka

Hladan B2B email u SAD-u je **legalan bez pristanka unaprijed.** FTC to kaže
doslovno: „Zakon ne pravi izuzetak za poruke između firmi." Ali svaka od ovih
sedam stavki mora stajati, inače je kazna **do 53.088 $ po jednoj poruci**:

1. **Zaglavlje nije lažno.** Pravo ime, prava domena, „Od" i „Odgovori na" vode
   tebi.
2. **Naslov nije obmanjujući.** Mora odgovarati sadržaju.
3. **Poruka je prepoznatljiva kao komercijalna.** Ne mora pisati „reklama", ali
   iz nje mora biti jasno da nešto nudiš.
4. **Fizička poštanska adresa u potpisu.** Adresa tvog LLC-a ili zakupljeni
   poštanski sandučić. Ovo ljudi najčešće ispuste.
5. **Jasan način odjave.** Jedna rečenica: „Odgovori STOP i više ti ne pišem."
   Plus zaglavlje za odjavu jednim klikom.
6. **Odjava se poštuje u 10 radnih dana**, mehanizam radi najmanje 30 dana od
   slanja, bez naplate i bez traženja dodatnih podataka.
7. **Odgovaraš za onoga koga angažuješ.** Ako neko drugi šalje u tvoje ime,
   njegov prekršaj je tvoj.

Dodatno: adresa s koje se odjavljuju **ne smije se prodati ni proslijediti**.
Vodi trajnu listu odjavljenih i provjeravaj je prije svakog slanja.

---

## 6. Sekvenca: tri dodira, i pravila koja se ne krše

### Pravila za prvi email

- **Nula linkova.** Ovo je najjača poluga za isporučivost, i ujedno tjera
  čovjeka da odgovori umjesto da klikne. Link ide u drugi dodir ili tek poslije
  odgovora („hoćeš da ti pošaljem?").
- **Nula priloga.** Nikad.
- **Čist tekst.** Bez HTML-a, bez logotipa, bez slike u potpisu, bez tabela.
- **Praćenje otvaranja isključeno.** Piksel se učitava sa zajedničke domene i
  sam je signal za spam, a podatak je od Appleove zaštite privatnosti ionako
  bezvrijedan. Plaćaš porez na isporučivost za broj u koji ne možeš vjerovati.
- **Bez mehaničkog variranja** tipa `{zdravo|pozdrav|ćao}`. Bolje je stvarno
  drugačija prva rečenica po firmi nego lažna raznolikost.

### Ritam slanja

- Razmak između poruka nasumičan, 3-15 minuta, nikad fiksan.
- Samo radnim danima.
- **Rano ujutru po njihovom vremenu, 6-8 h**, izvođači čitaju poštu prije
  izlaska na gradilište. To je 12-14 h po tvom.
- Sandučići ne kreću u isto vrijeme.

### Struktura tri dodira

| Dodir | Kad | Šta radi |
|---|---|---|
| **1** | dan 0 | Jedno pitanje o tome kako sad predaju izvještaj. Bez ponude, bez linka. |
| **2** | dan 4 | Kratko, dodaje jednu konkretnu činjenicu (rok, kazna). Ovdje smije link. |
| **3** | dan 10 | Dvije rečenice, zatvara petlju: „ako nije tema, javi i ne pišem više." |

Poslije trećeg, ništa. Ista lista se ne može ponovo bombardovati.

**Na svaki odgovor se odgovara**, i na odbijanje. Sandučić koji samo šalje ne
gradi reputaciju; sandučić koji vodi razgovore gradi.

---

## 7. Fizička pošta: za 40-60% liste koja nema email

Ovo je kanal koji niko u toj niši ne koristi, a registar ti daje adresu svake
firme.

- Pravni rizik: **zanemariv.** Nema pristanka, nema odjave, nema privatne tužbe.
  Jedino se ne smije praviti pošiljka koja izgleda kao državno rješenje ili
  faktura.
- Praktično: razglednica ili pismo formata A5, jedna poruka, jedan poziv na
  radnju (kratki URL ili QR kod koji vodi na obrazac s pristankom).
- Trošak preko servisa za štampu i slanje iz SAD-a: red veličine 0,80-1,50 $ po
  komadu. Na 200 komada to je 160-300 $, više od cijelog mjesečnog budžeta, pa
  ide tek kad email pokaže da poruka pogađa.

---

## 8. SMS: tek poslije pristanka, i kako pristanak mora izgledati

Kad kupac potvrdi pristanak, SMS postaje **najbolji kanal u ovoj niši**, jer je
proizvod vezan za sedmični rok. „Rok za predaju je sutra, izvještaj ti je
spreman" je poruka koju čovjek želi dobiti.

**Pristanak mora biti pisan i mora sadržavati sve ovo:**

1. Ime firme koja šalje, jasno navedeno.
2. Izričito odobrenje za slanje poruka **na taj konkretan broj** koji je čovjek
   sam upisao.
3. Napomena da se može koristiti automatska tehnologija.
4. Napomena da **pristanak nije uslov za kupovinu.**
5. Polje za potvrdu koje je **prazno po zadatom**, nikad unaprijed označeno.

**Šta se čuva po svakom čovjeku, najmanje pet godina:**
vrijeme, IP adresa, URL stranice, snimak obrasca kako je izgledao u tom
trenutku, broj telefona, stanje polja za potvrdu, i cijela istorija odjava.
**Teret dokazivanja je na tebi.**

**STOP se poštuje u 10 radnih dana.** Riječi koje po pravilu znače odjavu:
stop, quit, end, revoke, opt out, cancel, unsubscribe, i svaka druga koja
razumno izražava tu namjeru.

---

## 9. Brojke: čemu se nadati i kad se gasi

### Očekivanja, s ogradom

Sve objavljene brojke o hladnom emailu objavljuju firme koje prodaju alate za
hladan email, mjereno na vlastitim korisnicima. To su stropovi, ne očekivanja.
Za građevinske podizvođače ne postoji nijedno objavljeno mjerenje, ko ti kaže
tačan broj za tu granu, izmislio ga je.

Moja procjena za tvoj slučaj:

- **Ukupno odgovora: 4-8%.** Više od prosjeka jer je kanal u toj grani prazan.
- **Kvalifikovanih odgovora: 1,5-3%** (otprilike trećina ukupnih).
- **Za 10 kvalifikovanih razgovora treba 500-700 verifikovanih adresa**,
  sekvencirano kroz tri dodira.
- Na 60 dnevno to je oko **9 dana slanja**, plus 2-3 sedmice da odgovori stignu.
  **Od prvog slanja do deset razgovora: 4-6 sedmica.**
- Cijela lista od par hiljada ima kapacitet od **30-60 kvalifikovanih razgovora
  ukupno.** Ne može se ponovo slati svaki mjesec.

### Pragovi na kojima se staje

| Mjera | Prag | Šta se radi |
|---|---|---|
| Odbijene poruke (bounce) | **3%** | Kampanja se automatski pauzira. Preko 5% je rizik od crne liste. |
| Prijave za spam | **0,3%** | Google te isključuje iz podrške dok ne budeš 7 dana zaredom ispod. Na 60 dnevno to je jedna prijava svakih 5-6 dana. |
| Ukupni odgovori poslije 300 poslanih | ispod 1% | Poruka ne valja, ne lista. Prepisuje se tekst, ne kupuje se novi alat. |

Prate se **samo četiri broja**: odbijene, prijave za spam, ukupni odgovori,
kvalifikovani odgovori. Otvaranja se ne prate jer je praćenje isključeno, a i
lagalo bi.

---

## 10. Šta gradimo mi: spisak poslova

| # | Posao | Trajanje | Zavisi od |
|---|---|---|---|
| 1 | Skript: skidanje registra, filtriranje, dvije liste | 3-4 h | ništa |
| 2 | Skript: traženje sajta i emaila po firmi | 6-8 h | 1 |
| 3 | Verifikacija adresa (servis) | 1 h | 2 |
| 4 | Kupovina 2-3 domene, 6 sandučića, DNS zapisi | 2 h | ništa |
| 5 | Zagrijavanje, **2-4 sedmice čekanja**, ne posla |, | 4 |
| 6 | Postavka sekvencera, tri dodira, pravila | 3 h | 4 |
| 7 | Stranica s obrascem i pristankom (jedna strana) | 4 h | ništa |
| 8 | Lista odjavljenih, provjera prije svakog slanja | 2 h | 7 |
| 9 | Tabla s četiri broja | 2 h | 6 |

**Ukupno oko 25 sati posla, ali 2-4 sedmice kalendarski** zbog zagrijavanja
domena. To se ne može ubrzati.

**Zato se korak 4 radi prvi, danas.** Domene se kupuju i puštaju da odstoje dok
se radi sve ostalo.

---

## 11. Greške koje se prave: provjeri prije svakog slanja

- [ ] Šalje se s glavne domene → **spaljena reputacija svega**
- [ ] Nema fizičke adrese u potpisu → prekršaj CAN-SPAM-a
- [ ] Link u prvom emailu → pad isporučivosti bez potrebe
- [ ] Praćenje otvaranja uključeno → porez na isporučivost za lažan podatak
- [ ] Adrese nisu verifikovane → bounce preko 3% za dva dana
- [ ] Kanadski primaoci u listi → CASL traži pristanak, kazne su stvarne
- [ ] Odjavljeni nisu izbačeni prije sljedećeg kruga → prekršaj
- [ ] Fiksan razmak između poruka → mašinski obrazac
- [ ] Isti tekst za svih 500 → filter to vidi
- [ ] Slanje vikendom → izvođači ne čitaju, filteri primjećuju
- [ ] **Bilo kakav SMS bez pisanog pristanka** → 500-1.500 $ po poruci

---

## 12. Izvori

TCPA i SMS: [47 CFR 64.1200](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200) ·
[47 U.S.C. §227](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title47-section227&num=0&edition=prelim) ·
[Chennette v. Porch.com, izvođači koji su tužili zbog hladnih SMS-ova](https://www.leechtishman.com/insights/blog/ninth-circuit-rules-that-for-do-not-call-purposes-mixed-use-cellular-numbers-are-presumptively-residential/) ·
[FCC 12-21, ukinut izuzetak za postojeći poslovni odnos](https://docs.fcc.gov/public/attachments/FCC-12-21A1.pdf) ·
[Twilio pravila za poruke](https://www.twilio.com/en-us/legal/messaging-policy) ·
[Telnyx pravila](https://support.telnyx.com/en/articles/1310359-acceptable-use-policy-for-messaging) ·
[CTIA smjernice](https://api.ctia.org/wp-content/uploads/2023/05/230523-CTIA-Messaging-Principles-and-Best-Practices-FINAL.pdf) ·
[A2P 10DLC, šta traži registracija](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info)

Email: [FTC, vodič za CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) ·
[CAN-SPAM, 15 U.S.C. 7704](https://www.govinfo.gov/content/pkg/PLAW-108publ187/html/PLAW-108publ187.htm) ·
[Google, pravila za pošiljaoce](https://support.google.com/mail/answer/81126) ·
[Google, često postavljana pitanja i prag 0,3%](https://support.google.com/a/answer/14229414) ·
[Microsoft, zahtjevi za pošiljaoce od maja 2025.](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) ·
[Mailgun pravila](https://www.mailgun.com/legal/aup/) ·
[Amazon SES pravila](https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html) ·
[Google Workspace uslovi](https://workspace.google.com/terms/use_policy/)

Lista: [NY registar izvođača, CSV](https://data.ny.gov/api/views/i4jv-zkey/rows.csv?accessType=DOWNLOAD) ·
[isti podaci kao JSON](https://data.ny.gov/resource/i4jv-zkey.json)
