/* رفع صور المنتجات إلى Supabase Storage.
   يدعم صيغتَي المفتاح العام: الجديدة (sb_publishable_...) والقديمة (eyJ...).
   يُضبط من: الأدمن ← الإعدادات ← تكامل Supabase. المفتاح العام آمن للعميل. */
export function getSupabaseCfg() {
  try { return JSON.parse(localStorage.getItem("bk-supabase") || "null"); } catch { return null; }
}
export function setSupabaseCfg(cfg) {
  localStorage.setItem("bk-supabase", JSON.stringify(cfg || {}));
}
// ينظّف الرابط: يزيل /rest/v1/ أو /storage/... أو الشرطة الأخيرة → يبقي أساس المشروع فقط
function baseUrl(url) {
  return (url || "").trim().replace(/\/(rest|storage|auth)\/v1\/?.*$/, "").replace(/\/+$/, "");
}
export async function uploadImage(file) {
  const cfg = getSupabaseCfg();
  if (!cfg || !cfg.url || !cfg.anonKey) throw new Error("لم يُضبط Supabase بعد (الإعدادات ← تكامل Supabase)");
  const url = baseUrl(cfg.url);
  const bucket = cfg.bucket || "products";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${(file.name || "img").replace(/[^\w.-]/g, "")}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: cfg.anonKey,                       // مطلوب للمفتاح الجديد sb_publishable_
      Authorization: `Bearer ${cfg.anonKey}`,    // متوافق مع الصيغة القديمة أيضاً
      "x-upsert": "true",
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });
  if (!res.ok) {
    let msg = res.status + "";
    try { const j = await res.json(); msg += " — " + (j.message || j.error || ""); } catch { /* لا شيء */ }
    throw new Error("فشل الرفع: " + msg + " (تأكّد من تشغيل SQL وأن bucket عام)");
  }
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
