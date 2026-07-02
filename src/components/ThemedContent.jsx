import ProductRow from "./ProductRow.jsx";
import TileGrid from "./TileGrid.jsx";

export default function ThemedContent({ theme, cart, add, inc, dec, openList }) {
  const featured = theme.hero && theme.hero.kind === "featured";

  const topBlock = (
    <>
      {featured && <div style={{ padding: "12px 14px 0" }}><div className="bk-sec-t">{theme.hero.title}</div></div>}
      <ProductRow
        title={theme.row1Title} ids={theme.row1}
        cart={cart} add={add} inc={inc} dec={dec}
        onSeeAll={() => openList("منتجات")}
        cardBg={theme.cardBg} cardBorder={theme.cardBorder}
      />
    </>
  );

  return (
    <>
      {theme.zone ? <div style={{ background: theme.zone }}>{topBlock}</div> : topBlock}
      {theme.tiles && (<><div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">تسوّق حسب الفئة</div></div></div><TileGrid items={theme.tiles} onOpen={openList} /></>)}
      <ProductRow title={theme.row2Title} sub={theme.row2Sub} ids={theme.row2} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("منتجات")} />
    </>
  );
}
