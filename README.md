# WeeklyCert

Certified payroll za podizvođače u državi New York: NY XML za NYSDOL portal i
federalni WH-347, iz jednog unosa sati, s provjerom prije predaje.

Ovaj folder je sve što postoji o projektu. Kod ne postoji dok se ne prođe kapija
(vidi dolje).

## Šta je gdje

```
weeklycert/
  README.md            ovaj fajl
  CLAUDE.md            pravila za Claude Code (kopira se u repo kad krene izrada)
  SOURCES.md           izvori i datumi provjere

  dizajn/              KAKO IZGLEDA. Otvoriti u pregledniku.
    aplikacija.html      klikabilni prototip, 10 ekrana, klikaj lijevu traku
    sajt.html            javni sajt, cijela stranica

  izvori/              ZVANIČNI FAJLOVI skinuti u koraku 0. Prazno dok Mume ne
    ny/                  skine ono što traži poslovno/SKINUTI-FAJLOVE.md.
    federalno/           Kad fajl postoji ovdje, on je izvor istine, ne spec.

  poslovno/            zašto ovaj proizvod i koliko donosi
    PROJEKAT-01.md               opis niše i poslovnog modela
    NISE.md                      10 istraženih niša, zašto ova
    SISTEM-KONTAKTA.md           kako dolazimo do kupaca (email, pošta; ne SMS)
    ONBOARDING-KUPCA.md          šta kupac prolazi prvih 30 dana
    DNS-POSTAVKA.md              sve tri domene, provjereno stanje
    SKINUTI-FAJLOVE.md           korak 0: šta skinuti, odakle, gdje snimiti
    TROSKOVI.md                  stvarni troškovi, ispravka tabele iz PDF-a
    filtriraj.py                 filter NY registra izvođača
    ny-registar.csv              14.674 aktivna izvođača, izvor data.ny.gov
    lista-prioritet.csv          868 firmi, prvi krug
    lista-zlatna.csv             2.480 firmi s pripravničkim programom
    lista-sira.csv               11.905 ostalih
    Projekat-01-certified-payroll-NY.pptx
    Zarada-12-mjeseci.pdf
    Zarada-troskovi-porezi.pdf

  spec/                ŠTA SE GRADI, dovoljno detaljno da Claude Code radi sam
    00-PROIZVOD.md               šta jeste, šta nije, MVP, kapija
    01-DOMEN-I-PRAVILA.md        rječnik, OT kodovi, beneficije, golden testovi
    02-ULOGE-I-DOZVOLE.md        uloge, matrica dozvola, višestanarstvo
    03-RUTE-I-EKRANI.md          svaka ruta, svaki ekran, svako stanje
    04-MODEL-PODATAKA.md         44 tabele, enumi, RLS, šifrovanje PII
    05-IZLAZI-WH347-NYXML.md     NY XML, WH-347, izjava, ritam predaje
    06-UVOZ-PODATAKA.md          CSV i XLSX uvoz u 4 koraka
    07-VALIDACIJA.md             katalog nalaza s kodovima i porukama
    08-NAPLATA-STRIPE.md         cijene, Checkout, webhookovi, statusi
    09-TEHNOLOSKI-STEK.md        stek, verzije, struktura repoa
    10-INFRASTRUKTURA.md         hosting u 3 faze, postavka korak po korak
    11-SIGURNOST-I-USKLADJENOST.md
    12-PLAN-IZRADE.md            redoslijed koraka i kriteriji "gotovo"
    13-OTVORENA-PITANJA.md       sve neprovjereno na jednom mjestu
    14-DIZAJN-SISTEM.md          boje, tipografija, mjere, pristupačnost
    15-TEKSTOVI-I-EMAILOVI.md    svaki string u sučelju i svaki email
    16-MARKETING-SAJT.md         struktura sajta i pozicioniranje
    17-PODRSKA-I-OPERACIJE.md    radno vrijeme, incidenti, runbook postavljanja
    18-PRAVNO.md                 uslovi, privatnost, DPA, SHIELD, šta kupiti
    19-FRONTEND-IZRADA.md        ugovor za izradu frontenda: dvije aplikacije,
                                 stablo fajlova, DTO-i, potpisi komponenti,
                                 demo podaci, sesije, definicija gotovog
    20-SESIJE.md                 red čekanja sesija F do O, do kapije

  skice/
    ekrani.html          rani žičani modeli (dizajn/ ih je zamijenio)
```

## Kako se ovo koristi

1. Mume otvori `dizajn/aplikacija.html` i `dizajn/sajt.html` u pregledniku i
   kaže šta ne valja. Jeftinije je mijenjati sad nego u kodu.
2. Pročita `spec/00` i `spec/12`. To je 15 minuta i dovoljno za odluke.
3. Korak 0: uraditi **`poslovno/SKINUTI-FAJLOVE.md`** od vrha do dna. To je
   operativna lista s provjerenim linkovima; `spec/12` korak 0 je pregled šta se
   time zatvara.
4. Ovaj folder postaje korijen repozitorija: `git init` ovdje, `CLAUDE.md` i
   `spec/` su već na mjestu, kod dolazi pored njih. Prva poruka Claude Codeu je
   u `spec/19` §10, sesija A.
5. Spec je izvor istine. Ako kod treba da odstupi, prvo se mijenja spec.

## Napomene o kodu (privremena stanja koja se vraćaju)

- **Prefetch je isključen na linkovima bočne trake, birača firmi i putanje**
  (`prefetch={false}` u `apps/web/components/app-shell/Sidebar.tsx`,
  `TenantSwitcher.tsx` i `PageBar.tsx`). Razlog: većina odredišta su ekrani iz kasnijih sesija
  koji još ne postoje, pa bi ih Next.js unaprijed dovlačio i punio konzolu
  404 greškama, a definicija gotovog traži konzolu bez ijedne greške
  (spec/19 §10 stavka 1). **Vraća se stavku po stavku, kako ekrani nastaju:**
  svaka sesija dodaje svoje stavke u listu `BUILT` u `apps/web/lib/nav.ts`.
  Poslije sesije I prefetch imaju `This week`, `Projects`, `Workers`,
  `Fringe plans`, `Import` i `Setup`. Kad su sve stavke
  u listi, briše se lista, `prefetch={false}` i ovaj pasus.

## Kapija

Ukinuta 24.9.2026. Proizvod se gradi do kraja, backend uključen, pa tek onda
prodaja. Detalji i jedini izuzetak (prvi upload u NYSDOL portal) su u
`spec/12` §KAPIJA.

## Brojevi koji drže projekat

- Cijena: 79 $/mj plus setup 149/299/499 $. Probni period 14 dana s karticom.
- Tržište: **14.674** aktivna izvođača u NY registru (prebrojano 14.9.2026),
  svi s telefonom, **nijedan s emailom**. Prvi krug poslije filtriranja: 868
  firmi u `poslovno/lista-prioritet.csv`.
- Zakonski okidač: NYSDOL portal obavezan od 1.1.2026. Predaja najmanje svakih 30
  dana od početka projekta, 14 dana grejsa, pa 100 $ po danu. NYSDOL trenutno ne
  izriče kazne dok se izvođači navikavaju; to je nedatirano i ne gradi se na tome.
- Trošak hostinga faza 1: 52 do 72 $/mj (sajt na Cloudflare Pages i email na
  Zohu su besplatni).
- Cilj 6. mjesec: oko 2.000 $/mj prihoda. 12 mjeseci u ruke oko 22.000 $ (FBiH).

## Tri stvari koje treba znati prije nego što se išta gradi

1. **NY portal nema API.** Zvanično. Kupac uvijek uploaduje ručno; mi pravimo
   fajl koji prolazi iz prve i bilježimo potvrdu. To se ne mijenja.
2. **Prekovremeni u NY nisu jedno pravilo** nego OT kodovi po klasifikaciji iz
   platne tabele (puna legenda u spec/01 §2.1). Ovo je najveća ispravka u odnosu
   na prvu verziju plana.
3. **Certiwage postoji**, 29 do 59 $ s besplatnim nivoom. Naša odbrana nije
   cijena nego to što je Njujork njihova sporedna stvar a naša jedina
   (spec/16 §3).
