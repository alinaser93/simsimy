import { useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Heart, Share2, Clock, Star } from "lucide-react";
import { useStore, toggleWishlist, addReview } from "../store/appStore.js";
import { fmt, CUR } from "../utils/currency.js";
import ProductRow from "./ProductRow.jsx";
import { PROD_BG } from "./ProductCard.jsx";
import SmartImg from "./SmartImg.jsx";
import { productImgCandidates } from "../utils/imageGen.js";

/* صفحة تفاصيل المنتج — كما في التطبيق الأصلي:
   صورة كبيرة، شريط علوي لاصق عند التمرير، لماذا بلينكيت، المواصفات،
   الوصف، سياسة الاستبدال، منتجات مشابهة، واشترى الناس أيضاً */
export default function ProductSheet({ id, cart, add, inc, dec, onClose }) {
  const wishlisted = useStore((s) => s.wishlist.includes(id));
  const [vi, setVi] = useState(0);
  const [ii, setIi] = useState(0);
  const touch = useRef({ x: 0, dx: 0 });
  const products = useStore((s) => s.products);
  const appName = useStore((s) => s.texts.appName);
  const p = products.find((x) => x.id === id);
  const allReviews = useStore((s) => s.productReviews);
  const reviews = allReviews[id] || [];
  const [rStars, setRStars] = useState(0);
  const [rText, setRText] = useState("");
  const [rName, setRName] = useState("");
  const [rDone, setRDone] = useState(false);
  const [bar, setBar] = useState(false);
  const bodyRef = useRef(null);
  if (!p) return null;

  const cand = productImgCandidates(p);
  const imgs = (p.images && p.images.length ? p.images : [cand[0]]);
  const custCount = reviews.length;
  const custAvg = custCount ? reviews.reduce((a, r) => a + (r.rating || 0), 0) / custCount : 0;
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
        <span className="e"><SmartImg srcs={cand} emoji={p.e} className="" emojiClass="" imgStyle={{ width: 30, height: 30, objectFit: "contain" }} /></span>
        <span className="n">{p.name}</span>
        <Adder />
      </div>

      <div className="bk-phead">
        <div className="bk-back" onClick={onClose}><ChevronRight size={22} strokeWidth={2.5} /></div>
        <div className="ti" />
        <Share2 size={19} color="#4a4a4a" />
        <Heart size={19} onClick={() => toggleWishlist(id)} fill={wishlisted ? "#E23744" : "none"} color={wishlisted ? "#E23744" : "currentColor"} style={{ cursor: "pointer" }} />
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
                <div className="bk-pd-slide" key={i} style={{ background: PROD_BG }}>
                  <SmartImg srcs={i === 0 ? cand : [u]} emoji={p.e} alt={p.name} className="" emojiClass="emoji" />
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
              {imgs.map((u, i) => <div key={i} className={"th" + (i === ii ? " on" : "")} onClick={() => setIi(i)}><SmartImg src={u} emoji={p.e} className="" emojiClass="" /></div>)}
            </div>
          )}
        </div>

        <div className="bk-pd-chips">
          {[["التوصيل", p.eta], ["الحجم", p.weight], ["النوع", p.sub || p.cat], ["التقييم", "⭐ " + p.rating]]
            .filter(([, v]) => v)
            .map(([k, v], i) => (
              <div className="bk-pd-chip" key={i}><div className="k">{k}</div><div className="v">{v}</div></div>
            ))}
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

        <div className="bk-pd-brand" onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent("bk:openList", { detail: p.cat })), 60); }}>
          <div className="ic"><SmartImg src={p.img} emoji={p.e} className="" emojiClass="" imgStyle={{ width: 34, height: 34, objectFit: "contain" }} /></div>
          <div className="tx"><b>{p.cat}</b><span>تصفّح كل المنتجات</span></div>
          <ChevronLeft size={20} color="#b0b0b0" />
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

        <div className="bk-reviews">
          <div className="t">تقييمات الزبائن {custCount > 0 && <span className="rv-avg"><Star size={13} fill="#f5a623" color="#f5a623" style={{ verticalAlign: -1 }} /> {custAvg.toFixed(1)} · {custCount}</span>}</div>
          {rDone ? (
            <div className="rv-thanks">✅ شكراً! نُشر تقييمك.</div>
          ) : (
            <div className="rv-form">
              <div className="rv-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={28} strokeWidth={1.5} fill={n <= rStars ? "#f5a623" : "none"} color="#f5a623" style={{ cursor: "pointer" }} onClick={() => setRStars(n)} />
                ))}
                <span className="rv-hint">{rStars ? `${rStars}/5` : "اضغط النجوم"}</span>
              </div>
              <input className="rv-in" placeholder="اسمك (اختياري)" value={rName} onChange={(e) => setRName(e.target.value)} />
              <textarea className="rv-in rv-ta" placeholder="اكتب رأيك بالمنتج… (اختياري)" value={rText} onChange={(e) => setRText(e.target.value)} rows={2} />
              <button className="rv-submit" disabled={!rStars} style={!rStars ? { opacity: 0.5 } : undefined}
                onClick={() => { if (rStars) { addReview(id, { rating: rStars, text: rText, name: rName }); setRStars(0); setRText(""); setRName(""); setRDone(true); } }}>
                انشر التقييم
              </button>
            </div>
          )}
          {reviews.length > 0 ? (
            <div className="rv-list">
              {reviews.slice(0, 30).map((r, i) => (
                <div className="rv-item" key={i}>
                  <div className="rv-h"><b>{r.name}</b><span className="rv-st">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div>
                  {r.text && <p>{r.text}</p>}
                </div>
              ))}
            </div>
          ) : <div className="rv-empty">لا توجد تقييمات بعد — كن أول من يقيّم ⭐</div>}
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
