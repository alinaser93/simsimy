import { memo } from "react";
import { TABS } from "../data/tabs.jsx";
import { useStore } from "../store/appStore.js";

// شريط التبويبات — لونه يتغيّر أثناء التمرير عبر متغيّر CSS ‏(--tc) بلا إعادة رسم
function CategoryTabs({ catTab, onPick }) {
  const customTabs = useStore((s) => s.customTabs);
  const allTabs = [...TABS, ...customTabs.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji }))];
  return (
    <div className="bk-tabs hide-sb">
      {allTabs.map((tb) => {
        const on = catTab === tb.id;
        return (
          <div key={tb.id}
            className={"bk-tab" + (on ? " on" : "")}
            onClick={(e) => onPick(tb.id, e.currentTarget)}>
            <span className="iconwrap" style={{ color: "var(--tc,#fff)", opacity: on ? 1 : 0.72 }}>{tb.Icon ? <tb.Icon size={24} strokeWidth={1.9} /> : <span style={{ fontSize: 22 }}>{tb.emoji}</span>}</span>
            <span className="tl" style={{ color: "var(--tc,#fff)", opacity: on ? 1 : 0.72 }}>{tb.label}</span>
            {on && <span className="bk-uline" style={{ background: "var(--tc,#fff)" }} />}
          </div>
        );
      })}
    </div>
  );
}
export default memo(CategoryTabs);
