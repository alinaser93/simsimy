import { ChevronLeft } from "lucide-react";
import SmartImg from "./SmartImg.jsx";
import { useStore } from "../store/appStore.js";

// شريط السلة المضغوط المتوسّط (كبلينكيت) — بعرض المحتوى فقط
export default function CartBar({ count, total, savings, items = [] }) {
  const freeAbove = useStore((s) => s.settings.freeAbove) || 50000;
  const thumbs = items.slice(0, 3);
  const free = total >= freeAbove;
  const pct = Math.min(100, (total / freeAbove) * 100);

  return (
    <div className={"bk-cartbar" + (free ? " is-free" : "")}>
      {/* خط تقدّم رفيع مدموج */}
      <div className="bk-cbar-line"><div className="bk-cbar-line-fill" style={{ width: pct + "%" }} /></div>

      <div className="bk-cart">
        <span className="bk-cart-shine" />
        <div className="bk-cart-thumbs" id="bk-cart-thumbs">
          {thumbs.map((p, i) => (
            <div className="th" key={p.id} style={{ zIndex: 5 - i, marginLeft: i ? -10 : 0 }}>
              <SmartImg src={p.img} emoji={p.e} className="" emojiClass="" />
            </div>
          ))}
          {count > 3 && <div className="th more" style={{ marginLeft: -10, zIndex: 1 }}>+{count - 3}</div>}
        </div>
        <div className="view">
          عرض السلة
          <span className="bk-cart-count">{count}</span>
          <ChevronLeft size={16} strokeWidth={2.8} />
        </div>
      </div>
    </div>
  );
}
