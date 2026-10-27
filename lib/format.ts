export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function shippingFor(itemsTotal: number, fee: number, freeOver: number) {
  return itemsTotal === 0 || itemsTotal >= freeOver ? 0 : fee;
}

export function newOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
    .join("");
  return `${ymd}-${rand}`;
}

export const onlyDigits = (s: string) => s.replace(/\D/g, "");
