/**
 * ChordDiagram.jsx — Renderiza diagrama SVG de pestana de violão.
 * Biblioteca de 30 acordes comuns embutida (sem dependência externa).
 * Exibido como tooltip ao hover sobre o nome do acorde.
 */

// Formato de cada acorde:
// frets: array de 6 números (cordas E-grave a E-aguda)
//   -1 = corda não tocada (X)
//    0 = corda solta (O)
//   1-5 = casa pressionada
// barre: { fret, from, to } — pestana opcional
// startFret: primeira casa exibida (para acordes mais no braço)
const CHORD_LIBRARY = {
  // ---- MAIORES ----
  'C':    { frets: [-1, 3, 2, 0, 1, 0], startFret: 1 },
  'D':    { frets: [-1, -1, 0, 2, 3, 2], startFret: 1 },
  'E':    { frets: [0, 2, 2, 1, 0, 0], startFret: 1 },
  'F':    { frets: [1, 1, 2, 3, 3, 1], startFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  'G':    { frets: [3, 2, 0, 0, 0, 3], startFret: 1 },
  'A':    { frets: [-1, 0, 2, 2, 2, 0], startFret: 1 },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], startFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'C#':   { frets: [-1, 4, 3, 1, 2, 1], startFret: 1, barre: { fret: 1, from: 2, to: 5 } },
  'D#':   { frets: [-1, -1, 1, 3, 4, 3], startFret: 1 },
  'F#':   { frets: [2, 2, 3, 4, 4, 2], startFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#':   { frets: [4, 3, 1, 1, 1, 4], startFret: 1, barre: { fret: 1, from: 1, to: 4 } },
  'A#':   { frets: [-1, 1, 3, 3, 3, 1], startFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ---- MENORES ----
  'Am':   { frets: [-1, 0, 2, 2, 1, 0], startFret: 1 },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2], startFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'Cm':   { frets: [-1, 3, 5, 5, 4, 3], startFret: 3, barre: { fret: 3, from: 1, to: 5 } },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1], startFret: 1 },
  'Em':   { frets: [0, 2, 2, 0, 0, 0], startFret: 1 },
  'Fm':   { frets: [1, 1, 1, 1, 0, -1], startFret: 1, barre: { fret: 1, from: 0, to: 3 } },
  'Gm':   { frets: [3, 1, 0, 0, 3, 3], startFret: 1, barre: { fret: 3, from: 3, to: 5 } },
  'F#m':  { frets: [2, 2, 2, 4, 4, 2], startFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#m':  { frets: [4, 4, 6, 6, 5, 4], startFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#m':  { frets: [-1, 1, 3, 3, 2, 1], startFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ---- SÉTIMAS ----
  'G7':   { frets: [3, 2, 0, 0, 0, 1], startFret: 1 },
  'E7':   { frets: [0, 2, 0, 1, 0, 0], startFret: 1 },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0], startFret: 1 },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2], startFret: 1 },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2], startFret: 1 },
  'C7':   { frets: [-1, 3, 2, 3, 1, 0], startFret: 1 },

  // ---- MENORES DE SÉTIMA ----
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0], startFret: 1 },
  'Em7':  { frets: [0, 2, 0, 0, 0, 0], startFret: 1 },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1], startFret: 1 },
}

// Dimensões do SVG do diagrama
const W = 110
const H = 130
const STRINGS = 6
const FRETS_SHOWN = 4
const NUT_X = 20
const NUT_Y = 28
const STRING_SPACING = 15
const FRET_SPACING = 18

function DiagramSVG({ chord, name }) {
  const { frets, startFret = 1, barre } = chord
  const showNut = startFret === 1

  // Posições x de cada corda (E-grave à esquerda, E-aguda à direita)
  const sx = (i) => NUT_X + i * STRING_SPACING
  // Posição y do centro de cada casa (1-indexed)
  const fy = (f) => NUT_Y + (f - startFret + 0.5) * FRET_SPACING

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* Nome do acorde */}
      <text x={W / 2} y={14} textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize={13} fontWeight={600}
        fill="#F5A623">{name}</text>

      {/* Casa inicial (se não começar na 1ª) */}
      {startFret > 1 && (
        <text x={NUT_X - 4} y={NUT_Y + FRET_SPACING * 0.5 + 4}
          textAnchor="end" fontSize={9} fill="#A0A0A0"
          fontFamily="Inter, sans-serif">{startFret}fr</text>
      )}

      {/* Pestana (barre) */}
      {barre && (
        <rect
          x={sx(barre.from) - 5}
          y={fy(barre.fret) - 6}
          width={sx(barre.to) - sx(barre.from) + 10}
          height={12}
          rx={6}
          fill="#F5A623"
          opacity={0.9}
        />
      )}

      {/* Grade — linhas verticais (cordas) */}
      {Array.from({ length: STRINGS }).map((_, i) => (
        <line key={`s${i}`}
          x1={sx(i)} y1={NUT_Y}
          x2={sx(i)} y2={NUT_Y + FRET_SPACING * FRETS_SHOWN}
          stroke="#3A3A3A" strokeWidth={1.5} />
      ))}

      {/* Grade — linhas horizontais (trastes) */}
      {Array.from({ length: FRETS_SHOWN + 1 }).map((_, i) => (
        <line key={`f${i}`}
          x1={sx(0)} y1={NUT_Y + i * FRET_SPACING}
          x2={sx(STRINGS - 1)} y2={NUT_Y + i * FRET_SPACING}
          stroke={i === 0 && showNut ? '#F0F0F0' : '#3A3A3A'}
          strokeWidth={i === 0 && showNut ? 3 : 1} />
      ))}

      {/* Marcações por corda */}
      {frets.map((fret, i) => {
        const x = sx(i)
        if (fret === -1) {
          // X — corda não tocada
          return (
            <g key={`m${i}`}>
              <line x1={x - 4} y1={NUT_Y - 12} x2={x + 4} y2={NUT_Y - 4} stroke="#E05252" strokeWidth={1.5} />
              <line x1={x + 4} y1={NUT_Y - 12} x2={x - 4} y2={NUT_Y - 4} stroke="#E05252" strokeWidth={1.5} />
            </g>
          )
        }
        if (fret === 0) {
          // O — corda solta
          return (
            <circle key={`m${i}`} cx={x} cy={NUT_Y - 8} r={4}
              fill="none" stroke="#A0A0A0" strokeWidth={1.5} />
          )
        }
        // Ponto no traste
        const y = fy(fret)
        return (
          <circle key={`m${i}`} cx={x} cy={y} r={5.5}
            fill="#F5A623" />
        )
      })}
    </svg>
  )
}

export default function ChordDiagram({ chordName, children }) {
  const diagram = CHORD_LIBRARY[chordName]

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      className="chord-wrapper">
      {children}
      {diagram && (
        <span className="chord-tooltip">
          <DiagramSVG chord={diagram} name={chordName} />
        </span>
      )}
    </span>
  )
}
