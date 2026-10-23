# re:guide - HKU Recycling Helper

A local, English-language prototype for the AILT9019 team project. It answers a limited set of questions about **routine collection at HKU re Kiosk**, using the team's curated official-source research.

## Deploy to Vercel

The repository includes `vercel.json` and a dependency-free Node.js build script. The hosted app runs in the browser; Python is used only by the optional local server.

1. Sign in to Vercel and import this GitHub repository as a new project.
2. Use the repository root as the Root Directory and **Other** as the framework preset.
3. The repository config sets **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. No environment variables or API keys are needed. Deploy the project, then test the generated production URL.

To build locally with Node.js, run `npm run build`. Serve `dist/` with a static server to preview the exact hosted assets. The build copies the interface, both JSON files, and the official poster to the paths the app requests. It also refreshes tracked compatibility copies in `public/data/` and `public/sources/`, so direct hosting of the `public/` directory works. Edit the maintained files under `docs/research/hku-recycling/` and run `npm run build` before committing changes; do not edit the generated compatibility copies by hand. It does not deploy the Python server.

A Vercel deployment has not been confirmed merely because these configuration files exist. Use the actual deployment result for the public URL.

## Run the prototype

You need Python 3. No extra packages, API keys, or build step are required.

On macOS, you can also double-click `Start.command`, then open the Local URL printed in Terminal.

1. Download and extract the project folder, or clone the repository.
2. Open a terminal in the project folder containing `server.py`.
3. Run:

   ```sh
   python3 server.py
   ```

4. Open **http://127.0.0.1:8000** in your browser.
5. Stop the server with **Ctrl+C**.

If port 8000 is occupied, run `python3 server.py --port 8001` and open http://127.0.0.1:8001 instead. Open the server URL rather than double-clicking `index.html`; the app needs HTTP to load the JSON files.

On macOS, you can type `cd ` (including the space), drag the extracted project folder into Terminal, press Enter, and then run the command above.

## Check the result

| Question | Expected behaviour | Evidence |
|---|---|---|
| Where can I recycle a clean pizza box? | Paper category, with a source link. | R15 / S04 |
| How do I recycle a clean takeaway coffee cup? | Separate the lid, sleeve, and cup body. | R16 / S04 |
| Where can I recycle a battery? | Ask for the type, then condition where necessary. | R12-R14 / S03 |
| Where can I recycle a pizza box? | Ask whether it is clean; the buttons complete the lookup. | R15 / S04 |
| Where can I recycle a dirty pizza box? | Exclude it from the paper category in that condition. | R04 / S03 |
| Laboratory chemical waste in a plastic bottle | Refer to specialist guidance. | S07 |
| A ceramic mug | State that the item is not covered. | No supported item rule |

Open the link beneath a result and compare its cited section with the response. The **Our sources** tab lists the official sources, review notes, and original poster.

## What is implemented

- A responsive browser interface with English questions and example prompts.
- Local retrieval of rules from `docs/research/hku-recycling/knowledge_base.json`.
- A bounded set of English aliases, condition checks, component separation, and clarification buttons.
- Explicit handling of unknown items, unsupported locations, special events, and specialist waste.
- Source IDs and section locators on results, with a source catalog and local copy of the official poster.
- A permission-based nearest-published-bin finder with straight-line distance estimates and Google Maps walking directions.

**This version uses deterministic rule lookup. No AI model is connected.** Do not describe it as a completed AI or RAG system. An AI-based input parser is a possible next step; recommendations should continue to depend on the curated rules.

## Scope and known limitations

- Guidance covers **re Kiosk**, not every campus recycling bin. The research includes smart-bin records, but this interface does not make item recommendations for them.
- The locator compares eight published re Kiosk/smart-bin facility records, not every campus bin. Pins are approximate building coordinates sourced from OpenStreetMap through Mapcarta, not surveyed bin locations; access and live status are unverified. Browser location is used locally and only sent to Google Maps if directions are opened.
- The English parser uses explicit phrases. Typos, unfamiliar synonyms, negation, complex descriptions, and unrecognised locations may not be interpreted correctly. Results are explicitly scoped to re Kiosk.
- The rule base contains 22 grouped research records; coverage does not mean arbitrary natural language or every item within a material category is supported.
- Broad terms such as a bottle or a battery need clarification. A cleaning confirmation is not a material identification or an on-site inspection.
- Published guidance was reviewed on **19 October 2026**; current labels, bin capacity, equipment status, and temporary arrangements have not been verified on site.
- Photo input, multiple languages, special-event recommendations, and live facility status are outside this version.
- Query text is processed in the browser, is not stored by the app, and is not sent to an external AI API. Official links open external HKU sites when clicked.

## Validation

If Node.js and npm are available, run the workflow and static-build tests from the project folder:

```sh
npm test
```

These tests check retrieval, citations, clarification, exclusions, scope restrictions, and specialist referral. They do **not** establish independently measured recycling accuracy or replace checks against current official guidance and on-site labels. Actual validation results are recorded in `docs/validation.md`.

## Project structure

```text
server.py                         Local server, standard library only
public/index.html                 English interface
public/styles.css                 Responsive styling
public/app.mjs                    Data loading and accessible result rendering
public/engine.mjs                 Bounded lookup and clarification logic
public/locator.mjs                Local nearest-location calculation and Google Maps links
docs/research/hku-recycling/bin_locations.json
                                  Approximate building-level pins for published locations
tests/guide.test.mjs               Workflow and edge-case checks
docs/validation.md                Actual verification record
docs/demo-script.md               Suggested one-minute demonstration
docs/research/hku-recycling/       Source catalog, rule data, and official poster
```

## Research

Start with [the research pack](docs/research/hku-recycling/README.md). Source records and application design guardrails are kept separate. Updating a rule requires checking its official source and its facility scope.
