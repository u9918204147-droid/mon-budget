import { useEffect, useState } from "react";
import { Pencil, Check, LucideIcon } from "lucide-react";
import { formatEuro } from "../utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  editable?: boolean;
  onSave?: (v: number) => void;
}

export default function StatCard({ icon: Icon, label, value, color, editable = false, onSave }: StatCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | number>(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="rounded-2xl p-4 fade-up" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1A` }}>
          <Icon size={16} color={color} />
        </div>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} className="p-1 rounded-md hover:opacity-70" aria-label={`Modifier ${label}`}>
            <Pencil size={12} className="text-[color:var(--ink-soft)]" />
          </button>
        )}
      </div>
      <p className="text-xs text-[color:var(--ink-soft)] mb-1">{label}</p>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave?.(Number(draft) || 0);
            setEditing(false);
          }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-num w-full text-lg font-semibold bg-transparent focus:outline-none border-b"
            style={{ borderColor: color, color: "var(--ink)" }}
          />
          <button type="submit" className="p-1 rounded-md" style={{ color }}>
            <Check size={16} />
          </button>
        </form>
      ) : (
        <p className="font-num text-xl sm:text-2xl font-semibold" style={{ color }}>
          {formatEuro(value)}
        </p>
      )}
    </div>
  );
}
