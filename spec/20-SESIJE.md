# 20. Preostale sesije do kapije

Ovo je red čekanja za Claude Code poslije sesije E (pregled, potpis,
izvještaji). Svaka sesija je jedan unos ovdje. Mume otvara sesiju jednom
rečenicom:

> Pročitaj CLAUDE.md i spec/20, pa radi sesiju F. Ništa drugo.

Za svaku sesiju važi isto, i ne ponavlja se dolje:

- Pročitaj CLAUDE.md, spec/19 §2, §3, §5, §7 i §10, i odjeljke navedene uz
  sesiju.
- Sav tekst iz packages/copy, prvo u spec/15. Bez dugih crta.
- Svih pet stanja iz 19 §7, tastatura, axe čist, Playwright test glavne akcije,
  snimak u docs/screens/.
- Svaka brojka iz 03 se mjeri testom (19 §10 stavka 9).
- Ako se dva spec fajla ne slažu, ili string fali: stani i pitaj.
- Ne diraj nijedan ekran koji nije naveden uz sesiju.
- Kad pnpm check i e2e prođu: commit, pa git push na origin main.

Redoslijed je iz 03 §5 i ne mijenja se.

---

## F. Projekti

Čitaj: 03 §3 ("Kuda vodi This week") i §4.4, 04 (projects,
project_classifications), 01 §2.1.

Ekrani: `/app/[t]/projects`, `/projects/new`, `/projects/[id]`,
`/projects/[id]/settings`, `/projects/[id]/classifications`.

Obavezno:
- Lista projekata mora podržati `?open=1` po 03 §4.4, jer na nju već vodi
  "This week" kad firma ima dva aktivna projekta. Kolona tada pokazuje
  najstariju otvorenu sedmicu, a klik vodi baš na nju.
- Vremenska linija nema rupa: svaka sedmica od početka projekta postoji,
  sedmice bez unosa su jasno označene. Redni broj prije potpisa piše
  "biće #N".
- Dan kraja sedmice se ne smije mijenjati poslije prve sedmice, s objašnjenjem.
- PRC i broj ugovora jedinstveni u firmi.
- Stopa klasifikacije se nikad ne prepisuje: "nova verzija od datuma", stare
  sedmice ostaju tačne.
- Sidebar linkovi na ove ekrane dobijaju prefetch nazad (README repoa).

## G. Radnici i beneficije

Čitaj: 03 §4.6, 02 §3 (šta viewer smije vidjeti), 04 (workers, fringe_plans),
11 §5.

Ekrani: `/app/[t]/workers`, `/workers/new`, `/workers/[id]`,
`/app/[t]/fringe-plans`.

Obavezno:
- Polje za SSN prima tačno 4 cifre. Polje za pun SSN ne postoji nigdje.
- Zadnje 4 SSN ili datum rođenja, jedno od dva, forma to forsira.
- Vrijednost se prikazuje kao "••••1234"; "Prikaži" se bilježi.
- U listi radnika nema adresa ni SSN-a.
- Viewer vidi samo ime i klasifikaciju (02 §3); adrese mu ne idu ni u
  preglednik, isto pravilo kao engineInput() u mreži.
- Pretvarač "mjesečna premija u iznos po satu" pokazuje djelitelj i napomenu o
  2.080 sati.

## H. Onboarding

Čitaj: 03 §4.3 (onboarding), 02 §5 (zaključani koraci po ulozi), 08 §2.1.

Ekran: `/app/[t]/onboarding`, svih 7 koraka.

Obavezno:
- Svaki korak se snima odmah, čarobnjak se može prekinuti i nastaviti.
- "Preskoči za sada" samo na koracima 4, 5 i 7; korak 7 samo dok traje trial.
- Za payroll, signer i bookkeeper koraci 1 i 7 su zaključani i kažu ko ih može
  unijeti (02 §5).
- Korak 7 (naplata) je u mocku lažan: nema Stripea, samo izbor nivoa i povratak.
- "Zalijepi tabelu iz platnog rasporeda" predlaže redove, korisnik ih potvrđuje.
- Koristi forme koje već postoje iz sesija F i G, ne pravi nove.

## I. Uvoz

Čitaj: 03 §4.7, 06 u cijelosti.

Ekrani: `/app/[t]/imports`, `/imports/new` (4 koraka), `/imports/[id]`.

Obavezno:
- Ćelije koje počinju sa `= + - @` se tretiraju kao tekst.
- XLSX veći od 50 MB kad se raspakuje se odbija.
- Korak 4 poredi uvezeni bruto s payroll registrom i pokazuje razliku prije
  potvrde.
- Poništavanje uvoza do 90 dana, samo ako sedmica nije potpisana.
- Dugme "Import CSV" u mreži sati prestaje biti mrtvo i vodi ovdje.

## J. Arhiva

Čitaj: 03 §4.8.

Ekran: `/app/[t]/archive`.

Obavezno:
- Filteri: projekat, godina, status, verzija, radnik.
- Pretraga po PRC-u vraća sve izvještaje za taj PRC u jednom koraku.
- "Izvezi sve za projekat" je u mocku statičan zip iz fixtures, jasno označen.

## K. Kontrolna tabla i Moje firme

Čitaj: 03 §4.2 (/firms) i §4.3 (dashboard), 05 (ritam predaje), 19 §4
(MOCK_TODAY).

Ekrani: `/app/[t]/dashboard`, `/firms`, `/app` (preusmjeravanje).

Obavezno:
- Dva brojača roka po projektu: 30 dana od zadnje prihvaćene predaje, crveno kad
  prođe, tamnocrveno poslije 14 dana grejsa. Federalni projekat ima i treći
  red za WH-347.
- Kartica "report waiting for signature" je red čekanja potpisnika (02 §5) i
  vodi pravo na ekran potpisa.
- Sve se računa od MOCK_TODAY, nikad od new Date().
- Učitavanje ispod 500 ms na 50 projekata, izmjereno testom.
- `/firms` sortirano po najbližem roku.

## L. Postavke

Čitaj: 03 §4.9, 02 §3, 08, 11 §4.

Ekrani: `/app/[t]/settings/company`, `/team`, `/signers`, `/billing`,
`/notifications`, `/audit`, `/data`.

Obavezno:
- Unutar Settings se pod-stranice skrivaju po 02 §3 (payroll vidi samo Company
  za čitanje i Notifications).
- Naplata je mock: bez Stripea. "Otkaži" ide kroz razlog, izvoz arhive i
  potvrdu upisivanjem imena firme.
- SMS je isključen dok ne postoji pisani pristanak s punim tekstom.
- Brisanje firme: 30 dana milosti i napomena o obavezi čuvanja.

## M. Prijava i nalog

Čitaj: 03 §4.1 (auth dio) i §4.2 (/account), 11 §3 i §4 (auth rute bez
straže), 15 §3 (prijava).

Ekrani: `/login`, `/register`, `/forgot`, `/reset/[token]`, `/verify/[token]`,
`/magic/[token]`, `/invite/[token]`, `/2fa`, `/account`, `/account/security`.

Obavezno:
- Sve su forme koje u mocku samo navigiraju. Nema Better Autha.
- Pogrešni podaci daju isti tekst za oba slučaja.
- Magic link troši token tek na klik dugmeta, ne pri otvaranju stranice.
- `/register?invite=...` ne traži naziv firme.
- "Log in" se i dalje NE vraća na sajt (16 §4 red 1). To se radi tek kad
  registracija stvarno proradi, poslije kapije.

## N. Admin

Čitaj: 03 §4.10, 02 §1 (super-admin nije uloga u firmi), 11 §4.

Ekrani: `/admin`, `/admin/tenants`, `/admin/tenants/[id]`, `/admin/jobs`,
`/admin/wage-schedules`, `/admin/classifications`.

Obavezno:
- Samo super-admin. Svaka druga uloga dobija ForbiddenState.
- Impersonacija traži razlog, traje 30 minuta, bilježi se i vidljiva je
  vlasniku firme u njegovom dnevniku.

## O. Demo za prodaju

Čitaj: 12 korak 3 ("Ovo je verzija za prodaju"), 16 §4 red 7.

- Provjeri da svih 57 ruta iz 03 §2 postoji i da Playwright tokovi prolaze.
- Interaktivni demo na sajtu: ugrađena mreža na mock podacima, bez forme,
  završava na pregledu izvještaja. Zamjenjuje prazan red 7 na početnoj.
- Video od 90 sekundi bez zvuka, s titlovima, snimljen Playwrightom, u
  docs/demo/.

Poslije sesije O korak 3 je gotov. Dalje se ne ide bez kapije od 10 uplata.
