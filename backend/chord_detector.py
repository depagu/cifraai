"""
chord_detector.py — Motor de detecção de acordes via análise de chromagrama.

Pipeline:
  1. Carrega áudio com librosa (mono, 22050 Hz)
  2. Extrai chroma features (energia por classe de pitch) em janelas deslizantes
  3. Compara cada janela contra templates de acordes via similaridade de cosseno
  4. Detecta BPM e tonalidade (key/mode)
  5. Remove acordes duplicados consecutivos para compactar a progressão
"""

import numpy as np
import librosa
from chord_templates import ALL_CHORD_TEMPLATES


# ---------------------------------------------------------------------------
# Função auxiliar: similaridade de cosseno entre dois vetores
# Retorna valor entre 0.0 (sem relação) e 1.0 (idênticos)
# ---------------------------------------------------------------------------
def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    # Evita divisão por zero se o vetor for silêncio total
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Função auxiliar: detecta tonalidade usando perfis de Krumhansl-Schmuckler
# Compara o chromagrama médio de toda a música com perfis de cada tom maior/menor
# ---------------------------------------------------------------------------
def detect_key_ks(chroma_mean: np.ndarray) -> tuple[str, str]:
    """
    Retorna (nota_tônica, modo) — ex: ("A", "minor") ou ("C", "major")
    Baseado nos coeficientes de correlação de Krumhansl (1990).
    """
    # Perfis de saliência de pitch para o modo MAIOR (Krumhansl, 1990)
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                               2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    # Perfis de saliência para o modo MENOR (harmônico natural)
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                               2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

    # Nomes das notas em ordem cromática (começando em C)
    note_names = ["C", "C#", "D", "D#", "E", "F",
                  "F#", "G", "G#", "A", "A#", "B"]

    best_score = -np.inf
    best_key = "C"
    best_mode = "major"

    # Testa todos os 24 tons possíveis (12 maiores + 12 menores)
    for root in range(12):
        # Rotaciona o perfil para a tônica atual (ex: G = rotação de 7 semitons)
        rotated_major = np.roll(major_profile, root)
        rotated_minor = np.roll(minor_profile, root)

        # Calcula correlação de Pearson entre o chroma da música e o perfil
        score_major = float(np.corrcoef(chroma_mean, rotated_major)[0, 1])
        score_minor = float(np.corrcoef(chroma_mean, rotated_minor)[0, 1])

        if score_major > best_score:
            best_score = score_major
            best_key = note_names[root]
            best_mode = "major"

        if score_minor > best_score:
            best_score = score_minor
            best_key = note_names[root]
            best_mode = "minor"

    return best_key, best_mode


# ---------------------------------------------------------------------------
# Função principal: detecta acordes ao longo do tempo
# ---------------------------------------------------------------------------
def detect_chords(filepath: str) -> dict:
    """
    Recebe caminho de arquivo .wav e retorna dicionário com:
      - chords: lista de {"time": float, "chord": str}
      - bpm: float (batidas por minuto)
      - key: str (nota tônica, ex: "Am")
      - mode: str ("major" ou "minor")
      - duration: float (duração em segundos)
    """

    # --- Etapa 1: Carrega o áudio como mono a 22050 Hz ---
    # librosa retorna array float32 normalizado em [-1.0, 1.0]
    y, sr = librosa.load(filepath, sr=22050, mono=True)

    # Duração total em segundos
    duration = float(librosa.get_duration(y=y, sr=sr))

    # --- Etapa 2: Extrai chroma features (chromagrama) ---
    # hop_length = número de amostras entre cada frame (0.5s = 11025 amostras a 22050Hz)
    hop_length = int(sr * 0.5)    # janela desliza 0.5 segundos por vez
    window_sec = 2.0              # cada análise cobre 2 segundos de áudio
    n_fft = int(sr * window_sec)  # tamanho da FFT em amostras (2s * 22050Hz = 44100)

    # chroma_cqt usa CQT (Constant-Q Transform) — mais robusto que STFT para pitch
    # Retorna matriz (12, n_frames): 12 classes de pitch × número de janelas
    chroma = librosa.feature.chroma_cqt(
        y=y,
        sr=sr,
        hop_length=hop_length,
        n_octaves=6,    # cobre 6 oitavas para capturar graves e agudos
        bins_per_octave=36,  # 3 bins por semitom → maior resolução harmônica
    )

    # --- Etapa 3: Detecta BPM ---
    # librosa.beat.beat_track usa onset envelope + análise de autocorrelação
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    # tempo pode ser array em versões novas do librosa
    bpm = float(np.atleast_1d(tempo)[0])

    # --- Etapa 4: Detecta tonalidade via Krumhansl-Schmuckler ---
    # Usa a média do chromagrama inteiro como perfil da música
    chroma_mean = np.mean(chroma, axis=1)  # vetor (12,) com média de cada pitch class
    key, mode = detect_key_ks(chroma_mean)

    # --- Etapa 5: Converte templates de acordes para arrays numpy ---
    # Feito uma vez fora do loop para eficiência
    template_items = [
        (chord_name, np.array(template_vec, dtype=float))
        for chord_name, template_vec in ALL_CHORD_TEMPLATES.items()
    ]

    # --- Etapa 6: Identifica o acorde de cada janela por correlação de cosseno ---
    raw_chords = []  # lista de {"time": float, "chord": str} antes de compactar

    for frame_idx in range(chroma.shape[1]):
        # Vetor chroma da janela atual — 12 valores de energia por pitch class
        frame_chroma = chroma[:, frame_idx]

        # Timestamp de início desta janela em segundos
        time_sec = float(frame_idx * hop_length / sr)

        # Inicializa com "N" (No Chord) e score zero
        best_chord = "N"
        best_score = 0.0

        # Compara a janela contra todos os templates de acordes
        for chord_name, template_vec in template_items:
            score = cosine_similarity(frame_chroma, template_vec)
            if score > best_score:
                best_score = score
                best_chord = chord_name

        # Só registra acordes com confiança mínima de 0.5 (escala 0-1)
        # Abaixo disso, provavelmente é silêncio ou ruído não tonal
        if best_score >= 0.50:
            raw_chords.append({"time": round(time_sec, 2), "chord": best_chord})

    # --- Etapa 7: Remove acordes duplicados consecutivos (compacta a progressão) ---
    # Ex: [Am, Am, Am, F, F, G] → [Am, F, G]
    compacted = []
    for entry in raw_chords:
        if not compacted or compacted[-1]["chord"] != entry["chord"]:
            compacted.append(entry)

    # --- Etapa 8: Monta o resultado final ---
    return {
        "chords": compacted,
        "bpm": round(bpm, 1),
        "key": key,
        "mode": mode,
        "duration": round(duration, 1),
    }
