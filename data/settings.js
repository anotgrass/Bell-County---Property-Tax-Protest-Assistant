(function initProtestSettingsScope() {
  const STORAGE_KEY = "protest_assistant_settings_v1";

  const countyRegistry = {
    "bell-tx": {
      id: "bell-tx",
      label: "Bell County, TX",
      districtLabel: "Bell County Appraisal District",
      districtUrl: "https://bellcad.org/",
      supports: ["live", "geojson"],
      defaultSource: "live",
    },
  };

  function getDefaultSettings() {
    return {
      countyId: "bell-tx",
      dataSource: countyRegistry["bell-tx"].defaultSource,
    };
  }

  function readSettings() {
    const defaults = getDefaultSettings();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const countyId = countyRegistry[parsed.countyId] ? parsed.countyId : defaults.countyId;
      const source = String(parsed.dataSource || defaults.dataSource);
      const allowed = countyRegistry[countyId].supports;
      const dataSource = allowed.includes(source) ? source : defaults.dataSource;
      return { countyId, dataSource };
    } catch (err) {
      console.warn("Ignoring invalid app settings in localStorage.", err);
      return defaults;
    }
  }

  function writeSettings(next) {
    const settings = readSettings();
    const countyId = countyRegistry[next.countyId] ? next.countyId : settings.countyId;
    const source = String(next.dataSource || settings.dataSource);
    const allowed = countyRegistry[countyId].supports;
    const dataSource = allowed.includes(source) ? source : settings.dataSource;
    const merged = { countyId, dataSource };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  window.ProtestSettings = {
    countyRegistry,
    getDefaultSettings,
    readSettings,
    writeSettings,
  };
})();
