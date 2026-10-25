# re:guide - HKU Recycling Helper

A prototype for the AILT9019 team project. It answers a limited set of questions about **routine collection at HKU re Kiosk**, using the team's curated official-source research. A Node.js backend can use the school's Alibaba Cloud Bailian access to interpret English or Chinese input; recommendations and sources still come from the rule engine and answers remain in English.

## Configure the school's AI access

Use Node.js 22 or newer. No npm dependencies are required: the backend uses Node's built-in `fetch` with the OpenAI-compatible Chat Completions protocol.

1. Copy `.env.example` to `.env` in this project directory.
2. Fill in `BAILIAN_API_KEY` locally with the key emailed to Group 17. Keep the school-provided `BAILIAN_BASE_URL` and default `BAILIAN_MODEL=qwen3.8-flash` unless the teaching team changes them.
3. Run `npm start`, then open **http://127.0.0.1:8000**. `Start.command` starts the same Node server. To change the port, edit `PORT` in `.env`.
4. Submit a question. A successful AI-assisted response is labelled “AI interpreted your question”. Without a key, or if the provider fails, a notice identifies the fallback to the limited English rule lookup.

Starting again while this backend is running prints `Already running: http://127.0.0.1:8000` and exits successfully; use the existing page. The local `/api/health` identity check distinguishes this backend from an old Python server or another application. The original server's terminal must remain open. After changing `.env` or backend code, stop that server with Ctrl+C in its terminal before starting again.

The course Ed announcement #61 explicitly lists integration into course apps as a sponsored use case. Follow the teaching team's course arrangements. The emailed batch expires **19 November 2026** and the **25,000 credits are shared by the group**, not a number of requests. Check group usage at <https://ailt9019.cds.hku.hk/credits/>. Credentials must not be shared outside the group or committed to GitHub. `.env` and `.env.*` are ignored; `.env.example` contains no key. Only the backend reads the key. Never put secrets in `public/`, `dist/`, or browser code.

The maintained protocol reference is [Alibaba Cloud's Chat API](https://help.aliyun.com/en/model-studio/qwen-api-via-openai-chat-completions). Use the **Token Plan endpoint from the school email**, not the general pay-as-you-go endpoint shown in generic examples.

### Request flow and limits

`POST /api/guide` accepts `{ "question": "这个披萨盒还有油，能回收吗？" }` (1–600 characters). Clarification choices may also submit `cleanliness: "clean"` or `"dirty"`. The model returns a strictly validated, bounded set of item IDs and condition/scope flags; it cannot supply advice, sources, URLs, arbitrary lookup text, or a model name. The existing engine produces the answer and citations. Known English exclusions and safety/scope checks are retained before AI parsing. Missing conditions still trigger clarification.

The backend uses `qwen3.8-flash`, disables thinking, bounds output to 400 tokens, times out after 15 seconds, and never automatically retries. It allows one in-flight AI call and at most 12 starts per minute **per Node process**; the browser also disables repeated submission while waiting. HTTP 429 returns a retry hint and the browser uses the labelled rule fallback.

These in-memory limits are **not a group-wide or deployment-wide quota**: multiple serverless instances or deployments can run at once, and other group tools share the same credits. Keep course demos low-volume, use hosting access controls for group testing, and configure a shared limiter before opening the AI endpoint to broad public traffic. No such shared infrastructure is configured by this change.

The app does not persist query text or log requests or keys. Questions sent for AI interpretation are processed by Alibaba Cloud; its retention terms are separate from this application's storage behavior. The interface discloses this before submission. Model interpretations can be wrong; mocked tests do not establish live model accuracy.

## Deploy to Vercel

The repository includes `vercel.json`, a dependency-free static build, and the Node.js function `api/guide.mjs`. Static assets are served from `dist/`; `/api/guide` runs server-side.

1. Sign in to Vercel and import this GitHub repository as a new project.
2. Use the repository root as the Root Directory and **Other** as the framework preset.
3. The repository config sets **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. Add `BAILIAN_API_KEY` as a server environment variable in the intended Vercel deployment environment. Optionally set `BAILIAN_BASE_URL` and `BAILIAN_MODEL` to the values in `.env.example`; the backend uses those defaults when they are omitted. Do not add a public/browser prefix to these variables.
5. Deploy or redeploy after configuring the environment, then test the actual production URL. The function configuration includes the maintained research JSON. Without a key, the site still offers its labelled English rule fallback.

To build locally with Node.js, run `npm run build`. Serve `dist/` with a static server to preview the exact hosted assets. The build copies the interface, both JSON files, and the official poster to the paths the app requests. It also refreshes tracked compatibility copies in `public/data/` and `public/sources/`, so direct hosting of the `public/` directory works. Edit the maintained files under `docs/research/hku-recycling/` and run `npm run build` before committing changes; do not edit the generated compatibility copies by hand. It does not deploy the Python server.

A Vercel deployment has not been confirmed merely because these configuration files exist. Use the actual deployment result for the public URL.

## Run the static-only prototype (optional)

You need Python 3. No extra packages, API keys, or build step are required.

For AI access, use `npm start` as described above. The Python server below serves the static interface only; requests to the AI endpoint will use the labelled English-rule fallback.

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

- A responsive browser interface with example prompts, loading state, AI/rule-mode notices and an external-processing disclosure.
- A shared Node.js backend for local development and Vercel that interprets input using school-sponsored Bailian access when configured.
- Local retrieval of rules from `docs/research/hku-recycling/knowledge_base.json`.
- A bounded set of English aliases, condition checks, component separation, and clarification buttons.
- Explicit handling of unknown items, unsupported locations, special events, and specialist waste.
- Source IDs and section locators on results, with a source catalog and local copy of the official poster.

**AI interprets input; the deterministic engine produces recommendations and citations.** This is not an unrestricted chatbot or a vector-search RAG system. A real-key model call has not been verified merely because this integration code exists.

## Scope and known limitations

- Guidance covers **re Kiosk**, not every campus recycling bin. The research includes smart-bin records, but this interface does not make item recommendations for them.
- The fallback English parser uses explicit phrases. The AI parser can interpret English or Chinese when configured, but typos, unfamiliar synonyms, negation, complex descriptions, and unrecognised locations may still be misinterpreted. Results are explicitly scoped to re Kiosk.
- The rule base contains 22 grouped research records; coverage does not mean arbitrary natural language or every item within a material category is supported.
- Broad terms such as a bottle or a battery need clarification. A cleaning confirmation is not a material identification or an on-site inspection.
- Generic fast-food/takeaway boxes ask for material before cleanliness. An explicitly plastic takeaway box uses the existing R07 rule. Generic paper/cardboard and foam takeaway boxes have no verified item rule in this version, so they are not automatically classified as accepted paper or general waste.
- Published guidance was reviewed on **19 October 2026**; current labels, bin capacity, equipment status, and temporary arrangements have not been verified on site.
- Photo input, translated answers, special-event recommendations, and live facility status are outside this version. AI input interpretation and English answers are separate capabilities.
- Query text may be sent to the backend and Alibaba Cloud for interpretation. The app does not save query text. Official links open external HKU sites when clicked.

## Validation

If Node.js and npm are available, run the workflow and static-build tests from the project folder:

```sh
npm test
```

These tests check retrieval, citations, clarification, exclusions, scope restrictions, specialist referral, backend request validation, mocked AI parsing, error handling, concurrency limits and browser fallback. They make **no live model calls** and do **not** establish independently measured recycling accuracy or replace checks against current official guidance and on-site labels. Actual validation results are recorded in `docs/validation.md`.

## Project structure

```text
api/guide.mjs                     Vercel Node.js API entry point
lib/bailian.mjs                    Bounded AI extraction and validation
lib/guide-service.mjs              Rule-backed recommendations and request limits
lib/guide-handler.mjs              Shared HTTP validation and safe errors
scripts/dev-server.mjs             Local Node.js server (loads .env)
server.py                         Optional static-only Python server
public/index.html                 English interface
public/styles.css                 Responsive styling
public/app.mjs                    Data loading and accessible result rendering
public/guide-client.mjs            API requests and explicit rule fallback
public/engine.mjs                 Bounded lookup and clarification logic
tests/guide.test.mjs               Workflow and edge-case checks
docs/validation.md                Actual verification record
docs/demo-script.md               Suggested one-minute demonstration
docs/research/hku-recycling/       Source catalog, rule data, and official poster
```

## Research

Start with [the research pack](docs/research/hku-recycling/README.md). Source records and application design guardrails are kept separate. Updating a rule requires checking its official source and its facility scope.
