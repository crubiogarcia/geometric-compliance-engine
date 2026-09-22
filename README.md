# Geometric Compliance Engine

Open a building model in your browser and see which doors break the building code.

Geometric Compliance Engine is a web viewer for IFC building models, with an experimental system that checks the model against building-code rules. An AI model (Google Gemini) reads a building-code PDF and turns its requirements into rules a computer can check. The app then compares the doors in your model with those rules and highlights every door that fails in red, in 3D.

It was built and tested with the Spanish accessibility code **DB SUA** (Documento Básico de Seguridad de Utilización y Accesibilidad).

> **Status:** experimental. Only doors are checked so far, and the viewer shows a saved report rather than checking each model live (see [How the compliance check works](#how-the-compliance-check-works)).

## What it does

- **View IFC models** in the browser. Viewing happens entirely on your computer; the model is only sent to your own local server when you click **Check Compliance**.
- **Show or hide element types** (walls, doors, windows and so on) with checkboxes.
- **Turn a building code into rules:** Gemini reads the code PDF, finds the sections about doors and writes them as structured rules (for example, "minimum clear width: 800 mm").
- **Check the model:** every door's size is compared with the rules, and doors that fail are highlighted in red.

## Built with

- **Frontend:** JavaScript, [Three.js](https://threejs.org), [web-ifc-viewer](https://github.com/ThatOpen/web-ifc-viewer), [Vite](https://vitejs.dev)
- **Backend:** Python, [Flask](https://flask.palletsprojects.com), [IfcOpenShell](https://ifcopenshell.org)
- **AI:** Google Gemini

## Before you start

You'll need:

- **Node.js 18 or newer** (includes npm)
- **Python 3.10 or newer**
- **A Gemini API key**, but only if you want to create new rules yourself (step 3). You can get one free at [ai.google.dev](https://ai.google.dev).

Some files aren't in this repository because of their size or licence, so add your own:

| Folder | What to put there |
|---|---|
| `sample_files_ifc/` | Any `.ifc` building models you want to test |
| `backend/pdf-test/` | The building-code PDF. The scripts look for `DBSUA.pdf`; to use another file, change the file name at the top of the scripts. |
| `fonts/` | Optional. The interface font used in `style.css`. Without it, the browser uses a standard font. |
| `backend/.env` | Your Gemini API key (see step 2) |

## Step 1: Run the viewer

In the project folder, run:

```bash
npm install
npm run dev
```

Open the address Vite shows (usually http://localhost:5173), click **Upload IFC File** and pick an `.ifc` model. Use the checkboxes to show or hide element types, or **All** and **None** to toggle everything at once.

That's all you need to explore a model. Steps 2 and 3 are only needed for the **Check Compliance** button.

## Step 2: Run the compliance server

Open a second terminal, go to the `backend` folder and set up Python:

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install flask flask-cors ifcopenshell python-dotenv google-genai
```

Create a file called `.env` inside `backend` with your key:

```
GEMINI_API_KEY=your_api_key_here
```

This file is private and is never uploaded to GitHub.

Start the server:

```bash
python app.py
```

It runs at http://localhost:5000. Keep it running alongside the viewer. Now upload a model, click **Check Compliance**, and any door that fails a rule turns red.

## How the compliance check works

The check has two parts.

**1. Creating the report (done in advance).** Four scripts, run one after the other, produce a report of which doors pass and fail:

```
IFC model ──► door sizes ──┐
                           ├──► check ──► compliance report
Code PDF ──► AI rules ─────┘
```

**2. Showing the report (in the viewer).** When you click **Check Compliance**, the server sends back the saved report and the viewer highlights the failing doors.

This means the result doesn't change with the model you upload: you always see the most recent saved report. To check a different model or code, create a new report (step 3).

## Step 3: Create a new report

From the `backend` folder, with the Python environment from step 2 active, run these in order:

```bash
python ifc_parser.py             # 1. Reads the door sizes from the IFC model
python building_code_parser.py   # 2. Gemini finds the door sections in the code PDF
python rule_generator.py         # 3. Gemini turns those sections into rules
python rule_checker.py           # 4. Checks every door and writes the report
```

| Script | Reads | Writes |
|---|---|---|
| `ifc_parser.py` | The IFC model in `sample_files_ifc/` | `extracted_data/door_data.json` |
| `building_code_parser.py` | The PDF in `pdf-test/` | `extracted_data/door_sections.json` |
| `rule_generator.py` | The PDF and the door sections | `extracted_data/door_rules.json` |
| `rule_checker.py` | The door data and the rules | `report/compliance_report.json` |

To use a different model or PDF, change the file name at the top of `ifc_parser.py`, `building_code_parser.py` and `rule_generator.py`.

Steps 2 and 3 call Gemini, so they need your API key. Running step 4 replaces the previous report.

## Project structure

```
geometric-compliance-engine/
├─ index.html                  Page layout
├─ main.js                     3D scene, model loading and red highlighting
├─ style.css                   Styling
├─ generate-checkboxes.js      Builds the list of element-type checkboxes
├─ src/
│  ├─ ifc-categories-config.js    Groups IFC element types into categories
│  └─ ifc-utils.js                Shows and hides each category in 3D
├─ public/wasm/                Files the IFC loader needs to run in the browser
└─ backend/
   ├─ app.py                      The server the viewer talks to
   ├─ ifc_parser.py               Reads door data from a model
   ├─ building_code_parser.py     Finds the relevant sections of the code (Gemini)
   ├─ rule_generator.py           Turns those sections into rules (Gemini)
   ├─ rule_checker.py             Checks the doors against the rules
   ├─ helpers.py                  Helper functions for the rules
   ├─ parsed_ifc_schema.json      The door properties Gemini may use in rules
   ├─ logic_template.json         The format each rule must follow
   ├─ extracted_data/             Door data, code sections and rules
   └─ report/                     The compliance report shown in the viewer
```

## Known issues

- **The Vite config file name has a typo** (`vite.congig.js`), so Vite ignores it. The app still works. If the browser shows cross-origin errors when loading models, rename it to `vite.config.js`.
- **One library isn't listed in `package.json`.** The code uses `web-ifc-three`, which currently gets installed along with `web-ifc-viewer`. If `npm install` ever leaves it out, run:
  ```bash
  npm install three@0.135.0 web-ifc-three@0.0.125 web-ifc@0.0.39
  ```
- **There's no `requirements.txt` yet.** The Python packages in step 2 were worked out from the code's imports.
