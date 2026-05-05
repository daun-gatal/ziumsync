import { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, Download } from 'lucide-react';
import { getPipelineLogsStreamUrl } from '../lib/api';

interface LogStreamViewerProps {
  pipelineId: string;
  initialTail?: number;
  maxBuffer?: number;
}

export function LogStreamViewer({
  pipelineId,
  initialTail: defaultTail = 100,
  maxBuffer: defaultBuffer = 1000
}: LogStreamViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [initialTail, setInitialTail] = useState(defaultTail);
  const [maxBuffer, setMaxBuffer] = useState(defaultBuffer);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear logs on ID change
    setLogs([]);

    const abortController = new AbortController();
    const streamLogs = async () => {
      try {
        const response = await fetch(getPipelineLogsStreamUrl(pipelineId, initialTail), {
          signal: abortController.signal,
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim() !== '');
          setLogs(prev => [...prev, ...lines].slice(-maxBuffer));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Log stream error:', err);
          setLogs(prev => [...prev, '[SYSTEM] Connection lost. Retrying...']);
        }
      }
    };

    streamLogs();

    return () => {
      abortController.abort();
    };
  }, [pipelineId, initialTail, maxBuffer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatLine = (line: string) => {
    let logData: any = null;
    try {
      if (line.trim().startsWith('{')) {
        logData = JSON.parse(line);
      }
    } catch (e) {
      // Not JSON, continue with plain text formatting
    }

    if (logData) {
      const ts = logData.timestamp ? new Date(logData.timestamp).toLocaleTimeString() : '';
      const level = logData.level || 'INFO';
      const msg = logData.message || '';
      const logger = logData.loggerName ? logData.loggerName.split('.').pop() : '';

      let colorClass = 'text-white';
      if (level === 'INFO') colorClass = 'text-info';
      else if (level === 'WARN') colorClass = 'text-warning';
      else if (level === 'ERROR') colorClass = 'text-error';

      return (
        <div className={`log-line ${colorClass}`}>
          <span className="log-ts">[{ts}]</span>
          <span className="log-level">{level.padEnd(5)}</span>
          <span className="log-logger">[{logger}]</span>
          <span>{msg}</span>
        </div>
      );
    }

    let colorClass = 'text-white';
    if (line.includes('INFO')) colorClass = 'text-info';
    else if (line.includes('WARN')) colorClass = 'text-warning';
    else if (line.includes('ERROR') || line.includes('Exception')) colorClass = 'text-error';
    else if (line.startsWith('[SYSTEM]')) colorClass = 'text-muted';

    // Simple regex to highlight timestamps if present (e.g. 2024-05-05 12:00:00,000)
    const timestampRegex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})/;
    const match = line.match(timestampRegex);

    if (match) {
      const ts = match[1];
      const rest = line.slice(ts.length);
      return (
        <div className={`log-line ${colorClass}`}>
          <span className="log-ts">{ts}</span>
          <span>{rest}</span>
        </div>
      );
    }

    return <div className={`log-line ${colorClass}`}>{line}</div>;
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <div className="flex-row" style={{ gap: 12 }}>
          <div className="flex-row">
            <Terminal size={14} />
            <span>Live Logs</span>
          </div>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

          <div className="flex-row" style={{ gap: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase' }}>Context:</span>
            <select
              className="log-select"
              value={initialTail}
              onChange={(e) => setInitialTail(Number(e.target.value))}
            >
              {[50, 100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex-row" style={{ gap: 6 }}>
            <span style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase' }}>Buffer:</span>
            <select
              className="log-select"
              value={maxBuffer}
              onChange={(e) => setMaxBuffer(Number(e.target.value))}
            >
              {[1000, 2000, 5000, 10000].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-row">
          <button className="btn-icon-sm" onClick={() => setLogs([])} title="Clear">
            <Trash2 size={12} />
          </button>
          <button
            className="btn-icon-sm"
            title="Download"
            onClick={() => {
              const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pipeline-${pipelineId}-logs.txt`;
              a.click();
            }}
          >
            <Download size={12} />
          </button>
        </div>
      </div>
      <div className="log-content text-mono" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="text-muted p-4 italic">Waiting for logs...</div>
        ) : (
          logs.map((line, i) => <div key={i}>{formatLine(line)}</div>)
        )}
      </div>

      <style>{`
        .log-viewer {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 400px;
        }
        .log-viewer-header {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        .log-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          font-size: 12px;
          line-height: 1.5;
        }
        .log-line {
          margin-bottom: 2px;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .log-ts {
          color: rgba(255, 255, 255, 0.4);
          margin-right: 8px;
        }
        .log-level {
          font-weight: bold;
          margin-right: 8px;
          min-width: 50px;
          display: inline-block;
        }
        .log-logger {
          color: rgba(255, 255, 255, 0.4);
          margin-right: 8px;
        }
        .text-info { color: #60a5fa; }
        .text-warning { color: #fbbf24; }
        .text-error { color: #f87171; }
        .text-muted { color: rgba(255, 255, 255, 0.4); }
        .btn-icon-sm {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon-sm:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .log-select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 10px;
          padding: 2px 4px;
          cursor: pointer;
          outline: none;
        }
        .log-select:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .log-select option {
          background: #1a1a1a;
          color: white;
        }
      `}</style>
    </div>
  );
}
