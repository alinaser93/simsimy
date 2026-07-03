import TileGrid from "./TileGrid.jsx";
import ProductRow from "./ProductRow.jsx";
import Bestsellers from "./Bestsellers.jsx";
import TrioPromos from "./TrioPromos.jsx";
import BannerCarousel from "./BannerCarousel.jsx";
import BigStores from "./BigStores.jsx";
import {
  GROCERY, SNACKS, BEAUTY, HOUSEHOLD, STORES_SPOTLIGHT, PICKS_LIFESTYLE,
} from "../data/collections.js";

/* عارض كتل الصفحات — يقرأ مصفوفة كتل من المتجر ويرسمها بالترتيب.
   يشغّل الصفحة الرئيسية والتبويبات المخصّصة من «منشئ الصفحات» في الأدمن. */
const TITLE = (t) => (
  <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">{t}</div></div></div>
);

export default function BlocksRenderer({ blocks, cart, add, inc, dec, openList }) {
  return (
    <>
      {(blocks || []).filter((b) => !b.hidden).map((b) => {
        if (b.type === "builtin") {
          switch (b.key) {
            case "bestsellers": return <Bestsellers key={b.id} onOpen={openList} />;
            case "grocery": return <div key={b.id}>{TITLE("البقالة والمطبخ")}<TileGrid items={GROCERY} onOpen={openList} /></div>;
            case "snacks": return <div key={b.id}>{TITLE("وجبات خفيفة ومشروبات")}<TileGrid items={SNACKS} onOpen={openList} /></div>;
            case "beauty": return <div key={b.id}>{TITLE("الجمال والعناية الشخصية")}<TileGrid items={BEAUTY} onOpen={openList} /></div>;
            case "household": return <div key={b.id}>{TITLE("مستلزمات المنزل")}<TileGrid items={HOUSEHOLD} onOpen={openList} /></div>;
            case "stores": return <div key={b.id}>{TITLE("متاجر مميّزة")}<TileGrid items={STORES_SPOTLIGHT} onOpen={openList} /></div>;
            case "lifestyle": return <div key={b.id}>{TITLE("مختارات لأسلوب حياتك")}<TileGrid items={PICKS_LIFESTYLE} onOpen={openList} /></div>;
            case "trio": return <TrioPromos key={b.id} onOpen={openList} />;
            case "banners": return <BannerCarousel key={b.id} onOpen={openList} />;
            case "bigstores": return <BigStores key={b.id} onOpen={openList} />;
            default: return null;
          }
        }
        if (b.type === "row") {
          return (
            <ProductRow key={b.id} title={b.title} sub={b.sub || undefined} ids={b.ids || []}
              slider={b.layout === "slide"}
              cart={cart} add={add} inc={inc} dec={dec}
              onSeeAll={() => openList(b.cat || b.title)} />
          );
        }
        if (b.type === "ad") {
          return (
            <div key={b.id} className="bk-ad" style={b.bg ? { background: b.bg } : undefined}>
              <h4>{b.t}</h4>
              <p>{b.p}</p>
              <div className="shop">{b.cta || "تسوّق الآن"}</div>
              <div className="em">{b.e || "🛒"}</div>
              <div className="tag">إعلان</div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}
