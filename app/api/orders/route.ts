import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import { newOrderNo, onlyDigits, shippingFor } from "@/lib/format";
import { GIFT, SHIPPING } from "@/lib/site";
import { getUser } from "@/lib/user";
import { availableFor } from "@/lib/stock";

type Body = {
  buyerName: string; buyerPhone: string; buyerEmail: string;
  recipient: string; phone: string; zipcode: string; address1: string; address2?: string; memo?: string;
  giftWrap?: boolean; giftMessage?: string;
  items: { productId: number; option: string; quantity: number }[];
};

const bad = (message: string, status = 400, code?: string) => NextResponse.json({ message, code }, { status });

export async function POST(req: Request) {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return bad("잘못된 요청입니다.");
  }

  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const buyerName = str(b.buyerName, 30), recipient = str(b.recipient, 30);
  const buyerPhone = onlyDigits(str(b.buyerPhone)), phone = onlyDigits(str(b.phone));
  const buyerEmail = str(b.buyerEmail, 100);
  const zipcode = str(b.zipcode, 10), address1 = str(b.address1), address2 = str(b.address2), memo = str(b.memo);

  if (!buyerName || !recipient || !zipcode || !address1) return bad("필수 정보를 입력해 주세요.");
  if (!/^01\d{8,9}$/.test(buyerPhone) || !/^01\d{8,9}$/.test(phone)) return bad("휴대폰 번호를 확인해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) return bad("이메일을 확인해 주세요.");
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 50) return bad("주문 상품이 없어요.");

  // 가격·재고·옵션은 반드시 서버(DB) 기준으로 다시 계산
  const ids = [...new Set(b.items.map((i) => Number(i.productId)))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { category: true, variants: true } });
  const map = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  let hasAdult = false;
  for (const it of b.items) {
    const p = map.get(Number(it.productId));
    const qty = Math.floor(Number(it.quantity));
    if (!p || !p.active) return bad("판매 중지된 상품이 포함되어 있어요.");
    if (!(qty >= 1 && qty <= 99)) return bad("수량을 확인해 주세요.");
    const opts = p.options.split(",").map((s) => s.trim()).filter(Boolean);
    const option = str(it.option, 50);
    if (opts.length ? !opts.includes(option) : option !== "") return bad(`${p.name}: 옵션을 확인해 주세요.`);
    // 같은 상품·옵션이 여러 줄이면 합쳐서 확인
    const want = b.items
      .filter((x) => Number(x.productId) === p.id && str(x.option, 50) === option)
      .reduce((s, x) => s + Math.floor(Number(x.quantity)), 0);
    const left = availableFor(p, option);
    if (left < want) {
      return bad(left <= 0
        ? `${p.name}${option ? ` (${option})` : ""}: 품절이에요.`
        : `${p.name}${option ? ` (${option})` : ""}: 재고가 부족해요. (남은 수량 ${left})`);
    }
    if (p.adultOnly || p.category.adultOnly) hasAdult = true;
    const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
    lines.push({ productId: p.id, name: p.name, option, price, quantity: qty });
  }

  if (hasAdult && !(await isAdultVerified())) return bad("성인인증이 필요한 상품이 있어요.", 403, "ADULT_REQUIRED");

  const itemsTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const shippingFee = shippingFor(itemsTotal, SHIPPING.fee, SHIPPING.freeOver);
  // 선물 포장비도 클라이언트 값이 아니라 서버 설정값으로 계산
  const giftWrap = b.giftWrap === true;
  const giftFee = giftWrap ? GIFT.fee : 0;
  const giftMessage = giftWrap ? str(b.giftMessage, GIFT.messageMax) : "";
  // 결제창·영수증에 노출되는 주문명. 성인상품이 섞여 있으면 품명을 노출하지 않음
  const orderName = hasAdult
    ? `주문상품 ${lines.length}건`
    : lines.length > 1 ? `${lines[0].name} 외 ${lines.length - 1}건` : lines[0].name;

  const user = await getUser(); // 로그인 상태면 회원 주문으로 연결 (비회원도 주문 가능)
  const order = await prisma.order.create({
    data: {
      orderNo: newOrderNo(),
      userId: user?.id ?? null,
      buyerName, buyerPhone, buyerEmail, recipient, phone, zipcode, address1, address2, memo,
      itemsTotal, shippingFee, total: itemsTotal + shippingFee + giftFee,
      giftWrap, giftFee, giftMessage,
      orderName: orderName.slice(0, 100),
      hasAdult,
      items: { create: lines },
    },
  });

  return NextResponse.json({ orderNo: order.orderNo });
}
