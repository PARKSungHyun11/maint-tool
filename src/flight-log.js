export const FLIGHT_LOG_DRAFTS_KEY = "maintToolFlightLogDraftsV1";
export const FLIGHT_LOG_CURRENT_KEY = "maintToolFlightLogCurrentV1";
export const FLIGHT_LOG_ACCOUNT_KEY = "maintToolAccountV1";

export const COMPANY_DOMAINS = [
  { name: "Korean Air", domain: "koreanair.com" },
  { name: "Asiana Airlines", domain: "flyasiana.com" },
  { name: "Jin Air", domain: "jinair.com" },
  { name: "Air Busan", domain: "airbusan.com" },
  { name: "Air Seoul", domain: "airseoul.com" },
  { name: "Jeju Air", domain: "jejuair.net" },
  { name: "T'way Air", domain: "twayair.com" },
  { name: "Eastar Jet", domain: "eastarjet.com" },
  { name: "Aero K", domain: "aerok.com" },
  { name: "Air Premia", domain: "airpremia.com" },
];

export const emptyFlightLogDraft = () => ({
  id: globalThis.crypto?.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  ecamMsg: "",
  faultCode: "",
  action: "",
  refManual: "",
  fullLogOverride: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: "local",
});

const normalizeSentence = (value) => value.trim().replace(/[.\s]+$/g, "");
export const toFlightLogUppercase = (value = "") => String(value).toUpperCase();

export function normalizeFlightLogCase(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    ecamMsg: toFlightLogUppercase(draft.ecamMsg),
    faultCode: toFlightLogUppercase(draft.faultCode),
    action: toFlightLogUppercase(draft.action),
    refManual: toFlightLogUppercase(draft.refManual),
    fullLogOverride: toFlightLogUppercase(draft.fullLogOverride),
    fullLog: toFlightLogUppercase(draft.fullLog),
  };
}

export function parseManualReferences(refManual = "") {
  const refs = refManual
    .split(/\n|,|;/)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    tsm: refs.filter((ref) => /^TSM\b/i.test(ref)),
    amm: refs.filter((ref) => /^AMM\b/i.test(ref)),
    other: refs.filter((ref) => !/^(TSM|AMM)\b/i.test(ref)),
  };
}

export function composeFullLog(draft) {
  if (draft?.fullLogOverride?.trim()) return toFlightLogUppercase(draft.fullLogOverride.trim());

  const parts = [];
  const faultCode = toFlightLogUppercase(draft?.faultCode).trim();
  const action = normalizeSentence(toFlightLogUppercase(draft?.action));
  const refs = parseManualReferences(toFlightLogUppercase(draft?.refManual));

  if (faultCode) parts.push(`<F/C:${faultCode}>`);
  if (refs.tsm.length) parts.push(`IAW ${refs.tsm.join(", ")},`);
  if (action) parts.push(`PERFORMED ${action}.`);
  if (refs.amm.length) parts.push(`PER ${refs.amm.join(", ")}.`);
  if (refs.other.length) parts.push(`REF ${refs.other.join(", ")}.`);

  return toFlightLogUppercase(parts.join(" ").replace(/\s+/g, " ").trim());
}

export function validatePassword(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  return { valid: Object.values(checks).every(Boolean), checks };
}

export function getCompanyForEmail(email) {
  const domain = String(email).trim().toLowerCase().split("@")[1] || "";
  return COMPANY_DOMAINS.find((company) => company.domain === domain) || null;
}

export function formatDraftTimestamp(iso) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(iso));
  } catch {
    return "Saved locally";
  }
}
