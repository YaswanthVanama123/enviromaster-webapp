import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { companyMappingApi } from '../../../backendservice/api/companyMappingApi';

interface ConnectedCompany {
  biginId: string;
  companyName: string;
  agreementCount: number;
}

const money = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const LocationFarTotalsTab: React.FC = () => {
  const [companies, setCompanies] = useState<ConnectedCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ConnectedCompany | null>(null);
  const [prior, setPrior] = useState<{ redline: number; greenline: number } | null>(null);
  const [breakdown, setBreakdown] = useState<Array<{ agreementId: string; title: string; status: string; hasCommission: boolean; redline: number; greenline: number }>>([]);
  const [loadingPrior, setLoadingPrior] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateMenuRect = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useEffect(() => {
    let cancelled = false;
    companyMappingApi
      .getConnectedCompanies()
      .then((rows) => {
        if (!cancelled) setCompanies(rows || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingCompanies(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current && boxRef.current.contains(t)) return;
      if (listRef.current && listRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    const handler = () => updateMenuRect();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

  const fetchPrior = (biginId: string) => {
    let cancelled = false;
    setLoadingPrior(true);
    Promise.all([
      companyMappingApi.getPriorFarByBigin(biginId),
      companyMappingApi.getFarBreakdown(biginId),
    ])
      .then(([p, b]) => {
        if (cancelled) return;
        setPrior(p);
        setBreakdown(b || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrior(false);
      });
    return () => {
      cancelled = true;
    };
  };

  const selectCompany = (c: ConnectedCompany) => {
    setSelected(c);
    setQuery('');
    setOpen(false);
    setPrior(null);
    setBreakdown([]);
    fetchPrior(c.biginId);
  };

  const handleRecalc = async () => {
    if (!selected) return;
    setRecalculating(true);
    const p = await companyMappingApi.recalcCompanyFar(selected.biginId);
    if (p) setPrior(p);
    const b = await companyMappingApi.getFarBreakdown(selected.biginId);
    setBreakdown(b || []);
    setRecalculating(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.companyName.toLowerCase().includes(q));
  }, [companies, query]);

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
        Location Pit Far Prior Totals
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
        Accumulated Pit (&gt;15&nbsp;min) far revenue per location, split by pricing line. This is the prior total the next
        agreement at the company continues from.
      </p>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        Bigin-connected company
      </label>
      <div ref={boxRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected?.companyName || ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            updateMenuRect();
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
            updateMenuRect();
          }}
          placeholder={loadingCompanies ? 'Loading companies…' : `Search ${companies.length} companies…`}
          disabled={loadingCompanies}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: '#fff',
            color: '#111827',
          }}
        />
      </div>
      {open && menuRect &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: 320,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100000,
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af' }}>No companies match.</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.biginId}
                  type="button"
                  onClick={() => selectCompany(c)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 12px',
                    fontSize: 14,
                    border: 'none',
                    background: selected?.biginId === c.biginId ? '#fef2f2' : '#fff',
                    color: '#111827',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = selected?.biginId === c.biginId ? '#fef2f2' : '#fff')}
                >
                  {c.companyName}{' '}
                  <span style={{ color: '#9ca3af' }}>
                    ({c.agreementCount} agreement{c.agreementCount !== 1 ? 's' : ''})
                  </span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}

      {selected && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {selected.companyName} — prior summed Pit far revenue
            </div>
            <button
              type="button"
              onClick={handleRecalc}
              disabled={recalculating || loadingPrior}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                background: recalculating ? '#9ca3af' : '#c00000',
                color: '#fff',
                cursor: recalculating ? 'default' : 'pointer',
              }}
            >
              {recalculating ? 'Recalculating…' : 'Recalculate'}
            </button>
          </div>
          {loadingPrior ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading prior totals…</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#b91c1c' }}>REDLINE PRIOR</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#991b1b', marginTop: 6 }}>{money(prior?.redline || 0)}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>First $100/visit = $0, $100–$200 normal, above $200 = 150%</div>
                </div>
                <div style={{ flex: '1 1 240px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#15803d' }}>GREENLINE PRIOR</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#166534', marginTop: 6 }}>{money(prior?.greenline || 0)}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>First $100/visit = $0, above $100 = 150%</div>
                </div>
              </div>
              {(prior?.redline || 0) === 0 && (prior?.greenline || 0) === 0 && (
                <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 14 }}>
                  No prior Pit far revenue recorded yet. If this company has agreements with Pit (&gt;15&nbsp;min) services,
                  click <strong>Recalculate</strong> to recompute them with the current engine.
                </p>
              )}

              {breakdown.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Agreements at this company ({breakdown.length})
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', padding: '8px 12px', background: '#f9fafb', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: '#6b7280' }}>
                      <span style={{ flex: 2 }}>AGREEMENT</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>REDLINE FAR</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>GREENLINE FAR</span>
                    </div>
                    {breakdown.map((a) => (
                      <div key={a.agreementId} style={{ display: 'flex', padding: '9px 12px', fontSize: 13, borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                        <span style={{ flex: 2, color: '#111827' }}>
                          {a.title}
                          {!a.hasCommission && <span style={{ color: '#9ca3af' }}> · no commission</span>}
                          {a.status === 'draft' && <span style={{ color: '#9ca3af' }}> · draft</span>}
                        </span>
                        <span style={{ flex: 1, textAlign: 'right', color: a.redline > 0 ? '#991b1b' : '#9ca3af' }}>{money(a.redline)}</span>
                        <span style={{ flex: 1, textAlign: 'right', color: a.greenline > 0 ? '#166534' : '#9ca3af' }}>{money(a.greenline)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationFarTotalsTab;
