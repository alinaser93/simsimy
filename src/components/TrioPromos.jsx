import { ChevronLeft } from "lucide-react";
import { useStore } from "../store/appStore.js";

// ثلاث بطاقات طويلة (صيدلية / حيوانات / أطفال)
export default function TrioPromos({ onOpen }) {
  const TRIO_PROMOS = useStore((s) => s.trio);
  return (
    <div className="bk-trio">
      {TRIO_PROMOS.map((c, i) => (
        <div className="bk-trio-c" key={i} style={{ background: c.bg }} onClick={() => onOpen(c.t)}>
          <div className="e">{c.e}</div>
          <div className="t" style={{ color: c.fg }}>{c.t}</div>
          <div className="s">{c.sub}</div>
          <div className="go" style={{ color: c.fg }}>تسوّق <ChevronLeft size={13} strokeWidth={2.8} /></div>
        </div>
      ))}
    </div>
  );
}
