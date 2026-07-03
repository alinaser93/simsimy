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
export async function uploadImage(file) {
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
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
