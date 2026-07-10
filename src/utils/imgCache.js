/* ذاكرة صور دائمة في المتصفح (IndexedDB):
   أي صورة تُحمَّل بنجاح (من أي مصدر) تُحوَّل إلى WebP وتُخزَّن محلياً.
   في الزيارات التالية تُعرض فوراً من الذاكرة — بلا شبكة وبلا انتظار. */

const DB_NAME = "bk-img-db";
const STORE = "webp";
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbPut(key, blob) {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
  } catch { /* تجاهل */ }
}

const urlCache = new Map();   // key -> objectURL (لتفادي إنشاء روابط مكرّرة)

/* يُعيد رابط WebP محلياً إن كانت الصورة مخزّنة مسبقاً، وإلا null. */
export async function getCachedWebp(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const blob = await idbGet(key);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urlCache.set(key, u);
  return u;
}

/* يحوّل صورة محمّلة إلى WebP ويخزّنها. يعمل بصمت — أي فشل يُتجاهل. */
export async function cacheAsWebp(key, url, size = 500) {
  try {
    if (!url || url.startsWith("data:") || url.startsWith("blob:")) return;
    if (await idbGet(key)) return;                       // مخزّنة مسبقاً
    const img = new Image();
    img.crossOrigin = "anonymous";                       // مطلوب لتفادي تلويث الـcanvas
    const loaded = await new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); img.src = url; });
    if (!loaded || !img.naturalWidth) return;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, size, size);
    // احتواء الصورة داخل مربّع بلا تشويه
    const r = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * r, h = img.naturalHeight * r;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const blob = await new Promise((res) => c.toBlob(res, "image/webp", 0.82));
    if (blob && blob.size > 500) await idbPut(key, blob);
  } catch { /* تلويث canvas أو منع CORS — تجاهل */ }
}
