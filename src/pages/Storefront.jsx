import { useState, useEffect, useCallback, useMemo } from "react";
import { THEMES } from "../data/themes.js";
import { useCart } from "../hooks/useCart.js";
import { useCollapsingHeader } from "../hooks/useCollapsingHeader.js";
import SplashScreen from "../components/SplashScreen.jsx";
import DeliveryInfo from "../components/DeliveryInfo.jsx";
import SearchBar from "../components/SearchBar.jsx";
import CategoryTabs from "../components/CategoryTabs.jsx";
import WelcomeHero from "../components/WelcomeHero.jsx";
import Hero from "../components/Hero.jsx";
import HomeContent from "../components/HomeContent.jsx";
import ThemedContent from "../components/ThemedContent.jsx";
import Listing from "../components/Listing.jsx";
import CartBar from "../components/CartBar.jsx";
import BottomNav from "../components/BottomNav.jsx";
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
  const [catTab, setCatTab] = useState("all");
  const [hint, setHint] = useState(0);
  const [listing, setListing] = useState(null);
  const [page, setPage] = useState(null);        // cart | payment | address | orders | search | {tracking:id}
  const [pending, setPending] = useState(null);  // بيانات السلة قبل الدفع
  const [productId, setProductId] = useState(null); // ورقة تفاصيل المنتج
  const [toast, setToast] = useState(null);
  const settings = useStore((st) => st.settings);
  const appearance = useStore((st) => st.appearance);
  const texts = useStore((st) => st.texts);

  const theme = THEMES[catTab];
  const { cart, add, inc, dec, clear, count, total, savings, recentItems } = useCart();
  const { phoneRef, scrollRef, onScroll } = useCollapsingHeader(theme);

  // فتح تفاصيل المنتج من أي بطاقة
  useEffect(() => {
    const h = (e) => setProductId(e.detail);
    window.addEventListener("bk:openProduct", h);
    return () => window.removeEventListener("bk:openProduct", h);
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
    const iv = setInterval(() => setHint((h) => (h + 1) % theme.hints.length), 2200);
    return () => clearInterval(iv);
  }, [theme]);

  const openList = useCallback((t) => setListing(t), []);
  const pickTab = useCallback((id, el) => {
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

  const headTop = catTab === "all" ? appearance.headTop : theme.headTop;
  const headBot = catTab === "all" ? appearance.headBot : theme.headBot;
  const goldGrad = `linear-gradient(180deg, ${headTop}, ${headBot})`;
  const brandVars = {
    "--bk-green": appearance.green,
    "--bk-yellow": appearance.yellow,
    "--bk-yellow-dk": appearance.yellowDk,
  };

  // المحتوى الثقيل مثبّت — لا يُعاد رسمه أثناء التمرير
  const sections = useMemo(
    () => (catTab === "all"
      ? <HomeContent cart={cart} add={add} inc={inc} dec={dec} openList={openList} />
      : <ThemedContent theme={theme} cart={cart} add={add} inc={inc} dec={dec} openList={openList} />),
    [catTab, cart, theme, add, inc, dec, openList]
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
          <Listing title={listing} cart={cart} add={add} inc={inc} dec={dec} onBack={() => setListing(null)} />
        ) : (
          <>
            {!settings.storeOpen && <div className="bk-closed">{texts.closedMsg}</div>}
            {/* الهيدر القابل للطي — الطيّ واللون عبر متغيّرات CSS */}
            <div className="bk-header" style={{ background: goldGrad }}>
              <div className="bk-deliv-wrap"><DeliveryInfo theme={theme} /></div>
              <div onClick={() => setPage("search")}><SearchBar theme={theme} hint={hint} catTab={catTab} /></div>
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
            onPay={(data) => { setPending(data); setPage("payment"); }} />
        )}
        {page === "payment" && pending && (
          <PaymentPage pending={pending} onBack={() => setPage("cart")} onPlaced={placed} />
        )}
        {page === "address" && <AddressPage onBack={() => setPage("cart")} />}
        {page === "orders" && (
          <OrdersPage onBack={() => setPage(null)}
            onOpen={(id) => setPage({ tracking: id })}
            onReorder={reorder} />
        )}
        {page && page.tracking && (
          <TrackingPage orderId={page.tracking} onBack={() => setPage("orders")} />
        )}
        {page === "search" && (
          <SearchPage cart={cart} add={add} inc={inc} dec={dec} onBack={() => setPage(null)} />
        )}

        {/* ورقة تفاصيل المنتج فوق كل شيء */}
        {productId && (
          <ProductSheet id={productId} cart={cart} add={add} inc={inc} dec={dec} onClose={() => setProductId(null)} />
        )}

        {toast && <div className="bk-toast">{toast}</div>}
        {/* الشريط السفلي يظهر فقط على المتجر وصفحة التصنيف — يُخفى داخل الصفحات الكاملة كي لا يغطّي أزرارها */}
        {!page && !productId && (
          <BottomNav nav={nav} onChange={(id) => {
            setNav(id); setListing(null); setProductId(null);
            setPage(id === "again" ? "orders" : null);
          }} />
        )}

      </div>
    </div>
  );
}
