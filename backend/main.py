"""
main.py — FastAPI app principal do CifraAI (versão produção web).
"""

import os
import uuid
import asyncio
import json
import tempfile
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from audio_processor import download_audio, convert_to_wav, validate_audio
from chord_detector import detect_chords
from transposer import transpose_chords, capo_chords

app = FastAPI(title="CifraAI", version="1.0.0")

# CORS — em produção aceita qualquer origem (Vercel gera subdomínios dinâmicos)
# Para restringir, defina a variável ALLOWED_ORIGIN no Railway
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=ALLOWED_ORIGIN != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

_progress_queues: dict[str, asyncio.Queue] = {}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/progress/{task_id}")
async def progress_stream(task_id: str):
    if task_id not in _progress_queues:
        _progress_queues[task_id] = asyncio.Queue()

    queue = _progress_queues[task_id]

    async def event_generator():
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    yield {"data": json.dumps({"message": "Timeout — análise demorou demais."})}
                    break
                yield {"data": json.dumps({"message": message})}
                if message in ("Concluído", "Erro"):
                    break
        finally:
            _progress_queues.pop(task_id, None)

    return EventSourceResponse(event_generator())


async def _emit(task_id: str, message: str):
    if task_id and task_id in _progress_queues:
        await _progress_queues[task_id].put(message)


@app.post("/analyze")
async def analyze(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    task_id: Optional[str] = Form(None),
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Envie um arquivo de áudio ou uma URL do YouTube/SoundCloud.")

    if task_id and task_id not in _progress_queues:
        _progress_queues[task_id] = asyncio.Queue()

    tmp_path = None

    try:
        if url:
            await _emit(task_id, "Baixando áudio...")
            loop = asyncio.get_event_loop()
            try:
                tmp_path = await loop.run_in_executor(None, download_audio, url)
            except ValueError as e:
                await _emit(task_id, "Erro")
                raise HTTPException(status_code=422, detail=str(e))
        else:
            await _emit(task_id, "Recebendo arquivo...")
            suffix = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
            tmp_fd, tmp_path_raw = tempfile.mkstemp(suffix=suffix, prefix="cifraai_")
            os.close(tmp_fd)
            content = await file.read()
            with open(tmp_path_raw, "wb") as f:
                f.write(content)

            await _emit(task_id, "Convertendo formato...")
            loop = asyncio.get_event_loop()
            try:
                tmp_path = await loop.run_in_executor(None, convert_to_wav, tmp_path_raw)
            except ValueError as e:
                await _emit(task_id, "Erro")
                raise HTTPException(status_code=422, detail=str(e))
            finally:
                if os.path.exists(tmp_path_raw):
                    os.unlink(tmp_path_raw)

        await _emit(task_id, "Validando áudio...")
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, validate_audio, tmp_path)
        except ValueError as e:
            await _emit(task_id, "Erro")
            raise HTTPException(status_code=422, detail=str(e))

        await _emit(task_id, "Analisando notas...")
        await asyncio.sleep(0.1)
        await _emit(task_id, "Identificando acordes...")

        try:
            result = await loop.run_in_executor(None, detect_chords, tmp_path)
        except Exception as e:
            await _emit(task_id, "Erro")
            raise HTTPException(status_code=500, detail=f"Falha na análise de acordes. Detalhe: {str(e)[:200]}")

        await _emit(task_id, "Concluído")
        return JSONResponse(content=result)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@app.get("/transpose")
async def transpose_endpoint(
    chords: str = Query(...),
    semitones: int = Query(..., ge=-11, le=11),
):
    try:
        chord_list = json.loads(chords)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de acordes inválido. Use JSON.")
    return {"chords": transpose_chords(chord_list, semitones), "semitones": semitones}


@app.get("/capo")
async def capo_endpoint(
    chords: str = Query(...),
    fret: int = Query(..., ge=1, le=7),
):
    try:
        chord_list = json.loads(chords)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de acordes inválido. Use JSON.")
    adjusted = capo_chords(chord_list, fret)
    return {
        "chords": adjusted,
        "capo_fret": fret,
        "instruction": f"Com capotraste na casa {fret}, toque os acordes abaixo:",
    }


if __name__ == "__main__":
    import uvicorn
    # Railway define a variável PORT automaticamente
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
