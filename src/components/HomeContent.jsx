import TileGrid from "./TileGrid.jsx";
import ProductRow from "./ProductRow.jsx";
import Bestsellers from "./Bestsellers.jsx";
import TrioPromos from "./TrioPromos.jsx";
import BannerCarousel from "./BannerCarousel.jsx";
import BigStores from "./BigStores.jsx";
import {
  GROCERY, SNACKS, BEAUTY, HOUSEHOLD, STORES_SPOTLIGHT, PICKS_LIFESTYLE,
} from "../data/collections.js";

export default function HomeContent({ cart, add, inc, dec, openList }) {
  return (
    <>
      <Bestsellers onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">البقالة والمطبخ</div></div></div>
      <TileGrid items={GROCERY} onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">وجبات خفيفة ومشروبات</div></div></div>
      <TileGrid items={SNACKS} onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">الجمال والعناية الشخصية</div></div></div>
      <TileGrid items={BEAUTY} onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">مستلزمات المنزل</div></div></div>
      <TileGrid items={HOUSEHOLD} onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">متاجر مميّزة</div></div></div>
      <TileGrid items={STORES_SPOTLIGHT} onOpen={openList} />

      <div className="bk-sec"><div className="bk-sec-h"><div className="bk-sec-t">مختارات لأسلوب حياتك</div></div></div>
      <TileGrid items={PICKS_LIFESTYLE} onOpen={openList} />

      <TrioPromos onOpen={openList} />

      <BannerCarousel onOpen={openList} />

      <ProductRow title="منتجات رائجة قربك" ids={[32, 33, 1, 28]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("الرائج الآن")} />

      <div className="bk-ad">
        <h4>احتفال البرياني هنا</h4>
        <p>أحضر أجود أنواع الأرز</p>
        <div className="shop">تسوّق الآن</div>
        <div className="em">🍚</div>
        <div className="tag">إعلان</div>
      </div>

      <ProductRow title="مشروبات باردة وعصائر" sub="غازية · طاقة · ماء جوز الهند" ids={[34, 35, 37, 38, 39, 40]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("مشروبات وعصائر")} />

      <ProductRow title="شوكولاتة لنزواتك" ids={[56, 57, 55, 59, 58, 60]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("حلويات وشوكولاتة")} />

      <div className="bk-ad">
        <h4>احتفال البرياني هنا</h4>
        <p>أحضر أجود أنواع الأرز</p>
        <div className="shop">تسوّق الآن</div>
        <div className="em">🍚</div>
        <div className="tag">إعلان</div>
      </div>

      <ProductRow title="آيس كريم لصيفٍ منعش" sub="علب · أقماع · كيك آيس كريم" ids={[62, 65, 63, 66, 67, 64]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("آيس كريم ومثلجات")} />

      <ProductRow title="طعام سريع ومجمّد" sub="نودلز · مجمّدات · دجاج" ids={[48, 49, 50, 51, 52, 54]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("طعام سريع ومجمّد")} />

      <ProductRow title="زيوت وسكر وبهارات" ids={[41, 43, 44, 45, 46, 47]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("زيوت وسكر وبهارات")} />

      <ProductRow title="طحين وأرز للوجبات اليومية" ids={[74, 75, 72, 73, 76]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("طحين وأرز وبقوليات")} />

      <ProductRow title="خضار وفواكه طازجة" ids={[68, 70, 69, 71, 32, 33]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("خضار وفواكه")} />

      <ProductRow title="الألبان والخبز والبيض" sub="حليب · لبن · أجبان" ids={[77, 78, 79, 4, 28, 31]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("ألبان وخبز وبيض")} />

      <div className="bk-ad" style={{ background: "linear-gradient(120deg,#2A6ED9,#1d55ad)" }}>
        <h4>سيرومات لكل بشرة</h4>
        <p>فيتامين C ونياسيناميد</p>
        <div className="shop">اكتشفي</div>
        <div className="em">🧪</div>
        <div className="tag">إعلان</div>
      </div>

      <ProductRow title="عناية وجمال" sub="سيرومات · ترطيب" ids={[87, 88, 89, 90, 91, 6]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("جمال وعناية")} />

      <ProductRow title="أساسيات النظافة" sub="غسيل · أرضيات · معطرات" ids={[80, 83, 84, 82, 85, 86]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("منظفات وعناية منزلية")} />

      <ProductRow title="صوتيات وإلكترونيات" ids={[93, 94, 95, 9, 11, 10]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("إلكترونيات")} />

      <BigStores onOpen={openList} />

      <ProductRow title="الأساسيات اليومية، توصيل سريع" ids={[4, 5, 14, 2]} cart={cart} add={add} inc={inc} dec={dec} onSeeAll={() => openList("البقالة")} />
    </>
  );
}
