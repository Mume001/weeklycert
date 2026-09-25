# 02. Uloge, dozvole i višestanarstvo

---

## 1. Model: korisnik, firma, članstvo

- **Korisnik** (`user`) je jedna osoba s emailom. Postoji nezavisno od firme.
- **Firma** (`tenant`) je jedan kupac.
- **Članstvo** (`membership`) veže korisnika za firmu s jednom ulogom.
- Jedan korisnik može imati **više članstava** (knjigovođa koji radi za pet
  podizvođača). Sesija nosi `active_tenant_id`; prebacivanje firme ponovo provjerava
  članstvo.
- Platformski **super-admin** (Mume) nije uloga u firmi nego globalna zastavica na
  korisniku. Nikad ne dobija članstvo u tuđoj firmi. Pristup tuđim podacima ide
  samo kroz izričito "impersoniraj" s razlogom, i to se loguje.

## 2. Uloge u firmi

| Uloga | U kodu | Ko je to | Šta smije |
|---|---|---|---|
| Vlasnik | `owner` | Vlasnik podizvođačke firme | Sve, uključujući naplatu, brisanje firme, dodavanje i uklanjanje članova, promjenu vlasnika |
| Administrator | `admin` | Kancelarijski menadžer | Sve osim naplate i brisanja firme. Poziva članove do svoje razine. |
| Obrada plata | `payroll` | Osoba koja unosi sate i pravi izvještaje | Projekti, radnici, sati, uvoz, validacija, generisanje izvještaja. **Ne potpisuje.** Ne vidi naplatu. Ne mijenja članove. |
| Potpisnik | `signer` | Ovlašteno lice za izjavu o usklađenosti | Kao `payroll` plus potpis i označavanje kao predato. Namjerno odvojeno jer potpis nosi krivičnu odgovornost. |
| Samo pregled | `viewer` | Glavni izvođač, revizor, računovođa bez unosa | Čita projekte, izvještaje i arhivu. Ne vidi pune adrese radnika ni odbitke po radniku osim u generisanom PDF-u koji ima pravo skinuti. |
| Vanjski knjigovođa | `bookkeeper` | Vanjska osoba koja radi za više firmi | Isto kao `payroll` + `signer` **ako mu vlasnik uključi potpis**, u svakoj firmi posebno. Ima poseban ekran "Moje firme". |

Vlasnik može imati samo jednu osobu. Prijenos vlasništva traži potvrdu emailom.

## 3. Matrica dozvola

Legenda: C = kreira, R = čita, U = mijenja, D = briše, X = izvršava. Prazno = ne.

| Resurs / akcija | owner | admin | payroll | signer | viewer | bookkeeper | super-admin |
|---|---|---|---|---|---|---|---|
| Firma: profil, FEIN, registracija | RU | RU | R | R | R | R | R (impersonacija) |
| Firma: brisanje, izvoz svega | D X | | | | | | X (na zahtjev, logovano) |
| Naplata: plan, kartica, računi, pauza, otkaz | RU X | | | | | | R |
| Članovi: pozvati, ukloniti, promijeniti ulogu | CRUD | CRU (ne owner) | | | | | R |
| Projekti | CRUD | CRUD | CRU | CRU | R | CRU | R |
| Klasifikacije i stope po projektu | CRUD | CRUD | CRU | CRU | R | CRU | R |
| Radnici: ime, klasifikacija, status | CRUD | CRUD | CRU | CRU | R (samo ime i klasifikacija) | CRU | R |
| Radnici: adresa, zadnje 4 SSN, datum rođenja | RU | RU | RU | RU | | RU | R (logovano) |
| Planovi beneficija | CRUD | CRUD | CRU | CRU | R | CRU | R |
| Sati (mreža) | CRUD | CRUD | CRUD | CRUD | R | CRUD | R |
| Uvoz CSV, profili mapiranja | X CRUD | X CRUD | X CRUD | X CRUD | | X CRUD | R |
| Validacija | X | X | X | X | R | X | R |
| Generisati izvještaj (nacrt) | X | X | X | X | | X | |
| **Potpisati izjavu** | X | X | | X | | X ako uključeno | |
| Označiti kao predato, unijeti potvrdu portala | X | X | X | X | | X | |
| Arhiva: pregled i skidanje | R | R | R | R | R | R | R (logovano) |
| Ispravka predatog (nova verzija) | X | X | X | X | | X | |
| Audit log firme | R | R | | | | | R |
| Podsjetnici i obavještenja | RU | RU | R (svoja) | R (svoja) | | R (svoja) | |

## 4. Pravila koja se ne krše

1. **Svaka provjera dozvole je u serverskoj funkciji**, ne samo u middlewareu. Next.js
   middleware je već jednom zaobiđen (CVE-2025-29927). Jedan helper
   `requireTenant(role)` na početku svake server akcije i API rute (isti helper
   provjerava i status pretplate iz 08 §2.4).
2. **Baza je drugi zid.** Row Level Security na svakoj tabeli s `tenant_id`.
   Aplikacija se spaja kao rola koja nije vlasnik tabela i nema BYPASSRLS. Tenant se
   postavlja sa `set_config('app.tenant_id', ..., true)` unutar transakcije.
3. **Knjigovođa i super-admin nemaju "vidi sve" upit.** Knjigovođa vidi listu svojih
   firmi iz `memberships`, pa bira jednu i tek onda se postavlja tenant. Nema
   upita preko više tenanta u istoj transakciji.
4. **PII se dekriptuje samo kad ekran to traži**, i svaki dekript se loguje (ko, kad,
   koji radnik). Lista radnika ne dekriptuje adrese; tek detalj radnika.
5. **Pozivnice** su vezane za email, haširane u bazi, važe 7 dana, prihvataju se samo
   iz naloga s tim potvrđenim emailom.
6. **Potpis traži ponovni unos lozinke ili 2FA koda** u tom trenutku. Sesija nije
   dovoljna.
7. **2FA obavezan** za `owner`, `admin`, `signer`, `bookkeeper`. Za `payroll` i
   `viewer` preporučen.

## 5. Navigacija po ulozi (izvor istine za bočnu traku)

Redoslijed i engleski nazivi stavki su u 15 §3. Ovo je koja se stavka kome
prikazuje. `x` znači vidi, prazno znači ne postoji u traci. Skrivena stavka nije
zaštita: ruta i dalje provjerava dozvolu i vraća `ForbiddenState` (19 §7).

| Stavka | owner | admin | payroll | signer | viewer | bookkeeper |
|---|---|---|---|---|---|---|
| Dashboard | x | x | x | x | x | x |
| This week | x | x | x | x | x (čita) | x |
| Projects | x | x | x | x | x (čita) | x |
| Workers | x | x | x | x | x (samo ime i klasifikacija) | x |
| Fringe plans | x | x | x | x | x (čita) | x |
| Import | x | x | x | x | | x |
| Archive | x | x | x | x | x | x |
| **Company** | | | | | | |
| Setup | x | x (korak 7 zaključan) | x (koraci 1 i 7 zaključani) | x (isto) | | x (isto) |
| Settings | x | x | x | x | | x |
| Help and support | x | x | x | x | x | x |

Tri stvari koje se izvode iz matrice u §3 i zato izgledaju iznenađujuće:

**`viewer` vidi "This week" i "Projects", samo ne može ništa unijeti.** U §3 ima
`R` na satima, projektima, klasifikacijama i planovima beneficija. Sakriti mu
tekuću sedmicu, a ostaviti Projekte kroz koje do iste te sedmice dolazi u dva
klika, bila bi lažna zaštita i zbunjujuća navigacija. Mreža mu se otvara samo za
čitanje.

**`payroll`, `signer` i `bookkeeper` vide Setup.** Koraci 2 do 6 čarobnjaka su
tačno ono što im §3 dozvoljava: projekti, klasifikacije, radnici, beneficije,
prva sedmica. Zaključana su samo dva: korak 1 (profil firme, oni ga samo čitaju)
i korak 7 (naplata, koju ne vide uopšte). Zaključan korak pokazuje šta nedostaje
i ko to može unijeti, ne prazno polje.
Korak 7 je zaključan i za `admin`: naplata je u §3 samo vlasnikova (Mume,
25.9.2026).

**Naplata, Tim, Potpisnici, Dnevnik i Podaci nisu stavke u traci** nego
pod-stranice Settingsa, i unutar njega se skrivaju po §3. Zato `payroll` vidi
Settings, ali u njemu samo Company (čita) i Notifications (svoja).

### Potpisnik nema zasebnu stavku "Za potpis"

Ranija verzija ovog fajla je spominjala red čekanja "Za potpis" kao stavku u
traci. Te rute nema u 03 §2 i ne pravi se. Red čekanja potpisnika je **kartica na
kontrolnoj tabli**, `report waiting for signature` (15 §3), koja vodi pravo na
`/projects/[id]/weeks/[we]/sign`. Potpisnik otvara aplikaciju, vidi šta čeka, i
klikne. Zasebna stavka u traci bi bila prazna svaki dan kad nema šta potpisati.

### Ostalo po ulozi

- `payroll` i `viewer` nemaju dugme "Potpiši". `payroll` umjesto njega ima
  "Request signature", koje šalje email potpisniku.
- `bookkeeper` ima dodatni ekran "Moje firme" (`/firms`) kao početni, s rokovima
  po firmi. Unutar firme radi kao `payroll`, ili kao `signer` ako mu vlasnik
  uključi potpis.
- super-admin je odvojena aplikacija `/admin`, nema je u ovoj traci.

## 6. Životni ciklus računa

- Registracija pravi korisnika i firmu, korisnik postaje `owner`.
- Probni period 14 dana, kartica se unosi pri registraciji (vidi 08). Poslije toga čitanje radi, generisanje
  izvještaja traži plan.
- Pauza (između poslova): podaci ostaju, generisanje isključeno, 0 $ mjesečno.
- Otkaz: 30 dana milosti za izvoz, pa brisanje uz uništavanje ključa za šifrovanje.
  Prije brisanja korisnik potvrđuje da je izvezao arhivu, jer je obaveza čuvanja
  njegova.
