import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  generateCustomPuzzle,
  PIECE_FAMILY_INFO,
  type CustomPuzzleConfig,
  type CustomPuzzleResult,
} from '../game/puzzleGenerator';

type Props = {
  onClose: () => void;
  onGenerate: (result: CustomPuzzleResult) => void;
};

/** Persisted across sessions so the player's last tuning is the default next time. */
const STORAGE_KEY = 'blockit-custom-puzzle-config';

type FormConfig = {
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  minTargetCells: number;
  maxTargetCells: number;
  prefillMin: number;
  prefillMax: number;
  minPrefillCleared: number;
  allowedFamilies: string[];
  allowDuplicates: boolean;
  /** 0 = clumped, 1 = scattered. */
  prefillSpread: number;
  seed: string;
};

// Matches the current Normal preset — a sensible starting point.
const DEFAULT_CONFIG: FormConfig = {
  pieceCount: 4,
  minPieceCells: 3,
  maxPieceCells: 5,
  minTargetCells: 10,
  maxTargetCells: 16,
  prefillMin: 1,
  prefillMax: 2,
  minPrefillCleared: 1,
  allowedFamilies: PIECE_FAMILY_INFO.map((f) => f.id),
  allowDuplicates: true,
  prefillSpread: 0.65,
  seed: '',
};

function loadSavedConfig(): FormConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<FormConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      // Guard against stale family ids from older builds.
      allowedFamilies: Array.isArray(parsed.allowedFamilies)
        ? parsed.allowedFamilies.filter((id) =>
            PIECE_FAMILY_INFO.some((f) => f.id === id)
          )
        : DEFAULT_CONFIG.allowedFamilies,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: FormConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* noop */
  }
}

function toGeneratorConfig(form: FormConfig): CustomPuzzleConfig {
  // Normalise slider min/max so the generator doesn't receive a backwards range.
  const minPieceCells = Math.min(form.minPieceCells, form.maxPieceCells);
  const maxPieceCells = Math.max(form.minPieceCells, form.maxPieceCells);
  const minTargetCells = Math.min(form.minTargetCells, form.maxTargetCells);
  const maxTargetCells = Math.max(form.minTargetCells, form.maxTargetCells);
  const prefillMin = Math.min(form.prefillMin, form.prefillMax);
  const prefillMax = Math.max(form.prefillMin, form.prefillMax);
  const minPrefillCleared = Math.min(form.minPrefillCleared, prefillMax);

  const trimmedSeed = form.seed.trim();
  const seed = trimmedSeed === '' ? undefined : parseSeed(trimmedSeed);

  return {
    pieceCount: form.pieceCount,
    minPieceCells,
    maxPieceCells,
    minTargetCells,
    maxTargetCells,
    prefillMin,
    prefillMax,
    minPrefillCleared,
    allowedFamilies: form.allowedFamilies,
    allowDuplicates: form.allowDuplicates,
    prefillSpread: form.prefillSpread,
    seed,
  };
}

/** Accept either a number or any short string; string seeds get hashed so
 *  players can type memorable words like "blockit42" as a seed. */
function parseSeed(raw: string): number {
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return asNumber >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function CustomPuzzleModal({ onClose, onGenerate }: Props) {
  const [form, setForm] = useState<FormConfig>(() => loadSavedConfig());
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    saveConfig(form);
  }, [form]);

  // Esc-to-close and focus capture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setField = <K extends keyof FormConfig>(key: K, value: FormConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const toggleFamily = (id: string) => {
    setForm((prev) => {
      const has = prev.allowedFamilies.includes(id);
      return {
        ...prev,
        allowedFamilies: has
          ? prev.allowedFamilies.filter((f) => f !== id)
          : [...prev.allowedFamilies, id],
      };
    });
    setError(null);
  };

  // Per-family availability given the current piece-size range.
  const familyRows = useMemo(() => {
    const lo = Math.min(form.minPieceCells, form.maxPieceCells);
    const hi = Math.max(form.minPieceCells, form.maxPieceCells);
    return PIECE_FAMILY_INFO.map((fam) => ({
      ...fam,
      inRange: fam.cellCount >= lo && fam.cellCount <= hi,
    }));
  }, [form.minPieceCells, form.maxPieceCells]);

  const handleGenerate = () => {
    const cfg = toGeneratorConfig(form);

    const pieceOrFamilyOk =
      form.allowedFamilies.length > 0 &&
      familyRows.some((f) => f.inRange && form.allowedFamilies.includes(f.id));
    if (!pieceOrFamilyOk) {
      setError(
        'No piece families match the current size range. Widen the piece size, or tick more families.'
      );
      return;
    }

    if (cfg.maxTargetCells < 2) {
      setError('Target needs at least a couple of cells — bump "Target size" up.');
      return;
    }

    const result = generateCustomPuzzle(cfg);
    if (!result) {
      setError(
        "Couldn't build a puzzle with these settings. Try loosening the target range or reducing pre-fill."
      );
      return;
    }

    onGenerate(result);
  };

  const handleReset = () => {
    setForm(DEFAULT_CONFIG);
    setError(null);
  };

  return (
    <div
      className="custom-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="custom-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
      >
        <header className="custom-modal__head">
          <h2 id={headingId} className="custom-modal__title">
            Custom puzzle
          </h2>
          <button
            type="button"
            className="custom-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            {'\u00D7'}
          </button>
        </header>

        <p className="custom-modal__intro">
          Dial in your own difficulty. Every puzzle the generator produces is
          guaranteed solvable.
        </p>

        <div className="custom-modal__body">
          <Section title="Tray" hint="The tray doubles as the length of the solution.">
            <SliderField
              label="Piece count"
              min={1}
              max={10}
              value={form.pieceCount}
              onChange={(v) => setField('pieceCount', v)}
            />
            <RangeField
              label="Piece size (cells)"
              min={1}
              max={9}
              low={form.minPieceCells}
              high={form.maxPieceCells}
              onChangeLow={(v) => setField('minPieceCells', v)}
              onChangeHigh={(v) => setField('maxPieceCells', v)}
            />
            <CheckboxField
              label="Allow duplicate pieces"
              checked={form.allowDuplicates}
              onChange={(v) => setField('allowDuplicates', v)}
            />
          </Section>

          <Section title="Target" hint="The shape you have to reproduce on the board.">
            <RangeField
              label="Target size (cells)"
              min={2}
              max={64}
              low={form.minTargetCells}
              high={form.maxTargetCells}
              onChangeLow={(v) => setField('minTargetCells', v)}
              onChangeHigh={(v) => setField('maxTargetCells', v)}
            />
          </Section>

          <Section
            title="Pre-fill"
            hint="Cells already on the board at start — players must clear them via row/column completes."
          >
            <RangeField
              label="Pre-fill cells"
              min={0}
              max={30}
              low={form.prefillMin}
              high={form.prefillMax}
              onChangeLow={(v) => setField('prefillMin', v)}
              onChangeHigh={(v) => setField('prefillMax', v)}
            />
            <SliderField
              label="Forced to clear (min)"
              min={0}
              max={Math.max(0, Math.max(form.prefillMin, form.prefillMax))}
              value={form.minPrefillCleared}
              onChange={(v) => setField('minPrefillCleared', v)}
              hint="Of the pre-fill, how many must end up outside the target pattern."
            />
            <SliderField
              label="Spread"
              min={0}
              max={100}
              value={Math.round(form.prefillSpread * 100)}
              onChange={(v) => setField('prefillSpread', v / 100)}
              format={(v) => (v < 35 ? 'clumped' : v > 65 ? 'scattered' : 'mixed')}
            />
          </Section>

          <Section
            title="Piece families"
            hint="Tick the shapes the generator is allowed to sample from."
          >
            <div className="custom-modal__family-toolbar">
              <button
                type="button"
                className="custom-modal__mini-btn"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    allowedFamilies: PIECE_FAMILY_INFO.map((f) => f.id),
                  }))
                }
              >
                Select all
              </button>
              <button
                type="button"
                className="custom-modal__mini-btn"
                onClick={() =>
                  setForm((prev) => ({ ...prev, allowedFamilies: [] }))
                }
              >
                Clear
              </button>
            </div>
            <div className="custom-modal__family-grid">
              {familyRows.map((fam) => {
                const checked = form.allowedFamilies.includes(fam.id);
                const disabled = !fam.inRange;
                return (
                  <label
                    key={fam.id}
                    className={`custom-modal__family${
                      disabled ? ' custom-modal__family--disabled' : ''
                    }${checked && !disabled ? ' custom-modal__family--active' : ''}`}
                    title={
                      disabled
                        ? `Outside the current piece size range (${fam.cellCount} cells)`
                        : `${fam.cellCount}-cell piece`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleFamily(fam.id)}
                    />
                    <span className="custom-modal__family-label">{fam.label}</span>
                    <span className="custom-modal__family-size">{fam.cellCount}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          <Section title="Seed (optional)" hint="Leave blank for a random puzzle; any text produces the same puzzle every time.">
            <input
              type="text"
              className="custom-modal__text-input"
              inputMode="text"
              placeholder="e.g. blockit42"
              value={form.seed}
              onChange={(e) => setField('seed', e.target.value)}
              maxLength={32}
            />
          </Section>
        </div>

        {error && (
          <div className="custom-modal__error" role="alert">
            {error}
          </div>
        )}

        <footer className="custom-modal__actions">
          <button
            type="button"
            className="custom-modal__btn"
            onClick={handleReset}
          >
            Reset
          </button>
          <button
            type="button"
            className="custom-modal__btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="custom-modal__btn custom-modal__btn--primary"
            onClick={handleGenerate}
          >
            Generate
          </button>
        </footer>
      </div>
    </div>
  );
}

type SectionProps = {
  title: string;
  hint?: string;
  children: React.ReactNode;
};
function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="custom-modal__section">
      <h3 className="custom-modal__section-title">{title}</h3>
      {hint && <p className="custom-modal__section-hint">{hint}</p>}
      <div className="custom-modal__section-body">{children}</div>
    </section>
  );
}

type SliderProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  format?: (v: number) => string;
};
function SliderField({ label, min, max, value, onChange, hint, format }: SliderProps) {
  const id = useId();
  return (
    <div className="custom-modal__field">
      <div className="custom-modal__field-head">
        <label htmlFor={id} className="custom-modal__field-label">
          {label}
        </label>
        <span className="custom-modal__field-value" aria-live="polite">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="custom-modal__field-hint">{hint}</p>}
    </div>
  );
}

type RangeProps = {
  label: string;
  min: number;
  max: number;
  low: number;
  high: number;
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;
};
function RangeField({ label, min, max, low, high, onChangeLow, onChangeHigh }: RangeProps) {
  const idLo = useId();
  const idHi = useId();
  const displayLow = Math.min(low, high);
  const displayHigh = Math.max(low, high);
  return (
    <div className="custom-modal__field">
      <div className="custom-modal__field-head">
        <span className="custom-modal__field-label">{label}</span>
        <span className="custom-modal__field-value" aria-live="polite">
          {displayLow === displayHigh ? displayLow : `${displayLow} – ${displayHigh}`}
        </span>
      </div>
      <div className="custom-modal__range-dual">
        <label className="custom-modal__range-side">
          <span>min</span>
          <input
            id={idLo}
            type="range"
            min={min}
            max={max}
            step={1}
            value={low}
            onChange={(e) => onChangeLow(Number(e.target.value))}
          />
        </label>
        <label className="custom-modal__range-side">
          <span>max</span>
          <input
            id={idHi}
            type="range"
            min={min}
            max={max}
            step={1}
            value={high}
            onChange={(e) => onChangeHigh(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};
function CheckboxField({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="custom-modal__checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
