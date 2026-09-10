import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import {
  FLIGHT_LOG_ACCOUNT_KEY,
  FLIGHT_LOG_CURRENT_KEY,
  FLIGHT_LOG_DRAFTS_KEY,
} from "./flight-log.js";

const env = globalThis.__MAINT_TOOL_CONFIG__ || {};
const supabaseUrl = env.supabaseUrl || "";
const supabaseAnonKey = env.supabaseAnonKey || "";
const CALCULATOR_SETTINGS_KEY = "maintToolCalculatorSettingsV1";
const AUTH_META_KEY = "maintToolAuthMetaV1";
const OAUTH_CALLBACK_URL = "com.parksunghyun.mainttool://login-callback";

export const serviceConfig = {
  supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  feedbackEmail: env.feedbackEmail || "",
};

export const supabase = serviceConfig.supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    })
  : null;

// Firebase Analytics auto-collects app_open/session_start/user_engagement once
// GoogleService-Info.plist (from the Firebase console) is bundled into ios/App/App.
// No custom event logging needed for basic "how many people open it, how often".
export async function initializeAnalytics() {
  if (!Capacitor.isNativePlatform()) return;
  await FirebaseAnalytics.setEnabled({ enabled: true }).catch(() => {});
}

async function readJson(key, fallback) {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : fallback;
  } catch {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }
}

async function writeJson(key, value) {
  const serialized = JSON.stringify(value);
  try {
    await Preferences.set({ key, value: serialized });
  } catch {
    localStorage.setItem(key, serialized);
  }
}

export const localStore = {
  drafts: {
    get: () => readJson(FLIGHT_LOG_DRAFTS_KEY, []),
    set: (drafts) => writeJson(FLIGHT_LOG_DRAFTS_KEY, drafts),
  },
  currentDraft: {
    get: () => readJson(FLIGHT_LOG_CURRENT_KEY, null),
    set: (draft) => writeJson(FLIGHT_LOG_CURRENT_KEY, draft),
  },
  account: {
    get: () => readJson(FLIGHT_LOG_ACCOUNT_KEY, null),
    set: (account) => writeJson(FLIGHT_LOG_ACCOUNT_KEY, account),
  },
  calculatorSettings: {
    get: () => readJson(CALCULATOR_SETTINGS_KEY, { nefMoiName: "NEF·MOI", nefMoiDays: 240 }),
    set: (settings) => writeJson(CALCULATOR_SETTINGS_KEY, settings),
  },
  authMeta: {
    get: () => readJson(AUTH_META_KEY, null),
    set: (meta) => writeJson(AUTH_META_KEY, meta),
  },
};

export async function signUpWithEmail({ email, password, accountType, company }) {
  if (!supabase) {
    return { localOnly: true, user: { email, accountType, company: company?.name || null } };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { account_type: accountType, company: company?.name || null } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  if (!supabase) return { localOnly: true, user: { email } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error("Account service is not configured yet.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function signInWithOAuth(provider) {
  if (!supabase) {
    throw new Error("Google login setup is not complete yet. Connect the Supabase public keys in config.js first.");
  }
  await localStore.authMeta.set({ provider, lastUsedAt: new Date().toISOString() });
  const isNative = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: isNative ? OAUTH_CALLBACK_URL : window.location.origin,
      skipBrowserRedirect: isNative,
    },
  });
  if (error) throw error;
  if (isNative) {
    if (!data?.url) throw new Error("The login service did not return a sign-in URL.");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  }
  return data;
}

async function accountFromSession(session) {
  const user = session?.user;
  if (!user) return null;
  const provider = user.app_metadata?.provider || null;
  return { email: user.email || "", provider, localOnly: false };
}

async function finishOAuthFromUrl(url) {
  if (!supabase || !url?.startsWith(OAUTH_CALLBACK_URL)) return null;
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get("error_description")
    || new URLSearchParams(parsed.hash.replace(/^#/, "")).get("error_description");
  if (errorDescription) throw new Error(decodeURIComponent(errorDescription));

  const code = parsed.searchParams.get("code");
  let session = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    session = data.session;
  } else {
    const params = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) throw new Error("The login callback did not include a valid session.");
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    session = data.session;
  }

  await Browser.close().catch(() => {});
  const account = await accountFromSession(session);
  if (account) await localStore.account.set(account);
  return account;
}

export async function initializeOAuthCallbackHandling(onAccount, onError) {
  if (!supabase || !Capacitor.isNativePlatform()) return { remove() {} };
  const handleUrl = async (url) => {
    try {
      const account = await finishOAuthFromUrl(url);
      if (account) onAccount?.(account);
    } catch (error) {
      await Browser.close().catch(() => {});
      onError?.(error);
    }
  };
  const listener = await App.addListener("appUrlOpen", ({ url }) => handleUrl(url));
  const launch = await App.getLaunchUrl().catch(() => null);
  if (launch?.url) await handleUrl(launch.url);
  return listener;
}

export function observeSignedInAccount(onAccount) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      await localStore.account.set(null);
      onAccount?.(null);
      return;
    }
    const account = await accountFromSession(session);
    if (account) {
      await localStore.account.set(account);
      onAccount?.(account);
    }
  });
  return () => subscription.unsubscribe();
}

export async function getSignedInAccount() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  const provider = data.user.app_metadata?.provider || null;
  return { email: data.user.email || "", provider, localOnly: false };
}

export async function signOutCurrentAccount() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  await localStore.account.set(null);
}

export async function deleteCurrentAccount() {
  if (!supabase) throw new Error("Cloud account service is not configured yet.");
  const { error } = await supabase.functions.invoke("delete-account", { body: { confirm: true } });
  if (error) throw error;
  await supabase.auth.signOut();
  return true;
}

const exportText = (drafts) => drafts.map((draft, index) => [
  `# ${index + 1}. ${draft.ecamMsg || "Untitled Flight Log"}`,
  `FAULT CODE: ${draft.faultCode || "-"}`,
  `ACTION: ${draft.action || "-"}`,
  `REF MANUAL:\n${draft.refManual || "-"}`,
  `RESULT:\n${draft.fullLog || "-"}`,
  `UPDATED: ${draft.updatedAt || "-"}`,
].join("\n")).join("\n\n----------------------------------------\n\n");

async function shareWrittenFile(filename, data, mimeType) {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      encoding: mimeType.startsWith("text/") ? Encoding.UTF8 : undefined,
    });
    await Share.share({ title: "Maint Tool Flight Logs", url: result.uri, dialogTitle: "Export / Backup" });
    return;
  }
  const href = mimeType.startsWith("text/")
    ? URL.createObjectURL(new Blob([data], { type: mimeType }))
    : `data:${mimeType};base64,${data}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  if (href.startsWith("blob:")) URL.revokeObjectURL(href);
}

export async function exportLogsAsText(drafts) {
  return shareWrittenFile(`Maint-Tool-Flight-Logs-${Date.now()}.txt`, exportText(drafts), "text/plain");
}

export async function exportLogsAsJson(drafts) {
  return shareWrittenFile(`Maint-Tool-Backup-${Date.now()}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), drafts }, null, 2), "text/plain");
}

export async function exportLogsAsPdf(drafts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 42;
  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Maint Tool - Flight Log Drafts", margin, y);
  y += 28;
  doc.setFontSize(10);
  for (const draft of drafts) {
    const rows = [
      draft.ecamMsg || "Untitled Flight Log",
      `FAULT CODE: ${draft.faultCode || "-"}`,
      `ACTION: ${draft.action || "-"}`,
      `REF MANUAL: ${draft.refManual || "-"}`,
      `RESULT: ${draft.fullLog || "-"}`,
    ];
    for (let index = 0; index < rows.length; index += 1) {
      doc.setFont("helvetica", index === 0 ? "bold" : "normal");
      const lines = doc.splitTextToSize(rows[index], 510);
      if (y + lines.length * 14 > 790) { doc.addPage(); y = 50; }
      doc.text(lines, margin, y);
      y += lines.length * 14 + 5;
    }
    y += 12;
    doc.setDrawColor(210);
    doc.line(margin, y, 553, y);
    y += 18;
  }
  const base64 = doc.output("datauristring").split(",")[1];
  return shareWrittenFile(`Maint-Tool-Flight-Logs-${Date.now()}.pdf`, base64, "application/pdf");
}

export async function syncDraftsToCloud(drafts) {
  if (!supabase || !navigator.onLine) return { synced: false, reason: "offline-or-unconfigured" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: false, reason: "signed-out" };
  const rows = drafts.map((draft) => ({
    id: draft.id,
    user_id: user.id,
    ecam_msg: draft.ecamMsg,
    fault_code: draft.faultCode,
    action: draft.action,
    ref_manual: draft.refManual,
    full_log_override: draft.fullLogOverride || null,
    updated_at: draft.updatedAt,
  }));
  const { error } = await supabase.from("flight_log_drafts").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { synced: true };
}
