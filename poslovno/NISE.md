# Deset niša: istraženo 12.09.2026.

Medius ograničenje je skinuto na njegov zahtjev. Kriteriji: kupci već plaćaju
softver, zarađuju od te aktivnosti, problem se ponavlja sedmično ili mjesečno,
niša je premala da je veliki gledaju, može se napraviti sam uz AI, samoposlužna
naplata karticom bez sastanka, cijena 79 do 199 $ mjesečno.

---

## Obrazac koji je izronio iz istraživanja

Sve niše koje su prošle imaju isti oblik, i on je uži od šest kriterija:

**Zakonom propisan papir koji se ponavlja + podatak koji je besplatan.**

- Propisan papir znači da kupac ne može prestati plaćati kad štedi. Kazna,
  suspenzija licence ili gubitak posla je jači motiv od uštede vremena.
- Besplatan podatak znači da nema licence, nema pregovora s Coxom ili Verisk-om,
  nema troška koji raste s brojem kupaca.

Sve što je palo, palo je zato što nema jedno od to dvoje.

---

## Rang-lista

### 1. Provjera prevoznika za teretne posrednike (freight brokers) ★ najbolja

- **Kupac:** mali posrednik ili dispečer, 100 do 800 tovara mjesečno, marža
  300 do 500 $ po tovaru. Jedan prevaren tovar = 5.000 do 50.000 $ gubitka.
- **Već plaćaju:** Carrier411 **99 $ mjesečno, karticom, 30 dana besplatno, bez
  ugovora.** Proizvod je zastario, nije se mijenjao godinama.
- **Prazan pojas:** iznad 99 $ nema ničega do Highway/RMIS/Descartes, koji su svi
  „traži ponudu". TMS BrokerPro počinje na 950 $ mjesečno. **149 do 299 $ je prazno.**
- **Problem se ponavlja:** svake sedmice, za svakog prevoznika, status dozvole,
  istek police, lažni MC/DOT identiteti.
- **Brojke koje drže nišu:** 50,3% vlasnika kamiona je bilo žrtva prevare, 28%
  izgubilo preko 10.000 $, oko 750.000 lažnih objava tovara godišnje, krađa
  identiteta prevoznika +1.475% od 2022. do kraja 2024.
- **Podatak: BESPLATAN.** FMCSA QCMobile API, treba samo Login.gov nalog i ključ.
  Ovo je najvažnija činjenica u cijelom istraživanju.
- **Integracije:** nikakve obavezne. Email/PDF/CSV unutra, upozorenja van.
- **Rizik:** Highway (ima investitore) ili Truckstop ubace provjeru besplatno u
  load board i ugase kategoriju.

### 2. Protivpožarna inspekcija: NFPA 10 / 25 / 72

- **Kupac:** firma s 1 do 6 vozila. Kvartalna NFPA 25 inspekcija sprinklera
  150 do 400 $, godišnji test alarma 200 do 600 $, aparati 8 do 15 $ po komadu.
- **Već plaćaju:** Inspect Point i ServiceTrade **ne objavljuju cijenu**, oboje
  „zakaži demo". FireInspected prodaje isti posao za **49 / 99 / 249 $
  samoposlužno**, što dokazuje da pojas postoji i da ga veliki ne drže.
- **Ponavlja se po zakonu:** sedmično, mjesečno, kvartalno, polugodišnje.
- **Podatak:** besplatan (NFPA standardi su zaštićeni, ali struktura liste i
  učestalost nisu). Pravi proizvod nije obrazac nego **slanje u AHJ portal**
  (Brycer / The Compliance Engine) koji mnoge jurisdikcije zahtijevaju.
- **Rizik:** ako se ne napravi to slanje, isporučiš generator PDF-a i kupci odu
  u trećem mjesecu.

### 3. Certified payroll / prevailing wage za male podizvođače

- **Kupac:** podizvođač na javnom poslu. Svakog petka 2 do 3 sata na obrazac WH-347.
- **Već plaćaju:** LCPtracker, Points North, eBacon, **175 do 400 $ mjesečno plus
  995 do 4.995 $ za postavljanje**, sve „zakaži demo".
- **Ponavlja se:** sedmično, po zakonu. Kazna i zabrana rada na javnim poslovima.
- **Podatak: BESPLATAN**, odluke o nadnicama su javne.
- **Vjetar u leđa:** osam saveznih država proširilo obavezu 2024 do 2026, neke
  spustile prag na 60.000 do 250.000 $.
- **Rizik:** svaka država ima svoj format (Kalifornija traži eCPR XML).

### 4. Usklađivanje provizija za nezavisne osiguravajuće agencije

- **Kupac:** oko 30.000 američkih agencija s prihodom ispod 1,25 M $. Provizija
  JESTE njihov prihod, greška je direktan gubitak novca.
- **Već plaćaju:** AgencyZoom od 79 $; EZLynx, HawkSoft, Applied Epic, svi
  „traži ponudu", Epic preko 1.500 $ po korisniku godišnje.
- **Ponavlja se:** svaki mjesec, 20+ osiguravača šalje izvode u nesložnim CSV,
  XLSX i PDF formatima; brojevi polisa se ne poklapaju.
- **Podatak: nikakav**, kupac uploaduje svoje izvode.
- **Rizik:** parsiranje PDF-a mora biti skoro savršeno ili povjerenje pada.

### 5. Prijava upotrebe pesticida (pest control)

- **Kupac:** firma s 1 do 5 vozila, 45 do 120 $ mjesečno po objektu.
- **Kuka:** Kalifornija traži obrazac PR-ENF-060 okružnom povjereniku **do 10.
  u mjesecu, uključujući i mjesece kad nije bilo nijedne primjene.** Propust
  nosi rizik suspenzije licence. Čistija mjesečna pretplatna kuka ne postoji.
- **Već plaćaju:** GorillaDesk 49 do 149 $, Fieldwork ~99 $, ali za raspored, ne
  za prijavu. PestPac je „traži ponudu".
- **Rizik:** 50 država × okruzi = rascjepkani obrasci. Mora se prvo dobiti
  Kalifornija, a samo Kalifornija ograničava tržište.

### 6. Čišćenje kuhinjskih napa: NFPA 96

- **Kupac:** noćne ekipe od 1 do 8 ljudi, 400 do 1.500 $ po restoranu.
- **Ponavlja se po kodu:** mjesečno (čvrsto gorivo), kvartalno, polugodišnje ili
  godišnje, plus obavezna naljepnica s datumom, certifikat na licu mjesta i
  fotografije prije/poslije. Nijedan terenski softver to ne pravi.
- **Rizik i upozorenje:** HoodOps kreće u oktobru 2026. sa 99 / 199 / 399 $, 
  tačno u ovaj pojas. Neko drugi već trči ovu trku.

### 7. Pronalaženje tendera za građevinske podizvođače

- **Već plaćaju:** ConstructConnect **199 $ po korisniku mjesečno**, godišnja
  obaveza, bez besplatnog probnog perioda. Dodge, „traži ponudu".
- **Zašto pada na sedmo mjesto:** pojas 39 do 99 $ **više nije prazan**, 
  ConstructionBids.ai već prodaje 39/59/79/99 $ samoposlužno. A ono što
  podizvođači stvarno hoće su **privatni pozivi od glavnih izvođača**, koji žive
  unutar BuildingConnected i PlanHub mreža, to se ne može ni kupiti ni skinuti.
- Podaci o dozvolama kao zamjena su skupi: Shovels 599 do 999 $ mjesečno.
- AIA prognoza za 2026: nestambena gradnja **−0,3%**.

### 8. Usklađivanje isporuka za restorane (Uber Eats / DoorDash)

- **Rupa je stvarna:** ispod 5 lokacija niko ne nudi samoposlužno. Voosh je
  „demo", radi s lancima od 28 do 200 lokacija. Loop je u februaru 2026. podigao
  14 M $ za isti problem na nivou lanaca.
- **Ubica:** DoorDash Reporting API je zatvoren, partner mora imati „dokazanu
  istoriju". Bez toga držiš tuđe lozinke i skidaš podatke sa stranice, što je
  krhko i pitanje povjerenja za nepoznatog prodavca.
- 8.171 restoran zatvoren u SAD i Kanadi u prvoj polovini 2026, 47,9% nezavisni
, to je tvoj osnovni odliv kupaca.

### 9. DOT usklađenost za male flote (5 do 50 kamiona)

- **Najjači zakonski kalendar u cijeloj listi:** kvartalna IFTA, kvartalni
  nasumični testovi, **godišnja provjera Clearinghouse za svakog vozača**,
  MCS-150 svake dvije godine, UCR godišnje, istek ljekarskih uvjerenja.
- **Zašto pada:** pojas 19 do 99 $ je **već pun**, TruckDocsAI 19,99 $,
  FleetDrive 5 $/vozač, J.J. Keller 49,50 $, TenFour 99 $, Safe Haul 45 $/kamion.
  Bio bi sedmi ulaz. r/Truckers je agresivno protiv prodavaca.

### 10. Zaplijena i naplata za skladišta (self-storage)

- Zakon o zaplijeni robe se razlikuje po državi, ponavlja se, mali operateri
  griješe. Easy Storage Solutions je **90 $ mjesečno fiksno**, pa dodatak od
  99 $ udvostručuje njihov trošak bez borbe za budžet.
- **Zašto zadnja:** pojas nije prazan, tržište je malo, a greška u pravu o
  zaplijeni je pravna izloženost koju ne želiš kao stranac bez advokata.

---

## Odbačeno, s brojkom koja ubija

| Niša | Zašto |
|---|---|
| Knjigovođe / male računovodstvene firme | Intuit sad **naplaćuje čitanje QuickBooks API-ja**: besplatno do 500k mjesečno, pa **300 do 4.500 $ mjesečno**. Trošak raste s uspjehom. |
| Poreski savjetnici | FinCEN je 11.8.2026. **trajno ukinuo BOI prijavljivanje.** Ko je gradio taj proizvod, nema ga više. Ostatak posla je sezonski. |
| Vertikalni CRM ispod Jobbera | Tržište se zatvara na **29 do 49 $** (Skimmer 29 do 49, Jobber od 49). Do 149 $ se ne stiže. |
| Lokalni SEO / Google profil | Cijene smrvljene: Localo 27 $, Local Falcon 24 $, BrightLocal 39 $, a Google stalno guta funkcije u besplatnu ploču. |
| Izvještaji za agencije | AgencyAnalytics **20 $ po klijentu**, Looker Studio besplatan. Mrtvo. |
| Raspored smjena u restoranima | Homebase je **besplatan** za jednu lokaciju. |
| Upravljanje nekretninama | Mjesečno usklađivanje povjereničkog računa je odlična kuka, ali Buildium i AppFolio to već rade. |
| Praonice, aparati, bankomati, autopraonice | Nema softverskog budžeta ili je pristup podacima zaključan kod POS vlasnika. |
| Ordinacije, veterinari, apoteke | HIPAA i pacijentski podaci. Stranac bez pravnog budžeta ne potpisuje BAA. |
| HVAC općenito, uređenje dvorišta, bazeni, čišćenje | Prevelike i previše gledane; cijene usidrene na 29 do 49 $. |
| Auto-dileri (ranije prva niša) | Manheim MMR ugovor traži da **svaki krajnji kupac ima svoju licencu**, zabranjuje čuvanje podataka duže od 24 h i propisuje logotip i napomene. Black Book, KBB i J.D. Power ne objavljuju cijenu API-ja uopšte. Jeftin Carbly nije zabranjen tržištem nego ugovorom. |

---

## Šta nije provjereno: mora ručno

Reddit i Facebook su blokirani iz okruženja u kojem je istraživanje rađeno.
**Sedmi kriterij, može li ući u zajednicu a da ga ne izbace, nije potvrđen ni
za jednu nišu.** To je jedini preostali nepoznati faktor i provjerava se ručno,
u pola sata, čitanjem pravila grupe.

## Kapija

Njegovo pravilo, ne moje: **deset ljudi plati prije prve linije koda proizvoda.**
Deset niša na listi ne znači deset paralelnih pokušaja. Znači da kad #1 padne,
zna se šta je #2, bez ponovnog istraživanja.
