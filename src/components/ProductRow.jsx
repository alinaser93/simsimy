import { ChevronLeft } from "lucide-react";
import ProductCard, { PROD_BG } from "./ProductCard.jsx";
import SmartImg from "./SmartImg.jsx";
import { productImgCandidates, arToEnPrompt } from "../utils/imageGen.js";
import { useStore } from "../store/appStore.js";

/* صف منتجات أفقي بأسلوب بلينكيت:
   - العنوان (وسطر التفرعات) بلا زر جانبي
   - صف أفقي من البطاقات
   - شريط «عرض المنتجات ←» عريض أسفل الصف (مصغّرات + نص وسط + سهم) */
export default function ProductRow({ title, sub, ids, cart, add, inc, dec, onSeeAll, cardBg, cardBorder, slider, autoFill }) {
  const products = useStore((s) => s.products);
  const isSlider = !!slider;
  const seedIds = ids || [];
  const extras = autoFill ? products.filter((p) => (p.cat || "") === autoFill && !seedIds.includes(p.id)).map((p) => p.id) : [];
  const finalIds = [...extras, ...seedIds];
  const all = finalIds.map((id) => products.find((x) => x.id === id)).filter(Boolean);
  const items = isSlider ? all.slice(0, 12) : all.slice(0, 6); // سلايد أفقي أو شبكة 3×2
  return (
    <>
      {title && (
        <div className="bk-sec">
          <div className="bk-sec-h">
            <div>
              <div className="bk-sec-t">{title}</div>
              {sub && <div className="bk-sec-sub">{sub}</div>}
            </div>
          </div>
        </div>
      )}
      <div className={"bk-hs hide-sb" + (isSlider ? " slide" : "")}>
        {items.map((p) => (
          <ProductCard key={p.id} p={p} qty={cart[p.id] || 0} onAdd={add} onInc={inc} onDec={dec} cardBg={cardBg} cardBorder={cardBorder} />
        ))}
      </div>
      {onSeeAll && (
        <div className="bk-seeall-bar" onClick={onSeeAll}>
          <div className="thumbs">
            {all.slice(0, 3).map((p) => (
              <span key={p.id} className="th" style={{ background: PROD_BG }}><SmartImg srcs={productImgCandidates(p)} query={arToEnPrompt(p.name)} emoji={p.e} className="" emojiClass="" /></span>
            ))}
          </div>
          <div className="txt">عرض المنتجات</div>
          <ChevronLeft size={20} strokeWidth={3} className="chev" />
        </div>
      )}
    </>
  );
}
