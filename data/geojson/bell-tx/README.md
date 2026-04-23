# Bell County GeoJSON Snapshot Contract

This directory holds the canonical offline snapshot files consumed by
GeoJSON mode. Snapshots are taken **once per year** and live in a
`YYYY/` subfolder so history is preserved without file duplication.

## Layout

```
data/geojson/bell-tx/
├── manifest.json             # points the app at the latest year
├── README.md
├── schema.json
├── 2025/
│   ├── parcels.geojson
│   ├── market-analysis.geojson
│   └── sales.geojson
└── 2026/
    ├── parcels.geojson
    ├── market-analysis.geojson
    └── sales.geojson
```

Running the downloader re-uses the current year's folder and overwrites
the three files in place, so there is always exactly one snapshot set
per year.

## Required Files (per year folder)

- `parcels.geojson`
- `market-analysis.geojson`
- `sales.geojson`

Each file must be a valid GeoJSON `FeatureCollection`.

## manifest.json

`manifest.json` is rewritten by `scripts/download_arcgis_geojson.py`
every run. The app (`data/adapters.js` → `createGeoJsonSource`) reads
it to decide which year folder to load from, so the newest snapshots
are served automatically.

```json
{
  "county": "bell-tx",
  "label": "Bell County, TX",
  "latest": "2026",
  "years": ["2025", "2026"],
  "layers": {
    "parcels": "parcels.geojson",
    "market-analysis": "market-analysis.geojson",
    "sales": "sales.geojson"
  },
  "updated": "2026-04-22T17:45:00Z"
}
```

If `manifest.json` is missing (e.g. brand-new checkout before the
first download), the app falls back to the flat layout
(`./data/geojson/bell-tx/<file>.geojson`).

## Canonical Matching Keys

- Parcel ID key: `PROP_ID` (or `prop_id`) is preferred.
- Neighborhood key: `Neighborhood` (or `neighborhood`).
- City key: `situs_city` / `SITUS_CITY`.

## Notes

- Property fields can be provided in either ArcGIS-style `attributes` or GeoJSON-style `properties`.
- The app normalizer accepts known Bell aliases (upper/lower/snake/camel variants used in live services).
- `sales.geojson` does not need address, but `market-analysis.geojson` should include address by `PROP_ID` so sold rows can display it.

## Annual refresh workflow

1. `pip install -r scripts/requirements.txt` (once).
2. `python scripts/download_arcgis_geojson.py --county bell-tx`
   - Writes/overwrites `data/geojson/bell-tx/<current-year>/*.geojson`.
   - Updates `manifest.json` so the app picks up the new year.
3. Commit the new/updated year folder + `manifest.json`.
4. Push — the GitHub Pages deploy workflow copies `data/**` into `_site/`.

Pass `--year 2027` to back-fill or pre-stage a specific year.
