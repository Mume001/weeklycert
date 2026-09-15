# 08. Naplata (Stripe)

Cijene su odlučene u poslovno/PROJEKAT-01 i Zarada-troskovi-porezi.pdf. Ovdje je
kako se to tehnički provodi, tako da Claude Code može napisati naplatu bez
pogađanja.

---

## 1. Ponuda (šta se prodaje)

| Stavka | Cijena | Stripe objekat | Napomena |
|---|---|---|---|
| Standard mjesečno | 79 $/mj | Price recurring, `price_standard_monthly` | Neograničeni projekti i radnici u jednoj firmi. |
| Founding Member (presale) | 147 $ jednokratno = prva 3 mjeseca | Payment Link one_time `price_founding_147` | Samo prije lansiranja, najviše 20 firmi. Poslije toga standardna pretplata 79 $. Detalji §4. |
| Setup Basic | 149 $ jednokratno | Price one_time `price_setup_basic` | Opseg svih nivoa je u **17 §6.1**, ta tabela je izvor istine. |
| Setup Standard | 299 $ | `price_setup_standard` | vidi 17 §6.1 |
| Setup Full | 499 $ | `price_setup_full` | vidi 17 §6.1 |
| Godišnje | 790 $/god (2 mjeseca gratis) | Price recurring yearly | Nudi se tek poslije 3. mjeseca, u aplikaciji. |

Odluke:
- **Probni period 14 dana** (trial) za cijelu firmu, ne po projektu. Trial traži karticu unaprijed
  (`payment_method_collection: always`). Razlog: filtrira neozbiljne, konverzija
  s karticom je 3 do 5 puta veća, a cilj su plaćajući kupci, ne registracije.
- Setup se naplaćuje **odmah**, ne poslije triala. Trial je za pretplatu.
  Kupac koji ne želi setup bira "Postaviću sam" (tier `waived`) i dobija samo
  trial.
- Bez naplate po radniku ili po projektu. Jednostavno za razumjeti, jednostavno
  za kod.
- Porez: NY SaaS je oporeziv, ali nexus nastaje tek na 500.000 $ i 100
  transakcija; do tada ne naplaćujemo porez. Stripe Tax se uključuje kad se
  približi (prag se prati u /admin).

## 2. Tehnički tok

### 2.1 Kreiranje pretplate
1. Vlasnik u onboardingu koraku 7 (ili /app/[t]/settings/billing) bira setup tier.
2. Server pravi Stripe Customer (`metadata.tenant_id`, email vlasnika, ime firme)
   ako ne postoji, pa **Checkout Session** u modu `subscription`:
   - `line_items`: recurring standard price (qty 1) + one_time setup price (qty 1,
     ako nije waived)
   - `subscription_data.trial_period_days: 14`
   - `subscription_data.metadata.tenant_id`
   - `payment_method_collection: 'always'`
   - `allow_promotion_codes: true` (za PRESALE20)
   - `success_url: /app/[t]/settings/billing?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: /app/[t]/onboarding?step=7`
   - `client_reference_id: tenant_id`
3. Stripe hostovani Checkout (ne Elements). Manje koda, PCI SAQ A, Apple/Google
   Pay besplatno.
4. Povratak: server provjerava sesiju (`checkout.sessions.retrieve`), ali izvor
   istine je **webhook**, ne redirect.

### 2.2 Webhookovi (ruta `/api/webhooks/stripe`, worker obrađuje)
- Potpis se provjerava (`stripe.webhooks.constructEvent`) s raw tijelom.
- Događaj se upiše u `billing_events` (id kao PK; duplikat → 200 i kraj).
- Ruta odmah vraća 200; obrada ide u pg-boss posao `billing.process_event`
  (Stripe ponovo šalje ako ne dobije 200 u 20 s, a naša obrada može biti spora).
- Događaji koje obrađujemo:

| Događaj | Radnja |
|---|---|
| checkout.session.completed | veži `stripe_customer_id`, `stripe_subscription_id`; `setup_paid_at` ako je bilo one_time stavke; tenant status trial |
| customer.subscription.created / updated | upiši status, `current_period_end`, `cancel_at_period_end`, `price_cents`; mapiraj Stripe status u naš (trialing→trial, active→active, past_due→past_due, paused→paused, canceled→cancelled, incomplete/unpaid→past_due) |
| customer.subscription.deleted | tenant cancelled, `cancelled_at`, `purge_after = +30 d`, zakaži posao `tenant.purge` |
| invoice.paid | obavijest vlasniku samo za prvu uplatu; inače ništa |
| invoice.payment_failed | tenant past_due, email vlasniku s linkom na portal; Stripe Smart Retries radi ostalo (4 pokušaja kroz 3 sedmice) |
| customer.subscription.trial_will_end | 3 dana prije: email "trial ističe, kartica će biti naplaćena 79 $" |
| charge.dispute.created | email Mumi, tenant flag `disputed` u /admin |

- Sve ostalo se loguje i ignoriše.
- Retry: ako obrada padne, pg-boss ponavlja 5 puta s eksponencijalnim čekanjem;
  poslije toga event ostaje s `error` i vidi se u /admin/jobs.

### 2.3 Upravljanje pretplatom
- **Stripe Customer Portal** za: promjenu kartice, preuzimanje računa, otkaz,
  prelazak na godišnje. Konfiguracija portala: dozvoli otkaz na kraju perioda,
  dozvoli promjenu između monthly i yearly, ne dozvoli promjenu količine.
- Dugme "Upravljaj naplatom" pravi `billingPortal.sessions.create` s `return_url`.
- **Pauza** (kupac nema javnih poslova zimu): naša funkcija, ne Stripeova.
  `subscriptions.update(pause_collection: {behavior: 'void'})`. U pauzi: čitanje
  i arhiva rade, unos i generisanje ne. Do 3 mjeseca, pa automatski nastavak
  ili otkaz. Email 7 dana prije nastavka.
- **Otkaz**: na kraju perioda. Poslije `subscription.deleted`: 30 dana samo
  čitanje i izvoz, pa `tenant.purge` (DEK na NULL, redovi obrisani, fajlovi u
  S3 obrisani, osim ako postoji zakonska obaveza; naša nema, kupčeva jeste, pa
  se kupcu 3 puta nudi izvoz: pri otkazu, 7 dana prije, 1 dan prije).

### 2.4 Zaštita pristupa po statusu

| Status firme | Šta radi |
|---|---|
| trial | sve |
| active | sve |
| past_due | sve, žuta traka "Plaćanje nije uspjelo" 14 dana; poslije 14 dana kao paused |
| paused | čitanje, arhiva, izvoz; unos i generisanje blokirani s porukom |
| cancelled (grace) | čitanje i izvoz |
| deleted | 410 Gone |

Provjera je unutar `requireTenant()`, jedno mjesto (isti helper koji provjerava ulogu).

## 3. Računi i knjigovodstvo

- Stripe šalje račune kupcu automatski (uključiti "email invoices"). Na računu:
  WeeklyCert LLC, adresa registrovanog agenta u Wyomingu, bez PDV/sales tax
  linije dok nema nexusa.
- Mjesečni izvoz za knjigovođu u BiH: Stripe Balance report (CSV) + payout
  izvještaj. Prihod se knjiži po payoutu na račun LLC-a (Mercury ili Wise
  Business), ne po naplati.
- Stripe fee ≈ 2,9 % + 0,30 $ (US kartice) + 1,5 % za međunarodne. Računati 3,5 %
  prosječno.
- Za Form 5472: Stripe payouts na LLC račun nisu transakcija s povezanom stranom;
  isplata Mumi (distribucija) jeste i mora se evidentirati.

## 4. Kuponi i presale

- Presale postoji u tačno jednom obliku: **Founding Member, 147 $ jednokratno**,
  Payment Link (one_time), prije nego što proizvod postoji, najviše 20 firmi.
  Kupac time dobija prva 3 mjeseca pretplate i setup Basic. Kad proizvod krene,
  ručno se pravi standardna pretplata (79 $) s `trial_end` = datum lansiranja + 90
  dana i `subscriptions.is_founding = true`. To je do 20 ručnih akcija, ne vrijedi
  automatizovati. Kapija iz 12 broji ove uplate.
- Nema kupona ni popusta na mjesečnu cijenu. Jedina cijena je 79 $.
- Refund politika: pun povrat setup naknade ako ne isporučimo postavku u 10 radnih
  dana; pretplata bez povrata, otkaz bilo kad.

## 5. Testiranje

- Stripe test mod + `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- Test kartice: 4242 (uspjeh), 4000 0000 0000 0341 (pada pri naplati poslije
  triala), 4000 0000 0000 9995 (nedovoljno sredstava).
- Stripe Test Clocks za simulaciju: trial ističe → naplata → pad → retry → otkaz.
  Jedan Vitest integracioni test po scenariju koji šalje snimljene webhook
  događaje u naš handler i provjerava stanje tenanta.
- Idempotentnost: isti event dva puta → isto stanje, jedan email.

## 6. Šta NE raditi

- Ne pisati vlastitu logiku pokušaja naplate; Stripe Smart Retries.
- Ne čuvati brojeve kartica ni zadnje 4 (Stripe ih prikazuje u portalu).
- Ne mijenjati cijenu postojećim kupcima bez `price_cents` zamrzavanja; novi
  Price objekat za nove kupce, stari ostaju.
- Ne vezati funkcionalnost za broj radnika. Jedna cijena.
