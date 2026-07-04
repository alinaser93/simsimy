import { ChevronLeft, ShoppingCart } from "lucide-react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";

// شريط السلة الفاخر — تدرّج زجاجي، توهّج، صور متراكبة، تقدّم توصيل مجاني مدموج
export default function CartBar({ count, total, savings, items = [] }) {
  const freeAbove = useStore((s) => s.settings.freeAbove) || 50000;
  const thumbs = items.slice(0, 3);
  const free = total >= freeAbove;
  const remain = Math.max(0, freeAbove - total);
  const pct = Math.min(100, (total / freeAbove) * 100);

  return (
    <div className={"bk-cartbar" + (free ? " is-free" : "")}>
      {/* شريط تقدّم التوصيل المجاني الفاخر */}
      <div className={"bk-cbar-free" + (free ? " done" : "")}>
        <div className="bk-cbar-free-tx">
          {free ? (
            <><span className="bk-cbar-spark">✨</span> <b>توصيل مجاني</b> على طلبك — استمتع!</>
          ) : (
            <>أضِف <b>{fmt(remain)} {CUR}</b> فقط لتحصل على <b>توصيل مجاني</b> 🚚</>
          )}
        </div>
        <div className="bk-cbar-free-bar">
          <div className="bk-cbar-free-fill" style={{ width: pct + "%" }}>
            <span className="bk-cbar-free-glow" />
          </div>
        </div>
      </div>

      {/* الشريط الرئيسي الفاخر */}
      <div className="bk-cart">
        <span className="bk-cart-shine" />
        <div className="l">
          <div className="bk-cart-thumbs" id="bk-cart-thumbs">
            {thumbs.map((p, i) => (
              <div className="th" key={p.id} style={{ zIndex: 5 - i, marginLeft: i ? -14 : 0 }}>
                {p.img ? <img src={p.img} alt="" /> : <span>{p.e}</span>}
              </div>
            ))}
            {count > 3 && <div className="th more" style={{ marginLeft: -14, zIndex: 1 }}>+{count - 3}</div>}
          </div>
          <div className="txt">
            <b>{count} {count === 1 ? "منتج" : "منتجات"}</b>
            <span>{savings > 0 ? <>وفّرت <b className="sv">{fmt(savings)}</b> {CUR}</> : `${fmt(total)} ${CUR}`}</span>
          </div>
        </div>
        <div className="view">
          <ShoppingCart size={17} strokeWidth={2.6} />
          عرض السلة
          <ChevronLeft size={19} strokeWidth={2.8} />
        </div>
      </div>
    </div>
  );
}
