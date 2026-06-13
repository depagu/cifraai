/**
 * CapoMode.jsx — Seletor de capotraste com instrução de uso.
 */

export default function CapoMode({ capoFret, onCapoChange }) {
  const options = [0, 1, 2, 3, 4, 5, 6, 7]

  return (
    <div style={styles.container}>
      <span style={styles.label}>Capotraste</span>

      <div style={styles.controls}>
        {options.map((fret) => (
          <button
            key={fret}
            style={{
              ...styles.fretBtn,
              ...(capoFret === fret ? styles.fretBtnActive : {}),
            }}
            onClick={() => onCapoChange(fret)}
            title={fret === 0 ? 'Sem capotraste' : `Casa ${fret}`}
          >
            {fret === 0 ? '—' : fret}
          </button>
        ))}
      </div>

      {capoFret > 0 && (
        <p style={styles.instruction}>
          Com capotraste na casa <strong style={{ color: '#F5A623' }}>{capoFret}</strong>,
          toque os acordes exibidos abaixo
        </p>
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
    gap: '6px',
    flexWrap: 'wrap',
  },
  fretBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '6px',
    background: '#222222',
    border: '1px solid #2E2E2E',
    color: '#A0A0A0',
    fontSize: '13px',
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 200ms, border-color 200ms, color 200ms',
  },
  fretBtnActive: {
    background: 'rgba(245, 166, 35, 0.15)',
    border: '1px solid rgba(245, 166, 35, 0.5)',
    color: '#F5A623',
  },
  instruction: {
    fontSize: '13px',
    color: '#A0A0A0',
    lineHeight: 1.5,
  },
}
