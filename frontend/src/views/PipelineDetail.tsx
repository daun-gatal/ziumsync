import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, FileCode, Trash2, Plus, X } from 'lucide-react';
import { usePipeline, useUpdatePipeline, useDeletePipeline, useDeployPipeline, useCompilePipeline, useUpdatePipelineFilters } from '../hooks/usePipelines';
import { useSourceConnections, useTargetConnections } from '../hooks/useConnections';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingRow } from '../components/ui/Spinner';
import type { FormatType, PipelineTableFilterPayload, SnapshotMode, UpdatePipelinePayload } from '../lib/types';

export default function PipelineDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: pipeline, isLoading } = usePipeline(id);
  const { data: sources = [] } = useSourceConnections();
  const { data: targets = [] } = useTargetConnections();

  const updatePipeline  = useUpdatePipeline();
  const deletePipeline  = useDeletePipeline();
  const deployPipeline  = useDeployPipeline();
  const compilePipeline = useCompilePipeline();
  const updateFilters   = useUpdatePipelineFilters();

  const [compileOpen, setCompileOpen] = useState(false);
  const [compileResult, setCompileResult] = useState('');

  // Local filter state
  const [filters, setFilters] = useState<PipelineTableFilterPayload[]>([]);
  useEffect(() => {
    if (pipeline?.table_filters) {
      setFilters(pipeline.table_filters.map((f) => ({
        schema_pattern: f.schema_pattern,
        table_pattern: f.table_pattern,
        is_included: f.is_included,
      })));
    }
  }, [pipeline?.id]);

  // Local config state
  const [patch, setPatch] = useState<UpdatePipelinePayload>({});
  const [isRawJson, setIsRawJson] = useState(false);
  const [advancedKV, setAdvancedKV] = useState<{k: string, v: string}[]>([]);
  const [advancedJson, setAdvancedJson] = useState('{}');
  useEffect(() => {
    if (pipeline) {
      setPatch({
        name: pipeline.name,
        snapshot_mode: pipeline.snapshot_mode,
        key_format: pipeline.key_format,
        value_format: pipeline.value_format,
      });
      const props = pipeline.advanced_properties || {};
      setAdvancedJson(JSON.stringify(props, null, 2));
      setAdvancedKV(Object.entries(props).map(([k, v]) => ({ k, v: String(v) })));
    }
  }, [pipeline?.id]);

  if (isLoading) return <div className="page"><LoadingRow /></div>;
  if (!pipeline) return <div className="page"><p className="text-muted">Pipeline not found.</p></div>;

  const isRunning   = pipeline.status === 'RUNNING';
  const isDeploying = pipeline.status === 'DEPLOYING';
  const srcName = sources.find((s) => s.id === pipeline.source_connection_id)?.name ?? pipeline.source_connection_id.slice(0, 8);
  const tgtName = targets.find((t) => t.id === pipeline.target_connection_id)?.name ?? pipeline.target_connection_id.slice(0, 8);

  function handleCompile() {
    compilePipeline.mutate(id, {
      onSuccess: (d) => { setCompileResult(d.properties); setCompileOpen(true); },
    });
  }

  function addFilter() {
    setFilters((f) => [...f, { schema_pattern: 'public', table_pattern: '*', is_included: true }]);
  }
  function removeFilter(i: number) {
    setFilters((f) => f.filter((_, idx) => idx !== i));
  }

  function toggleRawJson() {
    if (isRawJson) {
      try {
        const parsed = JSON.parse(advancedJson);
        setAdvancedKV(Object.entries(parsed).map(([k, v]) => ({ k, v: String(v) })));
      } catch (e) {
        alert('Invalid JSON! Please fix syntax errors before switching to form view.');
        return;
      }
    } else {
      const obj: Record<string, any> = {};
      advancedKV.forEach(({ k, v }) => { if (k.trim()) obj[k.trim()] = v; });
      setAdvancedJson(JSON.stringify(obj, null, 2));
    }
    setIsRawJson(!isRawJson);
  }

  function addAdvancedProp() {
    setAdvancedKV((prev) => [...prev, { k: '', v: '' }]);
  }
  function updateAdvancedProp(idx: number, key: 'k'|'v', val: string) {
    setAdvancedKV((prev) => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  }
  function removeAdvancedProp(idx: number) {
    setAdvancedKV((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex-row">
          <button className="btn-icon" onClick={() => navigate('/pipelines')} title="Back">
            <ArrowLeft />
          </button>
          <div>
            <h1>{pipeline.name}</h1>
            <p>{srcName} → {tgtName}</p>
          </div>
          <StatusBadge status={pipeline.status} />
        </div>
        <div className="flex-row">
          <Button variant="ghost" size="sm" onClick={handleCompile} disabled={compilePipeline.isPending}>
            <FileCode size={14} /> Compile
          </Button>
          <Button
            size="sm"
            onClick={() => deployPipeline.mutate(id)}
            loading={deployPipeline.isPending}
            disabled={isRunning || isDeploying}
          >
            <Play size={14} /> Deploy
          </Button>
          <button
            className="btn-icon"
            title="Delete pipeline"
            disabled={isRunning || isDeploying}
            onClick={() => {
              if (confirm(`Delete pipeline "${pipeline.name}"?`)) {
                deletePipeline.mutate(id, { onSuccess: () => navigate('/pipelines') });
              }
            }}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: Config */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="detail-section">
              <h3>Configuration</h3>
              <div className="kv-list">
                <div className="kv-item">
                  <span className="kv-key">Pipeline ID</span>
                  <span className="kv-val text-mono">{pipeline.id}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-key">Source</span>
                  <span className="kv-val">{srcName}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-key">Target</span>
                  <span className="kv-val">{tgtName}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-key">Created</span>
                  <span className="kv-val">{new Date(pipeline.created_at).toLocaleString()}</span>
                </div>
                {pipeline.current_deployment_id && (
                  <div className="kv-item">
                    <span className="kv-key">Container ID</span>
                    <span className="kv-val text-mono">{pipeline.current_deployment_id.slice(0, 12)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="detail-section">
              <h3>Settings</h3>
            </div>
            <Select
              id="snap-mode"
              label="Snapshot Mode"
              value={patch.snapshot_mode ?? pipeline.snapshot_mode}
              disabled={isRunning}
              onChange={(e) => setPatch((p) => ({ ...p, snapshot_mode: e.target.value as SnapshotMode }))}
              options={['INITIAL','SCHEMA_ONLY','NEVER','ALWAYS'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              id="key-format"
              label="Key Format"
              value={patch.key_format ?? pipeline.key_format}
              disabled={isRunning}
              onChange={(e) => setPatch((p) => ({ ...p, key_format: e.target.value as FormatType }))}
              options={['JSON','AVRO','PROTOBUF'].map((v) => ({ value: v, label: v }))}
            />
            <Select
              id="val-format"
              label="Value Format"
              value={patch.value_format ?? pipeline.value_format}
              disabled={isRunning}
              onChange={(e) => setPatch((p) => ({ ...p, value_format: e.target.value as FormatType }))}
              options={['JSON','AVRO','PROTOBUF'].map((v) => ({ value: v, label: v }))}
            />
            <div className="form-group" style={{ marginTop: 24 }}>
              <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Advanced Properties</label>
                <button className="btn btn-ghost btn-sm" onClick={toggleRawJson} disabled={isRunning}>
                  {isRawJson ? 'Form View' : 'Raw JSON'}
                </button>
              </div>

              {isRawJson ? (
                <textarea
                  className="input"
                  style={{ fontFamily: 'monospace', minHeight: 120, fontSize: 13 }}
                  value={advancedJson}
                  onChange={(e) => setAdvancedJson(e.target.value)}
                  disabled={isRunning}
                />
              ) : (
                <div className="filter-list" style={{ marginTop: 0 }}>
                  {advancedKV.map((item, i) => (
                    <div key={i} className="filter-row">
                      <input
                        className="input"
                        placeholder="Property Key (e.g. max.batch.size)"
                        value={item.k}
                        onChange={(e) => updateAdvancedProp(i, 'k', e.target.value)}
                        disabled={isRunning}
                        style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                      />
                      <span className="filter-sep">:</span>
                      <input
                        className="input"
                        placeholder="Value"
                        value={item.v}
                        onChange={(e) => updateAdvancedProp(i, 'v', e.target.value)}
                        disabled={isRunning}
                        style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                      />
                      <button className="btn-icon" onClick={() => removeAdvancedProp(i)} disabled={isRunning}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {advancedKV.length === 0 && <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>No advanced properties configured.</p>}
                  <button className="btn btn-ghost btn-sm" onClick={addAdvancedProp} disabled={isRunning} style={{ marginTop: 4 }}>
                    <Plus size={13} /> Add Property
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="sm"
                onClick={() => {
                  try {
                    let parsed: Record<string, any>;
                    if (isRawJson) {
                      parsed = JSON.parse(advancedJson);
                    } else {
                      parsed = {};
                      advancedKV.forEach(({ k, v }) => {
                        const key = k.trim();
                        if (key) {
                          const val = v.trim();
                          if (val === 'true') parsed[key] = true;
                          else if (val === 'false') parsed[key] = false;
                          else if (!isNaN(Number(val)) && val !== '') parsed[key] = Number(val);
                          else parsed[key] = val;
                        }
                      });
                    }
                    updatePipeline.mutate({ id, data: { ...patch, advanced_properties: parsed } });
                  } catch (e) {
                    alert('Invalid JSON in Advanced Properties');
                  }
                }}
                loading={updatePipeline.isPending}
                disabled={isRunning}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Table Filters */}
        <div className="card">
          <div className="detail-section">
            <h3>Table Filters</h3>
          </div>

          {filters.length === 0 && (
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>No filters — all tables captured.</p>
          )}

          <div className="filter-list">
            {filters.map((f, i) => (
              <div key={i} className="filter-row">
                <select
                  className="select"
                  style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
                  value={f.is_included ? 'include' : 'exclude'}
                  onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, is_included: e.target.value === 'include' } : r))}
                >
                  <option value="include">include</option>
                  <option value="exclude">exclude</option>
                </select>
                <input
                  value={f.schema_pattern}
                  onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, schema_pattern: e.target.value } : r))}
                  placeholder="schema"
                />
                <span className="filter-sep">.</span>
                <input
                  value={f.table_pattern}
                  onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, table_pattern: e.target.value } : r))}
                  placeholder="table"
                />
                <button className="btn-icon" onClick={() => removeFilter(i)}><X size={13} /></button>
              </div>
            ))}
          </div>

          <div className="flex-row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={addFilter} disabled={isRunning}>
              <Plus size={13} /> Add Filter
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => updateFilters.mutate({ id, filters })}
              loading={updateFilters.isPending}
              disabled={isRunning}
            >
              Save Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Compile Modal */}
      <Dialog
        open={compileOpen}
        onClose={() => setCompileOpen(false)}
        title="Compiled Properties"
        description="application.properties for the Debezium server container"
        footer={<Button variant="ghost" onClick={() => setCompileOpen(false)}>Close</Button>}
      >
        <CodeBlock code={compileResult} />
      </Dialog>
    </div>
  );
}
