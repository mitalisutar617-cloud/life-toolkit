"use client";

import { useEffect, useState } from "react";

/* ---------- helpers ---------- */
type Tab = "budget" | "habits" | "quiz";

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch { }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { }
  }, [key, value, loaded]);
  return [value, setValue] as const;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const card = "rounded-xl border border-slate-300 bg-white p-4";
const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";
const btn =
  "rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-40";

/* ---------- Budget ---------- */
type Expense = { id: string; name: string; amount: number; category: string };
const CATEGORIES = ["Housing", "Food", "Transport", "Fun", "Other"];

function Budget() {
  const [income, setIncome] = usePersisted<number>("tk-income", 0);
  const [items, setItems] = usePersisted<Expense[]>("tk-expenses", []);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const spent = items.reduce((s, e) => s + e.amount, 0);
  const left = income - spent;
  const pct = income > 0 ? Math.min(100, (spent / income) * 100) : 0;

  const add = () => {
    const value = parseFloat(amount);
    if (!name.trim() || !(value > 0)) return;
    setItems([...items, { id: uid(), name: name.trim(), amount: value, category }]);
    setName("");
    setAmount("");
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <label className="mb-1 block text-sm text-slate-600">Monthly income</label>
        <input
          className={input}
          type="number"
          min="0"
          inputMode="decimal"
          value={income || ""}
          placeholder="0.00"
          onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
        />
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all ${left < 0 ? "bg-red-600" : "bg-emerald-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>Spent {money(spent)}</span>
          <span className={left < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
            {left < 0 ? `Over by ${money(-left)}` : `${money(left)} left`}
          </span>
        </div>
      </div>

      <div className={`${card} space-y-2`}>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Expense name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="number" min="0" inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className={btn} onClick={add}>Add expense</button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-slate-500">No expenses yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id} className={`${card} flex items-center justify-between`}>
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-slate-500">{e.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <span>{money(e.amount)}</span>
                <button
                  aria-label={`Delete ${e.name}`}
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => setItems(items.filter((x) => x.id !== e.id))}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Habits ---------- */
type Habit = { id: string; name: string; done: string[] };
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });

function streak(done: string[]) {
  let count = 0;
  const d = new Date();
  // allow today to be unfinished without breaking the streak
  if (!done.includes(dayKey(d))) d.setDate(d.getDate() - 1);
  while (done.includes(dayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function Habits() {
  const [habits, setHabits] = usePersisted<Habit[]>("tk-habits", []);
  const [name, setName] = useState("");
  const days = lastDays(7);

  const add = () => {
    if (!name.trim()) return;
    setHabits([...habits, { id: uid(), name: name.trim(), done: [] }]);
    setName("");
  };
  const toggle = (id: string, key: string) =>
    setHabits(
      habits.map((h) =>
        h.id === id
          ? { ...h, done: h.done.includes(key) ? h.done.filter((k) => k !== key) : [...h.done, key] }
          : h
      )
    );

  return (
    <div className="space-y-4">
      <div className={`${card} flex gap-2`}>
        <input
          className={input}
          placeholder="New habit, e.g. Read 20 minutes"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className={btn} onClick={add}>Add habit</button>
      </div>

      {habits.length === 0 && (
        <p className="text-center text-slate-500">No habits yet. Add one to start your streak.</p>
      )}

      {habits.map((h) => (
        <div key={h.id} className={card}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{h.name}</p>
              <p className="text-sm text-slate-500">{streak(h.done)}-day streak</p>
            </div>
            <button
              aria-label={`Delete ${h.name}`}
              className="text-slate-400 hover:text-red-600"
              onClick={() => setHabits(habits.filter((x) => x.id !== h.id))}
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = dayKey(d);
              const on = h.done.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(h.id, key)}
                  aria-pressed={on}
                  aria-label={`${h.name} on ${d.toDateString()}`}
                  className={`rounded-lg py-2 text-xs ${on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Quiz ---------- */
const QUESTIONS = [
  { q: "What does HTML stand for?", a: ["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Text Mode Logic"], c: 0 },
  { q: "Which hook stores state in a React component?", a: ["useEffect", "useState", "useRef"], c: 1 },
  { q: "Which command creates a new Next.js app?", a: ["npx create-next-app", "npm make next", "git next init"], c: 0 },
  { q: "What does 'git commit' do?", a: ["Uploads to GitHub", "Saves a snapshot locally", "Deletes a branch"], c: 1 },
  { q: "Which file defines routes in the Next.js App Router?", a: ["page.tsx", "routes.json", "index.config"], c: 0 },
];

function Quiz() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [best, setBest] = usePersisted<number>("tk-best", 0);
  const finished = i >= QUESTIONS.length;

  const pick = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    if (n === QUESTIONS[i].c) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= QUESTIONS.length) {
      const final = score;
      if (final > best) setBest(final);
    }
    setI(i + 1);
    setPicked(null);
  };
  const restart = () => {
    setI(0);
    setScore(0);
    setPicked(null);
  };

  if (finished)
    return (
      <div className={`${card} space-y-3 text-center`}>
        <p className="text-4xl font-semibold">
          {score} / {QUESTIONS.length}
        </p>
        <p className="text-slate-600">Best score: {Math.max(best, score)}</p>
        <button className={btn} onClick={restart}>Play again</button>
      </div>
    );

  const cur = QUESTIONS[i];
  return (
    <div className={`${card} space-y-3`}>
      <p className="text-sm text-slate-500">
        Question {i + 1} of {QUESTIONS.length}
      </p>
      <p className="text-lg font-medium">{cur.q}</p>
      <div className="space-y-2">
        {cur.a.map((opt, n) => {
          const state =
            picked === null
              ? "border-slate-300 hover:border-blue-600"
              : n === cur.c
                ? "border-emerald-600 bg-emerald-50"
                : n === picked
                  ? "border-red-600 bg-red-50"
                  : "border-slate-200 opacity-60";
          return (
            <button
              key={opt}
              onClick={() => pick(n)}
              className={`w-full rounded-lg border px-3 py-2 text-left ${state}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button className={btn} onClick={next}>
          {i + 1 === QUESTIONS.length ? "See score" : "Next question"}
        </button>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
const TABS: { id: Tab; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "habits", label: "Habits" },
  { id: "quiz", label: "Quiz" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("budget");
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-slate-100 px-4 py-8 text-slate-900">
      <h1 className="text-3xl font-semibold tracking-tight">Pocket Toolkit</h1>
      <p className="mb-6 text-slate-600">Track money, build habits, test yourself.</p>

      <div role="tablist" className="mb-5 grid grid-cols-3 rounded-xl bg-slate-200 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 font-medium ${tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "budget" && <Budget />}
      {tab === "habits" && <Habits />}
      {tab === "quiz" && <Quiz />}
    </main>
  );
}