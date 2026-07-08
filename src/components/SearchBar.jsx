import { memo } from "react";
import { Search, Mic } from "lucide-react";

// شريط البحث — يعرض اسم منتج شعبي حقيقي يتغيّر كل ثانيتين بحركة انسيابية
function SearchBar({ theme, hint, hints }) {
  const name = (hints && hints[hint]) || "منتجاتنا";
  return (
    <div className="bk-search" style={{ background: theme.searchBg }}>
      <Search size={20} strokeWidth={2.4} color={theme.searchIcon} />
      <div className="ph" style={{ color: theme.searchText }}>
        ابحث عن <b key={hint} className="bk-ph-rot" style={{ color: theme.searchText, fontWeight: 700 }}>«{name}»</b>
      </div>
      <div className="bk-mic" />
      <Mic size={20} strokeWidth={2} color={theme.searchIcon} />
    </div>
  );
}
export default memo(SearchBar);
