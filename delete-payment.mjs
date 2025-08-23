// ESM script: hapus payments/<id> dan file di Storage dari field proofUrl
// Pemakaian:
//   node delete-payment.mjs 3eqw6o5mEAaQPztYyQhN
//   node delete-payment.mjs --id 3eqw6o5mEAaQPztYyQhN
//   node delete-payment.mjs id1 id2 id3 --dry
// Opsi:
//   --dry           : tampilkan rencana, tapi tidak menghapus apa pun
//   --bucket <name> : override bucket (default: dari app.options / <project-id>.appspot.com)
//   --keep-image    : hanya hapus dokumen Firestore, biarkan file
//   --keep-doc      : hanya hapus file, biarkan dokumen

import admin from "firebase-admin";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// >>> sesuaikan path JSON credential-mu
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // boleh dikosongkan; bucket akan ditentukan otomatis di bawah
  // storageBucket: "your-bucket.appspot.com",
});

const db = admin.firestore();

// ===== CLI flags =====
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const getAfter = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
};

const DRY = has("--dry");
const OVERRIDE_BUCKET = getAfter("--bucket");
const KEEP_IMAGE = has("--keep-image");
const KEEP_DOC = has("--keep-doc");

// ambil daftar id dari argumen bebas atau --id
const idsFromPositional = argv.filter((a) => !a.startsWith("--"));
const idFromFlag = getAfter("--id");
const IDS = [...new Set([...(idFromFlag ? [idFromFlag] : []), ...idsFromPositional])].filter(Boolean);

if (IDS.length === 0) {
  console.error("❌ Tidak ada payment ID. Contoh: node delete-payment.mjs --id 3eqw6o5mEAaQPztYyQhN");
  process.exit(2);
}

// ===== helper bucket =====
const FALLBACK_BUCKET =
  OVERRIDE_BUCKET ||
  admin.app().options.storageBucket ||
  serviceAccount.storageBucket ||
  `${serviceAccount.project_id}.appspot.com`;

function bucketFor(name) {
  return admin.storage().bucket(name || FALLBACK_BUCKET);
}

// ===== parse URL proof =====
function parseProofUrl(url, defaultBucket = FALLBACK_BUCKET) {
  if (!url || typeof url !== "string") return null;

  try {
    if (url.startsWith("gs://")) {
      // gs://bucket/path/to/file.jpg
      const s = url.slice(5);
      const idx = s.indexOf("/");
      if (idx === -1) return null;
      const bucket = s.slice(0, idx);
      const path = s.slice(idx + 1);
      return { bucket, path };
    }

    const u = new URL(url);

    // v0 Firebase endpoint: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?...
    if (u.hostname.includes("firebasestorage.googleapis.com")) {
      const bucketMatch = u.pathname.match(/\/b\/([^/]+)\//);
      const encPath = u.pathname.split("/o/")[1]?.split("?")[0];
      if (encPath) {
        const bucket = bucketMatch?.[1] || defaultBucket;
        const path = decodeURIComponent(encPath);
        return { bucket, path };
      }
    }

    // Google Cloud Storage: https://storage.googleapis.com/<bucket>/<path>
    if (u.hostname === "storage.googleapis.com") {
      const parts = u.pathname.replace(/^\/+/, "").split("/");
      const bucket = parts.shift();
      const path = decodeURIComponent(parts.join("/"));
      if (bucket && path) return { bucket, path };
    }

    // kalau bukan pola di atas, coba tebak: bagian setelah /o/
    const encPath = url.split("/o/")[1]?.split("?")[0];
    if (encPath) {
      return { bucket: defaultBucket, path: decodeURIComponent(encPath) };
    }
  } catch {
    // noop
  }
  return null;
}

// ===== hapus file proof =====
async function deleteProofIfAny(data, label = "") {
  const url =
    data?.proofUrl || data?.proofURL || data?.proof_url || data?.receiptUrl || data?.receiptURL || null;
  if (!url) {
    console.log(`ℹ️  (${label}) tidak ada proofUrl`);
    return false;
  }

  const parsed = parseProofUrl(url);
  if (!parsed) {
    console.warn(`⚠️  (${label}) proofUrl tidak bisa di-parse: ${url}`);
    return false;
  }

  const gs = `gs://${parsed.bucket}/${parsed.path}`;
  if (DRY) {
    console.log(`[DRY] hapus file -> ${gs}`);
    return true;
  }

  try {
    await bucketFor(parsed.bucket).file(parsed.path).delete({ ignoreNotFound: true });
    console.log(`✅ File terhapus: ${gs}`);
    return true;
  } catch (e) {
    console.warn(`⚠️  Gagal hapus file ${gs}:`, e.message || e);
    return false;
  }
}

// ===== hapus dokumen payment =====
async function deletePaymentById(id) {
  const ref = db.collection("payments").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(`⚠️  payments/${id} tidak ditemukan`);
    return;
  }
  const data = snap.data();

  // 1) hapus file (kecuali diminta keep)
  if (!KEEP_IMAGE) {
    await deleteProofIfAny(data, `payments/${id}`);
  } else {
    console.log(`ℹ️  (payments/${id}) skip hapus file (--keep-image)`);
  }

  // 2) hapus dokumen
  if (KEEP_DOC) {
    console.log(`ℹ️  (payments/${id}) skip hapus dokumen (--keep-doc)`);
  } else if (DRY) {
    console.log(`[DRY] hapus dokumen -> payments/${id}`);
  } else {
    await ref.delete();
    console.log(`🗑️  Dokumen terhapus: payments/${id}`);
  }
}

// ===== main =====
(async () => {
  console.log(
    `Start delete | DRY=${DRY} | bucket=${OVERRIDE_BUCKET || FALLBACK_BUCKET} | keepImage=${KEEP_IMAGE} | keepDoc=${KEEP_DOC}`
  );
  for (const id of IDS) {
    await deletePaymentById(id);
  }
  console.log("Selesai.");
  process.exit(0);
})();
