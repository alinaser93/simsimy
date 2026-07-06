import { useStore } from "../store/appStore.js";
import SmartImg from "./SmartImg.jsx";
import { ChevronLeft } from "lucide-react";

// «تسوّق حسب الحاجة» — تصميم بلينكيت: صورة كبيرة + نص + زرّ سهم دائري
export default function ConcernRow({ tab, onOpen }) {
  const concerns = (useStore((s) => s.concerns) || []).filter((c) => c.tab === tab);
  if (concerns.length === 0) return null;

  return (
    <div className="bk-concerns">
      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">تسوّق حسب الحاجة</div></div></div>
      <div className="bk-concern-list">
        {concerns.map((c) => (
          <div className="bk-concern" key={c.id} onClick={() => onOpen && onOpen("__concern_" + c.id)}>
            <div className="bk-concern-img" style={{ background: c.bg || "#F6E9EE" }}>
              <SmartImg src={c.img} emoji={c.e} className="" emojiClass="" />
            </div>
            <div className="bk-concern-tx">
              <b>{c.title}</b>
              <span>{c.sub}</span>
            </div>
            <div className="bk-concern-go"><ChevronLeft size={15} strokeWidth={3} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
