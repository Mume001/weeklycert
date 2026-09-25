# Hladan email: tri dodira

Pravila su u SISTEM-KONTAKTA.md §5 i §6. Ovdje su samo tekstovi i ono što mora
biti tačno prije prvog slanja.

## Prije prvog slanja, obavezno

1. **Poštanska adresa u potpisu.** CAN-SPAM je traži u svakoj poruci, kazna je
   do 53.088 $ po poruci. Mora biti stvarna: adresa firme, poštanski sandučić
   registrovan kod USPS-a, ili zakupljeni sandučić kod servisa za prijem pošte.
   Dok je nema, ništa se ne šalje.
2. **Email adrese za prvih 100 firmi** iz lista-prioritet.csv, verifikovane.
3. **Zagrijavanje** getweeklycert.com završeno (SISTEM-KONTAKTA §4.4).
4. **Lista odjavljenih** postoji i provjerava se prije svakog slanja.

## Pravila za tekst

- Čist tekst, bez HTML-a, bez slike, bez praćenja otvaranja.
- Prvi dodir bez ijednog linka, i bez domene u potpisu.
- {Company} je naziv firme iz registra. Ime kontakta registar nema, pa ga
  nema ni u poruci.
- Šalje se radnim danima, 6 do 8 h po New Yorku (12 do 14 h kod nas),
  razmak 3 do 15 minuta, nasumično.
- Dodir 2 i 3 idu kao odgovor u istoj niti, ne kao nova poruka.
- Na svaki odgovor se odgovara, i na odbijanje. STOP se poštuje odmah.

Činjenice u tekstovima su iz spec/05 i spec/13: portal je obavezan od
1.1.2026, prima i ručni unos i fajl, predaja najmanje svakih 30 dana od
početka projekta, 14 dana grejsa, pa 100 $ dnevno po NYSDOL FAQ-u, a NYSDOL
kazne zasad izriče blago. Sedmice bez rada se i dalje označavaju u portalu.

---

## Dodir 1, dan 0

Naslov: `certified payroll at {Company}`

```
Hi,

Quick question about {Company}'s public work in New York.

Since January, certified payroll has to be filed through the new NYSDOL
portal, either typed in by hand or uploaded as a file. How is {Company}
doing that today: payroll software, your bookkeeper, or by hand in the
portal?

I ask because I'm building a tool just for this, for subcontractors with
3 to 30 workers, and I would rather build it around how people actually
file than how I imagine they do.

Muamer
WeeklyCert
[POŠTANSKA ADRESA]

Reply STOP and I won't write again.
```

## Dodir 2, dan 4, odgovor u istoj niti

```
Hi,

One thing that surprises people about the portal: New York counts from
the project start date and expects a filing at least every 30 days, with
a 14 day grace period before the $100 a day penalty in the NYSDOL FAQ can
apply. Enforcement has been light so far, but the filing is required
either way, and weeks with no work still have to be marked in the portal.

WeeklyCert is built around that. You type hours once, it checks the
overtime codes and the fringe math, and it shows which week is due next
on each project. You can see it here: weeklycert.com

Would that help {Company}, or are you already covered?

Muamer
WeeklyCert, weeklycert.com
[POŠTANSKA ADRESA]

Reply STOP and I won't write again.
```

## Dodir 3, dan 10, odgovor u istoj niti

```
Hi,

I'll stop here. If certified payroll isn't a headache at {Company}, just
ignore this. If it is, reply with one line about how you file today and
I'll tell you straight whether WeeklyCert fits.

Muamer
WeeklyCert, weeklycert.com
[POŠTANSKA ADRESA]

Reply STOP and I won't write again.
```

Poslije trećeg dodira ništa. Ista firma se ne kontaktira ponovo emailom.
