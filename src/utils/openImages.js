/* صور حقيقية حرّة الترخيص من ويكيميديا كومنز (Wikimedia Commons).
   لا تُولَّد — بل تُقرأ جاهزة من شبكة توصيل سريعة، فلا ازدحام ولا انتظار.
   نبحث مرة واحدة لكل منتج ونحفظ الرابط محلياً. */

const CACHE_KEY = "bk-commons-img";
const API = "https://commons.wikimedia.org/w/api.php";

const loadCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; } };
const cache = loadCache();
let saveTimer = null;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* ممتلئ */ } }, 600);
};

const inFlight = new Map();

/* يبحث عن صورة حقيقية للمنتج ويُعيد رابطها (أو null).
   query: وصف إنجليزي قصير (مثل "red apple"). */
export function findRealImage(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return Promise.resolve(null);
  if (Object.prototype.hasOwnProperty.call(cache, q)) return Promise.resolve(cache[q]);
  if (inFlight.has(q)) return inFlight.get(q);

  const url = `${API}?action=query&format=json&origin=*&generator=search`
    + `&gsrnamespace=6&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&gsrlimit=10`
    + `&prop=imageinfo&iiprop=url&iiurlwidth=500`;

  const p = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      // فلترة الصلة: يجب أن يحتوي اسم الملف على كلمة أساسية من الوصف
      // (يمنع نتائج عشوائية مثل صورة حصان لعبارة «تصفيف الشعر»)
      const STOP = new Set(["and", "the", "for", "with", "photo", "product", "set", "bottle", "box", "pack", "bowl", "jar"]);
      const keys = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w));
      const scored = pages
        .map((pg) => {
          const t = String(pg?.title || "").toLowerCase();
          const u = pg?.imageinfo?.[0]?.thumburl;
          if (!u || !/\.(jpe?g|png)/i.test(u)) return null;
          const hits = keys.filter((k) => t.includes(k)).length;
          return { u, hits };
        })
        .filter(Boolean)
        .sort((a, b) => b.hits - a.hits);
      // إن لم تتطابق أي كلمة أساسية، لا نُرجع صورة عشوائية
      const best = scored[0];
      const hit = best && (keys.length === 0 || best.hits > 0) ? best.u : null;
      cache[q] = hit; save();
      return hit;
    } catch {
      cache[q] = null; save();   // لا تُعِد المحاولة كل مرة
      return null;
    } finally {
      inFlight.delete(q);
    }
  })();

  inFlight.set(q, p);
  return p;
}
