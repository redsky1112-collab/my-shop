import WishList from "./WishList";

export const metadata = { title: "찜한 상품" };

export default function WishlistPage() {
  return (
    <>
      <h1 className="page-title">찜한 상품</h1>
      <WishList />
    </>
  );
}
