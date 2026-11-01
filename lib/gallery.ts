// 상품 사진 여러 장 — 서버·브라우저 양쪽에서 쓰는 공용 값 (DB 접근 없음)
export const MAX_PRODUCT_IMAGES = 10;

/** 상세 화면에 보여줄 사진 목록. 예전 상품(사진 1장, images 비어 있음)은 대표 사진으로 대신 */
export function galleryOf(p: { images?: string[] | null; imageUrl?: string | null }): string[] {
  if (p.images && p.images.length > 0) return p.images;
  return p.imageUrl ? [p.imageUrl] : [];
}
