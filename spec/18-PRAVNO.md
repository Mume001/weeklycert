# 18. Pravni dokumenti i usklađenost firme

Ovo nije pravni savjet nego spisak šta treba, odakle se uzima i gdje je zaista
potreban advokat. Mume je vlasnik LLC-a u Wyomingu, sjedi u BiH, prodaje
njujorškim firmama i drži lične podatke američkih radnika.

---

## 1. Uslovi korišćenja: šest klauzula koje nose sav rizik

Ostalih četrdesetak je higijena. Ovih šest se ne prepisuje bez razmišljanja.

### 1.1 Ograničenje odgovornosti i njegova granica

Tržišni standard za mali SaaS je **granica na iznos plaćen u 12 mjeseci prije
zahtjeva**, plus isključenje posljedične štete. Kod nas je to oko **948 $**, i u
tome je cijela poenta klauzule.

**Opasnost specifična za ovaj proizvod:** kupac preda kasno jer je naš XML bio
neispravan, kazna je 100 $ dnevno. Klizanje od 60 dana je 6.000 $ prema granici
od 948 $. Pravnici glavnih izvođača tražiće ili višu granicu (2 do 3 puta
naknada) ili izuzetak bez granice za "regulatorne kazne izazvane greškom
pružaoca".

Dvije opcije, i ovo je **najvažnija komercijalna odluka u cijelim uslovima**:

- **Držati granicu od 12 mjeseci.** Najčistije, štiti firmu, ali gubimo neke
  poslove gdje glavni izvođač diktira uslove, i ne možemo pošteno reklamirati
  "garantujemo vaše predaje".
- **Ponuditi ograničen lijek**: ako predaja padne isključivo zbog kvara u
  proizvodu i kupac nas je odmah obavijestio, vraćamo naknadu i **nadoknađujemo
  dokumentovanu kaznu do određenog iznosa**, prijedlog 2.500 $. Ograničeno,
  uslovljeno brzom prijavom, isključuje kazne zbog pogrešnih klasifikacija ili
  kasnih podataka kupca.

Očekivani trošak druge opcije je blizu nule, jer je uzrok greške skoro uvijek
podatak kupca. Marketinška vrijednost u kategoriji izgrađenoj na strahu je
velika. **Odluka stoji otvorena u spec/13 C8 i traži advokatski pregled.**

Izuzeci koji ostaju **izvan** granice: kupčeva obaveza plaćanja, kupčeva
obeštećenja, povreda povjerljivosti, obeštećenje za intelektualnu svojinu, gruba
nepažnja i namjera.

### 1.2 Odricanje od garancija

Odriču se podrazumijevane garancije podobnosti i nepovrede prava. **Ključno za
nas:** izričito piše da **ne pružamo pravni, poreski, računovodstveni ni platni
savjet**, da je kupac jedini odgovoran za tačnost odluka o nadnicama,
klasifikacija i samog potpisa, i da je proizvod alat za formatiranje i predaju.

Izjavu pod punom krivičnom odgovornošću potpisuje službenik izvođača, ne mi. To
piše u uslovima **i ponavlja se u sučelju u trenutku potpisa**.

### 1.3 Obeštećenje

Asimetrično je normalno na našoj veličini: mi štitimo od zahtjeva za povredu
intelektualne svojine koji proizlaze iz proizvoda; kupac štiti nas od zahtjeva
koji proizlaze iz njegovih podataka, njegove prakse zapošljavanja, sporova oko
plata i njegovih regulatornih prekršaja.

**Kupčevo obeštećenje kod nas nije formalnost** nego štit od uvlačenja u istragu
Ministarstva rada ili tužbu radnika.

### 1.4 Nivo usluge

Preporuka: **bez uptime SLA s kreditima** (obrazloženje u spec/17 §2). Ako
glavni izvođač insistira, siguran oblik je 99,5 % mjesečno, lijek samo kroz
kredit, kredit ograničen na jednu mjesečnu naknadu, uz izričito isključenje
planiranog održavanja i ispada trećih strana, **uključujući nedostupnost NYSDOL
portala.**

### 1.5 Raskid i vraćanje podataka

Kod proizvoda za usklađenost ovo stvarno nosi rizik, jer se zapisi po NY Labor
Law §220 čuvaju **šest godina.** Obavezujemo se na: izvoz svih podataka u
upotrebljivom obliku (XML, CSV, PDF) samouslužno u svakom trenutku; 30 do 60
dana pristupa za čitanje i izvoz poslije raskida; brisanje poslije toga na
zahtjev, uz navedeno podrazumijevano čuvanje. **Ne obećavati besplatnu vječnu
arhivu.**

### 1.6 Mjerodavno pravo, nadležnost i arbitraža

Tri opcije: Wyoming (odgovara firmi, ali tanka praksa i nijedan kupac nije
tamo), **Njujork** (svi kupci su tamo, poznato njihovim pravnicima, razvijen
forum), Delaware (neutralno, ali strano kupcima).

**Preporuka: njujorško pravo, obavezna arbitraža sa sjedištem u Njujorku, AAA
Commercial Rules, uz izuzetak za sporove male vrijednosti.**

Za firmu u stranom vlasništvu arbitraža nije blizu:
- Osnivač iz BiH ne može praktično braniti tužbu male vrijednosti pred američkim
  sudom. Arbitraža za male iznose ide na dokumentima i jeftinija je.
- **Arbitražna odluka je izvršiva u BiH po Njujorškoj konvenciji, presuda
  američkog suda nije automatski.** To siječe u oba smjera, ali je važno.
- Protiv: AAA takse su stvaran novac naspram granice od 948 $.
- Praktičan oblik: arbitraža, plus izuzetak za spor male vrijednosti, plus
  izuzetak za sudsku zabranu kod intelektualne svojine i povjerljivosti, plus
  **obavezan neformalni korak od 60 dana prije podnošenja.** Kod solo osnivača
  taj korak riješi skoro sve.

### 1.7 Automatsko obnavljanje, uspavani problem koji dohvata i B2B

- **NY GOL §5-903** važi za ugovore o "usluzi, održavanju ili popravci
  pokretne ili nepokretne imovine", **izričito pokriva ugovore između firmi**, i
  čini klauzulu o automatskom obnavljanju **neizvršivom** ako pružalac ne pošalje
  pisanu obavijest **15 do 30 dana** prije datuma do kojeg kupac mora otkazati.
  Obnavljanja od mjesec dana i kraća su izuzeta. Da li SaaS spada je **nerazjašnjeno**:
  jedan predmet iz 2014. je našao da spada, drugi iz 2019. da ne spada. Mi
  obrađujemo kupčeve podatke, što nas gura prema prvom.
- **Praktično: mjesečni plan je izvan dometa** (mjesec ili manje). **Ako se ikad
  proda godišnji plan, §5-903 je stvaran rizik.** Slati obavijest 30 dana
  unaprijed na godišnjim planovima bez obzira; košta jedan email.
- **Colorado** je od 16.2.2026. proširio zakon i na privredne subjekte (25 do 40
  dana obavijesti, otkazivanje online u jednom koraku), **Wisconsin** također
  dohvata B2B. Ako su kupci samo iz NY, ovo je teorijsko, ali je jeftino ispuniti.
- Federalno pravilo FTC-a o "click to cancel" **poništeno je u julu 2025.**, novi
  postupak je u toku od januara 2026. Ne oslanjati se na poništenje; FTC i dalje
  provodi po §5 i ROSCA.

**Napraviti usklađen obrazac jednom i ne razmišljati više:** jasna napomena o
obnavljanju odmah uz dugme za plaćanje, navedena cijena i ritam, otkazivanje u
aplikaciji u jedan do dva klika bez telefonskog poziva, potvrda emailom s
uputstvom za otkaz, i podsjetnik prije obnove na svakom roku dužem od mjesec dana.

## 2. Politika privatnosti

### 2.1 Šta se mora objaviti

1. Kategorije podataka, **razdvojene**: (a) podaci naloga kupca, gdje smo mi
   rukovalac, i (b) podaci radnika koje obrađujemo **u ime kupca**, gdje je
   rukovalac izvođač a mi obrađivač. Ta rečenica je najkorisnija u cijeloj
   politici.
2. Izvor: od kupca, ne od radnika.
3. Svrha: izrada i predaja izvještaja, podrška, zakonsko čuvanje.
4. **Podobrađivači, poimence** (hosting, email, plaćanja, praćenje grešaka,
   backup). Navođenje unaprijed štedi krug s pravnikom svakog glavnog izvođača.
5. **Da se osoblje koje pristupa podacima nalazi izvan SAD, u Bosni i
   Hercegovini.** To nije pravni problem, ali skrivanje jeste problem
   kredibiliteta i ugovora.
6. Čuvanje, vezano za šest godina po §220.
7. Sigurnost, s pozivom na naš pisani program.
8. Prava: zahtjev radnika ide **poslodavcu**, a mi pomažemo poslodavcu.
9. Kontakt adresa (adresa registrovanog agenta u Wyomingu je u redu).
10. Izričito: ne prodajemo i ne dijelimo lične podatke za oglašavanje.

### 2.2 Da li nas neki državni zakon o privatnosti uopšte dohvata

**Kratko: ne, ni jedan sveobuhvatni državni zakon nas danas ne dohvata kao
rukovaoca, a podaci radnika su dvostruko izuzeti.**

| Zakon | Prag |
|---|---|
| California CCPA/CPRA | preko 26,6 M $ prihoda, ili 100.000+ potrošača, ili 50 % prihoda od prodaje podataka |
| Virginia | 100.000+ potrošača |
| Colorado | 100.000+ potrošača |
| Oregon | 100.000+ potrošača |
| Texas | nema brojčanog praga, **ali izuzima male firme po SBA definiciji** |

Uz to Virginia, Colorado, Texas i Oregon **izuzimaju podatke iz radnog odnosa**.
Podaci o platama građevinskih radnika su upravo to. Kalifornija je izuzetak jer
je taj izuzetak istekao 1.1.2023, ali nas ne dohvata zbog praga prihoda.

**Njujork nema sveobuhvatni zakon o privatnosti.** Ono što u NY jeste na snazi i
**dohvata nas bez ikakvog praga** je SHIELD Act.

Obaveze obrađivača (pomoć rukovaocu, sigurnost, povjerljivost, pisani ugovor)
nastaju kad je **naš kupac** obveznik. Većina podizvođača nije, ali veliki glavni
izvođač u lancu može biti, i obaveza nas dohvata ugovorom. Zato pišemo DPA i kad
nas nijedan propis danas ne tjera.

## 3. Ugovor o obradi podataka (DPA)

**Pravno: ne treba za prvog kupca. Komercijalno: napisati prije prvog kupca, ne
tokom prve sigurnosne provjere.** Gotov DPA pretvara dvosedmično kašnjenje posla
u prilog u emailu.

Šta glavni izvođači traže, otprilike po učestalosti:
1. Povjerljivost i zabrana sekundarne upotrebe.
2. Imenovane mjere: šifrovanje u prenosu i mirovanju, MFA, logovanje pristupa,
   najmanja privilegija.
3. **Obavijest o incidentu s tvrdim rokom.** Tražiće 24, 48 ili 72 sata.
   Pregovarati na "bez nepotrebnog odlaganja, u svakom slučaju u roku od 72 sata
   od potvrde". **Odbiti 24 sata**, jedan čovjek to ne može pouzdano ispuniti.
4. Lista podobrađivača i pravo prigovora na izmjenu.
5. Brisanje ili vraćanje po raskidu.
6. Pomoć kod zahtjeva ispitanika i regulatora.
7. Pravo revizije. **Vratiti na "pisani upitnik jednom u 12 mjeseci plus izvještaji
   koje imamo"**, ne revizija na licu mjesta. Solo osnivač ne preživi reviziju na
   licu mjesta.
8. **Osiguranje, obično 1 M $ cyber odgovornosti.** Budžet 800 do 2.000 $
   godišnje. Ovo je često tvrda kapija za odobrenje dobavljača, i zato ide
   **prije prvog glavnog izvođača, ne na dvadesetom kupcu.**
9. Sve češće: gdje se nalazi osoblje i gdje su podaci.

Minimalan a kredibilan DPA ima devet odjeljaka na 4 do 6 strana: definicije i
uloge; opseg i vrste podataka; obrada samo po uputstvima, bez prodaje, bez
spajanja s drugim skupovima, **bez korišćenja za treniranje modela**;
povjerljivost osoblja; sigurnosne mjere kao Aneks II; podobrađivači kao Aneks
III; pomoć; obavijest o incidentu; brisanje i transparentnost o lokaciji.

### Prekogranično pitanje, imenovati ga a ne pretjerati

- **Federalno pravilo SAD o masovnim osjetljivim podacima** (28 CFR 202, EO
  14117) odnosi se samo na šest zemalja: Kina, Kuba, Iran, Sjeverna Koreja,
  Rusija, Venecuela, i to iznad pragova (100.000 osoba). **BiH nije na listi i mi
  smo redovima veličine ispod pragova. Ne primjenjuje se.**
- **GDPR se ne primjenjuje**: BiH nije u EU, a podaci su američki.
- Stvarno je ovo: (a) **ugovorni rizik**, jer standardni uslovi nekog glavnog
  izvođača mogu tražiti da podaci ostanu u SAD i da im pristupaju samo američke
  osobe, što bismo prekršili nesvjesno; treba čitati; (b) percepcija u prodaji;
  (c) praktična komplikacija kod sudskog poziva.
- **Formulacija u DPA**: svi podaci se čuvaju i obrađuju u američkim centrima;
  ograničen broj ovlaštenih osoba (trenutno jedna) u Bosni i Hercegovini pristupa
  daljinski radi podrške i rada, pod obavezom povjerljivosti i kontrolama
  pristupa iz programa sigurnosti; podaci se ne izvoze niti čuvaju izvan SAD;
  američki registrovani agent je tačka za dostavu pismena. Ovako napisano čita se
  kao kompetencija, ne kao crvena zastava.

## 4. NY SHIELD Act, jedini koji nas stvarno obavezuje

**Nema praga.** GBL §899-bb važi za svakoga ko drži "privatne informacije"
stanovnika Njujorka, bez obzira gdje posluje.

Napomena o našem modelu podataka: "privatna informacija" je ime plus jedan
navedeni element (SSN, broj vozačke, broj računa ili kartice, biometrija, ili
korisničko ime i lozinka). **Mi držimo zadnje 4 SSN ili datum rođenja, a nijedno
nije jasno na listi.** Ali držimo i pristupne podatke naloga, što jeste na listi,
pa smo u opsegu svejedno. **Ne graditi strategiju na argumentu zadnje četiri
cifre**, ali u DPA i prodaji **jeste vrijedno reći da nikad ne čuvamo pun SSN**,
jer je stvarna i jeftina razlika, a država ga ionako ne traži.

Kvalifikujemo se kao **mala firma** (manje od 50 zaposlenih, ispod 3 M $
prihoda), pa mjere moraju biti "primjerene veličini i osjetljivosti podataka".
To **ne oslobađa od obaveze da program postoji**, a "osjetljivost" ide protiv nas
jer su podaci o platama osjetljivi.

**Pisani program sigurnosti (WISP) mora sadržavati:**

*Administrativno*: imenovanu osobu koja koordinira program (Mume, poimence u
dokumentu); identifikovane unutrašnje i vanjske rizike; ocjenu dovoljnosti mjera;
obuku osoblja; **izbor pružalaca usluga sposobnih da održe primjerene mjere i
ugovornu obavezu da to čine** (zbog ovoga je lista podobrađivača pravni artefakt,
ne marketinški); prilagođavanje programa promjenama.

*Tehnički*: procjenu rizika u dizajnu mreže i softvera; procjenu rizika u obradi,
prenosu i pohrani; otkrivanje, sprečavanje i odgovor na napade i otkaze; redovno
testiranje ključnih kontrola.

*Fizički*: procjenu rizika pohrane i uništavanja; sprečavanje neovlaštenog
pristupa pri prikupljanju, prenosu i uništavanju; **uništavanje privatnih
informacija u razumnom roku**, brisanjem koje onemogućava rekonstrukciju.

Za firmu od jednog čovjeka to je dokument od 6 do 10 strana plus stvarna praksa:
MFA svuda, menadžer lozinki, šifrovan disk, TLS i šifrovanje u mirovanju, nema
produkcijskih podataka na laptopu, kvartalni pregled pristupa (15 minuta u
kalendaru), godišnja procjena rizika (jedna strana koju se stvarno napiše),
potpisani DPA sa svakim podobrađivačem, dokumentovan i testiran backup,
skeniranje zavisnosti, i pisani raspored čuvanja vezan za šest godina.

**Sigurna luka**: usklađenost s GLBA, HIPAA ili 23 NYCRR 500 se priznaje. Ništa
od toga nas ne pokriva, pa pišemo WISP.

### Obavještavanje o povredi, i pravilo za dobavljača

- "Povreda" sad uključuje i samo **neovlašten pristup** (pogledano, korišteno,
  izmijenjeno), ne samo preuzimanje. Prag je niži nego u većini država.
- **Ako samo održavamo podatke koje ne posjedujemo, a to je tačno naša pozicija
  za podatke radnika, obaveza nam je da obavijestimo vlasnika podataka, dakle
  našeg kupca izvođača. Kupac onda obavještava radnike i regulatore. Mi ne
  obavještavamo radnike.**
- Tamo gdje jesmo vlasnik (nalozi naših korisnika), obavještavamo pojedince
  direktno, plus **kancelariju državnog tužioca NY, Division of Consumer
  Protection i državnu policiju**; ako je 500+ stanovnika NY, tužioca u roku od
  **10 dana**.
- Izuzetak: ako je izloženost bila nenamjerna od strane ovlaštene osobe i
  razumno zaključimo da neće dovesti do zloupotrebe ili štete, obavijest nije
  potrebna, **ali se odluka mora pisano dokumentovati i čuvati 5 godina.**

**Posljedica za proizvod:** put obavještavanja kupca se gradi odmah. Jedna strana
runbooka: definisan okidač "potvrđen incident", šablon obavijesti kupcu, ugovorni
rok od 72 sata, i dnevnik kome je šta rečeno i kada. To je i stavka koju
sigurnosni upitnici glavnih izvođača najčešće pitaju.

## 5. Šta se kupuje i po kojoj cijeni

| Put | Cijena 2026 | Presuda |
|---|---|---|
| **Common Paper** ili **bonterms** standardni SaaS ugovor i DPA | **besplatno** | **Osnova za naše uslove.** Pravnici glavnih izvođača prepoznaju obrazac |
| **Termageddon** | 12 $/mj ili 119 $/god | Najbolja vrijednost za politiku privatnosti, zbog automatskog ažuriranja |
| Termly | 10 do 20 $/mj | Slično, širi skup dokumenata |
| Iubenda | slično | Preskočiti, nemamo EU izloženost |
| Advokat za SaaS, paušal | 4.500 do 5.500 $ | Previše za sada; tačno na 5 do 10 k $ mjesečnog prihoda ili kod prvog posla koji diktira glavni izvođač |
| **Advokatski pregled naših nacrta** | **750 do 2.000 $**, 3 do 5 sati | **Ovo se kupuje.** |

**Redoslijed:**
1. Uslovi na osnovu Common Paper Cloud Service Agreement. Popuniti: granica od 12
   mjeseci, njujorško pravo, arbitraža, odricanje "nismo vaš savjetnik za plate",
   obaveza vraćanja podataka.
2. Politika privatnosti kroz Termageddon, pa ručno dopisati podjelu
   rukovalac/obrađivač, listu podobrađivača i objavu o BiH. Generator to neće
   pogoditi.
3. DPA iz besplatnog američkog šablona ili Common Paper DPA, prilagoditi anekse.
4. **WISP napisati sam** prema listi iz §899-bb. To je kontrolna lista, a mi
   poznajemo vlastiti sistem bolje od advokata.
5. **Potrošiti 1.000 do 2.000 $ na američkog advokata da pregleda sva četiri**, s
   izričitim uputstvom da pogleda: granicu odgovornosti naspram izloženosti kazni
   od 100 $ dnevno, odricanje odgovornosti za potpis i savjet, klauzulu o
   automatskom obnavljanju, i izvršivost arbitraže za firmu u stranom vlasništvu.

### Gdje je advokat stvarno potreban

| Stavka | Presuda |
|---|---|
| Politika privatnosti | šablon je dovoljan, uz ručne izmjene |
| WISP | sam, zakon je kontrolna lista |
| DPA | šablon kao početna pozicija; pregled prije nego što se **pregovara** s glavnim izvođačem |
| Osnova uslova | standardni obrazac je dovoljan |
| **Granica odgovornosti naspram kazne od 100 $ dnevno** | **advokat.** Najveći strukturni rizik, šablon ga ne predviđa |
| **Odricanje "ne dajemo pravni ni platni savjet" i odgovornost za potpis** | **advokat.** Klauzula koju tužilac prvu napada |
| **Arbitraža i mjerodavno pravo za LLC u stranom vlasništvu** | **advokat** |
| **Bilo kakav ugovor glavnog izvođača** | **advokat, svaki put. Ne potpisivati tuđi papir nepregledan** |
| Cyber i E&O osiguranje | broker, ne advokat, ali prije prvog glavnog izvođača |

## 6. Obaveze Wyoming LLC-a (kalendar, ne kod)

Ovo je već razrađeno u `poslovno/Zarada-troskovi-porezi.pdf`; ovdje samo
podsjetnik da postoji kalendar i da se stavi u /admin:

- Godišnji izvještaj Wyomingu, 60 $, plus registrovani agent oko 100 $.
- **Form 5472 uz pro forma 1120**, obavezan za LLC u stranom vlasništvu.
  Propuštanje je kazna od 25.000 $. Rok je 15. april.
- BE-13 prijava u roku od 45 dana od osnivanja ili investicije.
- Nema poreskog sporazuma SAD i BiH.
- Prag za NY sales tax na SaaS je 500.000 $ i 100 transakcija; do tada se porez
  ne naplaćuje, ali se prag prati u /admin.
- Isplata Mumi je transakcija s povezanom stranom i mora se evidentirati za 5472.
