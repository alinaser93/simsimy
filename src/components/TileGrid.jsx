import SmartImg from "./SmartImg.jsx";
import { catImageUrl, arToEnPrompt } from "../utils/imageGen.js";

export default function TileGrid({ items, onOpen }) {
  return (
    <div className="bk-grid">
      {items.map((c, i) => (
        <div className="bk-tile" key={i} onClick={() => onOpen && onOpen(c.t)}>
          <div className="bk-tile-img" style={{ background: c.bg }}>
            <SmartImg srcs={c.img ? [c.img, catImageUrl(c.t)] : [catImageUrl(c.t)]} query={arToEnPrompt(c.t)} emoji={c.e} className="" emojiClass="" />
          </div>
          <div className="bk-tile-t">{c.t}</div>
        </div>
      ))}
    </div>
  );
}
