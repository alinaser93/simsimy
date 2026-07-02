import { memo } from "react";
import { TABS } from "../data/tabs.jsx";

// شريط التبويبات — لونه يتغيّر أثناء التمرير عبر متغيّر CSS ‏(--tc) بلا إعادة رسم
function CategoryTabs({ catTab, onPick }) {
  return (
    <div className="bk-tabs hide-sb">
      {TABS.map((tb) => {
        const on = catTab === tb.id;
        return (
          <div key={tb.id}
            className={"bk-tab" + (on ? " on" : "")}
            onClick={(e) => onPick(tb.id, e.currentTarget)}>
            <span className="iconwrap" style={{ color: "var(--tc,#fff)", opacity: on ? 1 : 0.72 }}><tb.Icon size={24} strokeWidth={1.9} /></span>
            <span className="tl" style={{ color: "var(--tc,#fff)", opacity: on ? 1 : 0.72 }}>{tb.label}</span>
            {on && <span className="bk-uline" style={{ background: "var(--tc,#fff)" }} />}
          </div>
        );
      })}
    </div>
  );
}
export default memo(CategoryTabs);
