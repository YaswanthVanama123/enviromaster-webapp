import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleMinus,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import {
  diagnosticsApi,
  type ConnectionCheck,
  type ConnectionDiagnostics,
} from "../../backendservice/api/diagnosticsApi";
import { Button } from "../atoms";

const STATUS_LABEL: Record<string, string> = {
  ok: "All connections healthy",
  degraded: "Optional connection unavailable",
  error: "A required connection is down",
};

const iconFor = (check: ConnectionCheck) => {
  if (!check.configured && !check.required) return faCircleMinus;
  return check.ok ? faCircleCheck : faCircleExclamation;
};

const toneFor = (check: ConnectionCheck) => {
  if (check.ok) return check.configured ? "ok" : "idle";
  return check.required ? "error" : "warn";
};

export const SystemConnections: React.FC = () => {
  const [data, setData] = useState<ConnectionDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await diagnosticsApi.getConnections();
    setLoading(false);
    if (result) setData(result);
    else setError("Could not reach the server to run connection checks.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="em-conn">
      <div className="em-conn__header">
        <div>
          <h2 className="em-conn__title">Database Connections</h2>
          <p className="em-conn__subtitle">
            {data
              ? `${STATUS_LABEL[data.status]} · ${data.environment} · checked ${new Date(
                  data.checkedAt
                ).toLocaleTimeString()}`
              : "Checking every configured connection…"}
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <FontAwesomeIcon icon={faRotateRight} spin={loading} /> {loading ? "Checking…" : "Re-check"}
        </Button>
      </div>

      {data && (
        <div className={`em-banner em-conn__summary em-conn__summary--${data.status}`}>
          <strong>{STATUS_LABEL[data.status]}</strong> — {data.summary.healthy} of{" "}
          {data.summary.total} healthy
          {data.summary.requiredFailing > 0
            ? `, ${data.summary.requiredFailing} required connection(s) failing`
            : ""}
        </div>
      )}

      {error && <div className="em-banner em-banner--danger em-conn__summary">{error}</div>}

      <div className="em-conn__grid">
        {(data?.checks ?? []).map((check) => (
          <div key={check.key} className={`em-conn__card em-conn__card--${toneFor(check)}`}>
            <div className="em-conn__card-head">
              <FontAwesomeIcon icon={iconFor(check)} className="em-conn__card-icon" />
              <span className="em-conn__card-label">{check.label}</span>
              <span className="em-conn__state">{check.state.replace(/_/g, " ")}</span>
            </div>

            <dl className="em-conn__rows">
              {check.database && (
                <div className="em-conn__row">
                  <dt>Database</dt>
                  <dd>{check.database}</dd>
                </div>
              )}
              {check.target && (
                <div className="em-conn__row">
                  <dt>Target</dt>
                  <dd className="em-conn__mono">{check.target}</dd>
                </div>
              )}
              {check.latencyMs !== undefined && (
                <div className="em-conn__row">
                  <dt>Latency</dt>
                  <dd>{check.latencyMs} ms</dd>
                </div>
              )}
              {check.collections &&
                Object.entries(check.collections).map(([name, count]) => (
                  <div className="em-conn__row" key={name}>
                    <dt className="em-conn__mono">{name}</dt>
                    <dd>{count.toLocaleString()} docs</dd>
                  </div>
                ))}
              {!check.required && (
                <div className="em-conn__row">
                  <dt>Required</dt>
                  <dd>Optional</dd>
                </div>
              )}
            </dl>

            {check.note && <p className="em-conn__note">{check.note}</p>}
            {check.error && <p className="em-conn__error">{check.error}</p>}
          </div>
        ))}
      </div>

      {loading && !data && <p>Running connection checks…</p>}
    </div>
  );
};

export default SystemConnections;
