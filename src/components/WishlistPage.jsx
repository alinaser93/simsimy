import { ChevronRight, Heart } from "lucide-react";
import { useStore } from "../store/appStore.js";
import ProductCard from "./ProductCard.jsx";

/* صفحة قائمة المفضّلة — تعرض المنتجات التي أضافها المستخدم بالقلب */
export default function WishlistPage({ onBack, cart, add, inc, dec }) {
  const wishlist = useStore((s) => s.wishlist);
  const products = useStore((s) => s.products);
  const items = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="pf-page">
      <div className="pf-top">
        <button className="pf-back" onClick={onBack}><ChevronRight size={24} /></button>
        <h2>قائمة المفضّلة</h2>
      </div>
      <div className="pf-scroll">
        {items.length === 0 ? (
          <div className="wl-empty">
            <Heart size={54} strokeWidth={1.5} />
            <div className="t">قائمتك فارغة</div>
            <div className="s">اضغط ♥ على أي منتج لإضافته هنا وتجده بسهولة لاحقاً</div>
          </div>
        ) : (
          <>
            <div className="wl-count">{items.length} منتج في المفضّلة</div>
            <div className="bk-hs">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} qty={cart[p.id] || 0}
                  onAdd={() => add(p.id)} onInc={() => inc(p.id)} onDec={() => dec(p.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
