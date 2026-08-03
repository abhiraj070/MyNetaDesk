# Political Journey — Data Acquisition Plan (Task 2)

**Status:** plan + data acquisition in progress. No backend models, APIs or
migrations yet.

> **MVP scope (2026-08-03).** Build only what the current UI renders, end to
> end, before any durability infrastructure. **Deferred until v1 works:**
> `source_records` / raw-HTML snapshots, content hashing, audit trails,
> confidence tiers, the `manual_overrides` table, and the review queue.
> Where those appear below they are marked *(deferred)* and kept only because
> the reasoning for them will still be valid when we come back to it.
> **In scope now:** the identity spine, career milestones, the 14 wealth
> fields, and the merge. See §8 for the trimmed build order.

**Scope:** exactly the data needed to power the Overview and Political Journey
tabs for the 31 rows in `chief_ministers` and the 85 rows in `ministers`.
Family, biography, personal life, contact, social, news, speeches,
achievements and manifesto verification are explicitly out of scope.

Everything below was verified against the live sources on 2026-08-03 rather
than assumed; the specific page structures, field names and failure modes
quoted are real observations, and the ones that overturn an obvious guess are
marked **⚠ verified**.

---

## 0. Where the frontend already stands

Task 1 shipped the UI against a deliberately empty data shape, so this plan is
constrained by contracts that already exist in the repo:

| Contract | Location | What it expects |
|---|---|---|
| `assetBreakdown(subject)` | [profile.js:107](web/src/lib/profile.js#L107) | 14 flat fields, all currently hard-`null` |
| `ASSET_FIELD_GROUPS` | [profile.js:69](web/src/lib/profile.js#L69) | movable / immovable / other grouping |
| `currentJourneyEntry(subject)` | [profile.js:176](web/src/lib/profile.js#L176) | one milestone: role, party, place |
| Asset breakdown sheet | [AssetBreakdownSheet.jsx](web/src/components/profile/AssetBreakdownSheet.jsx) | renders the 14 fields + 2 totals |
| Timeline card | [ProfileJourneyTab.jsx](web/src/components/profile/ProfileJourneyTab.jsx) | collapsible card, expands to financials |

**The "Asset Card Interaction" requirement in the brief is already
implemented** — the Declared Assets card renders a `TapHint` ("Tap for
details" + `ChevronRight`) at [ProfileOverviewTab.jsx:168](web/src/components/profile/ProfileOverviewTab.jsx#L168),
opens a `BottomSheet` (rounded, animated, scrollable, close button, shared
visual language) rather than navigating away, and presents grouped icon cards
rather than a raw table. Nothing in this task changes it. The only work left
on that card is *filling* the nulls, which is what this plan enables.

**Design consequence:** the pipeline's target output shape is fixed. It must
produce, per subject, an ordered list of milestones where zero or more carry a
wealth record whose fields are exactly the 14 above. Anything the sources give
us beyond that is stored but not surfaced.

---

## 1. Every data field to collect

### 1.1 Person identity (the spine)

Not in the brief's list, but nothing else can be linked without it.

| Field | Type | Notes |
|---|---|---|
| `politician_id` | int PK | our own stable id |
| `canonical_name` | text | display name; the roster spelling |
| `name_variants` | text[] | every spelling seen in any source |
| `subject_type` | enum | `cm` \| `union_minister` |
| `cm_id` / `minister_id` | int FK | link back to `chief_ministers` / `ministers` |
| `myneta_group_id` | text | **the cross-election anchor — see §4** |
| `wikipedia_title` | text | e.g. `Devendra_Fadnavis` |
| `wikidata_qid` | text | e.g. `Q16728896` |
| `sansad_member_id` | text | MPs only |

### 1.2 Career milestone fields

One row per milestone. Fields marked *derived* are computed, not scraped.

| Field | Type | Null allowed | Notes |
|---|---|---|---|
| `year` | int | no | the sort key; derived from `start_date` |
| `start_date` | date | yes | full date when the source has one |
| `end_date` | date | yes | null = currently held |
| `date_precision` | enum | no | `day` \| `month` \| `year` — *derived* |
| `position_title` | text | no | "Chief Minister of Maharashtra" |
| `position_rank` | enum | no | *derived*, for sorting/iconography: `head_of_govt`, `deputy_head`, `cabinet_minister`, `mos`, `legislator`, `party_office`, `opposition_office`, `other` |
| `party` | text | no | party **at that time**, not today's |
| `party_at_time_raw` | text | yes | source's own string, pre-normalisation |
| `state` | text | yes | Title Case, display |
| `state_key` | text | yes | ALL CAPS, matches `chief_ministers.state_key` |
| `constituency` | text | yes | display name |
| `constituency_key` | text | yes | normalised, matches existing `normalize()` |
| `election_type` | enum | no | `assembly` \| `lok_sabha` \| `rajya_sabha` \| `mlc` \| `appointment` \| `party_internal` |
| `entry_mode` | enum | no | `elected` \| `re_elected` \| `appointed` \| `sworn_in` \| `resigned` \| `term_ended` |
| `predecessor` / `successor` | text | yes | free from the infobox; useful for validation |
| `is_current` | bool | no | *derived* from `end_date IS NULL` |

### 1.3 Wealth declaration fields

One row per affidavit. The 14 UI fields, plus provenance.

| UI field | DB column | Affidavit origin |
|---|---|---|
| Declared Assets | `total_assets` | headline total |
| Declared Liabilities | `total_liabilities` | Liabilities → Totals |
| Cash in Hand | `cash` | Movable **i** |
| Bank Deposits | `bank_deposits` | Movable **ii** |
| Shares / Investments | `shares_investments` | Movable **iii** |
| Mutual Funds | `mutual_funds` | **⚠ no such line exists — see §5.1** |
| Jewellery | `jewellery` | Movable **vii** |
| Vehicles | `vehicles` | Movable **vi** |
| Movable Assets | `movable_assets` | Movable → Totals |
| Immovable Assets | `immovable_assets` | Immovable → Totals |
| Residential Property | `residential_property` | Immovable **iv** |
| Commercial Property | `commercial_property` | Immovable **iii** |
| Agricultural Land | `agricultural_land` | Immovable **i** |
| Other Declared Assets | `other_assets` | Movable **viii** + Immovable **v** |

Not shown in the UI but collected because it is free and prevents re-crawls:

`nss_postal_savings` (Movable iv-a), `insurance_policies` (iv-b),
`personal_loans_given` (Movable v), `non_agricultural_land` (Immovable ii),
`liabilities_bank_loans`, `liabilities_individual`, `liabilities_govt_dues`,
`liabilities_disputed`, plus `agricultural_land_area`,
`residential_area` (the affidavit gives areas as well as values — the sheet
could show "1,834 sq ft" beside a rupee figure later without a re-crawl).

Provenance, on **every** wealth row:

`election_year`, `election_name` ("Maharashtra 2024"), `myneta_dataset_slug`,
`myneta_candidate_id`, `source_url`, `fetched_at`,
`declared_total_as_per_affidavit` vs `declared_total_calculated` (**⚠ these
differ — §5.3**), `holder_scope` (`family` \| `self`; **§5.2**),
`readability_flag` (MyNeta prints its own "Data Readability Report" per
section — capture it, it is a free quality signal), and
`criminal_cases_count` (present on the same page, zero extra cost; not
surfaced now, but the Overview brief may want it).

---

## 2. The most reliable source for each field

Ranked. Rule: **never accept a lower tier when a higher tier has the field.**

### Tier 1 — MyNeta / ADR (all wealth fields)

`myneta.info` is ADR's republication of ECI affidavits. Its own disclaimer
states the data is taken from `affidavitarchive.nic.in` and that ECI is
authoritative on any discrepancy — which is exactly the provenance chain the
brief asks for, and the reason we prefer it to the ECI portal directly: ECI
serves scanned PDFs, MyNeta serves the same numbers already transcribed into
HTML tables, per-schedule-row.

The repo already talks to this host — [myneta_photo_update.py](app/data_update/myneta_photo_update.py)
has the `curl`-via-subprocess fetcher (the venv has no CA bundle), the retry
policy, the 0.4s politeness delay and the `normalize()` used for
constituency keys. **Reuse all of it.** Endpoints:

| Endpoint | Gives |
|---|---|
| `search_myneta.php?q=<name>` | every election a name appears in, as `<dataset_slug>/candidate.php?candidate_id=<id>` |
| `<slug>/candidate.php?candidate_id=<id>` | the full affidavit: movable / immovable / liabilities schedules, PAN & ITR, criminal cases, an "Other Elections" block, and a `compare_profile.php?group_id=…` link |
| `compare_profile.php?group_id=<hash>` | that person's affidavits in one table: name, constituency, age, party, cases, education, total assets, total liabilities — **but not reliably all of them, see §5.5b** |
| `<slug>/index.php?action=show_winners` | winner rosters, for anchoring a match |
| `state_assembly.php?state=<X>` | discovers a state's dataset slugs |
| `unioncouncilYYYY/…` | **⚠ ADR's Union Council of Ministers datasets — §2.5** |

### Tier 2 — Wikipedia infobox wikitext (all career fields)

Fetched as raw wikitext via `en.wikipedia.org/w/rest.php/v1/page/<Title>` —
the same call [minister_update.py](app/data_update/minister_update.py) already
makes. **⚠ Verified:** the politician infobox is a numbered series that is a
near-perfect match for our milestone table:

```
| office        = 18th [[Chief Minister of Maharashtra]]
| term_start    = 5 December 2024
| term_end      =
| predecessor   = Eknath Shinde
| term_start1   = 23 November 2019      ← no office1: same office, earlier term
| term_end1     = 28 November 2019
| office3       = 9th [[Deputy Chief Minister of Maharashtra]]
| term_start3   = 30 June 2022
| office6       = [[Member]] of [[Maharashtra Legislative Assembly]]
| constituency6 = [[Nagpur South West Assembly constituency|Nagpur South-West]]
```

That single infobox yields 8 milestones spanning 1999→present, with exact
dates, constituencies and predecessor/successor — everything §1.2 wants
except `party` and `election_type`, both of which are derivable.

### Tier 3 — Wikidata (cross-check only)

`P39` (position held) carries `P580`/`P582` start/end and `P768` electoral
district. **⚠ Verified as too sparse to lead with:** Fadnavis's item exposes
4 `P39` statements against the infobox's 8 milestones, and his `P102` (party)
has no date qualifiers at all. Use it to *validate* Tier 2 — a date that
disagrees by more than a day goes to the review queue — never as the source
of record.

### Tier 4 — Official government sources (authority for appointments)

- **PIB** (`pib.gov.in`) — cabinet swearing-in and portfolio-reshuffle dates.
- **`cabsec.gov.in`** — the Cabinet Secretariat's own allocation notifications.
- **`sansad.in`** — MP terms and "Positions Held"; the repo already fetches
  this host in [sansad_photo_update.py](app/data_update/sansad_photo_update.py).
- **State legislature sites** — MLA term dates; ~30 different site layouts, so
  treat as a manual fallback for gaps, not a crawl target.
- **ECI** (`results.eci.gov.in`, `affidavitarchive.nic.in`) — the tiebreaker
  when MyNeta and Wikipedia disagree on an election result or a number.

### 2.5 The Rajya-Sabha problem, and how `unioncouncil` solves it

**⚠ Verified.** Several Union Ministers sit in the Rajya Sabha and therefore
have no Lok Sabha affidavit — the obvious "scrape LokSabha2024" approach
silently drops them. A search for *Nirmala Sitharaman* returns no Lok Sabha
row but does return `rajsab09aff/` **and** `unioncouncil2016/`,
`unioncouncil2017/`, `unioncouncil2018/`. Fetching
`unioncouncil2018/candidate.php?candidate_id=3160` returns a complete
affidavit page — same Movable / Immovable / Liabilities schedules as any
candidate page — with the "constituency" field set to
`MINISTER OF DEFENCE(CABINET MINISTERS)`.

Two things follow:

1. RS-seated ministers are covered. Use `rajsab*` for their actual election
   affidavit and `unioncouncil*` as the fallback.
2. That constituency string is a **direct join key onto `ministers.ministry`**,
   so the Union Council datasets can be matched by portfolio instead of by
   name — far more robust than name matching (§5.5).

### 2.6 Source-of-record summary

| Field group | Primary | Cross-check | Tiebreak |
|---|---|---|---|
| All 14 wealth fields + totals | MyNeta candidate page | `compare_profile` totals | ECI affidavit PDF |
| Position, dates, constituency, predecessor | Wikipedia infobox | Wikidata `P39` | PIB / sansad.in |
| Party at time | Wikipedia infobox + MyNeta per-election party | — | ECI result |
| Appointment dates (no election) | PIB / Cabinet Secretariat | Wikipedia | — |
| Election outcome (won/lost) | MyNeta winners page | ECI results | — |

---

## 3. How the collected data should be grouped

Four tables. The split is deliberate: career and wealth arrive from different
sources at different cadences and must not block each other.

```
politicians                     ← identity spine (§1.1), one row per person
  ├── political_milestones      ← §1.2, many per politician, one per milestone
  └── wealth_declarations       ← §1.3, many per politician, one per affidavit
```

`chief_ministers` and `ministers` stay untouched — `politicians` points *at*
them. That keeps every existing endpoint, the vote counters and the daily
reset job working unchanged, and means a bad journey crawl can never corrupt
the live app.

*(deferred)* A `source_records` table storing the fetched payload, its SHA-256
and the URL would buy re-parsing without re-crawling, a diff signal when a
source page changes, and an audit trail. Worth doing once v1 renders — not
before. In the meantime the acquisition scripts cache raw pages on disk, which
covers the only one of those three that matters during development.

Every row still carries `source_url` + `fetched_at` inline. That is not
infrastructure — the UI shows a source link per timeline entry, so it is a
rendered field.

**Grouping for delivery.** The API returns one array, already merged and
sorted (§4), so the client never joins:

```json
{ "politician_id": 12, "timeline": [
  { "year": 2024, "position": "Chief Minister of Maharashtra", "party": "BJP",
    "state": "Maharashtra", "constituency": "Nagpur South West",
    "election_type": "assembly", "entry_mode": "elected",
    "start_date": "2024-12-05", "is_current": true,
    "wealth": { "total_assets": 132747728, "total_liabilities": 6200000,
                "cash": 33500, "mutual_funds": null, "...": "..." },
    "sources": [{ "label": "MyNeta — Maharashtra 2024", "url": "…" }] },
  { "year": 2022, "position": "Deputy Chief Minister of Maharashtra",
    "party": "BJP", "entry_mode": "appointed", "wealth": null, "...": "..." }
]}
```

`wealth: null` is a first-class state, not an error — most appointments have
no affidavit, and the timeline card already renders that case honestly.

---

## 4. How milestones and affidavits are linked

### 4.1 Identity: pin `myneta_group_id`, never match on names

**⚠ This is the single most valuable finding.** MyNeta has already solved
cross-election identity, and exposes the answer. Every candidate page carries
a `compare_profile.php?group_id=<hash>` link, and that page lists *all* of the
same person's affidavits in one table. For Fadnavis, `group_id=cN9JkYXGXsLabKbniDEp`
returns Maharashtra 2024, 2019, 2009 and 2004 with totals for each.

That matters because the names are **not** consistent across those very rows:

| Dataset | Name as filed |
|---|---|
| `Maharashtra2024` | Devendra Gangadhar Fadnavis |
| `maharashtra2019` | Devendra Gangadharrao Fadnavis |
| `mh2009` | Devendra Gangadharrao Fadnavis |
| `mah2004` | DEVENDRA GANGADHAR **FADNVIS** |

Four filings, four different spellings, one of them misspelled — and that is
before counting the 2014 filing, which these pages disagree about even
listing (§5.5b). Any fuzzy name-matcher would either miss 2004 or over-match.
So:

**Resolution runs once per politician, is human-confirmed, and is then frozen.**

1. Search `search_myneta.php?q=<canonical_name>`.
2. Filter candidates by the facts we already hold — `state_key`, `party`, and
   the year of a known milestone. (Required: a bare search for
   *"S Jaishankar"* **⚠ returns unrelated people** in Uttar Pradesh, Bihar and
   Tamil Nadu datasets. Name alone is not a key.)
3. Open the best candidate page, extract its `group_id`.
4. Fetch `compare_profile.php?group_id=…` and assert the returned set is
   *coherent* — same party lineage, monotonically increasing age, plausible
   constituencies. Reject and queue for review if not.
5. **Union three lists** — `compare_profile` rows, the candidate page's "Other
   Elections" block, and the `search_myneta.php` hits that survived step 2 —
   because none of them is complete on its own (**§5.5b**). Persist the union.
6. Persist `myneta_group_id` on `politicians`. **All future crawls start from
   the `group_id`, never from a name.**

Step 4's age check is a cheap, strong signal: the compare table prints age per
election (54 / 49 / 39 / 34 for Fadnavis), so a mismatch of more than ±2 years
from the expected gap is almost certainly a different person.

### 4.2 Merging into one chronological timeline

Milestones and affidavits are joined **by year, not by foreign key**, because
they are independent facts about the same year and either can exist alone.

```
1. Collect career milestones          → M = [(year, position, party, …)]
2. Collect wealth declarations        → W = [(election_year, assets, …)]
3. For each w in W:
     find the m in M where m.year == w.election_year
                       AND m.election_type != 'appointment'
     ├── exactly one  → attach w to m
     ├── none         → create a milestone from the affidavit itself
     │                  (it has year, party, constituency, won/lost)
     └── more than one → attach to the electoral milestone whose
                         constituency_key matches; else review queue
4. Sort M by (year DESC, start_date DESC, position_rank ASC)
5. Emit
```

**Why year-keyed, and why this avoids duplication.** An affidavit is filed for
an *election*; a milestone can be an *appointment*. Fadnavis's 2022 Deputy CM
appointment has no affidavit, and his 2024 assembly affidavit belongs to the
election that produced the CM term. Keying on year merges the two naturally
into one card — "2024 · Chief Minister · BJP · Declared Assets ₹13.27 Cr" —
which is exactly the shape the brief's example asks for, without a separate
"wealth" row duplicating the year, position and party.

The `election_type != 'appointment'` guard is what stops a same-year
appointment from stealing the affidavit. Fadnavis 2024 is the live case: he
was elected MLA (assembly, affidavit) *and* sworn in as CM (appointment, no
affidavit) in the same year — step 3 attaches the wealth to the MLA milestone,
then step 4's `position_rank` sort surfaces the CM role as the card's headline.

Sorting note: `position_rank ASC` after `year DESC` means that when a year
holds several milestones, the most senior office leads the card. Without it,
"MLA, Nagpur South West" would outrank "Chief Minister" in 2024 purely by
insertion order.

---

## 5. Expected inconsistencies and edge cases

### 5.1 ⚠ "Mutual Funds" is not a field on the affidavit

Form 26's movable schedule is: **i** Cash · **ii** Deposits in Banks/FIs/NBFCs
· **iii** Bonds, Debentures and Shares in companies · **iv (a)** NSS/Postal
Savings **(b)** Insurance policies · **v** Personal loans/advances given ·
**vi** Motor Vehicles · **vii** Jewellery · **viii** Other assets.

There is no mutual-funds line. Filers put MF holdings under **iii** or **iv**,
inconsistently and usually only inside the free-text description.

**Decision: `mutual_funds` is `NULL` for essentially every record, by design.**
The brief says "Mutual Funds (if available)" and "preserve null rather than
inventing data" — this is that case. Do not synthesise it by regexing "mutual
fund" out of description strings; that would produce a number that is
confidently wrong and unattributable. The UI already renders "Not available"
correctly ([AssetBreakdownSheet.jsx:43](web/src/components/profile/AssetBreakdownSheet.jsx#L43)).
Optionally add a one-line footnote in the sheet explaining that the affidavit
has no separate mutual-fund line — that turns a blank into a credibility win.

### 5.2 ⚠ Assets are declared per family member, not per person

The affidavit tables have columns `self | spouse | huf | dependent1 | dependent2 | dependent3`.
Fadnavis's movable totals are ₹56,07,865 (self) and ₹6,96,92,732 (spouse) —
**the spouse holds 12× the candidate**. MyNeta's headline "Assets:
₹13,27,47,728" is the *family* total.

Reporting self-only would show a figure ~12× smaller than every news report
and ADR publication, and would look like a bug. Reporting the family total
without labelling it invites "why is his wife's money listed as his?".

**Decision: store both. Display the family total (matching ADR/press
convention) and label the card "Declared Assets (self + family, as per
affidavit)".** `holder_scope` records which one a row represents.

### 5.3 ⚠ The affidavit's own total disagrees with the sum of its rows

MyNeta prints both, and they differ. On the 2024 Fadnavis page: movable total
"as per affidavit" ₹7,63,22,728 vs "Totals (Calculated as Sum of Values)"
₹7,63,22,710 — an ₹18 gap on the same page. Immovable shows the same pairing
("Total Current Market Value of (i) to (v) as per Affidavit" vs "Totals
Calculated").

**Decision: store both columns; display the "as per affidavit" figure**
(it is what the politician actually swore to); flag rows where they differ by
more than 1% for review. Small gaps are rounding by the filer; large gaps mean
a parse error or a genuinely inconsistent affidavit, and only the second is
worth a human's time.

### 5.4 Value parsing

- Indian digit grouping: `Rs 13,27,47,728` → `132747728`. Strip `Rs`, spaces,
  commas.
- `Nil` and `None` appear as literal cell text → store **`0`**, meaning
  "declared as nothing".
- A missing or unparseable cell → store **`NULL`**, meaning "not on record".
  These two must never collapse into one another; the UI's `hasData` flag
  exists precisely to tell them apart.
- Ignore the `~13 Crore+` strings entirely — they are MyNeta's own rounded
  display text, not source data.
- Store **paise-free integer rupees**, not floats. Never `float` for money.
- Bank/property rows repeat per account or per plot; the schedule row value is
  the sum of its sub-rows. Parse the row total, not the sub-rows, unless the
  total is missing.

### 5.5 ⚠ MyNeta dataset slugs are not systematic

Observed for **one state**: `mah2004`, `mh2009`, `maharashtra2014`,
`maharashtra2019`, `Maharashtra2024`, `maharashtramlc`. Three different
abbreviations of the same state name, then the full name, then the full name
**capitalised**, plus a separate MLC dataset. Also `delhi2015` / `delhi2020` /
`Delhi2022` / `Delhi2025`, and `tamilnadu2016` / `TamilNadu2026`.

Never construct a slug from a template. Always discover it — from
`state_assembly.php?state=X` (already done in
[myneta_photo_update.py:156](app/data_update/myneta_photo_update.py#L156)) or,
better, take it straight from the `compare_profile` links, which are correct
by construction. And note the path casing is load-bearing: the existing script
documents that the bare `/candidate.php?candidate_id=X` route returns HTTP 200
with a page missing the data entirely — a silent-empty failure, not an error.

### 5.5b ⚠ No single MyNeta page lists all of a person's elections

Discovered while validating §4.1, and the reason step 5 unions three lists.
For the *same* politician, on the *same* site:

| Election | `compare_profile` | candidate page "Other Elections" |
|---|---|---|
| Maharashtra 2024 | ✅ | — (it *is* the 2024 page) |
| Maharashtra 2019 | ✅ | ✅ |
| **Maharashtra 2014** | ❌ **missing** | ✅ ₹4,34,85,337 |
| Maharashtra 2009 | ✅ | ✅ |
| Maharashtra 2004 | ✅ | ✅ |

`compare_profile` links only four datasets and silently drops
`maharashtra2014`, even though `search_myneta.php` finds it and the candidate
page's own "Other Elections" block lists it with a total. Trusting
`compare_profile` alone would lose a decade-old data point from the middle of
the wealth timeline — and lose it *invisibly*, since the remaining four rows
still look like a complete, coherent sequence.

**Rule: `compare_profile` is the identity anchor, not the completeness
oracle.** Union all three discovery paths, dedupe by
`(dataset_slug, candidate_id)`, and have the coverage report (§6.7) flag any
politician whose affidavit years have a gap wider than one election cycle.

### 5.5c ⚠ Some affidavits have no movable-assets schedule at all

Found while auditing the first full CM run: **8 of 113** affidavits publish an
immovable schedule and a liabilities schedule but no movable one. Verified as
source-side, not a parse failure — those pages are complete (balanced tables,
closing `</html>`), carry `id=immovable_assets`, and simply have no
`id=movable_assets` table. MyNeta still renders the `#movable_assets` anchor
link and a "Data Readability Report of Movable Assets: No Problems" line,
which makes the omission easy to mistake for a scraper bug.

Affected CMs: Andhra Pradesh, Bihar, Gujarat, Haryana, Jammu & Kashmir,
Madhya Pradesh, Manipur, Punjab (one affidavit each).

Consequence: for those records `cash`, `bank_deposits`, `shares_investments`,
`jewellery` and `vehicles` are all `NULL`, and the headline total exceeds
movable + immovable — for N. Chandrababu Naidu, ₹931 Cr declared against
₹121 Cr of immovable, with the ₹810 Cr movable remainder unpublished.

**Decision: leave the movable fields `NULL` and do not back-derive
`movable_assets` as (headline − immovable).** The subtraction would look like
a declared figure while being our arithmetic, and it silently absorbs any
other discrepancy in the headline. The totals are still shown — only the
breakdown is missing — and the sheet already renders "Not available"
per field.

### 5.6 Wikipedia infobox parsing rules

- **An omitted `officeN` means "same office as the previous numbered block".**
  `term_start1`/`term_start2` above are Fadnavis's earlier CM terms, and a
  parser that requires `officeN` will drop them. This is the most likely
  source of missing milestones.
- Numbering is **not** chronological and **not** gap-free — `office3` (2022)
  post-dates `office4` (2019). Sort by parsed date, never by index.
- Values are wikilinks: `[[Chief Minister of Maharashtra]]`,
  `[[Nagpur South West Assembly constituency|Nagpur South-West]]` → take the
  pipe's right side, else the whole target.
- Ordinals leak into titles: `18th [[Chief Minister of Maharashtra]]`. Strip
  the ordinal into a separate field; do not leave it in `position_title`.
- Italic markup encodes real semantics: `''[[President's rule]]''` as a
  predecessor is a constitutional gap, not a person.
- `<br/>`, `{{ubl|…}}` and `''(additional charge)''` appear inside single
  values — normalise before splitting.
- An empty `term_end` means *currently held*, not *unknown*.

### 5.7 Party history is the hardest field

- Store the party **as of that milestone**, never today's party. A timeline
  whose whole point is showing party history is worthless if it back-fills.
- Recent splits make the label ambiguous for exactly the states we cover:
  Shiv Sena → SHS / SHS(UBT) (2022), NCP → NCP / NCP(SP) (2023), plus the
  LJP split. A pre-split "Shiv Sena" milestone must **not** be rewritten to a
  post-split label.
- **⚠ The two existing tables already disagree with each other:**
  `chief_ministers.party` stores abbreviations (`BJP`, `INC`, `TDP`) while
  `ministers.party` stores full names (`Bharatiya Janata Party`,
  `Apna Dal (Sonelal)`, `Hindustani Awam Morcha`). Confirmed by querying both.
  A `parties` lookup table (canonical abbreviation, full name, valid-from,
  valid-to, predecessor party) is needed *before* the timeline renders party
  badges, or the same person will show "BJP" on one card and "Bharatiya Janata
  Party" on the next.

### 5.8 Constituency and boundary drift

Constituencies are renamed, reserved, merged and abolished across
delimitations, so an old milestone's constituency may not exist in
`assembly_constituencies` today. Fadnavis's 2004 seat is "NAGPUR WEST"; from
2009 it is "NAGPUR SOUTH WEST", with the infobox noting *"Constituency
established"*. Store the constituency **as named at the time** and treat any
join to a current boundary as best-effort. The repo's existing
[DATA_QUALITY_NOTES.md](boundaries/DATA_QUALITY_NOTES.md) already documents
that Assam's 2024 polygons are pre-2023 footprints — the same caveat applies
here, and historic seats are worse.

### 5.9 Career-side gaps and oddities

- **President's Rule** produces genuine gaps between milestones. Render the
  gap; do not interpolate across it.
- **Very short terms are real.** Fadnavis was CM for 5 days (23–28 Nov 2019).
  Do not filter by duration, and do not let a `year`-only sort collapse the
  2019 term into the 2014–2019 one — this is why `start_date` is a sort key.
- **Acting / additional charge** appointments should carry `entry_mode` but
  probably not headline a card.
- **Multiple portfolios at once** is normal: `ministers` already holds rows
  like *"Consumer Affairs, Food and Public Distribution; New and Renewable
  Energy; Education"* for one person. One appointment milestone with a list of
  portfolios, not three milestones.
- **Party-internal offices** (state BJP President, 2013–2015) are in the
  infobox and are legitimate journey entries, but rank below public office.
- **Re-election vs new office**: same office, later `term_start`, no gap →
  `re_elected`. Same office after a gap → `elected`. This distinction is
  entirely derived; no source states it.

### 5.10 Cross-source contradictions to expect

- Wikipedia dates are usually swearing-in; ECI/PIB dates are notification
  dates. Off-by-a-day disagreements are normal — tolerate ±1 day, flag beyond.
- MyNeta's party for an election is the *contesting* party, which can differ
  from the party held mid-term after a defection.
- ADR occasionally revises a figure when ECI corrects an affidavit. For v1 a
  re-run simply picks up the new number; detecting *that* it changed needs the
  deferred snapshot table.

### 5.11 What the wealth trend does and does not mean

The timeline invites a "wealth grew 8×" reading. Two honest caveats worth
carrying in the data model: figures are **nominal** (2004 rupees ≠ 2024
rupees), and the family-scope issue in §5.2 means the growth may be the
spouse's. Store `election_year` on every wealth row so a real-terms adjustment
remains possible later; do not compute or display a growth multiple in this
phase.

---

## 6. Keeping the dataset scalable

The current target is 116 people (31 CMs + 85 ministers). It will grow — new
CMs after every state election, a reshuffled Union Council, and plausibly MPs
and MLAs later. Design for that now, cheaply.

**1. Roster-driven, not hardcoded.** [chief_minister_update.py](app/data_update/chief_minister_update.py)
hardcodes a 31-entry `ROSTER` list, which was right for a one-off but will not
survive four state elections a year. The journey pipeline should read its work
queue from `politicians`, which is seeded *from* `chief_ministers` and
`ministers`. Adding a CM then requires no code change.

**2. Source adapters behind one interface.** `fetch(politician) -> (milestones, wealth_records, raw)`,
one module per source (`myneta.py`, `wikipedia.py`, `wikidata.py`, `pib.py`).
Adding sansad.in or a state legislature later is a new file, not a rewrite —
and one source breaking cannot take the others down.

**3. Resolution once, crawl many.** §4.1's identity resolution is the expensive,
human-in-the-loop step. It runs once per person and is frozen. Refreshes start
from `myneta_group_id` + `wikipedia_title` and are pure fetch-and-parse, so a
full refresh of 116 people is ~350 requests at the existing 0.4s delay —
about three minutes. That comfortably supports a monthly cron alongside
[daily_reset.py](app/tasks/daily_reset.py).

**4. Idempotent upserts on natural keys.** `(politician_id, year, position_title)`
for milestones, `(politician_id, myneta_dataset_slug)` for wealth. Re-running
must never duplicate or reset — the same discipline
`upsert_chief_ministers` already applies to slap/rose counts.

**5–6. *(deferred)* Manual overrides and confidence tiers.** A
`manual_overrides` table keyed by `(table, row_id, column)` and applied after
every crawl would stop the next crawl silently reverting hand-corrected facts;
a `verified` / `single_source` / `needs_review` tier would let the API withhold
weak rows instead of forcing an all-or-nothing publish. Both are real needs at
scale and neither blocks v1 — with 31 CMs, a wrong row is fixed by fixing the
parser and re-running. Revisit when the dataset outgrows that.

**7. A coverage report, not a green checkmark.** One script that prints, per
politician: milestones found, affidavits found, fields null, unresolved
conflicts. Data quality here degrades quietly — a renamed MyNeta slug yields
*zero rows*, not an error (§5.5). The report is what turns a silent zero into
a visible one. The existing scripts' per-state "N gaps, M parsed, K stored"
logging is the right model; make it a persisted artefact.

**8. Backfill order.** 31 CMs first — they are the smaller set, each maps to a
single state assembly dataset, and Wikipedia coverage of CMs is excellent.
Union Ministers second (the RS/`unioncouncil` path of §2.5 is fiddlier). This
also front-loads the states where the app already has boundary data.

---

## 8. MVP build order

Data acquisition first, as flat JSON on disk — no schema, no API, nothing to
migrate if a parser turns out wrong. The DB lands only once the JSON is right.

| # | Step | Script | Output | Status |
|---|---|---|---|---|
| 1 | Resolve CMs → `myneta_group_id` | `resolve_cms.py` | `cm_identities.json` | ✅ |
| 2 | Parse affidavits (14 fields) | `myneta.py` | — | ✅ |
| 3 | Parse Wikipedia infoboxes → milestones | `wikipedia.py` | — | ✅ |
| 4 | Merge per §4.2 + coverage report | `build_timeline.py` | `timeline.json`, `coverage.md` | ✅ |
| 5 | Review coverage; fix parsers; re-run | — | — | ✅ |
| 6 | *Then* tables, endpoint, and swap `profile.js` stubs | — | — | not started |

**Result for the 31 sitting CMs (2026-08-03):** 31/31 resolved, 227 timeline
entries, 113 affidavits parsed, 0 unresolved, 0 needs-review. Every politician
has both career milestones and at least one affidavit. Remaining nulls are
source-side and enumerated in `coverage.md`.

Scripts live in `app/data_update/journey/`, output in `data/journey/`.
Union Ministers follow the same steps after CMs land (§6.8).

Union Ministers follow the same six steps after CMs land (§6.8).

Deliberately **not** in this list: `source_records`, hashing, confidence
tiers, `manual_overrides`, review queue. The `parties` lookup (§5.7) is
reduced to a plain abbreviation map — enough to stop `BJP` and
`Bharatiya Janata Party` appearing on adjacent cards, without a table.

## Open questions for the product owner

1. **Family vs self assets (§5.2)** — plan assumes family total, labelled.
   Confirm.
2. **Party-internal offices (§5.9)** — include state party presidencies in the
   timeline, or public office only? Plan assumes include, ranked lower.
3. **Publish threshold (§6.6)** — show `single_source` milestones publicly, or
   `verified` only? Plan assumes single-source is publishable with a source
   link shown.
