"""
transposer.py — Transpõe acordes e recalcula cifras para uso com capotraste.
"""

# Mapeamento circular de notas (12 semitons), usando sustenidos como padrão
CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Aliases de bemóis → sustenidos para normalização de entrada
FLAT_TO_SHARP = {
    "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#",
    "Ab": "G#", "Bb": "A#", "Cb": "B",
}

# Sufixos de qualidade reconhecidos (ordem do mais específico ao mais genérico)
QUALITY_SUFFIXES = [
    "maj7", "m7", "sus2", "sus4", "aug", "dim", "7", "m",
]


def _parse_chord(chord_name: str) -> tuple[str, str]:
    """
    Separa o nome do acorde em (root, quality).
    Ex: "Am7" → ("A", "m7"), "F#maj7" → ("F#", "maj7"), "G" → ("G", "")
    """
    if not chord_name or chord_name == "N":
        return chord_name, ""

    # Normaliza bemóis para sustenidos
    for flat, sharp in FLAT_TO_SHARP.items():
        if chord_name.startswith(flat):
            chord_name = sharp + chord_name[len(flat):]
            break

    # Extrai a nota raiz (pode ser 2 caracteres como "C#" ou 1 como "G")
    if len(chord_name) >= 2 and chord_name[1] == "#":
        root = chord_name[:2]
        remainder = chord_name[2:]
    else:
        root = chord_name[0]
        remainder = chord_name[1:]

    return root, remainder


def _chord_to_index(root: str) -> int:
    """Converte nome da nota para índice cromático (C=0, C#=1, ..., B=11)."""
    root = FLAT_TO_SHARP.get(root, root)
    try:
        return CHROMATIC_SCALE.index(root)
    except ValueError:
        return 0


def transpose_chord(chord_name: str, semitones: int) -> str:
    """
    Transpõe um único acorde N semitons (positivo = sobe, negativo = desce).
    Ex: transpose_chord("Am", 2) → "Bm"
    """
    if not chord_name or chord_name == "N":
        return chord_name

    root, quality = _parse_chord(chord_name)
    root_idx = _chord_to_index(root)

    # Desloca o índice no círculo cromático, usando módulo 12 para wraparound
    new_idx = (root_idx + semitones) % 12
    new_root = CHROMATIC_SCALE[new_idx]

    return new_root + quality


def transpose_chords(chord_list: list[dict], semitones: int) -> list[dict]:
    """
    Transpõe uma lista de acordes N semitons.
    Entrada:  [{"time": 0.0, "chord": "Am"}, ...]
    Saída:    [{"time": 0.0, "chord": "Bm"}, ...]
    """
    return [
        {"time": entry["time"], "chord": transpose_chord(entry["chord"], semitones)}
        for entry in chord_list
    ]


def capo_chords(chord_list: list[dict], capo_fret: int) -> list[dict]:
    """
    Recalcula acordes para uso com capotraste na casa N.

    Lógica: quando se coloca o capo na casa N, o violão soa N semitons acima.
    Para tocar a nota original, o músico precisa usar um acorde N semitons ABAIXO.
    Ex: música em Bb, capo 3 → toca acordes de G (Bb - 3 = G)

    Entrada:  chord_list original + número da casa do capo (1-7)
    Saída:    acordes simplificados que o músico deve dedilhar com o capo
    """
    if capo_fret <= 0:
        return chord_list

    # Subtrai os semitons do capo — o instrumento "compensa" a afinação
    return transpose_chords(chord_list, -capo_fret)
