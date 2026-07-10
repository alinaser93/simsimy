import { useEffect } from "react";
import { loadImage, isKnownGood, isKnownBad } from "../utils/imgQueue.js";
import { findRealImage } from "../utils/openImages.js";
import { productImgCandidates, arToEnPrompt } from "../utils/imageGen.js";
import { getCachedWebp, cacheAsWebp } from "../utils/imgCache.js";

/* تحميل مسبق هادئ: بعد ما تستقر الصفحة، نجهّز صور بقية المنتجات في الخلفية
   حتى تظهر فوراً عند التمرير — بلا مزاحمة الصور المرئية (نبدأ متأخّرين وبتمهّل). */
export default function useImageWarmup(products, { start = 4000, gap = 220, max = 70 } = {}) {
  useEffect(() => {
    if (!products || !products.length) return undefined;
    let alive = true;
    let timer = null;

    const warmOne = async (p) => {
      const cand = productImgCandidates(p);
      const key = cand.join("|") + "::" + arToEnPrompt(p.name || "");
      if (await getCachedWebp(key)) return;            // مخزّنة محلياً — لا شيء نفعله
      if (cand.some(isKnownGood)) return;

      // جرّب الروابط الجاهزة سريعاً، ثم الصورة الحقيقية الحرّة
      for (const u of cand.slice(0, Math.max(0, cand.length - 1))) {
        if (isKnownBad(u)) continue;
        if (await loadImage(u, { attempts: 1, timeout: 5000 })) { cacheAsWebp(key, u); return; }
        if (!alive) return;
      }
      const real = await findRealImage(arToEnPrompt(p.name || ""));
      if (!alive || !real || isKnownBad(real)) return;
      if (await loadImage(real, { attempts: 1, timeout: 9000 })) cacheAsWebp(key, real);
    };

    const run = async () => {
      const list = products.slice(0, max);
      for (const p of list) {
        if (!alive) return;
        await warmOne(p).catch(() => {});
        await new Promise((r) => { timer = setTimeout(r, gap); });   // تمهّل: لا نُغرق الخدمات
      }
    };

    // ابدأ بعد أن تُحمَّل الصور المرئية أولاً
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
    const boot = setTimeout(() => idle(() => { if (alive) run(); }), start);

    return () => { alive = false; clearTimeout(boot); clearTimeout(timer); };
  }, [products, start, gap, max]);
}
