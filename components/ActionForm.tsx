"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type Err = { error?: string } | null;
type Result = { error?: string } | void;

/** 서버 저장 결과의 오류 문구를 화면에 보여주는 폼 (오류 시 사이트가 멈추지 않게) */
export default function ActionForm({
  action,
  className,
  children,
}: {
  action: (fd: FormData) => Promise<Result>;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<Err, FormData>(async (_prev, fd) => {
    const r = (await action(fd)) as { error?: string } | undefined;
    return r ?? null;
  }, null);
  const error = state?.error || "";
  return (
    <form action={formAction} className={className}>
      {error && <p className="form-error" role="alert">{error}</p>}
      {children}
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export function SubmitButton({ children = "저장" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? "저장 중..." : children}</button>;
}
