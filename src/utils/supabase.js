/* رفع صور المنتجات إلى Supabase Storage.
   ملاحظة: مفتاح anon عام (مخصّص للعميل) — ليس مفتاح الخدمة السري.
   يُضبط من: الأدمن ← الإعدادات ← تكامل Supabase. */
export function getSupabaseCfg() {
  try { return JSON.parse(localStorage.getItem("bk-supabase") || "null"); } catch { return null; }
}
export function setSupabaseCfg(cfg) {
  localStorage.setItem("bk-supabase", JSON.stringify(cfg || {}));
}
export async function uploadImage(file) {
  const cfg = getSupabaseCfg();
  if (!cfg || !cfg.url || !cfg.anonKey) throw new Error("لم يُضبط Supabase بعد (الإعدادات ← تكامل Supabase)");
  const bucket = cfg.bucket || "products";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${(file.name || "img").replace(/[^\w.-]/g, "")}`;
  const res = await fetch(`${cfg.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.anonKey}`, "x-upsert": "true", "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!res.ok) throw new Error("فشل الرفع: " + res.status + " — تأكد من صلاحيات bucket العامة");
  return `${cfg.url}/storage/v1/object/public/${bucket}/${path}`;
}
