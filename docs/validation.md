# First-prototype validation

Date: 19 October 2026 (Hong Kong).

## Automated workflow checks

Command: `node --test tests/guide.test.mjs`

**Result: 60 passed, 0 failed.** The final code was tested using the actual research JSON files.

Coverage includes accepted and excluded items, component separation, missing cleanliness, battery type and condition, unknown items, multiple-item queries, conflicting cleanliness descriptions, damaged glass, mixed materials, unsupported collection points, special-event scope, and specialist-waste referral. Citation IDs and URLs are checked against the source catalog.

The set includes 20 initial ordinary-item examples and three specialist-referral examples, followed by additional edge cases and clarification-flow tests. Expected results were written for the documented prototype workflow. These are **not** an independent recycling-policy assessment, a measured 90% accuracy result, or student usability testing.

## Browser checks

The local app was loaded in the Codex in-app browser and the following interactions were checked against the visible result:

| Check | Observed result |
|---|---|
| Clean pizza-box example | Paper category, condition, and Photo Guide citation displayed. |
| Clean takeaway coffee-cup example | Lid, sleeve, and cup-body classifications displayed separately. |
| Generic battery example | Asked for type, then condition; confirming an intact portable household rechargeable battery produced the documented category. |
| Manually typed `pizza box` | Asked about cleanliness. |
| Selecting `No, residue remains` | Excluded the item from the paper category in that condition. |
| Laboratory chemical waste in a plastic bottle | Referred to the HKU Safety Office instead of recommending plastic recycling. |
| Our sources | All nine source records and the local poster link were present. |
| About | Deterministic lookup, no connected AI model, and scope limitations were visible. |

Desktop layout was reviewed at a 1280 x 900 viewport and mobile layout at 390 x 844. No horizontal document overflow was reported by the browser at either size. Full-page screenshots were visually reviewed. No error-level browser console entries were reported during the checks.

- [Desktop preview](preview-desktop.jpg)
- [Mobile preview](preview-mobile.jpg)

## Limits of this verification

This record verifies the local prototype's implementation and selected interactions. It does not establish live bin availability, current on-site labels, unrestricted natural-language understanding, external-source uptime, or successful operation on every device. No student usability sessions have been carried out as part of this implementation.

## HTTP checks

All seven required page, JavaScript, CSS, JSON, and PDF routes returned HTTP 200. JavaScript MIME types, JSON parsing, and the PDF header were checked. Three non-public or traversal routes returned HTTP 404.

## Vercel deployment preparation - 20 October 2026

The dependency-free Node build completed successfully. All seven required output assets were present. Both JSON files parsed correctly and matched the research originals; the hosted PDF matched the original bytes. The updated browser module passed Node's syntax check. The rule engine was unchanged.

This verifies static deployment readiness only. Vercel account authorization and a successful production deployment still need to be confirmed.

## Vercel missing-data repair - 20 October 2026

The production browser reported HTTP 404 for `/data/knowledge_base.json`, preventing the interface from enabling queries. The old error text also incorrectly instructed online visitors to start Python.

The build now refreshes tracked `public/data/` and `public/sources/` compatibility assets as well as `dist/`. Both supported static hosting layouts include the browser-requested resources. Online loading failures now offer a refresh and official guidance instead of local-server instructions.

Validation: **64 tests passed, 0 failed**, comprising the existing 60 workflow checks and four new static-resource packaging checks. The packaging checks extract local URLs from the browser source and verify that they are bundled; JSON and PDF copies are compared with the maintained research files. This does not establish independent recycling accuracy. Production verification must be recorded separately after deployment.
