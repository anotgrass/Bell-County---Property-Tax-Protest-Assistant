/** Current-year property search & detail pages */
const BELL_ESEARCH_GSA_BASE = "https://esearchgsa.bellcad.org";
/** Prior years & taxes (legacy eSearch) */
const BELL_ESEARCH_PRIOR_BASE = "https://esearch.bellcad.org";

function bellcadSearchUrlCurrent() {
  const links = getActiveLinks();
  return links ? links.searchCurrent() : `${BELL_ESEARCH_GSA_BASE}/Property/Search`;
}

function bellcadPropertyViewUrlCurrent(propertyId) {
  const links = getActiveLinks();
  return links ? links.propertyViewCurrent(propertyId) : bellcadSearchUrlCurrent();
}

function bellcadSearchUrlPrior() {
  const links = getActiveLinks();
  return links ? links.searchPrior() : `${BELL_ESEARCH_PRIOR_BASE}/Property/Search`;
}

function bellcadPropertyViewUrlPrior(propertyId) {
  const links = getActiveLinks();
  return links ? links.propertyViewPrior(propertyId) : bellcadSearchUrlPrior();
}

function bellcadMarketAnalysisMapUrl(propertyId) {
  const links = getActiveLinks();
  return links ? links.marketAnalysisMap(propertyId) : "";
}

/** @type {ParcelBundle|null} */
let currentParcel = null;
/** @type {ValuationResult|null} */
let currentValuation = null;
/** @type {PacketResult|null} */
let currentPacket = null;
/** @type {NoticeSummaryUi|null} */
let currentNoticeSummary = null;
let appSettings = { countyId: "bell-tx", dataSource: "live" };
let activeAdapter = null;
let currentTheme = window.localStorage.getItem("protest_assistant_theme") || "dark";
let workflowUnlocked = false;
let activeDashboardStepId = "step-market";
let activeAppPage = "find";
let pendingCompPhotoTarget = null;
let activeCompPhotoViewer = null;
const COMP_ATTACH_DB = "protest_comp_attachments_v1";
const COMP_ATTACH_STORE = "counts";
let compAttachDbPromise = null;

const MAX_PROTEST_FACTS_CHARS = 4000;
const UI_PREFS_KEY = "protest_assistant_ui_prefs";
let worksheetValueOpinionUserSet = false;
let uiPrefs = readUiPrefs();
const COMP_ATTACH_FILE_STORE = "files";

/**
 * @typedef {Object} UiPrefs
 * @property {"sm"|"md"|"lg"} textSize
 * @property {"comfortable"|"compact"} density
 * @property {boolean} hideHelp
 */

/**
 * @typedef {Object} CompAttachmentState
 * @property {Record<string, number>} nhoodCounts
 * @property {Record<string, number>} cityCounts
 * @property {Record<string, string[]>} nhoodNames
 * @property {Record<string, string[]>} cityNames
 */

/**
 * @typedef {Object} PacketResult
 * @property {string} [generatedAt]
 * @property {string[]} [checklist]
 * @property {Object} [packet]
 */

/**
 * Neighborhood / subject market record (Bell market-analysis layer), normalized for UI.
 * @typedef {Object} MarketAnalysisSnapshot
 * @property {string|number|null} [propId]
 * @property {string|number|null} [geoId]
 * @property {string|null} [propertyAddress]
 * @property {string|number} [squareFoot]
 * @property {string|number} [marketValue]
 * @property {string|number|null} [neighborhood]
 * @property {string|number|null} [neighborhoodMarketArea]
 * @property {string|number} [numberOfHouses]
 * @property {string|number} [newHouses]
 * @property {string|number} [numberOfSales]
 * @property {string|number} [medianYearBuilt]
 * @property {string|number} [medianSqFt]
 * @property {string|number} [medianValue]
 * @property {string|number} [medianSalesPrice]
 * @property {string|number} [medianSqFtOfSales]
 * @property {string|null} [sqFtRange]
 * @property {string|null} [salesSqFtRange]
 * @property {Record<string, *>} [rawAttributes]
 */

/**
 * Comparable sale row (neighborhood or city lists).
 * @typedef {Object} CompSaleRow
 * @property {string|number|null} [propertyId]
 * @property {string|null} [propertyAddress]
 * @property {string|number|null} [squareFoot]
 * @property {string|null} [saleDate]
 * @property {string|number|null} [neighborhood]
 * @property {Record<string, *>} [rawAttributes]
 * @property {number} [sqftDeltaAbs]
 * @property {number} [sqftDeltaPct]
 * @property {number} [rowSqft]
 */

/**
 * Parcel as returned from the county adapter, plus UI-only fields (comps, photos, derived rows).
 * @typedef {Object} ParcelBundle
 * @property {string|null} [parcelId]
 * @property {string|null} [situsAddress]
 * @property {string|null} [ownerName]
 * @property {string|null} [city]
 * @property {string|number} [landValue]
 * @property {string|number} [improvementValue]
 * @property {string|number} [assessedTotal]
 * @property {string|number} [sqft]
 * @property {string|null} [legalDescription]
 * @property {string|null} [ownerTaxYear]
 * @property {MarketAnalysisSnapshot|null} [marketAnalysis]
 * @property {CompSaleRow[]} [neighborhoodSales]
 * @property {string[]} [cityNeighborhoodCodes]
 * @property {CompSaleRow[]} [citySales]
 * @property {Map<string, string>|undefined} [neighborhoodMarketAreaByCode]
 * @property {Record<string, number>} [compSalePricesNhood]
 * @property {Record<string, number>} [compSalePricesCity]
 * @property {Record<string, number>} [compPhotoCountsNhood]
 * @property {Record<string, number>} [compPhotoCountsCity]
 * @property {Record<string, string[]>} [compPhotoNamesNhood]
 * @property {Record<string, string[]>} [compPhotoNamesCity]
 * @property {CompSaleRow[]} [citySalesDisplayRows]
 */

/**
 * Notice-of-value inputs read from the worksheet (derived deltas for UI chips).
 * @typedef {Object} NoticeSummaryUi
 * @property {null} [noticeDate]
 * @property {null} [protestDeadline]
 * @property {null} [deadlineInDays]
 * @property {number} lastYearMarket
 * @property {number} proposedMarket
 * @property {number} marketIncreasePct
 * @property {number} lastYearAssessed
 * @property {number} proposedAssessed
 * @property {number} assessedIncreasePct
 */

/**
 * @typedef {Object} TrendHistoryRow
 * @property {number} year
 * @property {number} assessedValue
 */

/**
 * @typedef {Object} TrendSummary
 * @property {TrendHistoryRow[]} entries
 * @property {number} startYear
 * @property {number} endYear
 * @property {number} totalChange
 * @property {number} totalChangePct
 * @property {number} annualizedChangePct
 */

/**
 * @typedef {Object} SelectedCompPriceRow
 * @property {"Neighborhood"|"Same city"} source
 * @property {string} propertyId
 * @property {number} salePrice
 * @property {number} rowSqft
 * @property {number} adjustedToSubject
 */

/**
 * @typedef {Object} CompsSummary
 * @property {SelectedCompPriceRow[]} selectedRows
 * @property {number} count
 * @property {number} medianRawSalePrice
 * @property {number} medianSqftAdjustedSalePrice
 * @property {number} neighborhoodCount
 * @property {number} cityCount
 */

/**
 * Result object produced by scoreParcel() for the valuation panel and packet draft.
 * @typedef {Object} ValuationResult
 * @property {string} county
 * @property {number} assessedTotal
 * @property {number} suggestedValue
 * @property {number} reductionAmount
 * @property {number} reductionPct
 * @property {number} protestStrengthScore
 * @property {"strong"|"moderate"|"weak"} protestStrengthBand
 * @property {number} baseModelSuggestedValue
 * @property {CompsSummary|null} compsSummary
 * @property {string[]} reasoning
 * @property {Object} confidence
 * @property {TrendSummary|null} trendSummary
 * @property {NoticeSummaryUi|null} noticeSummary
 */

function normalizeTextSize(value) {
  if (value === "sm" || value === "lg" || value === "md") return value;
  return "md";
}

/**
 * @returns {UiPrefs}
 */
function readUiPrefs() {
  try {
    const raw = window.localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { textSize: "md", density: "comfortable", hideHelp: false };
    const parsed = JSON.parse(raw);
    return {
      textSize: normalizeTextSize(parsed && typeof parsed.textSize === "string" ? parsed.textSize : "md"),
      density: parsed && typeof parsed.density === "string" ? parsed.density : "comfortable",
      hideHelp: !!(parsed && parsed.hideHelp),
    };
  } catch (err) {
    console.warn("Ignoring invalid UI prefs in localStorage.", err);
    return { textSize: "md", density: "comfortable", hideHelp: false };
  }
}

function writeUiPrefs(next) {
  uiPrefs = {
    textSize: normalizeTextSize(next && typeof next.textSize === "string" ? next.textSize : "md"),
    density: next && typeof next.density === "string" ? next.density : "comfortable",
    hideHelp: !!(next && next.hideHelp),
  };
  window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiPrefs));
  applyUiPrefs();
}

function applyUiPrefs() {
  const textSizeChoice = normalizeTextSize(uiPrefs.textSize);
  const textSize = textSizeChoice;
  const density = uiPrefs.density === "compact" ? "compact" : "comfortable";
  const hideHelp = !!uiPrefs.hideHelp;

  document.documentElement.classList.remove("ui-text-sm", "ui-text-md", "ui-text-lg");
  document.documentElement.classList.add(`ui-text-${textSize}`);
  document.body.classList.toggle("ui-text-sm", textSize === "sm");
  document.body.classList.toggle("ui-text-lg", textSize === "lg");
  document.body.classList.toggle("ui-density-compact", density === "compact");
  document.body.classList.toggle("ui-hide-help", hideHelp);

  const textSizeSelect = byId("uiTextSizeSelect");
  const densitySelect = byId("uiDensitySelect");
  const hideHelpToggle = byId("uiHideHelpToggle");
  const hideHelpState = byId("uiHideHelpState");
  if (textSizeSelect) textSizeSelect.value = textSizeChoice;
  if (densitySelect) densitySelect.value = density;
  if (hideHelpToggle) hideHelpToggle.checked = hideHelp;
  if (hideHelpState) hideHelpState.textContent = hideHelp ? "ON" : "OFF";
}

function byId(id) {
  return document.getElementById(id);
}

function getParcelAttachmentKey() {
  if (!currentParcel) return "";
  const base =
    currentParcel.parcelId ||
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.propId) ||
    "";
  return String(base || "").trim();
}

function openCompAttachDb() {
  if (compAttachDbPromise) return compAttachDbPromise;
  compAttachDbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(COMP_ATTACH_DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(COMP_ATTACH_STORE)) {
        const store = db.createObjectStore(COMP_ATTACH_STORE, { keyPath: "id" });
        store.createIndex("parcelId", "parcelId", { unique: false });
      }
      if (!db.objectStoreNames.contains(COMP_ATTACH_FILE_STORE)) {
        const fileStore = db.createObjectStore(COMP_ATTACH_FILE_STORE, { keyPath: "id" });
        fileStore.createIndex("parcelId", "parcelId", { unique: false });
        fileStore.createIndex("attachmentId", "attachmentId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open attachment DB"));
  });
  return compAttachDbPromise;
}

async function loadCompAttachmentState(parcelId) {
  const key = String(parcelId || "").trim();
  /** @type {CompAttachmentState} */
  const empty = { nhoodCounts: {}, cityCounts: {}, nhoodNames: {}, cityNames: {} };
  if (!key || !window.indexedDB) return empty;
  const db = await openCompAttachDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([COMP_ATTACH_STORE, COMP_ATTACH_FILE_STORE], "readonly");
    const countStore = tx.objectStore(COMP_ATTACH_STORE);
    const fileStore = tx.objectStore(COMP_ATTACH_FILE_STORE);
    const countReq = countStore.index("parcelId").getAll(key);
    const fileReq = fileStore.index("parcelId").getAll(key);
    tx.oncomplete = () => {
      /** @type {CompAttachmentState} */
      const out = { nhoodCounts: {}, cityCounts: {}, nhoodNames: {}, cityNames: {} };
      (countReq.result || []).forEach((item) => {
        const count = Number(item && item.count);
        if (!item || !item.source || !item.rowKey) return;
        if (!Number.isFinite(count) || count <= 0) return;
        if (item.source === "city") out.cityCounts[item.rowKey] = Math.round(count);
        else out.nhoodCounts[item.rowKey] = Math.round(count);
      });
      (fileReq.result || []).forEach((item) => {
        if (!item || !item.source || !item.rowKey || !item.name) return;
        const target = item.source === "city" ? out.cityNames : out.nhoodNames;
        target[item.rowKey] = target[item.rowKey] || [];
        target[item.rowKey].push(String(item.name));
      });
      resolve(out);
    };
    tx.onerror = () => reject(tx.error || new Error("Failed to load attachment state"));
  });
}

function warnStorageIssue(action, err) {
  const detail = String((err && err.message) || err || "Unknown storage error");
  console.warn(`Attachment storage warning while ${action}: ${detail}`);
  setStatus("packetStatus", `Attachment storage warning (${action}). Changes may not persist.`);
}

async function saveCompAttachmentCount(parcelId, source, rowKey, count) {
  const key = String(parcelId || "").trim();
  if (!key || !source || !rowKey || !window.indexedDB) return;
  const db = await openCompAttachDb();
  const id = `${key}|${source}|${rowKey}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(COMP_ATTACH_STORE, "readwrite");
    const store = tx.objectStore(COMP_ATTACH_STORE);
    if (!count || count <= 0) {
      store.delete(id);
    } else {
      store.put({
        id,
        parcelId: key,
        source,
        rowKey,
        count: Math.round(count),
        updatedAt: Date.now(),
      });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to save attachment count"));
  });
}

async function saveCompAttachmentFiles(parcelId, source, rowKey, files) {
  const key = String(parcelId || "").trim();
  if (!key || !source || !rowKey || !window.indexedDB) return;
  const db = await openCompAttachDb();
  const attachmentId = `${key}|${source}|${rowKey}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(COMP_ATTACH_FILE_STORE, "readwrite");
    const store = tx.objectStore(COMP_ATTACH_FILE_STORE);
    const idx = store.index("attachmentId");
    const getReq = idx.getAllKeys(attachmentId);
    getReq.onsuccess = () => {
      (getReq.result || []).forEach((k) => store.delete(k));
      Array.from(files || []).forEach((file, i) => {
        store.put({
          id: `${attachmentId}|${Date.now()}|${i}|${file.name}`,
          attachmentId,
          parcelId: key,
          source,
          rowKey,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          blob: file,
        });
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to save attachment files"));
  });
}

async function removeCompAttachmentFiles(parcelId, source, rowKey) {
  const key = String(parcelId || "").trim();
  if (!key || !source || !rowKey || !window.indexedDB) return;
  const db = await openCompAttachDb();
  const attachmentId = `${key}|${source}|${rowKey}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(COMP_ATTACH_FILE_STORE, "readwrite");
    const store = tx.objectStore(COMP_ATTACH_FILE_STORE);
    const idx = store.index("attachmentId");
    const req = idx.getAllKeys(attachmentId);
    req.onsuccess = () => {
      (req.result || []).forEach((k) => store.delete(k));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to remove attachment files"));
  });
}

async function loadCompAttachmentFiles(parcelId, source, rowKey) {
  const key = String(parcelId || "").trim();
  if (!key || !source || !rowKey || !window.indexedDB) return [];
  const db = await openCompAttachDb();
  const attachmentId = `${key}|${source}|${rowKey}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMP_ATTACH_FILE_STORE, "readonly");
    const store = tx.objectStore(COMP_ATTACH_FILE_STORE);
    const req = store.index("attachmentId").getAll(attachmentId);
    req.onsuccess = () => {
      const rows = (req.result || []).slice().sort((a, b) => {
        const aTime = Number(a && a.lastModified) || 0;
        const bTime = Number(b && b.lastModified) || 0;
        return bTime - aTime;
      });
      resolve(rows);
    };
    req.onerror = () => reject(req.error || new Error("Failed to load attachment files"));
  });
}

async function removeCompAttachmentFile(parcelId, source, rowKey, fileId) {
  const key = String(parcelId || "").trim();
  if (!key || !source || !rowKey || !fileId || !window.indexedDB) return;
  const db = await openCompAttachDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(COMP_ATTACH_FILE_STORE, "readwrite");
    tx.objectStore(COMP_ATTACH_FILE_STORE).delete(fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to remove attachment file"));
  });
}

function getCompPhotoCount(source, rowKey) {
  if (!currentParcel || !rowKey) return 0;
  const map =
    source === "city" ? currentParcel.compPhotoCountsCity || {} : currentParcel.compPhotoCountsNhood || {};
  const n = Number(map[rowKey] || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getCompAttachmentNames(source, rowKey) {
  if (!currentParcel || !rowKey) return [];
  const map =
    source === "city"
      ? currentParcel.compPhotoNamesCity || {}
      : currentParcel.compPhotoNamesNhood || {};
  return Array.isArray(map[rowKey]) ? map[rowKey] : [];
}

function closeCompPhotosModal() {
  const modal = byId("compPhotosModal");
  if (!modal) return;
  modal.hidden = true;
  const body = byId("compPhotosModalBody");
  if (body) {
    body.querySelectorAll("[data-comp-photo-url]").forEach((img) => {
      const url = img.getAttribute("data-comp-photo-url");
      if (url) URL.revokeObjectURL(url);
    });
    body.innerHTML = "";
  }
  activeCompPhotoViewer = null;
}

async function openCompPhotosModal(source, rowKey) {
  if (!currentParcel) return;
  const modal = byId("compPhotosModal");
  const body = byId("compPhotosModalBody");
  const subtitle = byId("compPhotosModalSubtitle");
  if (!modal || !body || !subtitle) return;
  body.querySelectorAll("[data-comp-photo-url]").forEach((img) => {
    const url = img.getAttribute("data-comp-photo-url");
    if (url) URL.revokeObjectURL(url);
  });
  const parcelKey = getParcelAttachmentKey();
  const files = await loadCompAttachmentFiles(parcelKey, source, rowKey).catch((err) => {
    warnStorageIssue("loading photos for this comp", err);
    return [];
  });
  activeCompPhotoViewer = { source, rowKey };
  const fileCount = files.length;
  subtitle.textContent = `${fileCount} attached photo${fileCount === 1 ? "" : "s"} for this comp row.`;
  body.innerHTML = files.length
    ? files
        .map((item) => {
          const fileName = escapeHtml(String(item.name || "image"));
          const fileType = String(item.type || "");
          const isImage = fileType.startsWith("image/") && item.blob;
          const objectUrl = isImage ? URL.createObjectURL(item.blob) : "";
          return `<article class="comp-photo-card">
              ${
                isImage
                  ? `<img src="${objectUrl}" alt="${fileName}" data-comp-photo-url="${objectUrl}" />`
                  : `<div class="comp-photo-fallback">${fileName}</div>`
              }
              <div class="comp-photo-meta">
                <p class="comp-photo-name" title="${fileName}">${fileName}</p>
                <button type="button" data-comp-remove-one-btn data-comp-photo-id="${escapeHtml(
                  item.id
                )}" data-comp-photo-source="${source}" data-comp-row-key="${escapeHtml(
              rowKey
            )}">Remove</button>
              </div>
            </article>`;
        })
        .join("")
    : `<p class="muted">No stored photos found for this comp row.</p>`;
  modal.hidden = false;
}

async function removeSingleCompPhotoAndRefresh(source, rowKey, fileId) {
  if (!currentParcel) return;
  const parcelKey = getParcelAttachmentKey();
  await removeCompAttachmentFile(parcelKey, source, rowKey, fileId);
  const files = await loadCompAttachmentFiles(parcelKey, source, rowKey).catch((err) => {
    warnStorageIssue("reloading photos after remove", err);
    return [];
  });
  const names = files.map((f) => String(f.name || ""));
  const nextCount = names.length;
  if (source === "city") {
    currentParcel.compPhotoCountsCity = currentParcel.compPhotoCountsCity || {};
    currentParcel.compPhotoNamesCity = currentParcel.compPhotoNamesCity || {};
    if (nextCount > 0) {
      currentParcel.compPhotoCountsCity[rowKey] = nextCount;
      currentParcel.compPhotoNamesCity[rowKey] = names;
    } else {
      delete currentParcel.compPhotoCountsCity[rowKey];
      delete currentParcel.compPhotoNamesCity[rowKey];
    }
  } else {
    currentParcel.compPhotoCountsNhood = currentParcel.compPhotoCountsNhood || {};
    currentParcel.compPhotoNamesNhood = currentParcel.compPhotoNamesNhood || {};
    if (nextCount > 0) {
      currentParcel.compPhotoCountsNhood[rowKey] = nextCount;
      currentParcel.compPhotoNamesNhood[rowKey] = names;
    } else {
      delete currentParcel.compPhotoCountsNhood[rowKey];
      delete currentParcel.compPhotoNamesNhood[rowKey];
    }
  }
  await saveCompAttachmentCount(parcelKey, source, rowKey, nextCount).catch((err) =>
    warnStorageIssue("saving photo count", err)
  );
  renderSoldHomes(
    currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood,
    currentParcel.neighborhoodSales,
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
  );
  renderCitySoldHomes(
    currentParcel.city,
    currentParcel.cityNeighborhoodCodes,
    currentParcel.citySales,
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
  );
  if (activeCompPhotoViewer && activeCompPhotoViewer.source === source && activeCompPhotoViewer.rowKey === rowKey) {
    if (nextCount > 0) await openCompPhotosModal(source, rowKey);
    else closeCompPhotosModal();
  }
}

function bindCompPhotosModalControls() {
  const modal = byId("compPhotosModal");
  const backdrop = byId("compPhotosModalBackdrop");
  const closeBtn = byId("closeCompPhotosModalBtn");
  const body = byId("compPhotosModalBody");
  if (!modal) return;
  if (backdrop) backdrop.addEventListener("click", closeCompPhotosModal);
  if (closeBtn) closeBtn.addEventListener("click", closeCompPhotosModal);
  if (body) {
    body.addEventListener("click", async (event) => {
      const removeOneBtn = event.target.closest("[data-comp-remove-one-btn]");
      if (!removeOneBtn) return;
      const source = removeOneBtn.getAttribute("data-comp-photo-source");
      const rowKey = removeOneBtn.getAttribute("data-comp-row-key");
      const fileId = removeOneBtn.getAttribute("data-comp-photo-id");
      if (!source || !rowKey || !fileId) return;
      await removeSingleCompPhotoAndRefresh(source, rowKey, fileId).catch((err) =>
        warnStorageIssue("removing photo", err)
      );
    });
  }
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeCompPhotosModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCompPhotosModal();
  });
}

function renderCompActionsCell(source, rowKey, districtUrl, googleSearchUrl, forceDropUp = false) {
  const count = getCompPhotoCount(source, rowKey);
  const label = count > 0 ? `Attach photos (${count})` : "Attach photos";
  const names = getCompAttachmentNames(source, rowKey);
  const namesBlock = names.length
    ? `<div class="comp-actions-note" title="${escapeHtml(names.join(", "))}">${escapeHtml(
        names.slice(0, 2).join(", ")
      )}${names.length > 2 ? ` +${names.length - 2} more` : ""}</div>`
    : "";
  const removeBtn =
    count > 0
      ? `<button type="button" data-comp-remove-btn data-comp-photo-source="${source}" data-comp-row-key="${escapeHtml(
          rowKey
        )}">Remove attachments</button>`
      : "";
  const viewBtn =
    count > 0
      ? `<button type="button" data-comp-view-btn data-comp-photo-source="${source}" data-comp-row-key="${escapeHtml(
          rowKey
        )}">View photos</button>`
      : "";
  return `<details class="comp-actions-menu${forceDropUp ? " force-drop-up" : ""}">
    <summary>Menu</summary>
    <div class="comp-actions-panel">
      <a
        class="comp-actions-link"
        href="${districtUrl}"
        target="_blank"
        rel="noopener noreferrer"
        title="Open the county district property record in a new tab"
      ><span class="comp-actions-link-main">District <span aria-hidden="true">↗</span></span><span class="comp-actions-link-sub">Open county property record</span></a>
      <a
        class="comp-actions-link"
        href="${googleSearchUrl}"
        target="_blank"
        rel="noopener noreferrer"
        title="Search this sold home on Google in a new tab"
      ><span class="comp-actions-link-main">Google <span aria-hidden="true">↗</span></span><span class="comp-actions-link-sub">Search listing and sale traces</span></a>
      <div class="comp-actions-divider"></div>
      <button type="button" data-comp-attach-btn data-comp-photo-source="${source}" data-comp-row-key="${escapeHtml(
    rowKey
  )}">${escapeHtml(label)}</button>${viewBtn}${removeBtn}${namesBlock}
    </div>
  </details>`;
}

function getActiveLinks() {
  return activeAdapter && activeAdapter.links ? activeAdapter.links : null;
}

function applyTheme(themeName) {
  const next = themeName === "light" ? "light" : "dark";
  currentTheme = next;
  document.body.classList.toggle("theme-light", next === "light");
  window.localStorage.setItem("protest_assistant_theme", next);
  const btn = byId("themeToggleBtn");
  if (btn) {
    const icon = btn.querySelector(".theme-toggle-icon");
    const isLight = next === "light";
    if (icon) icon.textContent = isLight ? "🌙" : "☀";
    btn.setAttribute("aria-pressed", String(isLight));
    btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  }
  const lightBtn = byId("sidebarLightBtn");
  const darkBtn = byId("sidebarDarkBtn");
  if (lightBtn) {
    lightBtn.classList.toggle("is-active", next === "light");
    lightBtn.setAttribute("aria-pressed", String(next === "light"));
  }
  if (darkBtn) {
    darkBtn.classList.toggle("is-active", next !== "light");
    darkBtn.setAttribute("aria-pressed", String(next !== "light"));
  }
  syncHeaderOffset();
}

function syncHeaderOffset() {
  const header = document.querySelector(".site-header");
  const viewNav = document.querySelector("#dashboardPage .dashboard-view-nav");
  const navHeight = viewNav ? Math.ceil(viewNav.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--dashboard-nav-height", `${navHeight}px`);
  if (!header) return;
  const height = Math.ceil(header.getBoundingClientRect().height);
  const offset = Math.max(56, height + 14);
  document.documentElement.style.setProperty("--header-offset", `${offset}px`);
  const footer = document.querySelector(".app-legal-footer");
  const fh = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--legal-footer-height", `${Math.max(48, fh)}px`);
}

function setActiveAppPage(pageId) {
  const allowedTopLevel = new Set(["dashboard", "playbook", "about"]);
  const next = allowedTopLevel.has(pageId) ? pageId : "find";
  activeAppPage = next;
  document.body.classList.toggle("app-mode-dashboard", next === "dashboard");
  document.body.classList.toggle("app-mode-lookup", next !== "dashboard");
  const lookupPage = byId("lookupPage");
  const dashboardPage = byId("dashboardPage");
  const playbookPage = byId("playbookPage");
  const aboutPage = byId("aboutPage");
  if (lookupPage) lookupPage.hidden = next !== "find";
  if (dashboardPage) dashboardPage.hidden = next !== "dashboard";
  if (playbookPage) playbookPage.hidden = next !== "playbook";
  if (aboutPage) aboutPage.hidden = next !== "about";
  const menuLinks = [...document.querySelectorAll(".app-main-menu-link[data-app-page]")];
  menuLinks.forEach((link) => {
    const on = link.getAttribute("data-app-page") === next;
    link.classList.toggle("is-active", on);
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const backBtn = byId("backToFindBtn");
  const headerNav = document.querySelector(".site-nav");
  if (backBtn) {
    backBtn.hidden = next === "find";
  }
  if (headerNav) {
    headerNav.hidden = next === "find";
  }
  syncHeaderOffset();
}

function applyDashboardActiveStep() {
  const links = [...document.querySelectorAll(".dashboard-view-btn[data-step-target]")];
  const sections = STEP_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  links.forEach((link) => {
    const id = link.getAttribute("data-step-target");
    const on = workflowUnlocked && id === activeDashboardStepId;
    link.classList.toggle("is-active", on);
    if (on) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  sections.forEach((section) => {
    const on = workflowUnlocked && section.id === activeDashboardStepId;
    section.classList.toggle("is-view-active", on);
    section.toggleAttribute("hidden", workflowUnlocked && !on);
  });
}

function setActiveDashboardStep(stepId) {
  if (!workflowUnlocked) return;
  if (!STEP_SECTION_IDS.includes(stepId)) return;
  activeDashboardStepId = stepId;
  applyDashboardActiveStep();
}

function startNewSearch() {
  const input = byId("apnInputLanding");
  setWorkflowUnlocked(false);
  setActiveAppPage("find");
  activeDashboardStepId = "step-market";
  applyDashboardActiveStep();
  const legacyInput = byId("apnInput");
  if (legacyInput) legacyInput.value = "";
  if (input) {
    input.focus();
    input.select();
  }
}

function setWorkflowUnlocked(unlocked, animate = false) {
  workflowUnlocked = !!unlocked;
  document.body.classList.toggle("workflow-locked", !workflowUnlocked);
  const dashboardMenuBtn = byId("dashboardMenuBtn");
  if (dashboardMenuBtn) dashboardMenuBtn.hidden = !workflowUnlocked;
  if (workflowUnlocked) setActiveAppPage("dashboard");
  else if (activeAppPage === "dashboard") setActiveAppPage("find");
  const links = [...document.querySelectorAll(".dashboard-view-btn[data-step-target]")];
  links.forEach((link) => {
    const targetId = link.getAttribute("data-step-target");
    const disabled = !workflowUnlocked;
    link.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (disabled) link.setAttribute("tabindex", "-1");
    else link.removeAttribute("tabindex");
  });
  applyDashboardActiveStep();
  if (workflowUnlocked && animate) {
    const sections = [...document.querySelectorAll(".workflow-gated, #step-find")];
    sections.forEach((section, idx) => {
      section.classList.remove("unlock-reveal");
      section.style.animationDelay = `${idx * 40}ms`;
      void section.offsetWidth;
      section.classList.add("unlock-reveal");
    });
  }
}

function writeJson(id, value) {
  byId(id).textContent = JSON.stringify(value, null, 2);
}

function setStatus(id, message) {
  byId(id).textContent = message || "";
}

function setApnSearchLoading(isLoading) {
  const landingBtn = byId("searchApnLandingBtn");
  const dashBtn = byId("searchApnBtn");
  const spinLand = byId("apnSearchSpinnerLanding");
  const spinDash = byId("apnSearchSpinnerDashboard");
  [landingBtn, dashBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = !!isLoading;
    btn.setAttribute("aria-busy", isLoading ? "true" : "false");
  });
  [spinLand, spinDash].forEach((el) => {
    if (!el) return;
    if (isLoading) {
      el.removeAttribute("hidden");
      el.setAttribute("aria-hidden", "false");
    } else {
      el.setAttribute("hidden", "");
      el.setAttribute("aria-hidden", "true");
    }
  });
}

function initAppSettingsAndAdapter() {
  const svc = window.ProtestSettings;
  const adapters = window.ProtestCountyAdapters;
  if (!svc || !adapters) return;
  appSettings = svc.readSettings();
  activeAdapter = adapters.createAdapter(appSettings.countyId, appSettings.dataSource);
}

async function renderSourceHealth() {
  const el = byId("sourceHealth");
  if (!el) return;
  const fmtCheckedAt = (iso) => {
    if (!iso) return "n/a";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "n/a";
    return d.toLocaleString();
  };
  if (!activeAdapter || typeof activeAdapter.getSourceHealth !== "function") {
    el.innerHTML = "";
    el.className = "site-nav-health muted";
    syncHeaderOffset();
    return;
  }
  const buildSourceLines = (health) => {
    const rows = Array.isArray(health && health.sources) ? health.sources : [];
    if (!rows.length) return "<li><span class='source-status-dot source-status-dot-neutral'></span><span>No source details</span></li>";
    return rows
      .map(
        (s) =>
          `<li><span class="source-status-dot ${s.up ? "source-status-dot-up" : "source-status-dot-down"}"></span><span>${escapeHtml(
            s.label || s.id || "source"
          )}: ${escapeHtml(s.up ? "up" : "down")} — ${escapeHtml(s.detail || "")}</span></li>`
      )
      .join("");
  };
  const health = await activeAdapter.getSourceHealth();
  if (health && health.ok) {
    el.className = "site-nav-health site-nav-health-ok";
    const summary =
      health.mode === "geojson"
        ? `Local snapshot (admin) • ${fmtCheckedAt(health.checkedAt)}`
        : `Live services up • ${fmtCheckedAt(health.checkedAt)}`;
    el.innerHTML = `
      <button type="button" class="source-health-chip source-health-chip-ok" aria-label="Source status healthy">
        <span class="source-health-dot source-health-dot-pulse" aria-hidden="true"></span>
        <span>${escapeHtml(summary)}</span>
      </button>
      <div class="source-health-popover hover-text-panel" role="tooltip">
        <div class="source-health-popover-title hover-text-panel-title">Source details</div>
        <ul class="hover-text-panel-list">${buildSourceLines(health)}</ul>
      </div>`;
    syncHeaderOffset();
    return;
  }
  const errSummary = `${health && health.mode === "live" ? "Live services issue" : "Local snapshot issue"} • ${
    fmtCheckedAt(health && health.checkedAt)
  }`;
  el.className = "site-nav-health site-nav-health-error";
  el.innerHTML = `
    <button type="button" class="source-health-chip source-health-chip-error" aria-label="Source status issue">
      <span class="source-health-dot source-health-dot-pulse source-health-dot-pulse-error" aria-hidden="true"></span>
      <span>${escapeHtml(errSummary)}</span>
    </button>
    <div class="source-health-popover hover-text-panel" role="tooltip">
      <div class="source-health-popover-title hover-text-panel-title">Source details</div>
      <ul class="hover-text-panel-list">${buildSourceLines(health || {})}</ul>
    </div>`;
  syncHeaderOffset();
}

function syncSettingsControls() {
  const countySel = byId("countySelect");
  const svc = window.ProtestSettings;
  if (!svc) return;
  if (countySel) {
    countySel.innerHTML = Object.values(svc.countyRegistry)
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
      .join("");
    countySel.value = appSettings.countyId;
  }
  const countyMeta = svc.countyRegistry[appSettings.countyId] || null;
  const districtLink = byId("lookupDistrictLink");
  if (districtLink) {
    districtLink.href = countyMeta && countyMeta.districtUrl ? countyMeta.districtUrl : "#";
    districtLink.textContent =
      countyMeta && countyMeta.districtLabel ? countyMeta.districtLabel : "Tax Appraisal District";
  }
  applyTheme(currentTheme);
  applyUiPrefs();
  const tagline = byId("siteTagline");
  if (tagline) {
    tagline.textContent = "Bell County, Texas · informal planning tool";
  }
}

function resetWorkspaceForSourceChange() {
  currentParcel = null;
  currentValuation = null;
  currentPacket = null;
  currentNoticeSummary = null;
  setWorkflowUnlocked(false);
  renderKpiStrip();
  renderQualityBadges(null);
  renderPropertyLinks(null);
  renderMarketAnalysisCard(null);
  renderSoldHomes(null, [], 0);
  renderCitySoldHomes(null, [], [], 0);
  byId("valuationResult").textContent = "";
  byId("packetResult").textContent = "";
  setStatus("packetStatus", "");
  setStatus("compSheetStatus", "");
  updateScoreButtonState();
}

function clearWorksheetInputs() {
  const root = byId("dashboardPage");
  if (!root) return;
  root.querySelectorAll("input, textarea").forEach((field) => {
    if (!field || !field.id) return;
    if (field.id === "countySelect") return;
    if (field.type === "checkbox" || field.type === "radio") {
      field.checked = false;
      return;
    }
    if (field.type === "button" || field.type === "submit") return;
    field.value = "";
  });
  worksheetValueOpinionUserSet = false;
  updateProtestFactsCharCount();
}

function resetAppStateFromSettings() {
  writeUiPrefs({ textSize: "md", density: "comfortable", hideHelp: false });
  clearWorksheetInputs();
  resetWorkspaceForSourceChange();
  setActiveDashboardStep("step-market");
  setStatus("packetStatus", "App state reset. Search a Property ID to continue.");
}

function closeKpiLinksMenus() {
  document.querySelectorAll(".kpi-links-menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    const trigger = menu.querySelector(".kpi-links-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

function bindKpiLinksMenuControls() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".kpi-links-trigger");
    if (trigger) {
      const menu = trigger.closest(".kpi-links-menu");
      if (!menu) return;
      const opening = !menu.classList.contains("is-open");
      closeKpiLinksMenus();
      if (opening) {
        menu.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
      return;
    }
    if (!event.target.closest(".kpi-links-menu")) {
      closeKpiLinksMenus();
    } else if (event.target.closest(".kpi-links-item")) {
      closeKpiLinksMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeKpiLinksMenus();
    }
  });
}

function closeCompActionsMenus(exceptMenu = null) {
  document.querySelectorAll(".comp-actions-menu[open]").forEach((menu) => {
    if (exceptMenu && menu === exceptMenu) return;
    menu.removeAttribute("open");
  });
}

function bindCompActionsMenuControls() {
  const updateMenuDirection = (menu) => {
    if (!menu) return;
    if (menu.classList.contains("force-drop-up")) {
      menu.classList.add("is-drop-up");
      return;
    }
    menu.classList.remove("is-drop-up");
    const panel = menu.querySelector(".comp-actions-panel");
    if (!panel) return;
    const panelHeight = Math.ceil(
      Math.max(panel.getBoundingClientRect().height || 0, panel.scrollHeight || 0)
    );
    const summary = menu.querySelector("summary");
    const summaryRect = summary ? summary.getBoundingClientRect() : menu.getBoundingClientRect();
    const scrollFrame = menu.closest(".sold-homes-scroll");
    let spaceBelow = 0;
    let spaceAbove = 0;
    let shouldDropUp = false;
    if (scrollFrame) {
      const frameRect = scrollFrame.getBoundingClientRect();
      spaceBelow = frameRect.bottom - summaryRect.bottom;
      spaceAbove = summaryRect.top - frameRect.top;
      const insufficientBelow = spaceBelow < panelHeight + 12;
      // Prefer opening upward if the scroll frame cannot fit the menu below.
      shouldDropUp =
        insufficientBelow &&
        (spaceAbove >= panelHeight + 8 ||
          spaceAbove > spaceBelow ||
          summaryRect.top > frameRect.top + frameRect.height * 0.55);
    } else {
      const viewportBottom = window.innerHeight || document.documentElement.clientHeight || 0;
      spaceBelow = viewportBottom - summaryRect.bottom;
      spaceAbove = summaryRect.top;
      shouldDropUp = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow;
    }
    if (shouldDropUp) {
      menu.classList.add("is-drop-up");
    }
  };

  document.addEventListener("click", (event) => {
    const summary = event.target.closest(".comp-actions-menu > summary");
    if (!summary) return;
    const menu = summary.parentElement;
    if (!menu || !menu.classList || !menu.classList.contains("comp-actions-menu")) return;
    closeCompActionsMenus(menu);
  });

  document.addEventListener("toggle", (event) => {
    const menu = event.target;
    if (!menu || !menu.matches || !menu.matches(".comp-actions-menu")) return;
    if (menu.hasAttribute("open")) {
      updateMenuDirection(menu);
      closeCompActionsMenus(menu);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".comp-actions-menu")) {
      closeCompActionsMenus();
      return;
    }
    if (event.target.closest(".comp-actions-panel a, .comp-actions-panel button")) {
      closeCompActionsMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCompActionsMenus();
    }
  });

  const closeOnScroll = () => closeCompActionsMenus();
  document.querySelectorAll(".sold-homes-wrap, .sold-homes-scroll").forEach((el) => {
    el.addEventListener("scroll", closeOnScroll, { passive: true });
  });
  window.addEventListener("scroll", closeOnScroll, { passive: true, capture: true });
}

function openSettingsModal() {
  const modal = byId("settingsModal");
  const btn = byId("settingsToggleBtn");
  if (!modal) return;
  modal.hidden = false;
  if (btn) btn.setAttribute("aria-expanded", "true");
}

function closeSettingsModal() {
  const modal = byId("settingsModal");
  const btn = byId("settingsToggleBtn");
  if (!modal) return;
  modal.hidden = true;
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function bindSettingsControls() {
  const countySel = byId("countySelect");
  const themeBtn = byId("themeToggleBtn");
  const lightBtn = byId("sidebarLightBtn");
  const darkBtn = byId("sidebarDarkBtn");
  const settingsToggleBtn = byId("settingsToggleBtn");
  const settingsModal = byId("settingsModal");
  const settingsModalBackdrop = byId("settingsModalBackdrop");
  const closeSettingsModalBtn = byId("closeSettingsModalBtn");
  const uiTextSizeSelect = byId("uiTextSizeSelect");
  const uiDensitySelect = byId("uiDensitySelect");
  const uiHideHelpToggle = byId("uiHideHelpToggle");
  const uiResetStateBtn = byId("uiResetStateBtn");
  const svc = window.ProtestSettings;
  const adapters = window.ProtestCountyAdapters;
  if (!svc || !adapters) return;

  function applyNext(partial) {
    appSettings = svc.writeSettings({ ...appSettings, ...partial });
    activeAdapter = adapters.createAdapter(appSettings.countyId, appSettings.dataSource);
    syncSettingsControls();
    resetWorkspaceForSourceChange();
    setStatus(
      "packetStatus",
      appSettings.dataSource === "geojson"
        ? "Local GeoJSON snapshot (admin preview) — not used in production."
        : "Using live public services for the selected Tax Appraisal District."
    );
    renderSourceHealth();
  }

  if (countySel) {
    countySel.addEventListener("change", () => applyNext({ countyId: countySel.value }));
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", () => applyTheme(currentTheme === "light" ? "dark" : "light"));
  }
  if (lightBtn) {
    lightBtn.addEventListener("click", () => applyTheme("light"));
  }
  if (darkBtn) {
    darkBtn.addEventListener("click", () => applyTheme("dark"));
  }
  if (settingsToggleBtn && settingsModal) {
    settingsToggleBtn.addEventListener("click", openSettingsModal);
  }
  if (settingsModalBackdrop) {
    settingsModalBackdrop.addEventListener("click", closeSettingsModal);
  }
  if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
  }
  if (settingsModal) {
    settingsModal.addEventListener("click", (event) => {
      if (event.target === settingsModal) closeSettingsModal();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettingsModal();
  });
  if (uiResetStateBtn) {
    uiResetStateBtn.addEventListener("click", () => {
      resetAppStateFromSettings();
      closeSettingsModal();
    });
  }
  if (uiTextSizeSelect) {
    uiTextSizeSelect.addEventListener("change", () =>
      writeUiPrefs({ ...uiPrefs, textSize: uiTextSizeSelect.value })
    );
  }
  if (uiDensitySelect) {
    uiDensitySelect.addEventListener("change", () =>
      writeUiPrefs({ ...uiPrefs, density: uiDensitySelect.value })
    );
  }
  if (uiHideHelpToggle) {
    uiHideHelpToggle.addEventListener("change", () =>
      writeUiPrefs({ ...uiPrefs, hideHelp: uiHideHelpToggle.checked })
    );
  }
}

const STEP_SECTION_IDS = [
  "step-market",
  "step-comps",
  "step-notice",
  "step-estimate",
  "step-portal",
  "step-packet",
];

function renderKpiStrip() {
  const el = byId("kpiStrip");
  if (!el) return;
  if (!currentParcel) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const pid = currentParcel.parcelId != null ? String(currentParcel.parcelId) : "—";
  const addrRaw = (currentParcel.situsAddress && String(currentParcel.situsAddress).trim()) || "";
  const parcelMeta = addrRaw ? `ID ${pid} · ${addrRaw}` : `ID ${pid}`;
  const m = currentParcel.marketAnalysis;
  const assessed = num(currentParcel.assessedTotal);
  const medianVal = m ? num(m.medianValue) : 0;
  const marketVal = m ? num(m.marketValue) : 0;
  const valueForDelta = marketVal > 0 ? marketVal : assessed;
  let valueDeltaPct = 0;
  if (medianVal > 0 && valueForDelta > 0) {
    valueDeltaPct = ((valueForDelta - medianVal) / medianVal) * 100;
  }
  const sqftSubj = m ? num(m.squareFoot) : num(currentParcel.sqft);
  const medianSqft = m ? num(m.medianSqFt) : 0;
  let sqftDeltaPct = 0;
  if (medianSqft > 0 && sqftSubj > 0) {
    sqftDeltaPct = ((sqftSubj - medianSqft) / medianSqft) * 100;
  }
  const fmtPct = (n) =>
    Number.isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(1)}%` : "—";
  const valueTone =
    medianVal <= 0 ? "neutral" : valueDeltaPct <= 0 ? "good" : "warn";
  const primaryDisplay = assessed > 0 ? assessed : marketVal;
  const settingsSvc = window.ProtestSettings;
  const countyMeta =
    settingsSvc && settingsSvc.countyRegistry
      ? settingsSvc.countyRegistry[appSettings.countyId] || null
      : null;
  const districtUrl = countyMeta && countyMeta.districtUrl ? countyMeta.districtUrl : "#";
  const districtLabel =
    countyMeta && countyMeta.districtLabel ? countyMeta.districtLabel : "Tax Appraisal District";
  const propertyUrlCurrent = bellcadPropertyViewUrlCurrent(pid);
  const propertyUrlPrior = bellcadPropertyViewUrlPrior(pid);
  const marketMapUrl = bellcadMarketAnalysisMapUrl(pid);
  el.innerHTML = `
    <div class="kpi-parcel-head" role="status" aria-live="polite">
      <span class="kpi-parcel-label">Active parcel</span>
      <span class="kpi-parcel-meta">${escapeHtml(parcelMeta)}</span>
      <div class="kpi-links-menu" aria-label="Property quick links">
        <button class="kpi-links-trigger" type="button" aria-haspopup="true" aria-expanded="false">Links <span aria-hidden="true">▾</span></button>
        <div class="kpi-links-dropdown hover-text-panel" role="menu">
          <a class="kpi-links-item hover-text-panel-item" href="${districtUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(districtLabel)} <span class="kpi-parcel-link-icon" aria-hidden="true">↗</span></a>
          <a class="kpi-links-item hover-text-panel-item" href="${propertyUrlCurrent}" target="_blank" rel="noopener noreferrer">Current <span class="kpi-parcel-link-icon" aria-hidden="true">↗</span></a>
          <a class="kpi-links-item hover-text-panel-item" href="${propertyUrlPrior}" target="_blank" rel="noopener noreferrer">Prior Years <span class="kpi-parcel-link-icon" aria-hidden="true">↗</span></a>
          <a class="kpi-links-item hover-text-panel-item" href="${marketMapUrl}" target="_blank" rel="noopener noreferrer">Market Map <span class="kpi-parcel-link-icon" aria-hidden="true">↗</span></a>
        </div>
      </div>
    </div>
    <div class="kpi-metrics">
      <div class="kpi-item">
        <span class="kpi-label">Assessed / market</span>
        <span class="kpi-value">${primaryDisplay > 0 ? formatCurrency(primaryDisplay) : "—"}</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Median (neighborhood)</span>
        <span class="kpi-value">${medianVal > 0 ? formatCurrency(medianVal) : "—"}</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Value vs median</span>
        <span class="kpi-value kpi-${valueTone}">${medianVal > 0 ? fmtPct(valueDeltaPct) : "—"}</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Sq ft vs median</span>
        <span class="kpi-value kpi-neutral">${medianSqft > 0 ? fmtPct(sqftDeltaPct) : "—"}</span>
      </div>
    </div>
  `;
  el.hidden = false;
}

function initStepRailScrollSpy() {
  const links = [...document.querySelectorAll(".dashboard-view-btn[data-step-target]")];
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!workflowUnlocked && link.getAttribute("data-step-target") !== "step-find") return;
      const targetId = link.getAttribute("data-step-target");
      if (targetId) {
        event.preventDefault();
        setActiveDashboardStep(targetId);
      }
    });
  });
  applyDashboardActiveStep();
}

function updateEstimateReadiness() {
  const el = byId("estimateReadiness");
  if (!el) return;
  const steps = [];

  if (!currentParcel) {
    steps.push("Search your Property ID to unlock dashboard actions.");
  } else {
    const override = num(byId("assessedOverride").value);
    const assessedFromParcel = num(currentParcel.assessedTotal);
    if (assessedFromParcel <= 0 && override <= 0) {
      steps.push("Enter 'Use Notice Assessed Value Instead' because assessed value is missing.");
    }
  }

  if (steps.length === 0) {
    el.className = "readiness-note readiness-ready";
    el.textContent = "Ready to run: click 'Estimate Protest Potential'.";
  } else {
    el.className = "readiness-note readiness-blocked";
    el.textContent = `Not ready yet: ${steps.join(" ")}`;
  }
}

function updateScoreButtonState() {
  const scoreBtn = byId("scoreBtn");
  const hasParcel = !!currentParcel;
  scoreBtn.disabled = !hasParcel;
  if (!hasParcel) {
    scoreBtn.title = "Search Property ID first";
    byId("valuationResult").textContent = "";
  } else {
    scoreBtn.title = "";
  }
  updateEstimateReadiness();
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

/**
 * @param {ParcelBundle|null|undefined} parcel
 */
function renderQualityBadges(parcel) {
  const container = byId("qualityBadges");
  if (!container) return;
  if (!parcel) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  const checks = [
    {
      ok: !!parcel.ownerName,
      label: "Owner name",
      warn: "Owner name missing",
    },
    {
      ok: num(parcel.assessedTotal) > 0,
      label: "Assessed value",
      warn: "Assessed value missing (use override)",
    },
    {
      ok: !!parcel.situsAddress,
      label: "Situs address",
      warn: "Situs address incomplete",
    },
    {
      ok: num(parcel.landValue) > 0 && num(parcel.improvementValue) > 0,
      label: "Land & improvement",
      warn: "Land or improvement value missing",
    },
    {
      ok: !!(parcel.marketAnalysis && parcel.marketAnalysis.neighborhood),
      label: "Market neighborhood",
      warn: "Market analysis neighborhood missing",
    },
  ];

  const chips = checks
    .map(
      (c) => `
    <li class="data-quality-chip ${c.ok ? "is-ok" : "is-warn"}">
      <span class="data-quality-chip-icon" aria-hidden="true">${c.ok ? "✓" : "⚠"}</span>
      <span class="data-quality-chip-label">${escapeHtml(c.ok ? c.label : c.warn)}</span>
    </li>`
    )
    .join("");

  container.innerHTML = `
    <div class="data-quality" role="group" aria-label="District fields loaded for this property">
      <div class="data-quality-head">
        <span class="data-quality-title">Record check</span>
      </div>
      <ul class="data-quality-grid">
        ${chips}
      </ul>
    </div>`;
  container.hidden = false;
}

function renderPropertyLinks(parcelId) {
  const containers = [byId("propertyLinks")].filter(Boolean);
  const historyLink = byId("historyPropertyLink");
  if (!parcelId) {
    containers.forEach((container) => {
      container.innerHTML = "";
    });
    if (historyLink) {
      historyLink.href = bellcadSearchUrlPrior();
    }
    return;
  }

  const propertyUrlCurrent = bellcadPropertyViewUrlCurrent(parcelId);
  const propertyUrlPrior = bellcadPropertyViewUrlPrior(parcelId);
  const marketMapUrl = bellcadMarketAnalysisMapUrl(parcelId);
  if (historyLink) {
    historyLink.href = propertyUrlPrior;
  }
  const link = (href, label) =>
    `<a class="resource-link" href="${href}" target="_blank" rel="noopener noreferrer"><span class="resource-link-text">${label}</span><span class="resource-link-external" aria-hidden="true">↗</span></a>`;
  const linksHtml = [
    link(propertyUrlCurrent, "Open property (current year)"),
    link(propertyUrlPrior, "Prior years & taxes (eSearch)"),
    link(marketMapUrl, "District Market Analysis Map"),
  ].join("");
  containers.forEach((container) => {
    container.innerHTML = linksHtml;
  });
}

function formatCurrency(value) {
  const n = num(value);
  return n > 0 ? `$${n.toLocaleString()}` : "n/a";
}

function formatRange(value) {
  if (!value) return "n/a";
  return String(value).replace(/\d[\d]*/g, (m) => Number(m).toLocaleString());
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function neighborhoodDisplayName(code, map) {
  const c = code != null ? String(code).trim() : "";
  if (!c) return "—";
  if (map && typeof map.get === "function" && map.has(c)) {
    const name = map.get(c);
    if (name) return String(name);
  }
  return c;
}

function formatSqftDeltaLabel(rowSqft, subjectSqft) {
  const r = num(rowSqft);
  const s = num(subjectSqft);
  if (s <= 0 || r <= 0) return "";
  const d = r - s;
  if (d === 0) return "(0)";
  return `(${d > 0 ? "+" : ""}${d})`;
}

function formatSqftVsSubjectCell(rowSqftRaw, subjectSqftRaw) {
  const rowSqft = num(rowSqftRaw);
  const sub = num(subjectSqftRaw);
  const displayNum =
    rowSqft > 0 ? rowSqft.toLocaleString() : String(rowSqftRaw || "n/a");
  if (sub <= 0 || rowSqft <= 0) {
    return `<span class="sqft-cell"><span class="sqft-num">${escapeHtml(displayNum)}</span></span>`;
  }
  const delta = rowSqft - sub;
  let arrow = "—";
  let cls = "sqft-arrow-eq";
  let tip = "Same sq ft as subject";
  if (rowSqft > sub) {
    arrow = "↑";
    cls = "sqft-arrow-up";
    tip = `${delta} sq ft larger than subject`;
  } else if (rowSqft < sub) {
    arrow = "↓";
    cls = "sqft-arrow-down";
    tip = `${Math.abs(delta)} sq ft smaller than subject`;
  }
  const deltaLabel = formatSqftDeltaLabel(rowSqft, sub);
  return `<span class="sqft-cell"><span class="sqft-num">${escapeHtml(displayNum)}</span> <span class="${cls}" title="${escapeHtml(tip)}">${arrow}</span><span class="sqft-delta">${escapeHtml(deltaLabel)}</span></span>`;
}

function normalizeCityText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function pctChange(current, previous) {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

/**
 * @returns {NoticeSummaryUi}
 */
function buildNoticeSummary() {
  const lastYearMarket = num(byId("lastYearMarket").value);
  const proposedMarket = num(byId("proposedMarket").value);
  const lastYearAssessed = num(byId("lastYearAssessed").value);
  const proposedAssessed = num(byId("proposedAssessed").value);
  const marketIncreasePct = pctChange(proposedMarket, lastYearMarket);
  const assessedIncreasePct = pctChange(proposedAssessed, lastYearAssessed);

  return {
    noticeDate: null,
    protestDeadline: null,
    deadlineInDays: null,
    lastYearMarket,
    proposedMarket,
    marketIncreasePct: Number(marketIncreasePct.toFixed(2)),
    lastYearAssessed,
    proposedAssessed,
    assessedIncreasePct: Number(assessedIncreasePct.toFixed(2)),
  };
}

/**
 * @param {NoticeSummaryUi|null|undefined} summary
 */
function renderNoticeSignals(summary) {
  const container = byId("noticeSignals");
  if (!summary) {
    container.innerHTML = "";
    return;
  }
  const chips = [
    {
      label: "Market Change",
      value: `${summary.marketIncreasePct >= 0 ? "+" : ""}${summary.marketIncreasePct.toFixed(1)}%`,
      detail: `${formatCurrency(summary.proposedMarket)} vs ${formatCurrency(summary.lastYearMarket)}`,
      tone: summary.marketIncreasePct < 0 ? "good" : summary.marketIncreasePct > 10 ? "warn" : "neutral",
      tip:
        "Calculated as (Proposed Market Value - Last Year Market Value) / Last Year Market Value.",
    },
    {
      label: "Assessed Change",
      value: `${summary.assessedIncreasePct >= 0 ? "+" : ""}${summary.assessedIncreasePct.toFixed(1)}%`,
      detail: `${formatCurrency(summary.proposedAssessed)} vs ${formatCurrency(summary.lastYearAssessed)}`,
      tone: summary.assessedIncreasePct < 0 ? "good" : summary.assessedIncreasePct > 10 ? "warn" : "neutral",
      tip:
        "Calculated as (Proposed Assessed Value - Last Year Assessed Value) / Last Year Assessed Value.",
    },
  ];
  container.innerHTML = chips
    .map(
      (c) =>
        `<span class="signal-chip signal-${c.tone}" title="${c.tip}"><strong>${c.label}:</strong> ${c.value} <em>(${c.detail})</em></span>`
    )
    .join("");
}

function analyzeNotice() {
  currentNoticeSummary = buildNoticeSummary();
  renderNoticeSignals(currentNoticeSummary);
}

function autofillNoticeFromParcel(parcel) {
  if (!parcel) return;
  const proposedMarketInput = byId("proposedMarket");
  const proposedAssessedInput = byId("proposedAssessed");
  const fromCad = num(parcel.assessedTotal);
  if (fromCad > 0) {
    const rounded = String(Math.round(fromCad));
    proposedMarketInput.value = rounded;
    proposedAssessedInput.value = rounded;
  }
}

function snapshotCompSalePricesFromDom() {
  if (!currentParcel) return;
  currentParcel.compSalePricesNhood = currentParcel.compSalePricesNhood || {};
  currentParcel.compSalePricesCity = currentParcel.compSalePricesCity || {};
  document.querySelectorAll("#soldHomesBody tr[data-nhood-row-key]").forEach((tr) => {
    const key = tr.getAttribute("data-nhood-row-key");
    const inp = tr.querySelector(".sold-price-input");
    if (!key || !inp) return;
    const v = num(inp.value);
    if (v > 0) currentParcel.compSalePricesNhood[key] = v;
    else delete currentParcel.compSalePricesNhood[key];
  });
  document.querySelectorAll("#citySalesBody tr[data-city-row-key]").forEach((tr) => {
    const key = tr.getAttribute("data-city-row-key");
    const inp = tr.querySelector(".sold-price-input");
    if (!key || !inp) return;
    const v = num(inp.value);
    if (v > 0) currentParcel.compSalePricesCity[key] = v;
    else delete currentParcel.compSalePricesCity[key];
  });
}

function initCompSalePriceControls() {
  const root = byId("step-comps");
  if (!root || root.dataset.compPriceBound) return;
  root.dataset.compPriceBound = "1";
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-nhood-comp-select], [data-city-comp-select]")) {
      const tr = t.closest("tr");
      const inp = tr && tr.querySelector(".sold-price-input");
      if (inp) {
        if (t.checked) {
          inp.removeAttribute("hidden");
        } else {
          inp.setAttribute("hidden", "");
          inp.value = "";
        }
      }
      snapshotCompSalePricesFromDom();
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.classList && e.target.classList.contains("sold-price-input")) {
      snapshotCompSalePricesFromDom();
    }
  });
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-comp-attach-btn]");
    const removeBtn = e.target.closest("[data-comp-remove-btn]");
    const viewBtn = e.target.closest("[data-comp-view-btn]");
    const removeOneBtn = e.target.closest("[data-comp-remove-one-btn]");
    if (!btn && !removeBtn && !viewBtn && !removeOneBtn) return;
    e.preventDefault();
    const source = (btn || removeBtn || viewBtn || removeOneBtn).getAttribute("data-comp-photo-source");
    const rowKey = (btn || removeBtn || viewBtn || removeOneBtn).getAttribute("data-comp-row-key");
    if (!source || !rowKey || !currentParcel) return;
    const parcelKey = getParcelAttachmentKey();

    if (viewBtn) {
      openCompPhotosModal(source, rowKey);
      return;
    }

    if (removeOneBtn) {
      const fileId = removeOneBtn.getAttribute("data-comp-photo-id");
      if (!fileId) return;
      removeSingleCompPhotoAndRefresh(source, rowKey, fileId).catch((err) =>
        warnStorageIssue("removing photo", err)
      );
      return;
    }

    if (removeBtn) {
      if (source === "city") {
        currentParcel.compPhotoCountsCity = currentParcel.compPhotoCountsCity || {};
        delete currentParcel.compPhotoCountsCity[rowKey];
        currentParcel.compPhotoNamesCity = currentParcel.compPhotoNamesCity || {};
        delete currentParcel.compPhotoNamesCity[rowKey];
      } else {
        currentParcel.compPhotoCountsNhood = currentParcel.compPhotoCountsNhood || {};
        delete currentParcel.compPhotoCountsNhood[rowKey];
        currentParcel.compPhotoNamesNhood = currentParcel.compPhotoNamesNhood || {};
        delete currentParcel.compPhotoNamesNhood[rowKey];
      }
      saveCompAttachmentCount(parcelKey, source, rowKey, 0).catch((err) =>
        warnStorageIssue("clearing photo count", err)
      );
      removeCompAttachmentFiles(parcelKey, source, rowKey).catch((err) =>
        warnStorageIssue("removing stored photos", err)
      );
      if (activeCompPhotoViewer && activeCompPhotoViewer.source === source && activeCompPhotoViewer.rowKey === rowKey) {
        closeCompPhotosModal();
      }
      renderSoldHomes(
        currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood,
        currentParcel.neighborhoodSales,
        (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
      );
      renderCitySoldHomes(
        currentParcel.city,
        currentParcel.cityNeighborhoodCodes,
        currentParcel.citySales,
        (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
      );
      return;
    }

    pendingCompPhotoTarget = { source, rowKey };
    let picker = byId("compPhotoPicker");
    if (!picker) {
      picker = document.createElement("input");
      picker.type = "file";
      picker.id = "compPhotoPicker";
      picker.accept = "image/*";
      picker.multiple = true;
      picker.hidden = true;
      picker.addEventListener("change", async () => {
        if (!pendingCompPhotoTarget || !currentParcel) return;
        const selectedFiles = picker.files ? Array.from(picker.files) : [];
        const files = selectedFiles.length;
        if (files > 0) {
          if (pendingCompPhotoTarget.source === "city") {
            currentParcel.compPhotoCountsCity = currentParcel.compPhotoCountsCity || {};
            currentParcel.compPhotoCountsCity[pendingCompPhotoTarget.rowKey] = files;
            currentParcel.compPhotoNamesCity = currentParcel.compPhotoNamesCity || {};
            currentParcel.compPhotoNamesCity[pendingCompPhotoTarget.rowKey] = selectedFiles.map(
              (file) => file.name
            );
          } else {
            currentParcel.compPhotoCountsNhood = currentParcel.compPhotoCountsNhood || {};
            currentParcel.compPhotoCountsNhood[pendingCompPhotoTarget.rowKey] = files;
            currentParcel.compPhotoNamesNhood = currentParcel.compPhotoNamesNhood || {};
            currentParcel.compPhotoNamesNhood[pendingCompPhotoTarget.rowKey] = selectedFiles.map(
              (file) => file.name
            );
          }
          try {
            const parcelAttachmentKey = getParcelAttachmentKey();
            await saveCompAttachmentCount(
              parcelAttachmentKey,
              pendingCompPhotoTarget.source,
              pendingCompPhotoTarget.rowKey,
              files
            );
            await saveCompAttachmentFiles(
              parcelAttachmentKey,
              pendingCompPhotoTarget.source,
              pendingCompPhotoTarget.rowKey,
              selectedFiles
            );
          } catch (err) {
            warnStorageIssue("saving selected photos", err);
          }
          renderSoldHomes(
            currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood,
            currentParcel.neighborhoodSales,
            (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
          );
          renderCitySoldHomes(
            currentParcel.city,
            currentParcel.cityNeighborhoodCodes,
            currentParcel.citySales,
            (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
          );
        }
        picker.value = "";
        pendingCompPhotoTarget = null;
      });
      document.body.appendChild(picker);
    }
    picker.click();
  });
}

/**
 * @param {MarketAnalysisSnapshot|null|undefined} market
 */
function renderMarketAnalysisCard(market) {
  const card = byId("marketAnalysisCard");
  const header = byId("marketAnalysisHeader");
  const signals = byId("marketSignals");
  const grid = byId("marketAnalysisGrid");
  if (!market) {
    card.hidden = true;
    header.textContent = "";
    signals.innerHTML = "";
    grid.innerHTML = "";
    return;
  }

  header.textContent = "Compare your property against neighborhood medians.";

  const propertyItems = [
    ["Property ID", market.propId || "n/a"],
    ["Address", market.propertyAddress || "n/a"],
    ["Market Value", formatCurrency(market.marketValue)],
    ["Square Foot", num(market.squareFoot).toLocaleString()],
    ["Legal Description", (currentParcel && currentParcel.legalDescription) || "n/a"],
  ];

  const neighborhoodItems = [
    ["Neighborhood", market.neighborhood || "n/a"],
    ["Market Area", market.neighborhoodMarketArea || "n/a"],
    ["Median Value", formatCurrency(market.medianValue)],
    ["Median Sales Price", formatCurrency(market.medianSalesPrice)],
    ["Median Sq Ft", num(market.medianSqFt).toLocaleString()],
    ["Median Year Built", num(market.medianYearBuilt) || "n/a"],
    ["Median Sq Ft (Sales)", num(market.medianSqFtOfSales).toLocaleString()],
    ["Sq Ft Range", formatRange(market.sqFtRange)],
    ["Sales Sq Ft Range", formatRange(market.salesSqFtRange)],
    ["Sales", num(market.numberOfSales).toLocaleString()],
    ["Houses", num(market.numberOfHouses).toLocaleString()],
    ["New Houses", num(market.newHouses).toLocaleString()],
  ];

  const renderRows = (items) =>
    items
      .map(
        ([label, value]) => `<div class="market-compact-row">
          <span class="market-compact-label">${label}</span>
          <span class="market-compact-value">${value}</span>
        </div>`
      )
      .join("");

  const valueDeltaPct =
    num(market.medianValue) > 0
      ? ((num(market.marketValue) - num(market.medianValue)) / num(market.medianValue)) * 100
      : 0;
  const sqftDeltaPct =
    num(market.medianSqFt) > 0
      ? ((num(market.squareFoot) - num(market.medianSqFt)) / num(market.medianSqFt)) * 100
      : 0;
  const signalData = [
    {
      label: "Value vs Median",
      value: `${valueDeltaPct >= 0 ? "+" : ""}${valueDeltaPct.toFixed(1)}%`,
      detail: `${formatCurrency(market.marketValue)} vs ${formatCurrency(market.medianValue)}`,
      tone: valueDeltaPct <= 0 ? "good" : "warn",
      tip:
        "Calculated as (your market value - neighborhood median value) / neighborhood median value. Positive means your value is above median.",
    },
    {
      label: "Sq Ft vs Median",
      value: `${sqftDeltaPct >= 0 ? "+" : ""}${sqftDeltaPct.toFixed(1)}%`,
      detail: `${num(market.squareFoot).toLocaleString()} vs ${num(market.medianSqFt).toLocaleString()}`,
      tone: "neutral",
      tip:
        "Calculated as (your square footage - neighborhood median square footage) / neighborhood median square footage.",
    },
  ];
  signals.innerHTML = signalData
    .map(
      (s) =>
        `<span class="signal-chip signal-${s.tone}" title="${s.tip}"><strong>${s.label}:</strong> ${s.value} <em>(${s.detail})</em></span>`
    )
    .join("");

  grid.innerHTML = `
    <section class="market-compact-card market-column property-card">
      <h4>Subject Property</h4>
      <div class="market-compact-list">${renderRows(propertyItems)}</div>
    </section>
    <section class="market-compact-card market-column">
      <h4>Market Benchmarks</h4>
      <div class="market-compact-list">${renderRows(neighborhoodItems)}</div>
    </section>
  `;

  card.hidden = false;
}

/**
 * @param {string|number|null|undefined} neighborhood
 * @param {CompSaleRow[]|null|undefined} rows
 * @param {string|number|null|undefined} subjectSqft
 */
function renderSoldHomes(neighborhood, rows, subjectSqft) {
  snapshotCompSalePricesFromDom();
  const card = byId("soldHomesCard");
  const header = byId("soldHomesHeader");
  const tbody = byId("soldHomesBody");
  if (!rows || rows.length === 0) {
    card.hidden = true;
    header.textContent = "";
    tbody.innerHTML = "";
    setStatus("compSheetStatus", "");
    return;
  }

  const priceMap = (currentParcel && currentParcel.compSalePricesNhood) || {};

  const areaMap = currentParcel && currentParcel.neighborhoodMarketAreaByCode;
  const hoodLabel = neighborhoodDisplayName(neighborhood, areaMap);
  header.textContent = `${rows.length} recent sale record(s) in neighborhood: ${hoodLabel}`;
  tbody.innerHTML = rows
    .map((row, idx) => {
      const propId = row.propertyId || "n/a";
      const hoodCode = row.neighborhood || "";
      const neighborhoodLabel = neighborhoodDisplayName(hoodCode, areaMap);
      const titleCode = neighborhoodLabel ? escapeHtml(String(neighborhoodLabel)) : "";
      const address = row.propertyAddress || "Address not available";
      const compKey = `${propId}-${row.saleDate || "na"}-${idx}`;
      const rowChecked = idx < 8;
      const checkedAttr = rowChecked ? "checked" : "";
      const savedPrice = num(priceMap[compKey]);
      const priceVal = savedPrice > 0 ? String(Math.round(savedPrice)) : "";
      const priceHiddenAttr = rowChecked ? "" : " hidden";
      const bellcadUrl = row.propertyId
        ? bellcadPropertyViewUrlCurrent(row.propertyId)
        : bellcadSearchUrlCurrent();
      const realEstateQuery = encodeURIComponent(`"${address}" TX sold home`);
      const googleSearchUrl = `https://www.google.com/search?q=${realEstateQuery}`;
      const forceDropUp = idx >= Math.max(0, rows.length - 4);
      return `<tr data-nhood-row-key="${escapeHtml(compKey)}">
        <td><input type="checkbox" data-nhood-comp-select value="${escapeHtml(compKey)}" ${checkedAttr} /></td>
        <td class="nbhd-market-cell" title="${titleCode}">${escapeHtml(String(neighborhoodLabel))}</td>
        <td class="address-cell" title="${escapeHtml(address)}">${escapeHtml(address)}</td>
        <td>${formatSqftVsSubjectCell(row.squareFoot, subjectSqft)}</td>
        <td>${row.saleDate || "n/a"}</td>
        <td class="sold-price-cell">
          <input type="number" class="sold-price-input" min="0" step="1" placeholder="Price" inputmode="decimal" aria-label="Sale price for property ${escapeHtml(String(propId))}" value="${escapeHtml(priceVal)}"${priceHiddenAttr} />
        </td>
        <td class="comp-actions-cell">${renderCompActionsCell(
          "nhood",
          compKey,
          bellcadUrl,
          googleSearchUrl,
          forceDropUp
        )}</td>
      </tr>`;
    })
    .join("");
  setStatus(
    "compSheetStatus",
    "Select comps and enter sale prices where needed, then print — prices appear on the comp sheet."
  );
  card.hidden = false;
}

/**
 * @param {CompSaleRow[]} rows
 * @param {string|number|null|undefined} subjectSqft
 * @param {number} [limit]
 * @returns {CompSaleRow[]}
 */
function selectClosestSalesBySqft(rows, subjectSqft, limit = 150) {
  const allRows = Array.isArray(rows) ? rows : [];
  const baseSqft = num(subjectSqft);
  if (baseSqft <= 0) {
    return allRows.slice(0, limit);
  }
  const withSqft = [];
  const withoutSqft = [];
  allRows.forEach((row) => {
    const sqft = num(row && row.squareFoot);
    if (sqft > 0) {
      withSqft.push({
        ...row,
        sqftDeltaAbs: Math.abs(sqft - baseSqft),
        sqftDeltaPct: baseSqft > 0 ? (Math.abs(sqft - baseSqft) / baseSqft) * 100 : 0,
      });
    } else {
      withoutSqft.push(row);
    }
  });
  withSqft.sort((a, b) => {
    if (a.sqftDeltaAbs !== b.sqftDeltaAbs) return a.sqftDeltaAbs - b.sqftDeltaAbs;
    return String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
  });
  return [...withSqft, ...withoutSqft].slice(0, limit);
}

function getCitySqftVariancePct() {
  const input = byId("citySqftVariancePct");
  const value = num(input && input.value);
  if (value <= 0) return 15;
  return Math.max(1, Math.min(100, value));
}

function getCitySalesSortMode() {
  const select = byId("citySalesSort");
  return (select && select.value) || "closest_bidirectional";
}

/**
 * @param {CompSaleRow[]} rows
 * @param {string|number|null|undefined} subjectSqft
 * @param {number} variancePct
 * @param {string} sortMode
 * @param {number} [limit]
 * @returns {CompSaleRow[]}
 */
function buildCitySalesRows(rows, subjectSqft, variancePct, sortMode, limit = 150) {
  const allRows = Array.isArray(rows) ? rows : [];
  const baseSqft = num(subjectSqft);
  const prepared = allRows.map((row) => {
    const rowSqft = num(row.squareFoot);
    const sqftDeltaAbs = baseSqft > 0 && rowSqft > 0 ? Math.abs(rowSqft - baseSqft) : Number.POSITIVE_INFINITY;
    const sqftDeltaPct = baseSqft > 0 && rowSqft > 0 ? (sqftDeltaAbs / baseSqft) * 100 : Number.POSITIVE_INFINITY;
    return { ...row, rowSqft, sqftDeltaAbs, sqftDeltaPct };
  });

  const filtered = prepared.filter((row) => {
    if (baseSqft <= 0 || row.rowSqft <= 0) return true;
    return row.sqftDeltaPct <= variancePct;
  });

  filtered.sort((a, b) => {
    if (sortMode === "recent_sale") {
      return String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
    }
    if (sortMode === "largest_sqft") {
      return b.rowSqft - a.rowSqft || String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
    }
    if (sortMode === "smallest_sqft") {
      return a.rowSqft - b.rowSqft || String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
    }
    if (sortMode === "closest_bidirectional") {
      if (a.sqftDeltaAbs !== b.sqftDeltaAbs) return a.sqftDeltaAbs - b.sqftDeltaAbs;
      if (b.rowSqft !== a.rowSqft) return b.rowSqft - a.rowSqft;
      return String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
    }
    if (a.sqftDeltaAbs !== b.sqftDeltaAbs) return a.sqftDeltaAbs - b.sqftDeltaAbs;
    return String(b.saleDate || "").localeCompare(String(a.saleDate || ""));
  });

  return filtered.slice(0, limit);
}

/**
 * @param {string|null|undefined} city
 * @param {string[]|null|undefined} neighborhoodCodes
 * @param {CompSaleRow[]|null|undefined} rows
 * @param {string|number|null|undefined} subjectSqft
 */
function renderCitySoldHomes(city, neighborhoodCodes, rows, subjectSqft) {
  const details = byId("citySalesDetails");
  const header = byId("citySalesHeader");
  const tbody = byId("citySalesBody");
  if (!details || !header || !tbody) return;
  snapshotCompSalePricesFromDom();
  if (currentParcel) {
    currentParcel.citySalesDisplayRows = [];
  }
  const variancePct = getCitySqftVariancePct();
  const sortMode = getCitySalesSortMode();
  let allRows = Array.isArray(rows) ? rows : [];
  let usingNeighborhoodSource = false;
  if ((!allRows || allRows.length === 0) && currentParcel && Array.isArray(currentParcel.neighborhoodSales)) {
    allRows = currentParcel.neighborhoodSales;
    usingNeighborhoodSource = allRows.length > 0;
  }
  const subjectNeighborhoodCode = String(
    (currentParcel && currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood) || ""
  ).trim();
  if (subjectNeighborhoodCode) {
    allRows = allRows.filter((row) => {
      const rowCode = String((row && row.neighborhood) || "").trim();
      return !rowCode || rowCode !== subjectNeighborhoodCode;
    });
  }
  let rankedRows = buildCitySalesRows(allRows, subjectSqft, variancePct, sortMode, 150);
  let usingFallback = false;
  if ((!rankedRows || rankedRows.length === 0) && allRows.length > 0) {
    // If variance filter is too strict, still surface best city comps rather than an empty panel.
    rankedRows = selectClosestSalesBySqft(allRows, subjectSqft, 150);
    usingFallback = rankedRows.length > 0;
  }
  if (!rankedRows || rankedRows.length === 0) {
    details.hidden = false;
    details.open = true;
    header.textContent = city
      ? `No city-wide sold homes found for ${city} within +/- ${variancePct}% square-foot variance.`
      : "No city-wide sold homes found because city was missing on the parcel record.";
    tbody.innerHTML = "";
    return;
  }

  if (currentParcel) {
    currentParcel.citySalesDisplayRows = rankedRows;
  }

  const cityPriceMap = (currentParcel && currentParcel.compSalePricesCity) || {};

  const codeCount = Array.isArray(neighborhoodCodes) ? neighborhoodCodes.length : 0;
  const subjectSqftText = num(subjectSqft) > 0 ? num(subjectSqft).toLocaleString() : "n/a";
  if (usingNeighborhoodSource && usingFallback) {
    header.textContent = `${rankedRows.length} closest shown from neighborhood sales (city feed unavailable) · subject ${subjectSqftText} sq ft`;
  } else if (usingNeighborhoodSource) {
    header.textContent = `${rankedRows.length} shown from neighborhood sales (city feed unavailable) · subject ${subjectSqftText} sq ft · ±${variancePct}%`;
  } else if (usingFallback) {
    header.textContent = `${rankedRows.length} closest shown (outside ±${variancePct}% filter) · ${codeCount} hoods · subject ${subjectSqftText} sq ft`;
  } else {
    header.textContent = `${rankedRows.length} shown (max 150) · ${codeCount} hoods · subject ${subjectSqftText} sq ft · ±${variancePct}%`;
  }
  tbody.innerHTML = rankedRows
    .map((row, idx) => {
      const propId = row.propertyId || "n/a";
      const hoodCode = row.neighborhood || "";
      const areaMap = currentParcel && currentParcel.neighborhoodMarketAreaByCode;
      const neighborhoodLabel = neighborhoodDisplayName(hoodCode, areaMap);
      const address = row.propertyAddress || "Address not available";
      const cityRowKey = `${propId}|${row.saleDate || "na"}|${hoodCode}`;
      const savedPrice = num(cityPriceMap[cityRowKey]);
      const priceVal = savedPrice > 0 ? String(Math.round(savedPrice)) : "";
      const bellcadUrl = row.propertyId
        ? bellcadPropertyViewUrlCurrent(row.propertyId)
        : bellcadSearchUrlCurrent();
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `"${address}" ${city} TX sold home`
      )}`;
      const forceDropUp = idx >= Math.max(0, rankedRows.length - 4);
      const titleCode = neighborhoodLabel ? escapeHtml(String(neighborhoodLabel)) : "";
      return `<tr data-city-row-key="${escapeHtml(cityRowKey)}">
        <td><input type="checkbox" data-city-comp-select data-city-idx="${idx}" /></td>
        <td class="nbhd-market-cell" title="${titleCode}">${escapeHtml(String(neighborhoodLabel))}</td>
        <td class="address-cell" title="${escapeHtml(String(address))}">${escapeHtml(String(address))}</td>
        <td>${formatSqftVsSubjectCell(row.squareFoot, subjectSqft)}</td>
        <td>${escapeHtml(String(row.saleDate || "n/a"))}</td>
        <td class="sold-price-cell">
          <input type="number" class="sold-price-input" min="0" step="1" placeholder="Price" inputmode="decimal" aria-label="Sale price for property ${escapeHtml(String(propId))}" value="${escapeHtml(priceVal)}" hidden />
        </td>
        <td class="comp-actions-cell">${renderCompActionsCell(
          "city",
          cityRowKey,
          bellcadUrl,
          googleSearchUrl,
          forceDropUp
        )}</td>
      </tr>`;
    })
    .join("");
  details.hidden = false;
  details.open = true;
}

function sqftIndicatorPlain(rowSqftRaw, subjectSqftRaw) {
  const rowSqft = num(rowSqftRaw);
  const sub = num(subjectSqftRaw);
  if (sub <= 0 || rowSqft <= 0) return "";
  const d = rowSqft - sub;
  let arrow = " —";
  if (d > 0) arrow = " ↑";
  else if (d < 0) arrow = " ↓";
  const delta = formatSqftDeltaLabel(rowSqft, sub);
  return delta ? `${arrow} ${delta}` : arrow;
}

function printCompSheet() {
  if (!currentParcel) {
    throw new Error("Search for a property first.");
  }
  snapshotCompSalePricesFromDom();
  const subjectSqft =
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft;

  const nhoodKeys = new Set(
    Array.from(document.querySelectorAll("#soldHomesBody [data-nhood-comp-select]:checked")).map((el) => el.value)
  );
  const cityIdxSet = new Set(
    Array.from(document.querySelectorAll("#citySalesBody [data-city-comp-select]:checked")).map((el) =>
      num(el.dataset.cityIdx)
    )
  );

  const nhoodRows = [];
  if (Array.isArray(currentParcel.neighborhoodSales)) {
    currentParcel.neighborhoodSales.forEach((row, idx) => {
      const key = `${row.propertyId || "n/a"}-${row.saleDate || "na"}-${idx}`;
      if (nhoodKeys.has(key)) {
        const salePrice = num(
          (currentParcel.compSalePricesNhood && currentParcel.compSalePricesNhood[key]) || 0
        );
        nhoodRows.push({
          ...row,
          compSource: "Neighborhood",
          compKey: key,
          compPhotoSource: "nhood",
          compPhotoRowKey: key,
          salePrice,
        });
      }
    });
  }

  const cityRows = [];
  if (Array.isArray(currentParcel.citySalesDisplayRows) && cityIdxSet.size) {
    currentParcel.citySalesDisplayRows.forEach((row, idx) => {
      if (cityIdxSet.has(idx)) {
        const cityRowKey = `${row.propertyId || "n/a"}|${row.saleDate || "na"}|${row.neighborhood || ""}`;
        const salePrice = num(
          (currentParcel.compSalePricesCity && currentParcel.compSalePricesCity[cityRowKey]) || 0
        );
        cityRows.push({
          ...row,
          compSource: "Same city",
          cityRowKey,
          compPhotoSource: "city",
          compPhotoRowKey: cityRowKey,
          salePrice,
        });
      }
    });
  }

  if (!nhoodRows.length && !cityRows.length) {
    throw new Error("Select at least one comp in the neighborhood table and/or the city table.");
  }

  const createdAt = new Date().toLocaleString();
  const subjectAddress =
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.propertyAddress) ||
    currentParcel.situsAddress ||
    "n/a";
  const subjectParcelId =
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.propId) || currentParcel.parcelId || "n/a";
  const neighborhood =
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood) || "n/a";
  const nbhdMarketArea =
    (currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhoodMarketArea) || "";
  const cityLabel = currentParcel.city || "n/a";

  const buildRowHtml = (row) => {
    const propId = row.propertyId || "n/a";
    const address = row.propertyAddress || "Address not available";
    const sqftNum = num(row.squareFoot);
    const sqftDisplay =
      sqftNum > 0
        ? `${sqftNum.toLocaleString()}${sqftIndicatorPlain(row.squareFoot, subjectSqft)}`
        : String(row.squareFoot || "n/a");
    const saleDate = row.saleDate || "n/a";
    const hood = row.neighborhood || "—";
    const areaLabel = neighborhoodDisplayName(
      row.neighborhood,
      currentParcel.neighborhoodMarketAreaByCode
    );
    const bellcadUrl = row.propertyId
      ? bellcadPropertyViewUrlCurrent(row.propertyId)
      : bellcadSearchUrlCurrent();
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `"${address}" TX sold home`
    )}`;
    const salePriceDisp = num(row.salePrice) > 0 ? formatCurrency(row.salePrice) : "—";
    const photoCount = getCompPhotoCount(row.compPhotoSource, row.compPhotoRowKey);
    const photoNames = getCompAttachmentNames(row.compPhotoSource, row.compPhotoRowKey);
    const photoSummary =
      photoCount > 0
        ? `${photoCount} file(s)${photoNames.length ? `: ${photoNames.join(", ")}` : ""}`
        : "—";
    return `<tr>
        <td>${escapeHtml(String(propId))}</td>
        <td>${escapeHtml(String(areaLabel))}</td>
        <td>${escapeHtml(String(hood))}</td>
        <td>${escapeHtml(String(address))}</td>
        <td>${escapeHtml(sqftDisplay)}</td>
        <td>${escapeHtml(String(saleDate))}</td>
        <td>${escapeHtml(salePriceDisp)}</td>
        <td>${escapeHtml(photoSummary)}</td>
        <td><a href="${bellcadUrl}" target="_blank" rel="noopener noreferrer">District</a></td>
        <td><a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer">Google</a></td>
      </tr>`;
  };

  const allPrintRows = [...nhoodRows, ...cityRows].map(buildRowHtml).join("");
  const total = nhoodRows.length + cityRows.length;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tax Appraisal District Comp Sheet</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 18px; color: #111827; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      h2 { margin: 14px 0 8px 0; font-size: 15px; }
      .meta { margin: 0 0 6px 0; font-size: 12px; color: #334155; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
      a { color: #0f766e; text-decoration: none; }
      .small { font-size: 11px; color: #475569; margin-top: 8px; }
      @media print { body { margin: 10mm; } a { color: #111827; } }
    </style>
  </head>
  <body>
    <h1>Tax Appraisal District Comparable Sales Sheet</h1>
    <p class="meta">Generated: ${escapeHtml(createdAt)}</p>
    <h2>Subject Property</h2>
    <p class="meta">Parcel ID: ${escapeHtml(String(subjectParcelId))}</p>
    <p class="meta">Address: ${escapeHtml(String(subjectAddress))}</p>
    <p class="meta">Neighborhood (code): ${escapeHtml(String(neighborhood))}</p>
    <p class="meta">NBHD Market Area: ${escapeHtml(nbhdMarketArea || "n/a")}</p>
    <p class="meta">City (situs): ${escapeHtml(String(cityLabel))}</p>
    <p class="meta">Subject sq ft: ${escapeHtml(num(subjectSqft) > 0 ? num(subjectSqft).toLocaleString() : "n/a")}</p>
    <p class="meta">Current Market/Assessed Value: ${escapeHtml(formatCurrency(currentParcel.assessedTotal))}</p>
    <h2>Selected comps (${total}) — neighborhood: ${nhoodRows.length}, same city: ${cityRows.length}</h2>
    <table>
      <thead>
        <tr>
          <th>Property ID</th>
          <th>NBHD Market Area</th>
          <th>Neighborhood (code)</th>
          <th>Address</th>
          <th>Sq Ft vs subject</th>
          <th>Sale Date</th>
          <th>Sale price (your entry)</th>
          <th>Photos</th>
          <th>District</th>
          <th>Search</th>
        </tr>
      </thead>
      <tbody>${allPrintRows}</tbody>
    </table>
    <p class="small"><strong>Ctrl+P</strong> (or File → Print) to print or <strong>Save as PDF</strong>. Sq ft column: (↑) above subject, (↓) below; numbers in parentheses are sq ft difference.</p>
  </body>
</html>`;

  // Do not pass noopener in the 3rd arg — many browsers return null for the Window handle
  // even when a tab opened, which caused a false "popup blocked" error.
  let printWindow = window.open("", "_blank");
  if (!printWindow) {
    printWindow = window.open("", "TaxDistrictCompPrint");
  }
  if (!printWindow) {
    throw new Error("Could not open print window. Allow popups for this site and try again.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setStatus(
    "compSheetStatus",
    `Opened print view: ${nhoodRows.length} neighborhood + ${cityRows.length} city comp(s).`
  );
}

async function searchParcelByApn() {
  const landingInput = byId("apnInputLanding");
  const sectionInput = byId("apnInput");
  const rawApn =
    (landingInput && landingInput.value && landingInput.value.trim()) ||
    (sectionInput && sectionInput.value && sectionInput.value.trim()) ||
    "";
  const apn = rawApn.trim();
  if (!apn) return;
  if (landingInput) landingInput.value = apn;
  if (sectionInput) sectionInput.value = apn;
  if (!activeAdapter) {
    initAppSettingsAndAdapter();
  }
  if (!activeAdapter) {
    throw new Error("No county adapter is available.");
  }

  setApnSearchLoading(true);
  try {
    currentParcel = await activeAdapter.searchParcelBundleByApn(apn);
    currentParcel.compSalePricesNhood = {};
    currentParcel.compSalePricesCity = {};
    const savedPhotoState = await loadCompAttachmentState(currentParcel.parcelId || apn).catch((err) => {
      warnStorageIssue("loading saved photos", err);
      return {
        nhoodCounts: {},
        cityCounts: {},
        nhoodNames: {},
        cityNames: {},
      };
    });
    currentParcel.compPhotoCountsNhood = savedPhotoState.nhoodCounts || {};
    currentParcel.compPhotoCountsCity = savedPhotoState.cityCounts || {};
    currentParcel.compPhotoNamesNhood = savedPhotoState.nhoodNames || {};
    currentParcel.compPhotoNamesCity = savedPhotoState.cityNames || {};
    currentValuation = null;
    currentPacket = null;
    resetWorksheetState();
    autofillNoticeFromParcel(currentParcel);
    renderPropertyLinks(currentParcel.parcelId || apn);
    renderMarketAnalysisCard(currentParcel.marketAnalysis);
    const subjectSqftForComps =
      (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft;
    renderSoldHomes(
      currentParcel.marketAnalysis && currentParcel.marketAnalysis.neighborhood,
      currentParcel.neighborhoodSales,
      subjectSqftForComps
    );
    renderCitySoldHomes(
      currentParcel.city,
      currentParcel.cityNeighborhoodCodes,
      currentParcel.citySales,
      subjectSqftForComps
    );
    renderQualityBadges(currentParcel);
    renderKpiStrip();
    updateScoreButtonState();
    setWorkflowUnlocked(true, true);
  } finally {
    setApnSearchLoading(false);
  }
}

/**
 * @returns {TrendHistoryRow[]|null}
 */
function readTrendHistory() {
  const yearInputs = Array.from(document.querySelectorAll("[data-trend-year]"));
  const valueInputs = Array.from(document.querySelectorAll("[data-trend-value]"));
  const rows = yearInputs
    .map((yearInput, idx) => [num(yearInput.value), num(valueInputs[idx] && valueInputs[idx].value)])
    .filter(([year, value]) => year > 0 && value > 0)
    .map(([year, value]) => ({ year: Number(year), assessedValue: Number(value) }))
    .sort((a, b) => b.year - a.year);

  if (rows.length < 2) return null;
  return rows;
}

function parseTrendHistoryFromText(rawText) {
  const rows = [];
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const yearMatch = line.match(/\b(20\d{2})\b/);
    if (!yearMatch) continue;
    const year = Number(yearMatch[1]);

    const moneyMatches = line.match(/\$?\d[\d,]*/g) || [];
    const monetary = moneyMatches
      .map((s) => Number(String(s).replace(/[$,]/g, "")))
      .filter((n) => Number.isFinite(n) && n >= 1000);

    let value = monetary.length > 0 ? monetary[monetary.length - 1] : 0;
    if (!value) {
      const trailing = line.match(/(\d[\d,]{3,})\s*$/);
      if (trailing) value = Number(trailing[1].replace(/,/g, ""));
    }

    if (year > 2000 && value > 0) {
      rows.push({ year, assessedValue: value });
    }
  }

  const deduped = [];
  const seenYears = new Set();
  for (const row of rows.sort((a, b) => b.year - a.year)) {
    if (!seenYears.has(row.year)) {
      deduped.push(row);
      seenYears.add(row.year);
    }
  }
  return deduped;
}

function createTrendRow(year = "", assessedValue = "") {
  const row = document.createElement("div");
  row.className = "trend-row";
  row.innerHTML = `
    <input data-trend-year type="number" placeholder="Year (e.g. 2025)" value="${year || ""}" />
    <input data-trend-value type="number" placeholder="Assessed value" value="${assessedValue || ""}" />
    <button class="trend-remove" type="button" title="Remove this history row" aria-label="Remove history row">×</button>
  `;
  const removeBtn = row.querySelector(".trend-remove");
  removeBtn.addEventListener("click", () => {
    const container = byId("trendRows");
    row.remove();
    if (!container.children.length) {
      container.appendChild(createTrendRow());
    }
  });
  return row;
}

/**
 * @param {TrendHistoryRow[]|null|undefined} rows
 */
function renderTrendRows(rows) {
  const container = byId("trendRows");
  container.innerHTML = "";
  if (!rows || rows.length === 0) {
    for (let i = 0; i < 3; i += 1) {
      container.appendChild(createTrendRow());
    }
    return;
  }
  rows.forEach((r) => container.appendChild(createTrendRow(r.year, r.assessedValue)));
}

function addTrendRow() {
  byId("trendRows").appendChild(createTrendRow());
}

function parseTrendPaste() {
  const text = byId("trendPasteInput").value;
  const rows = parseTrendHistoryFromText(text);
  if (rows.length === 0) {
    throw new Error("Could not parse trend values. Paste lines that include year and assessed value.");
  }
  renderTrendRows(rows);
  setStatus("packetStatus", `Parsed ${rows.length} trend row(s) into inputs.`);
}

function getWorksheetReasonLabels() {
  const incorrect = byId("reasonIncorrectMarket");
  const unequal = byId("reasonUnequal");
  const out = [];
  if (incorrect && incorrect.checked) {
    out.push("incorrect appraised (market) value");
  }
  if (unequal && unequal.checked) {
    out.push("unequal appraisal compared with other properties");
  }
  return out;
}

function buildDefaultProtestFacts() {
  if (!currentValuation) return "";
  const reasonPhrase = getWorksheetReasonLabels();
  const lines = [];
  if (reasonPhrase.length) {
    lines.push(`This protest is based on: ${reasonPhrase.join("; ")}.`);
    lines.push("");
  }
  lines.push("Summary of basis (edit to match your situation):");
  currentValuation.reasoning.forEach((r) => {
    lines.push(`• ${r}`);
  });
  lines.push("");
  lines.push(
    "(The informal protest-strength label in this tool is for your planning only; it is not evidence by itself.)"
  );
  return lines.join("\n");
}

function updateProtestFactsCharCount() {
  const ta = byId("protestFactsInput");
  const el = byId("protestFactsCharCount");
  if (!ta || !el) return;
  const n = ta.value.length;
  el.textContent = `${n} / ${MAX_PROTEST_FACTS_CHARS}`;
  el.className = `char-count muted${n > 3800 ? " char-count-warn" : ""}`;
}

function resetWorksheetState() {
  worksheetValueOpinionUserSet = false;
  const vo = byId("valueOpinionInput");
  if (vo) vo.value = "";
  const facts = byId("protestFactsInput");
  if (facts) facts.value = "";
  updateProtestFactsCharCount();
}

function syncWorksheetAfterScore() {
  const vo = byId("valueOpinionInput");
  if (vo && !worksheetValueOpinionUserSet && currentValuation) {
    vo.value = String(Math.round(currentValuation.suggestedValue));
  }
  const factsEl = byId("protestFactsInput");
  if (factsEl && !factsEl.value.trim() && currentValuation) {
    factsEl.value = buildDefaultProtestFacts().slice(0, MAX_PROTEST_FACTS_CHARS);
  }
  updateProtestFactsCharCount();
}

function getWorksheetRequestedValue() {
  if (!currentValuation) return 0;
  const w = num(byId("valueOpinionInput").value);
  return w > 0 ? w : Math.round(currentValuation.suggestedValue);
}

function syncValueOpinionFromEstimate() {
  if (!currentValuation) {
    throw new Error("Run Estimate Protest Potential first.");
  }
  worksheetValueOpinionUserSet = false;
  byId("valueOpinionInput").value = String(Math.round(currentValuation.suggestedValue));
}

function fillFactsFromEstimate() {
  if (!currentValuation) {
    throw new Error("Run Estimate Protest Potential first.");
  }
  byId("protestFactsInput").value = buildDefaultProtestFacts().slice(0, MAX_PROTEST_FACTS_CHARS);
  updateProtestFactsCharCount();
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const temp = document.createElement("textarea");
  temp.value = text;
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}

async function copyProtestFacts() {
  const text = byId("protestFactsInput").value.trim();
  if (!text) {
    throw new Error("Facts box is empty.");
  }
  await copyTextToClipboard(text);
  setStatus("packetStatus", "Facts copied to clipboard.");
}

/**
 * @param {TrendHistoryRow[]|null|undefined} history
 * @returns {TrendSummary|null}
 */
function analyzeTrend(history) {
  if (!history || history.length < 2) return null;
  const newest = history[0];
  const oldest = history[history.length - 1];
  const change = newest.assessedValue - oldest.assessedValue;
  const changePct = oldest.assessedValue > 0 ? (change / oldest.assessedValue) * 100 : 0;
  const annualized = (history.length - 1) > 0 ? changePct / (history.length - 1) : changePct;
  return {
    entries: history,
    startYear: oldest.year,
    endYear: newest.year,
    totalChange: Math.round(change),
    totalChangePct: Number(changePct.toFixed(2)),
    annualizedChangePct: Number(annualized.toFixed(2)),
  };
}

function median(values) {
  const nums = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/**
 * @param {string|number|null|undefined} subjectSqft
 * @returns {SelectedCompPriceRow[]}
 */
function getSelectedCompPriceRows(subjectSqft) {
  if (!currentParcel) return [];
  const subject = num(subjectSqft);
  const selected = [];

  const nhoodKeys = new Set(
    Array.from(document.querySelectorAll("#soldHomesBody [data-nhood-comp-select]:checked")).map((el) => el.value)
  );
  if (Array.isArray(currentParcel.neighborhoodSales) && nhoodKeys.size) {
    currentParcel.neighborhoodSales.forEach((row, idx) => {
      const key = `${row.propertyId || "n/a"}-${row.saleDate || "na"}-${idx}`;
      if (!nhoodKeys.has(key)) return;
      const entered = num((currentParcel.compSalePricesNhood && currentParcel.compSalePricesNhood[key]) || 0);
      if (entered <= 0) return;
      const rowSqft = num(row.squareFoot);
      const sqftAdjFactor = subject > 0 && rowSqft > 0 ? subject / rowSqft : 1;
      selected.push({
        source: "Neighborhood",
        propertyId: row.propertyId || "n/a",
        salePrice: entered,
        rowSqft,
        adjustedToSubject: entered * sqftAdjFactor,
      });
    });
  }

  const cityIdxSet = new Set(
    Array.from(document.querySelectorAll("#citySalesBody [data-city-comp-select]:checked")).map((el) =>
      num(el.dataset.cityIdx)
    )
  );
  if (Array.isArray(currentParcel.citySalesDisplayRows) && cityIdxSet.size) {
    currentParcel.citySalesDisplayRows.forEach((row, idx) => {
      if (!cityIdxSet.has(idx)) return;
      const cityRowKey = `${row.propertyId || "n/a"}|${row.saleDate || "na"}|${row.neighborhood || ""}`;
      const entered = num((currentParcel.compSalePricesCity && currentParcel.compSalePricesCity[cityRowKey]) || 0);
      if (entered <= 0) return;
      const rowSqft = num(row.squareFoot);
      const sqftAdjFactor = subject > 0 && rowSqft > 0 ? subject / rowSqft : 1;
      selected.push({
        source: "Same city",
        propertyId: row.propertyId || "n/a",
        salePrice: entered,
        rowSqft,
        adjustedToSubject: entered * sqftAdjFactor,
      });
    });
  }

  return selected;
}

/**
 * @param {string|number|null|undefined} subjectSqft
 * @returns {CompsSummary|null}
 */
function summarizeSelectedCompSales(subjectSqft) {
  const selectedRows = getSelectedCompPriceRows(subjectSqft);
  if (!selectedRows.length) return null;
  const rawPrices = selectedRows.map((r) => r.salePrice);
  const adjustedPrices = selectedRows.map((r) => r.adjustedToSubject);
  return {
    selectedRows,
    count: selectedRows.length,
    medianRawSalePrice: median(rawPrices),
    medianSqftAdjustedSalePrice: median(adjustedPrices),
    neighborhoodCount: selectedRows.filter((r) => r.source === "Neighborhood").length,
    cityCount: selectedRows.filter((r) => r.source !== "Neighborhood").length,
  };
}

function buildCompAttachmentSummary() {
  if (!currentParcel) return [];
  const rows = [];
  const nhoodCounts = currentParcel.compPhotoCountsNhood || {};
  const cityCounts = currentParcel.compPhotoCountsCity || {};
  const nhoodNames = currentParcel.compPhotoNamesNhood || {};
  const cityNames = currentParcel.compPhotoNamesCity || {};

  if (Array.isArray(currentParcel.neighborhoodSales)) {
    currentParcel.neighborhoodSales.forEach((row, idx) => {
      const rowKey = `${row.propertyId || "n/a"}-${row.saleDate || "na"}-${idx}`;
      const count = Number(nhoodCounts[rowKey] || 0);
      if (!Number.isFinite(count) || count <= 0) return;
      rows.push({
        source: "Neighborhood",
        propertyId: row.propertyId || "n/a",
        address: row.propertyAddress || "Address not available",
        count,
        files: Array.isArray(nhoodNames[rowKey]) ? nhoodNames[rowKey] : [],
      });
    });
  }

  if (Array.isArray(currentParcel.citySalesDisplayRows)) {
    currentParcel.citySalesDisplayRows.forEach((row) => {
      const rowKey = `${row.propertyId || "n/a"}|${row.saleDate || "na"}|${row.neighborhood || ""}`;
      const count = Number(cityCounts[rowKey] || 0);
      if (!Number.isFinite(count) || count <= 0) return;
      rows.push({
        source: "Same city",
        propertyId: row.propertyId || "n/a",
        address: row.propertyAddress || "Address not available",
        count,
        files: Array.isArray(cityNames[rowKey]) ? cityNames[rowKey] : [],
      });
    });
  }
  return rows;
}

/**
 * @param {ValuationResult} data
 */
function renderValuationResult(data) {
  const lines = [
    `Protest Potential: ${data.protestStrengthBand.toUpperCase()} (${data.protestStrengthScore}/100)`,
    "",
    `Current Assessed Value: ${formatCurrency(data.assessedTotal)}`,
    `Estimated Supportable Value: ${formatCurrency(data.suggestedValue)}`,
    `Potential Reduction: ${formatCurrency(data.reductionAmount)} (${data.reductionPct.toFixed(2)}%)`,
    "",
    "How this was estimated:",
    ...data.reasoning.map((line) => `- ${line}`),
  ];
  byId("valuationResult").textContent = lines.join("\n");
}

/**
 * @param {PacketResult} data
 */
function renderPacketResult(data) {
  const packet = data.packet || {};
  const parcelSummary = packet.parcelSummary || {};
  const valuationSummary = packet.valuationSummary || {};
  const worksheet = packet.bellCadWorksheet || {};
  const compAttachments = packet.compAttachments || [];
  const checklist = data.checklist || [];
  const lines = [
    "Protest Packet Ready",
    "",
    `Owner: ${packet.ownerName || "n/a"}`,
    `Parcel ID: ${parcelSummary.parcelId || "n/a"}`,
    `Address: ${parcelSummary.situsAddress || "n/a"}`,
    "",
    "Value Summary",
    `- Current Assessed: ${formatCurrency(parcelSummary.assessedTotal)}`,
    `- Your value opinion (for filing): ${formatCurrency(valuationSummary.requestedValue)}`,
    `- Requested Reduction (vs assessed): ${formatCurrency(valuationSummary.reductionAmount)}`,
    ...(num(valuationSummary.modelSuggestedValue) > 0 &&
    num(valuationSummary.modelSuggestedValue) !== num(valuationSummary.requestedValue)
      ? [`- Model estimate: ${formatCurrency(valuationSummary.modelSuggestedValue)}`]
      : []),
    `- Protest Strength (planning only): ${(valuationSummary.band || "n/a").toUpperCase()} (${num(
      valuationSummary.score
    )}/100)`,
    "",
    "Tax Appraisal District online form (draft)",
    `- Reasons: ${(worksheet.portalReasons && worksheet.portalReasons.join("; ")) || "n/a"}`,
    `- Facts length: ${num(worksheet.factsCharCount)} / ${MAX_PROTEST_FACTS_CHARS} characters`,
    "",
    "Comp photo evidence",
    ...(compAttachments.length
      ? compAttachments.map(
          (row) =>
            `- ${row.source} · ${row.propertyId} · ${row.count} photo(s)${
              row.files && row.files.length ? ` · ${row.files.join(", ")}` : ""
            }`
        )
      : ["- No comp photos attached."]),
    "",
    "Checklist",
    ...checklist.map((item) => `- [ ] ${item}`),
    "",
    "Letter Draft Preview",
    "--------------------",
    packet.letter || "No letter generated.",
  ];
  byId("packetResult").textContent = lines.join("\n");
}

async function scoreParcel() {
  if (!currentParcel) throw new Error("Search for a parcel first");
  snapshotCompSalePricesFromDom();
  if (!currentNoticeSummary) {
    currentNoticeSummary = buildNoticeSummary();
    renderNoticeSignals(currentNoticeSummary);
  }
  const conditionPenaltyPct = Number(byId("conditionPenalty").value || 0);
  const assessedOverride = Number(byId("assessedOverride").value || 0);
  const parcelForScoring = { ...currentParcel };
  if (assessedOverride > 0) {
    parcelForScoring.assessedTotal = assessedOverride;
  }
  const assessedTotal = Number(parcelForScoring.assessedTotal || 0);
  const landValue = Number(parcelForScoring.landValue || 0);
  const improvementValue = Number(parcelForScoring.improvementValue || 0);
  const boundedPenalty = Math.max(0, Math.min(40, conditionPenaltyPct));
  const trendHistory = readTrendHistory();
  const trendSummary = analyzeTrend(trendHistory);
  const conditionPenaltyFactor = 1 - boundedPenalty / 100;
  const adjustedImprovement = improvementValue * conditionPenaltyFactor;
  const subjectSqft =
    (parcelForScoring.marketAnalysis && parcelForScoring.marketAnalysis.squareFoot) || parcelForScoring.sqft;
  const compsSummary = summarizeSelectedCompSales(subjectSqft);
  const baseModelSuggestedValue = Math.round(landValue + adjustedImprovement);
  let suggestedValue = baseModelSuggestedValue;
  if (compsSummary && compsSummary.medianSqftAdjustedSalePrice > 0) {
    // Comps should drive the model when user provides price evidence.
    const compWeight = compsSummary.count >= 3 ? 0.7 : 0.55;
    suggestedValue = Math.round(
      baseModelSuggestedValue * (1 - compWeight) + compsSummary.medianSqftAdjustedSalePrice * compWeight
    );
  }
  const reductionAmount = Math.max(0, assessedTotal - suggestedValue);
  const reductionPct = assessedTotal > 0 ? (reductionAmount / assessedTotal) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(reductionPct * 2)));
  const band = score >= 70 ? "strong" : score >= 40 ? "moderate" : "weak";

  const data = {
    county: "Tax Appraisal District",
    assessedTotal,
    suggestedValue,
    reductionAmount,
    reductionPct: Number(reductionPct.toFixed(2)),
    protestStrengthScore: score,
    protestStrengthBand: band,
    baseModelSuggestedValue,
    compsSummary,
    reasoning: [
      `Assessment starts at $${assessedTotal.toLocaleString()}.`,
      `Applied ${boundedPenalty}% condition adjustment to improvements.`,
      `Estimated supportable value: $${suggestedValue.toLocaleString()}.`,
      `Potential reduction: $${reductionAmount.toLocaleString()} (${reductionPct.toFixed(2)}%).`,
    ],
    confidence: {
      assessedTotal: assessedTotal > 0 ? "high" : "low",
      landValue: landValue > 0 ? "high" : "medium",
      improvementValue: improvementValue > 0 ? "high" : "medium",
      userAdjustments: boundedPenalty > 0 ? "user_supplied" : "none",
    },
    trendSummary,
    noticeSummary: currentNoticeSummary,
  };

  if (trendSummary) {
    data.reasoning.push(
      `Assessed value trend ${trendSummary.startYear}-${trendSummary.endYear}: ${trendSummary.totalChangePct}% total (${trendSummary.annualizedChangePct}% annualized).`
    );
  }
  if (currentNoticeSummary && currentNoticeSummary.proposedMarket > 0) {
    data.reasoning.push(
      `Notice proposed market change: ${currentNoticeSummary.marketIncreasePct}% from last year.`
    );
  }
  if (compsSummary) {
    data.reasoning.push(
      `Used ${compsSummary.count} selected comp sale price(s) (${compsSummary.neighborhoodCount} neighborhood, ${compsSummary.cityCount} city).`
    );
    data.reasoning.push(
      `Comp median (raw): ${formatCurrency(compsSummary.medianRawSalePrice)}; sq ft-adjusted to subject: ${formatCurrency(
        compsSummary.medianSqftAdjustedSalePrice
      )}.`
    );
    data.reasoning.push(
      `Blended comp-driven estimate with model base ${formatCurrency(baseModelSuggestedValue)} to reduce outlier risk.`
    );
  } else {
    data.reasoning.push(
      "No selected comps with entered sale prices found; estimate used land + improvement model only."
    );
  }

  currentParcel = parcelForScoring;
  currentValuation = data;
  renderValuationResult(data);
  syncWorksheetAfterScore();
}

async function generatePacket() {
  if (!currentParcel) {
    throw new Error("Search for a parcel first");
  }
  if (!currentValuation) {
    await scoreParcel();
  }
  if (!currentValuation) {
    throw new Error("Could not compute an estimate for the packet. Check condition and value fields, then try again.");
  }
  const ownerName = byId("ownerName").value.trim() || currentParcel.ownerName || "Property Owner";
  const date = new Date().toISOString().slice(0, 10);
  const parcelId = currentParcel.parcelId || "Unknown Parcel";
  const modelSuggested = Math.round(currentValuation.suggestedValue);
  const worksheetRequested = getWorksheetRequestedValue();
  const assessedForPacket = num(currentValuation.assessedTotal);
  const worksheetReduction = Math.max(0, assessedForPacket - worksheetRequested);

  const portalReasons = [];
  if (byId("reasonIncorrectMarket").checked) {
    portalReasons.push("Incorrect appraised (market) value");
  }
  if (byId("reasonUnequal").checked) {
    portalReasons.push("Value is unequal compared with other properties");
  }
  const factsText = byId("protestFactsInput").value.trim();
  const compAttachments = buildCompAttachmentSummary();
  const modelNote =
    modelSuggested !== Math.round(worksheetRequested)
      ? `\n(Model supportable value from Estimate Protest Potential: $${modelSuggested.toLocaleString()}.)`
      : "";

  const data = {
    county: "Tax Appraisal District",
    generatedAt: new Date().toISOString(),
    checklist: [
      "Complete Tax Appraisal District online protest (or mail a paper form)",
      "Signed protest form",
      "Notice of Appraised Value",
      "Comparable sales sheet",
      "Condition photos",
      "Contractor repair estimates",
      "Generated protest letter / packet",
    ],
    packet: {
      ownerName,
      parcelSummary: {
        parcelId,
        situsAddress: currentParcel.situsAddress,
        assessedTotal: currentParcel.assessedTotal,
        ownerTaxYear: currentParcel.ownerTaxYear,
        legalDescription: currentParcel.legalDescription,
        mapId: currentParcel.mapId,
        geoId: currentParcel.geoId,
        deed: currentParcel.deed,
      },
      valuationSummary: {
        score: currentValuation.protestStrengthScore,
        band: currentValuation.protestStrengthBand,
        requestedValue: worksheetRequested,
        modelSuggestedValue: modelSuggested,
        reductionAmount: worksheetReduction,
        trendSummary: currentValuation.trendSummary,
      },
      bellCadWorksheet: {
        portalReasons,
        factsText,
        factsCharCount: factsText.length,
      },
      noticeSummary: currentNoticeSummary,
      marketAnalysisSummary: currentParcel.marketAnalysis || null,
      compAttachments,
      links: {
        bellcadProperty: bellcadPropertyViewUrlCurrent(parcelId),
        bellcadPropertyPriorYears: bellcadPropertyViewUrlPrior(parcelId),
        marketAnalysisMap: bellcadMarketAnalysisMapUrl(currentParcel.parcelId || parcelId),
      },
      letter: [
        `Date: ${date}`,
        "",
        "To: Tax Appraisal District Review Board",
        "",
        `Re: Formal Protest Request for Parcel ${parcelId}`,
        "",
        `I, ${ownerName}, request a review of the assessed value for ${currentParcel.situsAddress || "my property"}.`,
        `Current assessed value: $${Number(currentValuation.assessedTotal || 0).toLocaleString()}`,
        `My opinion of value (filing): $${Number(worksheetRequested || 0).toLocaleString()}`,
        `Requested reduction (vs current assessed): $${Number(worksheetReduction || 0).toLocaleString()}`,
        ...(currentNoticeSummary
          ? [
              `Notice market change: ${currentNoticeSummary.marketIncreasePct}%`,
              `Notice assessed change: ${currentNoticeSummary.assessedIncreasePct}%`,
            ]
          : []),
        "",
        "Basis for protest:",
        ...currentValuation.reasoning.map((line) => `- ${line}`),
        "",
        "Supporting record details:",
        `- Owner tax year: ${currentParcel.ownerTaxYear || "n/a"}`,
        `- Legal description: ${currentParcel.legalDescription || "n/a"}`,
        `- Deed date: ${(currentParcel.deed && currentParcel.deed.date) || "n/a"}`,
        ...(currentParcel.marketAnalysis
          ? [
              "",
              "Neighborhood market context:",
              `- Property ID (market svc): ${currentParcel.marketAnalysis.propId || "n/a"}`,
              `- GEO_ID: ${currentParcel.marketAnalysis.geoId || "n/a"}`,
              `- Neighborhood: ${currentParcel.marketAnalysis.neighborhood || "n/a"}`,
              `- Neighborhood market area: ${currentParcel.marketAnalysis.neighborhoodMarketArea || "n/a"}`,
              `- Median market value: $${num(currentParcel.marketAnalysis.medianValue).toLocaleString()}`,
              `- Median sales price: $${num(currentParcel.marketAnalysis.medianSalesPrice).toLocaleString()}`,
              `- Median sq ft of sales: ${num(currentParcel.marketAnalysis.medianSqFtOfSales).toLocaleString()}`,
              `- Number of sales: ${num(currentParcel.marketAnalysis.numberOfSales).toLocaleString()}`,
              `- New houses: ${num(currentParcel.marketAnalysis.newHouses).toLocaleString()}`,
            ]
          : []),
        ...(compAttachments.length
          ? [
              "",
              "Comparable property photo evidence:",
              ...compAttachments.map(
                (row) =>
                  `- ${row.source}: ${row.propertyId} (${row.count} photo(s))${
                    row.files && row.files.length ? ` — ${row.files.join(", ")}` : ""
                  }`
              ),
            ]
          : []),
        "",
        "---",
        "Tax Appraisal District online protest form (draft — copy into portal)",
        "",
        "Reasons to select on the portal:",
        ...(portalReasons.length ? portalReasons.map((r) => `- ${r}`) : ["- (none selected — choose at least one reason)"]),
        "",
        `Facts (${factsText.length} / ${MAX_PROTEST_FACTS_CHARS} characters):`,
        factsText || "(empty — use Tax Appraisal District online protest draft or “Fill from estimate”.)",
        "",
        `Value opinion: $${Number(worksheetRequested || 0).toLocaleString()}${modelNote}`,
      ].join("\n"),
    },
  };
  currentPacket = data;
  setStatus("packetStatus", "Packet generated.");
  renderPacketResult(data);
}

/**
 * @param {PacketResult} packet
 * @returns {string}
 */
function packetToMarkdown(packet) {
  const summary = packet.packet || {};
  const valuation = summary.valuationSummary || {};
  const parcel = summary.parcelSummary || {};
  const links = summary.links || {};
  const notice = summary.noticeSummary || {};
  const market = summary.marketAnalysisSummary || {};
  const worksheet = summary.bellCadWorksheet || {};
  const compAttachments = summary.compAttachments || [];
  const checklist = packet.checklist || [];
  const trend = valuation.trendSummary;

  return [
    `# Property Tax Protest Packet`,
    ``,
    `Generated: ${packet.generatedAt || ""}`,
    ``,
    `## Parcel`,
    `- Parcel ID: ${parcel.parcelId || "n/a"}`,
    `- Situs Address: ${parcel.situsAddress || "n/a"}`,
    `- Assessed Total: $${num(parcel.assessedTotal).toLocaleString()}`,
    `- Owner Tax Year: ${parcel.ownerTaxYear || "n/a"}`,
    `- Legal Description: ${parcel.legalDescription || "n/a"}`,
    ``,
    `## Valuation Summary`,
    `- Protest Strength (planning only): ${valuation.band || "n/a"} (${num(valuation.score)})`,
    `- Your value opinion (filing): $${num(valuation.requestedValue).toLocaleString()}`,
    `- Requested Reduction (vs assessed): $${num(valuation.reductionAmount).toLocaleString()}`,
    ...(num(valuation.modelSuggestedValue) > 0 &&
    num(valuation.modelSuggestedValue) !== num(valuation.requestedValue)
      ? [`- Model estimate: $${num(valuation.modelSuggestedValue).toLocaleString()}`]
      : []),
    ...(trend
      ? [
          `- Trend ${trend.startYear}-${trend.endYear}: ${trend.totalChangePct}% total (${trend.annualizedChangePct}% annualized)`,
        ]
      : []),
    ...(notice && (notice.proposedMarket || notice.protestDeadline)
      ? [
          `- Notice Market Change: ${num(notice.marketIncreasePct).toFixed(1)}%`,
          `- Notice Assessed Change: ${num(notice.assessedIncreasePct).toFixed(1)}%`,
        ]
      : []),
    ...(market && Object.keys(market).length
      ? [
          `- Property ID (market svc): ${market.propId || "n/a"}`,
          `- GEO_ID: ${market.geoId || "n/a"}`,
          `- Neighborhood: ${market.neighborhood || "n/a"}`,
          `- Neighborhood Market Area: ${market.neighborhoodMarketArea || "n/a"}`,
          `- Median Value: $${num(market.medianValue).toLocaleString()}`,
          `- Median Sales Price: $${num(market.medianSalesPrice).toLocaleString()}`,
          `- Median Sq Ft of Sales: ${num(market.medianSqFtOfSales).toLocaleString()}`,
          `- Number of Sales: ${num(market.numberOfSales).toLocaleString()}`,
          `- New Houses: ${num(market.newHouses).toLocaleString()}`,
        ]
      : []),
    ``,
    `## Links`,
    `- Tax appraisal district property (current year): ${links.bellcadProperty || "n/a"}`,
    `- Prior years & taxes (eSearch): ${links.bellcadPropertyPriorYears || "n/a"}`,
    `- Market Analysis Map: ${links.marketAnalysisMap || "n/a"}`,
    ``,
    `## Tax Appraisal District online form (draft)`,
    `- Reasons: ${(worksheet.portalReasons && worksheet.portalReasons.join("; ")) || "n/a"}`,
    `- Facts (${num(worksheet.factsCharCount)} / ${MAX_PROTEST_FACTS_CHARS} characters):`,
    ``,
    "```text",
    worksheet.factsText || "(empty)",
    "```",
    ``,
    `## Comp Photo Evidence`,
    ...(compAttachments.length
      ? compAttachments.map(
          (row) =>
            `- ${row.source}: ${row.propertyId || "n/a"} — ${num(row.count)} photo(s)${
              row.files && row.files.length ? ` (${row.files.join(", ")})` : ""
            }`
        )
      : ["- No comp photos attached."]),
    ``,
    `## Checklist`,
    ...checklist.map((item) => `- [ ] ${item}`),
    ``,
    `## Letter Draft`,
    "```",
    summary.letter || "",
    "```",
  ].join("\n");
}

async function copyPacketMarkdown() {
  if (!currentPacket) {
    throw new Error("Generate a packet first.");
  }
  const markdown = packetToMarkdown(currentPacket);
  await copyTextToClipboard(markdown);
  setStatus("packetStatus", "Markdown packet copied to clipboard.");
}

function bind(buttonId, fn, outId) {
  byId(buttonId).addEventListener("click", async () => {
    try {
      await fn();
    } catch (err) {
      if (outId === "packetStatus") {
        setStatus("packetStatus", String(err.message || err));
      } else if (outId === "compSheetStatus") {
        setStatus("compSheetStatus", String(err.message || err));
      } else if (outId) {
        const msg = String(err.message || err);
        if (outId === "valuationResult") {
          byId("valuationResult").textContent = msg;
        } else {
          writeJson(outId, { error: msg });
        }
      }
    }
  });
}

initAppSettingsAndAdapter();
applyTheme(currentTheme);
syncHeaderOffset();
setActiveAppPage("find");
setWorkflowUnlocked(false);
syncSettingsControls();
bindSettingsControls();
bindCompPhotosModalControls();
renderSourceHealth();
window.addEventListener("resize", syncHeaderOffset, { passive: true });
window.addEventListener("load", syncHeaderOffset);
window.setTimeout(syncHeaderOffset, 120);
window.setTimeout(syncHeaderOffset, 500);

const legalDisclaimerDetails = document.querySelector(".app-legal-footer .legal-disclaimer-details");
if (legalDisclaimerDetails) {
  legalDisclaimerDetails.addEventListener("toggle", () => {
    window.requestAnimationFrame(() => syncHeaderOffset());
  });
}

bind("searchApnBtn", searchParcelByApn, null);
bind("searchApnLandingBtn", searchParcelByApn, null);
bind("analyzeNoticeBtn", analyzeNotice, "packetStatus");
bind("parseTrendBtn", parseTrendPaste, "packetStatus");
bind("addTrendRowBtn", addTrendRow, null);
bind("scoreBtn", scoreParcel, "valuationResult");
bind("packetBtn", generatePacket, "packetResult");
bind("copyPacketMdBtn", copyPacketMarkdown, "packetStatus");
bind("printCompSheetBtn", printCompSheet, "compSheetStatus");

const valueOpinionInputEl = byId("valueOpinionInput");
if (valueOpinionInputEl) {
  valueOpinionInputEl.addEventListener("input", () => {
    worksheetValueOpinionUserSet = true;
  });
}
const protestFactsInputEl = byId("protestFactsInput");
if (protestFactsInputEl) {
  protestFactsInputEl.addEventListener("input", updateProtestFactsCharCount);
}
const syncValueOpinionBtn = byId("syncValueOpinionBtn");
if (syncValueOpinionBtn) {
  syncValueOpinionBtn.addEventListener("click", () => {
    try {
      syncValueOpinionFromEstimate();
      setStatus("packetStatus", "Value synced to Estimate Protest Potential.");
    } catch (err) {
      setStatus("packetStatus", String(err.message || err));
    }
  });
}
const fillFactsFromEstimateBtn = byId("fillFactsFromEstimateBtn");
if (fillFactsFromEstimateBtn) {
  fillFactsFromEstimateBtn.addEventListener("click", () => {
    try {
      fillFactsFromEstimate();
      setStatus("packetStatus", "Facts filled from estimate.");
    } catch (err) {
      setStatus("packetStatus", String(err.message || err));
    }
  });
}
const copyProtestFactsBtn = byId("copyProtestFactsBtn");
if (copyProtestFactsBtn) {
  copyProtestFactsBtn.addEventListener("click", async () => {
    try {
      await copyProtestFacts();
    } catch (err) {
      setStatus("packetStatus", String(err.message || err));
    }
  });
}

renderTrendRows([]);
updateScoreButtonState();
updateProtestFactsCharCount();
["assessedOverride", "conditionPenalty"].forEach((id) => {
  const el = byId(id);
  if (el) el.addEventListener("input", updateEstimateReadiness);
});
const citySqftVarianceInput = byId("citySqftVariancePct");
if (citySqftVarianceInput) {
  citySqftVarianceInput.addEventListener("input", () => {
    if (!currentParcel) return;
    renderCitySoldHomes(
      currentParcel.city,
      currentParcel.cityNeighborhoodCodes,
      currentParcel.citySales,
      (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
    );
  });
}
const citySalesSortInput = byId("citySalesSort");
if (citySalesSortInput) {
  citySalesSortInput.addEventListener("change", () => {
    if (!currentParcel) return;
    renderCitySoldHomes(
      currentParcel.city,
      currentParcel.cityNeighborhoodCodes,
      currentParcel.citySales,
      (currentParcel.marketAnalysis && currentParcel.marketAnalysis.squareFoot) || currentParcel.sqft
    );
  });
}
const backToFindBtn = byId("backToFindBtn");
if (backToFindBtn) {
  backToFindBtn.addEventListener("click", startNewSearch);
}
const mainMenuLinks = [...document.querySelectorAll(".app-main-menu-link[data-app-page]")];
mainMenuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const page = link.getAttribute("data-app-page") || "find";
    if (page === "dashboard" && !workflowUnlocked) return;
    setActiveAppPage(page);
  });
});
updateEstimateReadiness();
initCompSalePriceControls();
initStepRailScrollSpy();
bindKpiLinksMenuControls();
bindCompActionsMenuControls();
