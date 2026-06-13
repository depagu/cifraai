/**
 * Transposer.jsx — Controles de transposição de semitom.
 * Exibe o tom atual e permite subir/descer semitons.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function transposeNote(note, semitones) {
  const idx = NOTE_NAMES.indexOf(note)
  if (idx === -1) return note
  return NOTE_NAMES[(idx + semitones + 12) % 12]
}

export default function Transposer({ originalKey, mode, semitones, onTranspose }) {
  const currentNote = transposeNote(originalKey, semitones)
  const modeLabel = mode === 'minor' ? 'm' : ''
  const displayKey = `${currentNote}${modeLabel}`

  return (
    <div style={styles.container}>
      <span style={styles.label}>Transposição</span>

      <div style={styles.controls}>
        <button style={styles.btn} onClick={() => onTranspose(semitones - 1)}
          title="Descer um semitom">−</button>

        <div style={styles.display}>
          <span style={styles.key}>{displayKey}</span>
          {semitones !== 0 && (
            <span style={styles.delta}>
              {semitones > 0 ? `+${semitones}` : semitones} st
            </span>
          )}
        </div>

        <button style={styles.btn} onClick={() => onTranspose(semitones + 1)}
          title="Subir um semitom">+</button>
      </div>

      {semitones !== 0 && (
        <button style={styles.reset} onClick={() => onTranspose(0)}>
          Voltar ao original
        </button>
      )}
    </div>
  )
}

const styles = {
  container: {
    background: '#1A1A1A',
    borderRadius: '10px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '11px',
    color: '#606060',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 500,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  btn: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    background: '#222222',
    border: '1px solid #2E2E2E',
    color: '#F0F0F0',
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1,
    cursor: 'pointer',
    transition: 'background 200ms, border-color 200ms',
  },
  display: {
    flex: 1,
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  key: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '22px',
    fontWeight: 600,
    color: '#F5A623',
  },
  delta: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    color: '#A0A0A0',
  },
  reset: {
    background: 'none',
    border: 'none',
    color: '#606060',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '2px 0',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    width: 'fit-content',
  },
}
