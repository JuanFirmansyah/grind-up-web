// inject-code-number-2.mjs
import admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { createRequire } from "node:module";
import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "node:fs";
import path from "node:path";
XLSX.set_fs(fs);

// ====== CONFIG ======
const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

// CLI flags
const argv = process.argv.slice(2);
const A = (k, def = undefined) => {
  const i = argv.findIndex((t) => t === `--${k}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return def;
};
const has = (k) => argv.includes(`--${k}`);

const FILE = A("file", "./REKAP_DATA_MEMBER.xlsx");
const SHEET = A("sheet"); // contoh: --sheet "AGUSTUS 2025"
const DRY = has("dry");
const DEBUG = has("debug");
const LOG_UNMATCHED = has("log-unmatched");
const RENAME_NOMINAL = !has("skip-rename");

// Member code options
const MEMBER_FIELD = A("member-field", "memberCode"); // field pada users
const CODE_PREFIX  = A("code-prefix", "M-");
const CODE_PAD     = parseInt(A("code-pad", "3"), 10); // M-001
const START_NO     = A("start"); // override manual, mis: --start 165 (mulai dari M-166)
const EXPORT_CSV   = A("export", "./membercode_mapping.csv"); // CSV output
const COUNTER_DOC  = A("counter-doc"); // opsional: "counters/members"

// default values untuk payments
const DEFAULT_METHOD = A("method", "import_excel"); // qris/cash/transfer/import_excel
const DEFAULT_STATUS = A("status", "success");      // success | pending
const DEFAULT_CURRENCY = A("currency", "IDR");

// ====== FIREBASE ======
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ====== Helpers ======
const indoMonths = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, agt: 7, agst: 7, okt: 9, nov: 10, des: 11,
};

const normalizeName = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const levenshtein = (a, b) => {
  a = a || ""; b = b || "";
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return m[a.length][b.length];
};
const similarity = (a, b) => {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - levenshtein(a, b) / maxLen;
};

const parseCurrency = (s) => {
  if (typeof s === "number") return Math.round(s);
  const digits = String(s || "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

const toEndOfDayTS = (d) => {
  const dd = new Date(d);
  dd.setHours(23, 59, 59, 999);
  return Timestamp.fromDate(dd);
};

const cleanSep = (t) =>
  String(t).replace(/[–—−]/g, "-").replace(/\bs\/d\b|\bsd\b|s\.?d\.?/gi, "-");

const parseMonthWord = (w) => indoMonths[String(w).toLowerCase()];
const parseDdMonYyyy = (dd, mon, yyyy) => {
  const m = parseMonthWord(mon);
  if (!Number.isInteger(m)) return null;
  const dt = new Date(Number(yyyy), m, Number(dd));
  return Number.isNaN(dt.getTime()) ? null : dt;
};

// Periode fleksibel
function parsePeriod(text) {
  if (!text) return null;
  const s = cleanSep(String(text).trim().toLowerCase()).replace(/\s+/g, " ");

  let m = s.match(/^(\d{1,2}) ([a-z\.]+) - (\d{1,2}) ([a-z\.]+) (\d{4})$/i);
  if (m) {
    const start = parseDdMonYyyy(m[1], m[2], m[5]);
    const end   = parseDdMonYyyy(m[3], m[4], m[5]);
    if (start && end) return { start, end };
  }

  m = s.match(/^(\d{1,2}) ([a-z\.]+) (\d{4}) - (\d{1,2}) ([a-z\.]+) (\d{4})$/i);
  if (m) {
    const start = parseDdMonYyyy(m[1], m[2], m[3]);
    const end   = parseDdMonYyyy(m[4], m[5], m[6]);
    if (start && end) return { start, end };
  }

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}) - (\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const a = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const b = new Date(Number(m[6]), Number(m[5]) - 1, Number(m[4]));
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) return { start: a, end: b };
  }

  return null;
}

const monthsBetweenInclusive = (start, end) =>
  (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

const daysBetweenInclusive = (start, end) =>
  Math.floor((new Date(end).setHours(0,0,0,0) - new Date(start).setHours(0,0,0,0)) / 86400000) + 1;

function parseIndoDate(s) {
  if (!s) return null;
  if (s instanceof Date && !Number.isNaN(s.getTime())) return s;
  const raw = String(s).toLowerCase().replace(/[^\w\s\d]/g, " ").replace(/\s+/g, " ");
  const m = raw.match(/(\d{1,2})\s+([a-z\.]+)\s+(\d{4})/i);
  if (m) {
    const dt = parseDdMonYyyy(m[1], m[2], m[3]);
    if (dt) return dt;
  }
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

// ====== Loaders & matchers (NAMA SAJA) ======
async function loadUsers() {
  const snap = await db.collection("users").get();
  const byExactName = new Map();
  const arr = [];
  for (const d of snap.docs) {
    const data = d.data();
    const nn = normalizeName(data.name);
    if (nn) {
      if (!byExactName.has(nn)) byExactName.set(nn, []);
      byExactName.get(nn).push({ id: d.id, data, nname: nn });
    }
    arr.push({ id: d.id, data, nname: nn });
  }
  return { byExactName, arr };
}

const FUZZY_THRESHOLD = 0.88;
function matchUser(row, users) {
  const nameRaw = row.nama ?? row.name;
  const nn = normalizeName(nameRaw);
  if (!nn) return null;

  const exactList = users.byExactName.get(nn);
  if (exactList && exactList.length === 1) return exactList[0];
  if (exactList && exactList.length > 1) {
    if (LOG_UNMATCHED) console.log(`! AMBIGUOUS NAME in DB: "${nameRaw}" -> skip`);
    return null;
  }

  let best = null, bestScore = 0;
  for (const u of users.arr) {
    const sc = similarity(nn, u.nname);
    if (sc > bestScore) { bestScore = sc; best = u; }
  }
  if (best && bestScore >= FUZZY_THRESHOLD) return best;
  return null;
}

function matchPackageId(pkgName, packages, userFallbackId) {
  const n = normalizeName(pkgName);
  if (n && packages.byName.has(n)) return packages.byName.get(n);
  let best = null, score = 0;
  for (const p of packages.arr) {
    const s = similarity(n, p.nname);
    if (s > score) { score = s; best = p; }
  }
  return score >= 0.8 ? best.id : (userFallbackId || null);
}

// ====== Member Code ======
function safeRegExpEscape(s){return s.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");}
function parseCodeNumber(s) {
  if (!s) return null;
  const m = String(s).trim().match(new RegExp(`^${safeRegExpEscape(CODE_PREFIX)}(\\d+)$`));
  return m ? parseInt(m[1], 10) : null;
}
function formatCode(n) {
  const num = String(n).padStart(CODE_PAD, "0");
  return `${CODE_PREFIX}${num}`;
}
function asPrefixed(n){ return formatCode(n); }
function asNumber(n){ return n; }

async function getMaxCodeNumberFromUsers() {
  const snap = await db.collection("users").get();
  let max = 0;
  for (const d of snap.docs) {
    const val = d.data()?.[MEMBER_FIELD];
    const n = parseCodeNumber(val);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max;
}

async function initCounter() {
  if (START_NO) return parseInt(START_NO, 10);
  if (COUNTER_DOC) {
    const ref = db.doc(COUNTER_DOC);
    const doc = await ref.get();
    if (doc.exists && Number.isInteger(doc.data()?.max)) return doc.data().max;
  }
  return await getMaxCodeNumberFromUsers();
}

async function bumpCounterTo(n) {
  if (!COUNTER_DOC) return;
  const ref = db.doc(COUNTER_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.max || 0) : 0;
    if (!snap.exists) tx.set(ref, { max: n });
    else if (n > current) tx.update(ref, { max: n });
  });
}

// ====== Migrations ======
async function renameNominalToPrice() {
  const snap = await db.collection("payments").get();
  let upd = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.nominal !== "undefined" && typeof data.price === "undefined") {
      const updates = { price: Number(data.nominal) || 0, nominal: FieldValue.delete() };
      if (DRY) console.log(`[DRY] payments/${d.id} rename nominal->price`, updates);
      else await d.ref.update(updates);
      upd++;
    }
  }
  console.log(`payments: nominal->price updated: ${upd}`);
}

// ====== Excel Import ======
function normalizeKey(k) {
  return String(k || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NAME_KEYS    = ["nama","name"];
const PHONE_KEYS   = ["no telepon","no telp","no telephone","telepon","phone","no telpon","no hp","nomor hp"]; // tidak dipakai
const PERIOD_KEYS  = ["periode member","periode"];
const HARGA_KEYS   = ["harga","price","nominal"];
const DAFTAR_KEYS  = ["tanggal daftar","tgl daftar","tanggal pendaftaran"];
const METHOD_KEYS  = ["metode pembayaran","metode","payment method"];
const MASA_KEYS    = ["masa aktif","durasi","duration"];
const JENIS_KEYS   = ["jenis member","tipe member","membership","package","paket"];
const NO_MEMBER_KEYS   = ["no.member","no member","nomember","kode member","member id"];
const MEMBER_CODE_KEYS = ["member code","membercode","kode"]; // angka murni

function indexBySynonyms(headerRow, syns) {
  const norm = headerRow.map(h => normalizeKey(h));
  for (let i = 0; i < norm.length; i++) {
    if (syns.includes(norm[i])) return i;
  }
  return -1;
}

async function loadPackages() {
  const snap = await db.collection("membership_packages").get();
  const arr = [];
  const byName = new Map();
  const byId = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    const name = String(data?.name || "").trim();
    const nname = normalizeName(name);
    if (name) byName.set(nname, d.id);
    byId.set(d.id, name);
    arr.push({ id: d.id, name, nname });
  }
  return { arr, byName, byId };
}

function codeFromSheet(rowArr, idx){
  const rawNoMember = idx.noMember >=0 ? String(rowArr[idx.noMember]||"").trim() : "";
  const rawNum      = idx.memberCode>=0 ? String(rowArr[idx.memberCode]||"").trim() : "";
  let fromSheet = null, num = null;
  if (rawNoMember){
    const n = parseCodeNumber(rawNoMember);
    if (Number.isInteger(n)) { fromSheet = formatCode(n); num = n; }
  } else if (rawNum && /^\d+$/.test(rawNum)){
    const n = parseInt(rawNum,10);
    fromSheet = formatCode(n);
    num = n;
  }
  return {fromSheet, num};
}

async function importFromExcel() {
  if (!fs.existsSync(FILE)) throw new Error(`File not found: ${FILE}`);
  const wb = XLSX.readFile(path.resolve(FILE));
  const sheetName = SHEET || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found: ${sheetName}`);

  const A2 = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const headerRowIdx = A2.findIndex(row =>
    row.some(cell =>
      /^(nama|member.?code|no\.?member|no.?telep|periode.?member|harga)$/i.test(
        String(cell).replace(/\u00A0/g, " ").trim()
      )
    )
  );
  if (headerRowIdx < 0) throw new Error("Tidak menemukan baris header.");

  const headerRow = A2[headerRowIdx];

  const idx = {
    nama:       indexBySynonyms(headerRow, NAME_KEYS),
    phone:      indexBySynonyms(headerRow, PHONE_KEYS),
    periode:    indexBySynonyms(headerRow, PERIOD_KEYS),
    harga:      indexBySynonyms(headerRow, HARGA_KEYS),
    daftar:     indexBySynonyms(headerRow, DAFTAR_KEYS),
    metode:     indexBySynonyms(headerRow, METHOD_KEYS),
    masa:       indexBySynonyms(headerRow, MASA_KEYS),
    jenis:      indexBySynonyms(headerRow, JENIS_KEYS),
    noMember:   indexBySynonyms(headerRow, NO_MEMBER_KEYS),
    memberCode: indexBySynonyms(headerRow, MEMBER_CODE_KEYS),
  };

  if (DEBUG) {
    console.log("Header row index:", headerRowIdx);
    console.log("Headers detected:", headerRow.map(h => `[${h}]`).join(" "));
    console.log("Index map:", idx);
  }

  const users = await loadUsers();
  const packages = await loadPackages(); // <-- dipanggil SEKALI & digunakan di bawah

  // ====== Init member-code counter ======
  let currentMax = await initCounter();
  let running = currentMax; // naik hanya saat assign code baru
  const mapping = [];

  let success = 0, skipped = 0;

  for (let r = headerRowIdx + 1; r < A2.length; r++) {
    const rowArr = A2[r] || [];

    const row = {
      nama:      idx.nama    >= 0 ? rowArr[idx.nama]    : "",
      periode:   idx.periode >= 0 ? rowArr[idx.periode] : "",
      harga:     idx.harga   >= 0 ? rowArr[idx.harga]   : "",
      tglDaftar: idx.daftar  >= 0 ? rowArr[idx.daftar]  : "",
      metode:    idx.metode  >= 0 ? rowArr[idx.metode]  : "",
      masa:      idx.masa    >= 0 ? rowArr[idx.masa]    : "",
      jenis:     idx.jenis   >= 0 ? rowArr[idx.jenis]   : "",
      _rowIndex: r + 1,
    };

    const { fromSheet, num: numFromSheet } = codeFromSheet(rowArr, idx);

    const isBlank = !String(row.nama).trim() && !String(row.harga).trim() && !String(row.periode).trim();
    if (isBlank) { skipped++; continue; }

    const match = matchUser(row, users);

    if (!match) {
      if (LOG_UNMATCHED) console.log(`! UNMATCHED NAME: "${row.nama}"`);
      mapping.push({
        row: row._rowIndex,
        excel_name: String(row.nama || "").trim(),
        user_id: "",
        db_name: "",
        no_member: fromSheet || "",
        member_code_num: numFromSheet || "",
        status: "UNMATCHED",
      });
      continue; // Opsi C: tidak konsumsi nomor
    }

    const currentMemberCode = match.data?.[MEMBER_FIELD] || null;

    // User sudah punya code → SKIP total
    if (currentMemberCode) {
      const status = fromSheet && fromSheet !== currentMemberCode ? "ALREADY_HAS_CODE_CONFLICT" : "ALREADY_HAS_CODE";
      if (status === "ALREADY_HAS_CODE_CONFLICT") {
        console.log(`! CONFLICT user ${match.data.name}: sheet=${fromSheet} db=${currentMemberCode}`);
      }
      mapping.push({
        row: row._rowIndex,
        excel_name: String(row.nama || "").trim(),
        user_id: match.id,
        db_name: match.data.name || "",
        no_member: currentMemberCode,
        member_code_num: parseCodeNumber(currentMemberCode) ?? "",
        status,
      });
      continue;
    }

    // User belum punya code → ambil dari sheet jika ada, else generate
    let assignedNum = null;
    let assignedCode = null;

    if (fromSheet) {
      assignedCode = fromSheet;
      assignedNum  = numFromSheet;
      if (Number.isInteger(assignedNum) && assignedNum > running) running = assignedNum;
    } else {
      running += 1;
      assignedNum  = running;
      assignedCode = asPrefixed(running);
    }

    const per = parsePeriod(row.periode);
    const makePayment = !!per;

    // Update user (set memberCode, dan expiresAt bila ada periode)
    const updates = { [MEMBER_FIELD]: assignedCode };
    if (per) {
      const expiresAt = toEndOfDayTS(per.end);
      const current = match.data.expiresAt || match.data.expiredAt || null;
      const currentDate =
        current?.toDate?.() ? current.toDate() :
        current?.seconds ? new Date(current.seconds * 1000) :
        current ? new Date(current) : null;
      const doUpdateUserDate = !currentDate || (per.end.getTime() > currentDate.getTime());
      if (doUpdateUserDate) updates.expiresAt = expiresAt;
    }

    if (DRY) {
      console.log(`[DRY] users/${match.id} set ${MEMBER_FIELD}=${assignedCode}${updates.expiresAt ? " & expiresAt" : ""}`);
    } else {
      await db.collection("users").doc(match.id).set(updates, { merge: true });
    }

    // Payment bila period valid (pakai `packages` yang sudah di-load sekali)
    if (makePayment) {
      const expiresAt = toEndOfDayTS(per.end);
      const price = parseCurrency(row.harga);
      const payMonth = Math.max(1, monthsBetweenInclusive(per.start, per.end));
      const durationDays = daysBetweenInclusive(per.start, per.end);
      const durationText = row.masa || "-";
      const createdAtDate = parseIndoDate(row.tglDaftar) || new Date();
      const createdAt = Timestamp.fromDate(createdAtDate);
      const updatedAt = createdAt;
      const method = String(row.metode || DEFAULT_METHOD).toLowerCase();
      const currency = DEFAULT_CURRENCY;
      const status = DEFAULT_STATUS;

      const userPkgId = match.data.memberType || null;
      const packageId = matchPackageId(row.jenis, packages, userPkgId);
      const packageName = packageId ? (packages.byId.get(packageId) || row.jenis || null) : (row.jenis || null);

      const payDoc = {
        userId: match.id,
        price,
        currency,
        method,
        status,
        duration: durationText,
        durationDays,
        expiresAt,
        packageId: packageId || null,
        packageName: packageName || null,
        proofUrl: null,
        notes: null,
        approvedAt: null,
        approvedBy: null,
        createdAt,
        updatedAt,
        source: "excel",
        periodText: row.periode,
        payMonth,
        memberCode: assignedCode,
      };

      if (DRY) {
        console.log(`[DRY] add payments ->`, {
          userId: match.id, price, method, status,
          expiresAt: per.end.toISOString(), durationDays, packageId, packageName, memberCode: assignedCode
        });
      } else {
        await db.collection("payments").add(payDoc);
      }
    }

    mapping.push({
      row: row._rowIndex,
      excel_name: String(row.nama || "").trim(),
      user_id: match.id,
      db_name: match.data.name || "",
      no_member: assignedCode,
      member_code_num: asNumber(assignedNum),
      status: makePayment ? "OK" : "CODE_ONLY",
    });

    await bumpCounterTo(running);
    success++;
  }

  // ====== export CSV mapping utk NO.MEMBER & MEMBER CODE ======
  if (EXPORT_CSV) {
    const header = "row,excel_name,user_id,db_name,no_member,member_code_num,status\n";
    const lines = mapping.map(m =>
      [
        m.row,
        `"${(m.excel_name||"").replace(/"/g,'""')}"`,
        m.user_id,
        `"${(m.db_name||"").replace(/"/g,'""')}"`,
        m.no_member,
        m.member_code_num,
        m.status
      ].join(",")
    );
    const out = header + lines.join("\n");
    if (DRY) {
      console.log(`[DRY] CSV (${EXPORT_CSV}):\n` + out);
    } else {
      fs.writeFileSync(EXPORT_CSV, out, "utf8");
      console.log(`CSV exported -> ${EXPORT_CSV}`);
    }
  }

  console.log(`\nDONE. success=${success}, skipped(blank)=${skipped}, counter_final=${running}`);
}

// ====== Main ======
(async () => {
  console.log(`Start | DRY=${DRY} | FILE=${FILE} | SHEET=${SHEET || "(first)"} `);
  try {
    if (RENAME_NOMINAL) await renameNominalToPrice();
    await importFromExcel();
    console.log("OK.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
