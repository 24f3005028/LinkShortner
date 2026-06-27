"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";

interface ExpiryPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onClose: () => void;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Analog Clock ──────────────────────────────────────────────────────────────
type ClockMode = "hour" | "minute" | "ampm";

const SIZE   = 256;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const RADIUS = 96;

function polarToCart(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

interface AnalogClockProps {
  mode: "hour" | "minute";
  hour: number;    // 1-12
  minute: number;  // 0-59
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onModeChange: (mode: ClockMode) => void;
}

function AnalogClock({ mode, hour, minute, onHourChange, onMinuteChange, onModeChange }: AnalogClockProps) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const isPointerDown = useRef(false);

  function getAngleFromEvent(e: React.PointerEvent): number {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect  = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const x     = (e.clientX - rect.left) * scale - CX;
    const y     = (e.clientY - rect.top)  * scale - CY;
    let angle   = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }

  function applyAngle(angle: number) {
    if (mode === "hour") {
      const raw = Math.round(angle / 30) % 12;
      onHourChange(raw === 0 ? 12 : raw);
    } else {
      const raw = Math.round(angle / 6) % 60;
      onMinuteChange(raw < 0 ? raw + 60 : raw);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    isPointerDown.current = true;
    svgRef.current?.setPointerCapture(e.pointerId);
    applyAngle(getAngleFromEvent(e));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isPointerDown.current) return;
    applyAngle(getAngleFromEvent(e));
  }
  function onPointerUp(e: React.PointerEvent) {
    isPointerDown.current = false;
    applyAngle(getAngleFromEvent(e));
    if (mode === "hour")   onModeChange("minute");
    if (mode === "minute") onModeChange("ampm");
  }

  const handAngle = mode === "hour"
    ? ((hour % 12) / 12) * 360
    : (minute / 60) * 360;

  const handTip = polarToCart(handAngle, RADIUS - 18);

  const hourNumbers  = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteLabels = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <svg
      ref={svgRef}
      width={SIZE} height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="touch-none select-none cursor-pointer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Face */}
      <circle cx={CX} cy={CY} r={CX - 4} className="fill-muted/30" />

      {/* Minute tick marks */}
      {mode === "minute" && Array.from({ length: 60 }).map((_, i) => {
        const isMajor = i % 5 === 0;
        const p1 = polarToCart(i * 6, CX - 8);
        const p2 = polarToCart(i * 6, CX - (isMajor ? 16 : 12));
        return (
          <line key={i}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            strokeWidth={isMajor ? 2 : 1}
            className={isMajor ? "stroke-border" : "stroke-border/40"}
          />
        );
      })}

      {/* Hand */}
      <line
        x1={CX} y1={CY} x2={handTip.x} y2={handTip.y}
        strokeWidth={2} strokeLinecap="round"
        className="stroke-primary"
      />

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={4} className="fill-primary" />

      {/* Hand tip glow + dot */}
      <circle cx={handTip.x} cy={handTip.y} r={18} className="fill-primary opacity-20" />
      <circle cx={handTip.x} cy={handTip.y} r={10} className="fill-primary" />

      {/* Hour labels 1–12 */}
      {mode === "hour" && hourNumbers.map((h, i) => {
        const pos     = polarToCart(i * 30, RADIUS);
        const isExact = h === hour;
        return (
          <text key={h}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={13} fontWeight={isExact ? "700" : "500"}
            className={isExact ? undefined : "fill-foreground"}
            style={isExact ? { fill: 'rgb(34,197,94)', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.85))' } : undefined}
          >
            {h}
          </text>
        );
      })}

      {/* Minute labels every 5 mins */}
      {mode === "minute" && minuteLabels.map((m, i) => {
        const pos     = polarToCart(i * 30, RADIUS);
        const isExact = m === minute;
        return (
          <text key={m}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={13} fontWeight={isExact ? "700" : "500"}
            className={isExact ? undefined : "fill-foreground"}
            style={isExact ? { fill: 'rgb(34,197,94)', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.85))' } : undefined}
          >
            {String(m).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main ExpiryPicker ─────────────────────────────────────────────────────────

export default function ExpiryPicker({ value, onChange, onClose }: ExpiryPickerProps) {
  const now      = new Date();
  const initDate = value ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59);

  const initH24  = initDate.getHours();
  const init12   = initH24 === 0 ? 12 : initH24 > 12 ? initH24 - 12 : initH24;

  const [step, setStep]         = useState<"calendar" | "clock">("calendar");
  const [clockMode, setClockMode] = useState<ClockMode>("hour");
  const [year, setYear]         = useState(initDate.getFullYear());
  const [month, setMonth]       = useState(initDate.getMonth());
  const [day, setDay]           = useState(initDate.getDate());
  const [hour, setHour]         = useState(init12);         // 1-12
  const [minute, setMinute]     = useState(initDate.getMinutes());
  const [ampm, setAmpm]         = useState<"AM" | "PM">(initH24 < 12 ? "AM" : "PM");
  const containerRef            = useRef<HTMLDivElement>(null);

  const pad = (n: number) => String(n).padStart(2, "0");

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const totalDays = daysInMonth(year, month);
  const firstDow  = new Date(year, month, 1).getDay();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setDay(1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setDay(1);
  }
  function isPast(d: number) { return new Date(year, month, d, 23, 59) < now; }

  function handleConfirm() {
    const h24 = (hour % 12) + (ampm === "PM" ? 12 : 0);
    onChange(new Date(year, month, day, h24, minute, 0, 0));
    onClose();
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 mt-2 rounded-2xl border border-border/60 bg-popover shadow-xl overflow-hidden"
      style={{ minWidth: 300, width: 300 }}
      role="dialog"
      aria-label="Select expiry date and time"
    >
      {/* ── Tab bar ── */}
      <div className="flex border-b border-border/40">
        {(["calendar", "clock"] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={[
              "flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors inline-flex items-center justify-center gap-1.5",
              step === s
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {s === "calendar"
              ? <><CalendarDays className="size-3.5" aria-hidden />Date</>
              : <><Clock className="size-3.5" aria-hidden />Time</>
            }
          </button>
        ))}
      </div>

      {/* ── Calendar ── */}
      {step === "calendar" && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} aria-label="Previous month"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
            <button type="button" onClick={nextMonth} aria-label="Next month"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }).map((_, i) => {
              const d     = i + 1;
              const sel   = d === day;
              const dis   = isPast(d);
              const today = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              return (
                <button key={d} type="button" disabled={dis} onClick={() => setDay(d)}
                  className={[
                    "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    dis  && "opacity-30 cursor-not-allowed",
                    sel  && !dis && "bg-primary text-primary-foreground font-bold",
                    !sel && !dis && today  && "border border-primary/40 text-primary",
                    !sel && !dis && !today && "hover:bg-muted text-foreground",
                  ].filter(Boolean).join(" ")}>
                  {d}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setStep("clock")}
            className="mt-4 w-full h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all">
            Next →
          </button>
        </div>
      )}

      {/* ── Clock ── */}
      {step === "clock" && (
        <div key="clock" className="p-4 flex flex-col items-center gap-3">

          {/* Tappable date link */}
          <p className="text-xs text-muted-foreground text-center">
            Expiry on{" "}
            <button type="button" onClick={() => setStep("calendar")}
              className="font-semibold text-primary hover:underline underline-offset-2">
              {MONTHS[month]} {day}, {year}
            </button>
          </p>

          {/* Digital readout — HH : MM  AM/PM */}
          <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/30 px-4 py-2 text-3xl font-bold tabular-nums select-none">
            <button type="button" onClick={() => setClockMode("hour")}
              aria-label="Edit hour"
              className={["px-1 rounded-lg transition-colors",
                clockMode === "hour" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}>
              {pad(hour)}
            </button>
            <span className="text-muted-foreground pb-0.5">:</span>
            <button type="button" onClick={() => setClockMode("minute")}
              aria-label="Edit minute"
              className={["px-1 rounded-lg transition-colors",
                clockMode === "minute" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}>
              {pad(minute)}
            </button>
            <button type="button" onClick={() => setClockMode("ampm")}
              aria-label="Edit AM/PM"
              className={["ml-2 text-lg px-2 py-0.5 rounded-lg transition-colors",
                clockMode === "ampm" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}>
              {ampm}
            </button>
          </div>

          {/* Instruction label */}
          <p className="text-xs text-muted-foreground">
            {clockMode === "hour"   && "Select hour"}
            {clockMode === "minute" && "Select minute"}
            {clockMode === "ampm"   && "Select AM or PM"}
          </p>

          {/* Analog clock face — hour + minute only */}
          {(clockMode === "hour" || clockMode === "minute") && (
            <div className="rounded-full overflow-hidden">
              <AnalogClock
                mode={clockMode}
                hour={hour}
                minute={minute}
                onHourChange={setHour}
                onMinuteChange={setMinute}
                onModeChange={setClockMode}
              />
            </div>
          )}

          {/* AM / PM step — large tap targets */}
          {clockMode === "ampm" && (
            <div className="flex gap-3 w-full py-2">
              {(["AM", "PM"] as const).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setAmpm(period)}
                  className={[
                    "flex-1 h-16 rounded-2xl text-2xl font-bold transition-all duration-150 border",
                    ampm === period
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.03]"
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {period}
                </button>
              ))}
            </div>
          )}

          {/* Confirm */}
          <button type="button" onClick={handleConfirm}
            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all">
            Set till {MONTHS[month]} {day} at {pad(hour)}:{pad(minute)} {ampm}
          </button>

          {/* Never expires */}
          <button type="button" onClick={() => { onChange(null); onClose(); }}
            className="w-full h-9 rounded-xl border border-border/60 text-muted-foreground text-sm font-medium hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
            </svg>
            Never expire
          </button>
        </div>
      )}
    </div>
  );
}