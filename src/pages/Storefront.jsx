import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { THEMES } from "../data/themes.js";
import DealsContent from "../components/DealsContent.jsx";
import BlocksRenderer from "../components/BlocksRenderer.jsx";
import { useCart } from "../hooks/useCart.js";
import { useCollapsingHeader } from "../hooks/useCollapsingHeader.js";
import SplashScreen from "../components/SplashScreen.jsx";
import DeliveryInfo from "../components/DeliveryInfo.jsx";
import ProfilePage from "../components/ProfilePage.jsx";
import WishlistPage from "../components/WishlistPage.jsx";
import InfoPage from "../components/InfoPage.jsx";
import useOrderNotifications from "../hooks/useOrderNotifications.js";
import LoginPage from "../components/LoginPage.jsx";
import SearchBar from "../components/SearchBar.jsx";
import CategoryTabs from "../components/CategoryTabs.jsx";
import WelcomeHero from "../components/WelcomeHero.jsx";
import Hero from "../components/Hero.jsx";
import HomeContent from "../components/HomeContent.jsx";
import Listing from "../components/Listing.jsx";
import CartBar from "../components/CartBar.jsx";
import { fmt } from "../utils/currency.js";
import BottomNav from "../components/BottomNav.jsx";
import CategoriesPage from "../components/CategoriesPage.jsx";
import PrintPage from "../components/PrintPage.jsx";
import CartPage from "../components/CartPage.jsx";
import PaymentPage from "../components/PaymentPage.jsx";
import AddressPage from "../components/AddressPage.jsx";
import TrackingPage from "../components/TrackingPage.jsx";
import OrdersPage from "../components/OrdersPage.jsx";
import SearchPage from "../components/SearchPage.jsx";
import ProductSheet from "../components/ProductSheet.jsx";
import BigFooter from "../components/BigFooter.jsx";
import { useStore } from "../store/appStore.js";

export default function Storefront() {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [nav, setNav] = useState("home");
  const initialTab = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("tab") || "all") : "all";
  const [catTab, setCatTab] = useState(initialTab);
  const [hint, setHint] = useState(0);
  const [listing, setListing] = useState(null);
  useOrderNotifications();   // إشعارات حالة الطلب في كل أنحاء التطبيق
  const [page, setPage] = useState(null);        // cart | payment | address | orders | search | {tracking:id}
  const [pending, setPending] = useState(null);  // بيانات السلة قبل الدفع
  const [loginNext, setLoginNext] = useState("profile"); // الوجهة بعد تسجيل الدخول
  const loggedIn = useStore((s) => s.user.loggedIn);
  const [productId, setProductId] = useState(null); // ورقة تفاصيل المنتج
  const [toast, setToast] = useState(null);
  const settings = useStore((st) => st.settings);
  const appearance = useStore((st) => st.appearance);
  const texts = useStore((st) => st.texts);

  const customTabs = useStore((s) => s.customTabs);
  const tabBlocks = useStore((s) => s.tabBlocks);
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const customTab = customTabs.find((t) => t.id === catTab);
  const theme = THEMES[catTab] || (customTab && {
    eta: "12", headTop: "#4a4b50", headBot: "#6e6d6e", onHead: "#ffffff", sub: "#eaeaea",
    badge: "#fff", badgeBorder: "rgba(255,255,255,.55)", searchBg: "#fff",
    searchText: "#8a8a8a", searchIcon: "#5a5a5a",
    hints: [customTab.label],
    hero: { kind: "glow", title: customTab.emoji + " " + customTab.label, sub: "قسم مخصّص من إدارة المتجر",
      bg: "linear-gradient(135deg,#5a5b60,#3f4045)", text: "#ffffff", subText: "#e2e2e2" },
  }) || THEMES.all;
  const headTop = catTab === "all" ? appearance.headTop : theme.headTop;
  const headBot = catTab === "all" ? appearance.headBot : theme.headBot;
  const goldGrad = `linear-gradient(180deg, ${headTop}, ${headBot})`;
  // خلفية المحتوى = درجة فاتحة من لون هيدر هذا التبويب
  const lightTint = (hex, amt = 0.10) => {
    const h = (hex || "#cccccc").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const m = (c) => Math.round((isNaN(c) ? 200 : c) * amt + 255 * (1 - amt));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  };
  const contentBg = lightTint(headTop);
  // تلميحات البحث = أسماء منتجات حقيقية، مرجّحة بالأكثر شعبية (طلبات الزبائن + التقييمات)
  const searchHints = useMemo(() => {
    const revNum = (r) => {
      if (!r) return 0;
      const n = parseFloat(String(r).replace(/[^\d.]/g, "")) || 0;
      return /ألف|الف|آلاف/.test(String(r)) ? n * 1000 : n;
    };
    const ord = {};
    (orders || []).forEach((o) => (o.items || []).forEach((it) => { if (it && it.name) ord[it.name] = (ord[it.name] || 0) + (it.qty || 1); }));
    const scored = (products || [])
      .filter((p) => p && p.name && p.stock !== false)
      .map((p) => ({ name: p.name, score: (ord[p.name] || 0) * 9000 + revNum(p.reviews) * ((p.rating || 4) / 5) + (p.deal ? 500 : 0) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 40).map((s) => s.name);
    // خلط بسيط للتنويع مع بقاء الأسماء كلها من الأكثر شعبية
    for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
    return top.length ? top : ["منتجاتنا"];
  }, [products, orders]);
  const { cart, add, inc, dec, clear, count, total, savings, recentItems } = useCart();
  const freeAbove = settings.freeAbove || 50000;

  const { phoneRef, scrollRef, onScroll } = useCollapsingHeader(theme);
  const [celebrate, setCelebrate] = useState(false);
  const wasFree = useRef(total >= freeAbove); // يبدأ حسب حالة السلة المحفوظة (لا احتفال خاطئ عند التحميل)
  useEffect(() => {
    const isFree = total >= freeAbove;
    if (isFree && !wasFree.current && total > 0) { setCelebrate(true); setTimeout(() => setCelebrate(false), 2600); }
    wasFree.current = isFree;
  }, [total, freeAbove]);

  // حركة «انزلاق المنتج إلى السلة» عند الإضافة
  useEffect(() => {
    const onClick = (e) => {
      const btn = e.target.closest(".bk-add:not(.opts), .bk-flash-add, .bk-sug-add, .bk-freq-add");
      if (!btn) return;
      const card = btn.closest(".bk-pc, .bk-sug, .bk-freq-card, .bk-flash-card, .bk-crow");
      const visual = card && (card.querySelector(".bk-pc-imgwrap, .bk-flash-img, .bk-sug-img, .bk-freq-img, .bk-pc-img") || card.querySelector("img"));
      const cart = document.querySelector("#bk-cart-thumbs") || document.querySelector(".bk-cartbar") || document.querySelector(".bk-cart");
      const phone = phoneRef.current;
      if (!visual || !phone) return;
      const s = visual.getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      const clone = visual.cloneNode(true);
      clone.className = "bk-fly";
      clone.style.left = (s.left - pr.left) + "px";
      clone.style.top = (s.top - pr.top) + "px";
      clone.style.width = s.width + "px";
      clone.style.height = s.height + "px";
      phone.appendChild(clone);
      // الهدف: حاوية الصور المصغّرة (يمين الشريط) تحديداً
      const tRect = cart ? cart.getBoundingClientRect() : { left: pr.right - 90, top: pr.bottom - 100, width: 44, height: 44 };
      requestAnimationFrame(() => {
        const dx = (tRect.left + tRect.width / 2) - (s.left + s.width / 2);
        const dy = (tRect.top + tRect.height / 2) - (s.top + s.height / 2);
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(.12) rotate(8deg)`;
        clone.style.opacity = "0.25";
      });
      // نبضة الصورة عند وصول المنتج
      setTimeout(() => { const th = document.querySelector("#bk-cart-thumbs"); if (th) { th.classList.add("bump"); setTimeout(() => th.classList.remove("bump"), 500); } }, 560);
      setTimeout(() => clone.remove(), 700);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [phoneRef]);

  // فتح تفاصيل المنتج من أي بطاقة
  const backRef = { productId, listing, catTab };
  const backRefBox = useRef(backRef); backRefBox.current = backRef;
  useEffect(() => {
    const onPop = () => {
      const r = backRefBox.current;
      if (r.productId != null) { setProductId(null); return; }
      if (r.listing) { setListing(null); return; }
      if (r.catTab !== "all") setCatTab("all");
    };
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("bk:openProfile", () => {}); };
  }, []);
  useEffect(() => {
    const openProf = () => { pushBK(); setPage("profile"); };
    const openAddr = () => { pushBK(); setPage("address"); };
    window.addEventListener("bk:openProfile", openProf);
    window.addEventListener("bk:openAddress", openAddr);
    const h = (e) => { pushBK(); setProductId(e.detail); };
    const hl = (e) => { pushBK(); setListing(e.detail); };
    window.addEventListener("bk:openProduct", h);
    window.addEventListener("bk:openList", hl);
    return () => { window.removeEventListener("bk:openProduct", h); window.removeEventListener("bk:openList", hl); };
  }, []);

  // شاشة البداية
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 1700);
    const t2 = setTimeout(() => setReady(true), 2250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const skip = () => { setExiting(true); setTimeout(() => setReady(true), 400); };

  // تلميحات البحث المتغيّرة
  useEffect(() => { setHint(0); }, [catTab]);
  useEffect(() => {
    const iv = setInterval(() => setHint((h) => (h + 1) % searchHints.length), 2000);
    return () => clearInterval(iv);
  }, [searchHints]);

  const pushBK = () => { try { window.history.pushState({ bk: 1 }, ""); } catch { /* لا شيء */ } };
  const openList = useCallback((t) => { pushBK(); setListing(t); }, []);
  const pickTab = useCallback((id, el) => {
    if (catTab === "all" && id !== "all") pushBK();
    setCatTab(id); setListing(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [scrollRef]);

  const placed = (order) => {
    clear(); setPending(null); setProductId(null);
    setPage({ tracking: order.id });
    setToast(`✓ تم استلام طلبك رقم ${order.id}`);
    setTimeout(() => setToast(null), 2600);
  };
  const reorder = (order) => {
    order.items.forEach((i) => { add(i.id); for (let k = 1; k < i.qty; k++) inc(i.id); });
    setPage("cart");
  };

  const brandVars = {
    "--bk-green": appearance.green,
    "--bk-yellow": appearance.yellow,
    "--bk-yellow-dk": appearance.yellowDk,
    "--bk-content-bg": contentBg,
  };

  // المحتوى الثقيل مثبّت — لا يُعاد رسمه أثناء التمرير
  const sections = useMemo(
    () => (catTab === "all"
      ? <HomeContent cart={cart} add={add} inc={inc} dec={dec} openList={openList} />
      : catTab === "deals"
      ? <DealsContent cart={cart} add={add} inc={inc} dec={dec} openList={openList} />
      : customTab
      ? <BlocksRenderer blocks={customTab.blocks} tabId={catTab} cart={cart} add={add} inc={inc} dec={dec} openList={openList} />
      : <BlocksRenderer blocks={tabBlocks[catTab] || []} tabId={catTab} cart={cart} add={add} inc={inc} dec={dec} openList={openList} />),
    [catTab, cart, theme, customTab, tabBlocks, add, inc, dec, openList]
  );
  const banner = useMemo(
    () => (catTab === "all" ? <WelcomeHero /> : <Hero hero={theme.hero} />),
    [catTab, theme]
  );

  return (
    <div className="bk-wrap">
      <div className="bk-phone" dir="rtl" lang="ar" ref={phoneRef} style={brandVars}>

        {!ready && <SplashScreen exiting={exiting} onSkip={skip} />}

        {listing ? (
          <Listing title={listing} cart={cart} add={add} inc={inc} dec={dec} onBack={() => window.history.back()} />
        ) : nav === "cats" ? (
          <CategoriesPage onOpen={(t) => { setNav("home"); openList(t); }} onBack={() => setNav("home")} />
        ) : nav === "print" ? (
          <PrintPage onBack={() => setNav("home")} onPlaced={(order, needs) => {
            if (needs === "login") { setLoginNext("print"); setNav("home"); setPage("login"); }
            else if (order) { setNav("home"); setPage({ tracking: order.id }); }
          }} />
        ) : nav === "again" ? (
          <OrdersPage onBack={() => setNav("home")} onOpen={(id) => { setNav("home"); setPage({ tracking: id }); }} onReorder={reorder} add={add} cart={cart} inc={inc} dec={dec} />
        ) : (
          <>
            {!settings.storeOpen && <div className="bk-closed">{texts.closedMsg}</div>}
            {/* الهيدر القابل للطي — الطيّ واللون عبر متغيّرات CSS */}
            <div className="bk-header" style={{ background: goldGrad }}>
              <div className="bk-deliv-wrap"><DeliveryInfo theme={theme} /></div>
              <div onClick={() => setPage("search")}><SearchBar theme={theme} hint={hint} hints={searchHints} /></div>
              <CategoryTabs catTab={catTab} onPick={pickTab} />
              {theme.promo && <div className="bk-promo">{settings.promoText}</div>}
            </div>

            {/* المحتوى */}
            <div className="bk-content" ref={scrollRef} onScroll={onScroll} key={catTab}>
              <div className="bk-herowrap">{banner}</div>
              {sections}
              <BigFooter />
            </div>
          </>
        )}

        {count > 0 && !page && !productId && (
          <div onClick={() => setPage("cart")}><CartBar count={count} total={total} savings={savings} items={recentItems} /></div>
        )}

        {/* الصفحات الكاملة */}
        {page === "cart" && (
          <CartPage cart={cart} add={add} inc={inc} dec={dec}
            onBack={() => setPage(null)}
            onChangeAddress={() => setPage("address")}
            onPay={(data) => {
              setPending(data);
              if (loggedIn) setPage("payment");
              else { setLoginNext("payment"); setPage("login"); }
            }} />
        )}
        {page === "payment" && pending && (
          <PaymentPage pending={pending} onBack={() => setPage("cart")} onPlaced={placed} />
        )}
        {page === "address" && <AddressPage onBack={() => setPage("cart")} />}
        {page === "orders" && (
          <OrdersPage onBack={() => setPage(null)}
            onOpen={(id) => setPage({ tracking: id })}
            onReorder={reorder} add={add} cart={cart} inc={inc} dec={dec} />
        )}
        {page && page.tracking && (
          <TrackingPage orderId={page.tracking} onBack={() => setPage("orders")} />
        )}
        {page === "profile" && (
          <ProfilePage
            onBack={() => setPage(null)}
            onOrders={() => setPage("orders")}
            onAddress={() => setPage("address")}
            onWishlist={() => setPage("wishlist")}
            onWallet={() => setPage("orders")}
            onHelp={() => setPage({ info: "contact" })}
            onInfo={(topic) => setPage({ info: topic })}
            onLogin={() => { setLoginNext("profile"); setPage("login"); }} />
        )}
        {page && page.info && (
          <InfoPage topic={page.info} onBack={() => setPage("profile")} />
        )}
        {page === "wishlist" && (
          <WishlistPage cart={cart} add={add} inc={inc} dec={dec} onBack={() => setPage("profile")} />
        )}
        {page === "login" && (
          <LoginPage onBack={() => setPage(loginNext === "payment" ? "cart" : "profile")} onDone={() => { if (loginNext === "print") { setPage(null); setNav("print"); } else setPage(loginNext); }} />
        )}
        {page === "search" && (
          <SearchPage cart={cart} add={add} inc={inc} dec={dec} onBack={() => setPage(null)} />
        )}

        {/* ورقة تفاصيل المنتج فوق كل شيء */}
        {productId && (
          <ProductSheet id={productId} cart={cart} add={add} inc={inc} dec={dec} onClose={() => window.history.back()} />
        )}

        {toast && <div className="bk-toast">{toast}</div>}
        {/* الشريط السفلي يظهر فقط على المتجر وصفحة التصنيف — يُخفى داخل الصفحات الكاملة كي لا يغطّي أزرارها */}
        {celebrate && (
          <div className="bk-celebrate">
            <div className="bk-celebrate-badge">
              <div className="bk-celebrate-emoji">🎉</div>
              <div className="bk-celebrate-ring" />
              <div className="bk-celebrate-ring r2" />
            </div>
            <div className="bk-celebrate-pill">🚚 توصيل مجاني!</div>
            {Array.from({ length: 40 }).map((_, i) => (
              <span className="bk-confetti" key={i} style={{
                left: (i * 2.5) + "%",
                animationDelay: (i % 10 * 0.09) + "s",
                animationDuration: (2 + (i % 5) * 0.35) + "s",
                background: ["#F8CB46","#0C831F","#E23744","#2A6ED9","#F0851C","#9B59B6"][i % 6],
                width: (i % 3 === 0 ? 11 : 8) + "px",
                height: (i % 2 === 0 ? 14 : 9) + "px",
              }} />
            ))}
          </div>
        )}
        {!page && !productId && (
          <BottomNav nav={nav} onChange={(id) => {
            setListing(null); setProductId(null);
            if (id === "again") { setNav("again"); setPage(null); }
            else if (id === "print") { setNav("print"); setPage(null); }
            else { setNav(id); setPage(null); }
          }} />
        )}

      </div>
    </div>
  );
}
