import base64, json, pathlib, urllib.request, uuid

# load .env
env = {}
with open(".env") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

supabase_url = env["VITE_SUPABASE_URL"].rstrip("/")
anon_key = env["VITE_SUPABASE_ANON_KEY"]
service_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
if not service_key:
    raise SystemExit("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

files = [
    {
        "path": "docs/Demo NDA AL.docx",
        "contractType": "non_disclosure_agreement",
        "solution": {"id": "nda", "key": "nda", "title": "Non-Disclosure Agreement"},
        "perspective": "disclosing-party",
    },
    {
        "path": "docs/5-Appendix-Non-Disclosure-Agreement-Mutual.pdf",
        "contractType": "non_disclosure_agreement",
        "solution": {"id": "nda", "key": "nda", "title": "Non-Disclosure Agreement"},
        "perspective": "disclosing-party",
    },
    {
        "path": "docs/exempel-2.docx",
        "contractType": "non_disclosure_agreement",
        "solution": {"id": "nda", "key": "nda", "title": "Non-Disclosure Agreement"},
        "perspective": "disclosing-party",
    },
    {
        "path": "docs/dpa.pdf",
        "contractType": "data_processing_agreement",
        "solution": {"id": "dpa", "key": "dpa", "title": "Data Processing Agreement"},
        "perspective": "data-controller",
    },
]

MIME_BY_EXT = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
}

results = []

for entry in files:
    path = pathlib.Path(entry["path"])
    if not path.exists():
        results.append({"path": entry["path"], "error": "file-not-found"})
        continue

    ext = path.suffix.lower()
    mime = MIME_BY_EXT.get(ext)
    if not mime:
        results.append({"path": entry["path"], "error": f"unsupported-extension:{ext}"})
        continue

    data = path.read_bytes()

    ingestion_id = str(uuid.uuid4())
    rest_url = supabase_url + "/rest/v1/contract_ingestions"
    record = {
        "id": ingestion_id,
        "status": "uploaded",
        "storage_bucket": "ingestions",
        "storage_path": f"manual/{ingestion_id}/{path.name}",
        "original_name": path.name,
        "mime_type": mime,
        "file_size": len(data),
    }

    try:
        req = urllib.request.Request(
            rest_url,
            data=json.dumps(record).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Prefer": "return=representation",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except Exception as exc:
        results.append({"path": entry["path"], "error": f"ingestion-record:{exc}"})
        continue

    prefix = "DOCX_FILE_BASE64:" if ext == ".docx" else "PDF_FILE_BASE64:"
    content_b64 = prefix + base64.b64encode(data).decode()

    ingest_url = supabase_url + "/functions/v1/ingest-contract"
    try:
        req = urllib.request.Request(
            ingest_url,
            data=json.dumps(
                {
                    "ingestionId": ingestion_id,
                    "content": content_b64,
                    "fileType": mime,
                    "fileName": path.name,
                    "documentFormat": ext.lstrip("."),
                    "contractType": entry["contractType"],
                }
            ).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {anon_key}",
                "apikey": anon_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            ingest_body = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        results.append(
            {"path": entry["path"], "error": f"ingest-contract:{exc}", "ingestionId": ingestion_id}
        )
        continue

    extract_url = supabase_url + "/functions/v1/extract-clauses"
    try:
        req = urllib.request.Request(
            extract_url,
            data=json.dumps(
                {
                    "ingestionId": ingestion_id,
                    "contractType": entry["contractType"],
                    "forceRefresh": False,
                }
            ).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {anon_key}",
                "apikey": anon_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            resp.read()
    except Exception as exc:
        results.append(
            {"path": entry["path"], "error": f"extract-clauses:{exc}", "ingestionId": ingestion_id}
        )
        continue

    analyze_url = supabase_url + "/functions/v1/analyze-contract"
    try:
        req = urllib.request.Request(
            analyze_url,
            data=json.dumps(
                {
                    "ingestionId": ingestion_id,
                    "reviewType": "full_summary",
                    "model": "openai-gpt-5-nano",
                    "contractType": entry["contractType"],
                    "perspective": entry["perspective"],
                    "selectedSolution": entry["solution"],
                }
            ).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {anon_key}",
                "apikey": anon_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=240) as resp:
            body = resp.read()
    except Exception as exc:
        results.append(
            {"path": entry["path"], "error": f"analyze-contract:{exc}", "ingestionId": ingestion_id}
        )
        continue

    out_name = f"{path.stem.replace(' ', '_')}-analysis.json"
    out_path = pathlib.Path("/tmp") / out_name
    out_path.write_bytes(body)

    results.append(
        {
            "path": entry["path"],
            "ingestionId": ingestion_id,
            "clausesCached": ingest_body.get("clausesCached"),
            "output": str(out_path),
        }
    )

print(json.dumps(results, indent=2))
