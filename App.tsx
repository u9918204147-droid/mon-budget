import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import {
  Wallet,
  Receipt,
  PiggyBank,
  ShoppingBag,
  Plus,
  Trash2,
  Pencil,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  Check,
  CalendarDays,
  Landmark
} from "lucide-react";
import { AllData, CATEGORIES, Expense } from "./types";
import {
  CATEGORY_COLORS,
  STORAGE_KEY,
  daysInMonth,
  defaultMonth,
  formatEuro,
  monthLabel,
  pad,
  shiftMonth,
  todayKey
} from "./utils";
import Gauge from "./components/Gauge";
import StatCard from "./components/StatCard";

type Tab = "dashboard" | "expenses" | "charts" | "history";

interface ExpenseForm {
  id: string | null;
  date: string;
  category: string;
  amount: string;
  note: string;
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("mon-budget-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<AllData>({});
  const [currentMonthKey, setCurrentMonthKey] = useState(todayKey());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [form, setForm] = useState<ExpenseForm>({ id: null, date: "", category: "", amount: "", note: "" });
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const saveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Persistance réelle via localStorage ---- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setAllData(JSON.parse(raw));
    } catch {
      // localStorage indisponible (mode privé strict, etc.) : on démarre à vide.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      setSavedAt(new Date());
      setJustSaved(true);
      if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current);
      saveFlashTimer.current = setTimeout(() => setJustSaved(false), 1400);
    } catch {
      // Quota dépassé ou stockage bloqué : les données restent en mémoire pour la session.
    }
  }, [allData, loading]);

  useEffect(() => {
    window.localStorage.setItem("mon-budget-theme", theme);
  }, [theme]);

  /* ---- Garantit qu'un mois existe ---- */
  useEffect(() => {
    if (loading) return;
    if (!allData[currentMonthKey]) {
      setAllData((prev) => ({ ...prev, [currentMonthKey]: defaultMonth(currentMonthKey) }));
    }
  }, [currentMonthKey, loading, allData]);

  const month = allData[currentMonthKey] || defaultMonth(currentMonthKey);

  const updateMonth = (patch: Partial<typeof month>) => {
    setAllData((prev) => ({
      ...prev,
      [currentMonthKey]: { ...(prev[currentMonthKey] || defaultMonth(currentMonthKey)), ...patch }
    }));
  };

  /* ---- Calculs dérivés ---- */
  const fixedTotal = useMemo(
    () => month.fixedExpenses.reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [month.fixedExpenses]
  );
  const variableTotal = useMemo(
    () => month.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [month.expenses]
  );
  const savings = Number(month.savings) || 0;
  const revenu = Number(month.revenu) || 0;
  const totalUsed = fixedTotal + savings + variableTotal;
  const reste = revenu - totalUsed;
  const pct = revenu > 0 ? (totalUsed / revenu) * 100 : 0;
  const pctClamped = Math.min(100, Math.max(0, pct));

  let statut: "vert" | "orange" | "rouge" = "vert";
  if (reste < 0) statut = "rouge";
  else if (reste < 300) statut = "orange";

  const statutColor = { vert: "#2F6F4E", orange: "#C97A2B", rouge: "#B3432B" }[statut];
  const statutLabel = {
    vert: "Budget confortable",
    orange: "Attention : moins de 300 € restants",
    rouge: "Budget dépassé"
  }[statut];

  /* ---- Données graphiques ---- */
  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    month.expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [month.expenses]);

  const lineData = useMemo(() => {
    const nbDays = daysInMonth(currentMonthKey);
    const byDay: Record<number, number> = {};
    month.expenses.forEach((e) => {
      const day = Number(e.date?.split("-")[2]);
      if (day) byDay[day] = (byDay[day] || 0) + (Number(e.amount) || 0);
    });
    let cumul = 0;
    const data: { jour: number; total: number }[] = [];
    for (let d = 1; d <= nbDays; d++) {
      cumul += byDay[d] || 0;
      data.push({ jour: d, total: Math.round(cumul * 100) / 100 });
    }
    return data;
  }, [month.expenses, currentMonthKey]);

  const barData = [
    { name: "Revenu", montant: revenu, fill: "#2F6F4E" },
    { name: "Dépenses", montant: fixedTotal + variableTotal, fill: "#B3432B" },
    { name: "Épargne", montant: savings, fill: "#C9A24B" }
  ];

  /* ---- Gestion du formulaire de dépense ---- */
  const resetForm = () => {
    setForm({
      id: null,
      date: currentMonthKey === todayKey() ? `${currentMonthKey}-${pad(new Date().getDate())}` : `${currentMonthKey}-01`,
      category: "",
      amount: "",
      note: ""
    });
    setFormError("");
  };

  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonthKey]);

  const submitExpense = (e: FormEvent) => {
    e.preventDefault();
    if (!form.category) return setFormError("Choisis une catégorie.");
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return setFormError("Indique un montant valide.");
    if (!form.date) return setFormError("Indique une date.");

    if (form.id) {
      updateMonth({
        expenses: month.expenses.map((ex) =>
          ex.id === form.id ? { ...ex, date: form.date, category: form.category, amount: amt, note: form.note } : ex
        )
      });
    } else {
      const newExpense: Expense = {
        id: Date.now().toString(),
        date: form.date,
        category: form.category,
        amount: amt,
        note: form.note
      };
      updateMonth({ expenses: [...month.expenses, newExpense] });
    }
    resetForm();
    setQuickAddOpen(false);
  };

  const editExpense = (ex: Expense) => {
    setForm({ id: ex.id, date: ex.date, category: ex.category, amount: String(ex.amount), note: ex.note || "" });
    setActiveTab("expenses");
    setQuickAddOpen(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const deleteExpense = (id: string) => {
    updateMonth({ expenses: month.expenses.filter((ex) => ex.id !== id) });
    if (form.id === id) resetForm();
  };

  const updateFixedAmount = (id: string, val: number | "") => {
    updateMonth({
      fixedExpenses: month.fixedExpenses.map((f) => (f.id === id ? { ...f, amount: val === "" ? 0 : val } : f))
    });
  };

  const sortedMonthKeys = Object.keys(allData).sort((a, b) => (a < b ? 1 : -1));

  /* ---------------------------------------------------------------- */

  return (
    <div data-theme={theme} className="min-h-screen w-full font-sans transition-colors duration-300" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {/* ---------------- Header ---------------- */}
      <header className="safe-top sticky top-0 z-20 backdrop-blur border-b" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
              <Landmark size={18} color="white" />
            </div>
            <h1 className="font-display text-lg sm:text-xl font-semibold tracking-tight">Mon Budget</h1>
            <span
              className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-300"
              style={{
                color: justSaved ? "var(--accent)" : "var(--ink-soft)",
                background: justSaved ? "var(--accent-soft)" : "transparent",
                opacity: savedAt ? 1 : 0
              }}
            >
              <Check size={12} />
              {savedAt
                ? `Enregistré à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1 rounded-full px-1 py-1" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <button onClick={() => setCurrentMonthKey((k) => shiftMonth(k, -1))} className="p-1.5 rounded-full hover:opacity-70 transition" aria-label="Mois précédent">
                <ChevronLeft size={16} />
              </button>
              <span className="font-num text-xs sm:text-sm px-1 min-w-[110px] text-center capitalize">{monthLabel(currentMonthKey)}</span>
              <button onClick={() => setCurrentMonthKey((k) => shiftMonth(k, 1))} className="p-1.5 rounded-full hover:opacity-70 transition" aria-label="Mois suivant">
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="p-2 rounded-full hover:opacity-70 transition"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
              aria-label="Changer de thème"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>

        {/* Indicateur mobile : discret, sous le titre */}
        <div className="max-w-6xl mx-auto px-4 sm:hidden -mt-1 pb-1">
          <span
            className="inline-flex items-center gap-1 text-[11px] transition-opacity duration-300"
            style={{ color: justSaved ? "var(--accent)" : "var(--ink-soft)", opacity: savedAt ? 1 : 0 }}
          >
            <Check size={11} />
            {savedAt ? `Enregistré à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
        </div>

        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 pb-2 overflow-x-auto">
          {(
            [
              ["dashboard", "Tableau de bord"],
              ["expenses", "Dépenses"],
              ["charts", "Graphiques"],
              ["history", "Historique"]
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition"
              style={activeTab === key ? { background: "var(--accent)", color: "white" } : { background: "transparent", color: "var(--ink-soft)" }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ---------------- Tableau de bord ---------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 fade-up">
            <div className="rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row items-center gap-8" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <Gauge pct={pctClamped} color={statutColor} reste={reste} />
              <div className="flex-1 w-full space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${statutColor}1A`, color: statutColor }}>
                  {statut === "rouge" && <AlertTriangle size={13} />}
                  {statutLabel}
                </div>
                <p className="font-display text-sm text-[color:var(--ink-soft)]">Il te reste à dépenser ce mois-ci</p>
                <p className="font-num text-4xl sm:text-5xl font-semibold" style={{ color: statutColor }}>
                  {formatEuro(reste)}
                </p>
                <p className="text-sm text-[color:var(--ink-soft)]">{pct.toFixed(0)}% du budget utilisé sur {formatEuro(revenu)} de revenu</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={Wallet} label="Revenu mensuel" value={revenu} color="var(--accent)" editable onSave={(v) => updateMonth({ revenu: v })} />
              <StatCard icon={Receipt} label="Dépenses fixes" value={fixedTotal} color="var(--ink)" />
              <StatCard icon={PiggyBank} label="Épargne du mois" value={savings} color="var(--gold)" editable onSave={(v) => updateMonth({ savings: v })} />
              <StatCard icon={ShoppingBag} label="Dépenses variables" value={variableTotal} color="var(--danger)" />
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <h3 className="font-display text-base font-semibold mb-3">Dépenses fixes mensuelles</h3>
              <div className="ruled rounded-lg overflow-hidden">
                {month.fixedExpenses.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-2 h-7 text-sm">
                    <span className="text-[color:var(--ink-soft)]">{f.name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={f.amount}
                        onChange={(e) => updateFixedAmount(f.id, e.target.value === "" ? "" : Number(e.target.value))}
                        className="font-num w-20 text-right bg-transparent focus:outline-none"
                        style={{ color: "var(--ink)" }}
                      />
                      <span className="text-[color:var(--ink-soft)]">€</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-3 mt-1 border-t" style={{ borderColor: "var(--line)" }}>
                <span className="font-medium text-sm">Total</span>
                <span className="font-num font-semibold text-sm">{formatEuro(fixedTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Dépenses ---------------- */}
        {activeTab === "expenses" && (
          <div className="space-y-6 fade-up">
            <div ref={formRef} className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <h3 className="font-display text-base font-semibold mb-4">{form.id ? "Modifier la dépense" : "Ajouter une dépense variable"}</h3>
              <form onSubmit={submitExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-num focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  >
                    <option value="">Choisir…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-num focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Note (facultatif)</label>
                  <input
                    type="text"
                    placeholder="Un détail..."
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  />
                </div>

                {formError && (
                  <p className="sm:col-span-4 text-xs" style={{ color: "var(--danger)" }}>
                    {formError}
                  </p>
                )}

                <div className="sm:col-span-4 flex gap-2 justify-end pt-1">
                  {form.id && (
                    <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
                      <X size={14} /> Annuler
                    </button>
                  )}
                  <button type="submit" className="px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 text-white transition hover:opacity-90" style={{ background: "var(--accent)" }}>
                    {form.id ? <Check size={14} /> : <Plus size={14} />}
                    {form.id ? "Enregistrer" : "Ajouter"}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-semibold">Dépenses du mois</h3>
                <span className="font-num text-sm text-[color:var(--ink-soft)]">{formatEuro(variableTotal)} au total</span>
              </div>

              {month.expenses.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-soft)] py-6 text-center">Aucune dépense enregistrée ce mois-ci. Ajoute-en une ci-dessus.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {[...month.expenses]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((ex) => (
                      <div key={ex.id} className="flex items-center gap-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                        <span className="font-num text-xs text-[color:var(--ink-soft)] w-14 shrink-0">{ex.date?.split("-").slice(1).reverse().join("/")}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: `${CATEGORY_COLORS[ex.category]}1A`, color: CATEGORY_COLORS[ex.category] }}>
                          {ex.category}
                        </span>
                        <span className="text-sm text-[color:var(--ink-soft)] flex-1 truncate">{ex.note}</span>
                        <span className="font-num text-sm font-medium shrink-0">{formatEuro(ex.amount)}</span>
                        <button onClick={() => editExpense(ex)} className="p-1.5 rounded-md hover:opacity-70 shrink-0" aria-label="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteExpense(ex.id)} className="p-1.5 rounded-md hover:opacity-70 shrink-0" style={{ color: "var(--danger)" }} aria-label="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Graphiques ---------------- */}
        {activeTab === "charts" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-up">
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <h3 className="font-display text-base font-semibold mb-4">Répartition par catégorie</h3>
              {pieData.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-soft)] py-16 text-center">Pas encore de dépenses à afficher.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#9C8B6E"} stroke="var(--surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatEuro(v)} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <h3 className="font-display text-base font-semibold mb-4">Évolution des dépenses</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v: number) => formatEuro(v)} labelFormatter={(l) => `Jour ${l}`} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)" }} />
                  <Line type="monotone" dataKey="total" stroke="#2F6F4E" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <h3 className="font-display text-base font-semibold mb-4">Revenu, dépenses et épargne</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v: number) => formatEuro(v)} contentStyle={{ borderRadius: 10, border: "1px solid var(--line)" }} />
                  <Bar dataKey="montant" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ---------------- Historique ---------------- */}
        {activeTab === "history" && (
          <div className="fade-up space-y-3">
            {sortedMonthKeys.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-soft)] py-8 text-center">Aucun mois enregistré pour le moment.</p>
            ) : (
              sortedMonthKeys.map((key) => {
                const m = allData[key];
                const ft = m.fixedExpenses.reduce((s, f) => s + (Number(f.amount) || 0), 0);
                const vt = m.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                const sv = Number(m.savings) || 0;
                const rv = Number(m.revenu) || 0;
                const r = rv - ft - sv - vt;
                const color = r < 0 ? "var(--danger)" : r < 300 ? "var(--warning)" : "var(--accent)";
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setCurrentMonthKey(key);
                      setActiveTab("dashboard");
                    }}
                    className="w-full flex items-center justify-between rounded-2xl p-4 text-left transition hover:opacity-90"
                    style={{ background: "var(--surface)", boxShadow: "var(--shadow)", outline: key === currentMonthKey ? "2px solid var(--accent)" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays size={18} className="text-[color:var(--ink-soft)]" />
                      <div>
                        <p className="font-display font-medium capitalize">{monthLabel(key)}</p>
                        <p className="text-xs text-[color:var(--ink-soft)]">
                          {m.expenses.length} dépense{m.expenses.length !== 1 ? "s" : ""} · Épargne {formatEuro(sv)}
                        </p>
                      </div>
                    </div>
                    <span className="font-num font-semibold" style={{ color }}>
                      {formatEuro(r)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      <footer className="safe-bottom max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-2 text-xs text-[color:var(--ink-soft)] text-center">
        Reste à vivre = Revenu − Dépenses fixes − Épargne − Dépenses variables
      </footer>

      {/* ---------------- Bouton flottant : ajout rapide ---------------- */}
      <button
        onClick={() => {
          resetForm();
          setQuickAddOpen(true);
        }}
        className="safe-fab fixed z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition hover:scale-105 active:scale-95"
        style={{ background: "var(--accent)", boxShadow: "0 10px 24px -6px color-mix(in srgb, var(--accent) 60%, transparent)" }}
        aria-label="Ajouter une dépense rapidement"
      >
        <Plus size={26} />
      </button>

      {/* ---------------- Modale d'ajout rapide ---------------- */}
      {quickAddOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(10,15,10,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickAddOpen(false);
          }}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 fade-up" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Ajout rapide</h3>
              <button onClick={() => setQuickAddOpen(false)} className="p-1.5 rounded-full hover:opacity-70" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Date</label>
                  <input
                    type="date"
                    autoFocus
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-num focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-num focus:outline-none focus:ring-2"
                    style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[color:var(--ink-soft)] block mb-1.5">Catégorie</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      className="px-2.5 py-1 rounded-full text-xs border transition"
                      style={
                        form.category === c
                          ? { background: CATEGORY_COLORS[c], color: "white", borderColor: CATEGORY_COLORS[c] }
                          : { background: "var(--surface-2)", color: "var(--ink-soft)", borderColor: "var(--line)" }
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[color:var(--ink-soft)] block mb-1">Note (facultatif)</label>
                <input
                  type="text"
                  placeholder="Un détail..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
                />
              </div>

              {formError && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  {formError}
                </p>
              )}

              <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition hover:opacity-90 inline-flex items-center justify-center gap-1.5" style={{ background: "var(--accent)" }}>
                <Plus size={16} /> Ajouter la dépense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
