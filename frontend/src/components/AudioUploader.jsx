/**
 * AudioUploader.jsx — Upload de arquivo ou URL com progresso SSE.
 */

import { useState, useRef, useCallback } from 'react'
import { API_URL } from '../api.js'

const ACCEPTED = '.mp3,.wav,.ogg,.m4a,.flac'

export default function AudioUploader({ onResult, loading, setLoading }) {
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef()
  const esRef = useRef(null)

  function clearState() {
    setError('')
    setProgress('')
  }

  function handleFile(f) {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
      setError('Formato não suportado. Use MP3, WAV, OGG, M4A ou FLAC.')
      return
    }
    setFile(f)
    setUrl('')
    clearState()
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  async function handleAnalyze() {
    if (!file && !url.trim()) {
      setError('Arraste um arquivo de áudio ou cole uma URL do YouTube.')
      return
    }
    clearState()
    setLoading(true)

    // Gera task_id para SSE
    const taskId = crypto.randomUUID()

    // Conecta ao SSE antes de enviar o form
    esRef.current?.close()
    const es = new EventSource(`${API_URL}/progress/${taskId}`)
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setProgress(data.message || '')
        if (data.message === 'Concluído' || data.message === 'Erro') {
          es.close()
        }
      } catch {
        // ignora mensagens malformadas
      }
    }
    es.onerror = () => es.close()

    try {
      const form = new FormData()
      form.append('task_id', taskId)
      if (file) {
        form.append('file', file)
      } else {
        form.append('url', url.trim())
      }

      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Erro desconhecido na análise.')
      }

      onResult(data)
    } catch (err) {
      setError(err.message || 'Falha ao conectar com o servidor. Verifique se o backend está rodando.')
      esRef.current?.close()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>CifraAI</h2>
      <p style={styles.subtitle}>
        Detecta acordes de violão por análise real do áudio — sem banco de cifras externo.
      </p>

      {/* Zona de drag and drop */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
          ...(file ? styles.dropZoneHasFile : {}),
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {file ? (
          <div style={styles.fileInfo}>
            <span style={styles.fileIcon}>♪</span>
            <div>
              <p style={styles.fileName}>{file.name}</p>
              <p style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button style={styles.removeBtn} onClick={(e) => {
              e.stopPropagation()
              setFile(null)
              clearState()
            }}>✕</button>
          </div>
        ) : (
          <>
            <span style={styles.dropIcon}>↑</span>
            <p style={styles.dropText}>Arraste um arquivo de áudio aqui</p>
            <p style={styles.dropSub}>ou clique para selecionar — MP3, WAV, OGG, M4A</p>
          </>
        )}
      </div>

      {/* Separador */}
      <div style={styles.separator}>
        <div style={styles.sepLine} />
        <span style={styles.sepLabel}>ou</span>
        <div style={styles.sepLine} />
      </div>

      {/* Campo de URL */}
      <div style={styles.urlGroup}>
        <input
          style={styles.urlInput}
          type="url"
          placeholder="Cole aqui um link do YouTube ou SoundCloud"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (e.target.value) setFile(null)
            clearState()
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
        />
      </div>

      {/* Erro */}
      {error && <p style={styles.error}>{error}</p>}

      {/* Progresso */}
      {loading && progress && (
        <div style={styles.progressBar}>
          <div style={styles.progressDot} />
          <span style={styles.progressText}>{progress}</span>
        </div>
      )}

      {/* Botão analisar */}
      <button
        style={styles.analyzeBtn}
        onClick={handleAnalyze}
        disabled={loading || (!file && !url.trim())}
      >
        {loading ? 'Analisando...' : 'Analisar'}
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#F5A623',
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
    lineHeight: 1.5,
  },
  dropZone: {
    border: '2px dashed #2E2E2E',
    borderRadius: '10px',
    padding: '32px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'border-color 200ms, background 200ms',
    minHeight: '140px',
    textAlign: 'center',
  },
  dropZoneActive: {
    borderColor: '#F5A623',
    background: 'rgba(245, 166, 35, 0.05)',
  },
  dropZoneHasFile: {
    borderStyle: 'solid',
    borderColor: '#2E2E2E',
    cursor: 'default',
  },
  dropIcon: {
    fontSize: '28px',
    color: '#3A3A3A',
  },
  dropText: {
    fontSize: '14px',
    color: '#A0A0A0',
    fontWeight: 500,
  },
  dropSub: {
    fontSize: '12px',
    color: '#606060',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    justifyContent: 'space-between',
  },
  fileIcon: {
    fontSize: '28px',
    color: '#F5A623',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F0F0F0',
    fontFamily: 'JetBrains Mono, monospace',
    wordBreak: 'break-all',
  },
  fileSize: {
    fontSize: '12px',
    color: '#606060',
    marginTop: '2px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#606060',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
    flexShrink: 0,
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sepLine: {
    flex: 1,
    height: '1px',
    background: '#2E2E2E',
  },
  sepLabel: {
    fontSize: '12px',
    color: '#606060',
  },
  urlGroup: {
    display: 'flex',
    gap: '8px',
  },
  urlInput: {
    flex: 1,
    background: '#1A1A1A',
    border: '1px solid #2E2E2E',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#F0F0F0',
    fontSize: '14px',
    transition: 'border-color 200ms',
    outline: 'none',
  },
  error: {
    fontSize: '13px',
    color: '#E05252',
    background: 'rgba(224, 82, 82, 0.08)',
    border: '1px solid rgba(224, 82, 82, 0.2)',
    borderRadius: '6px',
    padding: '10px 14px',
    lineHeight: 1.5,
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(245, 166, 35, 0.08)',
    border: '1px solid rgba(245, 166, 35, 0.2)',
    borderRadius: '6px',
  },
  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#F5A623',
    flexShrink: 0,
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  progressText: {
    fontSize: '13px',
    color: '#F5A623',
  },
  analyzeBtn: {
    background: '#F5A623',
    color: '#0F0F0F',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 200ms, opacity 200ms',
    letterSpacing: '0.01em',
  },
}
