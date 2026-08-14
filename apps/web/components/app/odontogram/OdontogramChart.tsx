'use client';

import { useMemo, useState } from 'react';
import {
  Loader2,
  RotateCcw,
  Save,
  X,
  Activity,
  Anchor,
  Crown,
  Circle,
  Link as LinkIcon,
  Sparkles,
  Sun,
  AlertTriangle,
  CircleAlert,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import {
  PERMANENT_TEETH_UPPER,
  PERMANENT_TEETH_LOWER,
  DECIDUOUS_TEETH_UPPER,
  DECIDUOUS_TEETH_LOWER,
  TOOTH_SURFACES,
  TOOTH_CONDITIONS,
  TOOTH_PROCEDURES,
} from '@dentra/shared';
import type { OdontogramData, ToothEvent } from '@/lib/clinic-odontogram';

type Dentition = 'adult' | 'pediatric';

const ARCHES: Record<Dentition, { upper: readonly string[]; lower: readonly string[] }> = {
  adult: { upper: PERMANENT_TEETH_UPPER, lower: PERMANENT_TEETH_LOWER },
  pediatric: { upper: DECIDUOUS_TEETH_UPPER, lower: DECIDUOUS_TEETH_LOWER },
};

const surfaces = TOOTH_SURFACES;
const conditions = TOOTH_CONDITIONS;
const procedures = TOOTH_PROCEDURES;
const field = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm';

// Icon shown for each condition/procedure code so a filling, extraction, RCT,
// implant, etc. are visually distinguishable at a glance, not just same-color dots.
const CODE_ICONS: Record<string, LucideIcon> = {
  extraction: X,
  missing: Minus,
  root_canal: Activity,
  implant: Anchor,
  crown_placement: Crown,
  crown: Crown,
  composite_filling: Circle,
  amalgam_filling: Circle,
  bridge_pontic: LinkIcon,
  scaling: Sparkles,
  bleaching: Sun,
  impacted: AlertTriangle,
  fracture: AlertTriangle,
  mobility: AlertTriangle,
  root_fragment: AlertTriangle,
  caries: CircleAlert,
};

function baseColor(event?: ToothEvent) {
  if (!event) return '#ffffff';
  if (event.procedureCode) return '#c4b5fd';
  if (event.conditionCode === 'sound') return '#d1fae5';
  if (event.conditionCode === 'missing') return '#e2e8f0';
  return '#fecaca';
}

function latestByDate(events: ToothEvent[]) {
  return events.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).at(-1);
}

export default function OdontogramChart({
  clinicId,
  patientId,
  initial,
}: {
  clinicId: string;
  patientId: string;
  initial: OdontogramData;
}) {
  const [dentition, setDentition] = useState<Dentition>('adult');
  const [selectedTooth, setSelectedTooth] = useState(ARCHES.adult.upper[7]);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [correction, setCorrection] = useState<ToothEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const arches = ARCHES[dentition];

  const byTooth = useMemo(() => {
    const map = new Map<string, ToothEvent[]>();
    initial.currentState.forEach((event) => {
      const list = map.get(event.toothNumber) ?? [];
      list.push(event);
      map.set(event.toothNumber, list);
    });
    return map;
  }, [initial.currentState]);

  // Whole-tooth event (empty surfaces) used as the tooth's base/fallback fill.
  function toothState(tooth: string) {
    return latestByDate((byTooth.get(tooth) ?? []).filter((event) => !event.surfaces));
  }

  // Most recent event whose recorded surfaces include this specific surface letter,
  // used to color that surface's region independently (per-surface indicators).
  function surfaceState(tooth: string, surface: string) {
    return latestByDate((byTooth.get(tooth) ?? []).filter((event) => event.surfaces.split(',').includes(surface)));
  }

  function selectDentition(next: Dentition) {
    setDentition(next);
    setSelectedTooth(ARCHES[next].upper[Math.floor(ARCHES[next].upper.length / 2)]);
    setSelectedSurfaces([]);
    setCorrection(null);
  }

  function tooth(number: string, mesialSide: 'left' | 'right') {
    const base = toothState(number);
    const selected = selectedTooth === number;
    const occlusal = surfaceState(number, 'O') ?? surfaceState(number, 'I');
    const buccal = surfaceState(number, 'B') ?? surfaceState(number, 'F');
    const lingual = surfaceState(number, 'L');
    const mesial = surfaceState(number, 'M');
    const distal = surfaceState(number, 'D');
    const left = mesialSide === 'left' ? mesial : distal;
    const right = mesialSide === 'left' ? distal : mesial;
    const marker = base?.procedureCode ?? base?.conditionCode;
    const Icon = marker ? CODE_ICONS[marker] : undefined;

    // A region shows the fill for its own recorded event (if any) plus a small
    // badge+icon centered in it, so a filling on one surface and an RCT on
    // another are distinguishable within the same tooth, not just at the
    // whole-tooth level.
    function region(x: number, y: number, w: number, h: number, event: ToothEvent | undefined) {
      const code = event?.procedureCode ?? event?.conditionCode;
      const RegionIcon = code ? CODE_ICONS[code] : undefined;
      return (
        <>
          <rect x={x} y={y} width={w} height={h} rx="4" fill={event ? baseColor(event) : 'transparent'} />
          {RegionIcon && (
            <g transform={`translate(${x + w / 2 - 5},${y + h / 2 - 5})`}>
              <circle cx="5" cy="5" r="5" fill={event?.procedureCode ? '#7c3aed' : '#ef4444'} />
              <RegionIcon x={1.5} y={1.5} width={7} height={7} color="#ffffff" strokeWidth={3} />
            </g>
          )}
        </>
      );
    }

    return (
      <g
        key={number}
        onClick={() => {
          setSelectedTooth(number);
          setCorrection(null);
        }}
        className="cursor-pointer"
        role="button"
        aria-label={`Tooth ${number}`}
      >
        <rect width="42" height="62" rx="14" fill={baseColor(base)} stroke={selected ? '#7c3aed' : '#cbd5e1'} strokeWidth={selected ? 4 : 2} />
        {region(14, 2, 14, 17, buccal)}
        {region(2, 21, 12, 21, left)}
        {region(14, 21, 14, 21, occlusal)}
        {region(28, 21, 12, 21, right)}
        {region(14, 43, 14, 17, lingual)}
        <text x="21" y="82" textAnchor="middle" className="fill-slate-600 text-[13px] font-bold">
          {number}
        </text>
        {Icon && (
          <g transform="translate(27,3)">
            <circle cx="6" cy="6" r="8" fill={base?.procedureCode ? '#7c3aed' : '#ef4444'} />
            <Icon x={0} y={0} width={12} height={12} color="#ffffff" strokeWidth={2.5} />
          </g>
        )}
      </g>
    );
  }

  function arch(teeth: readonly string[], label: string) {
    const half = Math.floor(teeth.length / 2);
    return (
      <div>
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <svg viewBox={`0 0 ${teeth.length * 50} 95`} className="w-full" role="img" aria-label={`${label} ${dentition} teeth`}>
          {teeth.map((number, index) => (
            <g key={number} transform={`translate(${index * 50 + 5},5)`}>
              {tooth(number, index < half ? 'right' : 'left')}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      toothNumber: selectedTooth,
      surfaces: selectedSurfaces,
      conditionCode: String(form.get('conditionCode') || '') || undefined,
      procedureCode: String(form.get('procedureCode') || '') || undefined,
      note: String(form.get('note') || '') || undefined,
      encounterId: String(form.get('encounterId') || '') || undefined,
    };
    const path = correction
      ? `/api/clinic/patients/${patientId}/odontogram/${correction.id}/correct?clinicId=${encodeURIComponent(clinicId)}`
      : `/api/clinic/patients/${patientId}/odontogram?clinicId=${encodeURIComponent(clinicId)}`;
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Tooth event could not be saved');
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tooth event could not be saved');
      setSaving(false);
    }
  }

  const history = initial.events.filter((event) => event.toothNumber === selectedTooth).slice().reverse();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Sound</span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Condition</span>
              <span className="rounded-full bg-violet-200 px-2.5 py-1 text-violet-800">Procedure</span>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">Missing</span>
            </div>
            <div className="inline-flex rounded-xl border border-slate-300 p-1 text-xs font-bold">
              {(['adult', 'pediatric'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectDentition(option)}
                  className={`rounded-lg px-3 py-1.5 capitalize ${dentition === option ? 'bg-violet-600 text-white' : 'text-slate-600'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {arch(arches.upper, 'Upper arch')}
          {arch(arches.lower, 'Lower arch')}
        </section>
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Tooth {selectedTooth} event history</h2>
          {history.length ? (
            <div className="mt-4 space-y-3">
              {history.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-slate-800">{(item.procedureCode ?? item.conditionCode ?? 'Event').replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Surfaces: {item.surfaces || 'whole tooth'} · {new Date(item.createdAt).toLocaleString('en-PH')}
                      </p>
                      {item.correctionOf && <p className="mt-1 text-xs font-semibold text-amber-600">Correction of a prior event</p>}
                    </div>
                    <button
                      onClick={() => {
                        setCorrection(item);
                        setSelectedSurfaces(item.surfaces ? item.surfaces.split(',') : []);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600"
                    >
                      <RotateCcw size={13} />
                      Correct
                    </button>
                  </div>
                  {item.note && <p className="mt-3 text-sm text-slate-600">{item.note}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No events recorded for this tooth.</p>
          )}
        </section>
      </div>
      <aside className="self-start rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:sticky xl:top-4">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{correction ? 'Append correction' : 'Record event'}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Tooth {selectedTooth}</h2>
        {correction && (
          <button onClick={() => setCorrection(null)} className="mt-2 text-xs font-semibold text-slate-500">
            Cancel correction
          </button>
        )}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Surfaces</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {surfaces.map((surface) => (
                <label
                  key={surface}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold ${selectedSurfaces.includes(surface) ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 text-slate-600'}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedSurfaces.includes(surface)}
                    onChange={() => setSelectedSurfaces((items) => (items.includes(surface) ? items.filter((item) => item !== surface) : [...items, surface]))}
                  />
                  {surface}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold text-slate-700">
            Condition
            <select name="conditionCode" defaultValue={correction?.conditionCode ?? ''} className={field}>
              <option value="">None</option>
              {conditions.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Procedure
            <select name="procedureCode" defaultValue={correction?.procedureCode ?? ''} className={field}>
              <option value="">None</option>
              {procedures.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Encounter ID (optional)
            <input name="encounterId" defaultValue={correction?.encounterId ?? ''} className={field} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Note
            <textarea name="note" defaultValue={correction?.note ?? ''} rows={3} className={field} />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            {correction ? 'Append correction' : 'Record event'}
          </button>
        </form>
      </aside>
    </div>
  );
}
