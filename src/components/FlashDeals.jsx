import { useState, useEffect, useMemo } from "react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";

// عدّاد تنازلي حتى منتصف الليل (يتجدّد يومياً)
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      setLeft(Math.max(0, Math.floor((end - now) / 1000)));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return { h, m, s };
}

/* عرض فلاش بعدّاد تنازلي — يخلق إلحاحاً ويشجّع الشراء الفوري */
export default function FlashDeals({ cart, add, inc, dec, openList }) {
  const products = useStore((st) => st.products);
  const flash = useStore((st) => st.settings.flashDeals) || {};
  const { h, m, s } = useCountdown();

  // أعلى المنتجات خصماً، متوفّرة
  const deals = useMemo(
    () => products
      .filter((p) => p.stock !== false && p.qty !== 0 && p.mrpIQD > p.priceIQD)
      .map((p) => ({ ...p, off: Math.round((1 - p.priceIQD / p.mrpIQD) * 100) }))
      .filter((p) => p.off >= (flash.minOff || 0))
      .sort((a, b) => b.off - a.off)
      .slice(0, flash.count || 10),
    [products, flash.count, flash.minOff]
  );
  if (!flash.enabled || deals.length === 0) return null;

  return (
    <div className="bk-flash">
      <div className="bk-flash-head">
        <div className="bk-flash-title">⚡ {flash.title || "عروض اليوم"} <span className="bk-flash-sub">تنتهي بعد</span></div>
        <div className="bk-flash-timer">
          <span>{h}</span>:<span>{m}</span>:<span>{s}</span>
        </div>
      </div>
      <div className="bk-flash-row">
        {deals.map((p) => {
          const qty = cart?.[p.id] || 0;
          return (
            <div className="bk-flash-card" key={p.id} onClick={() => openList && openList(p.cat)}>
              <div className="bk-flash-off">−{p.off}%</div>
              <div className="bk-flash-img" style={{ background: p.bg || "#fff" }}>
                {(p.img || (p.images && p.images[0])) ? <img src={p.img || p.images[0]} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span className="e">{p.e}</span>}
              </div>
              <div className="bk-flash-nm">{p.name}</div>
              <div className="bk-flash-prices"><b>{fmt(p.priceIQD)} {CUR}</b><s>{fmt(p.mrpIQD)}</s></div>
              {qty === 0 ? (
                <button className="bk-flash-add" onClick={(e) => { e.stopPropagation(); add && add(p.id); }}>+ إضافة</button>
              ) : (
                <div className="bk-flash-qty" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => dec && dec(p.id)}>−</button><b>{qty}</b><button onClick={() => inc && inc(p.id)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
