/**
 * App.jsx — Layout principal do CifraAI.
 * Duas colunas: entrada (esquerda) + resultado (direita).
 * Estado global gerenciado com useState.
 */

import { useState, useCallback } from 'react'
import { API_URL } from './api.js'
import AudioUploader from './components/AudioUploader.jsx'
import ChordDisplay from './components/ChordDisplay.jsx'
import Transposer from './components/Transposer.jsx'
import CapoMode from './components/CapoMode.jsx'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)       // { chords, bpm, key, mode, duration }
  const [semitones, setSemitones] = useState(0)     // transposição atual
  const [capoFret, setCapoFret] = useState(0)       // casa do capotraste

  // Chama /transpose e atualiza a lista de acordes exibida
  async function handleTranspose(newSemitones) {
    if (!result) return
    setSemitones(newSemitones)

    if (newSemitones === 0) return // acordes originais já estão em result.chords

    try {
      const params = new URLSearchParams({
        chords: JSON.stringify(result.chords),
        semitones: newSemitones,
      })
      const res = await fetch(`${API_URL}/transpose?${params}`)
      const data = await res.json()
      setResult((prev) => ({ ...prev, _transposedChords: data.chords }))
    } catch (e) {
      console.error('Erro na transposição:', e)
    }
  }

  // Chama /capo e atualiza a lista de acordes para o modo capo
  async function handleCapo(fret) {
    setCapoFret(fret)
    if (!result) return

    if (fret === 0) {
      setResult((prev) => ({ ...prev, _capoChords: null }))
      return
    }

    try {
      // Usa os acordes originais (sem transposição) como base para o capo
      const params = new URLSearchParams({
        chords: JSON.stringify(result.chords),
        fret,
      })
      const res = await fetch(`${API_URL}/capo?${params}`)
      const data = await res.json()
      setResult((prev) => ({ ...prev, _capoChords: data.chords }))
    } catch (e) {
      console.error('Erro no capotraste:', e)
    }
  }

  // Ao receber novo resultado, reseta transposição e capo
  const handleResult = useCallback((data) => {
    setResult(data)
    setSemitones(0)
    setCapoFret(0)
  }, [])

  // Resolve qual lista de acordes exibir, respeitando prioridade:
  // capoChords > transposedChords > chords originais
  function resolveChords() {
    if (!result) return []
    if (capoFret > 0 && result._capoChords) return result._capoChords
    if (semitones !== 0 && result._transposedChords) return result._transposedChords
    return result.chords
  }

  const displayChords = resolveChords()
  const hasResult = result && displayChords.length > 0

  return (
    <div style={styles.root}>
      <div style={styles.layout}>

        {/* === PAINEL ESQUERDO — entrada === */}
        <aside style={styles.sidebar}>
          <AudioUploader
            onResult={handleResult}
            loading={loading}
            setLoading={setLoading}
          />

          {/* Controles de transposição e capo — aparecem após análise */}
          {hasResult && (
            <div style={styles.controlsStack}>
              <Transposer
                originalKey={result.key}
                mode={result.mode}
                semitones={semitones}
                onTranspose={handleTranspose}
              />
              <CapoMode
                capoFret={capoFret}
                onCapoChange={handleCapo}
              />
            </div>
          )}
        </aside>

        {/* === PAINEL DIREITO — resultado === */}
        <main style={styles.main}>
          {!hasResult && !loading && (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>♩</span>
              <p style={styles.emptyTitle}>Nenhuma cifra ainda</p>
              <p style={styles.emptyText}>
                Faça upload de um áudio ou cole um link para começar.
              </p>
            </div>
          )}

          {loading && (
            <div style={styles.emptyState}>
              <span style={{ ...styles.emptyIcon, color: '#F5A623' }}>♪</span>
              <p style={styles.emptyTitle}>Analisando o áudio...</p>
              <p style={styles.emptyText}>
                Isso pode levar de 10 a 60 segundos dependendo da duração da música.
              </p>
            </div>
          )}

          {hasResult && (
            <ChordDisplay
              chords={displayChords}
              bpm={result.bpm}
              keyNote={result.key}
              mode={result.mode}
              duration={result.duration}
            />
          )}
        </main>
      </div>

      {/* Animação de pulsação para o dot de progresso */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0F0F0F',
    padding: '24px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'sticky',
    top: '24px',
  },
  controlsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  main: {
    minHeight: '400px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '12px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#2E2E2E',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#A0A0A0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#606060',
    maxWidth: '320px',
    lineHeight: 1.6,
  },
}
