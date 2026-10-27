"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="form narrow">
      <h1 className="page-title">관리자 로그인</h1>
      <input type="password" name="password" placeholder="비밀번호" required autoFocus />
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn block" disabled={pending}>로그인</button>
    </form>
  );
}
