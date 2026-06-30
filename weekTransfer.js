// Module for exporting and importing week data.
// This module is intentionally UI-agnostic and will contain the sharing/import logic later.

function getCurrentWeek() {
  const date = new Date();
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;

  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();

  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }

  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getSelectedWeek() {
  if (typeof document !== "undefined") {
    const picker = document.getElementById("weekPicker");
    if (picker && picker.value) {
      return picker.value;
    }
  }

  return getCurrentWeek();
}

export function exportCurrentWeek() {
  const week = getSelectedWeek();
  const storageKey = `workhours_${week}`;
  let data = {};

  if (typeof localStorage !== "undefined") {
    const rawData = localStorage.getItem(storageKey);
    if (rawData) {
      try {
        const parsedData = JSON.parse(rawData);
        if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
          data = parsedData;
        }
      } catch (error) {
        // Ignore malformed storage data and return an empty payload.
      }
    }
  }

  return {
    version: 1,
    week,
    generated: new Date().toISOString(),
    data
  };
}

export function createImportUrl(exportObject) {
  const json = JSON.stringify(exportObject);
  const compress = typeof window !== "undefined"
    && window.LZString
    && typeof window.LZString.compressToEncodedURIComponent === "function"
    ? window.LZString.compressToEncodedURIComponent.bind(window.LZString)
    : null;

  if (!compress) {
    throw new Error("LZString is required to create import URLs.");
  }

  const compressedData = compress(json);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}?import=${compressedData}`;
}

export function decodeImportData(encodedData) {
  if (!encodedData || typeof encodedData !== "string") {
    return null;
  }

  try {
    const decompress = typeof window !== "undefined"
      && window.LZString
      && typeof window.LZString.decompressFromEncodedURIComponent === "function"
      ? window.LZString.decompressFromEncodedURIComponent.bind(window.LZString)
      : null;

    if (!decompress) {
      return null;
    }

    const decompressedData = decompress(encodedData);
    if (!decompressedData) {
      return null;
    }

    const parsedData = JSON.parse(decompressedData);
    if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
      return null;
    }

    const hasRequiredFields = parsedData.version != null
      && parsedData.week
      && parsedData.generated
      && parsedData.data && typeof parsedData.data === "object";

    if (!hasRequiredFields) {
      return null;
    }

    return parsedData;
  } catch (error) {
    return null;
  }
}
