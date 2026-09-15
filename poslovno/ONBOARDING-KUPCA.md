# Šta kupac mora dostaviti: i kako

Napisano 12.09.2026. Provjereno, izvori na dnu.
Ovo je specifikacija po kojoj se pravi proizvod i vodi razgovor s kupcem.

---

## 1. Šta ulazi, šta izlazi

```
ULAZ                              PROIZVOD                    IZLAZ
─────────────────────────────    ────────────────────    ──────────────────
Izvoz platne liste (CSV/XLSX) →  spajanje, obračun    →  NY XML za portal
Dnevni sati po projektu i        beneficija, provjera     WH-347 PDF + potpis
klasifikaciji (CSV ili unos)  →  prije slanja         →  CSV za LCPtracker/B2Gnow
Jednokratna postavka projekta                            arhiva, tri godine
```

**Proizvod nije obrada plata.** Ne isplaćuje, ne obračunava poreze, ne dira
novac. Uzima ono što kupac već ima i pretvara u izvještaj. To je namjerno, 
obrada plata nosi licence, obaveze i odgovornost koje solo čovjek ne može nositi.

---

## 2. Šta koji sistem za plate stvarno daje

| Sistem | Šta izvozi | Projekti / poslovi | API |
|---|---|---|---|
| **Gusto** | Payroll Journal (CSV/PDF), Payroll Data Export (XLSX), Benefits Deductions, Employee Summary (ime, adresa, JMBG, datum rođenja, radno mjesto) | Praćenje projekata **samo na Plus/Premium** ili uz dodatak za evidenciju vremena; raspoređuje trošak po omjeru, ne sate po klasifikaciji | **Nema.** Gusto doslovno kaže da ne daje API pristup vlastitim korisnicima. Mora se biti partner. |
| **ADP RUN** | Payroll Summary, Payroll Details (razloženo po vrsti), Payroll Liability, Custom Reporting. Izvoz: štampa ili **Excel** | Nema izvornog certified payrolla; rješava se dodatkom s Marketplacea | Traži partnerstvo, sigurnosnu reviziju i OAuth. **Cijene nisu javne.** |
| **Paychex Flex** | Standardni izvještaji (nazivi i kolone nisu javno dokumentovani) | **Ima pravi Job Costing i Labor Distribution** s ID-om posla na svakoj stavci, najjači od sva četiri | Postoji razvojni program; uslovi iza prijave, **nisu javni** |
| **QBO Payroll Core** | Standardni izvještaji o platama | **Nema projekte.** Certified payroll je samo na Premium i Elite | Računovodstveni API, ne payroll |

**Zaključak za izradu: ne računaj na API ni od jednog. Prvi krug je uvoz fajla.**
Kolone se ne mogu unaprijed pogoditi, kod svakog prvog kupca se uzme stvarni
fajl i napravi profil mapiranja koji se snimi za sljedeći put.

---

## 3. Rupa: šta payroll NEMA, a izvještaj traži

Ovo je najvažnija tabela u dokumentu.

| Podatak koji treba | Ima li ga u izvozu plata? |
|---|---|
| **Sati po danu u sedmici** | **Ne.** Sva četiri sistema zbrajaju na nivo obračunskog perioda. WH-347 traži 8/8/9/8/8/6/0. |
| Sati po **projektu** | Samo ako je kupac na višem paketu. Na QBO Core, nikad. |
| Sati po **klasifikaciji**, i radnik koji radi dvije u istom danu | **Ne.** Postoji samo zaobilaznica: Gustovi „dodatni poslovi" ili QBO stavke tipa „Moler ST / Moler OT". Ništa ne veže to za odluku o nadnicama. |
| **Redovni i prekovremeni po danu** | **Ne.** Prekovremeni se računa sedmično. |
| **Propisana nadnica po klasifikaciji** | **Ne.** Nigdje u platnoj listi. Ti to donosiš. |
| **Beneficije po radniku po satu**, plan ili gotovina | Djelimično. Payroll ima iznose po periodu; izvještaj traži **po satu** i razdvojeno plan/gotovina, plus naziv i broj plana. |
| **Broj registracije pripravnika, program, nivo** | **Ne.** Nije payroll podatak. |
| **Zadnje četiri cifre JMBG-a; adresa** | Payroll ima **pun broj i adresu**. Ali propis izričito zabranjuje pun broj na sedmičnom izvještaju, smije samo zadnje četiri. NY XML traži i adresu. Znači: skratiti za WH-347, zadržati adresu za NY. |
| Broj ugovora, broj projekta, naručilac, glavni izvođač | **Ne.** To je podatak iz onboardinga. |
| Odbici po vrstama | **Da.** Jedino što uredno dolazi. |

**Prevedeno na jezik proizvoda:** platna lista daje novac, a **ne daje sate na
način na koji ih izvještaj traži.** Zato proizvod mora imati vlastiti unos
dnevnih sati. To nije dodatna funkcija nego pola proizvoda.

---

## 4. Onboarding: šta kupac daje jednom

**1. Firma**
- pun pravni naziv, adresa, FEIN
- broj registracije za javne radove u državi NY
- ime, funkcija, telefon i email osobe koja potpisuje izjavu o usklađenosti

**2. Po svakom projektu**
- naziv i lokacija projekta
- **broj ugovora** i **PRC broj** (NY odbija izvještaj bez njega)
- broj federalne odluke o nadnicama, ako je posao federalno finansiran
- naručilac posla
- glavni izvođač, i je li on glavni ili podizvođač
- datum početka
- od kojeg rednog broja kreće numeracija izvještaja

**3. Katalog klasifikacija**, najvažniji korak
Za svaku svoju stavku plate ili radno mjesto navesti kojoj **tačnoj
klasifikaciji iz odluke o nadnicama** odgovara. NY provjerava vrijednost prema
svojoj listi, pa mapiranje mora završiti na dozvoljenoj vrijednosti.
*„Poslovođa" nije klasifikacija. Ovaj ekran za mapiranje JESTE proizvod.*

**4. Tabela stopa po klasifikaciji**, osnovna satnica, propisana beneficija,
pravila za prekovremene.

**5. Planovi beneficija**, naziv, vrsta, broj plana, je li fondiran, koliko
iznosi po satu po radniku, i ko umjesto plana prima gotovinu.

**6. Spisak radnika**, puno ime, zadnje četiri cifre JMBG-a (ili datum
rođenja), kućna adresa, datum zaposlenja, je li majstor ili registrovan
pripravnik, a za pripravnike naziv programa, agencija koja ga vodi, i nivo
odnosno procenat.

**7. Način dostave platne liste**, koji sistem koristi i jedan uzorak fajla.
Potvrditi da je obračun **sedmični**.

**8. Potpis**, kako se potpisuje izjava o usklađenosti. Skenirana ili
fotokopirana izjava **izričito nije prihvatljiva**.

---

## 5. Sedmično: šta kupac daje svaki put

1. **Izvoz platne liste** za taj period.
2. **Dnevni sati** po radniku × projektu × klasifikaciji × redovni/prekovremeni.
   Iz evidencije vremena, ne iz platne liste.
3. **Nove radnike**, ako ih ima, pun onboarding zapis.
4. **Promjenu u beneficijama**, ako je bilo (plan ili gotovina).
5. **Izuzetke:** trenutni nivo pripravnika, sedmice bez rada (**i za njih se
   predaje izvještaj, „nije bilo rada"**), ispravke ranijih sedmica.
6. **Potpis** na izjavi o usklađenosti.

---

## 6. Problem evidencije sati

Mali izvođači dnevne sate vode na **papirnim karticama, u porukama i slikama,
ili u Excelu.** Sve više njih koristi busybusy, ClockShark, Raken ili QuickBooks
Time. busybusy sam razdvaja redovne, prekovremene i duple sate i izvozi
izvještaje po projektu, radniku i šifri troška. ClockShark ima slično.

**Uvoz iz tih alata je izvodljiv samo ako su šifre troška oblikovane kao
klasifikacije.** Najčešći kvar: jedna šifra „stolarija" korištena za dvije
različite klasifikacije, ili projekat nazvan po kupcu umjesto po PRC broju.

**Praktično rješenje za prvu verziju:** univerzalni uvoz CSV-a s pet kolona
(radnik, datum, projekat, šifra, sati, oznaka prekovremenih) plus gotov Excel
predložak. Direktne integracije dolaze kasnije, kad se zna koje alate kupci
stvarno koriste.

---

## 7. Gdje onboarding puca: i šta proizvod mora uraditi

| Kvar | Šta proizvod radi |
|---|---|
| **Pogrešan paket.** QBO Core i osnovni Gusto uopšte nemaju dimenziju projekta. | Prepoznati paket u prve dvije minute i odmah preusmjeriti na unos sati u tabeli, umjesto obećavati uvoz koji ne može raditi. |
| **Radno mjesto se koristi umjesto klasifikacije.** | Ekran za mapiranje s pretragom po zvaničnoj listi. Ne dozvoliti slobodan unos. |
| **Postoje samo sedmični zbirovi**, a treba 8/8/9/8/8/6/0. | Mreža za unos po danima koja se **predpopuni iz sedmičnog zbira** i ne dozvoli da se zbir ne poklopi. |
| **Beneficija iskazana kao mjesečna premija.** Pretvaranje 600 $ mjesečno u iznos po satu je najčešća računska greška. | Ugrađen pretvarač koji **pokazuje djelitelj**, da čovjek vidi kako je dobijeno. |
| **Sedmica s više projekata.** Bruto na projektu i bruto za sav rad se razilaze; odbici i neto su za **sav** rad. | Razdvojiti ta dva polja u unosu i objasniti razliku na licu mjesta. |
| **Zalijepljen pun JMBG.** | Skratiti odmah pri unosu. Pun broj se nikad ne prikazuje u izvještaju. |
| **Nedostaje PRC broj.** NY odbija izvještaj. | Tražiti ga u onboardingu, ne u prvoj sedmici. |

### Prvi izvještaj za trideset minuta: kako

1. Unaprijed učitane odluke o nadnicama, tako da se klasifikacije i stope
   **biraju s liste, ne kucaju**.
2. Prihvati bilo koji CSV, pa interaktivno mapiraj kolone i **snimi profil**.
3. Automatski izvedi zadnje četiri cifre i prekovremene.
4. Predpopuni dnevnu mrežu iz sedmičnog zbira.
5. Beneficija kao iznos po satu po radniku, s pretvaračem.
6. Napravi **nacrt** WH-347 PDF-a i NY XML **provjeren prema shemi**, pa tek
   onda traži potpis.

---

## 8. Podaci i obaveze: ovo se ne preskače

- **Pun JMBG se nikad ne šalje u sedmičnom izvještaju.** Propis 29 CFR
  5.5(a)(3)(ii)(B) izričito zabranjuje pun broj, adresu, telefon i email na
  sedmičnoj predaji, samo identifikacioni broj, obično zadnje četiri cifre.
- **Ali ga možda držiš u bazi**, jer NY traži adresu, a evidencija se čuva
  **tri godine** poslije završetka glavnog ugovora. Zato: odvojiti skladište
  osjetljivih podataka od dijela koji pravi izvještaje.
- **Zakon NY-a o obavijesti o proboju podataka** (GBL § 899-aa) definiše
  „privatni podatak" kao ime plus, između ostalog, **broj socijalnog osiguranja**
, bez ograde da mora biti pun. Konzervativno čitanje: **ime + zadnje četiri
  cifre je već u opsegu.** Ne graditi politiku na pretpostavci da skraćivanje
  oslobađa obaveze.
- **NY SHIELD Act** traži i mjere unaprijed, ne samo prijavu poslije: određena
  odgovorna osoba, procjena rizika, provjera dobavljača, obuka, sigurno
  projektovanje i testiranje, sigurno čuvanje i uredno uništavanje.
- **Najjednostavnija zaštita: ne traži pun JMBG uopšte.** NY XML prihvata
  **zadnje četiri cifre ILI datum rođenja.** Ako kupac zadrži pun broj kod sebe
, a on ga po zakonu ionako mora čuvati, tvoja izloženost pada dramatično.
  **Ovo je odluka koju treba donijeti prije prve linije koda.**
- Šifrovanje u prenosu i u mirovanju, zapis pristupa, pisani ugovor s kupcem
  koji jasno kaže da je obaveza vođenja evidencije njegova, i raspored brisanja.

---

## 9. Šta ovo znači za razgovor s kupcem

Kad neko odgovori na email, ne prodaje mu se softver nego se provjeravaju
**četiri stvari**, tim redom:

1. **Koliko javnih poslova imaš u toku?** Ako je jedan, nije kupac,
   LCPtracker mu je besplatan.
2. **U čemu vodiš plate, i koji paket?** Ako je QBO Premium ili Elite, 
   federalni obrazac već ima, pa je razgovor samo o njujorškom XML-u.
3. **Gdje vodiš dnevne sate po ljudima?** Ako je papir, onboarding traje duže,
   ali je i bol veći.
4. **Ko ti sad predaje izvještaj i koliko mu treba?** Ako kaže „knjigovođa, ne
   znam koliko", problem nije njegov nego knjigovođin, i on neće platiti.

Prva tri odgovora određuju je li kupac. Četvrti određuje hoće li platiti.

---

## 10. Izvori

[DOL, obrazac WH-347 i uputstva](https://www.dol.gov/agencies/whd/forms/wh347) ·
[29 CFR 5.5, obaveze i zabrana punog JMBG-a](https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-A/section-5.5) ·
[NYSDOL, elektronska predaja, XSD i uzorak](https://dol.ny.gov/Electronic-Payroll) ·
[NYSDOL, vodič za grupni uvoz](https://dol.ny.gov/certified-payroll-bulk-upload-formatting-guide) ·
[Gusto, izvještaji](https://support.gusto.com/article/101334493100000/view-download-and-customize-reports-in-gusto-for-admins) ·
[Gusto, praćenje projekata](https://support.gusto.com/article/202018885100000/Gusto-project-tracking-for-admins) ·
[Gusto, nema API pristupa korisnicima](https://support.gusto.com/article/106622056100000/gusto-api-integrations) ·
[ADP RUN, pristup izvještajima](https://support.adp.com/adp_payroll/content/hybrid/@runcomplete/doc/pdf/how_to_access_payroll_and_tax_reports.pdf) ·
[Paychex, Job Costing i Labor Distribution](https://developer.paychex.com/ComplexCheck) ·
[Intuit, certified payroll samo na Premium i Elite](https://quickbooks.intuit.com/learn-support/en-us/help-article/special-payroll/set-certified-payroll-reports-quickbooks-online/L3GPr0AJj_US_en_US) ·
[NY GBL § 899-aa](https://law.justia.com/codes/new-york/gbs/article-39-f/899-aa/) ·
[NY SHIELD Act](https://ag.ny.gov/resources/organizations/data-breach-reporting/shield-act) ·
[busybusy, izvještaji](https://helpcenter.busybusy.com/en/articles/9573408-overview-of-busybusy-reports-web) ·
[ClockShark, izvoz](https://help.clockshark.com/viewing-and-exporting-reports)

**Nije potvrđeno iz prvog izvora, provjeriti prije izrade:** tačna imena kolona
u Gustovim i Paychexovim izvozima, cijene i uslovi ADP Marketplacea, i da li
zadnje četiri cifre same pokreću obavezu prijave proboja u svakoj državi.
