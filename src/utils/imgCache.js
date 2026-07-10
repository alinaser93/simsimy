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


/* إزالة الخلفية البيضاء: يملأ من الحواف نحو الداخل ويجعل البكسلات البيضاء شفافة.
   يُطبَّق فقط على صور المنتجات ذات الخلفية البيضاء (لا على الصور الفوتوغرافية الطبيعية). */
function removeWhiteBackground(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const idx = (x, y) => (y * w + x) * 4;
  const isWhite = (i, hard) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return r >= (hard ? 238 : 224) && g >= (hard ? 238 : 224) && b >= (hard ? 238 : 224) && mx - mn <= 14;
  };
  // هل الحواف بيضاء فعلاً؟ (وإلا فهي صورة طبيعية — لا نلمسها)
  let edge = 0, edgeWhite = 0;
  for (let x = 0; x < w; x++) { [0, h - 1].forEach((y) => { edge++; if (isWhite(idx(x, y), false)) edgeWhite++; }); }
  for (let y = 0; y < h; y++) { [0, w - 1].forEach((x) => { edge++; if (isWhite(idx(x, y), false)) edgeWhite++; }); }
  if (edgeWhite / edge < 0.7) return false;

  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) { seen[y * w + x] = 1; stack.push(x, y); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  let cleared = 0;
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    const i = idx(x, y);
    if (!isWhite(i, false)) continue;          // حدّ المنتج — توقّف
    px[i + 3] = isWhite(i, true) ? 0 : 90;     // حافة ناعمة بدل قصّ حادّ
    cleared++;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  if (cleared / (w * h) > 0.97) return false;  // الصورة فارغة تقريباً — تراجع
  ctx.putImageData(data, 0, 0);
  return true;
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
    const ctx = c.getContext("2d");     // خلفية شفافة (لا نملأها بالأبيض)
    // احتواء الصورة داخل مربّع بلا تشويه
    const r = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * r, h = img.naturalHeight * r;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    removeWhiteBackground(ctx, size, size);   // اجعل الخلفية البيضاء شفافة
    const blob = await new Promise((res) => c.toBlob(res, "image/webp", 0.85));
    if (blob && blob.size > 500) await idbPut(key, blob);
  } catch { /* تلويث canvas أو منع CORS — تجاهل */ }
}
