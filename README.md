# Property Tax Protest Assistant

Automation-focused property tax protest helper for a single county (v1: Bell County, TX).

## Architecture

Static site at the repository root: `index.html`, `styles.css`, `app.js`, and `data/` (settings, county adapters, optional GeoJSON snapshots). No backend is required for Bell public data mode.

The app runs entirely in the browser: it queries BellCAD public ArcGIS endpoints and computes valuation in-browser.

## Why Bell County First

- Public parcel layer available through ArcGIS REST
- No API key required for public read-only parcel queries
- APN/property-ID based search is the most reliable public path

Primary data endpoint:

- `https://utility.arcgis.com/usrsvcs/servers/6efa79e05bde4b98851880b45f63ea52/rest/services/BellCADWebService/FeatureServer/0/query`
- Market analysis endpoint:
  - `https://services7.arcgis.com/EHW2HuuyZNO7DZct/arcgis/rest/services/BellCADMarketAnalysisService/FeatureServer/2/query`

## Bell Property Links

- Property details:
  - `https://esearch.bellcad.org/Property/View/<propertyId>`
- Market analysis map:
  - `https://experience.arcgis.com/experience/f705a15fea9a45bab86f27bdb8087caf/?zoom_to_selection=true#data_s=where:dataSource_1-1961cfd0bc2-layer-14-1961cfd0ebc-layer-16:PROP_ID=<propertyId>`

## Local Development

No build step is required. Open `index.html` in a browser from the repo root, or serve the repository root locally.

## Deploy (Free Stack)

1. Push repo to GitHub.
2. Enable GitHub Pages workflow (`.github/workflows/deploy-pages.yml`). It publishes `index.html`, `styles.css`, `app.js`, and `data/` (and `assets/` if present) to the site root.
3. Site is fully functional without a server or API keys for Bell public data.

## Notes

- This tool is informational and not legal advice.
- County rules/deadlines change. Validate filing requirements before submission.
- Bell County public parcel source is APN-first.
- If assessed value is missing from source data, use the UI assessed-value override.
