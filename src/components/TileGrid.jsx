import SmartImg from "./SmartImg.jsx";
import { catImageUrl } from "../utils/imageGen.js";

export default function TileGrid({ items, onOpen }) {
  return (
    <div className="bk-grid">
      {items.map((c, i) => (
        <div className="bk-tile" key={i} onClick={() => onOpen && onOpen(c.t)}>
          <div className="bk-tile-img" style={{ background: c.bg }}>
            <SmartImg src={c.img || catImageUrl(c.t)} emoji={c.e} className="" emojiClass="" />
          </div>
          <div className="bk-tile-t">{c.t}</div>
        </div>
      ))}
    </div>
  );
}
