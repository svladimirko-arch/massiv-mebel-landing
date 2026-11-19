"""Скачивает полный размер сгенерированных Qwen картинок и сохраняет их как JPEG.

Qwen отдаёт в чате превью с x-oss-process=...w_450,h_450. Замена на
w_1600,h_1600 возвращает оригинал (например, 2752x1536).
"""
import io
import os
import re
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, "tools", "generate.log")
IMG_DIR = os.path.join(ROOT, "assets", "img")

with open(LOG, encoding="utf-8") as f:
    text = f.read()

pairs = re.findall(r"GOT (\S+?): (\S+)", text)
if not pairs:
    raise SystemExit("No image URLs in generate.log")

for name, url in pairs:
    full = url.replace("w_450,h_450", "w_1600,h_1600")
    print(f"{name}: downloading full-size...", flush=True)
    with urllib.request.urlopen(urllib.request.Request(full, headers={"User-Agent": "Mozilla/5.0"}), timeout=120) as r:
        data = r.read()
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.width > 1920:
        im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
    out = os.path.join(IMG_DIR, name)
    im.save(out, "JPEG", quality=88, optimize=True)
    print(f"  -> {im.size}, {os.path.getsize(out)} bytes", flush=True)

print("DONE")
