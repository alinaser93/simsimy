import { useState } from "react";

/* صورة ذكية بأسلوب بلينكيت:
   - الإيموجي يظهر افتراضياً (أثناء التحميل أو عند الفشل) — فلا تظهر أيقونة «الصورة مكسورة» أبداً.
   - الصورة الحقيقية تنكشف فقط عند نجاح تحميلها (onLoad).
   - عند الفشل: تُعاد المحاولة بصمت (تحسّباً لبطء توليد صور الذكاء) ثم يبقى الإيموجي.
   className: صنف الصورة | emojiClass: صنف حاوية الإيموجي (ليطابق كل سياق). */
export default function SmartImg({ src, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle, maxRetry = 3 }) {
  const [loaded, setLoaded] = useState(false);
  const [tries, setTries] = useState(0);
  const [dead, setDead] = useState(false);
  const canImg = src && !dead;
  return (
    <>
      {!loaded && <span className={emojiClass}>{emoji}</span>}
      {canImg && (
        <img
          key={tries}
          src={src}
          alt={alt}
          className={className}
          style={{ ...(imgStyle || {}), display: loaded ? undefined : "none" }}
          loading="lazy"
          draggable="false"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (tries < maxRetry) setTimeout(() => setTries((t) => t + 1), 1500 * (tries + 1));
            else setDead(true);
          }}
        />
      )}
    </>
  );
}
