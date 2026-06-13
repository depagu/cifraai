# CifraAI

Detecta acordes de violão por análise real do áudio. Sem banco de cifras externo — tudo processado localmente via chromagrama e templates de acordes.

## Instalação e execução

### Backend (Python 3.11+)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

O backend sobe em `http://localhost:8000`.

> **Nota:** `basic-pitch` e `librosa` instalam dependências pesadas (numpy, scipy, torch). A primeira instalação pode levar alguns minutos.

### Frontend (Node 18+)

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173`. O Vite faz proxy automático das chamadas de API para o backend.

---

## Como usar

1. Abra `http://localhost:5173` no navegador
2. Arraste um arquivo MP3/WAV/OGG/M4A para a zona de upload **ou** cole um link do YouTube/SoundCloud
3. Clique em **Analisar** e aguarde o progresso em tempo real
4. A cifra aparece à direita com tonalidade e BPM
5. Use os botões **+/−** para transpor semitons
6. Selecione uma casa no **Capotraste** para recalcular os acordes automaticamente
7. Passe o mouse sobre qualquer acorde para ver o diagrama de pestana

---

## Limitações conhecidas da detecção de acordes

- **Percussão e baixo dominante:** músicas com muito bumbo e pouca harmonia geram acordes com baixa confiança. O detector filtra frames com similaridade abaixo de 0.50, então poucos acordes podem aparecer.
- **Vozes e melodia solo:** a análise funciona melhor em gravações com acompanhamento harmônico claro (violão, piano, guitarra rítmica). Melodia solo sem acompanhamento produz resultados imprecisos.
- **Músicas com muita reverb ou distorção:** o chromagrama fica ruidoso e dificulta a separação entre classes de pitch.
- **Modulações de tom:** a tonalidade detectada é a média global da música; modulações internas não são rastreadas.
- **Formatos com DRM:** arquivos protegidos por DRM (algumas compras do iTunes) não podem ser lidos pelo soundfile/librosa.
- **Links do YouTube com geo-bloqueio:** o yt-dlp falhará se o vídeo não estiver disponível no seu país.

---

## Estrutura do projeto

```
cifraai/
├── backend/
│   ├── main.py              # FastAPI — endpoints e SSE
│   ├── chord_detector.py    # Motor de análise (chromagrama + cosseno)
│   ├── chord_templates.py   # Biblioteca de templates de acordes
│   ├── audio_processor.py   # Download, conversão e validação
│   ├── transposer.py        # Transposição e modo capotraste
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── AudioUploader.jsx   # Upload + URL + progresso SSE
            ├── ChordDisplay.jsx    # Grade de acordes
            ├── Transposer.jsx      # Botões +/− semitom
            ├── CapoMode.jsx        # Seletor de casa do capo
            └── ChordDiagram.jsx    # SVG de diagramas de pestana
```
