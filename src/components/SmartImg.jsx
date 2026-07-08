import { useState } from "react";

/* صورة ذكية بأسلوب بلينكيت:
   - الإيموجي يظهر افتراضياً (أثناء التحميل أو الفشل) — فلا تظهر أيقونة «الصورة مكسورة» أبداً.
   - الصورة تنكشف فقط عند نجاح تحميلها (onLoad).
   - عند الفشل تُعاد المحاولة بصمت لعدة دقائق بفواصل متزايدة، فتظهر الصور البطيئة تدريجياً مع الوقت.
     المحاولة الأولى «كسولة» (للأداء)، واللاحقة «فورية + رابط منعش» لتُعيد الطلب فعلاً. */
export default function SmartImg({ src, emoji, alt = "", className = "ph-img", emojiClass = "bk-pc-img", imgStyle, maxRetry = 12 }) {
  const [loaded, setLoaded] = useState(false);
  const [tries, setTries] = useState(0);
  const canImg = src && tries <= maxRetry;
  const effSrc = tries === 0 ? src : src + (src.includes("?") ? "&" : "?") + "_r=" + tries;
  return (
    <>
      {!loaded && <span className={emojiClass}>{emoji}</span>}
      {canImg && (
        <img
          key={tries}
          src={effSrc}
          alt={alt}
          className={className}
          style={{ ...(imgStyle || {}), display: loaded ? undefined : "none" }}
          loading={tries === 0 ? "lazy" : "eager"}
          draggable="false"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (tries < maxRetry) {
              const delay = Math.min(2000 * (tries + 1), 25000);
              setTimeout(() => setTries((t) => t + 1), delay);
            }
          }}
        />
      )}
    </>
  );
}
