import BlocksRenderer from "./BlocksRenderer.jsx";
import { useStore } from "../store/appStore.js";

export default function HomeContent({ cart, add, inc, dec, openList }) {
  const blocks = useStore((s) => s.homeBlocks);
  return <BlocksRenderer blocks={blocks} cart={cart} add={add} inc={inc} dec={dec} openList={openList} />;
}
