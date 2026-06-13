FROM python:3.11-slim

# Dependências de sistema para librosa/soundfile (libsndfile) e yt-dlp (ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway injeta PORT automaticamente
CMD ["python", "main.py"]
