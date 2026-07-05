import { useStore } from "../store/appStore.js";
import { ChevronLeft } from "lucide-react";

// «تسوّق حسب الحاجة» — نسخة طبق الأصل من بلينكيت:
// بطاقة عريضة، صورة يمين + نص + زرّ سهم ذهبي دائري + صورة يسار
export default function ConcernRow({ tab, onOpen }) {
  const concerns = (useStore((s) => s.concerns) || []).filter((c) => c.tab === tab);
  if (concerns.length === 0) return null;

  return (
    <div className="bk-concerns">
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">تسوّق حسب الحاجة</div></div></div>
      <div className="bk-concern-list">
        {concerns.map((c) => (
          <div className="bk-concern" key={c.id} onClick={() => onOpen && onOpen("__concern_" + c.id)}
            style={{ background: c.cardBg || "linear-gradient(90deg,#fff 55%,#fbeef2)" }}>
            {/* صورة يمين (RTL) */}
            <div className="bk-concern-imgR" style={{ background: c.bg || "#F6E9EE" }}>
              {c.img ? <img src={c.img} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span>{c.e}</span>}
            </div>
            {/* النص + زرّ السهم */}
            <div className="bk-concern-mid">
              <div className="bk-concern-tx">
                <b>{c.title}</b>
                <span>{c.sub}</span>
              </div>
              <div className="bk-concern-go"><ChevronLeft size={18} strokeWidth={2.8} /></div>
            </div>
            {/* صورة يسار (RTL) */}
            <div className="bk-concern-imgL" style={{ background: c.bg2 || c.bg || "#EFE9F6" }}>
              {c.img2 ? <img src={c.img2} alt="" onError={(e) => { e.target.style.display = "none"; }} /> : <span>{c.e2 || c.e}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
