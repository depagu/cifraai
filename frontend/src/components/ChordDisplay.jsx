/**
 * ChordDisplay.jsx — Exibe a cifra detectada em grade por compasso.
 * Cada acorde é clicável e mostra diagrama de pestana ao hover.
 */

import { useState } from 'react'
import ChordDiagram from './ChordDiagram.jsx'

const MODE_LABELS = { major: 'maior', minor: 'menor' }

export default function ChordDisplay({ chords, bpm, keyNote, mode, duration }) {
  const [copied, setCopied] = useState(false)

  if (!chords || chords.length === 0) return null

  // Formata cifra como texto puro para copiar/exportar
  function buildPlainText() {
    const header = `Tom: ${keyNote} ${MODE_LABELS[mode] || mode}  |  BPM: ${bpm}  |  Duração: ${duration}s\n\n`
    const lines = []
    const perLine = 8
    for (let i = 0; i < chords.length; i += perLine) {
      const slice = chords.slice(i, i + perLine)
      lines.push(slice.map((c) => c.chord.padEnd(6)).join(' '))
    }
    return header + lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildPlainText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleExport() {
    const blob = new Blob([buildPlainText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cifra-${keyNote}${mode === 'minor' ? 'm' : ''}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Agrupa acordes em "compassos" de 4 por linha
  const perRow = 4
  const rows = []
  for (let i = 0; i < chords.length; i += perRow) {
    rows.push(chords.slice(i, i + perRow))
  }

  return (
    <div style={styles.container}>
      {/* Cabeçalho com metadados */}
      <div style={styles.header}>
        <div style={styles.metaGroup}>
          <span style={styles.metaLabel}>Tom</span>
          <span style={styles.metaValue}>
            {keyNote} <span style={styles.modeTag}>{MODE_LABELS[mode] || mode}</span>
          </span>
        </div>
        <div style={styles.metaDivider} />
        <div style={styles.metaGroup}>
          <span style={styles.metaLabel}>BPM</span>
          <span style={styles.metaValue}>{bpm}</span>
        </div>
        <div style={styles.metaDivider} />
        <div style={styles.metaGroup}>
          <span style={styles.metaLabel}>Duração</span>
          <span style={styles.metaValue}>{duration}s</span>
        </div>
      </div>

      {/* Grade de acordes */}
      <div style={styles.grid}>
        {rows.map((row, ri) => (
          <div key={ri} style={styles.row}>
            {row.map((entry, ci) => (
              <div key={ci} style={styles.cell}>
                <ChordDiagram chordName={entry.chord}>
                  <span style={styles.chordName}>{entry.chord}</span>
                </ChordDiagram>
                <span style={styles.timeStamp}>{formatTime(entry.time)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Ações */}
      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={handleCopy}>
          {copied ? '✓ Copiado!' : 'Copiar cifra'}
        </button>
        <button style={styles.btnSecondary} onClick={handleExport}>
          Exportar .txt
        </button>
      </div>

      <style>{tooltipCSS}</style>
    </div>
  )
}

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const tooltipCSS = `
.chord-wrapper { cursor: default; }
.chord-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1A1A1A;
  border: 1px solid #2E2E2E;
  border-radius: 8px;
  padding: 6px;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  pointer-events: none;
}
.chord-wrapper:hover .chord-tooltip { display: block; }
`

const styles = {
  container: {
    background: '#1A1A1A',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    paddingBottom: '16px',
    borderBottom: '1px solid #2E2E2E',
  },
  metaGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '11px',
    color: '#606060',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 500,
  },
  metaValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F0F0F0',
    fontFamily: 'JetBrains Mono, monospace',
  },
  modeTag: {
    fontSize: '13px',
    color: '#A0A0A0',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
  },
  metaDivider: {
    width: '1px',
    height: '32px',
    background: '#2E2E2E',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  cell: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '72px',
    padding: '10px 4px',
    borderRadius: '6px',
    background: '#222222',
    border: '1px solid #2E2E2E',
    transition: 'border-color 200ms, background 200ms',
    cursor: 'default',
  },
  chordName: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '15px',
    fontWeight: 600,
    color: '#F5A623',
    letterSpacing: '0.02em',
  },
  timeStamp: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '10px',
    color: '#606060',
    marginTop: '3px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    paddingTop: '4px',
  },
  btnSecondary: {
    background: '#222222',
    color: '#A0A0A0',
    border: '1px solid #2E2E2E',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 200ms, border-color 200ms',
  },
}
