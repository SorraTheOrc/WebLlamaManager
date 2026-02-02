import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = '/api';

function formatBytes(bytes) {
  if (!bytes) return 'Unknown';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function App() {
  const [status, setStatus] = useState(null);
  const [serverModels, setServerModels] = useState([]);
  const [localModels, setLocalModels] = useState([]);
  const [modelsDir, setModelsDir] = useState('');
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoQuantizations, setRepoQuantizations] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/models`);
      const data = await res.json();
      setServerModels(data.serverModels || []);
      setLocalModels(data.localModels || []);
      setModelsDir(data.modelsDir || '');
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  }, []);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/presets`);
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchModels();
    fetchPresets();
    const statusInterval = setInterval(fetchStatus, 3000);
    const modelsInterval = setInterval(fetchModels, 10000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(modelsInterval);
    };
  }, [fetchStatus, fetchModels, fetchPresets]);

  const startServer = async () => {
    setLoading(l => ({ ...l, server: true }));
    try {
      await fetch(`${API_BASE}/server/start`, { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to start server:', err);
    }
    setLoading(l => ({ ...l, server: false }));
  };

  const stopServer = async () => {
    setLoading(l => ({ ...l, server: true }));
    try {
      await fetch(`${API_BASE}/server/stop`, { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to stop server:', err);
    }
    setLoading(l => ({ ...l, server: false }));
  };

  const activatePreset = async (presetId) => {
    setLoading(l => ({ ...l, [presetId]: true }));
    try {
      await fetch(`${API_BASE}/presets/${presetId}/activate`, { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to activate preset:', err);
    }
    setLoading(l => ({ ...l, [presetId]: false }));
  };

  const switchToRouterMode = async () => {
    setLoading(l => ({ ...l, router: true }));
    try {
      await fetch(`${API_BASE}/server/start`, { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to switch to router mode:', err);
    }
    setLoading(l => ({ ...l, router: false }));
  };

  const loadModel = async (modelName) => {
    setLoading(l => ({ ...l, [modelName]: true }));
    try {
      await fetch(`${API_BASE}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      await fetchModels();
    } catch (err) {
      console.error('Failed to load model:', err);
    }
    setLoading(l => ({ ...l, [modelName]: false }));
  };

  const unloadModel = async (modelName) => {
    setLoading(l => ({ ...l, [modelName]: true }));
    try {
      await fetch(`${API_BASE}/models/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      await fetchModels();
    } catch (err) {
      console.error('Failed to unload model:', err);
    }
    setLoading(l => ({ ...l, [modelName]: false }));
  };

  const searchModels = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedRepo(null);
    setRepoFiles([]);
    try {
      const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Failed to search:', err);
    }
    setSearching(false);
  };

  const selectRepo = async (repo) => {
    setSelectedRepo(repo);
    setLoadingFiles(true);
    try {
      const [author, model] = repo.id.split('/');
      const res = await fetch(`${API_BASE}/repo/${author}/${model}/files`);
      const data = await res.json();
      setRepoQuantizations(data.quantizations || []);
    } catch (err) {
      console.error('Failed to fetch repo files:', err);
      setRepoQuantizations([]);
    }
    setLoadingFiles(false);
  };

  const downloadModel = async (repo, quantization) => {
    try {
      await fetch(`${API_BASE}/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, quantization })
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to start download:', err);
    }
  };

  // Find which models are loaded based on server models
  const getModelStatus = (modelName) => {
    const serverModel = serverModels.find(m =>
      m.id === modelName || m.model === modelName || (m.id && m.id.includes(modelName))
    );
    if (serverModel) {
      return serverModel.status || 'loaded';
    }
    return 'unloaded';
  };

  const isSingleMode = status?.mode === 'single';
  const activePreset = status?.currentPreset;

  return (
    <div className="app">
      <header className="header">
        <h1>Llama Manager</h1>
        <div className="header-actions">
          <div className="status-badge">
            <span className={`dot ${status?.llamaHealthy ? 'healthy' : status?.llamaRunning ? 'starting' : 'stopped'}`} />
            {status?.llamaHealthy
              ? (isSingleMode ? `Running: ${activePreset?.name}` : 'Router Mode')
              : status?.llamaRunning ? 'Starting...' : 'Server Stopped'}
          </div>
          {status?.llamaRunning && (
            <button className="btn-danger" onClick={stopServer} disabled={loading.server}>
              Stop
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {/* Optimized Presets Section */}
        <section className="section">
          <div className="section-header">
            <h2>Optimized Presets</h2>
            {isSingleMode && (
              <span className="mode-badge single">Single Model Mode - Only this model available</span>
            )}
          </div>
          <p className="section-description">
            Pre-configured models with optimized settings. Activating a preset runs in single-model mode.
          </p>
          <div className="models-grid">
            {presets.map((preset) => {
              const isActive = activePreset?.id === preset.id;
              const isLoading = loading[preset.id];
              const isStarting = isActive && status?.llamaRunning && !status?.llamaHealthy;
              return (
                <div key={preset.id} className={`model-card preset-card ${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}>
                  <div className="model-header">
                    <h3>{preset.name}</h3>
                    {isActive && status?.llamaHealthy && <span className="status-badge-small loaded">Active</span>}
                    {isStarting && <span className="status-badge-small starting">Starting...</span>}
                    {isLoading && <span className="status-badge-small loading">Loading...</span>}
                  </div>
                  <div className="model-info">
                    <p className="preset-description">{preset.description}</p>
                    <p><strong>Repo:</strong> {preset.repo}</p>
                    <p><strong>Quant:</strong> {preset.quantization}</p>
                    {preset.context > 0 && <p><strong>Context:</strong> {preset.context.toLocaleString()}</p>}
                  </div>
                  {(isLoading || isStarting) && (
                    <div className="preset-loading-status">
                      <div className="loading-spinner" />
                      <span>{isLoading ? 'Activating preset...' : 'Starting server (downloading model if needed)...'}</span>
                    </div>
                  )}
                  <div className="model-actions">
                    {isActive ? (
                      <button
                        className="btn-secondary"
                        onClick={switchToRouterMode}
                        disabled={loading.router || isStarting}
                      >
                        {loading.router ? 'Switching...' : 'Switch to Router Mode'}
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => activatePreset(preset.id)}
                        disabled={isLoading || (isSingleMode && !isActive)}
                      >
                        {isLoading ? 'Activating...' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Router Mode Section - only show if in router mode or no mode set */}
        {!isSingleMode && (
          <>
            {/* Mode Switch Button */}
            {!status?.llamaRunning && (
              <section className="section">
                <button className="btn-primary" onClick={startServer} disabled={loading.server}>
                  {loading.server ? 'Starting...' : 'Start in Router Mode (Multi-Model)'}
                </button>
              </section>
            )}

            {/* Server Models Section */}
            {serverModels.length > 0 && (
              <section className="section">
                <h2>Loaded Models</h2>
                <div className="models-grid">
                  {serverModels.map((model) => (
                    <div key={model.id} className="model-card active">
                      <div className="model-header">
                        <h3>{model.id}</h3>
                        <span className="status-badge-small loaded">Loaded</span>
                      </div>
                      <div className="model-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => unloadModel(model.id)}
                          disabled={loading[model.id]}
                        >
                          {loading[model.id] ? 'Unloading...' : 'Unload'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Local Models Section */}
            <section className="section">
              <div className="section-header">
                <h2>Local Models</h2>
                <span className="models-dir">{modelsDir}</span>
              </div>

          {localModels.length === 0 ? (
            <div className="empty-state">
              <p>No models found in {modelsDir}</p>
              <p className="hint">Use the search below to download models from HuggingFace</p>
            </div>
          ) : (
            <div className="models-grid">
              {localModels.map((model) => {
                const modelStatus = getModelStatus(model.name);
                const isLoaded = modelStatus === 'loaded';
                return (
                  <div key={model.path} className={`model-card ${isLoaded ? 'active' : ''}`}>
                    <div className="model-header">
                      <h3 title={model.path}>{model.name}</h3>
                      {isLoaded && <span className="status-badge-small loaded">Loaded</span>}
                    </div>
                    <div className="model-info">
                      <p><strong>Size:</strong> {formatBytes(model.size)}</p>
                    </div>
                    <div className="model-actions">
                      {isLoaded ? (
                        <button
                          className="btn-secondary"
                          onClick={() => unloadModel(model.name)}
                          disabled={loading[model.name] || !status?.llamaHealthy}
                        >
                          {loading[model.name] ? 'Unloading...' : 'Unload'}
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => loadModel(model.name)}
                          disabled={loading[model.name] || !status?.llamaHealthy}
                        >
                          {loading[model.name] ? 'Loading...' : 'Load'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}

        {/* Activity & Downloads Section - Always visible */}
        <section className="section activity-section">
          <h2>Activity & Downloads</h2>

          {/* Server Status */}
          <div className="activity-status">
            <div className={`activity-indicator ${status?.llamaHealthy ? 'healthy' : status?.llamaRunning ? 'starting' : 'stopped'}`}>
              <span className="activity-dot" />
              <span className="activity-text">
                {status?.llamaHealthy
                  ? (isSingleMode
                      ? `Running: ${activePreset?.name} (downloading model if needed...)`
                      : 'Router mode ready')
                  : status?.llamaRunning
                    ? 'Server starting... (may be downloading model)'
                    : 'Server stopped'}
              </span>
            </div>
          </div>

          {/* Downloads */}
          {status?.downloads && Object.keys(status.downloads).length > 0 ? (
            <div className="downloads-list">
              {Object.entries(status.downloads).map(([id, info]) => (
                <div key={id} className={`download-item ${info.status}`}>
                  <div className="download-info">
                    <span className="download-name">{id}</span>
                    <span className="download-status-text">
                      {info.status === 'completed' ? 'Complete' :
                       info.status === 'failed' ? `Failed: ${info.error || 'Unknown error'}` :
                       info.status === 'starting' ? 'Starting...' :
                       'Downloading...'}
                    </span>
                  </div>
                  <div className="download-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${info.progress}%` }}
                      />
                    </div>
                    <span className="download-percent">{info.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-empty">
              <p>No active downloads</p>
              <p className="hint">Downloads will appear here when you pull models from HuggingFace</p>
            </div>
          )}
        </section>

        {/* Search Section */}
        <section className="section">
          <h2>Download from HuggingFace</h2>
          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for GGUF models (e.g., llama, qwen, mistral)..."
              onKeyDown={(e) => e.key === 'Enter' && searchModels()}
            />
            <button className="btn-primary" onClick={searchModels} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && !selectedRepo && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div key={result.id} className="search-result" onClick={() => selectRepo(result)}>
                  <div className="result-info">
                    <h4>{result.id}</h4>
                    <p>{result.downloads?.toLocaleString()} downloads</p>
                  </div>
                  <span className="arrow">→</span>
                </div>
              ))}
            </div>
          )}

          {selectedRepo && (
            <div className="repo-detail">
              <div className="repo-header">
                <button className="btn-ghost" onClick={() => setSelectedRepo(null)}>
                  ← Back
                </button>
                <h3>{selectedRepo.id}</h3>
              </div>

              {loadingFiles ? (
                <p>Loading available quantizations...</p>
              ) : repoQuantizations.length === 0 ? (
                <p>No GGUF files found in this repository</p>
              ) : (
                <div className="file-list">
                  {repoQuantizations.map((quant) => (
                    <div key={quant.quantization} className="file-item">
                      <div className="file-info">
                        <span className="file-name">
                          <span className="quant-badge">{quant.quantization}</span>
                        </span>
                        <span className="file-meta">
                          {formatBytes(quant.totalSize)}
                          {quant.isSplit && ` (${quant.files.length} parts)`}
                        </span>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => downloadModel(selectedRepo.id, quant.quantization)}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Server Info */}
        <section className="section">
          <h2>Server Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">API Status</span>
              <span className={`info-value ${status?.apiRunning ? 'success' : 'error'}`}>
                {status?.apiRunning ? 'Running' : 'Offline'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Llama Server</span>
              <span className={`info-value ${status?.llamaHealthy ? 'success' : 'warning'}`}>
                {status?.llamaHealthy ? 'Healthy' : status?.llamaRunning ? 'Starting' : 'Stopped'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Llama Port</span>
              <span className="info-value">{status?.llamaPort || 8080}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Models Directory</span>
              <span className="info-value">{modelsDir}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
