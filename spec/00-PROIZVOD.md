# 00. Proizvod: šta je WeeklyCert

Napisano 13.09.2026. Ovo je prvi fajl koji Claude Code čita.

---

## Jedna rečenica

WeeklyCert pretvara platnu listu malog građevinskog podizvođača u državi Njujork u
certified payroll izvještaj koji država neće odbiti: njujorški XML za NYSDOL portal,
federalni WH-347 s izjavom o usklađenosti, i arhivu koja preživi kontrolu.

## Ko je kupac

- Specijalizovani podizvođač u NY (elektro, mehanika, beton, suhozid, krovovi, HVAC).
- 3 do 30 radnika na terenu, jedna osoba u kancelariji koja vodi papire.
- Dva ili više javnih poslova istovremeno (za jedan posao LCPtracker je besplatan).
- Plate vodi u Gustu, ADP RUN, Paychex Flex ili QuickBooks Online Core.
- Danas prekucava u Excel ili DOL-ov PDF, i predaje ručno u portal.
- Često ima vanjskog knjigovođu koji radi za više takvih firmi. To je posebna uloga.

## Ko nije kupac (ne trošiti vrijeme)

- Firme preko 30 ljudi: imaju Foundation, Sage, Viewpoint.
- Firme na projektu gdje naručilac plaća LCPtracker Pro ili B2Gnow.
- QuickBooks Online Premium ili Elite korisnici koji trebaju samo federalni WH-347.
- Poslovi u gradu New York City: tamo se predaje kroz NYC Comptroller eComply, ne
  kroz NYSDOL portal. Podržava se kasnije, ne u prvoj verziji.

## Zašto sada

- NYSDOL elektronska predaja obavezna od 1.1.2026. Kazna 100 $ dnevno, ne naplaćuje
  se prvih 14 dana. NYSDOL trenutno ne kažnjava dok se tržište privikava, i to je
  prozor.
- Nijedan od dva samoposlužna konkurenta (Certiwage, CertifiedPayrollPro) nema
  njujorški XML. Oba vode s federalnim obrascem i Kalifornijom.

## Šta proizvod radi, po prioritetu

1. **Provjera prije slanja.** Prije nego kupac pošalje, alat kaže tačno zašto bi
   izvještaj bio odbijen, s brojkama i jednim klikom za popravku.
2. **Obračun beneficija i prekovremenih.** Anualizacija, kredit po radniku,
   ponderisani prosjek za više klasifikacija, premija na osnovicu bez beneficije,
   njujorška pravila po OT kodu klasifikacije iz platne tabele.
3. **Sedmična mreža sati.** Radnik × klasifikacija × 7 dana, unos ukupnih sati po
   danu s automatskom podjelom na redovne i prekovremene.
4. **Izlazi.** NY XML validiran prema shemi, WH-347 PDF popunjen u zvanični obrazac,
   generički CSV za LCPtracker i B2Gnow.
5. **Arhiva.** Verzije, potpisi, dnevnik predaje, čuvanje najmanje 6 godina za NY.
6. **Uvoz.** CSV iz payroll sistema s mapiranjem kolona i snimljenim profilom po
   dobavljaču, plus usklađivanje uvezenog bruta s payroll registrom.

## Šta proizvod NIJE

- Nije obrada plata. Ne isplaćuje, ne računa poreze, ne dira novac radnika.
- Nije evidencija radnog vremena na terenu. Uvozi iz nje.
- Nije generator WH-347 kao proizvod. WH-347 je izlaz, ne razlog kupovine.
- Nije alat za naručioce i glavne izvođače. Kupac je podizvođač.

## Obim prve verzije (MVP)

Uključeno:
- Registracija, firma, tim s ulogama, knjigovođa s više firmi.
- Projekti s PRC brojem, klasifikacije i stope po projektu, radnici, pripravnici,
  planovi beneficija.
- Sedmična mreža, uvoz CSV-a s mapiranjem, kopiraj prošlu sedmicu, sedmica bez rada.
- Validacija (tvrda i meka) s objašnjenjem i popravkom.
- NY XML + WH-347 PDF + izjava o usklađenosti, tipkani e-potpis.
- Arhiva po projektu i po sedmici, verzije, dnevnik predaje.
- Stripe: postavka jednokratno + pretplata mjesečno, portal za otkaz i pauzu.
- Podsjetnici na rok emailom: sedmični (zatvori sedmicu) i 30-dnevni državni rok
  po projektu, s eskalacijom na 10, 5, 2 i 0 dana.

Kasnije (ne u MVP):
- Kalifornijski eCPR XML, NJ, WA, IL izlazi.
- NYC eComply.
- API integracije s payroll dobavljačima.
- SMS podsjetnici (tek uz pisani pristanak).
- Mobilna aplikacija. Mobilni web samo za pregled i potpis.
- Grupno generisanje za više projekata odjednom.
- AI asistent.

## Kapija koja stoji iznad svega

Prvobitno pravilo je bilo **deset ljudi plati prije prve linije koda backenda.**

**Odluka od 24.9.2026: kapija od 10 uplata je ukinuta.** Mume je odlučio da se
proizvod gradi do kraja, uključujući backend, generator XML-a i WH-347, naplatu i
server, i tek onda ide u prodaju. Redoslijed koraka iz 12 ostaje isti, samo se ne
čeka između koraka 3 i 4.

## Brojke koje treba imati na umu

- Cijena: 79 $ mjesečno, plus 149 / 299 / 499 $ jednokratno za postavku po težini.
- Probni period 14 dana s karticom (bez naplate po projektu ni po radniku).
- Realan cilj: 4 nova kupca mjesečno, 34 kupca krajem prve godine, 51 krajem druge.
- Plafon ove niše je nizak: cijelo tržište u SAD-u je 50 do 80 hiljada firmi.
  Sistem se projektuje da bude tačan na 100 firmi, da se ne stidi na 1.000, i da
  ga ne treba prepisivati na 10.000. Sto hiljada korisnika nije meta ove niše, ali
  arhitektura ispod to ne sprječava.
