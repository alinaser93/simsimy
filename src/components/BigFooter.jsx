import { useStore } from "../store/appStore.js";

// الفوتر الضخم أسفل الصفحة — كما في التطبيق الأصلي
export default function BigFooter() {
  const t = useStore((s) => s.texts);
  return (
    <div className="bk-bigfoot">
      <div className="big">{t.footerBig}</div>
      <div className="tag">{t.footerTag}</div>
      <div className="mini">{t.footerMini}</div>
    </div>
  );
}
