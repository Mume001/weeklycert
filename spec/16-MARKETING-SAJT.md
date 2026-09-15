# 16. Javni sajt

Vizual je u `dizajn/sajt.html`. Ovaj fajl objašnjava zašto je tako i šta ide u
svaku sekciju, da se tekst može mijenjati bez rušenja strukture.

---

## 1. Šta sajt mora uraditi

Kupac je vlasnik ili kancelarijski menadžer podizvođačke firme s 3 do 30 radnika,
u državi Njujork, koji je upravo saznao da mora u portal. Traži odgovor na tri
pitanja, tim redom:

1. Radi li ovo tačno ono što meni treba (NY XML, ne "certified payroll uopšte").
2. Koliko košta, i zašto to ne mogu vidjeti kod ostalih.
3. Ko ste vi i zašto bih vam dao podatke svojih radnika.

Sajt koji na to ne odgovori u prva dva ekrana je izgubio kupca, jer ovaj kupac
ne popunjava formu da bi saznao cijenu.

## 2. Šta radi konkurencija (istraženo 13.9.2026)

Pregledano 22 proizvoda. Nalazi koji su oblikovali sajt:

- **Cijena i način prodaje idu zajedno.** Svi koji prodaju samoposlužno objavljuju
  cijenu (Certiwage 0/29/59 $, Knowify "od 99 $", Contractor Foreman "od 49 $").
  Svi koji prodaju kroz demo je kriju (LCPtracker, eMars, Points North, eBacon,
  Payroll4Construction, Miter, Hammr, Siteline, Procore). **Skrivena cijena uz
  79 $ je najgora moguća pozicija**: cijena malog proizvoda, ponašanje velikog.
- **Sajtovi starih igrača nisu loši, njihove aplikacije jesu.** Na javnom forumu
  LCPtrackera plaćeni korisnici pišu: pregled izvještaja u "tiny preview
  window... impossible to read", nema filtriranja projekata kucanjem, nema
  uploada više sedmica odjednom, a najtraženija stavka je automatsko numerisanje
  izvještaja. **To je naš spisak razlika, ne "izgledamo ljepše".**
- **Certiwage je jedini koji pokazuje stvarni izlazni dokument** na stranici, uz
  preuzimanje uzorka bez emaila. To radi, i mi to radimo bolje jer imamo dva
  dokumenta.
- **Telefon u zaglavlju** imaju stari igrači (eBacon, Payroll4Construction,
  eMars), a moderni SaaS ga skriva. Za 55-godišnjeg vlasnika firme telefon je
  signal "postoje stvarno". Košta nas ništa.
- **Strukovna udruženja rade bolje od logotipa velikih firmi.** eBacon koristi
  CICPAC, WECA, ABC, CFMA i BBB. Logotipi Ramp i Shopify tipa ne znače ništa
  elektro podizvođaču iz Buffala.
- **Brojevi u izjavama, ne pridjevi.** "Vratili smo 16 do 20 sati" radi, "odlična
  podrška" ne radi.

## 3. Pozicioniranje protiv Certiwagea (jedina prava prijetnja)

Certiwage: 0 / 29 / 59 $, besplatan nivo, pokazuje uzorak WH-347, moderan sajt.
Jeftiniji je od nas i radi isti posao na federalnom nivou.

**Naša odbrana nije cijena nego jurisdikcija.** Njihovi paketi reklamiraju
"Federal and California overtime rules" i "California DIR eCPR XML export".
Njujork nije njihov proizvod. Naš jeste, i to znači konkretno:

- NYSDOL XML po njihovoj šemi, s pravilom "jedan projekat, jedna sedmica, u
  praznu sedmicu".
- Klasifikacije iz zvanične NY liste, doslovno, s onim ispravnim razdvajačem.
- Prekovremeni po OT kodovima iz PRC tabele, ne po jednom pravilu.
- NY dodatak (supplement) odvojen od federalnog fringea.
- Brojač 30-dnevnog roka, koji je NY specifičnost.
- Prevođenje poruka o grešci iz njihovog portala.

Zato su naslov, URL struktura i FAQ **neumoljivo njujorški**. Uz to 79 $ čita se
kao cijena specijaliste, ne kao skuplja verzija istog.

Ako Certiwage doda NY, ovo se mijenja. To je rizik i piše u spec/13 C7.

## 4. Struktura stranice, sekcija po sekcija

| # | Sekcija | Svrha | Šta mora biti unutra |
|---|---|---|---|
| 1 | Ljepljivo zaglavlje | orijentacija i cijena na dohvat | logo, How it works, What you get, Pricing, Questions, Who we are, **telefon ako postoji stvaran, inače `support@weeklycert.com`**, Log in, Start free |
| 2 | Hero | odgovoriti na "je li ovo za mene" | naslov po formuli dolje, podnaslov s NY + 3 do 30 radnika + 79 $, dva CTA-a, desno **snimak stvarne mreže sati čim mreža postoji**; dok ne postoji, statična ilustracija mreže, nikad snimak izmišljenog proizvoda (03 §4.1) |
| 3 | Traka brojeva | odmah, prije nego što se skrola | 4 tvrda broja |
| 4 | Izlazni dokumenti | najveća rupa u kategoriji | WH-347 i XML jedan pored drugog, čitljivi, preuzimanje uzorka **bez emaila** |
| 5 | Ulog | kredibilitet, ne strah | pravilo, rok, grejs, kazna, izvor. Jedna tabela činjenica |
| 6 | Kako radi | 3 koraka | svaki korak jedna rečenica plus snimak ekrana, pod istim uslovom kao red 2 |
| 7 | Interaktivni demo | konverzija | bez forme, desktop, završava na generisanom PDF-u |
| 8 | Stari i novi način | prepoznavanje | tabela od 7 redova, lijevo tabela u Excelu, desno mi |
| 9 | Cijena | uklanjanje prepreke | poređenje s 175 do 400 $ + 995 do 4.995 $ setup, pa naša kartica, pa nivoi postavke |
| 10 | Sigurnost podataka | prigovor koji dolazi od GC-a | šta čuvamo i šta odbijamo čuvati, običnim riječima |
| 11 | Izjave i značke | društveni dokaz | **prazno dok ne bude stvarnih.** Nikad izmišljeno |
| 12 | FAQ | prigovori | 8 pitanja iz liste dolje |
| 13 | Ko smo mi | povjerenje | ime, lice, radno vrijeme, i iskreno gdje sjedim. Telefon i adresa **samo ako su stvarni**; izmišljena adresa na sajtu koji prodaje uslugu usklađenosti je pravni problem |
| 14 | Zadnji CTA | | isti tekst kao u herou |
| 15 | Podnožje | SEO i pravno | NY vodiči, uslovi, privatnost, kontakt email; adresa i telefon samo ako su stvarni |

### Formula naslova

**[tačan artefakt] + [u vremenu u koje ne vjeruju] + [ono čega se boje]**

Trenutni: *"Your weekly New York certified payroll, XML and WH-347, done in ten
minutes."*

Podnaslov imenuje publiku, jurisdikciju i cijenu.

**Ne voditi kaznom.** Nijedan uspješan proizvod u kategoriji ne vodi strahom, a
kupac ionako zna za kaznu, zato je i na stranici. Strah u naslovu čita se kao
prevara; preciznost se čita kao kompetencija. Kazna ide u sekciju 5 kao ulog.

### Disciplina CTA-a

Tačno **jedna** primarna radnja, "Start free", ponovljena u zaglavlju i u
sekcijama 2, 9 i 14. Jedna sekundarna, "See a real WH-347". **Bez "Book a demo"
kao ravnopravnog dugmeta**: to je poteza velikih i protivrječi objavljenoj
cijeni od 79 $. Ljudska opcija stoji u zaglavlju i čita se kao usluga, a ne kao
prodajna kapija: telefon ako postoji stvaran broj koji neko javlja, inače
`support@weeklycert.com` s obećanim vremenom odgovora iz 17. Bitno je da postoji
način da se dobije čovjek, ne da je to baš telefon.

### Demo: interaktivni, ne video

Istraživanje interaktivnih demoa (28.000 demoa): 71 % najuspješnijih nema formu
prije demoa, ungated demo ima 10 % veći angažman, 88 % sesija je na desktopu, a
desktop demo ima 52 % veći CTR. Naš kupac je na desktopu u kancelariji, dakle
tačno u segmentu gdje ovo radi najbolje. Video od 60 do 90 sekundi, bez zvuka, s
titlovima, ide kao sekundarna opcija.

## 5. Osam pitanja u FAQ-u (obavezna)

1. Predajete li vi umjesto mene, ili i dalje ja uploadujem?
2. Moram li mijenjati platni sistem?
3. Šta sa sedmicama kad se nije radilo?
4. Moj posao je u Njujork Sitiju, radi li to? (**odgovor je ne, i to se kaže
   prije naplate**)
5. Koliko traje postavljanje?
6. Ko ste vi?
7. Šta biva s mojim zapisima ako otkažem?
8. Šta ako je račun pogrešan?

Odgovori su u `dizajn/sajt.html` i pisani su da budu istiniti i onda kad je
odgovor nepovoljan. Pitanje 4 svjesno odbija dio tržišta prije uplate, jer je
otkriće na peti dan postavke skuplje od izgubljenog kupca.

## 6. Šta se ne stavlja na sajt

- **Izmišljene izjave kupaca ili logotipi firmi koje nisu kupci.** Prazno mjesto
  s objašnjenjem je bolje i pošteno.
- Fotografije gradilišta sa stok servisa. Umjesto njih snimci proizvoda.
- "Bank-level encryption", "military-grade", "AI-powered". Piše se šta radimo.
- SOC 2 značka koju nemamo.
- Odbrojavanje, lažna oskudica, "samo još 3 mjesta".
- Chat widget. Solo osnivač ne može držati živi chat; telefon i email mogu.

## 7. SEO i sadržaj (poslije lansiranja, ne prije)

Pet stranica vodiča koje ciljaju stvarne upite njujorških izvođača, svaka
odgovara na jedno pitanje bolje od bilo koga:

1. Pravilo predaje svakih 30 dana i kako se računa
2. Kako se čitaju OT kodovi na PRC tabeli (s punom legendom)
3. Anualizacija beneficija, s izračunatim primjerom
4. Omjeri pripravnika u NY
5. Sedmice bez rada i numeracija izvještaja

Ovo su i prodajni materijali i odgovori koje ionako moramo napisati za podršku.
Pišu se tek kad postoji prvih deset kupaca i kad znamo koja pitanja stvarno
dolaze, ne unaprijed.

## 8. Tehnički

- Ista dizajn tokena kao aplikacija (spec/14), ista tipografija.
- Zasebna aplikacija `apps/site`, Next.js `output: 'export'`, bez baze, na
  Cloudflare Pages. Razlog za odvajanje od `apps/web` je u 19 §2.
- Bez kolačića za praćenje na početku. Plausible ili ništa.
- Cilj brzine: LCP ispod 1,5 s na 3G, jer kupci sjede na sporim vezama.
- Sav tekst u `packages/copy`, ne raštrkan po komponentama, da se mijenja bez
  diranja rasporeda. Isti paket koristi i aplikacija.
