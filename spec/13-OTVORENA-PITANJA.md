# 13. Otvorena pitanja i neprovjerene pretpostavke

Sve što u spec fajlovima piše NEPROVJERENO je ovdje, s tim ko to zatvara i kad.
Kad se pitanje zatvori, odgovor se upiše ovdje i u fajl na koji se odnosi.

Ažurirano 15.9.2026.

---

## ZATVORENO 13.9.2026.

| # | Pitanje | Odgovor |
|---|---|---|
| A2 | Kako se predaje sedmica bez rada | **Ne predaje se XML-om.** U portalu se čekira "No Work Week", ili se dani unesu s 0 sati, ili se koristi "Enter Work Pause Dates" za raspon. Obaveza prijave postoji. Ugrađeno u 05 §3.4 i 03. |
| A9 | Ima li NY portal API ili SFTP | **Nema.** Zvanično uputstvo: "an API for the Certified Payroll portal is not available at this time". Upload je ručan i to je trajno ograničenje proizvoda. |
| A5 | Razdvajač u nazivima klasifikacija | **Duga crta U+2013 s razmacima**: `Zanat – Podvrsta`. Neke stavke nemaju podvrstu; desna strana smije imati obične crtice. Dijeliti samo na ` – `. |
| A8 | Struktura WH-347 2025 | Kolone 1A do 9 i tačan tekst svih šest kućica izjave su u 05 §4. Ostaje samo dump imena AcroForm polja iz PDF-a → sada A8b. |
| C1 | Hosting | Ostaje otvoreno kao odluka, ali tehnički je razriješeno u 10 §3. |
| C4 | Passkeys | Zatvoreno: od dana 1, Better Auth `passkey` plugin. |
| (novo) | Elektronski potpis na WH-347 | **Dozvoljen izričito**, i skenirani potpis izričito **nije** dovoljan. Naš zapis potpisa je usklađen, vidi 05 §4.5. |
| C1 (drugi dio) | Gdje ide javni sajt | **Cloudflare Pages**, besplatno, kao zasebna aplikacija `apps/site`. Vercel Hobby otpada jer izričito zabranjuje komercijalnu upotrebu, Vercel Pro je 20 $ i ne može nositi `pg-boss` radnika. Obrazloženje i izvori u 19 §9. Ostatak C1 (server za aplikaciju) ostaje otvoren. |
| (novo) | Jedan ili dva Next.js projekta | **Dva**: `apps/site` statički na Cloudflare Pages, `apps/web` na VPS-u. Razlog: sajt ide u produkciju sedmicama prije aplikacije i na drugi host. Vidi 19 §2. |
| (novo) | Gdje žive stringovi koje korisnik vidi | `packages/copy`, dijele ga obje aplikacije; sadržaj je iz 15. Ranije je na dva mjesta pisalo `content/site.ts`. |
| (novo) | Ritam predaje u NY | **Svakih 30 dana od početka projekta**, ne sedmično. 14 dana grejsa, pa 100 $ po danu. Federalno ostaje sedmično, 7 dana od isplate (29 CFR 3.4(a)). Ispravljeno kroz cijeli spec. |

## A. Blokira korak 5 (izlazi). Zatvara Mume u koraku 0.

| # | Pitanje | Gdje | Kako zatvoriti |
|---|---|---|---|
| A1 | Sam XSD fajl: redoslijed elemenata (sequence), tipovi, broj decimala, minOccurs | 05 §3.2 | Skinuti `https://dol.ny.gov/certpayrollxsd` u pregledniku. Domen je blokiran za moj sandbox. |
| A3 | Tačan token za peti tip dodatka: `Other Benefit` ili `Other Benefit (Type)`; i lista dozvoljenih `deduction/type` | 05 §3.3, 04 enumi | XSD |
| A4 | Da li `gender` i `ethnicity` uopšte postoje u šemi | 04 workers | XSD. U uputstvu za grupni upload ih **nema**, što je jak signal da ne postoje. Ako ih nema, izbaciti kolone iz `workers`. |
| A6 | Tačan format `prcNumber` i gdje se u portalu unosi registracioni broj | 04, 05 §3.4 | Portal uživo |
| A7 | Da li portal prima više fajlova za istu sedmicu (za >500 radnika) | 05 §3.6 | Uputstvo ili portal. Za našeg kupca (5 do 40 radnika) nije hitno. |
| A8b | Imena AcroForm polja u WH-347 PDF 2025 | 05 §4.6 | Skinuti PDF, pokrenuti `scripts/dump-pdf-fields.ts` |
| A10 | **Legenda praznika (HOLIDAY PAGE)**, numerisani kodovi 1 do oko 29 | 01 §2.1, 07 HOLIDAY_RULE_UNKNOWN | Prepisati s jedne stvarne platne tabele. Bez nje motor ne računa praznične premije. |
| A11 | Stvaran broj klasifikacija na zvaničnoj listi | 01 §3 | Prebrojati pri skidanju. Dva automatska čitanja dala su 227 i 463. |
| A14 | Gdje tačno gotovina umjesto beneficije ide na WH-347 i u NY XML | 05 §4 | Motor ih od koraka 2 vodi **odvojeno od nadnica**, i to je sigurno tačno jer oba izlaza traže razdvojeno. Otvoreno je samo u koju kolonu i element idu. Zatvara se u koraku 5, kad budu XSD i zvanični PDF u `izvori/`. |
| A12 | Maksimalna veličina XML fajla u MB | 05 §3.1 | Nije objavljeno. Pitati NYSDOL ili testirati. |
| A13 | Tačna formulacija OT koda **X** (beneficije na plaćene praznike) | 01 §2.1 | Prepisati s aktuelne platne tabele, zajedno s A10 |

## B. Poslovna pravila koja treba potvrditi s prvim kupcima (korak 9)

| # | Pitanje | Kako |
|---|---|---|
| B1 | Koliko kupaca radi i federalne i NY izvještaje istovremeno | Pitati prvih 10 |
| B2 | Da li glavni izvođači prihvataju naš zapis elektronskog potpisa na WH-347 | Pitati 3 glavna izvođača. Propis je na našoj strani, praksa možda nije. |
| B3 | Koliko radnika prosječno | Registar + kupci |
| B4 | Koji platni sistem koriste | Kupci |
| B5 | Koji OT kodovi se stvarno pojavljuju u njihovim tabelama | Prve tri platne tabele koje dobijemo |
| B6 | Da li se odbici iznad 10 dešavaju u praksi | Kupci |
| B7 | Da li kupci žele da mi šaljemo WH-347 glavnom izvođaču | Kupci |
| B8 | **Koliko kupaca ima i NYC poslove** (zaseban gradski sistem) | Pitanje u kvalifikaciji, obavezno prije prodaje |
| B9 | Prihvata li kupac 79 $ kad Certiwage nudi 29 do 59 $ s besplatnim nivoom | Prvih 20 razgovora. Vidi C7. |
| B10 | Odakle se dobija dozvoljeni omjer pripravnik:majstor po zanatu (`apprentice_ratio`) | Iz programa pripravništva ili s platne tabele. Provjeriti s prva tri kupca. |

## C. Odluke koje mogu čekati

| # | Pitanje | Kad |
|---|---|---|
| C1 | DigitalOcean ili Hetzner Ashburn, **samo za `apps/web`** (sajt je riješen, vidi zatvoreno gore) | Prije koraka 8 |
| C2 | B2 ili DO Spaces | S C1 |
| C3 | Particionisanje `time_entries` od početka ili kasnije | Kasnije |
| C5 | Prometheus/Grafana | Faza 2 |
| C6 | LLM parsiranje PDF platnih tabela | Kad ručno unošenje stopa postane usko grlo |
| C7 | **Pozicioniranje protiv Certiwagea** (29 do 59 $, besplatan nivo, ali federalni i kalifornijski fokus) | Prije pisanja landing stranice. Odgovor u 16-MARKETING-SAJT: mi smo njujorški specijalista, oni nisu. |
| C8 | Da li nuditi nadoknadu kazne do 2.500 $ kao garanciju | Prije objave cjenovnika. Vidi 18-PRAVNO §1. |

## D. Pravno i poslovno (Mume, van koda)

| # | Pitanje | Kako |
|---|---|---|
| D1 | Terms, Privacy, DPA, WISP | Put i cijene u 18-PRAVNO. Šablon plus advokatski pregled 1.000 do 2.000 $. |
| D2 | Da li je potrebna registracija kao "payroll service" u NY | Vjerovatno ne (ne isplaćujemo plate niti držimo novac). Pisani upit. |
| D3 | Cyber i E&O osiguranje | 800 do 2.000 $ godišnje. **Traži se prije nego što glavni izvođač odobri dobavljača**, ne tek na 20 kupaca. |
| D4 | Žig "WeeklyCert" | USPTO TESS pretraga, 15 minuta |
| D5 | Odgovorna osoba za SHIELD program | Mume, imenovan u WISP-u |

## E. Pretpostavke u brojevima koje tržište tek treba potvrditi

- 4 nove firme mjesečno od hladnog emaila (stopa odgovora 3 %, konverzija 25 %).
- Odliv 3 % mjesečno.
- 60 % kupaca uzima setup Standard ili Full.
- Vrijeme setupa po firmi 3,85 h (Basic) do 7,35 h (Complex), po runbooku u 17.

Ako poslije 60 dana prodaje brojevi budu ispod pola pretpostavke, to je signal za
zaustavljanje prije koraka 4, ne poslije.
