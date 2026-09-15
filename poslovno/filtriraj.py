"""
Filtrira njujorški registar izvođača za javne radove u dvije ciljne liste.

KORAK 1. Skini CSV (besplatno, bez registracije):
    https://data.ny.gov/api/views/i4jv-zkey/rows.csv?accessType=DOWNLOAD
    Snimi ga u ovaj folder kao ny-registar.csv

KORAK 2. Pokreni:
    python filtriraj.py

Pravi dva fajla:
    lista-zlatna.csv   firme s pripravničkim programom. Najsloženiji obračun,
                       najviše gube ako pogriješe. Ovdje se počinje.
    lista-sira.csv     ostatak aktivnih, za drugi krug.

Ne šalje ništa i ne traži internet. Samo čita i piše.
"""
import sys, csv, re, pathlib, collections, datetime

for _t in (sys.stdout, sys.stderr):
    try: _t.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

ULAZ = pathlib.Path(__file__).resolve().parent / "ny-registar.csv"


def kljuc(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def nadji(zaglavlja, *dijelovi):
    """Nađe kolonu bez obzira kako je tačno nazvana u izvozu."""
    for h in zaglavlja:
        k = kljuc(h)
        if all(kljuc(d) in k for d in dijelovi):
            return h
    return None


def je_da(v):
    return kljuc(v) in ("yes", "y", "true", "1", "da")


def main():
    if not ULAZ.exists():
        print(f"Nema fajla: {ULAZ.name}")
        print("Skini ga sa: https://data.ny.gov/api/views/i4jv-zkey/rows.csv?accessType=DOWNLOAD")
        return

    with ULAZ.open(encoding="utf-8-sig", newline="") as f:
        red = list(csv.DictReader(f))
    if not red:
        print("Fajl je prazan.")
        return

    H = list(red[0].keys())
    C = {
        "naziv":    nadji(H, "business", "name") or nadji(H, "name"),
        "dba":      nadji(H, "dba"),
        "adresa":   nadji(H, "address"),
        "grad":     nadji(H, "city"),
        "zip":      nadji(H, "zip"),
        "telefon":  nadji(H, "phone"),
        "status":   nadji(H, "status"),
        "istek":    nadji(H, "expiration"),
        "cert":     nadji(H, "certificate"),
        "prip":     nadji(H, "apprenticeship") or nadji(H, "apprentice"),
        "javna":    nadji(H, "publicly", "traded"),
        "zabrana":  nadji(H, "debarred"),
        "nalozi":   nadji(H, "outstanding", "wage"),
        "prekrsaj": nadji(H, "final", "determination", "labor"),
    }
    fale = [k for k, v in C.items() if v is None]
    if fale:
        print(f"UPOZORENJE: nisam našao kolone {fale}. Nastavljam bez njih.")
        print(f"Zaglavlja u fajlu: {H}\n")

    danas = datetime.date.today()

    def polje(r, k):
        c = C.get(k)
        return (r.get(c) or "").strip() if c else ""

    def vazi_registracija(r):
        s = polje(r, "istek")
        if not s: return True
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%Y %H:%M:%S %p"):
            try: return datetime.datetime.strptime(s[:26], fmt).date() >= danas
            except ValueError: continue
        return True

    br = collections.Counter()
    zlatna, sira, vidjeni = [], [], set()

    for r in red:
        br["ukupno"] += 1
        if kljuc(polje(r, "status")) != "active":
            br["nije aktivan"] += 1; continue
        if not vazi_registracija(r):
            br["registracija istekla"] += 1; continue
        if je_da(polje(r, "javna")):
            br["javno preduzece"] += 1; continue
        if je_da(polje(r, "zabrana")):
            br["zabranjen rad"] += 1; continue

        ident = polje(r, "cert") or kljuc(polje(r, "naziv")) + kljuc(polje(r, "zip"))
        if ident in vidjeni:
            br["duplikat"] += 1; continue
        vidjeni.add(ident)

        tel = re.sub(r"\D", "", polje(r, "telefon"))
        izlaz = {
            "naziv": polje(r, "naziv"),
            "dba": polje(r, "dba"),
            "adresa": polje(r, "adresa"),
            "grad": polje(r, "grad"),
            "zip": polje(r, "zip"),
            "telefon": tel,
            "istek_registracije": polje(r, "istek")[:10],
            "pripravnicki_program": "da" if je_da(polje(r, "prip")) else "ne",
            "imao_nalog_za_nadnice": "da" if je_da(polje(r, "nalozi")) else "ne",
            "raniji_prekrsaj": "da" if je_da(polje(r, "prekrsaj")) else "ne",
            "sajt": "", "email": "", "status_kontakta": "", "biljeska": "",
        }
        if izlaz["pripravnicki_program"] == "da":
            zlatna.append(izlaz); br["ZLATNA"] += 1
        else:
            sira.append(izlaz); br["sira"] += 1

    def snimi(ime, podaci):
        if not podaci: return
        p = ULAZ.parent / ime
        with p.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(podaci[0].keys()))
            w.writeheader(); w.writerows(podaci)
        print(f"  {ime:22s} {len(podaci):6d} firmi")

    print("=" * 58)
    print("FILTER")
    print("=" * 58)
    for k in ("ukupno", "nije aktivan", "registracija istekla", "javno preduzece",
              "zabranjen rad", "duplikat", "ZLATNA", "sira"):
        if br[k]: print(f"  {k:24s} {br[k]:6d}")

    print("\nFAJLOVI")
    snimi("lista-zlatna.csv", zlatna)
    snimi("lista-sira.csv", sira)

    stel = sum(1 for x in zlatna + sira if len(x["telefon"]) >= 10)
    print(f"\n  s telefonom: {stel} od {len(zlatna) + len(sira)}")
    print("\nKolone sajt, email, status_kontakta i biljeska su prazne namjerno.")
    print("Njih puniš u sljedećem koraku, i one su ti evidencija kome si pisao.")


if __name__ == "__main__":
    main()
