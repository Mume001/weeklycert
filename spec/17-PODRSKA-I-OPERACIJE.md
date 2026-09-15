# 17. Podrška, postavljanje kupca i svakodnevni rad

Ovo nije softver nego Mumino vrijeme, i zato je najlakše da propadne. Proizvod u
kojem kupac ima zakonski rok mora imati napisano šta se radi kad zovne u petak.

---

## 1. Radno vrijeme, s obzirom na šest sati razlike

Sarajevo je UTC+2 do 25.10.2026, pa UTC+1. Njujork je UTC-4 do 1.11.2026, pa
UTC-5. Razlika je **šest sati veći dio godine**, ali postoji sedmica
**26.10. do 1.11.2026. kad je razlika pet sati**, jer EU i SAD ne mijenjaju sat
istog dana. To tiho lomi zakazane poslove. Sva logika rokova računa se u zoni
`America/New_York`, nikad kao UTC plus fiksni pomak.

| Sarajevo | Njujork |
|---|---|
| 09:00 | 03:00 |
| **15:00** | **09:00, počinje radni dan kupca** |
| **16:00 do 20:00** | **10:00 do 14:00, kad kupci stvarno rade papire** |
| 23:00 | 17:00, kraj radnog dana kupca |

**Podijeljen dan, ne pomjeren dan.** Raditi 15:00 do 23:00 da bi se pokrio cijeli
američki dan je neodrživo i ubija privatni život.

- **09:00 do 13:00** dubok rad: kod, izgradnja postavki, debug XML-a. Kupci spavaju.
- **13:00 do 16:00** pauza, stvarni život.
- **16:00 do 20:00** podrška: sandučić, pozivi, chat. Pokriva američko
  prijepodne, kad se papiri rade. Ovdje je većina stvarnog obima.
- **21:30 do 22:00** jedan prolaz kroz sandučić. Samo trijaža: odgovori ili
  potvrdi prijem s vremenom odgovora. Ne počinjati posao.
- Sve što stigne poslije 23:00 dobija autoodgovor i odgovor do 15:00 sljedećeg
  radnog dana, što je **prije nego što kupac sjedne za sto**. To je i poruka:
  "pišite kad god, odgovaramo prije nego što vam počne dan".

Objavljuje se **samo u istočnoj zoni**: `Support 9:00 to 16:00 ET, Monday to
Friday`. Lokacija se navodi na stranici "Ko smo mi", ali kupac nikad ne računa
razliku u satima.

**Pozivi**: dva fiksna termina sedmično, utorak i četvrtak 16:00 do 17:30
sarajevskog (10:00 do 11:30 ET), preko linka za rezervaciju. Otvoreni kalendar
pojede sedmicu.

## 2. Šta se obećava

**Objavljuje se vrijeme odgovora, ne uptime SLA sa kreditima.** Kredit na 79 $
ne znači ništa kupcu, a nama donosi obavezu mjerenja i obračuna koju nemamo.
Ćutanje o vremenu odgovora je kod proizvoda za usklađenost samo po sebi loš
signal, pa se objavljuje ovo:

| Vrsta | Definicija | Prvi odgovor | Rješenje |
|---|---|---|---|
| **Blokira predaju** | ne može predati, rok unutar 7 dana | **2 radna sata**, i uvijek isti kalendarski dan | zaobilaznica isti dan; **ako treba, mi predamo umjesto njega** |
| Pokvareno, ne blokira | pogrešan izlaz, nema pritiska roka | 4 radna sata | 2 radna dana |
| Pitanje | kako se nešto radi | 1 radni dan | 2 radna dana |
| Prijedlog | | 2 radna dana | bez obećanja |

Cilj je da se ovo ispuni **u 90 % slučajeva**. Obećanje koje se maši trećinu
vremena nije obećanje nego obaveza.

Uz to jedna izuzetna odredba: *"U 72 sata prije roka na vašem nalogu pratimo
blokirajuće prijave i izvan radnog vremena."*

U uslovima korišćenja se ne fiksiraju brojevi. Piše se "aktuelni ciljevi podrške
objavljeni na weeklycert.com/support, koje možemo mijenjati".

### Dvije stvari koje ovo čine izvodljivim

1. **Autoodgovor koji stvarno informiše**, ne "primili smo vašu poruku". Sadrži:
   radno vrijeme u ET, ciljano vrijeme odgovora za ovu vrstu, link na stranicu
   statusa, i, ako kupac ima rok za manje od 7 dana, put za hitne slučajeve.
2. **Objavljen hitni put**: riječ `DEADLINE` u naslovu ili telefonski broj koji
   zvoni na Mumin mobitel. Koristiće se možda šest puta godišnje. Vrijedi više
   time što postoji nego time što se koristi.

## 3. Alati

| Šta | Početak | Kad se mijenja |
|---|---|---|
| Sandučić | `support@weeklycert.com` preko Cloudflare Email Routinga, prosljeđuje u Zoho sandučić, plus oznake, **besplatno** (poslovno/DNS-POSTAVKA.md) | Help Scout (oko 25 $) onog dana kad prvi put izgubi nit, ne po broju kupaca |
| Stranica statusa | Better Stack ili Instatus besplatni nivo, na `status.weeklycert.com` | plaćeni tek kad zatreba više pretplatnika |
| Nadzor | UptimeRobot besplatno, provjera `/api/health` svakih 5 min | dodati provjeru dostupnosti NYSDOL portala |
| Greške | Sentry besplatni nivo | |

Vlastita domena za stranicu statusa je uslov, ne detalj: status na tuđoj domeni
ruši povjerenje koje bi trebao graditi.

**Provjera portala je nesrazmjerno vrijedna.** Biti onaj koji kupcu kaže "državni
portal je pao, nisi ti kriv" gradi povjerenje jače od bilo koje funkcije.

Ukupan trošak podrške prve godine: 0 do 40 $ mjesečno.

## 4. Incident

Ispod tridesetak kupaca stranica statusa je artefakt kredibiliteta i arhiva, a
primarni kanal je direktan email. Objavljuje se svejedno svaki put, jer je
istorija incidenata s poštenim analizama prodajni materijal, i jer je timovi za
procjenu dobavljača kod glavnih izvođača traže.

1. **Potvrda u 15 minuta od otkrića**, i kad se nema šta reći. "Znamo da predaje
   padaju. Istražujemo. Sljedeća poruka za 30 minuta."
2. **Prvo na stranicu statusa**, pa email pogođenima s linkom. Kupac ne smije
   saznati iz odgovora na svoju prijavu.
3. **Ritam ažuriranja se obeća i ispoštuje**, svakih 30 minuta tokom P1, i kad
   nema promjene. Propušten interval šteti više od samog kvara.
4. **Uvijek odgovoriti na jedino pitanje koje imaju: "je li ugrožen moj rok".**
   Prvo to. "Nijedna predaja nije ugrožena; najbliži rok na pogođenim nalozima
   je 24.9."
5. **Analiza u 48 sati** za sve preko 30 minuta ili što je dotaklo predaju.
   Javno, kratko, bez prebacivanja krivice, s jednom konkretnom mjerom.
6. **Proaktivno zvati svakoga kome je rok pao u prozor incidenta**, poimence, čak
   i ako nije pogođen. Mali broj kupaca je ovdje prednost.

## 5. Kad kupac ne može predati, a brojač teče

Ovo se zapisuje unaprijed jer se prvi put uvijek odradi loše.

1. **Reći naglas stvarnu izloženost, u prvom odgovoru.** Ne "radimo na tome",
   nego: "Zadnja predaja za PRC 2026012345 bila je 12.8. Tridesetodnevni rok je
   bio 11.9. Grejs od 14 dana ističe 25.9. Još niste u kazni." U devet od deset
   slučajeva panika je gora od brojača, a imenovanje datuma je razoruža. Ovo je
   najvrednija stvar koju radimo.
2. **Naša greška ili njihova.** Bug u generisanju, neuneseni sati u četvrtak, i
   pad portala su tri različite situacije.
3. **Vratiti predaju bilo kojim putem**, ovim redom: popraviti bug i
   regenerisati; **napraviti XML ručno ili skriptom i dati kupcu fajl**; unijeti
   ručno u portal (portal to podržava); ako je portal pao, dokumentovati pokušaj.
   **Načelo: aplikacija nikad nije jedini put do predaje.** Dugmad "Skini XML" i
   "Skini WH-347" od prvog dana su cijeli plan oporavka.
4. **Ako je kriv portal**, snimak ekrana s vremenom, kupac isto, i sačuvati.
   NYSDOL primjenjuje diskreciju i dokumentovan pokušaj u dobroj vjeri se broji.
   Objaviti na stranici statusa; ta stranica postaje dokaz trećeg lica za svakog
   pogođenog kupca.
5. **Ako smo mi krivi i kazna stvarno nastane** (politika se odlučuje unaprijed):
   - Vratiti mjesečnu naplatu odmah i bez rasprave. Nikad se ne prepirati oko 79 $.
   - Platiti dokumentovanu kaznu **do objavljenog iznosa** ako je greška
     isključivo naša i ako smo obaviješteni odmah. Prijedlog: 2.500 $. Očekivani
     trošak je blizu nule jer je uzrok najčešće podatak kupca, a marketinška
     vrijednost u kategoriji izgrađenoj na strahu je velika. **Traži advokatski
     pregled prije objave** (spec/13 C8, spec/18).
   - **Ne priznavati pravnu odgovornost u pisanoj formi.** Jedna rečenica koju je
     advokat odobrio, i samo ta.
6. **Uvijek pisana bilješka kupcu u 48 sati**: šta se desilo, šta je promijenjeno,
   koja provjera je dodana. Dobro odrađen kvar zadržava kupca bolje od godine bez
   kvara.

**Jedna strukturna mjera koja sve ovo prevenira: kontrolna tabla rokova za Mumu.**
Svaki kupac, svaki projekat, dana od zadnje prihvaćene predaje, dana do
četrnaestodnevnog praga. Gleda se svako jutro. Email "na 22. si danu, hajde da
ovo predamo" tri dana prije nego što bi kupac uspaničio **jeste proizvod**, i
najjeftinija podrška koja postoji.

## 6. Postavljanje kupca (plaćena naknada)

### 6.1 Cijena po satima

Cilj je 75 $ po satu efektivno.

| Nivo | Cijena | Budžet | Opseg |
|---|---|---|---|
| Basic (`basic_149`) | 149 $ | **2 h** | 1 firma, do 2 aktivna projekta, do 10 radnika, do 5 klasifikacija, bez istorije |
| Standard (`standard_299`) | 299 $ | **4 h** | do 5 projekata, 30 radnika, 12 klasifikacija, sindikalni planovi, do 4 sedmice istorije |
| Full (`full_499`) | 499 $ | **6,5 h** | do 12 projekata, 75 radnika, više sindikata, omjeri pripravnika, do 12 sedmica istorije, jedan uvoz iz postojećeg sistema |
| Sam (`waived`) | 0 $ | 0 | Kupac postavlja sam. Proizvod je isti. |

**Ova tabela je izvor istine za opseg nivoa.** 08 i 03 je referišu, ne ponavljaju.

Preko toga **95 $ po satu, procijenjeno i odobreno prije početka.** Skoro se
nikad neće naplatiti; postoji da se može reći ne bez pregovaranja.

**Nivo se određuje na prodaji, pitanjima:** broj aktivnih PRC projekata, broj
radnika, sindikat ili ne, ima li pripravnika, koliko sedmica istorije, **i ima li
NYC poslova.** Pogrešno prodat nivo je glavni uzrok neisplativog postavljanja.

### 6.2 Šta se prikuplja i kako

**A. Web forma** za sve što ima fiksan oblik (nikad tabela; validacija na unosu
vrijedi više od udobnosti): pravni naziv, FEIN, **NYS registracioni broj**,
adresa, telefon; ovlašteno lice s imenom, titulom i emailom; ko unosi sate;
učestalost isplate i dan kraja sedmice; treba li i federalni WH-347; koji platni
sistem koriste; sindikalni lokali i datumi kolektivnih ugovora.

**B. Naša Excel tabela**, zaključana zaglavlja, padajuće liste, list s
validacijom. **Njihov format se ne prima.** Četiri lista:
1. *Projekti*: naziv, PRC broj, naručilac, broj ugovora, adresa gradilišta,
   datum početka, glavni izvođač, naša uloga, ima li federalnih sredstava.
2. *Radnici*: ime, srednje ime, prezime, adresa (address1 do 42 znaka, city do
   40, država, ZIP 5 cifara, +4 opciono, **iste granice kao XML da se validira
   jednom**), zadnje 4 SSN **ili** datum rođenja, registrovani pripravnik da/ne,
   program i godina, klasifikacije, lokal.
3. *Klasifikacije i stope*: naziv tačno kako stoji u PRC tabeli, osnovna stopa,
   dodatak, **OT kodovi**, kod praznika, zone i smjene, datum važenja, zakazana
   povećanja.
4. *Planovi beneficija*: naziv, vrsta, iznos po satu ili sedmici, u plan ili u
   gotovini, kontakt fonda.

**C. Dijeljenje ekrana**, dva puta:
- **Kickoff, 30 minuta, prije prikupljanja**: potvrditi opseg i nivo, provjeriti
  PRC brojeve prema stvarnim tabelama, dogovoriti datum puštanja, i **gledati
  kako sad rade jednom.** Deset minuta gledanja spriječi većinu prepravki.
- **Predaja, 30 minuta, poslije izgradnje**: proći kroz njihove stvarne podatke i
  **predati prvu sedmicu zajedno**, potvrditi da se ovlašteno lice može prijaviti.

**D. Dokumenti**: PRC tabela za svaki projekat (ili broj pa je mi povučemo),
sindikalni list beneficija po lokalu, ranije predati izvještaji kao referenca,
zadnja 2 do 4 platna registra.

### 6.3 Runbook, sedam radnih dana

| Dan | Korak | Naše vrijeme |
|---|---|---|
| 0 | Uplaćen setup, automatski: dobrodošlica, link na formu, tabela, link za zakazivanje | 0 |
| 1 do 2 | Kickoff poziv, 30 min | 0,5 h |
| 2 do 4 | Kupac popunjava. Automatski podsjetnici D+2 i D+5 | 0 |
| 4 | Provjera podataka kroz validator, **jedan konsolidovan spisak rupa**, ne pet poruka | 0,5 h |
| 5 | Izgradnja: firma, projekti, klasifikacije, stope, planovi, radnici | 1,5 do 3 h |
| 5 | Uvoz istorije ako je u opsegu | 0,5 do 2 h |
| 6 | **Naša kontrola**: generisati testni XML po projektu za jednu sedmicu, provjeriti kroz šemu, generisati testni WH-347. Ne preskače se | 0,5 h |
| 6 | Poslati **"pregledaj i odobri"**: sve stope, klasifikacije i radnici, s dugmetom za odobrenje | 0,25 h |
| 7 | Predaja, 30 min, prva stvarna predaja zajedno | 0,5 h |
| 7 | Puštanje. Uključuju se rokovi i podsjetnici | 0,1 h |

Ukupno 3,85 h (Basic) do 7,35 h (Complex).

**Odobrenje šestog dana je najvažniji korak u cijelom runbooku.** Ono prenosi
odgovornost za tačnost stopa i klasifikacija na kupca u tačno određenom trenutku,
prije ijedne stvarne predaje. Bilježi se s vremenskim žigom. To je naš najbolji
dokaz ako se za šest mjeseci ispostavi da je klasifikacija pogrešna, a spor oko
klasifikacije je najvjerovatniji ozbiljan spor u ovom poslu.

### 6.4 Šta najčešće ide po zlu, po tome koliko marže pojede

1. **Kupac ne vrati tabelu.** Ubjedljivo najveći ubica; pretvori posao od 4 sata
   u šest sedmica jurcanja. *Rješenje*: setup naknada kupuje prozor od 14 dana,
   napisan u prvom emailu; poslije toga se posao pomjera. Podsjetnici D+2 i D+5,
   lična poruka D+8. Razmotriti 50 % pri kupovini i 50 % pri puštanju.
2. **Pogrešna ili sporna klasifikacija.** *Rješenje*: klasifikacije se povlače iz
   PRC tabele i kupac bira s liste. **Nikad se ne kuca slobodan tekst.** U
   uslovima piše da je klasifikacija njihova odluka.
3. **Modeliranje beneficija.** Lokali se razlikuju, neke su po satu a neke po
   sedmici, neke su gotovina koja se po NY pravilu dodaje prijavljenoj stopi.
   Ovdje sati nestaju. *Rješenje*: **biblioteka planova po sindikalnom lokalu.**
   Svaki lokal se izgradi jednom i koristi za svakog sljedećeg kupca s tim
   lokalom. **Ovo je imovina koja se akumulira**: do dvadesetog kupca u istom
   zanatu skoro da nema posla oko beneficija.
4. **Stope i omjeri pripravnika.** *Rješenje*: obavezna polja, validacija,
   upozorenje kad omjer izgleda van pravila.
5. **Nedostaje PRC broj ili je zamijenjen s brojem ugovora.** *Rješenje*:
   validacija formata na unosu i put "naći ćemo ga".
6. **Kriptične greške pri uploadu.** *Rješenje*: validacija kroz šemu lokalno
   prije predaje i prevod grešaka na ljudski jezik. **Ovo je jezgro vrijednosti
   proizvoda**, ne poliranje.
7. **Istorija se raširi.** "Možete li i zadnje dvije godine?" *Rješenje*:
   istorija je ograničena po nivou i cjenovnik za više je objavljen.
8. **Ovlašteno lice nikad nije u sobi.** Postaviš knjigovođu, a na dan predaje
   onaj ko mora potpisati nikad se nije prijavio. *Rješenje*: email ovlaštenog
   lica je obavezno polje, a njegova uspješna prijava je uslov za puštanje.
9. **NYC.** Pitanje u kvalifikaciji, ne otkriće na peti dan.

### 6.5 Kako se ostaje unutar sati

- **Nikad ne primati podatke u kupčevom formatu.** Jedan šablon, validiran, bez
  izuzetaka. Preformatiranje tuđe tabele je klasičan nenaplaćen sat.
- **Jedan krug pitanja, ne kapanje.** Sve rupe u jednoj poruci.
- **Graditi biblioteku**: tabele po PRC, planovi po lokalu, klasifikacije po
  zanatu. Pratiti "sati po postavljanju po mjesecu"; ako ne pada, biblioteka ne
  radi.
- **Mjeriti stvarno vrijeme od prvog kupca.** Bez deset mjerenja nema tačne
  cijene nivoa.
- **Automatizovati kontrolu**: skripta koja iz popunjenog šablona napravi
  validan XML i izvještaj o razlikama pretvara 30 minuta u 3.
- **Snimiti predaju jednom** i generičkih 20 minuta koristiti kao video; uživo
  ostaje samo 10 minuta specifičnih za kupca.
- **Reći ne dodacima petog dana.** "Rado, to je dodatni projekat po X, ili poslije
  puštanja."
- **Postavljanje se nikad ne poklanja kad je ugovoreno.** `waived` znači da kupac
  postavlja sam, ne da mi radimo besplatno. Ko naruči postavljanje pa neće platiti
  149 $ neće preživjeti ni prikupljanje podataka.

## 7. Prvih 30 dana kupca

Ograničenje koje sve određuje: **kupac mora uspjeti u zadatku koji se ponavlja,
i njegova sposobnost, a ne naš spisak funkcija, određuje hoće li ostati.**
Vrijeme do vrijednosti nije prva prijava nego **prva samostalno završena i
prihvaćena predaja.**

| Dan | Šta | Zašto |
|---|---|---|
| 0 | Dobrodošlica, forma, zakazivanje | počinje sat |
| 1 do 7 | Runbook | do puštanja |
| **7** | **Prva predaja, zajedno** | **prekretnica 1: dokaz da radi** |
| 8 | Potvrda, raspored nadolazećih rokova, radno vrijeme, direktan email | očekivanja |
| **10 do 12** | **Prva sedmica koju unese sam, dok mi gledamo tablu** | **prekretnica 2, prava** |
| 11 | Ako nije unio do roka: **mi se javljamo prvi.** Ne čeka se da omane | najkorisniji dodir u cijelom nizu |
| **14** | Poziv 15 min: "pokaži mi šta si radio prošle sedmice" | hvatanje tihe greške |
| 15 | "Tri stvari na kojima ljudi zapnu": promjena klasifikacije usred projekta, gotovina umjesto beneficija, sedmice bez rada | preduhitriti najčešće prijave |
| **17 do 19** | **Drugi samostalni ciklus** | **prekretnica 3: nije bila slučajnost** |
| 21 | Pozvati drugog korisnika (knjigovođa ili menadžer). **Nalozi s jednim korisnikom otkazuju kad taj ode na godišnji** | smanjenje rizika |
| 24 do 26 | Treći samostalni ciklus | navika |
| **28 do 30** | **Prvi 30-dnevni državni rok**, s ljestvicom podsjetnika T-10, T-5, T-2 | **prekretnica 4: trenutak koji obnavlja ugovor** |
| 30 | Pregled 20 min: koliko predaja, koliko sati ušteđeno. **Ovdje se traži preporuka ili recenzija**, na vrhuncu dobre volje | širenje |

## 8. Četiri signala zdravlja koja se prate, i djeluje se po njima

1. **Dana od zadnjeg unosa sati.** Vodeći pokazatelj odlaska. Preko 10 dana ide
   lična poruka, ne automatska.
2. **Broj grešaka po predaji, u trendu.** Ako ne pada, kupac ne razumije alat i
   kriviće alat.
3. **Vrijeme od kraja sedmice do potpisa.** Ako raste, proces se ne prima.
4. **Je li se ovlašteno lice prijavilo u zadnjih 14 dana.** Ako nije, imamo usko
   grlo potpisa koje čeka da postane hitan slučaj.

**Najvrednija navika prvog mjeseca: javiti se prije nego što bilo šta propuste.**
Cijela percipirana vrijednost proizvoda za usklađenost je da neko pazi. Za prvih
trideset kupaca taj neko može doslovno biti Mume, i to je najodbranjivija
prednost koju ćemo ikad imati nad eBaconom.
