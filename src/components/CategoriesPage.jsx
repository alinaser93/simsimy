import { useStore, applyTileOverrides } from "../store/appStore.js";
import { ChevronRight } from "lucide-react";
import SmartImg from "./SmartImg.jsx";
import { catImageUrl, arToEnPrompt } from "../utils/imageGen.js";
import {
  GROCERY, SNACKS, BEAUTY, HOUSEHOLD, STORES_SPOTLIGHT, PICKS_LIFESTYLE,
  ELECTRONICS_TILES, DECOR_TILES, KIDS_TILES, IMPORTED_TILES,
} from "../data/collections.js";

// أقسام الفئات — عنوان لكل مجموعة بلاطات
const SECTIONS = [
  ["البقالة والمطبخ", GROCERY],
  ["وجبات خفيفة ومشروبات", SNACKS],
  ["الجمال والعناية", BEAUTY],
  ["مستلزمات المنزل", HOUSEHOLD],
  ["إلكترونيات وأجهزة", ELECTRONICS_TILES],
  ["ديكور وأثاث المنزل", DECOR_TILES],
  ["الأطفال والألعاب", KIDS_TILES],
  ["منتجات مستوردة", IMPORTED_TILES],
  ["متاجر مميّزة", STORES_SPOTLIGHT],
  ["مختارات لأسلوب حياتك", PICKS_LIFESTYLE],
];

/* صفحة الفئات — كل الفئات في عرض واحد قابل للتمرير (كبلينكيت) */
export default function CategoriesPage({ onOpen, onBack }) {
  const homeTiles = useStore((st) => st.homeTiles);
  return (
    <div className="bk-cats-page">
      <div className="bk-cats-head">
        <div className="bk-back" onClick={onBack}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <h2>كل الفئات</h2>
      </div>
      <div className="bk-cats-body">
        {SECTIONS.filter(([title]) => !(homeTiles?.hiddenSections || []).includes(title)).map(([title, items0], si) => {
          const items = applyTileOverrides(title, items0, homeTiles);
          return (
          <div className="bk-cats-sec" key={si}>
            <div className="bk-cats-sec-t">{title}</div>
            <div className="bk-cats-grid">
              {items.map((c, i) => (
                <div className="bk-cat-tile" key={i} onClick={() => onOpen && onOpen(c.orig || c.t)}>
                  <div className="bk-cat-tile-img" style={{ background: c.bg || "#f3f3f3" }}>
                    <SmartImg srcs={c.img ? [c.img, catImageUrl(c.t)] : [catImageUrl(c.t)]} query={arToEnPrompt(c.t)} emoji={c.e} className="" emojiClass="e" />
                  </div>
                  <div className="bk-cat-tile-t">{c.t}</div>
                </div>
              ))}
            </div>
          </div>
        ); })}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
