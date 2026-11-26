# DeepBench v7.0.1124 | docs/design/agt-816-market-load.py | AGT-816 -- the one-time loader that built public.market_agencies (2026-11-26, design-bill-1125).
# Inputs (public, downloaded on John's OK): Census Govt_Units_2022_Final.xlsx, CISA dotgov current-full.csv, Census 2022FinEstDAT_*.txt + Fin_PID_2022.txt.
# Spend = sum of item codes starting E,F,I,J,L,M,Q,S (thousands); operating = E codes. Credentials by name from runner_secrets, inline; never in this file.
import sys, json, re, csv, collections, openpyxl, urllib.request, os
xlsx, govcsv, findat, finpid, out = sys.argv[1:6]
# --- spend per finance ID
ops, tot = collections.Counter(), collections.Counter()
SPEND = set("EFIJLMQS")
with open(findat, encoding="latin-1") as f:
    for line in f:
        fid, code, amt = line[0:12], line[12:15], line[15:27].strip()
        if not amt or code[0] not in SPEND: continue
        a = int(amt)
        tot[fid] += a
        if code[0] == "E": ops[fid] += a
pid2fin = {}
with open(finpid, encoding="latin-1") as f:
    for line in f:
        fid = line[0:12]; pid2fin[(fid[0:2], fid[6:12])] = fid
# --- websites from .gov list
def core(name):
    n = re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace("&", "AND"))
    n = re.sub(r"\b(CITY|TOWN|TOWNSHIP|VILLAGE|BOROUGH|COUNTY|PARISH|OF|THE|CHARTER|MUNICIPALITY|CONSOLIDATED|GOVERNMENT|METRO)\b", " ", n)
    return " ".join(n.split())
gov = {}
with open(govcsv, newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        t = (r["Domain type"] or "").lower()
        cls = "county" if "county" in t else "city" if "city" in t else "school" if "school" in t else "special" if "special" in t else None
        if cls: gov.setdefault((r["State"], cls, core(r["Organization name"])), r["Domain name"])
# --- crawl results already made (sales_records kind agency, checked)
url = os.environ["SUPABASE_URL"].rstrip("/"); key = os.environ["SUPABASE_SERVICE_KEY"]
req = urllib.request.Request(url + "/rest/v1/sales_records?kind=eq.agency&data->>checked_at=not.is.null&select=data", headers={"apikey": key, "Authorization": "Bearer " + key})
crawled = {r["data"]["key"].split(":",1)[1]: r["data"] for r in json.load(urllib.request.urlopen(req))}
TYPE = {"1":"county","2":"municipality","3":"township"}
wb = openpyxl.load_workbook(xlsx, read_only=True); n = collections.Counter()
with open(out, "w", encoding="utf-8") as o:
    for ws in wb.worksheets:
        it = ws.iter_rows(values_only=True); hdr = next(it)
        for v in it:
            r = dict(zip(hdr, v))
            if not r.get("UNIT_NAME") or r.get("IS_ACTIVE") != "Y": continue
            sh = ws.title
            if sh == "General Purpose":
                c = str(r.get("UNIT_TYPE") or "").split(" ")[0]; typ = TYPE.get(c, "state" if c == "0" else "general"); cls = "county" if typ == "county" else "city"
            elif sh == "Special District": typ, cls = "special district", "special"
            else: typ, cls = "school district", "school"
            pid6 = str(r.get("CENSUS_ID_PID6") or "").zfill(6) if r.get("CENSUS_ID_PID6") else None
            gid = r.get("CENSUS_ID_GIDID") or ("pid" + str(r.get("CENSUS_ID_PID6")))
            fid = pid2fin.get((str(r.get("FIPS_STATE") or "").zfill(2), pid6)) if pid6 else None
            web = (r.get("WEB_ADDRESS") or "").strip() or None
            dom = gov.get((r["STATE"], cls, core(r["UNIT_NAME"])))
            site, src = (web, "census") if web else ((f"https://{dom}", "dotgov") if dom else (None, None))
            row = {"census_gid": gid, "census_pid6": pid6, "census_fin_id": fid, "state": r["STATE"], "name": r["UNIT_NAME"].title(),
                   "unit_type": typ, "function_name": (str(r["FUNCTION_NAME"]).split(" - ",1)[-1].title() if r.get("FUNCTION_NAME") else None),
                   "county": (r.get("COUNTY_AREA_NAME") or None) and str(r["COUNTY_AREA_NAME"]).title(), "city": (r.get("CITY") or None) and str(r["CITY"]).title(),
                   "population": r.get("POPULATION"), "population_year": r.get("POPULATION_YEAR"),
                   "enrollment": r.get("ENROLLMENT"), "enrollment_year": r.get("ENROLLMENT_YEAR"),
                   "spend_year": 2022 if fid and tot.get(fid) else None, "spend_total_k": tot.get(fid) if fid else None, "spend_operating_k": ops.get(fid) if fid else None,
                   "spend_source": "Census 2022 Government Finance, individual unit file" if fid and tot.get(fid) else None,
                   "website_url": site, "website_status": "yes" if site else "not-yet", "website_source": src}
            cr = crawled.get(gid)
            if cr:
                row["website_status"] = cr.get("website_found") or row["website_status"]
                if cr.get("website_found") == "yes" and cr.get("website_url"): row["website_url"] = cr["website_url"]; row["website_source"] = row["website_source"] or "crawl"
                row["bid_page_status"] = cr.get("solicitations_searched") if cr.get("solicitations_searched") in ("yes","no") else "not-yet"
                row["bid_page_url"] = cr.get("solicitations_page"); row["last_reviewed_at"] = cr.get("checked_at")
                n["crawled"] += 1
            n["total"] += 1; n["spend"] += 1 if row["spend_total_k"] else 0; n["site"] += 1 if row["website_url"] else 0
            o.write(json.dumps(row) + "\n")
print(json.dumps(dict(n)))
