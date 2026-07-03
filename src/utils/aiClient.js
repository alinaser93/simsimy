/* عميل الذكاء — ينادي دالة Netlify /.netlify/functions/ai.
   يعمل تلقائياً في الإنتاج على Netlify. عند الفشل يرجع null ليستخدم النظام القواعد المحلية. */
export async function aiCall(payload, timeoutMs = 15000) {
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
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch { return null; }
}
export const aiAvailable = () => typeof window !== "undefined" && !/localhost|127\.0\.0\.1/.test(window.location.host);
