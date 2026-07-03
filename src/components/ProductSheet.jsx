import { useRef, useState } from "react";
import { ChevronRight, Heart, Share2, Clock, Star } from "lucide-react";
import { useStore } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import ProductRow from "./ProductRow.jsx";

/* صفحة تفاصيل المنتج — كما في التطبيق الأصلي:
   صورة كبيرة، شريط علوي لاصق عند التمرير، لماذا بلينكيت، المواصفات،
   الوصف، سياسة الاستبدال، منتجات مشابهة، واشترى الناس أيضاً */
export default function ProductSheet({ id, cart, add, inc, dec, onClose }) {
  const [vi, setVi] = useState(0);
  const [ii, setIi] = useState(0);
  const touch = useRef({ x: 0, dx: 0 });
  const products = useStore((s) => s.products);
  const appName = useStore((s) => s.texts.appName);
  const p = products.find((x) => x.id === id);
  const [bar, setBar] = useState(false);
  const bodyRef = useRef(null);
  if (!p) return null;

  const imgs = (p.images && p.images.length ? p.images : (p.img ? [p.img] : []));
  const variants = p.variants || [];
  const sel = variants[vi] || null;
  const price = sel ? sel.priceIQD : p.priceIQD;
  const mrp = sel ? (sel.mrpIQD || sel.priceIQD) : p.mrpIQD;
  const curImg = imgs[ii] || null;
  const qty = cart[p.id] || 0;
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const similar = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 6).map((x) => x.id);
  const also = products.filter((x) => x.cat !== p.cat && x.merchantId === p.merchantId && x.id !== p.id).slice(0, 6).map((x) => x.id);
  const oos = p.stock === false;

  const Adder = ({ big }) => (
    qty === 0
      ? <button className="bk-add" disabled={oos} style={{ fontSize: big ? 14 : 12, padding: big ? "9px 26px" : undefined, opacity: oos ? 0.45 : 1 }} onClick={() => !oos && add(p.id)}>{oos ? "غير متوفر" : "أضف"}</button>
      : <div className="bk-step" style={big ? { minWidth: 96, height: 40 } : undefined}>
          <button onClick={() => dec(p.id)} aria-label="إنقاص">−</button>
          <span className="q">{qty}</span>
          <button onClick={() => inc(p.id)} aria-label="زيادة">+</button>
        </div>
  );

  return (
    <div className="bk-page" style={{ zIndex: 45 }}>
      <div className={"bk-pd-sticky" + (bar ? " on" : "")}>
        <div className="bk-back" style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}><ChevronRight size={20} strokeWidth={2.5} /></div>
        <span className="e">{p.img ? <img src={p.img} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} /> : p.e}</span>
        <span className="n">{p.name}</span>
        <Adder />
      </div>

      <div className="bk-phead">
        <div className="bk-back" onClick={onClose}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti" />
        <Share2 size={19} color="#4a4a4a" />
        <Heart size={19} color="#4a4a4a" />
      </div>

      <div className="bk-pbody" ref={bodyRef} onScroll={(e) => setBar(e.currentTarget.scrollTop > 230)}>
        <div className="bk-pd-hero">
          <div className="bk-pd-gallery"
            onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, dx: 0 }; }}
            onTouchMove={(e) => { touch.current.dx = e.touches[0].clientX - touch.current.x; }}
            onTouchEnd={() => {
              const dx = touch.current.dx;
              if (imgs.length > 1 && Math.abs(dx) > 40) {
                if (dx < 0) setIi((i) => (i + 1) % imgs.length);
                else setIi((i) => (i - 1 + imgs.length) % imgs.length);
              }
            }}
            onMouseDown={(e) => { touch.current = { x: e.clientX, dx: 0 }; }}
            onMouseUp={(e) => {
              const dx = e.clientX - touch.current.x;
              if (imgs.length > 1 && Math.abs(dx) > 40) {
                if (dx < 0) setIi((i) => (i + 1) % imgs.length);
                else setIi((i) => (i - 1 + imgs.length) % imgs.length);
              }
            }}>
            <div className="bk-pd-track" style={{ transform: `translateX(${ii * 100}%)` }}>
              {(imgs.length ? imgs : [null]).map((u, i) => (
                <div className="bk-pd-slide" key={i} style={{ background: p.bg }}>
                  {u ? <img src={u} alt={p.name} draggable="false" /> : <span className="emoji">{p.e}</span>}
                </div>
              ))}
            </div>
            {imgs.length > 1 && (
              <>
                <button className="bk-pd-nav prev" onClick={() => setIi((i) => (i - 1 + imgs.length) % imgs.length)}>‹</button>
                <button className="bk-pd-nav next" onClick={() => setIi((i) => (i + 1) % imgs.length)}>›</button>
              </>
            )}
          </div>
          {imgs.length > 1 && <div className="bk-pd-dots">{imgs.map((_, i) => <i key={i} className={i === ii ? "on" : ""} onClick={() => setIi(i)} />)}</div>}
          {imgs.length > 1 && (
            <div className="bk-pd-thumbs">
              {imgs.map((u, i) => <div key={i} className={"th" + (i === ii ? " on" : "")} onClick={() => setIi(i)}><img src={u} alt="" /></div>)}
            </div>
          )}
        </div>

        <div className="bk-pd-body">
          <span className="bk-pd-eta"><Clock size={11} strokeWidth={2.6} /> {p.eta}</span>
          <div className="bk-pd-name">{p.name}</div>
          <div className="bk-pd-w">{p.weight} · <Star size={11} fill="#f5a623" color="#f5a623" style={{ verticalAlign: -1 }} /> {p.rating} ({p.reviews})</div>
          <div className="bk-pd-price">
            <span className="p">{fmt(price)} {CUR}</span>
            {off > 0 && <><span className="m">{fmt(mrp)}</span><span className="o">خصم {off}%</span></>}
            <span className="bk-pd-add"><Adder big /></span>
          </div>

          {variants.length > 0 && (
            <div className="bk-pd-variants">
              <div className="vh">اختر الحجم / النوع</div>
              <div className="vgrid">
                {variants.map((v, i) => {
                  const vo = (v.mrpIQD || v.priceIQD) > v.priceIQD ? Math.round((((v.mrpIQD || v.priceIQD) - v.priceIQD) / (v.mrpIQD || v.priceIQD)) * 100) : 0;
                  return (
                    <button key={i} className={"vopt" + (i === vi ? " on" : "")} onClick={() => setVi(i)}>
                      <div className="vl">{v.label}{v.weight ? " · " + v.weight : ""}</div>
                      <div className="vp">{fmt(v.priceIQD)} {CUR}</div>
                      {vo > 0 && <div className="vo">خصم {vo}%</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bk-why">
          <div className="t">لماذا تتسوق من {appName}؟</div>
          <div className="r"><span className="e">🛵</span><div><b>توصيل خارق السرعة</b><span>يصلك طلبك من أقرب متجر خلال دقائق معدودة.</span></div></div>
          <div className="r"><span className="e">🏷️</span><div><b>أفضل الأسعار والعروض</b><span>أسعار منافسة وعروض مباشرة من المصنّعين.</span></div></div>
          <div className="r"><span className="e">🧺</span><div><b>تشكيلة واسعة</b><span>آلاف المنتجات من البقالة حتى الإلكترونيات والجمال.</span></div></div>
        </div>

        <div className="bk-hl">
          <div className="t">المواصفات</div>
          {(p.highlights || []).map(([k, v], i) => (
            <div className="row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>

        <div className="bk-hl">
          <div className="t">الوصف</div>
          <p>{p.desc}</p>
        </div>

        <div className="bk-hl">
          <div className="t">سياسة الاستبدال</div>
          <p>الاستبدال فقط خلال 72 ساعة من الشراء إذا كان المنتج تالفاً أو رديء الجودة أو غير مطابق. للمنتج غير المطابق يجب أن يكون مغلقاً وغير مستخدم وبحالته الأصلية.</p>
        </div>

        {similar.length > 0 && (
          <div style={{ background: "#fff", marginTop: 8, paddingBottom: 4 }}>
            <ProductRow title="منتجات مشابهة" ids={similar} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => {}} />
          </div>
        )}
        {also.length > 0 && (
          <div style={{ background: "#fff", marginTop: 8, paddingBottom: 4 }}>
            <ProductRow title="اشترى الناس أيضاً" ids={also} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => {}} />
          </div>
        )}
        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}
