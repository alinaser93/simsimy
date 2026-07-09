/* طابور تحميل الصور — يمنع «خنق» خدمة توليد الصور.
   المشكلة: الصفحة تطلب 100+ صورة دفعة واحدة، فخدمة الذكاء المجانية ترفض أغلبها.
   الحل: نحمّل عدداً محدوداً في آنٍ واحد (بالتتابع)، مع إعادة محاولة هادئة،
   ونحفظ الروابط الناجحة محلياً لتظهر فوراً في الزيارات القادمة. */

const MAX_CONCURRENT = 4;      // كم صورة تُحمّل في نفس الوقت
const MAX_ATTEMPTS = 4;        // محاولات كل صورة
const TIMEOUT_MS = 12000;      // مهلة المحاولة الواحدة
const OK_KEY = "bk-img-ok";    // ذاكرة الروابط الناجحة

let active = 0;
const queue = [];
const inFlight = new Map();    // url -> Promise (منع الطلب المكرر)
const badSet = new Set();      // روابط فشلت نهائياً في هذه الجلسة (لا نعيدها)

const loadOk = () => { try { return new Set(JSON.parse(localStorage.getItem(OK_KEY) || "[]")); } catch { return new Set(); } };
const okSet = loadOk();
let saveTimer = null;
const saveOk = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(OK_KEY, JSON.stringify([...okSet].slice(-500))); } catch { /* ممتلئ */ }
  }, 800);
};

// هل نعرف مسبقاً أن هذا الرابط يعمل؟ (يُعرض فوراً بلا انتظار)
export function isKnownGood(url) { return !!url && okSet.has(url); }
// هل فشل هذا الرابط نهائياً في هذه الجلسة؟ (نتخطّاه فوراً)
export function isKnownBad(url) { return !!url && badSet.has(url); }

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    attempt(job, job.attempt || 1);
  }
}

function attempt(job, n) {
  const maxAttempts = job.attempts || MAX_ATTEMPTS;
  const timeoutMs = job.timeout || TIMEOUT_MS;
  const img = new Image();
  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    active--;                       // حرّر الخانة فوراً — لا تحجزها أثناء انتظار المحاولة التالية
    if (ok) {
      if (!job.url.startsWith("data:")) { okSet.add(job.url); saveOk(); }
      job.resolve(true);
    } else if (n < maxAttempts) {
      // أعِد الصورة لآخر الطابور بعد مهلة، فلا تعطّل بقية الصور
      setTimeout(() => { queue.push({ ...job, attempt: n + 1 }); pump(); }, 1500 * n);
    } else {
      badSet.add(job.url);
      job.resolve(false);
    }
    pump();
  };
  const timer = setTimeout(() => finish(false), timeoutMs);
  img.onload = () => finish(img.naturalWidth > 0);
  img.onerror = () => finish(false);
  img.src = job.url;
}

/* حمّل صورة عبر الطابور. يُعيد Promise<boolean> (نجحت أم لا). */
export function loadImage(url, opts = {}) {
  if (!url) return Promise.resolve(false);
  if (okSet.has(url)) return Promise.resolve(true);
  if (badSet.has(url)) return Promise.resolve(false);
  // الصور المحلية (base64/blob) لا تحتاج طابوراً — حمّلها فوراً
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im.naturalWidth > 0);
      im.onerror = () => resolve(false);
      im.src = url;
    });
  }
  if (inFlight.has(url)) return inFlight.get(url);
  const p = new Promise((resolve) => {
    queue.push({ url, resolve, attempts: opts.attempts, timeout: opts.timeout });
    pump();
  }).then((ok) => { inFlight.delete(url); return ok; });
  inFlight.set(url, p);
  return p;
}
