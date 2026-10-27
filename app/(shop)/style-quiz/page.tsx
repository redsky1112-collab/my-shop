"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BODY_TYPES, BUDGETS, FITS, GENDERS, STYLES, StyleProfile, TOP_SIZES, WAISTS } from "@/lib/style";
import { loadProfile, saveProfile } from "@/components/useStyleProfile";

const EMPTY: StyleProfile = {
  gender: "", height: 0, weight: 0, bodyType: "", topSize: "", waist: 0,
  styles: [], fit: "", budget: -1, savedAt: 0,
};

export default function StyleQuiz() {
  const router = useRouter();
  const [p, setP] = useState<StyleProfile>(EMPTY);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const old = loadProfile();
    if (old) setP(old);
  }, []);

  const set = <K extends keyof StyleProfile>(k: K, v: StyleProfile[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggleStyle = (k: string) =>
    set("styles", p.styles.includes(k) ? p.styles.filter((s) => s !== k) : [...p.styles, k].slice(-3));

  const steps = [
    {
      title: "누구의 옷을 찾으세요?",
      ok: !!p.gender,
      body: (
        <div className="chips">
          {GENDERS.map((g) => (
            <button key={g.key} className={`chip ${p.gender === g.key ? "on" : ""}`} onClick={() => set("gender", g.key)}>{g.label}</button>
          ))}
        </div>
      ),
    },
    {
      title: "키와 몸무게를 알려주세요",
      sub: "사이즈 추천에만 쓰고, 이 기기에만 저장돼요",
      ok: p.height >= 120 && p.height <= 220 && p.weight >= 30 && p.weight <= 200,
      body: (
        <div className="row">
          <label className="field">키(cm)<input type="number" inputMode="numeric" value={p.height || ""} onChange={(e) => set("height", Number(e.target.value))} /></label>
          <label className="field">몸무게(kg)<input type="number" inputMode="numeric" value={p.weight || ""} onChange={(e) => set("weight", Number(e.target.value))} /></label>
        </div>
      ),
    },
    {
      title: "체형은 어느 쪽에 가까우세요?",
      ok: !!p.bodyType,
      body: (
        <div className="chips col">
          {BODY_TYPES.map((b) => (
            <button key={b.key} className={`chip ${p.bodyType === b.key ? "on" : ""}`} onClick={() => set("bodyType", b.key)}>{b.label}</button>
          ))}
        </div>
      ),
    },
    {
      title: "평소 입는 사이즈는요?",
      ok: !!p.topSize && !!p.waist,
      body: (
        <>
          <p className="muted">상의</p>
          <div className="chips">
            {TOP_SIZES.map((s) => (
              <button key={s} className={`chip ${p.topSize === s ? "on" : ""}`} onClick={() => set("topSize", s)}>{s}</button>
            ))}
          </div>
          <p className="muted">하의 허리(인치)</p>
          <div className="chips">
            {WAISTS.map((w) => (
              <button key={w} className={`chip ${p.waist === w ? "on" : ""}`} onClick={() => set("waist", w)}>{w}</button>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "끌리는 스타일을 골라주세요",
      sub: "최대 3개",
      ok: p.styles.length > 0,
      body: (
        <div className="style-cards">
          {STYLES.map((s) => (
            <button key={s.key} className={`style-card ${p.styles.includes(s.key) ? "on" : ""}`} onClick={() => toggleStyle(s.key)}>
              <b>{s.label}</b>
              <span>{s.desc}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "선호하는 핏과 예산은요?",
      ok: !!p.fit && p.budget >= 0,
      body: (
        <>
          <p className="muted">핏</p>
          <div className="chips">
            {FITS.map((f) => (
              <button key={f.key} className={`chip ${p.fit === f.key ? "on" : ""}`} onClick={() => set("fit", f.key)}>{f.label}</button>
            ))}
          </div>
          <p className="muted">한 벌 예산</p>
          <div className="chips">
            {BUDGETS.map((b) => (
              <button key={b.key} className={`chip ${p.budget === b.key ? "on" : ""}`} onClick={() => set("budget", b.key)}>{b.label}</button>
            ))}
          </div>
        </>
      ),
    },
  ];

  const cur = steps[step];
  const next = () => {
    if (step < steps.length - 1) return setStep(step + 1);
    saveProfile({ ...p, savedAt: Date.now() });
    router.push("/for-you");
  };

  return (
    <div className="quiz">
      <div className="progress"><div style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <p className="muted small">{step + 1} / {steps.length}</p>
      <h1 className="quiz-title">{cur.title}</h1>
      {cur.sub && <p className="muted">{cur.sub}</p>}
      <div className="quiz-body">{cur.body}</div>
      <div className="row quiz-nav">
        {step > 0 && <button className="btn outline" onClick={() => setStep(step - 1)}>이전</button>}
        <button className="btn" disabled={!cur.ok} onClick={next}>{step === steps.length - 1 ? "추천 받기" : "다음"}</button>
      </div>
    </div>
  );
}
