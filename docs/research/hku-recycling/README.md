# HKU Recycling Research Pack

Collected on 19 October 2026 (Hong Kong). Prepared as initial research for the AILT9019 campus recycling assistant. Public web pages and the official poster have been reviewed; facilities have not been checked on site.

## Key findings

1. **Distinguish re Kiosk, ordinary re Bins, and smart recycling bins.** Item-specific re Kiosk guidance must not be applied automatically to every campus facility. [Official facilities page](https://www.wastereduction.hku.hk/re-facilities)
2. **Material alone does not determine acceptance.** Composite materials, contamination, components, and location can change the answer. Coffee cups require separate treatment of the lid, sleeve, and cup body; personal care bottles require separate treatment of the bottle and pump. [Official Photo Guide](https://www.wastereduction.hku.hk/photo-guide)
3. **Start the prototype with re Kiosk.** Its six categories and comparatively detailed public guidance provide a practical basis for cited answers. This is a project scope recommendation, not a course requirement.

## Files

- `sources.json`: nine official source records with URLs, purposes, review status, and access dates.
- `knowledge_base.json`: 22 item rules, eight facility records, and five application guardrails. Factual entries include source IDs and section locators.
- `sources/hku-recycling-101-official.pdf`: the original poster downloaded from HKU. Page 1 was visually reviewed. The original bilingual document, attribution, and copyright are preserved.

All authored notes and structured data are in English. The original source PDF remains in its published form.

## Official sources

| ID | Source | Purpose |
|---|---|---|
| S01 | [HKU re Facilities](https://www.wastereduction.hku.hk/re-facilities) | Facility types, locations, and location-specific exceptions for smart bins. |
| S02 | [HKU Recycling 101](https://www.wastereduction.hku.hk/recycling-101) | Recycling guidance for re Kiosk and the official poster download. |
| S03 | [Recycling 101: The Correct Choices (official poster PDF)](https://www.wastereduction.hku.hk/_files/ugd/bccd45_652bab3854994da9a05b96ed09580df4.pdf) | Accepted and excluded examples across six material categories. |
| S04 | [HKU Recycling 101 Photo Guide](https://www.wastereduction.hku.hk/photo-guide) | Specific items and instructions for separating components at re Kiosk. |
| S05 | [HKU GreenU Reward Scheme](https://www.wastereduction.hku.hk/greenu-reward-scheme) | How the HKU App relates to the GreenU scheme. |
| S06 | [HKU Resources Circulation Event Schedules](https://www.wastereduction.hku.hk/resources-circulation-event-schedules) | Time-limited special recycling and reuse events. |
| S07 | [HKU Safety Office: Chemicals & Waste](https://safety.hku.hk/chemicals-waste) | Specialist services for laboratory chemical waste and clinical waste. |
| S08 | [HKU Estates Office: Facility Management](https://www.estates.hku.hk/eo-general/sustainability/sustainability-management/facility-management) | Background on waste management, material recycling, and food waste from campus catering. |
| S09 | [HKU Be a Campus Green Hero Online Quiz](https://www.wastereduction.hku.hk/be-a-campus-green-hero-quiz) | Cross-reference for recycling knowledge and smart-bin operating steps. |

## Suggested initial coverage

Use **re Kiosk** as the fixed facility for the first prototype. Consult the JSON for exact conditions and source locators.

| Input type | Documented handling | Source |
|---|---|---|
| Office paper, aluminium cans, glass beverage bottles | Check the corresponding paper, metal, or glass-bottle category and its restrictions. | S03, page 1, relevant category |
| Napkins, wax paper, toothpaste tubes | Excluded from the corresponding recycling category; do not infer another disposal route automatically. | S03, page 1, relevant category |
| Takeaway coffee cups | Separate components; the lid, sleeve, and cup body have different classifications. | S04, Take-away coffee cup |
| Personal care containers | Distinguish the clean bottle from the pump. | S04, Personal care container |
| Batteries | Distinguish portable household rechargeable batteries, single-use batteries, lead-acid batteries, and damaged items. | S03, Rechargeable Battery |

The poster lists exclusions for each category. Avoid replacing the documented rules with broad claims that all paper or all plastic is accepted.

## Location differences for smart bins

The smart-bin locations currently listed on the facilities page are recorded in the JSON. The page specifies exceptions for plastic bottles and glass bottles at Central Podium Levels and Pine Court. Category mappings follow that published list and still require comparison with on-site labels. [S01](https://www.wastereduction.hku.hk/re-facilities)

A published statement of 24-hour access does not confirm that a bin is operational, has capacity, or is physically accessible at the time of a query.

## Time limits and source differences

- The special collection page lists a **Hard-to-Recycle Items Collection Week at re Kiosk, 26-30 October 2026, 11:00-17:30**. This differs from routine collection. Full event-item coverage is not recommended for the initial prototype. [S06](https://www.wastereduction.hku.hk/resources-circulation-event-schedules)
- The routine Photo Guide excludes foil-lined snack packaging, while the special event page separately lists certain aluminium foil bags with material and cleaning conditions. The description is ambiguous; confirm individual cases with HKU rather than claiming that all snack bags are accepted.
- Q1 of the official quiz explicitly dates its facility count to **17 March 2026**. The current facilities page additionally lists Meng Wah Complex. Do not present the historical quiz count as the current total. [S09](https://www.wastereduction.hku.hk/be-a-campus-green-hero-quiz)
- The GreenU page explains the relationship between the HKU App and the reward scheme. Changing redemption rates, promotional multipliers, and rewards are outside the initial rule base. [S05](https://www.wastereduction.hku.hk/greenu-reward-scheme)

## Gaps requiring further checks

- **Ordinary re Bins:** the complete set of on-site locations and labels has not been extracted. Some location information appears in map images.
- **Smart-bin item details:** broad category lists do not establish acceptance of every composite or contaminated item.
- **Vague descriptions:** inputs such as dirty plastic, a battery, or a takeaway box require clarification of material, condition, and location.
- **Unlisted items:** absence from the dataset does not prove that an item is unrecyclable or belongs in general waste.
- **Laboratory chemical and clinical waste:** refer users to the [HKU Safety Office](https://safety.hku.hk/chemicals-waste). The project does not provide instructions for independent disposal.
- **Food waste:** the Estates Office describes campus catering food-waste processing, but this does not establish a student self-service drop-off facility. [S08](https://www.estates.hku.hk/eo-general/sustainability/sustainability-management/facility-management)

## Next research steps

1. Photograph the current category labels and preparation requirements at re Kiosk. Record the date and avoid capturing other people's personal information.
2. Compare the labels with the poster, especially for paper cups, composite packaging, and rechargeable batteries.
3. Select the first 5-10 supported item types. Include unknown location, unknown condition, and missing-rule cases in clarification scenarios.
4. If special events are added later, store their validity periods separately from routine collection rules.

## Data conventions

- Schema version 2 uses `items_en` instead of the previous `items_zh` field. Both JSON files declare English with `language: "en"`.
- Source IDs, rule IDs, facility IDs, category codes, decisions, dates, and verification flags are retained.
- `not_accepted` applies to the documented facility and category; it is not a universal disposal decision.
- Application guardrails are project design choices, explicitly separated from official policy.

These files are research and initial development data. They are not a deployed system, evidence of passing tests, or evidence of on-site verification.
