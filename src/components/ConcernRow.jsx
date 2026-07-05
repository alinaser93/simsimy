import { useStore } from "../store/appStore.js";
import { ChevronLeft } from "lucide-react";

// «تسوّق حسب الحاجة» (Shop by concern) — بطاقات لكل تبويب
export default function ConcernRow({ tab, onOpen }) {
  const concerns = (useStore((s) => s.concerns) || []).filter((c) => c.tab === tab);
  if (concerns.length === 0) return null;

  return (
    <div className="bk-concerns">
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">تسوّق حسب الحاجة</div></div></div>
      <div className="bk-concern-list">
        {concerns.map((c) => (
          <div className="bk-concern" key={c.id} onClick={() => onOpen && onOpen("__concern_" + c.id)}>
            <div className="bk-concern-ic" style={{ background: c.bg || "#F6E9EE" }}>
              {c.img ? <img src={c.img} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span>{c.e}</span>}
            </div>
            <div className="bk-concern-tx">
              <b>{c.title}</b>
              <span>{c.sub}</span>
            </div>
            <ChevronLeft size={20} className="bk-concern-arrow" strokeWidth={2.4} />
          </div>
        ))}
      </div>
    </div>
  );
}
