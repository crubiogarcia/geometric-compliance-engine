# Geometric Compliance Engine

A browser-based IFC viewer with an experimental compliance-checking pipeline.
The frontend (Three.js + web-ifc-three) loads an `.ifc` model client-side and
lets you toggle element categories on and off. The backend (Flask +
ifcopenshell) can check a set of pre-generated, LLM-derived building-code
rules against the doors in the model and report violations back to the
viewer, where they're highlighted red in the 3D scene.

## Project structure

```
geometric-compliance-engine/
├─ index.html                 Frontend entry point
├─ main.js                    Scene setup, IFC loading, compliance highlighting
├─ style.css                  Styling (uses local fonts in /fonts)
├─ generate-checkboxes.js     Builds the category checkbox list
├─ src/
│  ├─ ifc-categories-config.js   IFC class → category mapping
│  └─ ifc-utils.js               Builds per-category visual subsets
├─ public/wasm/                web-ifc WASM binaries (served at /wasm/)
├─ sample_files_ifc/           Your .ifc models to test with (not included)
├─ fonts/                      Optional local fonts for style.css (not included)
└─ backend/
   ├─ app.py                       Flask server (parse-ifc, check-compliance)
   ├─ ifc_parser.py                Extracts door data from an .ifc file
   ├─ building_code_parser.py      Gemini: extracts relevant clauses from a code PDF
   ├─ rule_generator.py            Gemini: turns clauses into structured rules
   ├─ rule_checker.py              Checks door data against generated rules
   ├─ helpers.py                   Rule-filtering utilities
   ├─ parsed_ifc_schema.json       Schema the LLM is allowed to reason with
   ├─ logic_template.json          Target JSON shape for generated rules
   ├─ pdf-test/                    Your building-code PDF(s) (not included)
   ├─ extracted_data/              Output of the offline extraction scripts
   ├─ report/                      compliance_report.json, read by the API
   └─ .env                         GEMINI_API_KEY (never commit this file)
```

## Files not included in this repo

A few folders are git-ignored because of file size or licensing, so you need
to supply your own:

- `sample_files_ifc/` — any `.ifc` building models to test with.
- `backend/pdf-test/` — the building-code PDF the pipeline reads
  (the scripts expect `DBSUA.pdf`; change the path to use another file).
- `fonts/` — the UI font files referenced in `style.css`. Without them the
  browser falls back to a default font; everything else works.
- `backend/.env` — your own API key (see Part 2).

## Requirements

- Node.js (18+) and npm
- Python 3.10+ and pip
- A Gemini API key, only needed if you want to regenerate the compliance
  rules yourself (see Part 3) — [ai.google.dev](https://ai.google.dev)

## Part 1 — Frontend

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`). Click
**Upload IFC File** and pick any `.ifc` model. Sample models aren't included
in this repo; put your own in `sample_files_ifc/` (the folder is git-ignored).
The category checkboxes let you show/hide element types; **All** / **None**
toggle everything at once.

This is enough to explore the model. The next parts are only needed if you
also want the **Check Compliance** button to work.

## Part 2 — Backend (compliance API)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install flask flask-cors ifcopenshell python-dotenv google-genai
```

Create `backend/.env` (this file is git-ignored and must never be committed):

```
GEMINI_API_KEY=your_api_key_here
```

Run the server:

```bash
python app.py
```

It listens on `http://localhost:5000`. Keep this running alongside the
frontend (`npm run dev`) — `main.js` calls it directly at that address.

With both running: upload an IFC file, click **Check Compliance**, and any
doors that fail a rule are highlighted red in the model.

### Important: the API serves a pre-generated report

`POST /api/check-compliance` does **not** run the LLM pipeline live per
request — it just reads `backend/report/compliance_report.json` and returns
whichever doors are marked `"status": "FAIL"` in there. Whatever file you
upload, you'll get back the violations from that same saved report. To see
different results, you need to regenerate the report — see Part 3.

`POST /parse-ifc` is separate and does parse the uploaded file live with
ifcopenshell, returning basic door data (no compliance logic).

## Part 3 — Regenerating the compliance report

This is the offline pipeline that produces `report/compliance_report.json`.
Each script is a standalone Python file (not a Flask route) — run them in
order from inside `backend/`, with the venv from Part 2 active:

```bash
python ifc_parser.py             # → extracted_data/door_data.json
python building_code_parser.py   # → extracted_data/door_sections.json  (calls Gemini)
python rule_generator.py         # → extracted_data/door_rules.json     (calls Gemini)
python rule_checker.py           # → report/compliance_report.json
```

Notes:

- `ifc_parser.py` and `rule_generator.py`/`building_code_parser.py` currently
  point at hardcoded paths near the top of each file (an IFC model and
  `backend/pdf-test/DBSUA.pdf`). Edit those paths if you want to run the
  pipeline against a different model or a different building-code PDF.
- `building_code_parser.py` and `rule_generator.py` both call the Gemini API
  and need `GEMINI_API_KEY` set in `.env`.
- Re-running `rule_checker.py` overwrites `report/compliance_report.json`,
  which is what the frontend's Check Compliance button reads.

## Known quirks

- **`vite.congig.js` has a typo** (missing "f" in "config"), so Vite does not
  actually load it — the COOP/COEP headers it sets never take effect. The
  `/wasm/` path still resolves correctly by coincidence (it matches Vite's
  default `public/` behaviour), but if you hit cross-origin-isolation issues
  with the multi-threaded WASM build, rename the file to `vite.config.js`.
- **`package.json` only lists `three`, `vite`, and `web-ifc-viewer`** as
  dependencies, but `main.js` imports `web-ifc-three` directly. This works
  today because `web-ifc-viewer` pulls in `web-ifc-three` as a transitive
  dependency, but it's fragile. If `npm install` ever leaves `web-ifc-three`
  unresolved, install the known-working versions explicitly:
  ```bash
  npm install three@0.135.0 web-ifc-three@0.0.125 web-ifc@0.0.39
  ```
- There's no `requirements.txt` for the backend yet — the package list in
  Part 2 is inferred from the imports in `backend/*.py`. Worth freezing with
  `pip freeze > requirements.txt` once the venv is confirmed working.
