"""
audio_processor.py — Download, conversão e validação de arquivos de áudio.
"""

import os
import tempfile
import numpy as np
import librosa
import soundfile as sf


# ---------------------------------------------------------------------------
# Download via yt-dlp (YouTube, SoundCloud, etc.)
# ---------------------------------------------------------------------------
def download_audio(url: str) -> str:
    """
    Baixa áudio de uma URL (YouTube/SoundCloud) como WAV mono 22050 Hz.
    Retorna o caminho do arquivo .wav criado em diretório temporário.
    Lança ValueError com mensagem em português se o download falhar.
    """
    import yt_dlp  # importação local para não bloquear se não instalado

    # Cria diretório temporário persistente (não é apagado automaticamente)
    tmp_dir = tempfile.mkdtemp(prefix="cifraai_")
    output_template = os.path.join(tmp_dir, "audio.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        raise ValueError(
            f"Não foi possível baixar o áudio da URL informada. "
            f"Verifique se o link é válido e acessível. (Detalhe: {str(e)[:120]})"
        )

    # Procura o arquivo .wav gerado no diretório temporário
    for filename in os.listdir(tmp_dir):
        if filename.endswith(".wav"):
            wav_path = os.path.join(tmp_dir, filename)
            return convert_to_wav(wav_path)

    raise ValueError(
        "O download foi concluído, mas nenhum arquivo de áudio foi encontrado. "
        "Tente com outro link ou faça upload direto do arquivo."
    )


# ---------------------------------------------------------------------------
# Conversão para WAV mono 22050 Hz
# ---------------------------------------------------------------------------
def convert_to_wav(filepath: str) -> str:
    """
    Converte qualquer formato de áudio suportado (mp3, m4a, ogg, flac, wav)
    para WAV mono 22050 Hz normalizado.
    Retorna o caminho do arquivo .wav convertido.
    """
    if not os.path.exists(filepath):
        raise ValueError(
            f"Arquivo não encontrado: {filepath}. "
            "Verifique se o upload foi concluído corretamente."
        )

    try:
        # librosa carrega qualquer formato suportado pelo soundfile/audioread
        y, sr = librosa.load(filepath, sr=22050, mono=True)
    except Exception as e:
        raise ValueError(
            f"Não foi possível ler o arquivo de áudio. "
            f"Formatos aceitos: MP3, WAV, OGG, M4A, FLAC. (Detalhe: {str(e)[:120]})"
        )

    # Se o arquivo já é .wav com o nome correto, sobrescreve com versão normalizada
    base, _ = os.path.splitext(filepath)
    output_path = base + "_converted.wav"

    # Salva como WAV PCM 16-bit — compatível com librosa e soundfile
    sf.write(output_path, y, 22050, subtype="PCM_16")
    return output_path


# ---------------------------------------------------------------------------
# Validação de qualidade do áudio
# ---------------------------------------------------------------------------
def validate_audio(filepath: str) -> None:
    """
    Valida o arquivo de áudio antes da análise.
    Lança ValueError com mensagem acionável se o arquivo não atender aos critérios:
      - Duração mínima de 15 segundos
      - Conteúdo tonal detectável (não é ruído puro ou silêncio)
    """
    try:
        y, sr = librosa.load(filepath, sr=22050, mono=True)
    except Exception as e:
        raise ValueError(
            f"Arquivo de áudio inválido ou corrompido. "
            f"Tente converter para MP3 ou WAV antes de enviar. (Detalhe: {str(e)[:100]})"
        )

    # --- Verifica duração mínima ---
    duration = librosa.get_duration(y=y, sr=sr)
    if duration < 15.0:
        raise ValueError(
            f"O áudio tem apenas {duration:.1f} segundos. "
            "Envie uma música com pelo menos 15 segundos para análise."
        )

    # --- Verifica presença de conteúdo tonal ---
    # Calcula RMS (energia) do sinal; silêncio tem RMS próximo de zero
    rms = float(np.sqrt(np.mean(y ** 2)))
    if rms < 0.001:
        raise ValueError(
            "O arquivo parece conter apenas silêncio ou ruído muito baixo. "
            "Verifique se o volume do áudio está correto e tente novamente."
        )

    # Calcula zero-crossing rate médio — ruído branco tem ZCR muito alto
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    if zcr > 0.45:
        raise ValueError(
            "O áudio parece ser ruído sem notas musicais identificáveis. "
            "Envie uma gravação com instrumentos melódicos ou voz para melhores resultados."
        )
