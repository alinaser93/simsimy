/* عميل الذكاء — ينادي دالة Netlify /.netlify/functions/ai.
   يعمل تلقائياً في الإنتاج على Netlify. عند الفشل يرجع null ليستخدم النظام القواعد المحلية.
   يمرّر رسالة الخطأ الحقيقية عبر onError (للتشخيص) بدل إخفائها. */
export async function aiCall(payload, timeoutMs = 15000, onError) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("/.netlify/functions/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    // اقرأ النص أولاً لنميّز بين JSON الدالة وصفحة HTML (دليل أن الدالة غير منشورة)
    const raw = await res.text();
    const looksHtml = /^\s*<(?:!doctype|html)/i.test(raw);
    if (looksHtml) { if (onError) onError("الدالة غير منشورة (رجعت صفحة بدل بيانات). تأكّد من رفع مجلد netlify/functions ونشره."); return null; }
    let data; try { data = JSON.parse(raw); } catch { if (onError) onError("رد غير صالح من الخادم"); return null; }
    if (!res.ok || data.error) { if (onError) onError(data.error || ("رمز الحالة " + res.status)); return null; }
    return data;
  } catch (e) {
    if (onError) onError(e.name === "AbortError" ? "انتهت المهلة — حاول مجدداً" : "تعذّر الاتصال بالدالة");
    return null;
  }
}
export const aiAvailable = () => typeof window !== "undefined" && !/localhost|127\.0\.0\.1/.test(window.location.host);
