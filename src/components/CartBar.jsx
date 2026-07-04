import { ChevronLeft } from "lucide-react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";

// شريط السلة العائم (مستوحى من بلينكيت) — صور مصغّرة + تقدّم التوصيل المجاني مدموج
export default function CartBar({ count, total, savings, items = [] }) {
  const freeAbove = useStore((s) => s.settings.freeAbove) || 50000;
  const thumbs = items.slice(0, 3);
  const free = total >= freeAbove;
  const remain = Math.max(0, freeAbove - total);
  const pct = Math.min(100, (total / freeAbove) * 100);

  return (
    <div className="bk-cartbar">
      {/* شريط تقدّم التوصيل المجاني المدموج */}
      <div className={"bk-cbar-free" + (free ? " done" : "")}>
        <div className="bk-cbar-free-tx">
          {free ? <>🎉 <b>مبروك! توصيل مجاني</b> على طلبك</> : <>أضِف <b>{fmt(remain)} {CUR}</b> واحصل على <b>توصيل مجاني</b></>}
        </div>
        <div className="bk-cbar-free-bar"><div className="bk-cbar-free-fill" style={{ width: pct + "%" }} /></div>
      </div>

      {/* الشريط الأخضر الرئيسي */}
      <div className="bk-cart">
        <div className="l">
          <div className="bk-cart-thumbs">
            {thumbs.map((p, i) => (
              <div className="th" key={p.id} style={{ zIndex: 5 - i, marginLeft: i ? -12 : 0 }}>
                {p.img ? <img src={p.img} alt="" /> : <span>{p.e}</span>}
              </div>
            ))}
            {count > 3 && <div className="th more" style={{ marginLeft: -12, zIndex: 1 }}>+{count - 3}</div>}
          </div>
          <div className="txt">
            <b>{count} {count === 1 ? "منتج" : "منتجات"}</b>
            <span>{savings > 0 ? `وفّرت ${fmt(savings)} ${CUR}` : `${fmt(total)} ${CUR}`}</span>
          </div>
        </div>
        <div className="view">عرض السلة <ChevronLeft size={20} strokeWidth={2.6} /></div>
      </div>
    </div>
  );
}
