import React, { useState, useEffect, useMemo, useReducer, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Keyboard } from "@capacitor/keyboard";
import { SiApple } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import {
  ArrowLeft, ArrowsDownUp, CaretDown, CaretLeft, CaretRight, CaretUp, Check,
  ClipboardText, Clock, CloudCheck, Copy,
  EnvelopeSimple, Eye, EyeSlash, FloppyDisk,
  SignOut, Trash, UserCircle, X,
} from "@phosphor-icons/react";
import {
  composeFullLog, emptyFlightLogDraft, formatDraftTimestamp,
  normalizeFlightLogCase, toFlightLogUppercase, validatePassword,
} from "./src/flight-log.js";
import {
  getSignedInAccount, initializeAnalytics,
  initializeOAuthCallbackHandling, localStore, observeSignedInAccount, requestPasswordReset,
  serviceConfig, signInWithEmail, signInWithOAuth, signOutCurrentAccount, signUpWithEmail,
  syncDraftsToCloud,
} from "./src/app-services.js";

const pad = (n) => String(n).padStart(2, "0");
const DOW_EN = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MON3   = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const TZ_STORAGE_KEY = "maintTimerSelectedTz";
const CALC_HISTORY_STORAGE_KEY = "maintToolCalcHistory";
const APP_VERSION = "1.0.0";
const APP_MUTED_RED = "#8A3545";
const APP_MUTED_BLUE = "#2D4E8A";
const APP_RED_BG = "#F5E8EA";
const APP_BLUE_BG = "#E4EBF5";
// Every near-black/near-gray text shade in the app collapses to one of these two tokens,
// so a future palette tweak is a one-line change instead of a hunt through inline styles.
const TEXT_BLACK = "#1C1C1E";
const TEXT_MUTED = "#6B7280";

// ─── Timezone list ────────────────────────────────────────────────────────────
const TZ_LIST = [
  { flag:"🇰🇷", label:"KST", name:"Korea",        zone:"Asia/Seoul" },
  { flag:"🇯🇵", label:"JST", name:"Japan",        zone:"Asia/Tokyo" },
  { flag:"🇨🇳", label:"CST", name:"China",        zone:"Asia/Shanghai" },
  { flag:"🇦🇺", label:"AEST",name:"Australia(BNE)",zone:"Australia/Brisbane" },
  { flag:"🇦🇺", label:"AET", name:"Australia(E)", zone:"Australia/Sydney" },
  { flag:"🇦🇹", label:"CET", name:"Austria",      zone:"Europe/Vienna" },
  { flag:"🇧🇩", label:"BST", name:"Bangladesh",   zone:"Asia/Dhaka" },
  { flag:"🇧🇪", label:"CET", name:"Belgium",      zone:"Europe/Brussels" },
  { flag:"🇧🇷", label:"BRT", name:"Brazil",       zone:"America/Sao_Paulo" },
  { flag:"🇰🇭", label:"ICT", name:"Cambodia",     zone:"Asia/Phnom_Penh" },
  { flag:"🇨🇦", label:"ET",  name:"Canada(East)", zone:"America/Toronto" },
  { flag:"🇨🇦", label:"MT",  name:"Canada(Mtn)",  zone:"America/Edmonton" },
  { flag:"🇨🇦", label:"PT",  name:"Canada(West)", zone:"America/Vancouver" },
  { flag:"🇨🇱", label:"CLT", name:"Chile",        zone:"America/Santiago" },
  { flag:"🇨🇴", label:"COT", name:"Colombia",     zone:"America/Bogota" },
  { flag:"🇨🇿", label:"CET", name:"Czech",        zone:"Europe/Prague" },
  { flag:"🇪🇬", label:"EET", name:"Egypt",        zone:"Africa/Cairo" },
  { flag:"🇫🇷", label:"CET", name:"France",       zone:"Europe/Paris" },
  { flag:"🇩🇪", label:"CET", name:"Germany",      zone:"Europe/Berlin" },
  { flag:"🇬🇷", label:"EET", name:"Greece",       zone:"Europe/Athens" },
  { flag:"🇬🇺", label:"ChST",name:"Guam",         zone:"Pacific/Guam" },
  { flag:"🇭🇰", label:"HKT", name:"Hong Kong",    zone:"Asia/Hong_Kong" },
  { flag:"🇭🇺", label:"CET", name:"Hungary",      zone:"Europe/Budapest" },
  { flag:"🇮🇳", label:"IST", name:"India",        zone:"Asia/Kolkata" },
  { flag:"🇮🇩", label:"WITA",name:"Indonesia(Bali)",zone:"Asia/Makassar" },
  { flag:"🇮🇩", label:"WIB", name:"Indonesia(JKT)",zone:"Asia/Jakarta" },
  { flag:"🇮🇹", label:"CET", name:"Italy",        zone:"Europe/Rome" },
  { flag:"🇰🇿", label:"ALMT",name:"Kazakhstan",   zone:"Asia/Almaty" },
  { flag:"🇲🇴", label:"MOT", name:"Macau",        zone:"Asia/Macau" },
  { flag:"🇲🇾", label:"MYT", name:"Malaysia",     zone:"Asia/Kuala_Lumpur" },
  { flag:"🇲🇽", label:"CST", name:"Mexico",       zone:"America/Mexico_City" },
  { flag:"🇲🇳", label:"ULAT",name:"Mongolia",     zone:"Asia/Ulaanbaatar" },
  { flag:"🇲🇲", label:"MMT", name:"Myanmar",      zone:"Asia/Yangon" },
  { flag:"🇳🇵", label:"NPT", name:"Nepal",        zone:"Asia/Kathmandu" },
  { flag:"🇳🇱", label:"CET", name:"Netherlands",  zone:"Europe/Amsterdam" },
  { flag:"🇳🇿", label:"NZT", name:"New Zealand",  zone:"Pacific/Auckland" },
  { flag:"🇳🇴", label:"CET", name:"Norway",       zone:"Europe/Oslo" },
  { flag:"🇵🇪", label:"PET", name:"Peru",         zone:"America/Lima" },
  { flag:"🇵🇭", label:"PHT", name:"Philippines",  zone:"Asia/Manila" },
  { flag:"🇵🇹", label:"WET", name:"Portugal",     zone:"Europe/Lisbon" },
  { flag:"🇲🇵", label:"ChST",name:"Saipan",       zone:"Pacific/Saipan" },
  { flag:"🇸🇬", label:"SGT", name:"Singapore",    zone:"Asia/Singapore" },
  { flag:"🇪🇸", label:"CET", name:"Spain",        zone:"Europe/Madrid" },
  { flag:"🇸🇪", label:"CET", name:"Sweden",       zone:"Europe/Stockholm" },
  { flag:"🇨🇭", label:"CET", name:"Switzerland",  zone:"Europe/Zurich" },
  { flag:"🇹🇼", label:"TST", name:"Taiwan",       zone:"Asia/Taipei" },
  { flag:"🇹🇭", label:"ICT", name:"Thailand",     zone:"Asia/Bangkok" },
  { flag:"🇹🇷", label:"TRT", name:"Turkey",       zone:"Europe/Istanbul" },
  { flag:"🇦🇪", label:"GST", name:"UAE",          zone:"Asia/Dubai" },
  { flag:"🇬🇧", label:"GMT", name:"United Kingdom",zone:"Europe/London" },
  { flag:"🇺🇸", label:"AKT", name:"USA(Alaska)",  zone:"America/Anchorage" },
  { flag:"🇺🇸", label:"CT",  name:"USA(Central)", zone:"America/Chicago" },
  { flag:"🇺🇸", label:"ET",  name:"USA(East)",    zone:"America/New_York" },
  { flag:"🇺🇸", label:"HST", name:"USA(Hawaii)",  zone:"Pacific/Honolulu" },
  { flag:"🇺🇸", label:"PT",  name:"USA(West)",    zone:"America/Los_Angeles" },
  { flag:"🇺🇿", label:"UZT", name:"Uzbekistan",   zone:"Asia/Tashkent" },
  { flag:"🇻🇳", label:"ICT", name:"Vietnam",      zone:"Asia/Ho_Chi_Minh" },
];

const TZ_AIRPORT_CODES = {
  "Asia/Seoul": "ICN GMP PUS CJU TAE KWJ MWX USN RSU HIN KUV WJU YNY",
  "Asia/Tokyo": "NRT HND KIX NGO FUK CTS OKA",
  "Asia/Shanghai": "PEK PKX PVG SHA CAN SZX XIY TAO CTU TFU HGH NKG DLC SHE WUH CGO TSN",
  "Australia/Brisbane": "BNE",
  "Australia/Sydney": "SYD MEL PER ADL CNS",
  "Europe/Vienna": "VIE",
  "Asia/Dhaka": "DAC",
  "Europe/Brussels": "BRU",
  "America/Sao_Paulo": "GRU",
  "Asia/Phnom_Penh": "PNH REP SAI",
  "America/Toronto": "YYZ YUL",
  "America/Edmonton": "YYC YEG",
  "America/Vancouver": "YVR",
  "America/Santiago": "SCL",
  "America/Bogota": "BOG",
  "Europe/Prague": "PRG",
  "Africa/Cairo": "CAI",
  "Europe/Paris": "CDG ORY",
  "Europe/Berlin": "FRA MUC BER",
  "Europe/Athens": "ATH",
  "Pacific/Guam": "GUM",
  "Asia/Hong_Kong": "HKG",
  "Europe/Budapest": "BUD",
  "Asia/Kolkata": "DEL BOM MAA BLR",
  "Asia/Makassar": "DPS",
  "Asia/Jakarta": "CGK",
  "Europe/Rome": "FCO MXP VCE",
  "Asia/Almaty": "ALA",
  "Asia/Macau": "MFM",
  "Asia/Kuala_Lumpur": "KUL BKI",
  "America/Mexico_City": "MEX",
  "Asia/Ulaanbaatar": "UBN",
  "Asia/Yangon": "RGN",
  "Asia/Kathmandu": "KTM",
  "Europe/Amsterdam": "AMS",
  "Pacific/Auckland": "AKL CHC",
  "Europe/Oslo": "OSL",
  "America/Lima": "LIM",
  "Asia/Manila": "MNL CEB CRK",
  "Europe/Lisbon": "LIS",
  "Pacific/Saipan": "SPN",
  "Asia/Singapore": "SIN",
  "Europe/Madrid": "MAD BCN",
  "Europe/Stockholm": "ARN",
  "Europe/Zurich": "ZRH",
  "Asia/Taipei": "TPE TSA KHH",
  "Asia/Bangkok": "BKK DMK HKT CNX",
  "Europe/Istanbul": "IST SAW",
  "Asia/Dubai": "DXB AUH",
  "Europe/London": "LHR LGW STN MAN",
  "America/Anchorage": "ANC",
  "America/Chicago": "ORD DFW IAH MSP",
  "America/New_York": "JFK EWR IAD BOS ATL DTW",
  "Pacific/Honolulu": "HNL",
  "America/Los_Angeles": "LAX SFO SEA LAS",
  "Asia/Tashkent": "TAS",
  "Asia/Ho_Chi_Minh": "SGN HAN DAD",
};

const TZ_SEARCH_ALIASES = {
  "Asia/Seoul": ["Seoul","Incheon","Gimpo","Busan","Jeju","Korea","서울","인천","김포","부산","제주","한국"],
  "Asia/Tokyo": ["Tokyo","Narita","Haneda","Osaka","Kansai","Nagoya","Fukuoka","Sapporo","Okinawa","Japan","도쿄","나리타","하네다","오사카","간사이","나고야","후쿠오카","삿포로","오키나와","일본"],
  "Asia/Shanghai": ["Beijing","Shanghai","Guangzhou","Shenzhen","Xian","Qingdao","Chengdu","Hangzhou","Nanjing","Dalian","Shenyang","Wuhan","Zhengzhou","Tianjin","China","베이징","상하이","광저우","선전","시안","칭다오","청두","항저우","난징","다롄","선양","우한","정저우","톈진","중국"],
  "Australia/Brisbane": ["Brisbane","Australia","브리즈번","호주"],
  "Australia/Sydney": ["Sydney","Melbourne","Perth","Adelaide","Cairns","Australia","시드니","멜버른","퍼스","애들레이드","케언스","호주"],
  "Europe/Vienna": ["Vienna","Austria","비엔나","빈","오스트리아"],
  "Asia/Dhaka": ["Dhaka","Bangladesh","다카","방글라데시"],
  "Europe/Brussels": ["Brussels","Belgium","브뤼셀","벨기에"],
  "America/Sao_Paulo": ["Sao Paulo","São Paulo","Brazil","상파울루","브라질"],
  "Asia/Phnom_Penh": ["Phnom Penh","Siem Reap","Cambodia","프놈펜","씨엠립","시엠레아프","캄보디아"],
  "America/Toronto": ["Toronto","Montreal","Canada","토론토","몬트리올","캐나다"],
  "America/Edmonton": ["Calgary","Edmonton","Canada","캘거리","에드먼턴","캐나다"],
  "America/Vancouver": ["Vancouver","Canada","밴쿠버","캐나다"],
  "America/Santiago": ["Santiago","Chile","산티아고","칠레"],
  "America/Bogota": ["Bogota","Bogotá","Colombia","보고타","콜롬비아"],
  "Europe/Prague": ["Prague","Czech","프라하","체코"],
  "Africa/Cairo": ["Cairo","Egypt","카이로","이집트"],
  "Europe/Paris": ["Paris","Charles de Gaulle","Orly","France","파리","샤를 드골","오를리","프랑스"],
  "Europe/Berlin": ["Frankfurt","Munich","Berlin","Germany","프랑크푸르트","뮌헨","베를린","독일"],
  "Europe/Athens": ["Athens","Greece","아테네","그리스"],
  "Pacific/Guam": ["Guam","괌"],
  "Asia/Hong_Kong": ["Hong Kong","홍콩"],
  "Europe/Budapest": ["Budapest","Hungary","부다페스트","헝가리"],
  "Asia/Kolkata": ["Delhi","Mumbai","Chennai","Bengaluru","Bangalore","India","델리","뭄바이","첸나이","벵갈루루","방갈로르","인도"],
  "Asia/Makassar": ["Bali","Denpasar","Indonesia","발리","덴파사르","인도네시아"],
  "Asia/Jakarta": ["Jakarta","Indonesia","자카르타","인도네시아"],
  "Europe/Rome": ["Rome","Milan","Venice","Italy","로마","밀라노","베네치아","이탈리아"],
  "Asia/Almaty": ["Almaty","Kazakhstan","알마티","카자흐스탄"],
  "Asia/Macau": ["Macau","Macao","마카오"],
  "Asia/Kuala_Lumpur": ["Kuala Lumpur","Kota Kinabalu","Malaysia","쿠알라룸푸르","코타키나발루","말레이시아"],
  "America/Mexico_City": ["Mexico City","Mexico","멕시코시티","멕시코"],
  "Asia/Ulaanbaatar": ["Ulaanbaatar","Ulan Bator","Mongolia","울란바토르","몽골"],
  "Asia/Yangon": ["Yangon","Myanmar","양곤","미얀마"],
  "Asia/Kathmandu": ["Kathmandu","Nepal","카트만두","네팔"],
  "Europe/Amsterdam": ["Amsterdam","Netherlands","암스테르담","네덜란드"],
  "Pacific/Auckland": ["Auckland","Christchurch","New Zealand","오클랜드","크라이스트처치","뉴질랜드"],
  "Europe/Oslo": ["Oslo","Norway","오슬로","노르웨이"],
  "America/Lima": ["Lima","Peru","리마","페루"],
  "Asia/Manila": ["Manila","Cebu","Clark","Philippines","마닐라","세부","클라크","필리핀"],
  "Europe/Lisbon": ["Lisbon","Portugal","리스본","포르투갈"],
  "Pacific/Saipan": ["Saipan","사이판"],
  "Asia/Singapore": ["Singapore","싱가포르"],
  "Europe/Madrid": ["Madrid","Barcelona","Spain","마드리드","바르셀로나","스페인"],
  "Europe/Stockholm": ["Stockholm","Sweden","스톡홀름","스웨덴"],
  "Europe/Zurich": ["Zurich","Switzerland","취리히","스위스"],
  "Asia/Taipei": ["Taipei","Kaohsiung","Taiwan","타이베이","가오슝","대만"],
  "Asia/Bangkok": ["Bangkok","Don Mueang","Phuket","Chiang Mai","Thailand","방콕","돈므앙","푸켓","치앙마이","태국","HTK"],
  "Europe/Istanbul": ["Istanbul","Turkey","이스탄불","튀르키예","터키"],
  "Asia/Dubai": ["Dubai","Abu Dhabi","UAE","두바이","아부다비","아랍에미리트"],
  "Europe/London": ["London","Heathrow","Gatwick","Stansted","Manchester","United Kingdom","런던","히스로","개트윅","스탠스테드","맨체스터","영국"],
  "America/Anchorage": ["Anchorage","Alaska","앵커리지","알래스카"],
  "America/Chicago": ["Chicago","Dallas","Houston","Minneapolis","USA","시카고","댈러스","휴스턴","미니애폴리스","미국"],
  "America/New_York": ["New York","Newark","Washington","Boston","Atlanta","Detroit","USA","뉴욕","뉴어크","워싱턴","보스턴","애틀랜타","디트로이트","미국"],
  "Pacific/Honolulu": ["Honolulu","Hawaii","호놀룰루","하와이"],
  "America/Los_Angeles": ["Los Angeles","San Francisco","Seattle","Las Vegas","USA","로스앤젤레스","샌프란시스코","시애틀","라스베이거스","미국"],
  "Asia/Tashkent": ["Tashkent","Uzbekistan","타슈켄트","우즈베키스탄"],
  "Asia/Ho_Chi_Minh": ["Ho Chi Minh","Hanoi","Da Nang","Vietnam","호찌민","하노이","다낭","베트남"],
};

const TZ_BY_ID = new Map();
TZ_LIST.forEach(t => {
  TZ_BY_ID.set(t.zone, t);
  if (!TZ_BY_ID.has(t.label)) TZ_BY_ID.set(t.label, t);
});

const TZ_SEARCH_INDEX = new Map(TZ_LIST.map(t => [
  t.zone,
  [
    t.name,
    t.label,
    ...(TZ_AIRPORT_CODES[t.zone] || "").split(/\s+/),
    ...(TZ_SEARCH_ALIASES[t.zone] || []),
  ].filter(Boolean).map(value => value.toLowerCase()),
]));

function matchesTzSearch(t, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (TZ_SEARCH_INDEX.get(t.zone) || []).some(value => value.startsWith(q));
}

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
}

function findTz(id) {
  return TZ_BY_ID.get(id) || TZ_LIST[0];
}
function getSavedTz() {
  try {
    const saved = localStorage.getItem(TZ_STORAGE_KEY);
    return findTz(saved).zone;
  } catch {
    return TZ_LIST[0].zone;
  }
}
function blurActiveInput() {
  const el = document.activeElement;
  if (el && typeof el.blur === "function" && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
    el.blur();
  }
}

function dismissKeyboard() {
  blurActiveInput();
  Keyboard.hide().catch(() => {});
}

let activeDaysInput = null;
let daysKeyboardHeight = 0;

function setDaysKeyboardShift(keyboardHeight) {
  const shell = document.querySelector(".app-shell");
  if (!shell || !activeDaysInput || document.activeElement !== activeDaysInput) return;

  const currentShift = Number(shell.dataset.keyboardShift || 0);
  const inputBottom = activeDaysInput.getBoundingClientRect().bottom + currentShift;
  const keyboardTop = window.innerHeight - keyboardHeight;
  const nextShift = Math.max(0, Math.round(inputBottom - keyboardTop + 16));

  shell.dataset.keyboardShift = String(nextShift);
  shell.style.transform = `translate3d(0, -${nextShift}px, 0)`;
}

function clearDaysKeyboardShift() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  shell.dataset.keyboardShift = "0";
  shell.style.transform = "translate3d(0, 0, 0)";
}

function handleDaysInputFocus(event) {
  activeDaysInput = event.currentTarget;
  if (daysKeyboardHeight > 0) {
    window.requestAnimationFrame(() => setDaysKeyboardShift(daysKeyboardHeight));
  }
}
function handleDaysInputBlur(event) {
  const input = event.currentTarget;
  window.setTimeout(() => {
    if (activeDaysInput === input) {
      activeDaysInput = null;
      clearDaysKeyboardShift();
    }
  }, 120);
}
const PARTS_FORMATTERS = new Map();
const WEEKDAY_FORMATTERS = new Map();
const TIME_FORMATTERS = new Map();
const UTC_OFFSET_CACHE = new Map();

function getPartsFormatter(timeZone) {
  if (!PARTS_FORMATTERS.has(timeZone)) {
    PARTS_FORMATTERS.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit", second:"2-digit"
    }));
  }
  return PARTS_FORMATTERS.get(timeZone);
}
function getPartsInZone(date, timeZone) {
  const parts = getPartsFormatter(timeZone).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type, Number(p.value)]));
}
function getOffsetMs(date, timeZone) {
  const p = getPartsInZone(date, timeZone);
  return Date.UTC(p.year, p.month-1, p.day, p.hour, p.minute, p.second) - date.getTime();
}
function zonedDateToUtc(y, mo, d, h, m, timeZone) {
  let utc = Date.UTC(y, mo, d, h, m, 0, 0);
  for (let i=0; i<3; i++) utc = Date.UTC(y, mo, d, h, m, 0, 0) - getOffsetMs(new Date(utc), timeZone);
  return utc;
}
const fmtDateCompact = (day, month, year) => `${pad(day)} ${MON3[month]} ${String(year).slice(2)}`;
function fmt29MARZone(date, timeZone="UTC") {
  if (!date||isNaN(date)) return "—";
  const p = getPartsInZone(date, timeZone);
  if (!WEEKDAY_FORMATTERS.has(timeZone)) {
    WEEKDAY_FORMATTERS.set(timeZone, new Intl.DateTimeFormat("en-US", {timeZone, weekday:"short"}));
  }
  const dow = WEEKDAY_FORMATTERS.get(timeZone).format(date).toUpperCase();
  return `${fmtDateCompact(p.day, p.month-1, p.year)} (${dow})`;
}
function fmtTimeZone(date, timeZone) {
  if (!TIME_FORMATTERS.has(timeZone)) {
    TIME_FORMATTERS.set(timeZone, new Intl.DateTimeFormat("en-GB", {
      timeZone, hourCycle:"h23", hour:"2-digit", minute:"2-digit", second:"2-digit"
    }));
  }
  return TIME_FORMATTERS.get(timeZone).format(date);
}
function fmtUtcOffset(date, timeZone) {
  const minuteKey = Math.floor(date.getTime() / 60000);
  const cached = UTC_OFFSET_CACHE.get(timeZone);
  if (cached?.minuteKey === minuteKey) return cached.value;
  const mins = Math.round(getOffsetMs(date, timeZone) / 60000);
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const value = `UTC${sign}${h}${m ? `:${pad(m)}` : ""}`;
  UTC_OFFSET_CACHE.set(timeZone, {minuteKey, value});
  return value;
}
function TimeText({ value, active, color }) {
  const [hh="--", mm="--", ss="--"] = String(value || "--:--:--").split(":");
  const c = active ? color : "#CCC";
  const cell = { display:"inline-flex", justifyContent:"center", width:14 };
  const colon = { display:"inline-flex", justifyContent:"center", width:5 };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", width:60, marginLeft:4, color:c, fontSize:12, fontWeight:800, lineHeight:"18px", fontVariantNumeric:"tabular-nums" }}>
      <span style={cell}>{hh}</span><span style={colon}>:</span><span style={cell}>{mm}</span><span style={colon}>:</span><span style={cell}>{ss}</span>
    </span>
  );
}

// Returns {utc, local} due dates. Custom dates use the chosen timezone's 23:59 cutoff.
function calcDuePair(type, customDays, useCustom, customDateStr, localZone="Asia/Seoul", customTz="UTC") {
  const daysMap = {A: parseInt(customDays)||0, B:3, C:10, D:120, MOI:240};

  let utcBaseMs, localBaseMs;
  if (useCustom && customDateStr) {
    const parts = customDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return {utc:null, local:null};
    const y=parseInt(parts[1]), mo=parseInt(parts[2])-1, d=parseInt(parts[3]);
    const baseMs = customTz === "UTC"
      ? Date.UTC(y, mo, d, 23, 59, 0, 0)
      : zonedDateToUtc(y, mo, d, 23, 59, localZone);
    utcBaseMs = baseMs;
    localBaseMs = baseMs;
  } else {
    const now = new Date();
    const utcY=now.getUTCFullYear(), utcMo=now.getUTCMonth(), utcD=now.getUTCDate();
    const local = getPartsInZone(now, localZone);
    utcBaseMs = Date.UTC(utcY, utcMo, utcD, 23, 59, 0, 0);
    localBaseMs = zonedDateToUtc(local.year, local.month-1, local.day, 23, 59, localZone);
  }

  function applyType(baseMs) {
    const d = new Date(baseMs);
    if (type === "NEF") {
      d.setUTCFullYear(d.getUTCFullYear() + 2);
    } else {
      const days = daysMap[type] ?? 0;
      d.setUTCDate(d.getUTCDate() + days);
    }
    return d;
  }

  return { utc: applyType(utcBaseMs), local: applyType(localBaseMs) };
}
function fmt29MAR(date) {
  if (!date||isNaN(date)) return "—";
  return `${fmtDateCompact(date.getUTCDate(), date.getUTCMonth(), date.getUTCFullYear())} (${DOW_EN[date.getUTCDay()]})`;
}

function DueResult({ dueUTC, dueLocal, tzActive, accent, label, selectedTz, customTzMode=null }) {
  if (!dueUTC && !dueLocal) return null;
  const tz = findTz(selectedTz);
  const showUTC = customTzMode ? customTzMode === "UTC" : tzActive.UTC;
  const showLocal = customTzMode ? customTzMode !== "UTC" : tzActive.KST;
  return (
    <div style={{ marginTop:20 }}>
      <div style={{ fontSize:18, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.02em", marginBottom:6 }}>DUE DATE</div>
      <div style={{ background:"#fff", border:"1.5px solid #E8E8E8", borderLeft:`4px solid ${accent}`, borderRadius:"0 12px 12px 0", padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
        {label && <div style={{ fontSize:9, fontWeight:800, color:accent, letterSpacing:"0.12em", marginBottom:8 }}>{label}</div>}
        {showUTC && dueUTC && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:showLocal && dueLocal ? 7 : 0 }}>
            <span style={{ ...TZ_BADGE_FIXED, fontSize:11, background:APP_RED_BG, border:"1.5px solid #9B233566", color:APP_MUTED_RED, padding:"1px 7px", borderRadius:5, fontWeight:800, flexShrink:0, lineHeight:"18px" }}>🇬🇧 UTC</span>
            <span style={{ fontSize:18, fontWeight:700, color:TEXT_BLACK, lineHeight:"22px" }}>{fmt29MAR(dueUTC)}</span>
            </div>
        )}
        {showLocal && dueLocal && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ ...TZ_BADGE_FIXED, fontSize:11, background:APP_BLUE_BG, border:"1.5px solid #1E40AF66", color:APP_MUTED_BLUE, padding:"1px 7px", borderRadius:5, fontWeight:800, flexShrink:0, lineHeight:"18px" }}>{tz.flag} {tz.label}</span>
            <span style={{ fontSize:18, fontWeight:700, color:TEXT_BLACK, lineHeight:"22px" }}>{fmt29MARZone(dueLocal, tz.zone)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ tzActive, setTzActive, selectedTz, setSelectedTz, onTitleClick, onMenuClick }) {
  const [,tick]=useState(0);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const tzPickerRef = useRef(null);
  useEffect(()=>{ const iv=setInterval(()=>tick(n=>n+1),1000); return ()=>clearInterval(iv); },[]);
  useEffect(()=>{
    if (!showTzPicker) return;
    const closeOnOutside = (e) => {
      if (tzPickerRef.current && !tzPickerRef.current.contains(e.target)) {
        setShowTzPicker(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [showTzPicker]);
  const now=new Date();
  const fmtU=(d)=>`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const tz = findTz(selectedTz);
  const normalizedTzSearch = tzSearch.trim().toLowerCase();
  const visibleTzList = normalizedTzSearch
    ? TZ_LIST.filter(t => matchesTzSearch(t, normalizedTzSearch))
    : TZ_LIST;

  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #EAEAEA", padding:"8px 2px 8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
        <button onClick={onMenuClick} aria-label="Open menu"
          style={{ width:30, height:30, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, background:"transparent", border:"none", cursor:"pointer", padding:0, flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
          <span style={{ width:20, height:2, background:TEXT_BLACK, borderRadius:2 }} />
          <span style={{ width:20, height:2, background:TEXT_BLACK, borderRadius:2 }} />
          <span style={{ width:20, height:2, background:TEXT_BLACK, borderRadius:2 }} />
        </button>
        <button onClick={onTitleClick}
          style={{ background:"transparent", border:"none", padding:0, fontSize:24, fontWeight:800, color:TEXT_BLACK, letterSpacing:"0.01em", cursor:"pointer", fontFamily:"inherit", textAlign:"left", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          Maint Tool
        </button>
      </div>

      <div ref={tzPickerRef} style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, position:"relative", flexShrink:0 }}>
        {/* UTC row */}
        <div style={{ display:"flex", alignItems:"center" }}>
          <div style={{ width:55, display:"flex", justifyContent:"flex-end" }}>
            <button onClick={()=>setTzActive(prev=>{ const n={...prev,UTC:!prev.UTC}; return (!n.UTC&&!prev.KST)?prev:n; })}
              style={{ width:55, boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center", background:tzActive.UTC?APP_RED_BG:"#F0F0F0", border:`1.5px solid ${tzActive.UTC?"#9B233566":"#DDD"}`, borderRadius:5, padding:"1px 7px", fontSize:11, fontWeight:800, color:tzActive.UTC?APP_MUTED_RED:"#BBB", cursor:"pointer", lineHeight:"18px" }}>
              <span style={{marginRight:2,fontSize:11}}>🇬🇧</span>UTC
            </button>
          </div>
          <TimeText value={tzActive.UTC?fmtU(now):"--:--:--"} active={tzActive.UTC} color={APP_MUTED_RED} />
        </div>

        {/* Local TZ row */}
        <div style={{ display:"flex", alignItems:"center" }}>
          <div style={{ width:55, display:"flex", justifyContent:"flex-end", gap:2 }}>
            <button onClick={()=>{ setTzSearch(""); setShowTzPicker(v=>!v); }}
              style={{ height:22, boxSizing:"border-box", background:"#F8F8F8", border:"1px solid #E0E0E0", borderRadius:5, padding:"0 5px", fontSize:9, cursor:"pointer", lineHeight:1, color:"#555", display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
              <span style={{ fontSize:10, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>{tz.flag}</span>
              <span style={{ fontSize:7, lineHeight:1, color:"#AAA", display:"flex", alignItems:"center", justifyContent:"center" }}>▼</span>
            </button>
            <button onClick={()=>setTzActive(prev=>{ const n={...prev,KST:!prev.KST}; return (!prev.UTC&&!n.KST)?prev:n; })}
              style={{ width:55, minWidth:55, height:22, flexShrink:0, boxSizing:"border-box", background:tzActive.KST?APP_BLUE_BG:"#F0F0F0", border:`1.5px solid ${tzActive.KST?"#1E40AF66":"#DDD"}`, borderRadius:5, padding:"0 7px", fontSize:11, fontWeight:800, color:tzActive.KST?APP_MUTED_BLUE:"#BBB", cursor:"pointer", lineHeight:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ marginRight:2, fontSize:11, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>{tz.flag}</span><span style={{ lineHeight:1 }}>{tz.label}</span>
            </button>
          </div>
          <TimeText value={tzActive.KST?fmtTimeZone(now, tz.zone):"--:--:--"} active={tzActive.KST} color={APP_MUTED_BLUE} />
        </div>

        {/* Timezone picker dropdown */}
        {showTzPicker && (
          <div style={{ position:"absolute", top:"100%", right:0, marginTop:4, background:"#fff", border:"1.5px solid #E8E8E8", borderRadius:12, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", zIndex:200, minWidth:280, maxHeight:460, overflowY:"auto" }}>
            <div style={{ position:"sticky", top:0, background:"#fff", zIndex:1, padding:"10px", borderBottom:"1px solid #F0F0F0" }}>
              <input
                className="tz-search-input"
                value={tzSearch}
                onChange={e=>setTzSearch(e.target.value.toUpperCase())}
                placeholder="Search Country or Airport"
                style={{ width:"100%", border:"1.5px solid #E5E7EB", borderRadius:8, padding:"10px 12px", fontSize:14, color:TEXT_BLACK, outline:"none", fontFamily:"inherit" }}
              />
            </div>
            {visibleTzList.length === 0 && (
              <div style={{ padding:"16px 14px", fontSize:13, color:TEXT_MUTED, textAlign:"center" }}>No country found</div>
            )}
            {visibleTzList.map((t,i)=>(
              <button key={t.zone} onClick={()=>{ setSelectedTz(t.zone); setShowTzPicker(false); }}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 14px", background: findTz(selectedTz).zone===t.zone?APP_BLUE_BG:"transparent", border:"none", borderBottom:"1px solid #F5F5F5", cursor:"pointer", textAlign:"left" }}>
                <span style={{fontSize:19}}>{t.flag}</span>
                <span style={{fontSize:14, fontWeight:600, color:APP_MUTED_BLUE, minWidth:42}}>{t.label}</span>
                <span style={{fontSize:13, color:TEXT_MUTED}}>{t.name}</span>
                <span style={{fontSize:11, lineHeight:1, color:"#CCC", marginLeft:"auto"}}>{fmtUtcOffset(now, t.zone)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const IS={ width:"100%", boxSizing:"border-box", background:"#F8F9FA", border:"1.5px solid #E8E8E8", borderRadius:9, padding:"11px 14px", color:TEXT_BLACK, fontSize:16, outline:"none", fontFamily:"inherit" };
const TZ_BADGE_FIXED = { width:55, boxSizing:"border-box", display:"inline-flex", alignItems:"center", justifyContent:"center", whiteSpace:"nowrap" };

const NEUTRAL_ACCENT = { color:TEXT_BLACK, bg:"#FFFFFF", border:TEXT_BLACK };
const MEL_CATS={
  A:{...NEUTRAL_ACCENT, days:null,  short:"Specified"},
  B:{...NEUTRAL_ACCENT, days:3,     short:"3 Days"},
  C:{...NEUTRAL_ACCENT, days:10,    short:"10 Days"},
  D:{...NEUTRAL_ACCENT, days:120,   short:"120 Days"},
};
const MEL_DESC={ A:"Specified Period", B:"3 Calendar Days", C:"10 Calendar Days", D:"120 Calendar Days" };



// ─── Year/Month Drum ──────────────────────────────────────────────────────────
const YM_ITEM_H = 26;
const YM_VISIBLE = 5;
const YM_HALF = Math.floor(YM_VISIBLE / 2);

function DrumYM({ values, selected, onSelect, width=90, ariaLabel="Picker wheel" }) {
  const ref = useRef(null);
  const ticking = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = selected * YM_ITEM_H;
  }, [selected]);

  const handleScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        const idx = Math.round(el.scrollTop / YM_ITEM_H);
        onSelect(Math.max(0, Math.min(values.length - 1, idx)));
      }
      ticking.current = false;
    });
  };

  return (
    <div style={{ position:"relative", width, height: YM_ITEM_H * YM_VISIBLE, overflow:"hidden", touchAction:"pan-y" }}>
      <div style={{ position:"absolute", top: YM_ITEM_H * YM_HALF, left:4, right:4, height: YM_ITEM_H, background:"rgba(44,62,107,0.08)", border:"1px solid #C8D4E8", borderRadius:8, pointerEvents:"none", zIndex:1 }} />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(250,250,252,1) 0%, rgba(250,250,252,0.6) 25%, transparent 42%, transparent 58%, rgba(250,250,252,0.6) 75%, rgba(250,250,252,1) 100%)", pointerEvents:"none", zIndex:2 }} />
      <div ref={ref} onScroll={handleScroll} role="listbox" aria-label={ariaLabel}
        style={{ height:"100%", overflowY:"scroll", scrollSnapType:"y mandatory", WebkitOverflowScrolling:"auto", overscrollBehavior:"contain", scrollbarWidth:"none", msOverflowStyle:"none", touchAction:"pan-y" }}>
        <div style={{ height: YM_ITEM_H * YM_HALF }} />
        {values.map((v, i) => {
          const dist = Math.abs(i - selected);
          return (
            <div key={i}
              role="option"
              aria-selected={i===selected}
              onClick={()=>{ if(ref.current) ref.current.scrollTop=i*YM_ITEM_H; onSelect(i); }}
              style={{ height: YM_ITEM_H, display:"flex", alignItems:"center", justifyContent:"center", scrollSnapAlign:"center", scrollSnapStop:"always",
                fontSize: dist===0?20:dist===1?16:13, fontWeight: dist===0?700:400,
                color: dist===0?TEXT_BLACK:TEXT_MUTED, opacity: dist===0?1:dist===1?0.65:0.3,
                position:"relative", zIndex:3, cursor:"pointer", userSelect:"none" }}>
              {v}
            </div>
          );
        })}
        <div style={{ height: YM_ITEM_H * YM_HALF }} />
      </div>
    </div>
  );
}


// ─── Custom Date Picker ───────────────────────────────────────────────────────
function CustomDatePicker({ value, onChange }) {
  const parse = (v) => {
    if (!v) { const n=new Date(); return {y:n.getFullYear(),mo:n.getMonth(),d:n.getDate()}; }
    const [datePart] = v.split("T");
    const [y,mo,d] = datePart.split("-").map(Number);
    return {y, mo:mo-1, d};
  };
  const fmt = ({y,mo,d}) => `${y}-${pad(mo+1)}-${pad(d)}T00:00`;
  const initial = parse(value);
  const [selected, setSelected] = useState(initial);
  const [view, setView] = useState({ y:initial.y, mo:initial.mo });
  const [showMonthYearWheel, setShowMonthYearWheel] = useState(false);
  const allYears = Array.from({length: 2100 - 2000 + 1}, (_,i) => 2000 + i);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekDays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const today = new Date();
  const monthStart = new Date(view.y, view.mo, 1);
  const firstCell = new Date(view.y, view.mo, 1 - monthStart.getDay());
  const daysInViewMonth = new Date(view.y, view.mo + 1, 0).getDate();
  const calendarCellCount = Math.ceil((monthStart.getDay() + daysInViewMonth) / 7) * 7;
  const calendarDays = Array.from({length:calendarCellCount}, (_,i) => {
    const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + i);
    return { y:date.getFullYear(), mo:date.getMonth(), d:date.getDate() };
  });
  const isSameDate = (a,b) => a.y===b.y && a.mo===b.mo && a.d===b.d;
  const minReached = view.y===2000 && view.mo===0;
  const maxReached = view.y===2100 && view.mo===11;

  useEffect(() => {
    const next = parse(value);
    setSelected(next);
    setView({ y:next.y, mo:next.mo });
  }, [value]);

  const moveMonth = (amount) => {
    setShowMonthYearWheel(false);
    const next = new Date(view.y, view.mo + amount, 1);
    const y = Math.min(2100, Math.max(2000, next.getFullYear()));
    const mo = y===2000 && next.getFullYear()<2000 ? 0 : y===2100 && next.getFullYear()>2100 ? 11 : next.getMonth();
    setView({ y, mo });
  };

  const chooseDate = (next) => {
    setShowMonthYearWheel(false);
    setSelected(next);
    setView({ y:next.y, mo:next.mo });
    onChange(fmt(next));
  };

  return (
    <div
      aria-label="Calendar date picker"
      style={{ position:"relative", background:"#FFFFFF", border:"1px solid rgba(60,60,67,0.16)", borderRadius:18, padding:"9px 10px 10px", overflow:"hidden", boxShadow:"0 10px 26px rgba(0,0,0,0.10), 0 2px 5px rgba(0,0,0,0.05)" }}
    >
      <div style={{ display:"grid", gridTemplateColumns:"36px minmax(0,1fr) 36px", alignItems:"center", gap:6, marginBottom:6 }}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={minReached}
          onClick={()=>moveMonth(-1)}
          style={{ width:36, height:36, border:"none", borderRadius:11, background:"#F2F2F7", color:minReached?"#C7C7CC":TEXT_BLACK, display:"grid", placeItems:"center", cursor:minReached?"default":"pointer", outline:"none" }}
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <button
          type="button"
          aria-label="Choose month and year"
          aria-expanded={showMonthYearWheel}
          aria-controls="month-year-wheel"
          onClick={()=>setShowMonthYearWheel(open=>!open)}
          style={{ justifySelf:"center", minWidth:164, height:36, padding:"0 12px", border:"1px solid rgba(60,60,67,0.18)", borderRadius:11, background:"#F2F2F7", color:TEXT_BLACK, display:"flex", alignItems:"center", justifyContent:"center", gap:9, fontSize:15, fontWeight:700, fontFamily:"inherit", outline:"none", cursor:"pointer" }}
        >
          <span style={{ minWidth:112, textAlign:"center" }}>{months[view.mo]} {view.y}</span>
          <CaretDown size={17} weight="bold" style={{ color:TEXT_BLACK, flexShrink:0, transform:showMonthYearWheel?"rotate(180deg)":"none", transition:"transform 160ms ease" }} />
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={maxReached}
          onClick={()=>moveMonth(1)}
          style={{ width:36, height:36, border:"none", borderRadius:11, background:"#F2F2F7", color:maxReached?"#C7C7CC":TEXT_BLACK, display:"grid", placeItems:"center", cursor:maxReached?"default":"pointer", outline:"none" }}
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>
      {showMonthYearWheel && (
        <>
          <button
            type="button"
            aria-label="Close month and year picker"
            onClick={()=>setShowMonthYearWheel(false)}
            style={{ position:"absolute", inset:"51px 0 0", zIndex:8, border:"none", background:"rgba(255,255,255,0.62)", cursor:"default" }}
          />
          <div
            id="month-year-wheel"
            role="dialog"
            aria-label="Month and year wheel"
            style={{ position:"absolute", zIndex:9, top:51, left:"50%", transform:"translateX(-50%)", width:272, background:"#FAFAFC", border:"1px solid rgba(60,60,67,0.18)", borderRadius:16, padding:"8px 8px 10px", boxShadow:"0 14px 34px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display:"grid", gridTemplateColumns:"1.35fr 0.9fr", gap:6 }}>
              <div>
                <div style={{ textAlign:"center", color:"#8E8E93", fontSize:9, fontWeight:800, letterSpacing:"0.12em", marginBottom:2 }}>MONTH</div>
                <DrumYM ariaLabel="Month wheel" values={months} selected={view.mo} onSelect={mo=>setView(current=>({...current,mo}))} width="100%" />
              </div>
              <div>
                <div style={{ textAlign:"center", color:"#8E8E93", fontSize:9, fontWeight:800, letterSpacing:"0.12em", marginBottom:2 }}>YEAR</div>
                <DrumYM ariaLabel="Year wheel" values={allYears} selected={Math.max(0, allYears.indexOf(view.y))} onSelect={i=>setView(current=>({...current,y:allYears[i]}))} width="100%" />
              </div>
            </div>
            <button
              type="button"
              onClick={()=>setShowMonthYearWheel(false)}
              style={{ width:"100%", height:32, marginTop:6, border:"none", borderRadius:9, background:APP_BLUE_BG, color:APP_MUTED_BLUE, fontSize:12, fontWeight:800, letterSpacing:"0.06em", cursor:"pointer" }}
            >
              DONE
            </button>
          </div>
        </>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0,1fr))", marginBottom:3 }}>
        {weekDays.map((day,i)=>(
          <div key={day} style={{ height:20, display:"grid", placeItems:"center", color:i===0?APP_MUTED_RED:i===6?APP_MUTED_BLUE:"#8E8E93", fontSize:9, fontWeight:800, letterSpacing:"0.04em" }}>
            {day}
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0,1fr))", rowGap:0 }}>
        {calendarDays.map((day,i)=>{
          const active = isSameDate(day, selected);
          const isToday = isSameDate(day, {y:today.getFullYear(),mo:today.getMonth(),d:today.getDate()});
          const inMonth = day.y===view.y && day.mo===view.mo;
          return (
            <button
              key={`${day.y}-${day.mo}-${day.d}-${i}`}
              type="button"
              aria-label={`Select ${months[day.mo]} ${day.d}, ${day.y}`}
              aria-pressed={active}
              onClick={()=>chooseDate(day)}
              style={{ width:31, height:31, justifySelf:"center", border:active?"none":isToday?`1.5px solid ${APP_MUTED_BLUE}`:"1.5px solid transparent", borderRadius:8, background:active?TEXT_BLACK:"transparent", color:active?"#FFFFFF":inMonth?(day.mo===view.mo?(new Date(day.y,day.mo,day.d).getDay()===0?APP_MUTED_RED:new Date(day.y,day.mo,day.d).getDay()===6?APP_MUTED_BLUE:TEXT_BLACK):TEXT_BLACK):"#C7C7CC", fontSize:14, fontWeight:active||isToday?700:500, fontFamily:"inherit", cursor:"pointer", padding:0, outline:"none" }}
            >
              {day.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateInput({useCustom,setUseCustom,customDate,setCustomDate,customTz,setCustomTz,tzActive,selectedTz,tzOffset}) {
  const [inputTz, setInputTz] = useState(customTz || "UTC");
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(customDate);
  const pickerRef = useRef(null);
  const utcTodayFmt = () => {
    const n=new Date();
    return `${fmtDateCompact(n.getUTCDate(), n.getUTCMonth(), n.getUTCFullYear())} (${DOW_EN[n.getUTCDay()]})`;
  };
  const localTodayFmt = () => fmt29MARZone(new Date(), tzOffset?.zone || "Asia/Seoul");
  useEffect(() => {
    if (!showPicker) return;
    const frame = window.requestAnimationFrame(() => {
      const picker = pickerRef.current;
      const panel = picker?.closest(".tab-panel");
      if (!picker || !panel) return;
      const overflow = picker.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom + 12;
      if (overflow > 0) {
        panel.scrollTo({ top:panel.scrollTop + overflow, behavior:"smooth" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showPicker]);
  return (
    <div style={{ marginBottom:22, marginTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
        <div style={{ fontSize:14, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.03em" }}>START DATE</div>
        <div style={{ fontSize:14, color:TEXT_MUTED, margin:"0 1px" }}>—</div>
        <div style={{ fontSize:14, fontWeight:700, color:TEXT_BLACK }}>{useCustom ? "CUSTOM" : "TODAY"}</div>
        <button onClick={()=>{
          blurActiveInput();
          if(useCustom){ setUseCustom(false); setShowPicker(false); }
          else { setUseCustom(true); setTempDate(customDate); setShowPicker(true); }
        }} style={{ background:"#F0F0F0", border:"1px solid #D8D8DC", borderRadius:5, padding:"2px 8px", fontSize:10, color:TEXT_MUTED, cursor:"pointer", fontWeight:600, marginLeft:4, outline:"none", boxShadow:"0 2px 5px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04)" }}>
          {useCustom ? "TODAY" : "EDIT"}
        </button>
      </div>
      {/* Always show date display box */}
      <div
        style={{...IS, background:"#F9F9F9", cursor: useCustom ? "pointer" : "default", fontSize:13, padding:"11px 14px"}}
        onClick={()=>{ if(useCustom && !showPicker){ blurActiveInput(); setTempDate(customDate); setShowPicker(true); } }}
      >
        {!useCustom ? (
          <>
            {tzActive.UTC && <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3 }}><span style={{ ...TZ_BADGE_FIXED, fontSize:11, background:APP_RED_BG, border:"1.5px solid #9B233566", color:APP_MUTED_RED, padding:"1px 7px", borderRadius:5, fontWeight:800, lineHeight:"18px" }}>🇬🇧 UTC</span><span style={{ color:TEXT_MUTED, fontSize:14 }}>{utcTodayFmt()}</span></div>}
            {tzActive.KST && <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ ...TZ_BADGE_FIXED, fontSize:11, background:APP_BLUE_BG, border:"1.5px solid #1E40AF66", color:APP_MUTED_BLUE, padding:"1px 7px", borderRadius:5, fontWeight:800, lineHeight:"18px" }}>{tzOffset?.flag || "🇰🇷"} {tzOffset?.label || "KST"}</span><span style={{ color:TEXT_MUTED, fontSize:14 }}>{localTodayFmt()}</span></div>}
          </>
        ) : (
          <div style={{ color:TEXT_BLACK, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ ...TZ_BADGE_FIXED, fontSize:11, background:customTz==="UTC"?APP_RED_BG:APP_BLUE_BG, border:`1.5px solid ${customTz==="UTC"?"#9B233566":"#1E40AF66"}`, color:customTz==="UTC"?APP_MUTED_RED:APP_MUTED_BLUE, padding:"1px 7px", borderRadius:5, fontWeight:800, flexShrink:0, lineHeight:"18px" }}>{customTz==="UTC" ? "🇬🇧" : (tzOffset?.flag || "🇰🇷")} {customTz}</span>
              {customDate ? (()=>{
                const dt = customDate.split("T")[0];
                const [y,mo,d] = dt.split("-");
                const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][parseInt(mo)-1];
                return `${d} ${mon} ${y.slice(2)}`;
              })() : "Select date..."}
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}>
              {showPicker
                ? <polyline points="2,10 7,4 12,10" stroke="#AAAAAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                : <polyline points="2,4 7,10 12,4" stroke="#AAAAAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </div>
        )}
      </div>

      {/* Picker — shown only when editing */}
      {useCustom && showPicker && (
        <div ref={pickerRef} style={{ marginTop:6 }}>
          {/* TZ selector */}
          <div style={{ display:"flex", gap:6, marginBottom:6 }}>
            {["UTC", tzOffset?.label || "KST"].map(tz => (
              <button key={tz} data-testid={`custom-tz-${tz}`} onClick={()=>{ setInputTz(tz); setCustomTz(tz); }}
                style={{ flex:1, padding:"11px 8px", background:inputTz===tz?(tz==="UTC"?APP_RED_BG:APP_BLUE_BG):"#F0F0F0", border:`1.5px solid ${inputTz===tz?(tz==="UTC"?APP_MUTED_RED:APP_MUTED_BLUE):"#E0E0E0"}`, borderRadius:7, fontSize:13, fontWeight:700, color:inputTz===tz?(tz==="UTC"?APP_MUTED_RED:APP_MUTED_BLUE):TEXT_MUTED, cursor:"pointer" }}>
                {tz==="UTC" ? "🇬🇧 UTC" : `${tzOffset?.flag||"🇰🇷"} ${tz}`}
              </button>
            ))}
          </div>
          <CustomDatePicker value={tempDate} onChange={setTempDate} />
          <button onClick={()=>{ setCustomDate(tempDate); setCustomTz(inputTz); setShowPicker(false); }}
            style={{ width:"100%", marginTop:6, padding:"8px", background:TEXT_BLACK, border:"1.5px solid #1C1C1E", borderRadius:9, fontSize:13, fontWeight:700, color:"#FFFFFF", cursor:"pointer", outline:"none", boxShadow:"0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)" }}>
            ✓  SET
          </button>
        </div>
      )}
    </div>
  );
}

function MelTab({tzActive, selectedTz, tzOffset}) {
  const [cat,setCat]=useState("C");
  const [customDays,setCustomDays]=useState("");
  const [useCustom,setUseCustom]=useState(false);
  const [customDate,setCustomDate]=useState(todayStr);
  const [customTz,setCustomTz]=useState("UTC");
  const pair=(cat==="A"&&!customDays)?{utc:null,local:null}:calcDuePair(cat,customDays,useCustom,customDate,tzOffset.zone,customTz);
  const r=MEL_CATS[cat];
  return (
    <div>
      {/* MEL header banner */}
      <div style={{ width:"100%", height:50, boxSizing:"border-box", background:r.bg, border:`1.5px solid ${r.border}`, borderRadius:12, padding:"0 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 2px 5px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(0,0,0,0.04)" }}>
        <span style={{ fontSize:22, fontWeight:800, color:r.color, letterSpacing:"0.04em" }}>MEL</span>
        <span style={{ fontSize:12, color:TEXT_BLACK, fontWeight:500 }}>{MEL_DESC[cat]}</span>
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:16, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.03em", marginBottom:8 }}>CATEGORY</div>
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(MEL_CATS).map(([c,rc])=>(
            <button key={c} onClick={()=>setCat(c)} style={{ flex:1, height:60, boxSizing:"border-box", padding:"4px", background:cat===c?rc.bg:"#F8F9FA", border:`1.5px solid ${cat===c?rc.border:"#E8E8E8"}`, borderRadius:10, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, transition:"all 0.15s", boxShadow:cat===c?"0 2px 5px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(0,0,0,0.04)":"none" }}>
              <span style={{ fontSize:28, fontWeight:800, color:cat===c?rc.color:"#D0D0D0" }}>{c}</span>
              <span style={{ fontSize:9, fontWeight:600, color:cat===c?rc.color:"#CCCCCC", letterSpacing:"0.03em" }}>{rc.short}</span>
            </button>
          ))}
        </div>
      </div>
      <DateInput useCustom={useCustom} setUseCustom={setUseCustom} customDate={customDate} setCustomDate={setCustomDate} customTz={customTz} setCustomTz={setCustomTz} tzActive={tzActive} selectedTz={selectedTz} tzOffset={tzOffset} />
      {cat==="A"&&(
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.03em", marginBottom:6 }}>+DAYS</div>
          <input className="days-input" type="number" min="1" inputMode="numeric" pattern="[0-9]*" style={{...IS, fontSize:13}} placeholder="Enter MEL specified days" value={customDays} onChange={e=>setCustomDays(e.target.value)} onFocus={handleDaysInputFocus} onBlur={handleDaysInputBlur} />
        </div>
      )}
      <DueResult dueUTC={pair.utc} dueLocal={pair.local} tzActive={tzActive} accent={r.color} selectedTz={selectedTz} customTzMode={useCustom ? customTz : null} />
    </div>
  );
}

function MoiNefTab({tzActive, selectedTz, tzOffset, onNameChange}) {
  const [useCustom,setUseCustom]=useState(false);
  const [customDate,setCustomDate]=useState(todayStr);
  const [calculatorConfig,setCalculatorConfig]=useState({nefMoiName:"NEF·MOI",nefMoiDays:240});
  const [pendingConfig,setPendingConfig]=useState({nefMoiName:"NEF·MOI",nefMoiDays:240});
  const [showCalculatorSetup,setShowCalculatorSetup]=useState(false);
  const [moiCustomTz, setMoiCustomTz]=useState("UTC");

  useEffect(()=>{ let mounted=true; localStore.calculatorSettings.get().then(saved=>{
    if(!mounted)return;
    const next={
      nefMoiName:String(saved?.nefMoiName||"NEF·MOI").trim()||"NEF·MOI",
      nefMoiDays:Math.max(0,Number.parseInt(saved?.nefMoiDays,10)||240),
    };
    setCalculatorConfig(next);
    setPendingConfig(next);
    onNameChange?.(next.nefMoiName);
  }); return()=>{mounted=false;}; },[]);

  const pair = calcDuePair("A", calculatorConfig.nefMoiDays, useCustom, customDate, tzOffset.zone, moiCustomTz);
  const saveCalculatorConfig=async()=>{
    const next={
      nefMoiName:String(pendingConfig.nefMoiName||"").trim()||"NEF·MOI",
      nefMoiDays:Math.max(0,Math.min(9999,Number.parseInt(pendingConfig.nefMoiDays,10)||0)),
    };
    setCalculatorConfig(next);
    setPendingConfig(next);
    onNameChange?.(next.nefMoiName);
    await localStore.calculatorSettings.set(next);
    setShowCalculatorSetup(false);
  };

  return (
    <div>
      <div className={`nef-config-card ${showCalculatorSetup?"open":""}`}>
        <button className="nef-config-summary" onClick={()=>{
          if(!showCalculatorSetup)setPendingConfig(calculatorConfig);
          setShowCalculatorSetup(value=>!value);
        }} aria-expanded={showCalculatorSetup} aria-label="Customize NEF MOI calculator">
          <span className="nef-config-name">{calculatorConfig.nefMoiName}</span>
          <span className="nef-config-days">{calculatorConfig.nefMoiDays.toLocaleString()} Calendar Days</span>
          {showCalculatorSetup?<CaretUp size={21} weight="bold"/>:<CaretDown size={21} weight="bold"/>}
        </button>
        {showCalculatorSetup&&<div className="nef-config-editor">
          <label><span>DISPLAY NAME</span><input value={pendingConfig.nefMoiName} onChange={event=>setPendingConfig(value=>({...value,nefMoiName:event.target.value}))} maxLength={18}/></label>
          <label><span>DEFAULT DAYS</span><div className="nef-days-input"><input type="number" min="0" max="9999" inputMode="numeric" value={pendingConfig.nefMoiDays} onChange={event=>setPendingConfig(value=>({...value,nefMoiDays:event.target.value}))}/><small>Calendar Days</small></div></label>
          <div className="nef-config-note">Keeps this setup when the app opens.</div>
          <div className="nef-config-actions"><button onClick={()=>{setPendingConfig(calculatorConfig);setShowCalculatorSetup(false);}}>Cancel</button><button className="primary" onClick={saveCalculatorConfig}>Save</button></div>
        </div>}
      </div>

      <DateInput useCustom={useCustom} setUseCustom={setUseCustom} customDate={customDate} setCustomDate={setCustomDate} customTz={moiCustomTz} setCustomTz={setMoiCustomTz} tzActive={tzActive} selectedTz={selectedTz} tzOffset={tzOffset} />

      {/* Single unified DUE DATE result */}
      <DueResult dueUTC={pair.utc} dueLocal={pair.local} tzActive={tzActive} accent={NEUTRAL_ACCENT.color} selectedTz={selectedTz} customTzMode={useCustom ? moiCustomTz : null} />
    </div>
  );
}

// ─── A/C Time Calculator ──────────────────────────────────────────────────────
function tMins({h,m}){ return h*60+m; }
function toHM(tm){ const neg=tm<0,abs=Math.abs(Math.round(tm)); return {h:Math.floor(abs/60),m:abs%60,neg}; }

const CALC_BLUE = APP_MUTED_BLUE;
const CALC_BLUE_MUTED = "#8799BC";
const CALC_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";
const CALC_FONT_WEIGHT = 700;
const CALC_HISTORY_FONT_WEIGHT = 400;
function fmtNum(value) {
  return parseFloat(Number(value).toFixed(10)).toLocaleString(undefined,{maximumFractionDigits:10});
}
function toSup(n) {
  const map = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻"};
  return String(n).split("").map(ch=>map[ch] ?? ch).join("");
}
function fmtHMStr({h,m,neg}){ return `${neg?"-":""}${h.toLocaleString()}hour ${pad(m)}min`; }
function fmtLengthStr({value,unit,dim=1,neg}) {
  return `${neg?"-":""}${fmtNum(Math.abs(value))}${unit}${dim>1?toSup(dim):""}`;
}
function fmtResultStr(result) {
  if (!result) return "";
  if (result.type==="scalar") return result.v.toLocaleString(undefined,{maximumFractionDigits:10});
  if (result.type==="length") return fmtLengthStr(result);
  return fmtHMStr(result);
}
function fmtHM({h,m,neg}) {
  return (
    <span>
      {neg && <span style={{color:"#DC2626"}}>-</span>}
      <span style={{fontWeight:CALC_FONT_WEIGHT}}>{h.toLocaleString()}</span>
      <span style={{color:CALC_BLUE,fontSize:"0.6em",fontWeight:CALC_FONT_WEIGHT,marginLeft:1}}>hour</span>
      <span style={{marginLeft:8,fontWeight:CALC_FONT_WEIGHT}}>{pad(m)}</span>
      <span style={{color:CALC_BLUE,fontSize:"0.6em",fontWeight:CALC_FONT_WEIGHT,marginLeft:1}}>min</span>
    </span>
  );
}
function fmtHMShort({h,m}){ return `${h.toLocaleString()}hour ${pad(m)}min`; }

function fmtRoundedValue(value) {
  return parseFloat(value.toFixed(4)).toLocaleString();
}
function fmtLength(value, unit) {
  return `${fmtRoundedValue(value)} ${unit}`;
}
function fmtUnitValue(value, unit) {
  return `${fmtRoundedValue(value)} ${unit}`;
}
function lengthValueFromBase(baseInch, unit) {
  if (unit === "inch") return baseInch;
  if (unit === "ft") return baseInch / 12;
  if (unit === "cm") return baseInch * 2.54;
  return baseInch;
}
function lengthFactorToInch(unit) {
  if (unit === "ft") return 12;
  if (unit === "cm") return 1 / 2.54;
  return 1;
}
function lengthValueFromBaseDim(base, unit, dim=1) {
  return base / Math.pow(lengthFactorToInch(unit), dim);
}
function makeLengthToken(value, unit) {
  return { type:"length", value, unit, dim:1, base: value * lengthFactorToInch(unit), display:`${value}${unit}` };
}
function timeValueFromBase(baseMin, unit) {
  return unit === "hour" ? baseMin / 60 : baseMin;
}
const LENGTH_CONVERSION_UNITS = ["inch", "ft", "cm"];
function orderedLengthConversionUnits(sourceUnit) {
  if (!LENGTH_CONVERSION_UNITS.includes(sourceUnit)) return LENGTH_CONVERSION_UNITS;
  return LENGTH_CONVERSION_UNITS.filter(unit => unit !== sourceUnit).concat(sourceUnit);
}
function makeLengthConversion(value, unit) {
  const baseInch = unit === "ft" ? value * 12 : value;
  const order = orderedLengthConversionUnits(unit);
  return { kind:"length", baseInch, unit:order[0], sourceUnit:unit };
}
function makeTimeConversion(baseMin, sourceUnit) {
  return { kind:"time", baseMin, unit:sourceUnit === "min" ? "hour" : "min" };
}
function advanceConversion(result) {
  if (!result) return null;
  if (result.kind === "length") {
    const order = orderedLengthConversionUnits(result.sourceUnit);
    const idx = order.indexOf(result.unit);
    return {...result, unit: order[(idx + 1) % order.length], sourceUnit:result.sourceUnit || result.unit};
  }
  if (result.kind === "time") {
    return {...result, unit: result.unit === "hour" ? "min" : "hour"};
  }
  return result;
}
function formatConvertResult(result) {
  if (!result) return "";
  if (result.kind === "length") {
    const order = orderedLengthConversionUnits(result.sourceUnit || result.unit);
    return order.map(unit => fmtUnitValue(lengthValueFromBase(result.baseInch, unit), unit)).join(" < ");
  }
  if (result.kind === "time") return fmtUnitValue(timeValueFromBase(result.baseMin, result.unit), result.unit);
  return fmtUnitValue(result.value, result.unit);
}
function standaloneConversionSheetFor(state) {
  if (state.tokens.length) return null;

  if (state.unitType !== null && state.unitValue !== null) {
    const baseInch = state.unitValue * lengthFactorToInch(state.unitType);
    const rows = [
      { value:fmtRoundedValue(baseInch / 12), unit:"ft" },
      { value:fmtRoundedValue(baseInch), unit:"inch" },
      { value:fmtRoundedValue(baseInch * 2.54), unit:"cm" },
    ].filter(row => row.unit !== state.unitType);
    return {
      kind:"length",
      source:`${fmtNum(state.unitValue)}${state.unitType}`,
      rows,
    };
  }

  if (state.hPart !== null) {
    const hours = parseInt(state.hPart) || 0;
    const minutes = parseInt(state.buffer) || 0;
    const baseMin = hours * 60 + minutes;
    const source = [
      hours ? `${hours.toLocaleString()}hour` : "",
      minutes || !hours ? `${minutes.toLocaleString()}min` : "",
    ].filter(Boolean).join(" ");
    const rows = hours
      ? [
          { value:fmtRoundedValue(baseMin), unit:"min" },
          { value:fmtRoundedValue(baseMin * 60), unit:"sec" },
          { value:fmtRoundedValue(baseMin * 60000), unit:"m.sec" },
        ]
      : [
          { value:`${Math.floor(baseMin/60)}hour ${pad(baseMin%60)}min`, unit:"" },
          { value:fmtRoundedValue(baseMin * 60), unit:"sec" },
          { value:fmtRoundedValue(baseMin * 60000), unit:"m.sec" },
        ];
    return { kind:"time", source, rows };
  }

  return null;
}
function conversionSheetHistoryItem(sheet) {
  if (!sheet) return null;
  return {
    expr:sheet.source,
    result:sheet.rows.map(row => `${row.value}${row.unit}`).join(" · "),
    kind:"convert",
  };
}
function conversionHistoryFor(state) {
  if (state.unitType==="inch" && state.unitValue!==null) {
    const next = makeLengthConversion(state.unitValue, "inch");
    return { expr:fmtLength(state.unitValue, "inch"), result:formatConvertResult(next), kind:"convert" };
  }
  if (state.unitType==="ft" && state.unitValue!==null) {
    const next = makeLengthConversion(state.unitValue, "ft");
    return { expr:fmtLength(state.unitValue, "ft"), result:formatConvertResult(next), kind:"convert" };
  }
  if (state.hPart!==null) {
    const baseMin = (parseInt(state.hPart)||0) * 60 + (parseInt(state.buffer)||0);
    const sourceUnit = state.hPart === 0 ? "min" : "hour";
    const next = makeTimeConversion(baseMin, sourceUnit);
    const from = sourceUnit === "min"
      ? `${parseInt(state.buffer)||0} min`
      : `${parseInt(state.hPart)||0} hour${state.buffer ? ` ${parseInt(state.buffer)||0} min` : ""}`;
    return { expr:from, result:formatConvertResult(next), kind:"convert" };
  }
  if (state.convertResult) {
    const next = advanceConversion(state.convertResult);
    return { expr:formatConvertResult(state.convertResult), result:formatConvertResult(next), kind:"convert" };
  }
  return null;
}
function convertResultToToken(result) {
  if (!result) return null;
  if (result.kind === "length") {
    const value = parseFloat(lengthValueFromBase(result.baseInch, result.unit).toFixed(10));
    return makeLengthToken(value, result.unit);
  }
  if (result.kind === "time") {
    const mins = Math.round(result.baseMin);
    return { type:"time", h:Math.floor(mins/60), m:mins%60 };
  }
  return null;
}

const initCalc = () => ({
  tokens:[], buffer:"", hPart:null,
  unitType:null, unitValue:null,
  pendingOp:null, result:null, isResult:false, convertResult:null, minExplicit:false,
});

function finalizeEntry(buffer, hPart, pendingOp) {
  if (hPart !== null) return { type:"time", h:hPart, m:parseInt(buffer)||0 };
  if (buffer !== "") {
    const n = parseFloat(buffer);
    const isPercent = buffer.endsWith("%");
    // Treat plain numbers as scalar values unless hour is explicitly selected.
    return { type:"scalar", v:isNaN(n)?0:(isPercent?n/100:n), display:buffer };
  }
  return null;
}
function finalizeStateEntry(state) {
  if (state.unitType !== null && state.unitValue !== null) {
    return makeLengthToken(state.unitValue, state.unitType);
  }
  return finalizeEntry(state.buffer, state.hPart, state.pendingOp);
}
function computeTokens(tokens) {
  if (!tokens.length) return null;
  const hasLength = tokens.some(t => t.type === "length");
  if (hasLength) {
    let res = tokens[0];
    if (!res) return null;
    for (let i=1; i<tokens.length-1; i+=2) {
      const op=tokens[i], right=tokens[i+1]; if(!op||!right) break;
      if (res.type==="length" && right.type==="length") {
        if (op.v==="+" || op.v==="-") {
          if (res.dim !== right.dim) return null;
          res = {...res, base: op.v==="+" ? res.base + right.base : res.base - right.base};
        } else if (op.v==="×") {
          res = { type:"length", unit:res.unit, dim:res.dim + right.dim, base:res.base * right.base };
        } else if (op.v==="÷" && right.base!==0) {
          if (res.dim === right.dim) res = { type:"scalar", v: parseFloat((res.base / right.base).toFixed(10)) };
          else res = { type:"length", unit:res.unit, dim:res.dim - right.dim, base:res.base / right.base };
        }
      } else if (res.type==="length" && right.type==="scalar") {
        if (op.v==="×") res = {...res, base:res.base * right.v};
        else if (op.v==="÷" && right.v!==0) res = {...res, base:res.base / right.v};
      } else if (res.type==="scalar" && right.type==="length") {
        if (op.v==="×") res = {...right, base:right.base * res.v};
      } else if (res.type==="scalar" && right.type==="scalar") {
        if(op.v==="+") res={type:"scalar",v:res.v+right.v}; else if(op.v==="-") res={type:"scalar",v:res.v-right.v};
        else if(op.v==="×") res={type:"scalar",v:res.v*right.v}; else if(op.v==="÷"&&right.v!==0) res={type:"scalar",v:res.v/right.v};
      }
    }
    if (res.type==="length") {
      const neg = res.base < 0;
      const value = lengthValueFromBaseDim(Math.abs(res.base), res.unit, res.dim);
      return {...res, value:parseFloat(value.toFixed(10)), neg};
    }
    return res.type==="scalar" ? { type:"scalar", v:parseFloat(res.v.toFixed(10)) } : res;
  }
  const hasTime = tokens.some(t => t.type === "time");
  if (!hasTime) {
    // Plain numeric calculation.
    let res = tokens[0]?.v ?? 0;
    for (let i=1; i<tokens.length-1; i+=2) {
      const op=tokens[i], right=tokens[i+1]; if(!op||!right) break;
      const rv = right.v ?? 0;
      if(op.v==="+") res+=rv; else if(op.v==="-") res-=rv;
      else if(op.v==="×") res*=rv; else if(op.v==="÷"&&rv!==0) res/=rv;
    }
    return { type:"scalar", v: parseFloat(res.toFixed(10)) };
  }
  // Time calculation when any time token is present.
  const first=tokens[0];
  let res=first.type==="time"?tMins(first):(first.v||0)*60;
  for (let i=1;i<tokens.length-1;i+=2) {
    const op=tokens[i],right=tokens[i+1]; if(!op||!right) break;
    const rv=right.type==="time"?tMins(right):(op.v==="×"||op.v==="÷")?right.v:(right.v||0)*60;
    if(op.v==="+") res+=rv; else if(op.v==="-") res-=rv;
    else if(op.v==="×") res*=rv; else if(op.v==="÷"&&rv!==0) res/=rv;
  }
  return { type:"time", ...toHM(res) };
}
function renderTok(tok) {
  if (tok.type==="time")   return fmtHMShort(tok);
  if (tok.type==="length") return tok.display ?? fmtLengthStr(tok);
  if (tok.type==="scalar") return tok.display ?? String(tok.v);
  if (tok.type==="op")     return ` ${tok.v} `;
  return "";
}
function renderExpressionText(text, unitStyle={}, textStyle={}) {
  return text.split(/(m\.sec|hour|min|inch|ft|cm|sec|%|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/).map((part,i)=>
    part==="m.sec"||part==="hour"||part==="min"||part==="inch"||part==="ft"||part==="cm"||part==="sec"||part==="%"||/^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+$/.test(part)
      ? <span key={i} style={{ color:CALC_BLUE_MUTED, fontWeight:CALC_FONT_WEIGHT, ...unitStyle }}>{part}</span>
      : <span key={i} style={{ fontWeight:CALC_FONT_WEIGHT, ...textStyle }}>{part}</span>
  );
}
function historyDateLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  if (sameDay) return "Today";
  return new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", year:"numeric" }).format(d);
}
function getSavedCalcHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(CALC_HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function calcReducer(state, action) {
  switch(action.type) {
    case "DIGIT": {
      if (state.convertResult||state.unitType!==null) return {...initCalc(), buffer:action.d};
      if (state.isResult) return {...initCalc(), buffer:action.d};
      if (state.buffer.endsWith("%")) return state;
      return {...state, buffer:state.buffer+action.d, unitJustPressed:false, minJustPressed:false};
    }
    case "HOUR": {
      if (state.buffer==="") return state;
      return {...state, hPart:parseInt(state.buffer)||0, buffer:"", isResult:false, minExplicit:false, unitJustPressed:true, minJustPressed:false};
    }
    case "MIN": {
      if (state.hPart===null&&state.buffer==="") return state;
      if (state.hPart===null) return {...state, hPart:0, minExplicit:true, unitJustPressed:true, minJustPressed:true};
      return {...state, minExplicit:true, unitJustPressed:true, minJustPressed:true};
    }
    case "INCH": {
      if (state.buffer==="") return state;
      const v = parseFloat(state.buffer)||0;
      return {...state, unitType:"inch", unitValue:v, buffer:"", convertResult:null, isResult:false};
    }
    case "FT": {
      if (state.buffer==="") return state;
      const v = parseFloat(state.buffer)||0;
      return {...state, unitType:"ft", unitValue:v, buffer:"", convertResult:null, isResult:false};
    }
    case "CONVERT": {
      if (state.unitType==="inch" && state.unitValue!==null) {
        return {...state, convertResult:makeLengthConversion(state.unitValue, "inch"), unitType:null, unitValue:null};
      }
      if (state.unitType==="ft" && state.unitValue!==null) {
        return {...state, convertResult:makeLengthConversion(state.unitValue, "ft"), unitType:null, unitValue:null};
      }
      if (state.hPart!==null) {
        const baseMin = (parseInt(state.hPart)||0) * 60 + (parseInt(state.buffer)||0);
        const sourceUnit = state.hPart === 0 ? "min" : "hour";
        return {...state, buffer:"", hPart:null, convertResult:makeTimeConversion(baseMin, sourceUnit), isResult:false};
      }
      if (state.convertResult) {
        return {...state, convertResult:advanceConversion(state.convertResult)};
      }
      return state;
    }
    case "PERCENT": {
      if (state.buffer==="") return state;
      const n = parseFloat(state.buffer);
      if (isNaN(n)) return state;
      if (state.buffer.endsWith("%")) return state;
      return {...state, buffer:`${state.buffer}%`};
    }
    case "OP": {
      if (state.convertResult) {
        const entry = convertResultToToken(state.convertResult);
        return entry ? {...initCalc(), tokens:[entry,{type:"op",v:action.op}], pendingOp:action.op} : initCalc();
      }
      if (state.isResult&&state.result) {
        const prevTok = state.result.type==="scalar"
          ? {type:"scalar",v:state.result.v,display:String(state.result.v)}
          : state.result.type==="length"
            ? {type:"length",value:state.result.value,unit:state.result.unit,dim:state.result.dim,base:state.result.base,display:fmtLengthStr(state.result)}
            : {type:"time",h:state.result.h,m:state.result.m};
        return {...initCalc(), tokens:[prevTok,{type:"op",v:action.op}], pendingOp:action.op};
      }
      const entry=finalizeStateEntry(state);
      const lastTok=state.tokens[state.tokens.length-1];
      let newTok;
      if (!entry&&lastTok?.type==="op") newTok=[...state.tokens.slice(0,-1),{type:"op",v:action.op}];
      else if (entry) newTok=[...state.tokens,entry,{type:"op",v:action.op}];
      else if (lastTok && lastTok.type!=="op") newTok=[...state.tokens,{type:"op",v:action.op}];
      else newTok=state.tokens;
      return {...state, tokens:newTok, buffer:"", hPart:null, unitType:null, unitValue:null, minExplicit:false, pendingOp:action.op, result:null, isResult:false};
    }
    case "EQUALS": {
      if (state.convertResult) {
        const entry = convertResultToToken(state.convertResult);
        if (!entry) return state;
        return {...state, tokens:[entry], buffer:"", hPart:null, unitType:null, unitValue:null, convertResult:null, result:computeTokens([entry]), isResult:true, pendingOp:null};
      }
      const entry=finalizeStateEntry(state);
      const finalToks=entry?[...state.tokens,entry]:state.tokens;
      if (!finalToks.length) return state;
      return {...state, tokens:finalToks, buffer:"", hPart:null, unitType:null, unitValue:null, minExplicit:false, result:computeTokens(finalToks), isResult:true, pendingOp:null};
    }
    case "CLEAR": return initCalc();
    case "BACKSPACE": {
      if (state.convertResult) return initCalc();
      if (state.unitType!==null) return {...state, unitType:null, unitValue:null, buffer:String(state.unitValue||"")};
      if (state.isResult) return initCalc();
      // If unit (hour/min) was just pressed, undo it
      if (state.unitJustPressed) {
        if (state.minJustPressed) {
          // undo min: just remove the min label, keep hPart and buffer as-is
          return {...state, minExplicit:false, unitJustPressed:false, minJustPressed:false};
        }
        // undo hour: restore buffer from hPart
        return {...state, buffer:String(state.hPart), hPart:null, minExplicit:false, unitJustPressed:false};
      }
      if (state.buffer.length>0) return {...state, buffer:state.buffer.slice(0,-1)};
      if (state.hPart!==null) return {...state, buffer:String(state.hPart), hPart:null, minExplicit:false};
      const last=state.tokens[state.tokens.length-1]; if(!last) return state;
      const without=state.tokens.slice(0,-1);
      if(last.type!=="op"&&without.length>0&&without[without.length-1]?.type==="op") return {...state,tokens:without.slice(0,-1),pendingOp:null};
      return {...state,tokens:without,pendingOp:null};
    }
    default: return state;
  }
}

const CALC_KEY = {
  number:   {bg:"#FFFFFF", col:TEXT_BLACK, bd:"rgba(0,0,0,0.10)", fs:24, fw:CALC_FONT_WEIGHT},
  unit:     {bg:APP_BLUE_BG, col:CALC_BLUE, bd:CALC_BLUE, fw:CALC_FONT_WEIGHT},
  clear:    {bg:APP_RED_BG, col:APP_MUTED_RED, bd:APP_MUTED_RED, fw:CALC_FONT_WEIGHT},
  operator: {bg:"#FFFFFF", col:TEXT_BLACK, bd:TEXT_BLACK, fs:26, fw:CALC_FONT_WEIGHT},
};

const CALC_KEY_RADIUS = 16;
const CALC_KEY_SHADOW = "none";
const CALC_KEY_SHADOW_PRESSED = "none";

const setPressedFilter = e => {
  e.currentTarget.style.filter = "brightness(0.96)";
  e.currentTarget.style.transform = "translateY(1px) scale(0.985)";
  e.currentTarget.style.boxShadow = CALC_KEY_SHADOW_PRESSED;
};
const clearPressedFilter = e => {
  e.currentTarget.style.filter = "";
  e.currentTarget.style.transform = "";
  e.currentTarget.style.boxShadow = CALC_KEY_SHADOW;
};

function CalcButton({label, ariaLabel, action, dispatch, col=TEXT_BLACK, bg="#FFFFFF", bd="rgba(0,0,0,0.10)", fs=22, fw=CALC_FONT_WEIGHT, onClick}) {
  return (
    <button
      className="calc-key"
      aria-label={ariaLabel}
      onClick={onClick || (()=>dispatch(action))}
      style={{ display:"flex", alignItems:"center", justifyContent:"center", background:bg, border:`1.5px solid ${bd}`, borderRadius:CALC_KEY_RADIUS, width:"100%", height:"var(--calc-key-height, 1.5cm)", fontSize:fs, fontWeight:fw, color:col, cursor:"pointer", boxShadow:CALC_KEY_SHADOW, transition:"filter 120ms ease, transform 120ms ease, box-shadow 120ms ease", overflow:"visible", touchAction:"manipulation", WebkitTapHighlightColor:"transparent", userSelect:"none", fontFamily:CALC_FONT_FAMILY }}
      onPointerDown={setPressedFilter}
      onPointerUp={clearPressedFilter}
      onPointerLeave={clearPressedFilter}
    >{label}</button>
  );
}

function AcTimeTab() {

  const [calc, dispatch] = useReducer(calcReducer, null, initCalc);

  const [history, setHistory] = useState(getSavedCalcHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversionSheet, setConversionSheet] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CALC_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    if (!conversionSheet) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setConversionSheet(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [conversionSheet]);

  const pushHistory = (item) => {
    if (!item || !item.expr || !item.result) return;
    setHistory(prev => {
      const last = prev[0];
      if (last && last.expr === item.expr && last.result === item.result && last.kind === item.kind) return prev;
      return [{...item, ts:Date.now()}, ...prev].slice(0,50);
    });
  };

  // ── Equals ────────────────────────────────────────────────────────
  const handleEquals = () => {
    const standaloneConversion = standaloneConversionSheetFor(calc);
    if (standaloneConversion) {
      setConversionSheet(standaloneConversion);
      pushHistory(conversionSheetHistoryItem(standaloneConversion));
      return;
    }

    dispatch({type:"EQUALS"});
    const entry = finalizeStateEntry(calc);
    const finalToks = entry ? [...calc.tokens, entry] : calc.tokens;
    if (!finalToks.length) return;
    const result = computeTokens(finalToks);
    if (!result) return;
    const exprStr = finalToks.map(renderTok).join("");
    const resultStr = fmtResultStr(result);
    pushHistory({expr:exprStr, result:resultStr, kind:"calc"});
  };

  const handleConvert = () => {
    const standaloneConversion = standaloneConversionSheetFor(calc);
    if (standaloneConversion) {
      setConversionSheet(standaloneConversion);
      pushHistory(conversionSheetHistoryItem(standaloneConversion));
      return;
    }
    const item = conversionHistoryFor(calc);
    dispatch({type:"CONVERT"});
    if (item) pushHistory(item);
  };


  // ── TIME mode display ──────────────────────────────────────────────
  const exprStr = calc.tokens.map(renderTok).join("");
  let liveStr = "";
  if (!calc.isResult && !calc.convertResult && calc.unitType===null) {
    if (calc.hPart !== null) {
      const hDisplay = calc.hPart > 0 ? `${calc.hPart.toLocaleString()}hour ` : "";
      const mDisplay = calc.buffer !== "" ? `${calc.buffer}${calc.minExplicit ? "min" : ""}` : "";
      liveStr = (hDisplay + mDisplay).trim();
    } else if (calc.buffer !== "") {
      liveStr = calc.buffer;
    }
  }
  const runningPreview = (() => {
    if (calc.isResult || calc.convertResult || calc.unitType !== null) return null;
    if (!calc.tokens.length) return null;
    const lastTok = calc.tokens[calc.tokens.length-1];
    if (!lastTok || lastTok.type !== "op") return null;
    const tc = calc.tokens.slice(0,-1);
    // If there is only one value, exprStr already shows it.
    if (tc.length <= 1) return null;
    return computeTokens(tc);
  })();
  const convertDisplay = (() => {
    if (calc.unitType !== null && calc.unitValue !== null) return fmtLength(calc.unitValue, calc.unitType);
    if (calc.convertResult) return formatConvertResult(calc.convertResult);
    return null;
  })();


  const recentHistory = history.filter(h => Date.now()-h.ts < 12*3600*1000);

  return (
    <div className="calc-layout" style={{ display:"flex", flexDirection:"column", gap:"var(--calc-layout-gap, 10px)", height:"100%", minHeight:0, position:"relative", touchAction:"manipulation", fontFamily:CALC_FONT_FAMILY, fontWeight:CALC_FONT_WEIGHT }}>

      {/* History overlay */}
      {showHistory && (
        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"#F2F4F7", borderRadius:14, zIndex:10, display:"flex", flexDirection:"column", overflow:"hidden", border:"1.5px solid #E8E8E8", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}>
          <div style={{ background:"#E5E7EB", minHeight:40, padding:"2px 12px", display:"grid", gridTemplateColumns:"36px 1fr 36px", alignItems:"center", color:TEXT_MUTED }}>
            <button onClick={()=>{ setShowDeleteConfirm(false); setShowHistory(false); }} aria-label="Back"
              style={{ background:"transparent", border:"none", color:TEXT_MUTED, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", height:36 }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M19.5 7L10.5 16L19.5 25" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 16H27" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
              </svg>
            </button>
            <div style={{ textAlign:"center", fontSize:15, fontWeight:800 }}>History</div>
            <button onClick={()=>{ if (recentHistory.length) setShowDeleteConfirm(true); }} aria-label="Delete history"
              style={{ background:"transparent", border:"none", color:TEXT_MUTED, opacity:recentHistory.length?1:0.35, cursor:recentHistory.length?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", height:36 }}>
              <svg width="23" height="23" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M9 10H23" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
                <path d="M13 10V7.8C13 7.2 13.5 6.7 14.1 6.7H17.9C18.5 6.7 19 7.2 19 7.8V10" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
                <path d="M11 13V24.2C11 25.4 11.9 26.3 13.1 26.3H18.9C20.1 26.3 21 25.4 21 24.2V13" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
                <path d="M14.2 15.5V23M17.8 15.5V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {recentHistory.length===0
            ? <div style={{ color:"#D1D5DB", textAlign:"center", marginTop:24, fontSize:13, fontWeight:CALC_HISTORY_FONT_WEIGHT }}>No history</div>
            : <div style={{ overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:14, padding:"16px 16px 20px" }}>
                {recentHistory.map((h,i)=>(
                  <div key={i} style={{ background:"#FFFFFF", border:"none", borderRadius:14, padding:"13px 16px", boxShadow:"0 1px 3px rgba(15,23,42,0.04)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"auto minmax(0,1fr)", gap:10, alignItems:h.kind==="convert"?"center":"start" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, color:TEXT_BLACK, minWidth:82 }}>
                        <svg width="20" height="20" viewBox="-2 -2 22 22" fill="none" aria-hidden="true" style={{ flex:"0 0 auto" }}>
                          <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="9" y1="4.8" x2="9" y2="9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <line x1="9" y1="9.2" x2="12.3" y2="11.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span style={{ fontSize:11, fontWeight:CALC_HISTORY_FONT_WEIGHT, whiteSpace:"nowrap" }}>{historyDateLabel(h.ts)}</span>
                      </div>
                      {h.kind==="convert" ? (
                        <div style={{ minWidth:0, textAlign:"right" }}>
                          <div style={{ fontSize:13, color:TEXT_BLACK, lineHeight:1.2, fontWeight:CALC_HISTORY_FONT_WEIGHT, wordBreak:"break-word" }}>
                            {renderExpressionText(h.expr, {fontWeight:CALC_HISTORY_FONT_WEIGHT}, {fontWeight:CALC_HISTORY_FONT_WEIGHT})}
                          </div>
                          <div style={{ fontSize:15, color:TEXT_BLACK, lineHeight:1.35, fontWeight:CALC_HISTORY_FONT_WEIGHT, marginTop:4, wordBreak:"break-word" }}>
                            <span style={{ color:TEXT_MUTED, fontWeight:CALC_HISTORY_FONT_WEIGHT, marginRight:4 }}>=</span>
                            {renderExpressionText(h.result, {fontWeight:CALC_HISTORY_FONT_WEIGHT}, {fontWeight:CALC_HISTORY_FONT_WEIGHT})}
                          </div>
                        </div>
                      ) : (
                        <div style={{ minWidth:0, textAlign:"right" }}>
                          <div style={{ fontSize:12, color:TEXT_BLACK, lineHeight:1.15, fontWeight:CALC_HISTORY_FONT_WEIGHT, wordBreak:"break-word" }}>{renderExpressionText(h.expr, {fontWeight:CALC_HISTORY_FONT_WEIGHT}, {fontWeight:CALC_HISTORY_FONT_WEIGHT})}</div>
                          <div style={{ fontSize:18, fontWeight:CALC_HISTORY_FONT_WEIGHT, color:TEXT_BLACK, lineHeight:1.25, marginTop:2 }}>
                            <span style={{ color:TEXT_MUTED, fontWeight:CALC_HISTORY_FONT_WEIGHT, marginRight:4 }}>=</span>{renderExpressionText(h.result, {fontWeight:CALC_HISTORY_FONT_WEIGHT}, {fontWeight:CALC_HISTORY_FONT_WEIGHT})}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          }
          {showDeleteConfirm && (
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.68)", display:"flex", alignItems:"center", justifyContent:"center", padding:22, zIndex:20 }}>
              <div style={{ width:"100%", maxWidth:360, background:"#fff", borderRadius:18, padding:"28px 22px 22px", textAlign:"center", boxShadow:"0 16px 40px rgba(0,0,0,0.22)" }}>
                <div style={{ fontSize:20, fontWeight:900, color:TEXT_BLACK, marginBottom:16 }}>DELETE ALL</div>
                <div style={{ fontSize:15, color:TEXT_BLACK, lineHeight:1.4, marginBottom:24 }}>Are you sure you want to DELETE ALL?</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <button onClick={()=>setShowDeleteConfirm(false)}
                    style={{ height:52, border:"none", borderRadius:26, background:"#E5E7EB", color:TEXT_MUTED, fontSize:16, fontWeight:900, cursor:"pointer" }}>CANCEL</button>
                  <button onClick={()=>{ setHistory([]); setShowDeleteConfirm(false); }}
                    style={{ height:52, border:"none", borderRadius:26, background:TEXT_BLACK, color:"#fff", fontSize:16, fontWeight:900, cursor:"pointer" }}>DELETE ALL</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automatic conversion sheet for a single unit value */}
      {conversionSheet && (
        <div style={{ position:"fixed", inset:0, zIndex:800, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <button
            type="button"
            aria-label="Close conversion"
            onClick={()=>setConversionSheet(null)}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none", background:"rgba(15,23,42,0.56)", cursor:"default" }}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversion-sheet-title"
            style={{ position:"relative", width:"100%", maxWidth:520, background:"#FFFFFF", borderRadius:"24px 24px 0 0", padding:"14px 16px calc(14px + env(safe-area-inset-bottom))", boxShadow:"0 -18px 48px rgba(15,23,42,0.18)" }}
          >
            <div style={{ display:"grid", gridTemplateColumns:"52px 1fr 52px", alignItems:"center", marginBottom:8 }}>
              <span aria-hidden="true" />
              <h2 id="conversion-sheet-title" style={{ margin:0, textAlign:"center", color:TEXT_MUTED, fontSize:14, fontWeight:CALC_FONT_WEIGHT }}>Convert</h2>
              <button
                type="button"
                aria-label="Done"
                onClick={()=>setConversionSheet(null)}
                style={{ border:"none", background:"transparent", color:CALC_BLUE, cursor:"pointer", padding:"6px 0", display:"flex", justifyContent:"center" }}
              >
                <Check size={18} weight="bold"/>
              </button>
            </div>
            <div style={{ textAlign:"center", fontSize:20, fontWeight:CALC_FONT_WEIGHT, color:TEXT_BLACK, minHeight:32, lineHeight:"32px", marginBottom:8 }}>
              {renderExpressionText(conversionSheet.source, {color:CALC_BLUE,fontSize:"0.62em",fontWeight:CALC_FONT_WEIGHT})}
            </div>
            <div style={{ display:"grid", gap:6 }}>
              {conversionSheet.rows.map(row=>(
                <div key={row.unit} style={{ minHeight:40, display:"grid", gridTemplateColumns:"28px 1fr", alignItems:"center", borderRadius:10, padding:"0 12px", background:"#F3F5F7" }}>
                  <span style={{ color:TEXT_MUTED, fontSize:14 }}>=</span>
                  <div style={{ textAlign:"right", color:TEXT_BLACK, fontSize:19, fontWeight:CALC_FONT_WEIGHT, whiteSpace:"nowrap" }}>
                    {renderExpressionText(row.value, {color:CALC_BLUE,fontSize:"0.62em",fontWeight:CALC_FONT_WEIGHT})}
                    <span style={{ color:CALC_BLUE, fontSize:"0.62em", fontWeight:CALC_FONT_WEIGHT, marginLeft:2 }}>{row.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Display */}
      <div className="calc-display" style={{ background:"#FFFFFF", borderRadius:14, border:"1.5px solid #E8E8E8", padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flex:"1 1 auto", minHeight:"var(--calc-display-min-height, 150px)", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>

      {/* Top row: history button and expression */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", minWidth:0 }}>
          <button aria-label="Open history" onClick={()=>setShowHistory(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px", lineHeight:1, display:"flex", alignItems:"center", flexShrink:0 }}>
            <svg width="22" height="22" viewBox="-2 -2 22 22" fill="none">
              <circle cx="9" cy="9" r="7.5" stroke={TEXT_BLACK} strokeWidth="1.4"/>
              <line x1="9" y1="4.5" x2="9" y2="9" stroke={TEXT_BLACK} strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="9" x2="12.5" y2="11" stroke={TEXT_BLACK} strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          <div style={{ flex:1, minWidth:0, textAlign:"right", marginLeft:4 }}>
            {!calc.isResult && exprStr && (
              <div style={{ fontSize:14, color:TEXT_MUTED, whiteSpace:"normal", overflowWrap:"anywhere", wordBreak:"break-word", lineHeight:1.4, fontWeight:CALC_FONT_WEIGHT, maxWidth:"100%" }}>
                {renderExpressionText(exprStr, {color:CALC_BLUE_MUTED})}
              </div>
            )}
            {calc.isResult && exprStr && calc.tokens.length > 1 && (
              <div style={{ fontSize:14, fontWeight:CALC_FONT_WEIGHT, color:TEXT_MUTED, lineHeight:1.4, whiteSpace:"normal", overflowWrap:"anywhere", wordBreak:"break-word", maxWidth:"100%" }}>
                {renderExpressionText(exprStr, {color:CALC_BLUE_MUTED})}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: current input, preview, or result */}
        <div style={{ textAlign:"right" }}>
          {convertDisplay && (
            <div style={{ fontSize:26, color:TEXT_BLACK, fontWeight:CALC_FONT_WEIGHT }}>{renderExpressionText(convertDisplay, {color:CALC_BLUE,fontSize:"0.6em",fontWeight:CALC_FONT_WEIGHT})}</div>
          )}
          {/* After equals: result */}
          {calc.isResult && calc.result && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
              <div style={{ fontSize:26, fontWeight:CALC_FONT_WEIGHT, color:calc.result.neg?"#DC2626":TEXT_BLACK, lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>
                {calc.result.type==="scalar"
                  ? calc.result.v.toLocaleString(undefined,{maximumFractionDigits:10})
                  : calc.result.type==="length"
                    ? renderExpressionText(fmtLengthStr(calc.result), {color:CALC_BLUE,fontSize:"0.6em",fontWeight:CALC_FONT_WEIGHT})
                    : fmtHM(calc.result)}
              </div>
            </div>
          )}
          {/* After an operator: small gray preview */}
          {!calc.isResult && runningPreview && (
            <div style={{ fontSize:14, fontWeight:CALC_FONT_WEIGHT, color:TEXT_MUTED, lineHeight:1.4, whiteSpace:"nowrap" }}>
              {runningPreview.type==="scalar"
                ? runningPreview.v.toLocaleString(undefined,{maximumFractionDigits:10})
                : runningPreview.type==="length"
                  ? renderExpressionText(fmtLengthStr(runningPreview), {color:CALC_BLUE_MUTED,fontSize:"0.6em"})
                  : <><span>{runningPreview.neg?"-":""}{runningPreview.h.toLocaleString()}</span>
                    <span style={{color:CALC_BLUE_MUTED,fontSize:"0.6em"}}>hour</span>
                    <span style={{marginLeft:4}}>{pad(runningPreview.m)}</span>
                    <span style={{color:CALC_BLUE_MUTED,fontSize:"0.6em"}}>min</span></>
              }
            </div>
          )}
          {/* Current entry: large current value (shown whether or not a running preview is above it) */}
          {!calc.isResult && liveStr && (
            <div style={{ fontSize:26, color:TEXT_BLACK, fontWeight:CALC_FONT_WEIGHT, lineHeight:1.1 }}>
              {liveStr.split(/(hour|min|inch|ft|cm|%)/).map((part,i)=>
                part==="hour"||part==="min"||part==="inch"||part==="ft"||part==="cm"||part==="%"
                  ? <span key={i} style={{color:CALC_BLUE,fontWeight:CALC_FONT_WEIGHT,fontSize:"0.6em"}}>{part}</span>
                  : part
              )}
            </div>
          )}
          {/* Empty state */}
        </div>
      </div>

      {/* Keypad */}
      <div className="calc-keypad" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"var(--calc-key-gap, 8px)" }}>
        {/* Row 1: AC  %  ↺  ⌫ */}
        <CalcButton label="AC" ariaLabel="All clear" action={{type:"CLEAR"}} dispatch={dispatch} {...CALC_KEY.clear} />
        <CalcButton label="%"  action={{type:"PERCENT"}} dispatch={dispatch} {...CALC_KEY.unit} />
        <CalcButton ariaLabel="Convert unit" label={
          <svg width="28" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M4.5 10.5H9.2C12.1 10.5 13.8 12.2 15.6 16C17.4 19.8 19.5 21.5 23.6 21.5H26.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M24.4 18.1L28 21.5L24.4 24.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.5 21.5H9.2C12.1 21.5 13.8 19.8 15.6 16C17.4 12.2 19.5 10.5 23.6 10.5H26.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M24.4 7.1L28 10.5L24.4 13.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        } action={null} dispatch={dispatch} {...CALC_KEY.unit} onClick={handleConvert} />
        <CalcButton label="⌫" ariaLabel="Backspace" action={{type:"BACKSPACE"}} dispatch={dispatch} {...CALC_KEY.clear} fs={30} fw={400} />
        <CalcButton label="inch" action={{type:"INCH"}} dispatch={dispatch} {...CALC_KEY.unit} />
        <CalcButton label="ft"   action={{type:"FT"}} dispatch={dispatch} {...CALC_KEY.unit} />
        <CalcButton label="hour" action={{type:"HOUR"}} dispatch={dispatch} {...CALC_KEY.unit} />
        <CalcButton label="min"  action={{type:"MIN"}} dispatch={dispatch} {...CALC_KEY.unit} />
        {/* Rows 3-6: numbers and operators */}
        <CalcButton label="7" action={{type:"DIGIT",d:"7"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="8" action={{type:"DIGIT",d:"8"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="9" action={{type:"DIGIT",d:"9"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="÷" action={{type:"OP",op:"÷"}} dispatch={dispatch} {...CALC_KEY.operator} />
        <CalcButton label="4" action={{type:"DIGIT",d:"4"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="5" action={{type:"DIGIT",d:"5"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="6" action={{type:"DIGIT",d:"6"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="×" action={{type:"OP",op:"×"}} dispatch={dispatch} {...CALC_KEY.operator} />
        <CalcButton label="1" action={{type:"DIGIT",d:"1"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="2" action={{type:"DIGIT",d:"2"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="3" action={{type:"DIGIT",d:"3"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="−" action={{type:"OP",op:"-"}} dispatch={dispatch} {...CALC_KEY.operator} />
        <CalcButton label="." action={{type:"DIGIT",d:"."}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="0" action={{type:"DIGIT",d:"0"}} dispatch={dispatch} {...CALC_KEY.number} />
        <CalcButton label="=" action={null} dispatch={dispatch} {...CALC_KEY.operator} onClick={handleEquals} />
        <CalcButton label="+" action={{type:"OP",op:"+"}} dispatch={dispatch} {...CALC_KEY.operator} />
      </div>

      {/* Reserved for a future ad bar — fixed 1.5cm regardless of device */}
      <div className="calc-ad-space" aria-hidden="true" />

    </div>
  );
}

function FlightLogTab() {
  const [drafts,setDrafts]=useState([]);
  const [draft,setDraft]=useState(emptyFlightLogDraft);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [keyboardVisible,setKeyboardVisible]=useState(false);
  const [notice,setNotice]=useState("");
  const generatedLog=useMemo(()=>composeFullLog({...draft,fullLogOverride:""}),[draft.ecamMsg,draft.faultCode,draft.action,draft.refManual]);
  const resultText=draft.fullLogOverride!==""?draft.fullLogOverride:generatedLog;
  const fullLog=toFlightLogUppercase(resultText.trim());

  useEffect(()=>{ let mounted=true; (async()=>{
    let [savedDrafts,savedCurrent]=await Promise.all([localStore.drafts.get(),localStore.currentDraft.get()]);
    savedDrafts=(savedDrafts||[]).map(normalizeFlightLogCase);
    savedCurrent=normalizeFlightLogCase(savedCurrent);
    if(!mounted)return;
    setDrafts(savedDrafts);
    setDraft(savedCurrent||savedDrafts[0]||emptyFlightLogDraft());
  })(); return()=>{mounted=false;}; },[]);

  useEffect(()=>{ const timer=setTimeout(()=>localStore.currentDraft.set(draft),220); return()=>clearTimeout(timer); },[draft]);
  useEffect(()=>{ const sync=()=>syncDraftsToCloud(drafts).then(result=>{if(result.synced)setNotice("Synced just now");}).catch(()=>{}); window.addEventListener("online",sync); return()=>window.removeEventListener("online",sync); },[drafts]);

  const update=(key,value)=>setDraft(current=>({...current,[key]:toFlightLogUppercase(value),updatedAt:new Date().toISOString(),syncStatus:"local"}));
  const clearExampleOnFocus=(key,example)=>setDraft(current=>{
    if(toFlightLogUppercase(current[key]||"").trim()!==toFlightLogUppercase(example).trim())return current;
    return {...current,[key]:"",updatedAt:new Date().toISOString(),syncStatus:"local"};
  });
  const saveDraft=async()=>{
    const item={...draft,fullLog,updatedAt:new Date().toISOString()};
    const next=[item,...drafts.filter(saved=>saved.id!==item.id)].slice(0,250);
    setDrafts(next);
    setDraft(item);
    await Promise.all([localStore.drafts.set(next),localStore.currentDraft.set(item)]);
    setNotice("Saved on this device");
    syncDraftsToCloud(next).then(result=>result.synced&&setNotice("Saved · Synced just now")).catch(()=>{});
  };
  const clearDraft=async()=>{
    const next=emptyFlightLogDraft();
    setDraft(next);
    await localStore.currentDraft.set(next);
    setNotice("All fields cleared");
  };
  const removeDraft=async(id)=>{const next=drafts.filter(item=>item.id!==id);setDrafts(next);await localStore.drafts.set(next);if(draft.id===id)setDraft(next[0]||emptyFlightLogDraft());};
  const copyLog=async()=>{if(!fullLog)return;await navigator.clipboard.writeText(fullLog);setNotice("Result copied");};

  const handleBackgroundPointerDown=(event)=>{
    if(event.target.closest("input, textarea, select, button, a, [contenteditable='true']"))return;
    dismissKeyboard();
    setKeyboardVisible(false);
  };

  return <div
    className="flight-log-tab"
    onPointerDown={handleBackgroundPointerDown}
    onFocusCapture={event=>{if(event.target.matches("input, textarea"))setKeyboardVisible(true);}}
    onBlurCapture={()=>window.setTimeout(()=>{if(!document.activeElement?.matches?.("input, textarea"))setKeyboardVisible(false);},80)}
  >
    <div className="flight-log-title-card"><strong>LOG</strong><button className="flight-log-history-toggle" onClick={()=>setHistoryOpen(value=>!value)} aria-expanded={historyOpen} aria-label="Open log history" title="History"><LogHistoryIcon size={21}/></button></div>

    {historyOpen&&<section className="flight-log-history">
      <div className="flight-log-subhead"><strong>RECENT LOGS</strong><span>{drafts.length} saved</span></div>
      <div className="flight-log-history-list">{drafts.slice(0,8).map(item=><div className="flight-log-history-row" key={item.id}><button onClick={()=>{setDraft(normalizeFlightLogCase(item));setHistoryOpen(false);}}><ClipboardText size={19}/><span><strong>{item.ecamMsg||"UNTITLED FLIGHT LOG"}</strong><small>{formatDraftTimestamp(item.updatedAt)}</small></span></button><button className="danger" onClick={()=>removeDraft(item.id)} aria-label="Delete saved log"><Trash size={17}/></button></div>)}{!drafts.length&&<div className="empty-drafts">Saved logs will appear here.</div>}</div>
    </section>}

    <div className="flight-log-fields-grid">
      <FieldEditor label="ECAM MSG" value={draft.ecamMsg} onChange={value=>update("ecamMsg",value)} onFocus={()=>clearExampleOnFocus("ecamMsg","COM VHF 3 DATA FAULT")} placeholder="COM VHF 3 DATA FAULT"/>
      <FieldEditor label="FAULT CODE" value={draft.faultCode} onChange={value=>update("faultCode",value)} onFocus={()=>clearExampleOnFocus("faultCode","231233")} placeholder="231233"/>
    </div>
    <FieldEditor label="ACTION" value={draft.action} onChange={value=>update("action",value)} onFocus={()=>clearExampleOnFocus("action","RESET RELATE C/B THEN VHF & ATIMS BITE TEST NML")} multiline placeholder="RESET RELATE C/B THEN VHF & ATIMS BITE TEST NML"/>
    <FieldEditor label="Ref. MANUAL" value={draft.refManual} onChange={value=>update("refManual",value)} onFocus={()=>clearExampleOnFocus("refManual","TSM XX-XX-XX-XXX-XXX-X\nAMM XX-XX-XX-XXX-XXX-X")} multiline placeholder={"TSM XX-XX-XX-XXX-XXX-X\nAMM XX-XX-XX-XXX-XXX-X"}/>

    <div className="flight-log-divider"/>
    <section className="flight-log-full">
      <div className="flight-log-subhead"><strong>RESULT</strong></div>
      <div className="flight-log-paper">
        <textarea aria-label="Editable flight log result" value={resultText} onChange={event=>update("fullLogOverride",event.target.value)} placeholder="COMPLETE THE DRAFT FIELDS TO GENERATE THE FULL LOG." rows={5} autoCapitalize="characters" autoCorrect="off" spellCheck={false}/>
        <div className="flight-log-paper-actions"><button onClick={copyLog} disabled={!fullLog}><Copy size={15}/>Copy</button></div>
      </div>
    </section>
    <div className="flight-log-bottom-actions"><button onClick={clearDraft}><Trash size={20} weight="bold"/>DELETE ALL</button><button className="primary" onClick={saveDraft}><FloppyDisk size={20} weight="bold"/>SAVE</button></div>
    {notice&&<div className="flight-log-notice"><Check size={15}/>{notice}</div>}
    {keyboardVisible&&<button type="button" className="keyboard-dismiss-button" onPointerDown={event=>event.preventDefault()} onClick={()=>{dismissKeyboard();setKeyboardVisible(false);}} aria-label="Hide keyboard"><CaretDown size={16} weight="bold"/>DONE</button>}
  </div>;
}
// ponytail: FlightLogTab is parked, not deleted — LOG tab is standing in for Fuel Density for now.
// Re-attach a "log" entry to TABS and its render line in App() to bring this tab back later.

// ─── Fuel Density Converter ───────────────────────────────────────────────────
// g/cm3 x [3.78533/0.4539] = lbs/gal
const FUEL_DENSITY_FACTOR = 3.78533 / 0.4539;

const MASS_UNITS = { gcm3:{ label:"g/cm³", placeholder:"0.800" }, kgm3:{ label:"kg/m³", placeholder:"800.0" } };
const FUEL_MASS_UNIT_STORAGE_KEY = "maintToolFuelMassUnit";
// 1 g/cm³ = 1000 kg/m³
const toGcm3 = (value, unit) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return unit==="kgm3" ? n/1000 : n;
};
const fromGcm3ToUnit = (gcm3, unit) => unit==="kgm3" ? (gcm3*1000).toFixed(1) : gcm3.toFixed(3);

function FuelDensityTab() {
  const [massUnit, setMassUnit] = useState(()=>localStorage.getItem(FUEL_MASS_UNIT_STORAGE_KEY)==="kgm3"?"kgm3":"gcm3");
  const [massValue, setMassValue] = useState("");
  const [lbsgal, setLbsgal] = useState("");
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const unitPickerRef = useRef(null);

  useEffect(() => {
    if (!showUnitPicker) return;
    const closeOnOutside = (e) => {
      if (unitPickerRef.current && !unitPickerRef.current.contains(e.target)) setShowUnitPicker(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [showUnitPicker]);

  const fromMass = (value) => {
    setMassValue(value);
    const gcm3 = toGcm3(value, massUnit);
    setLbsgal(gcm3!==null ? (gcm3 * FUEL_DENSITY_FACTOR).toFixed(2) : "");
  };
  const fromLbsgal = (value) => {
    setLbsgal(value);
    const n = parseFloat(value);
    const gcm3 = Number.isFinite(n) ? n / FUEL_DENSITY_FACTOR : null;
    setMassValue(gcm3!==null ? fromGcm3ToUnit(gcm3, massUnit) : "");
  };
  const selectUnit = (unit) => {
    setShowUnitPicker(false);
    if (unit===massUnit) return;
    const gcm3 = toGcm3(massValue, massUnit);
    setMassUnit(unit);
    setMassValue(gcm3!==null ? fromGcm3ToUnit(gcm3, unit) : "");
    localStorage.setItem(FUEL_MASS_UNIT_STORAGE_KEY, unit);
  };

  return (
    <div>
      <div ref={unitPickerRef} style={{ width:"100%", boxSizing:"border-box", background:NEUTRAL_ACCENT.bg, border:`1.5px solid ${NEUTRAL_ACCENT.border}`, borderRadius:12, marginBottom:20, boxShadow:"0 2px 5px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(0,0,0,0.04)", overflow:"hidden" }}>
        <button type="button" onClick={()=>setShowUnitPicker(v=>!v)} aria-expanded={showUnitPicker} aria-label="Choose mass unit" style={{ width:"100%", height:50, boxSizing:"border-box", border:"none", background:"transparent", padding:"0 16px", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit", cursor:"pointer" }}>
          <span style={{ fontSize:22, fontWeight:800, color:NEUTRAL_ACCENT.color, letterSpacing:"0.005em" }}>Fuel Density</span>
          <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:TEXT_BLACK, fontWeight:600, whiteSpace:"nowrap" }}>
            {MASS_UNITS[massUnit].label} ↔ lbs/gal
            {showUnitPicker?<CaretUp size={21} weight="bold"/>:<CaretDown size={21} weight="bold"/>}
          </span>
        </button>
        {showUnitPicker&&<div style={{ borderTop:"1px solid #E1E3E8" }}>
          {Object.entries(MASS_UNITS).map(([unit,info])=>(
            <button key={unit} type="button" onClick={()=>selectUnit(unit)} style={{ width:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:"none", borderTop:unit==="kgm3"?"1px solid #E5E5EA":"none", background:unit===massUnit?"#F2F2F7":"#FFFFFF", fontFamily:"inherit", fontSize:14, fontWeight:600, color:TEXT_BLACK, cursor:"pointer" }}>
              {info.label}
              {unit===massUnit&&<Check size={16} weight="bold"/>}
            </button>
          ))}
        </div>}
      </div>
      <div>
        <div style={{ fontSize:18, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.03em", marginBottom:6 }}>{MASS_UNITS[massUnit].label}</div>
        <input className="fuel-input" style={{...IS, background:"#FFFFFF"}} inputMode="decimal" placeholder={MASS_UNITS[massUnit].placeholder} value={massValue} onChange={e=>fromMass(e.target.value)} />
      </div>
      <div style={{ display:"flex", justifyContent:"center", margin:"10px 0" }}>
        <span style={{ width:34, height:34, borderRadius:"50%", background:"transparent", display:"grid", placeItems:"center", color:TEXT_BLACK }}>
          <ArrowsDownUp size={18} weight="bold" />
        </span>
      </div>
      <div>
        <div style={{ fontSize:18, fontWeight:700, color:TEXT_BLACK, letterSpacing:"0.03em", marginBottom:6 }}>lbs/gal</div>
        <input className="fuel-input" style={{...IS, background:"#FFFFFF"}} inputMode="decimal" placeholder="6.67" value={lbsgal} onChange={e=>fromLbsgal(e.target.value)} />
      </div>
    </div>
  );
}

const TABS=[
  {id:"actime", label:"Calc."},
  {id:"mel",    label:"MEL"},
  {id:"moi",    label:"NEF·MOI"},
  {id:"fuel",   label:"Fuel"},
];
const TAB_IDS = TABS.map(t=>t.id);
const SWIPE_THRESHOLD = 45;
const MENU_EDGE_WIDTH = 32;


function FieldEditor({ label, value, onChange, onFocus, multiline=false, placeholder }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="flight-log-field">
      <span>{label}</span>
      <Tag
        aria-label={label}
        value={value}
        onChange={event=>onChange(toFlightLogUppercase(event.target.value))}
        onFocus={onFocus}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}

function LogHistoryIcon({ size=22 }) {
  return <span className="history-icon-stack" aria-hidden="true">
    <ClipboardText size={size} weight="bold"/>
    <Clock className="history-clock" size={Math.round(size*.58)} weight="bold"/>
  </span>;
}

const AUTH_PROVIDERS = [
  {id:"google",label:"Google",Icon:FcGoogle},
  {id:"apple",label:"Apple",Icon:SiApple,color:TEXT_BLACK},
];

function AccountPanel({ account, onAccountChange, onClose }) {
  const [lastProvider,setLastProvider]=useState(null);
  const [notice,setNotice]=useState("");
  const [authMode,setAuthMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{ let mounted=true; Promise.all([localStore.authMeta.get(),getSignedInAccount()]).then(async([meta,cloudAccount])=>{
    if(!mounted)return;
    setLastProvider(meta?.provider||null);
    if(!account&&cloudAccount){await localStore.account.set(cloudAccount);onAccountChange(cloudAccount);}
  }).catch(()=>{}); return()=>{mounted=false;}; },[]);
  useEffect(()=>observeSignedInAccount(onAccountChange),[onAccountChange]);

  const beginOAuth=async(provider)=>{
    setNotice("");
    setLastProvider(provider);
    await localStore.authMeta.set({provider,lastUsedAt:new Date().toISOString()});
    try { await signInWithOAuth(provider); }
    catch(error){ setNotice(error.message||"Unable to open the login service."); }
  };

  const submitEmailAuth=async(event)=>{
    event.preventDefault();
    const normalizedEmail=email.trim().toLowerCase();
    if(!normalizedEmail||!password){setNotice("Enter your email and password.");return;}
    if(authMode==="signup"&&!validatePassword(password).valid){
      setNotice("Use 8+ characters with uppercase, lowercase, number, and special character.");
      return;
    }
    setSubmitting(true);setNotice("");
    try{
      if(authMode==="signup"){
        await signUpWithEmail({email:normalizedEmail,password,accountType:"personal",company:null});
        const signedUpAccount=await getSignedInAccount().catch(()=>null);
        if(signedUpAccount){await localStore.account.set(signedUpAccount);onAccountChange(signedUpAccount);}
        else setNotice("Check your email to confirm your account, then sign in.");
      }else{
        await signInWithEmail({email:normalizedEmail,password});
        const signedInAccount=await getSignedInAccount();
        if(signedInAccount){await localStore.account.set(signedInAccount);onAccountChange(signedInAccount);}
      }
    }catch(error){setNotice(error.message||"Unable to continue.");}
    finally{setSubmitting(false);}
  };

  const sendPasswordReset=async()=>{
    const normalizedEmail=email.trim().toLowerCase();
    if(!normalizedEmail){setNotice("Enter your email first.");return;}
    try{await requestPasswordReset(normalizedEmail);setNotice("Password reset instructions were sent to your email.");}
    catch(error){setNotice(error.message||"Unable to send password reset email.");}
  };

  if(account){
    const signedInProviderId=(account.provider||lastProvider||"").replace(/^custom:/,"");
    const signedInProvider=AUTH_PROVIDERS.find(p=>p.id===signedInProviderId);
    return <div className="account-panel account-signed-in">
    <button className="panel-back" onClick={onClose}><ArrowLeft size={22}/>Account</button>
    <div className="account-summary account-summary-primary">{signedInProvider?<signedInProvider.Icon size={38} color={signedInProvider.color}/>:<UserCircle size={38} weight="fill"/>}<div><strong>{account.email||"SIGNED-IN ACCOUNT"}</strong><span>Flight log sync is enabled</span></div></div>
    <div className="account-sync-card"><CloudCheck size={22}/><div><strong>Sync & backup</strong><span>Changes are saved locally first, then synced when data is available.</span></div></div>
    <button className="logout-button" onClick={async()=>{try{await signOutCurrentAccount();onAccountChange(null);setNotice("Logged out on this device.");}catch(error){setNotice(error.message||"Unable to log out.");}}}><SignOut size={20}/>Log out</button>
    {notice&&<div className="account-notice">{notice}</div>}
  </div>;
  }

  return <div className="account-panel login-panel">
    <button className="panel-back" onClick={onClose}><ArrowLeft size={22}/>Log in</button>
    <p className="login-caption">Sync flight log records across your devices.</p>
    <div className="provider-list">{AUTH_PROVIDERS.map(({id,label,Icon,color,badge})=><div className={`provider-button-wrap ${lastProvider===id?"last-used":""}`} key={id}><button className="provider-button" onClick={()=>beginOAuth(id)}><span className={`provider-icon ${id} ${badge||""}`}><Icon size={id==="google"?27:24} color={color}/></span><strong>Continue with {label}</strong></button>{lastProvider===id&&<span className="last-used-badge">LAST USED</span>}</div>)}</div>
    <div className="login-divider"><span>{authMode==="signup"?"or create with email":"or"}</span></div>
    <form className="email-auth-form" onSubmit={submitEmailAuth}>
      <label className="email-auth-field"><span>Email</span><input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label>
      <label className="email-auth-field"><span className="password-label-row"><span>Password</span>{authMode==="signin"&&<button type="button" onClick={sendPasswordReset}>Forgot password?</button>}</span><span className="password-input-wrap"><input type={showPassword?"text":"password"} autoComplete={authMode==="signup"?"new-password":"current-password"} value={password} onChange={event=>setPassword(event.target.value)} placeholder="••••••••"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeSlash size={19}/>:<Eye size={19}/>}</button></span></label>
      {authMode==="signup"&&<p className="password-hint">8+ characters · uppercase · lowercase · number · special character</p>}
      <button className="email-auth-submit" type="submit" disabled={submitting}>{submitting?"Please wait…":authMode==="signup"?"Create account":"Sign in"}</button>
    </form>
    <p className="auth-switch-row">{authMode==="signin"?"Don’t have an account? ":"Already have an account? "}<button type="button" onClick={()=>{setAuthMode(mode=>mode==="signin"?"signup":"signin");setNotice("");}}>{authMode==="signin"?"Sign up":"Sign in"}</button></p>
    <p className="login-footnote">Signing in also creates your secure sync profile.</p>
    {notice&&<div className="account-notice">{notice}</div>}
  </div>;
}

function SideMenu({ open, onClose }) {
  const [view,setView]=useState("home");
  const [account,setAccount]=useState(null);

  useEffect(()=>{if(!open)return;setView("home");(async()=>{
    const [savedAccount,cloudAccount]=await Promise.all([localStore.account.get(),getSignedInAccount().catch(()=>null)]);
    const nextAccount=cloudAccount||savedAccount||null;
    if(cloudAccount&&!savedAccount)await localStore.account.set(cloudAccount);
    setAccount(nextAccount);
  })();},[open]);

  if(!open)return null;
  const goHome=()=>setView("home");
  const sendFeedback=()=>{
    const subject=encodeURIComponent("Maint Tool Feedback");
    const body=encodeURIComponent(`SIGNED-IN ACCOUNT: ${account?.email||"NOT SIGNED IN"}\n\nFEEDBACK:\n`);
    window.location.href=`mailto:${serviceConfig.feedbackEmail||""}?subject=${subject}&body=${body}`;
  };

  return <div className="menu-overlay">
    <button aria-label="Close menu" onClick={onClose} className="menu-scrim"/>
    <aside className="flight-log-drawer">
      <header className="drawer-header"><strong>Maint Tool</strong><button onClick={onClose} aria-label="Close menu"><X size={22} weight="bold"/></button></header>
      <div className="drawer-scroll">
        {view==="account"?<AccountPanel account={account} onAccountChange={setAccount} onClose={goHome}/>
        :<div className="side-home">
          <button className="side-account-row" onClick={()=>setView("account")}><UserCircle size={30} weight="fill"/><span><strong>{account?.email||"Log in"}</strong><small>{account?"Account & device sync":"Sync flight logs across devices"}</small></span><CaretRight size={19}/></button>
          <div className="side-menu-group">
            <button onClick={sendFeedback}><EnvelopeSimple size={22}/><span><strong>Feedback</strong><small>Opens your device's default email app</small></span><CaretRight size={18}/></button>
          </div>
          <div className="side-sync-note"><CloudCheck size={19}/><span><strong>Offline ready</strong><small>{account?"Cloud sync resumes automatically":"Logs stay saved on this device"}</small></span></div>
        </div>}
      </div>
      <footer><span>Offline ready</span><span>Version {APP_VERSION}</span></footer>
    </aside>
  </div>;
}

function App() {
  const [tab,setTab]=useState("actime");
  const [menuOpen,setMenuOpen]=useState(false);
  const [slideDir,setSlideDir]=useState(0);
  const [animKey,setAnimKey]=useState(0);
  const [tzActive,setTzActive]=useState({UTC:true,KST:true});
  const [selectedTz,setSelectedTz]=useState(getSavedTz);
  const [moiTabLabel,setMoiTabLabel]=useState("NEF·MOI");
  const swipeRef = useRef({});
  const tzOffset = findTz(selectedTz);

  useEffect(() => {
    let willShowHandle;
    let didShowHandle;
    let willHideHandle;
    let didHideHandle;
    let disposed = false;

    Keyboard.setScroll({ isDisabled:true }).catch(() => {});

    const registerKeyboardListeners = async () => {
      willShowHandle = await Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
        daysKeyboardHeight = keyboardHeight;
        window.requestAnimationFrame(() => setDaysKeyboardShift(keyboardHeight));
      });
      didShowHandle = await Keyboard.addListener("keyboardDidShow", ({ keyboardHeight }) => {
        daysKeyboardHeight = keyboardHeight;
        setDaysKeyboardShift(keyboardHeight);
      });
      willHideHandle = await Keyboard.addListener("keyboardWillHide", () => {
        daysKeyboardHeight = 0;
        clearDaysKeyboardShift();
      });
      didHideHandle = await Keyboard.addListener("keyboardDidHide", () => {
        daysKeyboardHeight = 0;
        activeDaysInput = null;
        clearDaysKeyboardShift();
      });

      if (disposed) {
        willShowHandle.remove();
        didShowHandle.remove();
        willHideHandle.remove();
        didHideHandle.remove();
      }
    };

    registerKeyboardListeners().catch(() => {});

    return () => {
      disposed = true;
      willShowHandle?.remove();
      didShowHandle?.remove();
      willHideHandle?.remove();
      didHideHandle?.remove();
      activeDaysInput = null;
      daysKeyboardHeight = 0;
      clearDaysKeyboardShift();
      Keyboard.setScroll({ isDisabled:false }).catch(() => {});
    };
  }, []);

  useEffect(()=>{
    let listener;
    initializeOAuthCallbackHandling(undefined, error=>console.error("OAuth callback failed", error))
      .then(handle=>{listener=handle;})
      .catch(error=>console.error("OAuth callback listener failed", error));
    return()=>listener?.remove?.();
  },[]);

  useEffect(()=>{ initializeAnalytics().catch(()=>{}); },[]);

  useEffect(()=>{
    try {
      localStorage.setItem(TZ_STORAGE_KEY, tzOffset.zone);
    } catch {}
  }, [tzOffset.zone]);

  useEffect(()=>{ let mounted=true; localStore.calculatorSettings.get().then(saved=>{
    if(mounted)setMoiTabLabel(String(saved?.nefMoiName||"NEF·MOI").trim()||"NEF·MOI");
  }); return()=>{mounted=false;}; },[]);

  const switchTab = (nextTab, forcedDir = null) => {
    if (nextTab === tab) return;
    const cur = TAB_IDS.indexOf(tab);
    const next = TAB_IDS.indexOf(nextTab);
    setSlideDir(forcedDir ?? (next > cur ? 1 : -1));
    setAnimKey(n=>n+1);
    setTab(nextTab);
  };

  const handleTouchStart = (e) => {
    const x = e.touches[0].clientX;
    swipeRef.current = {
      x,
      y: e.touches[0].clientY,
      fromMenuEdge: x <= MENU_EDGE_WIDTH,
    };
  };

  const handleTouchEnd = (e) => {
    const s = swipeRef.current;
    if (typeof s.x !== "number") return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    // Horizontal swipe: movement must be wider than vertical and at least 45px.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      const cur = TAB_IDS.indexOf(tab);
      if (dx < 0 && cur < TAB_IDS.length - 1) {
        switchTab(TAB_IDS[cur + 1], 1);
      } else if (dx > 0 && cur > 0) {
        switchTab(TAB_IDS[cur - 1], -1);
      } else if (dx > 0 && cur === 0 && s.fromMenuEdge) {
        setMenuOpen(true);
      }
    }
    swipeRef.current = {};
  };

  return (
    <>
      <div aria-hidden="true" style={{ position:"fixed", inset:"0 0 auto", height:"env(safe-area-inset-top)", background:"#fff", zIndex:100, pointerEvents:"none" }} />
      <SideMenu open={menuOpen} onClose={()=>setMenuOpen(false)} />
      <div
        className="app-shell"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ height:"100dvh", paddingTop:"env(safe-area-inset-top)", background:"#F2F4F7", fontFamily:"-apple-system,'Helvetica Neue',sans-serif", display:"flex", flexDirection:"column", overflow:"hidden", touchAction:"pan-y", transform:"translate3d(0, 0, 0)", transition:"transform 180ms ease-out", willChange:"transform" }}>
        <Header tzActive={tzActive} setTzActive={setTzActive} selectedTz={selectedTz} setSelectedTz={setSelectedTz} onTitleClick={()=>switchTab("actime")} onMenuClick={()=>setMenuOpen(true)} />
        <div style={{ background:"#fff", display:"flex", borderBottom:"2px solid #F0F0F0" }}>
          {TABS.map(({id,label})=>{
            const active=tab===id;
            const displayLabel=id==="moi"?moiTabLabel:label;
            return (
              <button key={id} onClick={()=>switchTab(id)} style={{ flex:1, padding:"13px 2px", background:"transparent", border:"none", borderBottom:active?"2px solid #000000":"2px solid transparent", outline:"none", marginBottom:-2, color:active?TEXT_BLACK:TEXT_MUTED, fontWeight:800, fontSize:18, cursor:"pointer", letterSpacing:"0.02em", transition:"all 0.15s", whiteSpace:"nowrap" }}>
                {displayLabel}
              </button>
            );
          })}
        </div>
        <div
          key={`${tab}-${animKey}`}
          className="tab-panel"
          onPointerDown={event=>{
            if(event.target.closest("input, textarea, select, button, a, [contenteditable='true']"))return;
            dismissKeyboard();
          }}
          style={{ flex:"1 1 auto", minHeight:0, width:"100%", padding:tab==="actime"?"14px 14px 10px":"14px 14px 20px", maxWidth:520, margin:"0 auto", overflowX:"hidden", overflowY:tab==="actime"?"hidden":"auto", WebkitOverflowScrolling:"touch", animation: slideDir===0 ? "none" : `${slideDir>0?"tabSlideFromRight":"tabSlideFromLeft"} 180ms ease-out` }}
        >
          {tab==="mel"    && <MelTab    tzActive={tzActive} selectedTz={selectedTz} tzOffset={tzOffset} />}
          {tab==="fuel"   && <FuelDensityTab />}
          {tab==="moi"    && <MoiNefTab tzActive={tzActive} selectedTz={selectedTz} tzOffset={tzOffset} onNameChange={setMoiTabLabel} />}
          {tab==="actime" && <AcTimeTab />}
        </div>
      </div>
    </>
  );
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);
