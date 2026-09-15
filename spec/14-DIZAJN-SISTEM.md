# 14. Dizajn sistem

Ovo je izvor istine za svaki piksel. Vrijednosti su provjerene na kontrast, ne
izabrane po osjećaju. Claude Code ih kopira u `packages/ui-tokens` i u Tailwind
`@theme`, i ne izmišlja nove.

Vizuali koji iz ovoga izlaze su u `dizajn/aplikacija.html` i `dizajn/sajt.html`.

---

## 1. Ko gleda ovaj ekran

Kancelarijska osoba ili vlasnik firme s 3 do 30 radnika. 35 do 60 godina.
Windows desktop, često 1366×768 ili 1920×1080, Chrome ili Edge. Petak popodne,
rok blizu, navikla na Excel. Nije "korisnik softvera", nego čovjek koji mora
predati papir.

Iz toga slijede četiri pravila koja nadjačavaju svaki estetski argument:
1. **Gustoća prije praznine.** Sedmica s 12 radnika mora stati na ekran bez
   skrolanja. Nema hero praznina unutar aplikacije.
2. **Nikad manje od 12 px** za bilo šta što se čita, i nikad `font-weight: 300`.
3. **Boja nikad sama ne nosi značenje.** Uvijek ikona i riječ uz nju.
4. **Tastatura je primarni ulaz** u mreži sati. Miš je za sve ostalo.

## 2. Pozicioniranje boje (zašto tirkiz)

Pregledano 22 proizvoda u kategoriji (LCPtracker, eMars, Points North, eBacon,
Payroll4Construction, Certiwage, Miter, Hammr, Knowify, Contractor Foreman,
Buildertrend, Procore, Siteline, Adaptive, Gusto, Rippling, Ramp, Vanta,
Middesk, Mercury, Avalara). Oko 14 od 22 su plavi ili tamnoplavi. Procore drži
narandžastu `#FF5200`, Ramp smaragdnu, Middesk neon zelenu, Gusto crveno-rozu.

Tirkiz se pojavljuje kod četiri proizvoda, ali **uvijek samo kao akcenat, nikad
kao primarna boja.** To je jedino slobodno mjesto koje je i kredibilno.

Dodatno ograničenje koje većina paleta promaši: u proizvodu punom validacije,
crvena, jantar, zelena i plava su **zauzete semantikom**. Ostaje tirkiz,
magenta ili rđa. Magenta je potrošačka, rđa se u niskoj zasićenosti sudara s
jantarom. Tirkiz ostaje.

Rizik i njegovo rješenje: tirkiz (nijansa oko 181°) je blizu zelene uspjeha
(oko 152°). Zato tri pravila:
- Tirkiz **nikad** ne znači "ispravno" ili "prošlo".
- Uspjeh je uvijek ikona i tekst, nikad samo boja.
- Brend tirkiz živi na 600 do 800 (tamno), uspjeh na 600 (srednje). Razlikuju se
  i po svjetlini, ne samo po nijansi.

## 3. Tokeni

```css
:root{
  /* Brend, tirkiz */
  --teal-50:#EAF6F5;  --teal-100:#CFEAE8; --teal-200:#A3D6D3; --teal-300:#6BBBB7;
  --teal-400:#2F9D9B; --teal-500:#0F8385; --teal-600:#0C6A6B; --teal-700:#0A5556;
  --teal-800:#0A4445; --teal-900:#093839;
  --brand:var(--teal-600);
  --brand-hover:var(--teal-700);
  --brand-ring:var(--teal-500);

  /* Neutralno, hladan čelik */
  --n-50:#F7F9FA;  --n-100:#EEF1F4; --n-200:#DFE4E9; --n-300:#C7CFD7;
  --n-400:#98A4B0; --n-450:#7A8894; --n-500:#6B7885; --n-600:#4E5A66;
  --n-700:#39434D; --n-800:#252C33; --n-900:#12171B;

  /* Semantika */
  --error-50:#FEF3F2;   --error-100:#FEE4E2; --error-500:#D92D20; --error-600:#B42318; --error-700:#912018;
  --warning-50:#FFFAEB; --warning-100:#FEF0C7; --warning-500:#DC6803; --warning-600:#B54708; --warning-700:#93370D;
  --success-50:#ECFDF3; --success-100:#D1FADF; --success-500:#079455; --success-600:#067647; --success-700:#05603A;
  --info-50:#EFF6FF;    --info-100:#DBEAFE;  --info-500:#1570EF;  --info-600:#175CD3;  --info-700:#1849A9;
  --violet-50:#F4F1FD;  --violet-100:#E6E0FA; --violet-500:#7C5CD6; --violet-600:#6035C4; --violet-700:#4E2AA3;

  /* Uloge, u kodu se koriste OVE, ne sirovi koraci */
  --text-primary:var(--n-900);
  --text-secondary:var(--n-600);
  --text-disabled:var(--n-400);
  --border-interactive:var(--n-450);
  --border-decorative:var(--n-200);
  --surface:#FFFFFF;
  --surface-sunken:var(--n-50);
  --surface-header:var(--n-100);
  --focus-ring:0 0 0 2px #FFFFFF, 0 0 0 4px var(--brand-ring);
}
```

### Dvije stvari koje se ne smiju "popraviti"

**`--n-450` postoji jer `--n-400` pada test.** `#98A4B0` na bijelom daje 2,54:1, a
WCAG 1.4.11 traži 3:1 za granice koje govore "ovo je polje za unos". Svaka takva
granica koristi `--n-450` (3,64:1). `--n-200` i `--n-300` su samo dekorativne
linije mreže.

**Sekundarni tekst je `--n-600`, ne `--n-500`.** `#6B7885` daje 4,52:1 na bijelom,
što prolazi, ali samo na bijelom: na sivom redu pada na 4,28:1, na crvenkasto
tonranom redu na 4,15:1. Oba padaju. `--n-600` drži 6,22 do 7,05:1 na svakoj
podlozi u sistemu. U mreži gdje redovi stalno mijenjaju ton, ovo je razlika
između pristupačnog i nepristupačnog proizvoda.

Isto važi za semantiku: koraci 500 su za **ikone i granice**, koraci 600 za
**tekst**. Uobičajena jantar `#F79009` daje 2,35:1 i pada čak i na 3:1, pa je
zamijenjena s `#DC6803` (3,49:1).

### Zašto postoji ljubičasta

Postoji zbog tačno jedne stvari: značke **Corrected** (03 §1, status perioda
`corrected` u 04). Bez nje bi ispravljen izvještaj morao biti siv, a siva je već
zauzeta za **Draft**. To su dva suprotna stanja: jedno nije ni počelo, drugo je
predato pa ispravljeno. Ne smiju izgledati isto.

Vrijednosti **nisu** prepisane iz prototipa. `dizajn/aplikacija.html` je koristio
`#4527A0` na `#F1ECFB`, što daje 8,84:1, dakle znatno tamnije od svake druge
značke u sistemu (5,0 do 6,8) i teže na ekranu. Ramp iznad prati istu disciplinu
kao ostale semantičke boje: korak 500 za ikonu i granicu, korak 600 za tekst.
Prototip je usklađen na ove vrijednosti.

Zabrana iz §11 se odnosi na **ljubičasto-indigo gradijente**, ne na samu nijansu.
Ljubičasta se koristi isključivo za ovu značku, nikad kao brend boja, nikad kao
pozadina i nikad u gradijentu.

### Provjereni odnosi kontrasta

Brend na bijelom: teal-500 **4,56** · teal-600 **6,38** · teal-700 **8,58**.
Bijelo na teal-600 **6,38** (primarno dugme), na teal-700 **8,58** (hover).

| Tekst | bijelo | n-50 | n-100 | error-50 | warning-50 |
|---|---|---|---|---|---|
| n-900 primarni | 18,04 | 17,08 | | | |
| **n-600 sekundarni** | **7,05** | **6,68** | **6,22** | **6,49** | **6,76** |
| n-500 (ne koristiti) | 4,52 | 4,28 ✗ | 3,98 ✗ | 4,15 ✗ | 4,37 ✗ |

Semantički tekst (koraci 600), sve prolazi 4,5:1 na bijelom i na oba svoja tona:
error-600 6,57 / 6,05 / 5,45 · warning-600 5,43 / 5,20 / 4,78 · success-600
5,69 / 5,40 / 5,00 · info-600 5,99 / 5,50 / 4,91.

Ikone i granice (treba 3:1, na bijelom / na svom 50): error-500 4,83 / 4,44 ·
warning-500 3,49 / 3,34 · success-500 3,91 / 3,70 · info-500 4,57 / 4,20 ·
violet-500 4,82 / 4,45.

Ljubičasta, tekst: violet-600 na bijelom **7,49**, na violet-50 **6,72**, na
n-50 **7,10**. Prolazi svuda gdje i ostale.

Granice: `--n-450` na bijelom **3,64**, na n-50 **3,44**, na n-100 **3,21**.

Fokus prsten `0 0 0 2px #FFF, 0 0 0 4px #0F8385`: prema bijelom 4,56, prema n-50
4,32, prema n-100 4,02, prema error-50 4,19, a bijeli unutrašnji prsten prema
tirkiznom dugmetu 6,38. Bijeli unutrašnji prsten nije ukras: bez njega tirkizni
prsten na tirkiznom dugmetu daje 1,40:1 i nestaje.

Tamna bočna traka: `--n-900` s bijelim natpisima 18,04, neaktivni `--n-300`
11,45, aktivni indikator `--teal-300` **8,09**. Ako se koristi tirkizna traka
`--teal-800`, aktivni indikator **mora** biti `--teal-300` (4,89); `--teal-500`
na `--teal-800` daje 2,39 i pada.

## 4. Tipografija

```css
--font-sans:'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono:'IBM Plex Mono', ui-monospace, 'SFMono-Regular', 'Cascadia Mono',
            Consolas, 'Liberation Mono', monospace;
```

IBM Plex Sans, ne Inter. Inter je podrazumijevani font svakog proizvoda iz
poglavlja 2 i čita se kao generički SaaS. Plex je crtan za tehnički kontekst,
što odgovara proizvodu koji tvrdi da tačno računa beneficije. Plex Mono daje
poravnate cifre u pregledu WH-347.

`Segoe UI` u rezervnoj listi nije slučajan: kupci su na Windowsu.

Učitavaju se samo debljine 400, 500 i 600. Nikad 300.

| Token | rem | px | Prored | Gdje |
|---|---|---|---|---|
| `--fs-2xs` | 0,6875 | 11 | 14 | podnatpisi kolona, pravni tekst |
| `--fs-xs` | 0,75 | 12 | 16 | OT podvrijednost u ćeliji, značke |
| `--fs-sm` | 0,8125 | 13 | 18 | zaglavlja mreže, meta |
| `--fs-base` | 0,9375 | 15 | 22 | **vrijednosti u mreži, polja forme** |
| `--fs-md` | 1 | 16 | 24 | tekst, marketing |
| `--fs-lg` | 1,125 | 18 | 26 | uvodi sekcija |
| `--fs-xl` | 1,375 | 22 | 30 | naslovi kartica |
| `--fs-2xl` | 1,75 | 28 | 34 | naslovi stranica |
| `--fs-3xl` | 2,25 | 36 | 42 | naslovi sekcija na sajtu |
| `--fs-4xl` | 3 | 48 | 52 | hero |

`font-variant-numeric: tabular-nums` globalno na `.grid`, na svakom polju za
unos brojeva i na svakoj cifri novca ili sati.

## 5. Razmaci, uglovi, sjene

```css
--sp-1:4px;  --sp-2:8px;  --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px;
--sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-16:64px; --sp-20:80px; --sp-24:96px;
--radius-sm:3px; --radius-md:6px; --radius-lg:10px;
--shadow-sm:0 1px 2px rgba(18,23,27,.06);
--shadow-md:0 2px 8px rgba(18,23,27,.08);
--shadow-panel:0 8px 24px rgba(18,23,27,.12);
```

Uglovi su namjerno tijesni. Veliki radijusi čitaju se kao potrošački proizvod;
3 do 6 px čita se kao instrument.

## 6. Okvir aplikacije

Bočna traka lijevo, **240 px**, ne gornja navigacija. Svi proizvodi iz poglavlja 2
imaju gornju navigaciju na **marketing sajtu**, što je marketinška konvencija, ne
aplikacijska. Naša aplikacija ima mali skup stalnih odredišta kojima se korisnik
vraća svake sedmice, a mreži od sedam dana treba puna širina.

```
┌──────────┬──────────────────────────────────────────┐
│ bočna    │ zaglavlje stranice (naslov, akcije)      │
│ traka    ├──────────────────────────────────────────┤
│ 240px    │ sadržaj                                  │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

Bočna traka: birač firme na vrhu (za knjigovođe s više firmi), pa navigacija po
grupama, pa dolje ime korisnika i pomoć. Pomoć je uvijek na istom mjestu (WCAG
3.2.6). **Nema zasebne gornje trake preko cijele širine**: naslov stranice,
putanja, akcije, pretraga Cmd+K i zvono obavještenja stoje u traci stranice unutar desne kolone.

Ispod 1024 px traka se sklapa u panel. Mreža sati ispod 900 px prelazi u prikaz
po radniku umjesto tabele.

### Uže od 1024 px, jedan obrazac

Bočna traka postaje panel koji klizi s lijeve strane, a otvara ga dugme `Menu` u
traci stranice. **Ne pravi se donja traka.** Razlog je broj odredišta: navigacija
ima deset stavki plus grupu Company plus pomoć, a donja traka nosi četiri do pet.
Peta stavka bi morala biti "More", koja opet otvara panel, pa bi se gradila i
testirala dva obrasca umjesto jednog.

Dohvat palcem jeste slabija strana ovog izbora, jer dugme stoji gore. Prihvatljivo
je zato što je telefon u ovom proizvodu samo za pregled, potpis i skidanje PDF-a
(03 §1), pa se meni otvara rijetko.

Obavezno ponašanje panela:

- Dugme je pravo `<button>` s natpisom `Menu`, `aria-expanded` i `aria-controls`.
- Panel je modalni dijalog: fokus se zarobi unutra, `Escape` ga zatvara, klik na
  zastor ga zatvara, a fokus se vraća na dugme koje ga je otvorilo.
- Dok je otvoren, stranica ispod ne skroluje.
- Zatvara ga dugme `Close` u vrhu panela.
- Birač firme i korisnik ostaju u panelu na istim mjestima kao u širokoj traci,
  jer pomoć mora biti na istom mjestu na svakom ekranu (WCAG 3.2.6).

## 7. Mreža sati, tačne mjere

Ovo je najvažniji ekran u proizvodu i jedini gdje mjere nisu preporuka nego
specifikacija.

```
Zaglavlje mreže:   40px, position: sticky; top: 0; z-index: 3
Red zbira:         44px, position: sticky; bottom: 0; z-index: 3
Red podataka:      48px  (ćelija s dvije vrijednosti: ST unos + OT ispod)
                   40px  (jednostavne liste samo za čitanje)
Kolona radnika:    220px, position: sticky; left: 0; z-index: 2
                   (ćelija u uglu treba z-index: 4)
Kolone dana:       64px × 7
Kolone zbira:      80px
Padding ćelije:    0 8px  (ne 16px, sedam kolona nema mjesta)
Linija reda:       1px solid var(--border-decorative)
Zebra pruge:       NE. Komplikuju hover i onemogućena stanja.
Brojevi:           desno poravnati, tabular-nums
Tekst:             lijevo; zaglavlje se poravnava kao svoja kolona
```

### Ćelija s dvije vrijednosti

U ćeliju se kuca **ukupno sati za taj dan** (npr. 9). Motor iz toga izračuna
prekovremene i prikaže ih kao drugu vrijednost. **Ne slagati dva polja za unos**,
jer to udvostručuje broj tab stanica. Ručno razdvajanje se unosi kao `8/1`.

```html
<td class="cell">
  <input class="cell__input" inputmode="decimal" aria-describedby="c-3-2-ot">
  <span class="cell__sub" id="c-3-2-ot"><abbr title="Overtime">OT</abbr> 2.0</span>
</td>
```

Prefiks `OT` nosi značenje: bez njega druga vrijednost zavisi od položaja i
sivila. Boja podvrijednosti je `--n-600`, nikad `--n-500`.

### Sudar ljepljivog zaglavlja i fokusa

Obavezno, inače pada WCAG 2.4.11:

```css
.grid-scroll{ scroll-padding-block-start:40px; scroll-padding-block-end:44px; }
```

Bez ovoga `element.focus()` pri kretanju strelicama odskrola fokusiranu ćeliju
tačno ispod ljepljivog zaglavlja.

### Tastatura

| Tipka | Radnja |
|---|---|
| strelice | kretanje po ćelijama |
| Enter | potvrdi i idi **dolje** (plata se unosi po radniku niz kolonu dana) |
| Tab | potvrdi i idi **desno** |
| Home / End | početak i kraj reda |
| Ctrl+D | popuni iz ćelije iznad |
| Ctrl+Shift+D | kopiraj prošlu sedmicu |
| kucanje u koloni radnika | pretraga radnika (ono što korisnici LCPtrackera izričito traže) |
| `8/1` u ćeliji | ručno 8 ST i 1 OT |

### Greške bez oslanjanja na boju

Četiri kanala istovremeno:
1. Lijeva ivica: `box-shadow: inset 3px 0 0 var(--error-500)`, dakle promjena
   **oblika**, ne samo boje.
2. Pozadina `--error-50`.
3. Znak od 12 px u ćeliji, `--error-500`.
4. Tekst u traci ispod reda, `--error-600`, povezan preko `aria-describedby`.

Upozorenje i greška moraju se razlikovati **oblikom**, ne samo nijansom, jer su
crvena i jantar klasičan par za daltonizam. Greška: puni trougao i puna lijeva
traka. Upozorenje: prazan krug i isprekidana lijeva traka.

Iznad mreže stoji sažetak: "3 problema blokiraju predaju", svaki kao dugme koje
fokusira ćeliju.

### ARIA

`aria-invalid="true"` na polju, `aria-describedby` na tekst greške, `role="alert"`
za greške koje se pojave same, `aria-live="polite"` za blaže. Poruke su konkretne:
"Adresa smije imati 42 znaka, ovdje ih je 51", ne "neispravan unos".

## 8. Pristupačnost, samo ono što stvarno grize

| Kriterij | Nivo | Gdje grize kod nas |
|---|---|---|
| 1.4.3 Kontrast | AA | sekundarni tekst na tonranim redovima → zato n-600 |
| 1.4.11 Kontrast ne-teksta | AA | granice polja i ćelija → zato n-450 |
| 1.4.1 Upotreba boje | A | greške traže ikonu i tekst |
| 2.5.8 Veličina cilja | AA | 24×24 px minimum; naša ikonska dugmad su 32×32 |
| 2.4.11 Fokus nije zaklonjen | AA | ljepljivo zaglavlje → `scroll-padding-block` |
| 2.5.7 Pokreti prevlačenjem | AA | ako dodamo povlačenje za popunjavanje, mora postojati i dugme |
| 3.3.1 Identifikacija greške | A | greška mora biti **tekstom** |
| 3.3.7 Ponovljeni unos | A | nikad ne tjerati na ponovno kucanje prošlosedmične ekipe → "Kopiraj prošlu sedmicu" |
| 3.2.6 Dosljedna pomoć | A | pomoć na istom mjestu na svakom ekranu |

Napomena: 2.4.13 Izgled fokusa je AAA, ne AA. Naš prsten ga ispunjava, ali to
nije obaveza.

## 9. Komponente

Svaka ima definisana stanja: podrazumijevano, hover, fokus, aktivno, onemogućeno,
učitavanje, greška. shadcn/ui daje osnovu; ovo su naše izmjene.

| Komponenta | Mjere i pravila |
|---|---|
| Dugme primarno | visina 36, padding 0 14, radius 6, `--brand`, tekst bijeli 600, hover `--brand-hover` |
| Dugme sekundarno | bijelo, granica `--n-450`, tekst `--n-800` |
| Dugme opasno | `--error-600`, koristi se samo za brisanje |
| Dugme malo | visina 30, `--fs-sm` |
| Polje za unos | visina 36, granica `--n-450`, radius 6, `--fs-base`, fokus prsten |
| Polje s greškom | granica `--error-500`, poruka ispod u `--error-600` |
| Izbornik | isti kao polje, chevron desno |
| Značka statusa | visina 22, radius 999, `--fs-2xs` 600, uvijek ikona i riječ |
| Kartica | bijela, granica `--border-decorative`, radius 10, padding 16 do 20 |
| Tabela | red 44, zaglavlje 40 `--surface-header`, bez zebre |
| Traka upozorenja | lijeva traka 3 px u boji, pozadina tona 50, ikona, naslov 13/600, tekst 12 |
| Modal | širina 480 do 720, radius 10, `--shadow-panel`, fokus zarobljen |
| Kartica za prijavu | širina 420, centrirana, radius 10, padding 32, `--shadow-md` |
| Prazno stanje | ikona 32, naslov 16/600, jedna rečenica objašnjenja, jedno dugme |
| Učitavanje | skelet u `--n-100`, nikad vrteška duže od 400 ms bez teksta |
| Toast | dolje desno, 4 s, greške ostaju dok se ne zatvore |

## 10. Ikone

`lucide-react`, veličina 16 u aplikaciji, 20 u navigaciji, 32 u praznim stanjima,
debljina 1,75. Ikona nikad ne stoji sama kao jedina oznaka radnje osim u redu
tabele gdje ima `aria-label` i tooltip.

Statusne ikone su fiksne i ne mijenjaju se:
otvoreno = olovka, u pregledu = trougao, generisano = kvačica u krugu,
potpisano = pero, predato = katanac, odbijeno = X u krugu, ispravljeno = strelice
u krugu.

## 11. Šta je zabranjeno

- Ljubičasto-indigo **gradijenti**. To je oznaka generičkog SaaS proizvoda.
  Sama ljubičasta nije zabranjena, ali se koristi samo za značku Corrected
  (§3), nikad kao brend boja i nikad kao velika površina.
- Fotografije gradilišta s Unsplasha na marketing sajtu. Umjesto toga: stvarni
  snimci proizvoda i stvarni izlazni dokument.
- Emodži u sučelju.
- Animacije duže od 200 ms, i bilo kakva animacija koja pomjera sadržaj.
  `prefers-reduced-motion` se poštuje.
- Tamni režim u MVP-u. Nijedan kupac ga neće tražiti, a udvostručuje testiranje
  kontrasta. Tokeni su spremni da se doda kasnije.
- Više od jedne primarne radnje po ekranu.
