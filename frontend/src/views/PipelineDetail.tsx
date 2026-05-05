import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Square, RotateCw, FileCode, Trash2, Plus, X, Terminal, Play, Settings as SettingsIcon, Filter, Activity, Database, ListFilter, Sliders, Info } from 'lucide-react';
import { usePipeline, useUpdatePipeline, useDeletePipeline, useDeployPipeline, useCompilePipeline, useUpdatePipelineFilters, usePipelineLiveStatus, useStopPipeline, useRestartPipeline } from '../hooks/usePipelines';
import { useSourceConnections, useTargetConnections } from '../hooks/useConnections';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { CodeBlock } from '../components/ui/CodeBlock';
import { LoadingRow } from '../components/ui/Spinner';
import { LogStreamViewer } from '../components/LogStreamViewer';
import type { FormatType, PipelineTableFilterPayload, SnapshotMode, UpdatePipelinePayload, PipelineStatus } from '../lib/types';

export default function PipelineDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: pipeline, isLoading } = usePipeline(id);
  const { data: sources = [] } = useSourceConnections();
  const { data: targets = [] } = useTargetConnections();

  const updatePipeline  = useUpdatePipeline();
  const deletePipeline  = useDeletePipeline();
  const deployPipeline  = useDeployPipeline();
  const stopPipeline    = useStopPipeline();
  const restartPipeline = useRestartPipeline();
  const compilePipeline = useCompilePipeline();
  const updateFilters   = useUpdatePipelineFilters();

  const [activeTab, setActiveTab] = useState<'monitoring' | 'config'>('monitoring');
  const [compileOpen, setCompileOpen] = useState(false);
  const [compileResult, setCompileResult] = useState('');

  const shouldShowLogs = pipeline?.status === 'RUNNING' || pipeline?.status === 'DEPLOYING' || pipeline?.status === 'STOPPING' || pipeline?.status === 'FAILED' || pipeline?.status === 'STOPPED';
  const { data: liveStatus } = usePipelineLiveStatus(id, shouldShowLogs);

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

  const displayStatus = (liveStatus?.status ?? pipeline.status) as PipelineStatus;
  const isRunning   = displayStatus === 'RUNNING';
  const isDeploying = displayStatus === 'DEPLOYING';
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
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="flex-row">
          <button className="btn-icon" onClick={() => navigate('/pipelines')} title="Back">
            <ArrowLeft />
          </button>
          <div>
            <h1>{pipeline.name}</h1>
            <div className="flex-row" style={{ marginTop: 4 }}>
              <StatusBadge status={displayStatus} />
              <span className="text-muted" style={{ fontSize: 12 }}>{srcName} → {tgtName}</span>
            </div>
          </div>
        </div>
        <div className="flex-row" style={{ gap: 12 }}>
          <div className="flex-row" style={{ gap: 8 }}>
            <Button
              size="sm"
              variant={isRunning ? "ghost" : "primary"}
              onClick={() => deployPipeline.mutate(id)}
              loading={deployPipeline.isPending}
              disabled={isRunning || isDeploying || (displayStatus === 'STOPPING')}
            >
              <Play size={14} /> {displayStatus === 'FAILED' ? 'Retry' : 'Start'}
            </Button>

            {isRunning && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => restartPipeline.mutate(id)}
                  loading={restartPipeline.isPending}
                >
                  <RotateCw size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => stopPipeline.mutate(id)}
                  loading={stopPipeline.isPending}
                  style={{ color: 'var(--red)' }}
                >
                  <Square size={14} fill="currentColor" /> Stop
                </Button>
              </>
            )}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <Button variant="ghost" size="sm" onClick={handleCompile} disabled={compilePipeline.isPending}>
            <FileCode size={14} />
          </Button>
          <button
            className="btn-icon"
            title="Delete pipeline"
            disabled={isRunning || isDeploying || (displayStatus === 'STOPPING')}
            onClick={() => {
              if (confirm(`Delete pipeline "${pipeline.name}"?`)) {
                deletePipeline.mutate(id, { onSuccess: () => navigate('/pipelines') });
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
          <Activity size={14} style={{ marginRight: 8 }} /> Monitoring
        </button>
        <button className={`tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <SettingsIcon size={14} style={{ marginRight: 8 }} /> Configuration
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'monitoring' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              <div className="card">
                <div className="detail-section" style={{ marginBottom: 0 }}>
                  <h3 className="flex-row"><Info size={14} /> Pipeline Summary</h3>
                  <div className="kv-list" style={{ marginTop: 12 }}>
                    <div className="kv-item">
                      <span className="kv-key">Source</span>
                      <span className="kv-val">{srcName}</span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Target</span>
                      <span className="kv-val">{tgtName}</span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Snapshot Mode</span>
                      <span className="kv-val badge badge-neutral">{pipeline.snapshot_mode}</span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Formats (K/V)</span>
                      <span className="kv-val">{pipeline.key_format} / {pipeline.value_format}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="detail-section" style={{ marginBottom: 0 }}>
                  <h3 className="flex-row"><Database size={14} /> Infrastructure</h3>
                  <div className="kv-list" style={{ marginTop: 12 }}>
                    <div className="kv-item">
                      <span className="kv-key">Worker Status</span>
                      <span className={`kv-val ${isRunning ? 'text-green' : 'text-muted'}`} style={{ fontWeight: 600 }}>
                        {isRunning ? 'CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Pipeline ID</span>
                      <span className="kv-val text-mono" style={{ fontSize: 11 }}>{pipeline.id}</span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Container ID</span>
                      <span className="kv-val text-mono">{pipeline.current_deployment_id?.slice(0, 12) || 'None'}</span>
                    </div>
                    <div className="kv-item">
                      <span className="kv-key">Uptime</span>
                      <span className="kv-val text-muted">{isRunning ? 'Real-time monitoring active' : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {shouldShowLogs ? (
                <LogStreamViewer pipelineId={id} />
              ) : (
                <div className="p-8 text-center" style={{ padding: 60 }}>
                  <Terminal size={32} className="text-muted" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p className="text-muted" style={{ fontSize: 13 }}>Logs will appear here once the pipeline is started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Core Settings Section */}
            <div className="card">
              <div className="detail-section">
                <h3 className="flex-row"><Sliders size={14} /> Core Configuration</h3>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'none', marginTop: 4 }}>Basic behavior and data serialization formats.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 16 }}>
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
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => updatePipeline.mutate({ id, data: patch })}
                  loading={updatePipeline.isPending}
                  disabled={isRunning}
                >
                  Save Core Settings
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="card">
              <div className="detail-section">
                <h3 className="flex-row"><ListFilter size={14} /> Table Filters</h3>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'none', marginTop: 4 }}>Fine-tune which database objects are captured by Debezium.</p>
              </div>

              <div className="filter-list" style={{ marginTop: 20 }}>
                {filters.map((f, i) => (
                  <div key={i} className="filter-row">
                    <select
                      className="select"
                      style={{ width: 110 }}
                      value={f.is_included ? 'include' : 'exclude'}
                      onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, is_included: e.target.value === 'include' } : r))}
                    >
                      <option value="include">Include</option>
                      <option value="exclude">Exclude</option>
                    </select>
                    <input
                      className="input"
                      value={f.schema_pattern}
                      onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, schema_pattern: e.target.value } : r))}
                      placeholder="Schema (e.g. public)"
                      style={{ flex: 1 }}
                    />
                    <span className="filter-sep">.</span>
                    <input
                      className="input"
                      value={f.table_pattern}
                      onChange={(e) => setFilters((fs) => fs.map((r, idx) => idx === i ? { ...r, table_pattern: e.target.value } : r))}
                      placeholder="Table (e.g. users)"
                      style={{ flex: 1 }}
                    />
                    <button className="btn-icon" onClick={() => removeFilter(i)} disabled={isRunning}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {filters.length === 0 && (
                  <div className="p-4 rounded" style={{ background: 'var(--bg)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                    <p className="text-muted" style={{ fontSize: 13 }}>No filter rules defined. All tables will be captured.</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={addFilter} disabled={isRunning}>
                  <Plus size={14} /> Add Filter Rule
                </button>
                <div className="flex-1" />
                <Button
                  onClick={() => updateFilters.mutate({ id, filters })}
                  loading={updateFilters.isPending}
                  disabled={isRunning}
                >
                  Apply Filters
                </Button>
              </div>
            </div>

            {/* Advanced Properties Section */}
            <div className="card">
              <div className="detail-section">
                <h3 className="flex-row"><SettingsIcon size={14} /> Advanced Properties</h3>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'none', marginTop: 4 }}>Inject custom Debezium or Quarkus properties directly.</p>
              </div>

              <div className="form-group" style={{ marginTop: 20 }}>
                <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ margin: 0, fontSize: 12 }}>Property Key-Value Pairs</label>
                  <button className="btn btn-ghost btn-sm" onClick={toggleRawJson} disabled={isRunning}>
                    {isRawJson ? 'Switch to Form' : 'Edit as JSON'}
                  </button>
                </div>

                {isRawJson ? (
                  <textarea
                    className="input json-textarea"
                    value={advancedJson}
                    onChange={(e) => setAdvancedJson(e.target.value)}
                    disabled={isRunning}
                    placeholder='{ "max.batch.size": 2048 }'
                  />
                ) : (
                  <div className="filter-list">
                    {advancedKV.map((item, i) => (
                      <div key={i} className="filter-row">
                        <input
                          className="input"
                          placeholder="Property (e.g. debezium.source.decimal.handling.mode)"
                          value={item.k}
                          onChange={(e) => updateAdvancedProp(i, 'k', e.target.value)}
                          disabled={isRunning}
                          style={{ flex: 2 }}
                        />
                        <span className="filter-sep">:</span>
                        <input
                          className="input"
                          placeholder="Value"
                          value={item.v}
                          onChange={(e) => updateAdvancedProp(i, 'v', e.target.value)}
                          disabled={isRunning}
                          style={{ flex: 1 }}
                        />
                        <button className="btn-icon" onClick={() => removeAdvancedProp(i)} disabled={isRunning}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={addAdvancedProp} disabled={isRunning}>
                      <Plus size={13} /> Add Advanced Property
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    try {
                      let parsed: Record<string, any> = {};
                      if (isRawJson) {
                        parsed = JSON.parse(advancedJson);
                      } else {
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
                      updatePipeline.mutate({ id, data: { advanced_properties: parsed } });
                    } catch (e) {
                      alert('Invalid JSON! Please check your syntax.');
                    }
                  }}
                  loading={updatePipeline.isPending}
                  disabled={isRunning}
                >
                  Save Advanced Config
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compile Modal */}
      <Dialog
        open={compileOpen}
        onClose={() => setCompileOpen(false)}
        title="Compiled Properties"
        description="Generated application.properties for the container"
        footer={<Button variant="ghost" onClick={() => setCompileOpen(false)}>Close</Button>}
      >
        <CodeBlock code={compileResult} />
      </Dialog>
    </div>
  );
}
