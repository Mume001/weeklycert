# Troškovi, ispravljeno 14.9.2026.

Ovaj fajl zamjenjuje tabelu troškova u `Zarada-troskovi-porezi.pdf`. Tamo je pisalo
"svi troškovi, ništa nije izostavljeno", a dvije stavke su bile izostavljene.
Ovdje su, i uz to je email trošak pao jer ne treba alat za masovno slanje.

---

## 1. Šta se mijenja u odnosu na PDF

| Stavka | U PDF-u | Stvarno | Razlog |
|---|---|---|---|
| Alat za email i sandučići | 90 $/mj | **0 do 7 $/mj** | Smartlead sa 6 sandučića je alat za hiljade poruka. Ti šalješ 100 do 300 ručno personalizovanih. Treba ti jedan sandučić. |
| Pravni dokumenti | **nije bilo** | 119 $/god plus 1.000 do 2.000 $ jednom | Uslovi, privatnost, DPA i pisani program sigurnosti. Šabloni plus advokatski pregled. Vidi spec/18 §5. |
| Cyber i E&O osiguranje | **nije bilo** | 800 do 2.000 $/god | Česta tvrda kapija za odobrenje dobavljača kod glavnog izvođača. Vidi spec/18 §3. |

Prve dvije izostavljene stavke su moja greška i izašle su tek iz pravnog
istraživanja drugog dana. Email trošak je pao, dakle greška ide u oba smjera, ali
neto je oko 1.000 do 2.000 $ više nego što je PDF pokazivao.

## 2. Koliko treba **prije prve uplate**

| Stavka | Iznos |
|---|---|
| Tri domene | plaćeno |
| Email na getweeklycert.com | 0 $ (Zoho Mail besplatni plan) ili 12 $/god (Zoho Lite) ili 84 $/god (Google Workspace) |
| Prijem pošte | 0 $ (Cloudflare Email Routing na tvoj postojeći Gmail) |
| Hosting sajta | 0 $ (Cloudflare Pages) |
| Stripe | 0 $ dok ne naplatiš |
| **Ukupno** | **0 do 12 $** |

Ovo je stvaran broj. Do prve uplate ne treba ni advokat, ni osiguranje, ni server,
ni telefon.

## 3. Mjesečno dok prodaješ, prije proizvoda (mjeseci 1 do 3)

| Stavka | Iznos |
|---|---|
| Domene | 3 $ |
| Email | 0 do 7 $ |
| **Ukupno** | **3 do 10 $/mj** |

Ne 93 $, kako je pisalo.

## 4. Mjesečno kad proizvod radi (od 4. mjeseca)

| Stavka | Iznos |
|---|---|
| Server, baza, skladište i backup | 49 $ (DigitalOcean NYC3 paket iz spec/10 §3, uključuje Spaces i backup droplet-a) |
| Resend, transakcioni email | 0 do 20 $ |
| Sajt na Cloudflare Pages, DNS | 0 $ |
| Email (Zoho Mail besplatan plan) | 0 $ |
| Američki broj telefona | 15 do 20 $ |
| Domene (3 komada) | 3 $ |
| **Ukupno** | **67 do 92 $/mj** |

Broj se razlikuje od spec/10 §8 (52 do 72 $) za tačno jednu stavku: američki
broj telefona, koji je poslovni trošak, a ne hosting.

## 5. Godišnje, američka papirologija i zaštita

| Stavka | Iznos | Kad |
|---|---|---|
| Wyoming godišnji izvještaj | 60 $ | svake godine |
| Registrovani agent | 100 $ | svake godine |
| Računovođa u SAD (5472 i pro forma 1120) | 700 $ | svake godine, kazna za propust je 25.000 $ |
| Termageddon, politika privatnosti koja se sama ažurira | 119 $ | svake godine |
| **Advokatski pregled uslova, privatnosti i DPA** | **1.000 do 2.000 $** | **jednom**, prije prvog kupca s pravim podacima radnika |
| **Cyber i E&O osiguranje** | **800 do 2.000 $** | godišnje, prije prvog glavnog izvođača |

## 6. Prva godina, iskreno

| | Iznos |
|---|---|
| Prije prve uplate | 0 do 12 $ |
| Mjeseci 1 do 3, prodaja | oko 30 $ |
| Mjeseci 4 do 12, proizvod radi | oko 850 $ |
| Godišnja papirologija | 979 $ |
| Advokat, jednom | 1.000 do 2.000 $ |
| Osiguranje | 800 do 2.000 $ |
| Stripe provizija na oko 30.000 $ prometa | oko 1.000 $ |
| **Ukupno prva godina** | **4.700 do 6.900 $** |

Projektovani bruto prihod prve godine je oko 34.000 $, dobit prije poreza oko
25.800 $ po modelu iz PDF-a. Ovi troškovi su već bili u tom računu osim advokata i
osiguranja, koji dodaju 1.800 do 4.000 $, dakle dobit pada na oko **22.000 do
24.000 $ prije poreza**, umjesto 25.800 $.

## 7. Šta se smije odgoditi, a šta ne

**Smije se odgoditi do prvog kupca s pravim podacima:** advokat, osiguranje,
server, telefon, transakcioni email.

**Ne smije se odgoditi:** Form 5472 i pro forma 1120 za LLC u stranom vlasništvu.
Rok je 15. april, a kazna 25.000 $ i ne zavisi od toga jesi li zaradio išta. Ako
LLC već postoji a to nije predato, to je prioritet iznad cijelog ovog projekta.
