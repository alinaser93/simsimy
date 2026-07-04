import { ChevronLeft } from "lucide-react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";

// شريط السلة المدمج الأنيق — التقدّم خط رفيع داخل نفس الشريط
export default function CartBar({ count, total, savings, items = [] }) {
  const freeAbove = useStore((s) => s.settings.freeAbove) || 50000;
  const thumbs = items.slice(0, 3);
  const free = total >= freeAbove;
  const remain = Math.max(0, freeAbove - total);
  const pct = Math.min(100, (total / freeAbove) * 100);

  return (
    <div className={"bk-cartbar" + (free ? " is-free" : "")}>
      {/* خط تقدّم رفيع أعلى الشريط مباشرة */}
      <div className="bk-cbar-line"><div className="bk-cbar-line-fill" style={{ width: pct + "%" }} /></div>

      <div className="bk-cart">
        <span className="bk-cart-shine" />
        <div className="l">
          <div className="bk-cart-thumbs" id="bk-cart-thumbs">
            {thumbs.map((p, i) => (
              <div className="th" key={p.id} style={{ zIndex: 5 - i, marginLeft: i ? -11 : 0 }}>
                {p.img ? <img src={p.img} alt="" /> : <span>{p.e}</span>}
              </div>
            ))}
            {count > 3 && <div className="th more" style={{ marginLeft: -11, zIndex: 1 }}>+{count - 3}</div>}
          </div>
          <div className="txt">
            <b>{count} {count === 1 ? "منتج" : "منتجات"}</b>
            <span>{free ? "🎉 توصيل مجاني" : remain <= 0 ? `${fmt(total)} ${CUR}` : `أضِف ${fmt(remain)} للتوصيل المجاني`}</span>
          </div>
        </div>
        <div className="view">عرض السلة <ChevronLeft size={17} strokeWidth={2.8} /></div>
      </div>
    </div>
  );
}
