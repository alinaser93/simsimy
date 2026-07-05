import TileGrid from "./TileGrid.jsx";
import ProductRow from "./ProductRow.jsx";
import Bestsellers from "./Bestsellers.jsx";
import TrioPromos from "./TrioPromos.jsx";
import BannerCarousel from "./BannerCarousel.jsx";
import BigStores from "./BigStores.jsx";
import ConcernRow from "./ConcernRow.jsx";
import { removeBlock, useStore, applyTileOverrides } from "../store/appStore.js";
import {
  GROCERY, SNACKS, BEAUTY, HOUSEHOLD, STORES_SPOTLIGHT, PICKS_LIFESTYLE,
  ELECTRONICS_TILES, DECOR_TILES, KIDS_TILES, IMPORTED_TILES,
} from "../data/collections.js";

/* عارض كتل الصفحات + وضع «المنشئ» داخل المعاينة الحيّة:
   عند فتح المتجر بـ ?builder=1 تُغلَّف كل كتلة بشريط تحكّم (إضافة قبل/بعد، حذف، تحديد) */
const EDIT = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("builder") === "1";
const TITLE = (t) => (
  <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">{t}</div></div></div>
);
const TILES = {
  grocery: ["البقالة والمطبخ", GROCERY], snacks: ["وجبات خفيفة ومشروبات", SNACKS],
  beauty: ["تسوّق حسب الفئة", BEAUTY], household: ["مستلزمات المنزل", HOUSEHOLD],
  stores: ["متاجر مميّزة", STORES_SPOTLIGHT], lifestyle: ["مختارات لأسلوب حياتك", PICKS_LIFESTYLE],
  tiles_electronics: ["تسوّق حسب الفئة", ELECTRONICS_TILES], tiles_decor: ["تسوّق حسب الفئة", DECOR_TILES],
  tiles_kids: ["تسوّق حسب الفئة", KIDS_TILES], tiles_imported: ["تسوّق حسب الفئة", IMPORTED_TILES],
};
const msg = (data) => { try { window.parent.postMessage({ bk: true, ...data }, "*"); } catch { /* لا شيء */ } };
const shortName = (b) => b.type === "builtin" ? (b.label || b.key) : b.type === "row" ? b.title : "إعلان: " + b.t;

export default function BlocksRenderer({ blocks, tabId = "home", cart, add, inc, dec, openList }) {
  const homeTiles = useStore((st) => st.homeTiles);
  const render = (b) => {
    if (b.type === "builtin") {
      if (TILES[b.key]) {
        const [t, items] = TILES[b.key];
        if ((homeTiles?.hiddenSections || []).includes(t)) return null; // القسم مخفي من الأدمن
        const shown = applyTileOverrides(t, items, homeTiles);
        if (shown.length === 0) return null;
        return <div key={b.id}>{TITLE(t)}<TileGrid items={shown} onOpen={(name) => openList(shown.find((x) => x.t === name)?.orig || name)} /></div>;
      }
      switch (b.key) {
        case "concerns": return <ConcernRow key={b.id} tab={tabId} onOpen={openList} />;
        case "bestsellers": return <Bestsellers key={b.id} onOpen={openList} />;
        case "trio": return <TrioPromos key={b.id} onOpen={openList} />;
        case "banners": return <BannerCarousel key={b.id} onOpen={openList} />;
        case "bigstores": return <BigStores key={b.id} onOpen={openList} />;
        default: return null;
      }
    }
    if (b.type === "row") {
      return (
        <ProductRow key={b.id} title={b.title} sub={b.sub || undefined} ids={b.ids || []}
          autoFill={b.cat && b.cat !== "الرائج الآن" && b.cat !== "البقالة" ? b.cat : undefined}
          slider={b.layout === "slide"} cart={cart} add={add} inc={inc} dec={dec}
          onSeeAll={() => openList(b.cat || b.title)} />
      );
    }
    if (b.type === "ad") {
      return (
        <div key={b.id} className="bk-ad" style={b.bg ? { background: b.bg } : undefined}>
          <h4>{b.t}</h4><p>{b.p}</p>
          <div className="shop">{b.cta || "تسوّق الآن"}</div>
          <div className="em">{b.e || "🛒"}</div>
          <div className="tag">إعلان</div>
        </div>
      );
    }
    return null;
  };

  const list = (blocks || []).filter((b) => !b.hidden);
  if (!EDIT) return <>{list.map(render)}</>;

  return (
    <>
      {list.map((b, i) => (
        <div key={b.id} className="bk-eblk">
          <div className="bk-ebar">
            <button className="ins" title="إدراج كتلة قبل" onClick={() => msg({ act: "insert", tabId, index: i })}>＋</button>
            <span className="nm" onClick={() => msg({ act: "select", tabId, id: b.id })}>{shortName(b)}</span>
            <button className="ins" title="إدراج كتلة بعد" onClick={() => msg({ act: "insert", tabId, index: i + 1 })}>＋</button>
            <button className="del" title="حذف الكتلة" onClick={() => removeBlock(tabId, b.id)}>✕</button>
          </div>
          {render(b)}
        </div>
      ))}
      <div className="bk-eend" onClick={() => msg({ act: "insert", tabId, index: list.length })}>＋ أضف كتلة هنا</div>
    </>
  );
}
