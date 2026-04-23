# Bell County - Property Tax Protest Assistant

> [!WARNING]
> **Not legal advice.** This project is an independent, informational planning tool. It is **not** a law firm, **not** affiliated with the Bell County Appraisal District or any government entity, and **does not** submit protests on your behalf. Any estimates, scores, checklists, or draft text are **draft planning aids only**. Property data, deadlines, forms, and rules change; **you are responsible** for verifying all numbers and filing requirements against official CAD records, your notice of appraised value, and current CAD instructions before relying on this tool. For legal questions or high-stakes decisions, consult a **qualified attorney or tax professional**. The authors provide **no warranty** as to accuracy, completeness, or fitness for a particular purpose.

## Overview

**Bell County - Property Tax Protest Assistant** helps Bell County, Texas property owners **organize** public parcel and market information, **think through** a protest, and **draft** portal-ready notes and packets. Version 1 focuses on a single county workflow in the browser.

## What the app does

- Look up a property by **property ID** and surface key assessment and neighborhood context.
- Support **notice review** and informal **valuation reasoning** (land, improvements, optional adjustments you enter).
- Help **draft** protest reasons, facts, and a structured packet outline for your own use with official systems.

The tool is meant to reduce friction in **research and drafting**—not to replace reading your notice, CAD guidance, or professional advice.

## How it works (high level)

- **Static site:** `index.html`, `styles.css`, `app.js`, and `data/` (settings and county adapters). No server-side application is required for normal use.
- **Browser-only:** Logic runs in your browser. In the default configuration, the app reads **public, read-only** property and market information published by the appraisal district’s usual public data channels (the same kind of information you could look up manually).
- **No API keys** are required for that public mode.
- **Optional developer preview:** Maintainers can run the site over a local HTTP server and use an **admin-only** query flag to load optional offline snapshot files from `data/geojson/` for testing. Those snapshot files are **gitignored** and are not part of the published GitHub Pages site.

## Why Bell County first

- Strong **public property-ID** workflow for reliable lookup.
- Clear **separation** between this independent tool and official CAD systems—you copy outcomes into the real portal yourself.

## Local development

No build step. Serve the repository root over HTTP (for example `python -m http.server 8000 --bind 127.0.0.1`) so all assets and optional local data paths load correctly. Opening `index.html` as a `file://` URL is limited: core flows may still run, but anything that fetches files under `data/` (including optional admin snapshot preview) expects HTTP.

## Deploy (GitHub Pages)

1. Push this repository to GitHub.
2. Enable the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. It publishes `index.html`, `styles.css`, `app.js`, and `data/` (plus `assets/` when present) to the site root.
3. The public site operates without your own backend or keys for the default public-data mode.

## Official sources

Always use the **Bell County Appraisal District (Bell CAD)** website and notices for authoritative values, deadlines, and filing instructions. In-app links that open CAD or related pages are provided for convenience; they are not endorsements and may change when the CAD updates its systems.

## Notes

- County rules and protest windows change year to year—**confirm deadlines** every tax season.
- If an assessed value from the automated lookup is missing or wrong for your situation, use the in-app **assessed value override** on the estimate step so your math matches your notice.
