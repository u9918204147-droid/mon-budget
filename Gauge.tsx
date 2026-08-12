import { TrendingUp, TrendingDown } from "lucide-react";

interface GaugeProps {
  pct: number;
  color: string;
  reste: number;
}

export default function Gauge({ pct, color, reste }: GaugeProps) {
  const r = 82;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative w-[200px] h-[200px] shrink-0">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} stroke="var(--line)" strokeWidth="14" fill="none" />
        <circle
          cx="100"
          cy="100"
          r={r}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 0.7s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {reste >= 0 ? <TrendingUp size={16} color={color} /> : <TrendingDown size={16} color={color} />}
        <span className="font-num text-2xl font-semibold" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
        <span className="text-[10px] text-[color:var(--ink-soft)] uppercase tracking-wide">utilisé</span>
      </div>
    </div>
  );
}
