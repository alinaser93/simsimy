import { useEffect, useRef, useState } from "react";
import { loadImage, isKnownGood, isKnownBad } from "../utils/imgQueue.js";
import { findRealImage } from "../utils/openImages.js";
import { getCachedWebp, cacheAsWebp } from "../utils/imgCache.js";

/* صورة ذكية:
   - لا تُطلب إلا عند اقتراب البطاقة من الشاشة (لا نرهق الخدمات بمئة طلب دفعة واحدة).
   - الترتيب: صورة التاجر ← الصورة الدائمة (تخزين الموقع) ← صورة حقيقية حرّة (ويكيميديا) ← توليد بالذكاء.
   - أثناء التحميل: وميض رمادي ناعم — لا إيموجي ولا صورة مكسورة أبداً. */
export default function SmartImg({ src, srcs, query, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle }) {
  const list = (srcs && srcs.length ? srcs : (src ? [src] : [])).filter(Boolean);
  const key = list.join("|") + "::" + (query || "");
  const [okSrc, setOkSrc] = useState(() => list.find(isKnownGood) || null);
  const [near, setNear] = useState(false);
  const holder = useRef(null);

  useEffect(() => {
    if (okSrc || near) return undefined;
    const el = holder.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [okSrc, near]);

  useEffect(() => {
    let alive = true;
    const known = list.find(isKnownGood);
    if (known) { setOkSrc(known); return undefined; }
    setOkSrc(null);
    if (!near) return undefined;

    (async () => {
      // 0) ذاكرة WebP المحلية (فورية بلا شبكة)
      const cached = await getCachedWebp(key);
      if (!alive) return;
      if (cached) { setOkSrc(cached); return; }

      // 1) الروابط الجاهزة (تاجر / دائمة) — محاولة سريعة واحدة لكل منها
      const direct = list.slice(0, Math.max(0, list.length - 1));
      for (const u of direct) {
        if (isKnownBad(u)) continue;
        const ok = await loadImage(u, { attempts: 1, timeout: 5000 });
        if (!alive) return;
        if (ok) { setOkSrc(u); cacheAsWebp(key, u).then(() => getCachedWebp(key)).then((c) => { if (alive && c) setOkSrc(c); }); return; }
      }
      // 2) صورة حقيقية حرّة الترخيص (بلا توليد — الأسرع والأثبت)
      if (query) {
        const real = await findRealImage(query);
        if (!alive) return;
        if (real && !isKnownBad(real)) {
          const ok = await loadImage(real, { attempts: 2, timeout: 9000 });
          if (!alive) return;
          if (ok) { setOkSrc(real); cacheAsWebp(key, real).then(() => getCachedWebp(key)).then((c) => { if (alive && c) setOkSrc(c); }); return; }
        }
      }
      // 3) توليد بالذكاء (آخر خيار — قد يتأخّر)
      const last = list[list.length - 1];
      if (last && !isKnownBad(last)) {
        const ok = await loadImage(last, { attempts: 3, timeout: 15000 });
        if (!alive) return;
        if (ok) { setOkSrc(last); cacheAsWebp(key, last).then(() => getCachedWebp(key)).then((c) => { if (alive && c) setOkSrc(c); }); }
      }
    })();
    return () => { alive = false; };
  }, [key, near]);

  if (!okSrc) return <span ref={holder} className={emojiClass + " bk-imgph"} aria-label={alt} />;
  return <img src={okSrc} alt={alt} className={className} style={imgStyle} draggable="false" />;
}
