/* رفع صور المنتجات إلى Supabase Storage.
   مصدر الإعداد: تجاوز محلي (اختبار) ← ثم src/config.js الدائم (يعمل لكل الأجهزة).
   يدعم صيغتَي المفتاح العام: الجديدة (sb_publishable_...) والقديمة (eyJ...). */
import { SUPABASE } from "../config.js";

export function getSupabaseCfg() {
  let local = null;
  try { local = JSON.parse(localStorage.getItem("bk-supabase") || "null"); } catch { local = null; }
  const cfg = local && local.url && local.anonKey ? local : SUPABASE;
  return cfg && cfg.url && cfg.anonKey ? cfg : null;
}
export function setSupabaseCfg(cfg) {
  localStorage.setItem("bk-supabase", JSON.stringify(cfg || {}));
}
// هل الإعداد الدائم (المرفوع) موجود؟ (يعني كل الأجهزة تعمل)
export function hasBakedConfig() {
  return !!(SUPABASE && SUPABASE.url && SUPABASE.anonKey);
}
function baseUrl(url) {
  return (url || "").trim().replace(/\/(rest|storage|auth)\/v1\/?.*$/, "").replace(/\/+$/, "");
}

// يتحقّق أن رابط الصورة يفتح فعلاً (أي أن الـbucket «عام» للقراءة).
// يستخدم عنصر <img> — يعمل عبر الأصول (cross-origin) بلا مشاكل CORS.
export function imageLoads(src, timeoutMs = 7000) {
  return new Promise((resolve) => {
    if (!src) { resolve(false); return; }
    const img = new Image();
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const t = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => { clearTimeout(t); finish(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(t); finish(false); };
    img.src = src;
  });
}

/* رابط الصورة الدائم لمنتج — محسوب من رقم المنتج، فيعرفه كل جهاز بلا مزامنة.
   يُنشأ مرة واحدة برفع الصورة إلى هذا المسار من لوحة الإدارة. */
export function productImageUrl(id) {
  const cfg = getSupabaseCfg();
  if (!cfg || id == null) return null;
  const url = baseUrl(cfg.url);
  const bucket = cfg.bucket || "products";
  return `${url}/storage/v1/object/public/${bucket}/prod-${id}.webp`;
}

/* يرفع صورة إلى مسار محدد (يستبدل الموجود). يُعيد الرابط العام. */
export async function uploadImageAt(path, blob, contentType = "image/webp") {
  const cfg = getSupabaseCfg();
  if (!cfg) throw new Error("لم يُضبط Supabase بعد");
  const url = baseUrl(cfg.url);
  const bucket = cfg.bucket || "products";
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      "x-upsert": "true",
      "Content-Type": contentType,
    },
    body: blob,
  });
  if (!res.ok) {
    let msg = res.status + "";
    try { const j = await res.json(); msg += " — " + (j.message || j.error || ""); } catch { /* لا شيء */ }
    throw new Error("فشل الرفع: " + msg);
  }
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

// يرفع الملف ويُعيد الرابط العام — لكن فقط إن كان الرابط **يفتح فعلاً**.
// إن نجح الرفع لكن القراءة محجوبة (bucket ليس عاماً)، يُعيد null ليستخدم المُنادي نسخة base64
// فتظهر الصورة دائماً على الجهاز. مرِّر verify=false لتخطّي التحقّق (نادراً).
export async function uploadImage(file, verify = true) {
  const cfg = getSupabaseCfg();
  if (!cfg) throw new Error("لم يُضبط Supabase بعد");
  const url = baseUrl(cfg.url);
  const bucket = cfg.bucket || "products";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${(file.name || "img").replace(/[^\w.-]/g, "")}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      "x-upsert": "true",
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });
  if (!res.ok) {
    let msg = res.status + "";
    try { const j = await res.json(); msg += " — " + (j.message || j.error || ""); } catch { /* لا شيء */ }
    throw new Error("فشل الرفع: " + msg);
  }
  const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}`;
  // تحقّق أن الرابط يفتح (الـbucket عام للقراءة). إن لم يفتح، أعِد null → يُستخدم base64.
  if (verify) {
    const ok = await imageLoads(publicUrl, 7000);
    if (!ok) return null;
  }
  return publicUrl;
}

/* تشخيص شامل لإعداد Supabase — يفحص الرفع **والقراءة** ويُعيد نتيجة مفصّلة.
   النتيجة: { ok, upload, read, url, error, hint } */
export async function diagnoseSupabase() {
  const cfg = getSupabaseCfg();
  if (!cfg) return { ok: false, upload: false, read: false, error: "لم يُضبط Supabase (لا رابط أو مفتاح)", hint: "أدخل رابط المشروع والمفتاح العام أعلاه." };
  // صورة PNG صغيرة 1×1 كاختبار
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const file = new File([bytes], "bk-selftest.png", { type: "image/png" });
  let url = null;
  // 1) اختبار الرفع (بلا تحقّق تلقائي — نتحقّق يدوياً لنميّز السبب)
  try {
    url = await uploadImage(file, false);
  } catch (e) {
    return {
      ok: false, upload: false, read: false, error: e.message,
      hint: "الرفع نفسه محجوب. تأكّد أن الـbucket «products» موجود، وأن سياسة (Policy) تسمح بالرفع للمفتاح العام (anon insert).",
    };
  }
  // 2) اختبار القراءة (هل الرابط يفتح؟)
  const read = await imageLoads(url, 7000);
  if (!read) {
    return {
      ok: false, upload: true, read: false, url,
      error: "الرفع يعمل، لكن قراءة الصورة محجوبة.",
      hint: "الـbucket ليس «عاماً» (Public). افتح لوحة Supabase ← Storage ← bucket «products» ← فعّل «Public bucket». عندها ستظهر كل صورك الحالية فوراً بلا إعادة رفع.",
    };
  }
  return { ok: true, upload: true, read: true, url, hint: "كل شيء سليم — الصور تُرفع وتُقرأ وتظهر على كل الأجهزة." };
}
