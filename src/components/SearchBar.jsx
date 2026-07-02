import { memo } from "react";
import { Search, Mic } from "lucide-react";

// شريط البحث — تلميحات متغيّرة حسب التبويب
function SearchBar({ theme, hint, catTab }) {
  return (
    <div className="bk-search" style={{ background: theme.searchBg }}>
      <Search size={20} strokeWidth={2.4} color={theme.searchIcon} />
      <div className="ph" style={{ color: theme.searchText }}>
        {catTab === "all"
          ? <>ابحث عن طحين، عدس، كولا و<b style={{ color: theme.searchText }}>{theme.hints[hint]}</b></>
          : <>ابحث عن {theme.hints[hint]}</>}
      </div>
      <div className="bk-mic" />
      <Mic size={20} strokeWidth={2} color={theme.searchIcon} />
    </div>
  );
}
export default memo(SearchBar);
