(function initCountyAdaptersScope() {
  const BELL_ESEARCH_GSA_BASE = "https://esearchgsa.bellcad.org";
  const BELL_ESEARCH_PRIOR_BASE = "https://esearch.bellcad.org";
  const BELL_ARCGIS_QUERY_URL =
    "https://utility.arcgis.com/usrsvcs/servers/6efa79e05bde4b98851880b45f63ea52/rest/services/BellCADWebService/FeatureServer/0/query";
  const BELL_MARKET_ANALYSIS_QUERY_URL =
    "https://services7.arcgis.com/EHW2HuuyZNO7DZct/arcgis/rest/services/BellCADMarketAnalysisService/FeatureServer/2/query";
  const BELL_MARKET_SALES_QUERY_URL =
    "https://services7.arcgis.com/EHW2HuuyZNO7DZct/arcgis/rest/services/BellCADMarketAnalysisService/FeatureServer/0/query";

  function normalizeBellcadPropertyIdForViewPath(propertyId) {
    if (propertyId === null || propertyId === undefined) return "";
    const raw = String(propertyId).trim().replace(/,/g, "");
    if (!raw) return "";
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return String(Math.round(n));
    return encodeURIComponent(raw);
  }

  function buildLinks() {
    return {
      searchCurrent() {
        return `${BELL_ESEARCH_GSA_BASE}/Property/Search`;
      },
      propertyViewCurrent(propertyId) {
        const id = normalizeBellcadPropertyIdForViewPath(propertyId);
        if (!id) return `${BELL_ESEARCH_GSA_BASE}/Property/Search`;
        return `${BELL_ESEARCH_GSA_BASE}/Property/View/${id}`;
      },
      searchPrior() {
        return `${BELL_ESEARCH_PRIOR_BASE}/Property/Search`;
      },
      propertyViewPrior(propertyId) {
        const id = normalizeBellcadPropertyIdForViewPath(propertyId);
        if (!id) return `${BELL_ESEARCH_PRIOR_BASE}/Property/Search`;
        return `${BELL_ESEARCH_PRIOR_BASE}/Property/View/${id}`;
      },
      marketAnalysisMap(propertyId) {
        const id = normalizeBellcadPropertyIdForViewPath(propertyId);
        if (!id) return "";
        return (
          "https://experience.arcgis.com/experience/f705a15fea9a45bab86f27bdb8087caf/" +
          `?zoom_to_selection=true#data_s=where:dataSource_1-1961cfd0bc2-layer-14-1961cfd0ebc-layer-16:PROP_ID=${encodeURIComponent(
            id
          )}`
        );
      },
    };
  }

  function getAny(attributes, keys) {
    for (const key of keys) {
      if (attributes[key] !== undefined && attributes[key] !== null && attributes[key] !== "") return attributes[key];
    }
    return null;
  }

  /**
   * @typedef {Record<string, string|number|boolean|null|undefined>} AttributesMap
   */

  /**
   * @param {{attributes?: AttributesMap, properties?: AttributesMap}|null|undefined} feature
   * @returns {AttributesMap}
   */
  function attrsOf(feature) {
    return (feature && (feature.attributes || feature.properties)) || {};
  }

  function num(value) {
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function sqlQuote(value) {
    return `'${String(value || "").replace(/'/g, "''")}'`;
  }

  function normalizeCityText(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function normalizeSaleDate(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : value;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    const raw = String(value).trim();
    if (!raw) return null;
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) {
      const ms = asNum > 1e12 ? asNum : asNum > 1e9 ? asNum * 1000 : asNum;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString();
    return raw;
  }

  function normalizeBellParcel(feature) {
    const a = attrsOf(feature);
    const situsPieces = [
      getAny(a, ["situs_num", "SITUS_NUM"]),
      getAny(a, ["situs_street_prefx", "SITUS_STREET_PREFX"]),
      getAny(a, ["situs_street", "SITUS_STREET"]),
      getAny(a, ["situs_street_sufix", "SITUS_STREET_SUFIX"]),
      getAny(a, ["situs_city", "SITUS_CITY"]),
      getAny(a, ["situs_state", "SITUS_STATE"]),
      getAny(a, ["situs_zip", "SITUS_ZIP"]),
    ].filter(Boolean);

    return {
      county: "Bell County, TX",
      parcelId: getAny(a, ["prop_id", "PROP_ID", "prop_id_text", "PROP_ID_TEXT", "REF_ID2"]),
      situsAddress: getAny(a, ["SITUS_ADDRESS", "situs_address"]) || situsPieces.join(" ").trim() || null,
      ownerName: getAny(a, ["file_as_name", "FILE_AS_NAME", "OWNER_NAME", "owner_name"]),
      city: getAny(a, ["situs_city", "SITUS_CITY", "addr_city", "ADDR_CITY"]),
      neighborhoodCode: getAny(a, ["hood_cd", "HOOD_CD"]),
      landValue: Number(getAny(a, ["land_val", "LAND_VAL", "LAND_VALUE", "market_land"]) || 0),
      improvementValue: Number(
        getAny(a, ["imprv_val", "IMPRV_VAL", "IMPROVEMENT_VALUE", "market_improvement"]) || 0
      ),
      assessedTotal: Number(getAny(a, ["market", "MARKET", "assessed", "ASSESSED_VALUE"]) || 0),
      yearBuilt: getAny(a, ["year_built", "YEAR_BUILT", "yr_built", "YR_BUILT"]),
      sqft: getAny(a, ["bldg_sqft", "BLDG_SQFT", "sqft", "SQFT", "living_area"]),
      lotSize: getAny(a, ["legal_acreage", "LEGAL_ACREAGE", "lot_size", "LOT_SIZE"]),
      lastSale: getAny(a, ["deed_date", "DEED_DATE", "sale_date", "SALE_DATE"]),
      ownerTaxYear: getAny(a, ["owner_tax_yr", "OWNER_TAX_YR"]),
      deed: {
        date: getAny(a, ["deed_date", "DEED_DATE"]),
        seq: getAny(a, ["deed_seq", "DEED_SEQ"]),
        volume: getAny(a, ["volume", "VOLUME"]),
        page: getAny(a, ["page", "PAGE"]),
        number: getAny(a, ["number", "NUMBER"]),
      },
      legalDescription: getAny(a, ["legal_desc", "LEGAL_DESC"]),
      mapId: getAny(a, ["map_id", "MAP_ID"]),
      geoId: getAny(a, ["geo_id", "GEO_ID"]),
      geo: feature.geometry || null,
      source: {
        url: BELL_ARCGIS_QUERY_URL,
        fetchedAt: new Date().toISOString(),
      },
      rawAttributes: a,
    };
  }

  function normalizeMarketAnalysis(feature) {
    const a = attrsOf(feature);
    return {
      propId: getAny(a, ["PROP_ID", "prop_id"]),
      geoId: getAny(a, ["GEO_ID", "geo_id"]),
      propertyAddress: getAny(a, ["Property_Address", "property_address"]),
      squareFoot: num(getAny(a, ["Square_Foot", "square_foot"])),
      marketValue: num(getAny(a, ["Market_Value", "market_value"])),
      neighborhood: getAny(a, ["Neighborhood", "neighborhood"]),
      neighborhoodMarketArea: getAny(a, ["NBHD__Market_Area", "NBRHD_Market_Area", "nbhd__market_area", "nbrhd_market_area"]),
      numberOfHouses: num(getAny(a, ["Number_of_Houses", "number_of_houses"])),
      newHouses: num(getAny(a, ["New_Houses", "new_houses"])),
      numberOfSales: num(getAny(a, ["Number_of_Sales", "number_of_sales"])),
      medianYearBuilt: num(getAny(a, ["Median_Year_Built", "median_year_built"])),
      medianSqFt: num(getAny(a, ["Median_Sq_Ft", "Median_Sq_ft", "median_sq_ft"])),
      medianValue: num(getAny(a, ["Median_Value", "median_value"])),
      medianSalesPrice: num(getAny(a, ["Median_Sales_Price", "median_sales_price"])),
      medianSqFtOfSales: num(getAny(a, ["Median_Sq_Ft_of_Sales", "median_sq_ft_of_sales"])),
      sqFtRange: getAny(a, ["Sq_Ft_Range", "sq_ft_range"]),
      salesSqFtRange: getAny(a, ["Sales_Sq_Ft_Range", "sales_sq_ft_range"]),
      rawAttributes: a,
    };
  }

  function normalizeSalesPoint(feature) {
    const a = attrsOf(feature);
    return {
      propertyId: getAny(a, ["PROP_ID", "prop_id", "Property_ID"]),
      propertyAddress: null,
      saleDate: normalizeSaleDate(
        getAny(a, [
          "SaleDt",
          "SALEDT",
          "sale_dt",
          "saleDt",
          "Sale_Date",
          "sale_date",
          "Date_Of_Sale",
          "date_of_sale",
          "SALE_DATE",
        ])
      ),
      squareFoot: num(getAny(a, ["Square_Foot", "square_foot"])),
      neighborhood: getAny(a, ["Neighborhood", "neighborhood"]),
      rawAttributes: a,
    };
  }

  async function fetchMarketAnalysisByPropId(propId) {
    if (!propId) return null;
    const params = new URLSearchParams({
      where: `PROP_ID=${encodeURIComponent(String(propId))}`,
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: "1",
      f: "json",
    });
    const res = await fetch(`${BELL_MARKET_ANALYSIS_QUERY_URL}?${params.toString()}`);
    const payload = await res.json();
    if (!res.ok || payload.error || !payload.features || payload.features.length === 0) return null;
    return normalizeMarketAnalysis(payload.features[0]);
  }

  async function fetchNeighborhoodSalesByNeighborhood(neighborhood) {
    if (!neighborhood) return [];
    const where = `Neighborhood='${String(neighborhood).replace(/'/g, "''")}'`;
    const salesParams = new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: "200",
      f: "json",
    });
    const salesRes = await fetch(`${BELL_MARKET_SALES_QUERY_URL}?${salesParams.toString()}`);
    const salesPayload = await salesRes.json();
    if (!salesRes.ok || salesPayload.error || !Array.isArray(salesPayload.features)) return [];

    const salesRows = salesPayload.features.map((feature) => normalizeSalesPoint(feature));
    const propIds = [
      ...new Set(
        salesRows
          .map((row) => normalizePropIdComparable(row.propertyId))
          .filter(Boolean)
      ),
    ];
    const addrByProp = new Map();
    // Keep URL safely below ArcGIS gateway limits for IN(...) queries.
    const chunkSize = 20;
    for (let i = 0; i < propIds.length; i += chunkSize) {
      const chunk = propIds.slice(i, i + chunkSize);
      const inClause = chunk.map((id) => sqlQuote(id)).join(",");
      const addressParams = new URLSearchParams({
        where: `PROP_ID IN (${inClause})`,
        outFields: "PROP_ID,Property_Address",
        returnGeometry: "false",
        resultRecordCount: String(chunk.length * 2),
        f: "json",
      });
      const addrRes = await fetch(`${BELL_MARKET_ANALYSIS_QUERY_URL}?${addressParams.toString()}`);
      const addrPayload = await addrRes.json();
      if (!addrRes.ok || addrPayload.error || !Array.isArray(addrPayload.features)) continue;
      addrPayload.features.forEach((f) => {
        const a = (f && f.attributes) || {};
        const pid = getAny(a, ["PROP_ID", "prop_id"]);
        const adr = getAny(a, ["Property_Address", "property_address"]);
        const key = normalizePropIdComparable(pid);
        if (key && adr) addrByProp.set(key, String(adr));
      });
    }
    return salesRows.map((n) => {
      const key = normalizePropIdComparable(n.propertyId);
      if (key && addrByProp.has(key)) n.propertyAddress = addrByProp.get(key);
      return n;
    });
  }

  async function fetchNeighborhoodCodesByCity(city) {
    if (!city) return [];
    const safeCity = String(city || "").replace(/'/g, "''");
    const where = `UPPER(situs_city)='${normalizeCityText(safeCity)}'`;
    const params = new URLSearchParams({
      where,
      outFields: "hood_cd",
      returnGeometry: "false",
      resultRecordCount: "5000",
      f: "json",
    });
    const res = await fetch(`${BELL_ARCGIS_QUERY_URL}?${params.toString()}`);
    const payload = await res.json();
    if (!res.ok || payload.error || !Array.isArray(payload.features)) return [];
    return [...new Set(payload.features.map((f) => getAny((f && f.attributes) || {}, ["hood_cd", "HOOD_CD"])).filter(Boolean))];
  }

  async function fetchSalesByNeighborhoodCodes(codes, city) {
    const uniqueCodes = [...new Set((codes || []).map((c) => String(c).trim()).filter(Boolean))];
    if (!uniqueCodes.length) return [];
    const inClause = uniqueCodes.map((c) => sqlQuote(c)).join(",");
    const where = `Neighborhood IN (${inClause})`;
    const salesParams = new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: "4000",
      f: "json",
    });
    const salesRes = await fetch(`${BELL_MARKET_SALES_QUERY_URL}?${salesParams.toString()}`);
    const salesPayload = await salesRes.json();
    if (!salesRes.ok || salesPayload.error || !Array.isArray(salesPayload.features)) return [];

    const cityUpper = normalizeCityText(city);
    const salesRows = salesPayload.features.map((feature) => normalizeSalesPoint(feature));
    const propIds = [
      ...new Set(
        salesRows
          .map((row) => normalizePropIdComparable(row.propertyId))
          .filter(Boolean)
      ),
    ];
    const addrByProp = new Map();
    // Keep URL safely below ArcGIS gateway limits for IN(...) queries.
    const chunkSize = 20;
    for (let i = 0; i < propIds.length; i += chunkSize) {
      const chunk = propIds.slice(i, i + chunkSize);
      const inClause = chunk.map((id) => sqlQuote(id)).join(",");
      const addressParams = new URLSearchParams({
        where: `PROP_ID IN (${inClause})`,
        outFields: "PROP_ID,Property_Address",
        returnGeometry: "false",
        resultRecordCount: String(chunk.length * 2),
        f: "json",
      });
      const addrRes = await fetch(`${BELL_MARKET_ANALYSIS_QUERY_URL}?${addressParams.toString()}`);
      const addrPayload = await addrRes.json();
      if (!addrRes.ok || addrPayload.error || !Array.isArray(addrPayload.features)) continue;
      addrPayload.features.forEach((f) => {
        const a = (f && f.attributes) || {};
        const pid = getAny(a, ["PROP_ID", "prop_id"]);
        const adr = getAny(a, ["Property_Address", "property_address"]);
        const key = normalizePropIdComparable(pid);
        if (key && adr) addrByProp.set(key, String(adr));
      });
    }
    const matchedRows = salesRows.map((n) => {
      const key = normalizePropIdComparable(n.propertyId);
      if (key && addrByProp.has(key)) n.propertyAddress = addrByProp.get(key);
      return n;
    });
    if (!cityUpper) return matchedRows;
    const cityFiltered = matchedRows.filter((row) => {
      const attrs = row.rawAttributes || {};
      const rowCity = normalizeCityText(getAny(attrs, ["situs_city", "SITUS_CITY", "City", "city"]));
      const addrCity = normalizeCityText(getAny(attrs, ["Property_City", "property_city"]));
      return rowCity === cityUpper || addrCity === cityUpper;
    });
    // Some feeds omit city on sales rows; keep neighborhood-code matches rather than emptying city comps.
    return cityFiltered.length > 0 ? cityFiltered : matchedRows;
  }

  async function fetchNeighborhoodMarketAreaMap(codes) {
    const map = new Map();
    const unique = [...new Set((codes || []).map((c) => String(c || "").trim()).filter(Boolean))];
    const chunkSize = 30;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const inClause = chunk.map((c) => sqlQuote(c)).join(",");
      const where = `Neighborhood IN (${inClause})`;
      const params = new URLSearchParams({
        where,
        outFields: "*",
        returnGeometry: "false",
        resultRecordCount: "4000",
        f: "json",
      });
      const res = await fetch(`${BELL_MARKET_ANALYSIS_QUERY_URL}?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok || payload.error || !Array.isArray(payload.features)) continue;
      payload.features.forEach((feature) => {
        const n = normalizeMarketAnalysis(feature);
        const code = n.neighborhood != null ? String(n.neighborhood).trim() : "";
        const name = n.neighborhoodMarketArea != null ? String(n.neighborhoodMarketArea).trim() : "";
        if (code && name && !map.has(code)) map.set(code, name);
      });
    }
    return map;
  }

  function normalizePropIdComparable(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(n)) return String(Math.round(n));
    return raw.toUpperCase();
  }

  function collectNeighborhoodCodesForMarketArea(parcel) {
    const codes = [];
    const pushHood = (value) => {
      const text = String(value == null ? "" : value).trim();
      if (text) codes.push(text);
    };
    if (parcel && parcel.marketAnalysis) pushHood(parcel.marketAnalysis.neighborhood);
    (parcel && parcel.neighborhoodSales ? parcel.neighborhoodSales : []).forEach((row) =>
      pushHood(row.neighborhood)
    );
    (parcel && parcel.citySales ? parcel.citySales : []).forEach((row) => pushHood(row.neighborhood));
    return codes;
  }

  function createGeoJsonSource() {
    const baseDir = "./data/geojson/bell-tx";
    const FLAT_LAYERS = {
      parcels: "parcels.geojson",
      "market-analysis": "market-analysis.geojson",
      sales: "sales.geojson",
    };
    const cache = new Map();
    let pathsPromise = null;
    let resolvedYear = null;

    async function resolvePaths() {
      if (pathsPromise) return pathsPromise;
      pathsPromise = (async () => {
        try {
          const res = await fetch(`${baseDir}/manifest.json`, { cache: "no-cache" });
          if (res.ok) {
            const manifest = await res.json();
            const layers = (manifest && manifest.layers) || {};
            const year = manifest && manifest.latest ? String(manifest.latest) : null;
            if (year) {
              resolvedYear = year;
              const yearDir = `${baseDir}/${year}`;
              return {
                parcels: `${yearDir}/${layers.parcels || FLAT_LAYERS.parcels}`,
                marketAnalysis: `${yearDir}/${layers["market-analysis"] || FLAT_LAYERS["market-analysis"]}`,
                sales: `${yearDir}/${layers.sales || FLAT_LAYERS.sales}`,
              };
            }
          }
        } catch (err) {
          console.warn("GeoJSON mode: manifest.json unreadable, falling back to flat layout.", err);
        }
        resolvedYear = null;
        return {
          parcels: `${baseDir}/${FLAT_LAYERS.parcels}`,
          marketAnalysis: `${baseDir}/${FLAT_LAYERS["market-analysis"]}`,
          sales: `${baseDir}/${FLAT_LAYERS.sales}`,
        };
      })();
      return pathsPromise;
    }

    async function loadCollection(path) {
      if (cache.has(path)) return cache.get(path);
      const promise = (async () => {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) {
          throw new Error(`GeoJSON mode: failed to load ${path} (${res.status})`);
        }
        const data = await res.json();
        if (!data || !Array.isArray(data.features)) {
          throw new Error(`GeoJSON mode: invalid FeatureCollection in ${path}`);
        }
        return data.features;
      })();
      cache.set(path, promise);
      return promise;
    }

    async function checkCollection(path, label) {
      try {
        const features = await loadCollection(path);
        return { id: label, label, up: true, detail: `${features.length.toLocaleString()} features` };
      } catch (err) {
        return { id: label, label, up: false, detail: String((err && err.message) || err) };
      }
    }

    async function loadAll() {
      const paths = await resolvePaths();
      const [parcelFeatures, marketFeatures, salesFeatures] = await Promise.all([
        loadCollection(paths.parcels),
        loadCollection(paths.marketAnalysis),
        loadCollection(paths.sales),
      ]);
      return { parcelFeatures, marketFeatures, salesFeatures };
    }

    async function getHealth() {
      const paths = await resolvePaths();
      const checks = await Promise.all([
        checkCollection(paths.parcels, "parcels.geojson"),
        checkCollection(paths.marketAnalysis, "market-analysis.geojson"),
        checkCollection(paths.sales, "sales.geojson"),
      ]);
      const allUp = checks.every((c) => c.up);
      if (allUp) {
        const parcelFeatures = await loadCollection(paths.parcels);
        const marketFeatures = await loadCollection(paths.marketAnalysis);
        const salesFeatures = await loadCollection(paths.sales);
        return {
          mode: "geojson",
          ok: allUp,
          checkedAt: new Date().toISOString(),
          year: resolvedYear,
          counts: {
            parcels: parcelFeatures.length,
            marketAnalysis: marketFeatures.length,
            sales: salesFeatures.length,
          },
          sources: checks,
          paths,
        };
      }
      return {
        mode: "geojson",
        ok: false,
        checkedAt: new Date().toISOString(),
        year: resolvedYear,
        error: checks.find((c) => !c.up)?.detail || "snapshot load failed",
        sources: checks,
        paths,
      };
    }

    function findMarketForPropId(marketFeatures, propId) {
      const target = normalizePropIdComparable(propId);
      if (!target) return null;
      for (const f of marketFeatures) {
        const m = normalizeMarketAnalysis(f);
        if (normalizePropIdComparable(m.propId) === target) return m;
      }
      return null;
    }

    function salesRowsForNeighborhood(salesFeatures, marketByProp, neighborhood) {
      const targetNeighborhood = String(neighborhood || "").trim();
      if (!targetNeighborhood) return [];
      return salesFeatures
        .map((f) => normalizeSalesPoint(f))
        .filter((row) => String(row.neighborhood || "").trim() === targetNeighborhood)
        .map((row) => {
          const key = normalizePropIdComparable(row.propertyId);
          const market = key ? marketByProp.get(key) : null;
          if (market && market.propertyAddress) row.propertyAddress = market.propertyAddress;
          return row;
        });
    }

    function neighborhoodCodesByCity(parcelFeatures, city) {
      const cityUpper = normalizeCityText(city);
      if (!cityUpper) return [];
      const out = new Set();
      parcelFeatures.forEach((f) => {
        const a = attrsOf(f);
        const rowCity = normalizeCityText(getAny(a, ["situs_city", "SITUS_CITY", "addr_city", "ADDR_CITY"]));
        if (rowCity !== cityUpper) return;
        const hood = getAny(a, ["hood_cd", "HOOD_CD"]);
        if (hood != null && String(hood).trim()) out.add(String(hood).trim());
      });
      return [...out];
    }

    function salesRowsForNeighborhoodCodes(salesFeatures, marketByProp, codes, city) {
      const codeSet = new Set((codes || []).map((c) => String(c).trim()).filter(Boolean));
      const cityUpper = normalizeCityText(city);
      const matchedRows = salesFeatures
        .map((f) => normalizeSalesPoint(f))
        .filter((row) => codeSet.has(String(row.neighborhood || "").trim()))
        .map((row) => {
          const key = normalizePropIdComparable(row.propertyId);
          const market = key ? marketByProp.get(key) : null;
          if (market && market.propertyAddress) row.propertyAddress = market.propertyAddress;
          return row;
        });
      if (!cityUpper) return matchedRows;
      const cityFiltered = matchedRows.filter((row) => {
        const attrs = row.rawAttributes || {};
        const rowCity = normalizeCityText(getAny(attrs, ["situs_city", "SITUS_CITY", "City", "city"]));
        const market = marketByProp.get(normalizePropIdComparable(row.propertyId));
        const marketAddr = normalizeCityText(getAny((market && market.rawAttributes) || {}, ["Property_City", "property_city"]));
        return rowCity === cityUpper || marketAddr === cityUpper;
      });
      // GeoJSON snapshots may miss city fields; keep code-matched rows as fallback.
      return cityFiltered.length > 0 ? cityFiltered : matchedRows;
    }

    function marketAreaMapForCodes(marketFeatures, codes) {
      const wanted = new Set((codes || []).map((c) => String(c).trim()).filter(Boolean));
      const map = new Map();
      marketFeatures.forEach((f) => {
        const m = normalizeMarketAnalysis(f);
        const code = String(m.neighborhood || "").trim();
        const name = String(m.neighborhoodMarketArea || "").trim();
        if (!code || !wanted.has(code) || !name || map.has(code)) return;
        map.set(code, name);
      });
      return map;
    }

    return {
      async searchParcelBundleByApn(apn) {
        const { parcelFeatures, marketFeatures, salesFeatures } = await loadAll();
        const target = normalizePropIdComparable(apn);
        const parcelFeature = parcelFeatures.find((f) => {
          const a = attrsOf(f);
          const candidates = [
            getAny(a, ["prop_id", "PROP_ID"]),
            getAny(a, ["prop_id_text", "PROP_ID_TEXT"]),
            getAny(a, ["REF_ID2"]),
          ];
          return candidates.some((v) => normalizePropIdComparable(v) === target);
        });
        if (!parcelFeature) throw new Error("No parcel found for that Property ID/APN");

        const parcel = normalizeBellParcel(parcelFeature);
        const marketByProp = new Map(
          marketFeatures.map((f) => {
            const m = normalizeMarketAnalysis(f);
            return [normalizePropIdComparable(m.propId), m];
          })
        );
        parcel.marketAnalysis = findMarketForPropId(marketFeatures, parcel.parcelId || apn);
        parcel.neighborhoodSales = salesRowsForNeighborhood(
          salesFeatures,
          marketByProp,
          parcel.marketAnalysis && parcel.marketAnalysis.neighborhood
        );
        parcel.cityNeighborhoodCodes = neighborhoodCodesByCity(parcelFeatures, parcel.city);
        parcel.citySales = salesRowsForNeighborhoodCodes(
          salesFeatures,
          marketByProp,
          parcel.cityNeighborhoodCodes,
          parcel.city
        );

        const codesForMarketArea = collectNeighborhoodCodesForMarketArea(parcel);
        parcel.neighborhoodMarketAreaByCode = marketAreaMapForCodes(marketFeatures, codesForMarketArea);
        const ma0 = parcel.marketAnalysis;
        if (ma0 && ma0.neighborhood && ma0.neighborhoodMarketArea) {
          parcel.neighborhoodMarketAreaByCode.set(
            String(ma0.neighborhood).trim(),
            String(ma0.neighborhoodMarketArea).trim()
          );
        }
        return parcel;
      },
      async getHealth() {
        return getHealth();
      },
    };
  }

  function createLiveSource() {
    async function probe(url, label) {
      try {
        const infoUrl = `${String(url).replace(/\/query$/i, "")}?f=pjson`;
        const res = await fetch(infoUrl, { cache: "no-cache" });
        if (!res.ok) return { id: label, label, up: false, detail: `HTTP ${res.status}` };
        const payload = await res.json();
        if (payload && payload.error) {
          return {
            id: label,
            label,
            up: false,
            detail: payload.error.message || "Service error",
          };
        }
        return { id: label, label, up: true, detail: "reachable" };
      } catch (err) {
        return { id: label, label, up: false, detail: String((err && err.message) || err) };
      }
    }

    return {
      async searchParcelBundleByApn(apn) {
        const safe = String(apn || "").trim().replace(/'/g, "''");
        const numericId = Number(apn);
        const where =
          Number.isFinite(numericId) && numericId > 0
            ? `PROP_ID=${numericId}`
            : `PROP_ID_TEXT='${safe}' OR prop_id_text='${safe}'`;
        const params = new URLSearchParams({
          where,
          outFields: "*",
          returnGeometry: "true",
          resultRecordCount: "1",
          f: "json",
        });
        const res = await fetch(`${BELL_ARCGIS_QUERY_URL}?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok || payload.error) {
          throw new Error((payload.error && payload.error.message) || "BellCAD query failed");
        }
        if (!payload.features || payload.features.length === 0) {
          throw new Error("No parcel found for that Property ID/APN");
        }

        const parcel = normalizeBellParcel(payload.features[0]);
        parcel.marketAnalysis = await fetchMarketAnalysisByPropId(parcel.parcelId || apn);
        parcel.neighborhoodSales = await fetchNeighborhoodSalesByNeighborhood(
          parcel.marketAnalysis && parcel.marketAnalysis.neighborhood
        );
        parcel.cityNeighborhoodCodes = await fetchNeighborhoodCodesByCity(parcel.city);
        parcel.citySales = await fetchSalesByNeighborhoodCodes(parcel.cityNeighborhoodCodes, parcel.city);

        const codesForMarketArea = collectNeighborhoodCodesForMarketArea(parcel);
        parcel.neighborhoodMarketAreaByCode = await fetchNeighborhoodMarketAreaMap(codesForMarketArea);
        const ma0 = parcel.marketAnalysis;
        if (ma0 && ma0.neighborhood && ma0.neighborhoodMarketArea) {
          parcel.neighborhoodMarketAreaByCode.set(
            String(ma0.neighborhood).trim(),
            String(ma0.neighborhoodMarketArea).trim()
          );
        }

        return parcel;
      },
      async getHealth() {
        const sources = await Promise.all([
          probe(BELL_ARCGIS_QUERY_URL, "Parcel service"),
          probe(BELL_MARKET_ANALYSIS_QUERY_URL, "Market analysis service"),
          probe(BELL_MARKET_SALES_QUERY_URL, "Sales service"),
        ]);
        return {
          mode: "live",
          ok: sources.every((s) => s.up),
          checkedAt: new Date().toISOString(),
          sources,
        };
      },
    };
  }

  function createBellCountyAdapter(options) {
    const sourceMode = options && options.sourceMode === "geojson" ? "geojson" : "live";
    const links = buildLinks();
    const source = sourceMode === "geojson" ? createGeoJsonSource() : createLiveSource();
    return {
      countyId: "bell-tx",
      sourceMode,
      links,
      async searchParcelBundleByApn(apn) {
        return source.searchParcelBundleByApn(apn);
      },
      async getSourceHealth() {
        if (source && typeof source.getHealth === "function") {
          return source.getHealth();
        }
        return { mode: sourceMode, ok: true };
      },
    };
  }

  function createAdapter(countyId, sourceMode) {
    if (countyId !== "bell-tx") throw new Error(`Unsupported county '${countyId}'`);
    return createBellCountyAdapter({ sourceMode });
  }

  window.ProtestCountyAdapters = {
    createAdapter,
  };
})();
