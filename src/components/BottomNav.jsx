import { Home, RotateCcw, LayoutGrid, Printer } from "lucide-react";

const ITEMS = [
  { id: "home", l: "الرئيسية", Icon: Home },
  { id: "again", l: "اطلب مجدداً", Icon: RotateCcw },
  { id: "cats", l: "الفئات", Icon: LayoutGrid },
  { id: "print", l: "طباعة", Icon: Printer },
];

// الشريط السفلي للتنقل
export default function BottomNav({ nav, onChange }) {
  return (
    <div className="bk-nav">
      {ITEMS.map((n) => (
        <div key={n.id} className={"bk-nav-i" + (nav === n.id ? " on" : "")} onClick={() => onChange(n.id)}>
          <n.Icon className="ic" size={22} strokeWidth={2} />
          <span className="l">{n.l}</span>
        </div>
      ))}
    </div>
  );
}
