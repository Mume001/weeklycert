# DNS postavka, sve tri domene na Cloudflareu

Stanje 14.9.2026. Sve tri domene su kupljene i na Cloudflareu.

**Podjela uloga, ovo je najvažnije i ne miješa se:**

| Domena | Uloga | Email |
|---|---|---|
| **weeklycert.com** | brend, sajt, aplikacija (`app.`), kasnije transakcioni email | prima preko Cloudflare Email Routing, **nikad ne šalje hladan email** |
| **getweeklycert.com** | hladan email, jedini sandučić iz kojeg pišeš kupcima | Zoho Mail, prima i šalje |
| **tryweeklycert.com** | rezerva, za sada zaključana | ne prima i ne šalje ništa |

Razlog: ako hladan email jednog dana pokvari reputaciju domene, brend i
transakcioni email (pozivnice, podsjetnici, računi) ostaju netaknuti. Poddomena
nije dovoljna izolacija jer nasljeđuje reputaciju roditelja.

---

## 0. Prvo obriši Namecheapove zapise, na sve tri domene

Kad si kupio domene, Namecheap je ubacio svoje podrazumijevane zapise i Cloudflare
ih je preuzeo. Na svakoj domeni ih je osam i **svih osam ide van**:

| Type | Sadržaj | Šta je to | Šta s njim |
|---|---|---|---|
| A | `@` -> `162.255.119.85` | Namecheapova parkirana stranica | obrisati |
| CNAME | `www` -> `parkingpage.namecheap.com` | isto | obrisati |
| MX ×5 | `eforward1` do `eforward5.registrar-servers.com` | Namecheapovo besplatno prosljeđivanje pošte | obrisati |
| TXT | `v=spf1 include:spf.efwd.registrar-servers.com ~all` | SPF za to prosljeđivanje | obrisati |

Označi sve i obriši, pa tek onda dodaj zapise iz odjeljaka ispod. Ako ostane stari
MX ili stari SPF, pošta ili neće stizati ili će padati na provjeri.

Poslije brisanja domena privremeno ne pokazuje ništa u pregledniku. To je bolje
nego Namecheapova parkirana stranica, jer kupac koji te proguglja ne treba vidjeti
"this domain is parked".

---

## 1. getweeklycert.com, radni sandučić

### Redoslijed, ne preskakati

Zoho neće primati poštu dok se domena ne verifikuje, pa ide ovim redom.

**Korak 1.** Direktan link za besplatan plan:

```
https://mail.zoho.com/signup?type=org&plan=free
```

Izaberi **"Sign up with a domain I already own"**, ne kupovinu nove domene, i
unesi `getweeklycert.com`. Forever Free je 5 korisnika, 5 GB po korisniku, samo
web sučelje, bez IMAP-a i POP-a, i **samo jedna domena**. Ako se besplatan plan ne
ponudi (dostupan je samo u odabranim data centrima), uzmi **Mail Lite**, oko 12 $
godišnje.

Kao administratorski nalog za prijavu koristi svoj postojeći Gmail, ne adresu na
novoj domeni. Inače se zaključaš van ako nešto pođe po zlu s domenom.

**Jedna domena je dovoljna.** Email treba samo getweeklycert.com.
weeklycert.com prima poštu preko Cloudflare Email Routinga, besplatno i bez Zoha,
a tryweeklycert.com ne treba ništa dok stoji zaključana.

**Provjeri u kojem si data centru prije nego prepišeš MX zapise.** Poslije prijave
pogledaj adresu u pregledniku: `mail.zoho.com` je globalni ili američki centar,
`mail.zoho.eu` je evropski, `mail.zoho.in` indijski. **Nastavak MX zapisa prati
data centar**, pa u evropskom to nije `mx.zoho.com` nego `mx.zoho.eu`. Iz BiH ćeš
najvjerovatnije završiti u evropskom. Uvijek prepiši MX, SPF i DKIM **iz Zohovog
panela** (Admin Console -> Domains -> Email Configuration), ne iz ovog dokumenta.
Vrijednosti ispod su za globalni centar i služe kao provjera da si na pravom tragu.

**Korak 2.** Zoho ti da zapis za verifikaciju. U Cloudflare DNS dodaj:

| Type | Name | Content | Proxy |
|---|---|---|---|
| TXT | `@` | `zoho-verification=zb********.zmverify.zoho.com` (tačan string ti da Zoho) | ne postoji za TXT |

Klikni Verify u Zohu.

**Korak 3.** Napravi sandučić `muamer@getweeklycert.com`. To je adresa s koje pišeš.

**Korak 4.** Sad dodaj MX. **Prvo obriši svih pet postojećih Namecheap MX zapisa.**

**POTVRĐENO 14.9.2026: nalog je u evropskom data centru** (verifikacija glasi
`zmverify.zoho.eu`), pa važe `.eu` vrijednosti, ne `.com`:

| Type | Name | Mail server | Priority |
|---|---|---|---|
| MX | `@` | `mx.zoho.eu` | 10 |
| MX | `@` | `mx2.zoho.eu` | 20 |
| MX | `@` | `mx3.zoho.eu` | 50 |

**Korak 5.** SPF. **Prvo obriši stari Namecheap SPF**
(`v=spf1 include:spf.efwd.registrar-servers.com ~all`). Domena smije imati **samo
jedan** SPF zapis; dva znače automatski pad provjere.

| Type | Name | Content |
|---|---|---|
| TXT | `@` | `v=spf1 include:zohomail.eu -all` |

`-all` je tvrdi pad, i tako treba: s ove domene šalje samo Zoho. Ako ikad dodaš
drugi alat za slanje na ovu domenu, moraš dopisati njegov `include`, inače poruke
padaju.

**Korak 6.** DKIM. U Zohu: Admin Console -> Domains -> getweeklycert.com ->
Email Configuration -> DKIM -> Add selector. Uzmi selektor `zmail`. Zoho ti
generiše javni ključ. Ključ je dug i Cloudflare ga prima u jednom TXT polju.

| Type | Name | Content |
|---|---|---|
| TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCS...` (tačan ključ iz Zoha) |

Vrati se u Zoho i klikni Verify na DKIM.

**Korak 7.** DMARC.

| Type | Name | Content |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:muamer@getweeklycert.com; fo=1` |

Izvještaji zasad padaju u radni sandučić. Kad ih bude previše, napravi alias
`dmarc@getweeklycert.com` u Zohu i prebaci `rua` na njega.
Ostaje `p=none` dvije do tri sedmice dok se čitaju izvještaji, pa
`p=quarantine`, pa `p=reject`. To je u spec/15 §4.4.

### Zagrijavanje, počinje istog dana

Nova domena koja odjednom pošalje 50 poruka ide u spam. Tri sedmice:

| Sedmica | Poruka dnevno | Kome |
|---|---|---|
| 1 | 5 do 8 | poznanicima i na tvoje druge adrese, s odgovorima |
| 2 | 10 do 15 | prvi stvarni kupci, najkvalitetniji s liste |
| 3 | 20 do 25 | nastavak liste |
| 4+ | 30 do 40 | puni ritam |

Nikad više od 40 dnevno s jednog sandučića. Uvijek se odgovara na odgovore, i
nikad se ne šalje ista poruka svima.

---

## 2. weeklycert.com, brend i sajt

**Email prima, ne šalje.** Cloudflare Email Routing je besplatan i dodaje svoje
zapise sam.

**Korak 1.** Cloudflare -> weeklycert.com -> Email -> Email Routing -> Get
started. Potvrdi da smije dodati MX i SPF zapise. Doda ih automatski, ne kucaj
ih ručno.

**Korak 2.** Napravi adrese koje prosljeđuju na tvoj Gmail:

| Adresa | Prosljeđuje na |
|---|---|
| `mume@weeklycert.com` | `muamer@getweeklycert.com` |
| `support@weeklycert.com` | `muamer@getweeklycert.com` |
| `hello@weeklycert.com` | `muamer@getweeklycert.com` |
| `dmarc@weeklycert.com` | `muamer@getweeklycert.com` |

Odredište je `muamer@getweeklycert.com`, ne privatni Gmail, da sva pošta za projekat
bude na jednom mjestu. Ta adresa nikad nije vidljiva pošiljaocu.
Catch-all ostaje ugašen (Drop).

**Korak 3.** DMARC.

| Type | Name | Content |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@weeklycert.com; fo=1` |

Kad krene Resend za transakcioni email (pozivnice, podsjetnici na rok, računi),
dodaje se **poddomena** `mail.weeklycert.com` sa svojim SPF, DKIM i Return-Path
zapisima koje Resend generiše, a DMARC na korijenu se diže na `p=reject`. Resend
je besplatan do 3.000 poruka mjesečno.

**Kroz Resend se nikad ne šalje hladan email.** Njihova pravila korišćenja to
izričito zabranjuju ("cold outreach, purchased lists, or scraped contact data"),
posljedica je zatvoren nalog. Hladan email ide samo iz sandučića na
getweeklycert.com.

**Korak 4, sajt.** Kad budeš spreman objaviti, Cloudflare Pages je besplatan:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `weeklycert.pages.dev` | uključen (narandžasti oblak) |
| CNAME | `www` | `weeklycert.pages.dev` | uključen |

Kasnije, kad proizvod krene:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `app` | IP servera | uključen |
| A | `deploy` | IP servera | **isključen** (Dokploy panel) |
| CNAME | `status` | adresa koju da Better Stack ili Instatus | uključen |

**Prije objave sajta**, iz `dizajn/sajt.html` moraju izaći svi isprekidani okviri
s bosanskim napomenama, a telefon i adresa moraju biti stvarni. Trenutno su
izmišljeni.

---

## 3. tryweeklycert.com, zaključana

Ništa se s nje ne šalje i ništa ne prima, pa se zaključava da je niko ne može
lažirati dok stoji prazna.

| Type | Name | Content | Priority |
|---|---|---|---|
| MX | `@` | `.` | 0 |
| TXT | `@` | `v=spf1 -all` | |
| TXT | `_dmarc` | `v=DMARC1; p=reject;` | |
| TXT | `*._domainkey` | `v=DKIM1; p=` | |

Ako Cloudflare ne prihvati tačku kao sadržaj MX zapisa, jednostavno nemoj dodati
nijedan MX zapis. Ostala tri zapisa su važnija.

Prazan `p=` u DKIM zapisu znači opozvan ključ i blokira svaki pokušaj
potpisivanja s te domene.

Kad jednom zatreba (kad getweeklycert.com postane pretopla), ova se domena
postavlja identično kao getweeklycert.com iz odjeljka 1.

---

## 4. Provjera kad završiš

Otvori `mxtoolbox.com/SuperTool.aspx` i provjeri po redu, za getweeklycert.com:
`mx:getweeklycert.com`, `spf:getweeklycert.com`, `dmarc:getweeklycert.com`, i
`dkim:getweeklycert.com:zmail`.

Zatim pošalji test poruku na `check-auth@verifier.port25.com` s adrese
`muamer@getweeklycert.com`. Vrati ti izvještaj u kojem sve tri stavke moraju pisati
`pass`:

```
SPF check:          pass
DKIM check:         pass
DMARC check:        pass
```

Ako nešto piše `fail` ili `none`, ne šalji nijednu poruku kupcu dok se ne popravi.

Drugi test: `mail-tester.com` da ti adresu, pošalješ joj poruku, da ti ocjenu od
10. Ispod 8 se ne šalje.

---

## 5. Potvrđeno stanje, 14.9.2026.

Provjereno upitom direktno na autoritativne servere (`desi.ns.cloudflare.com`),
bez keša. Sve tri domene su gotove.

**getweeklycert.com**

```
MX     mx.zoho.eu 10, mx2.zoho.eu 20, mx3.zoho.eu 50
TXT    v=spf1 include:zohomail.eu -all            (jedan jedini SPF)
TXT    zoho-verification=zb17581390.zmverify.zoho.eu
TXT    zmail._domainkey  v=DKIM1; k=rsa; p=...    (RSA 2048)
TXT    _dmarc  v=DMARC1; p=none; rua=mailto:muamer@getweeklycert.com; fo=1
```

Testirano preko `check-auth@verifier.port25.com`: SPF pass, DKIM pass, iprev pass.

**weeklycert.com**

```
MX     route2 5, route3 24, route1 98 .mx.cloudflare.net   (Email Routing)
TXT    v=spf1 include:_spf.mx.cloudflare.net ~all          (Cloudflare održava)
TXT    _dmarc  v=DMARC1; p=none; rua=mailto:dmarc@weeklycert.com; fo=1
```

Routing pravila: `mume@`, `support@`, `hello@`, `dmarc@` -> `muamer@getweeklycert.com`.
Catch-all ugašen. Testirano, poruka stiže.

**tryweeklycert.com**

```
TXT    v=spf1 -all
TXT    _dmarc  v=DMARC1; p=reject;
TXT    *._domainkey  v=DKIM1; p=          (ključ opozvan)
bez MX
```

### Šta ostaje

- Za dvije do tri sedmice, kad se pročitaju DMARC izvještaji: `p=quarantine`
  pa `p=reject` na obje aktivne domene.
- Kad se objavi sajt: CNAME `@` i `www` na Cloudflare Pages.
- Kad krene transakcioni email: poddomena `mail.weeklycert.com` sa Resend
  zapisima.
