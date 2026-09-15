# Izvori (provjereno 11. do 13.9.2026, osim gdje piše drugačije)

## Zakon i propisi
- NY Labor Law §220, §220-a (certified payroll), §220-i (registar izvođača)
- 12 NYCRR Part 220 (čuvanje evidencije)
- NYSDOL Bureau of Public Work: Certified Payroll portal (obavezan od 1.1.2026),
  stranica "XML Work Classification List" (broj vrijednosti neprovjeren, spec/13 A11), PRC platne tabele
- 29 CFR Part 5 (Davis-Bacon): 5.5(a)(3) sadržaj i predaja payrolla, 5.32 fringe
  i prekovremeni; 29 CFR 778.115 ponderisani prosjek; 29 CFR 5.23 do 5.31 fringe
- WH-347 i uputstvo, DOL WHD forms, revizija januar 2025 (OMB 1235-0008)
- NY GBL §899-aa (obavijest o curenju), §899-bb (SHIELD Act)
- TCPA 47 U.S.C. §227, 47 CFR 64.1200; Chennette v. Porch.com (9th Cir. 2022)
- CAN-SPAM 15 U.S.C. §7701; FTC kazna po emailu
- Wyoming LLC: godišnji izvještaj, Form 5472 + pro forma 1120, BE-13, T.D. 10022

## Podaci
- NY registar izvođača (Labor Law §220-i), CSV:
  https://data.ny.gov/api/views/i4jv-zkey/rows.csv?accessType=DOWNLOAD
  (14.674 aktivna izvođača, svi s telefonom, nijedan s emailom; prebrojano
  14.9.2026 iz preuzetog CSV-a. Raniji broj 14.176 je bio pogrešan.)
- SAM.gov Wage Determinations (bez javnog API-ja za WD sadržaj)

## Tehnologija (verzije i cijene, septembar 2026)
- Next.js 16, React 19, Tailwind 4, shadcn/ui, TanStack Table 8, Drizzle 0.45,
  Better Auth 1.7, pg-boss 12, pdf-lib 1.17, xmlbuilder2 3, PostgreSQL 17
- Hetzner Cloud cijene za Ashburn (CPX21 ≈ 37,49 $), lokacije Object Storagea
  (samo EU), nema managed Postgresa
- DigitalOcean NYC3: Droplet 4 GB 24 $, Managed Postgres 1 GB 15 $, Spaces 5 $
- Backblaze B2: 6 $/TB, US-East regija
- Stripe naknade i Checkout/Portal dokumentacija
- Resend cijene i pravila korišćenja (besplatno do 3.000 poruka mjesečno i 100
  dnevno, 3 domene; Pro 20 $ za 50.000). Pravila izričito zabranjuju hladan
  email: "cold outreach, purchased lists, or scraped contact data"
- Zoho Mail Forever Free: 5 korisnika, 5 GB, samo web sučelje, jedna domena;
  evropski data centar koristi `mx.zoho.eu` i `include:zohomail.eu`
  (potvrđeno na živom nalogu 14.9.2026)

## Konkurencija (pregledano 12.9.2026)
- LCPtracker, eMars, B2Gnow (za glavne izvođače i naručioce)
- Points North, Certified Payroll Reporting, eBacon, Payroll4Construction,
  QuickBooks Time Certified Payroll, certpayroll.com, wageproof.com

## Dodatno provjereno 13.9.2026
- NYSDOL Electronic Payroll: portal `mpwr-public.labor.ny.gov`, XSD na
  `dol.ny.gov/certpayrollxsd`, primjer XML-a na `dol.ny.gov/certpayrollsamplexml`,
  uputstvo za grupni upload, FAQ, vodič za izvođače (PDF, januar 2026)
- Ritam predaje svakih 30 dana, 14 dana grejsa, 100 $ po danu, i izjava NYSDOL-a
  o privremenom neizricanju kazni
- Zvanična izjava da API ne postoji
- Puna legenda OT kodova s OVERTIME PAGE platne tabele
- WH-347 revizija januar 2025: kolone 1A do 9 i tačan tekst šest kućica izjave
- Elektronski potpis dozvoljen, skenirani nije (uputstvo WH-347, 29 CFR 5.5(a)(3)(ii)(E))
- 29 CFR 3.4(a) za rok od 7 dana federalno (nije u 5.5)
- NYC koristi zaseban sistem `nyc-oti.ecomply.us`
- Certiwage cjenovnik 0 / 29 / 59 $, fokus federalni i kalifornijski

## Dodatno provjereno 15.9.2026 (preglednik, ne sandbox)
- Vercel pravila poštene upotrebe: Hobby je "non-commercial personal use only",
  a komercijalnim se smatra i oglašavanje prodaje proizvoda ili usluge
  (`vercel.com/docs/limits/fair-use-guidelines`)
- Vercel Pro: 20 $/mj, uključuje 20 $ kredita i jedno mjesto
  (`vercel.com/docs/plans/pro-plan`)
- Vercel najduže trajanje funkcije: 300 s Hobby, 800 s Pro, 1800 s beta
  (`vercel.com/docs/functions/limitations`); nema procesa koji stalno radi
- Vercel Queues je u javnoj beti (`vercel.com/docs/queues`)
- Vercel regija funkcija: zadano `iad1`, jedna regija dostupna i na Hobbyju
  (`vercel.com/docs/functions/configuring-functions/region`)
- Cloudflare Pages besplatan plan: neograničen protok, 500 build-ova mjesečno,
  20.000 fajlova po sajtu (`developers.cloudflare.com/pages/platform/limits/`);
  nema klauzule o nekomercijalnoj upotrebi
- NYSDOL linkovi provjereni uživo: `dol.ny.gov/certpayrollxsd`,
  `dol.ny.gov/bizserve/ep/guide/buf`, `dol.ny.gov/bizserve/ep/guide/contractor`,
  `dol.ny.gov/electronic-payroll-faq`, i generičke platne tabele po okrugu na
  `apps.labor.ny.gov/wpp/publicViewPWChanges.do` (besplatno, bez PRC broja)
- WH-347 PDF: `dol.gov/sites/dolgov/files/WHD/legacy/files/wh347.pdf`
- NY registar izvođača: 14.674 aktivna, `data.ny.gov` skup `i4jv-zkey`

## Šta NIJE bilo moguće preuzeti iz sandboxa
- Sam XSD fajl i primjer XML-a (domen `dol.ny.gov` blokiran za sandbox, fajl se
  servira kao binarni download), spec/13 A1
- Imena AcroForm polja u WH-347 PDF-u 2025, spec/13 A8b
- Legenda praznika (HOLIDAY PAGE), spec/13 A10
- Tačan broj klasifikacija na zvaničnoj listi, spec/13 A11

Sve gore navedeno Mume skida ručno po `poslovno/SKINUTI-FAJLOVE.md`; linkovi su
provjereni 15.9.2026.
