# Korak 0: šta skinuti, odakle i gdje snimiti

Sve linkove sam provjerio uživo 15.9.2026. i vode gdje treba. `dol.ny.gov` i
`dol.gov` su blokirani iz mog okruženja, pa ovo mora ići preko tvog preglednika.

Folder je već napravljen: `weeklycert/izvori/`, s podfolderima `ny/` i
`federalno/`. Imena fajlova koja pišem su obavezna, jer se po njima traže u
kodu i u specifikaciji.

Ide u `izvori/`, a ne odmah u repozitorij, jer repozitorij još ne postoji. Kad
izrada krene, korak 1 kopira ove fajlove u `packages/core/src/ny/schema/` i
`packages/core/src/federal/`.

**Ovo zatvara osam otvorenih pitanja iz `spec/13` i otključava korak 5, izlaze
(XML i WH-347).** Dok ovo ne bude gotovo, taj dio se ne piše. Ostatak izrade,
uključujući motor i sve ekrane, ide paralelno i ne čeka.

---

## 1. XSD shema (najvažnije)

```
https://dol.ny.gov/certpayrollxsd
```

Snimi kao: `izvori/ny/NYDOL_CertPayroll.xsd`

Uz njega i **primjer XML-a**:

```
https://dol.ny.gov/certpayrollsamplexml
```

Snimi kao: `izvori/ny/primjer-payroll.xml`

Shema kaže šta je dozvoljeno, primjer pokazuje kako to izgleda kad je tačno.
Bez primjera se svaka nedoumica u shemi rješava nagađanjem.

Ovo je jedini zvanični opis toga kako XML mora izgledati. Zatvara **A1**
(redoslijed elemenata, tipovi, decimale, šta je obavezno), **A3** (tačan naziv
petog tipa dodatka i lista dozvoljenih vrsta odbitaka) i **A4** (da li pol i
etnička pripadnost uopšte postoje u shemi, jer ako ne postoje, te kolone izlaze
iz modela podataka).

Trenutna specifikacija je rekonstruisana iz uputstva, ne iz sheme. Razlika
između to dvoje je razlika između XML-a koji portal primi i onog koji odbije.

---

## 2. Platna tabela za okrug, generička (drugo najvažnije)

```
https://apps.labor.ny.gov/wpp/publicViewPWChanges.do?method=showIt
```

Na toj stranici, u dijelu **Generic Prevailing Wage Schedule By County**, izaberi
okrug iz padajuće liste i klikni **View**. Otvori se PDF, snimi ga.

Skini **tri okruga**, ne jedan, jer se legende i klasifikacije razlikuju po
regiji:

| Okrug | Zašto baš taj | Ime fajla |
|---|---|---|
| Dutchess | Hudson Valley, srednja veličina | `izvori/ny/platna-dutchess-2026.pdf` |
| Nassau | Long Island, najviše firmi s naše prioritetne liste | `izvori/ny/platna-nassau-2026.pdf` |
| Erie | zapad države, Buffalo | `izvori/ny/platna-erie-2026.pdf` |

Ovi fajlovi su veliki, po nekoliko stotina stranica, i to je u redu.

U svakom od njih postoje dvije stranice koje su nam kritične:

- **OVERTIME PAGE**, legenda kodova AA do X. Imam je prepisanu u `spec/01 §2.1`,
  ali je kod **X** neprovjeren (**A13**) i treba ga uporediti riječ po riječ.
- **HOLIDAY PAGE**, numerisani kodovi od 1 do otprilike 29. **Ovo je A10 i to je
  jedina rupa u motoru.** Bez te legende proizvod ne može tačno izračunati
  praznične premije, a kodovi G, H, J, K, N, O, Q, R, S, S1, T i U svi zavise od
  nje. Trenutno je zaobiđeno tako što korisnik ručno kaže da je dan praznik, što
  je zakrpa, ne rješenje.

Usput se prebroje klasifikacije, što zatvara **A11** (dva automatska čitanja dala
su 227 i 463, a to ne može oboje biti tačno).

---

## 3. Uputstvo za grupni upload

```
https://dol.ny.gov/bizserve/ep/guide/buf
```

Ovo je web stranica, ne PDF. Otvori je, pa Ctrl+P i **Save as PDF**.

Snimi kao: `izvori/ny/bulk-upload-guide.pdf`

---

## 4. Uputstvo za izvođača

```
https://dol.ny.gov/bizserve/ep/guide/contractor
```

Isto, Ctrl+P u PDF.

Snimi kao: `izvori/ny/contractor-guide.pdf`

Ovo je korak po korak kako izvođač predaje. Iz njega ide ekran s uputstvom u
našoj aplikaciji, jer portal traži da sedmica bude prazna prije uvoza i to je
mjesto gdje ljudi najviše griješe.

---

## 5. Prezentacija za prvu predaju

```
https://dol.ny.gov/certified-payroll-first-submission-tutorial-ppt
```

Snimi kao: `izvori/ny/prva-predaja.pptx`

Prezentacije NYSDOL-a imaju slike ekrana portala, a to je najbrži način da se
vidi kako portal stvarno izgleda bez naloga.

---

## 6. Često postavljana pitanja o elektronskoj predaji

```
https://dol.ny.gov/electronic-payroll-faq
```

Ctrl+P u PDF, snimi kao: `izvori/ny/electronic-payroll-faq.pdf`

Ovdje je najveća šansa da se nađe odgovor na **A12** (maksimalna veličina XML
fajla) i **A7** (da li se za istu sedmicu smije poslati više fajlova).

---

## 7. Zvanična lista klasifikacija

```
https://dol.ny.gov/electronic-payroll-xml-work-classification-list
```

Ctrl+S, snimi kao **web stranicu, samo HTML**, u: `izvori/ny/klasifikacije.html`

Ovo nije isto što i klasifikacije u platnim tabelama iz tačke 2. Platna tabela
kaže koje klasifikacije važe u jednom okrugu i po kojoj cijeni. Ova lista je
rječnik koji **portal prihvata**, i po njoj se provjerava nalaz
`CLASSIFICATION_NOT_OFFICIAL` iz `spec/07`. Ako naziv nije doslovno s ove liste,
portal odbija fajl.

Razdvajač u nazivima je ` – ` (en crta U+2013 s razmacima) i mora ostati tačno
takav. Ovo je jedino mjesto u cijelom proizvodu gdje se ta crta koristi namjerno.

Prebrojati stavke pri snimanju: dva automatska čitanja dala su 227 i 463, a to ne
može oboje biti tačno (**A11**).

---

## 8. WH-347, federalni obrazac

```
https://www.dol.gov/sites/dolgov/files/WHD/legacy/files/wh347.pdf
```

Snimi kao: `izvori/federalno/wh347.pdf`

Zatvara **A8b**: imena AcroForm polja u PDF-u. Bez tačnih imena polja ne može se
popuniti obrazac programski. Kad fajl bude tu, izvučem imena polja i upišem ih u
`spec/05`.

Skini i uputstvo uz obrazac:

```
https://www.dol.gov/agencies/whd/forms/wh347
```

Ctrl+P u PDF, snimi kao: `izvori/federalno/wh347-uputstvo.pdf`

---

## 9. Portal uživo

```
https://mpwr-public.labor.ny.gov/en/login
```

Ovo je novi NYSDOL portal. Otvori ga i napravi nekoliko snimaka ekrana onoga što
se vidi bez prijave, pa ih snimi u `izvori/ny/portal/`.

Ako ikad dobiješ pristup nalogu kroz prvog kupca, tad se zatvara **A6** (tačan
format PRC broja i gdje se unosi registracioni broj) i vidi se kako izgleda
poruka o grešci pri uvozu. Ta poruka je važna: po `spec/03 §4.5` naša aplikacija
ima polje "Zalijepi grešku iz portala" koje je prevodi u ljudski jezik, a za to
mi treba bar jedan stvaran primjer.

**Ne pravi nalog u moje ime i ne unosi ništa u portal.** Ovo je samo gledanje.

---

## Kad završiš

Javi mi, ja onda:

1. Pročitam XSD i prepišem `spec/05` s tačnim elementima umjesto rekonstruisanih.
2. Prepišem legendu praznika u `spec/01 §2.1` i uklonim zakrpu
   `HOLIDAY_RULE_UNKNOWN`.
3. Provjerim kod X i ispravim ga ako treba.
4. Izvučem imena polja iz WH-347 i upišem ih u `spec/05 §4.6`.
5. Prebrojim klasifikacije iz zvanične liste i zatvorim A11.
6. Zatvorim redom A1, A3, A4, A6, A8b, A10, A11 i A13 u `spec/13`.

**Tek poslije toga smiju se pisati izlazi**, to jest XML builder i WH-347 iz
koraka 5.

Motor iz koraka 2 (sati, prekovremeni po OT kodovima, beneficije, pripravnici)
**nije blokiran** i piše se odmah, jer njemu trebaju samo `spec/01` i `spec/07`.
Jedino što u motoru čeka na ove fajlove su praznični multiplikatori
(`HOLIDAY_RULE_UNKNOWN`). Frontend i sajt ne čekaju ništa odavde.
