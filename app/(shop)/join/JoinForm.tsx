"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { joinAgree, joinCancel } from "../login/actions";

const ITEMS = [
  { key: "age", label: "[필수] 만 14세 이상이에요" },
  { key: "terms", label: "[필수] 이용약관 동의", href: "/policy/terms" },
  { key: "privacy", label: "[필수] 개인정보 수집·이용 동의", href: "/policy/privacy" },
  { key: "marketing", label: "[선택] 쿠폰·신상품 소식 받기 (문자·카카오톡·이메일)" },
] as const;

type Key = (typeof ITEMS)[number]["key"];

export default function JoinForm() {
  const [state, action, pending] = useActionState(joinAgree, null);
  const [on, setOn] = useState<Record<Key, boolean>>({ age: false, terms: false, privacy: false, marketing: false });
  const all = ITEMS.every((i) => on[i.key]);
  const required = on.age && on.terms && on.privacy;

  return (
    <>
      <form action={action} className="join-form">
        <label className="check join-all">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setOn({ age: e.target.checked, terms: e.target.checked, privacy: e.target.checked, marketing: e.target.checked })}
          />
          <b>전체 동의</b>
        </label>
        {ITEMS.map((i) => (
          <div key={i.key} className="join-row">
            <label className="check">
              <input type="checkbox" name={i.key} value="1" checked={on[i.key]} onChange={(e) => setOn({ ...on, [i.key]: e.target.checked })} />
              {i.label}
            </label>
            {"href" in i && <Link href={i.href} target="_blank" className="link small">보기</Link>}
          </div>
        ))}
        {state?.error && <p className="error">{state.error}</p>}
        <button className="btn block" disabled={!required || pending}>{pending ? "가입 중…" : "동의하고 가입하기"}</button>
      </form>
      <form action={joinCancel}>
        <button className="link small muted" style={{ marginTop: 14, background: "none", border: 0 }}>가입 안 하고 돌아가기</button>
      </form>
    </>
  );
}
