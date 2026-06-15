import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, History, ArrowRightLeft, Copy, Trash2,
  Save, Moon, Sun, Download, Search, TrendingUp, Ruler,
  Percent, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useHistory } from '@/hooks/use-history';
import { formatCm, formatInch, decimalToFraction } from '@/lib/math';

type Unit = 'CM' | 'INCH';

// ─────────────────────────────────────────────────────────────────────────────
// Field is defined OUTSIDE the parent component so its reference is stable.
// If it were defined inside, React would treat it as a new component on every
// render and unmount/remount the <Input>, stealing keyboard focus.
// ─────────────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
  hasError?: boolean;
  errorMsg?: string;
}

const Field = memo(({ label, value, onChange, placeholder, suffix, hasError, errorMsg }: FieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground/80">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        step="any"
        inputMode="decimal"
        className={`font-mono text-base h-12 pl-4 pr-14 transition-colors ${
          hasError ? 'border-destructive focus-visible:ring-destructive' : ''
        }`}
      />
      <span className="absolute right-3 top-0 h-full flex items-center text-sm text-muted-foreground font-mono pointer-events-none select-none">
        {suffix}
      </span>
    </div>
    {hasError && errorMsg && (
      <p className="text-xs text-destructive">{errorMsg}</p>
    )}
  </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// Small layout helpers (also outside the component)
// ─────────────────────────────────────────────────────────────────────────────
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 my-1">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground px-2">{label}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const resultVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.15 } },
};

const formulaVariants = {
  hidden:  { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0, transition: { duration: 0.18 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────
const isValidNum = (v: string) =>
  v.trim() !== '' && !isNaN(parseFloat(v)) && isFinite(Number(v)) && parseFloat(v) >= 0;

const isPositiveNum = (v: string) => isValidNum(v) && parseFloat(v) > 0;

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function CalculatorApp() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { history, addRecord, deleteRecord, clearHistory, exportCsv } = useHistory();

  // Global settings
  const [unit, setUnit] = useState<Unit>('CM');
  const [precision, setPrecision] = useState(2);

  // Measurements Calculator inputs
  const [mcChart, setMcChart] = useState('');
  const [mcPattern, setMcPattern] = useState('');
  const [mcShrinkage, setMcShrinkage] = useState('');
  const [showMcFormula, setShowMcFormula] = useState(false);

  // Percentage Increase Calculator inputs
  const [piChart, setPiChart] = useState('');
  const [piPattern, setPiPattern] = useState('');
  const [showPiFormula, setShowPiFormula] = useState(false);

  // Quick Converter
  const [cmInput, setCmInput] = useState('');
  const [inchInput, setInchInput] = useState('');

  // History search
  const [searchQuery, setSearchQuery] = useState('');

  // Restore preferences
  useEffect(() => {
    const savedUnit = localStorage.getItem('garment-unit') as Unit | null;
    if (savedUnit === 'CM' || savedUnit === 'INCH') setUnit(savedUnit);
    const savedPrec = localStorage.getItem('garment-precision');
    if (savedPrec) setPrecision(Number(savedPrec));
  }, []);

  useEffect(() => { localStorage.setItem('garment-unit', unit); }, [unit]);
  useEffect(() => { localStorage.setItem('garment-precision', precision.toString()); }, [precision]);

  // ── Measurements Calculator results ────────────────────────────────────────
  const mcResults = useMemo(() => {
    if (!isPositiveNum(mcChart) || !isValidNum(mcPattern) || !isValidNum(mcShrinkage)) return null;
    const c = parseFloat(mcChart);
    const p = parseFloat(mcPattern);
    const s = parseFloat(mcShrinkage);
    const final = p * (1 + s / 100);
    const required = ((final - c) / c) * 100;
    return { final, required };
  }, [mcChart, mcPattern, mcShrinkage]);

  // ── Percentage Increase results ────────────────────────────────────────────
  const piResults = useMemo(() => {
    if (!isPositiveNum(piChart) || !isValidNum(piPattern)) return null;
    const c = parseFloat(piChart);
    const p = parseFloat(piPattern);
    return { pct: ((p - c) / c) * 100 };
  }, [piChart, piPattern]);

  // ── Format helpers ─────────────────────────────────────────────────────────
  const fmt = useCallback((v: number) =>
    unit === 'CM' ? formatCm(v, precision) : formatInch(v, precision),
  [unit, precision]);

  const fmtPct = useCallback((v: number) => `${v.toFixed(precision)}%`, [precision]);

  // ── Converter ──────────────────────────────────────────────────────────────
  const handleCmChange = useCallback((val: string) => {
    setCmInput(val);
    const n = parseFloat(val);
    setInchInput(!isNaN(n) ? (n / 2.54).toFixed(3) : '');
  }, []);

  const handleInchChange = useCallback((val: string) => {
    setInchInput(val);
    const n = parseFloat(val);
    setCmInput(!isNaN(n) ? (n * 2.54).toFixed(3) : '');
  }, []);

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveMc = useCallback(() => {
    if (!mcResults) {
      toast({ title: 'Nothing to save', description: 'Enter valid measurements first.', variant: 'destructive' });
      return;
    }
    addRecord({
      calcType: 'shrinkage',
      unit,
      chartValue: parseFloat(mcChart),
      patternMeasurement: parseFloat(mcPattern),
      patternShrinkage: parseFloat(mcShrinkage),
      finalMeasurement: mcResults.final,
      requiredShrinkage: mcResults.required,
      percentageIncrease: 0,
    });
    toast({ title: 'Saved', description: 'Shrinkage calculation added to history.' });
  }, [mcResults, unit, mcChart, mcPattern, mcShrinkage, addRecord, toast]);

  const handleSavePi = useCallback(() => {
    if (!piResults) {
      toast({ title: 'Nothing to save', description: 'Enter valid measurements first.', variant: 'destructive' });
      return;
    }
    addRecord({
      calcType: 'percentage_increase',
      unit,
      chartValue: parseFloat(piChart),
      patternMeasurement: parseFloat(piPattern),
      patternShrinkage: 0,
      finalMeasurement: 0,
      requiredShrinkage: 0,
      percentageIncrease: piResults.pct,
    });
    toast({ title: 'Saved', description: 'Percentage increase added to history.' });
  }, [piResults, unit, piChart, piPattern, addRecord, toast]);

  // ── Copy handlers ──────────────────────────────────────────────────────────
  const handleCopyMc = useCallback(() => {
    if (!mcResults) return;
    navigator.clipboard.writeText(`${mcResults.required.toFixed(precision)}%`);
    toast({ title: 'Copied!', description: 'Required Shrinkage % copied.' });
  }, [mcResults, precision, toast]);

  const handleCopyPi = useCallback(() => {
    if (!piResults) return;
    navigator.clipboard.writeText(`${piResults.pct.toFixed(precision)}%`);
    toast({ title: 'Copied!', description: 'Percentage Increase % copied.' });
  }, [piResults, precision, toast]);

  // ── Clear handlers ─────────────────────────────────────────────────────────
  const handleClearMc = useCallback(() => {
    setMcChart(''); setMcPattern(''); setMcShrinkage('');
  }, []);

  const handleClearPi = useCallback(() => {
    setPiChart(''); setPiPattern('');
  }, []);

  // ── Filtered history ───────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(r =>
      r.chartValue.toString().includes(q) ||
      r.patternMeasurement.toString().includes(q) ||
      r.unit.toLowerCase().includes(q) ||
      (r.calcType ?? '').includes(q) ||
      new Date(r.date).toLocaleDateString().includes(q)
    );
  }, [history, searchQuery]);

  const unitSuffix = unit === 'CM' ? 'cm' : 'in';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 pb-20 space-y-10">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
                <Calculator className="h-5 w-5" />
              </span>
              Garment Shrinkage Calculator Pro
            </h1>
            <p className="text-muted-foreground mt-1 text-sm pl-[52px]">
              Professional pattern making &amp; shrinkage analysis
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 flex items-center justify-center rounded-lg border bg-card hover:bg-muted transition-colors shadow-sm"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
              {(['CM', 'INCH'] as Unit[]).map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${
                    unit === u
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            <Select value={precision.toString()} onValueChange={v => setPrecision(Number(v))}>
              <SelectTrigger className="w-[108px] h-9 text-xs font-mono shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 decimal</SelectItem>
                <SelectItem value="2">2 decimals</SelectItem>
                <SelectItem value="3">3 decimals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════════
            1. QUICK CONVERTER
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Quick Converter" />
          <Card className="border-border/60 shadow-sm mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Centimeters</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={cmInput}
                      onChange={e => handleCmChange(e.target.value)}
                      placeholder="0.000"
                      step="any"
                      min={0}
                      inputMode="decimal"
                      className="font-mono text-lg h-12 pr-12"
                    />
                    <span className="absolute right-3 top-0 h-full flex items-center text-sm text-muted-foreground font-mono pointer-events-none">cm</span>
                  </div>
                </div>

                <div className="flex justify-center sm:pb-1.5">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Inches</Label>
                    {inchInput && !isNaN(parseFloat(inchInput)) && (
                      <span className="text-xs text-muted-foreground font-mono">
                        ({decimalToFraction(parseFloat(inchInput))}")
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={inchInput}
                      onChange={e => handleInchChange(e.target.value)}
                      placeholder="0.000"
                      step="any"
                      min={0}
                      inputMode="decimal"
                      className="font-mono text-lg h-12 pr-10"
                    />
                    <span className="absolute right-3 top-0 h-full flex items-center text-sm text-muted-foreground font-mono pointer-events-none">in</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">1 inch = 2.54 cm &nbsp;·&nbsp; Converts live while typing</p>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            2. PATTERN SHRINKAGE CALCULATION
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Pattern Shrinkage Calculation" />
          <Card className="border-border/60 shadow-sm mt-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ruler className="h-5 w-5 text-primary" />
                Pattern Shrinkage Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field
                  label={`Measurement Chart Value (${unitSuffix})`}
                  value={mcChart}
                  onChange={setMcChart}
                  placeholder="e.g. 20"
                  suffix={unitSuffix}
                  hasError={mcChart !== '' && !isPositiveNum(mcChart)}
                  errorMsg="Must be a positive number."
                />
                <Field
                  label={`Pattern Measurement Value (${unitSuffix})`}
                  value={mcPattern}
                  onChange={setMcPattern}
                  placeholder="e.g. 23"
                  suffix={unitSuffix}
                  hasError={mcPattern !== '' && !isValidNum(mcPattern)}
                  errorMsg="Must be 0 or greater."
                />
                <Field
                  label="Pattern Shrinkage %"
                  value={mcShrinkage}
                  onChange={setMcShrinkage}
                  placeholder="e.g. 10"
                  suffix="%"
                  hasError={mcShrinkage !== '' && !isValidNum(mcShrinkage)}
                  errorMsg="Must be 0 or greater."
                />
              </div>

              {/* Inline Result Cards */}
              <AnimatePresence>
                {mcResults && (
                  <motion.div
                    key="mc-results"
                    variants={resultVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {/* Final Pattern Measurement */}
                    <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-md">
                      <p className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/70 mb-2 flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5" /> Final Pattern Measurement
                      </p>
                      <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight leading-none">
                        {fmt(mcResults.final)}
                      </p>
                      {unit === 'INCH' && (
                        <p className="font-mono text-sm text-primary-foreground/60 mt-1">
                          ({decimalToFraction(mcResults.final)}")
                        </p>
                      )}
                      <p className="text-xs text-primary-foreground/50 mt-3">After applying pattern shrinkage</p>
                    </div>

                    {/* Required Shrinkage */}
                    <div className="rounded-2xl bg-accent text-accent-foreground p-5 shadow-md">
                      <p className="text-xs font-semibold tracking-widest uppercase text-accent-foreground/70 mb-2 flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5" /> Required Shrinkage %
                      </p>
                      <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight leading-none">
                        {fmtPct(mcResults.required)}
                      </p>
                      <p className="text-xs text-accent-foreground/50 mt-3">Required shrinkage based on chart measurement</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="outline" size="sm" onClick={handleSaveMc} disabled={!mcResults}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyMc} disabled={!mcResults}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Result
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearMc} className="text-muted-foreground">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
                </Button>
              </div>

              {/* Formula Toggle */}
              <div>
                <button
                  onClick={() => setShowMcFormula(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {showMcFormula ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showMcFormula ? 'Hide Formula' : 'Show Formula'}
                </button>

                <AnimatePresence>
                  {showMcFormula && (
                    <motion.div
                      key="mc-formula"
                      variants={formulaVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="mt-3 bg-muted/60 rounded-xl p-4 font-mono text-sm space-y-3">
                        <div>
                          <div className="text-muted-foreground text-xs mb-1">Step 1 — Final Pattern Measurement</div>
                          {mcResults && isValidNum(mcPattern) && isValidNum(mcShrinkage) ? (
                            <div>
                              <span className="text-primary font-bold">{parseFloat(mcPattern).toFixed(precision)}</span>
                              <span className="text-muted-foreground"> × (1 + </span>
                              <span className="text-primary font-bold">{parseFloat(mcShrinkage).toFixed(precision)}</span>
                              <span className="text-muted-foreground"> ÷ 100) = </span>
                              <span className="text-accent font-bold">{mcResults.final.toFixed(precision)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">Pattern × (1 + Shrinkage% ÷ 100)</span>
                          )}
                        </div>
                        <Separator />
                        <div>
                          <div className="text-muted-foreground text-xs mb-1">Step 2 — Required Shrinkage %</div>
                          {mcResults && isValidNum(mcChart) ? (
                            <div>
                              <span className="text-muted-foreground">(</span>
                              <span className="text-primary font-bold">{mcResults.final.toFixed(precision)}</span>
                              <span className="text-muted-foreground"> − </span>
                              <span className="text-primary font-bold">{parseFloat(mcChart).toFixed(precision)}</span>
                              <span className="text-muted-foreground">) ÷ </span>
                              <span className="text-primary font-bold">{parseFloat(mcChart).toFixed(precision)}</span>
                              <span className="text-muted-foreground"> × 100 = </span>
                              <span className="text-accent font-bold">{mcResults.required.toFixed(precision)}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">((Final − Chart) ÷ Chart) × 100</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            3. MEASUREMENT PERCENTAGE INCREASE
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Measurement Percentage Increase" />
          <Card className="border-border/60 shadow-sm mt-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
                Measurement Percentage Increase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  label={`Measurement Chart Value (${unitSuffix})`}
                  value={piChart}
                  onChange={setPiChart}
                  placeholder="e.g. 20"
                  suffix={unitSuffix}
                  hasError={piChart !== '' && !isPositiveNum(piChart)}
                  errorMsg="Must be a positive number."
                />
                <Field
                  label={`Pattern Measurement Value (${unitSuffix})`}
                  value={piPattern}
                  onChange={setPiPattern}
                  placeholder="e.g. 26"
                  suffix={unitSuffix}
                  hasError={piPattern !== '' && !isValidNum(piPattern)}
                  errorMsg="Must be 0 or greater."
                />
              </div>

              {/* Inline Result Card */}
              <AnimatePresence>
                {piResults && (
                  <motion.div
                    key="pi-result"
                    variants={resultVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="rounded-2xl bg-emerald-600 dark:bg-emerald-700 text-white p-5 shadow-md">
                      <p className="text-xs font-semibold tracking-widest uppercase text-white/70 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Percentage Increase %
                      </p>
                      <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight leading-none">
                        {fmtPct(piResults.pct)}
                      </p>
                      {isPositiveNum(piChart) && isValidNum(piPattern) && (
                        <p className="font-mono text-sm text-white/60 mt-1">
                          {parseFloat(piChart).toFixed(precision)} → {parseFloat(piPattern).toFixed(precision)}
                        </p>
                      )}
                      <p className="text-xs text-white/50 mt-3">Increase from chart value to pattern measurement</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="outline" size="sm" onClick={handleSavePi} disabled={!piResults}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyPi} disabled={!piResults}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Result
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearPi} className="text-muted-foreground">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
                </Button>
              </div>

              {/* Formula Toggle */}
              <div>
                <button
                  onClick={() => setShowPiFormula(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {showPiFormula ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showPiFormula ? 'Hide Formula' : 'Show Formula'}
                </button>

                <AnimatePresence>
                  {showPiFormula && (
                    <motion.div
                      key="pi-formula"
                      variants={formulaVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="mt-3 bg-muted/60 rounded-xl p-4 font-mono text-sm">
                        <div className="text-muted-foreground text-xs mb-1">Percentage Increase</div>
                        {piResults && isValidNum(piChart) && isValidNum(piPattern) ? (
                          <div>
                            <span className="text-muted-foreground">(</span>
                            <span className="text-primary font-bold">{parseFloat(piPattern).toFixed(precision)}</span>
                            <span className="text-muted-foreground"> − </span>
                            <span className="text-primary font-bold">{parseFloat(piChart).toFixed(precision)}</span>
                            <span className="text-muted-foreground">) ÷ </span>
                            <span className="text-primary font-bold">{parseFloat(piChart).toFixed(precision)}</span>
                            <span className="text-muted-foreground"> × 100 = </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{piResults.pct.toFixed(precision)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">((Pattern − Chart) ÷ Chart) × 100</span>
                        )}
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-1 text-muted-foreground/60 text-xs">
                          <div>Example: 20 → 26 = 30%</div>
                          <div>Example: 20 → 25.3 = 26.5%</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            4. HISTORY
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="History" />
          <Card className="border-border/60 shadow-sm mt-4">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Calculation History
                  {history.length > 0 && (
                    <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-normal">
                      {history.length}
                    </span>
                  )}
                </CardTitle>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={exportCsv} className="text-muted-foreground">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                  </Button>
                )}
              </div>
              {history.length > 0 && (
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-muted/40 border-none focus-visible:ring-1"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {filteredHistory.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
                  <History className="h-10 w-10 opacity-20" />
                  <p className="text-sm">
                    {history.length === 0 ? 'No calculations saved yet.' : 'No results match your search.'}
                  </p>
                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground/60">
                      Use the Save button in either calculator above.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[540px]">
                    <div className="divide-y divide-border">
                      {filteredHistory.map(record => {
                        const isShrinkage = record.calcType !== 'percentage_increase';
                        return (
                          <div key={record.id} className="px-5 py-4 hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="text-xs text-muted-foreground/50">·</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {new Date(record.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono">
                                  {record.unit}
                                </span>
                                <span className={`text-xs rounded px-1.5 py-0.5 font-mono ${
                                  isShrinkage
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {isShrinkage ? 'Shrinkage' : '% Increase'}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                                onClick={() => deleteRecord(record.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 font-mono text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Chart</div>
                                <div>{record.chartValue} {record.unit.toLowerCase()}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Pattern</div>
                                <div>{record.patternMeasurement} {record.unit.toLowerCase()}</div>
                              </div>
                              {isShrinkage ? (
                                <>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-0.5">Input Shrinkage</div>
                                    <div>{record.patternShrinkage}%</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-0.5">Final Measurement</div>
                                    <div className="text-primary font-bold">
                                      {record.unit === 'CM'
                                        ? formatCm(record.finalMeasurement, precision)
                                        : formatInch(record.finalMeasurement, precision)}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2">
                                  <div className="text-xs text-muted-foreground mb-0.5">Percentage Increase</div>
                                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {record.percentageIncrease.toFixed(precision)}%
                                  </div>
                                </div>
                              )}
                            </div>

                            {isShrinkage && (
                              <div className="mt-2 font-mono text-sm">
                                <div className="text-xs text-muted-foreground mb-0.5">Required Shrinkage</div>
                                <div className="text-accent font-bold">{record.requiredShrinkage.toFixed(precision)}%</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t bg-muted/20">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                      onClick={clearHistory}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete All History
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            ABOUT DEVELOPER
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="About Developer" />
          <div className="mt-4 flex justify-center">
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">

              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

              <div className="px-6 py-7 flex flex-col items-center gap-5 text-center">

                {/* Avatar / initials */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="text-primary-foreground font-bold text-2xl tracking-tight select-none">ME</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card" title="Active" />
                </div>

                {/* Name & role */}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">MH Emon</h2>
                  <p className="text-sm text-muted-foreground leading-snug max-w-xs">
                    Professional Garment Pattern &amp;<br />Shrinkage Calculation Tool Developer
                  </p>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="text-base" aria-label="Bangladesh">🇧🇩</span>
                    <span className="text-sm text-muted-foreground">Bangladesh</span>
                  </div>
                </div>

                <div className="w-full h-px bg-border/60" />

                {/* Contact rows */}
                <div className="w-full space-y-3">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">📱</span>
                      <div className="text-left min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">Contact Number</p>
                        <p className="text-sm font-mono font-semibold text-foreground truncate">01631848490</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('01631848490');
                        toast({ title: 'Copied!', description: 'Phone number copied.' });
                      }}
                      className="shrink-0 flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">📧</span>
                      <div className="text-left min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                        <p className="text-sm font-mono font-semibold text-foreground truncate">maruf.official.911@gmail.com</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('maruf.official.911@gmail.com');
                        toast({ title: 'Copied!', description: 'Email address copied.' });
                      }}
                      className="shrink-0 flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="w-full h-px bg-border/60" />

                {/* App details */}
                <div className="w-full grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Application</p>
                    <p className="text-xs font-semibold text-foreground leading-tight">Shrinkage<br />Calculator Pro</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Version</p>
                    <p className="text-sm font-bold text-primary font-mono">1.0.0</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Units</p>
                    <p className="text-xs font-semibold text-foreground">CM &amp; INCH</p>
                  </div>
                </div>

                <div className="w-full h-px bg-border/60" />

                {/* Footer credit */}
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Designed &amp; Developed by</p>
                  <p className="text-sm font-bold text-foreground">MH Emon</p>
                  <p className="text-xs text-muted-foreground/60">© 2026 All Rights Reserved</p>
                </div>

              </div>

              {/* Bottom accent bar */}
              <div className="h-0.5 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
