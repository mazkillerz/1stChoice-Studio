"""1st Choice reel renderer (adapted from howseen-ai/claude-motion-design, MIT: see LICENSE-motion-design.txt).

A reel is ONE html file with `window.seek(t)` (everything computed from t, no timers, no CSS transitions)
and `window.ready = true` after fonts and images load. This script opens it in headless Chromium,
seeks frame by frame, screenshots #stage and encodes with ffmpeg. Arabic text renders natively (browser RTL).

  python render.py <reel.html> probe 0.5 1.2 3      -> out/probe.png  (look before rendering everything)
  python render.py <reel.html> beats                -> out/beats.png  (one frame per 0.5 s)
  python render.py <reel.html> draft                -> out/draft.mp4  (540 wide, judge rhythm)
  python render.py <reel.html> full                 -> out/<name>.mp4 (1080x1920, motion-blurred subframes)
  python render.py <reel.html> pops [video]         -> one-frame pops / flashes report
  python render.py <reel.html> sheet [video]        -> out/contact.png (2 fps) + out/phone.png (readability)

Settings come from the page: window.REEL = {duration: 15, fps: 30, cuts: [2.0, 4.5]}.
"""
import asyncio, functools, http.server, shutil, socketserver, subprocess, sys, threading
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from playwright.async_api import async_playwright

FF = shutil.which("ffmpeg") or imageio_ffmpeg.get_ffmpeg_exe()
HTML = Path(sys.argv[1]).resolve()
ROOT, OUT = HTML.parent, HTML.parent / "out"
W, H = 1080, 1920
SUB, SHUTTER = 4, 0.5          # subframes per frame (motion blur) over half the frame interval (180 deg)
ARGS = ["--autoplay-policy=no-user-gesture-required", "--font-render-hinting=none", "--force-color-profile=srgb",
        "--disable-threaded-animation", "--run-all-compositor-stages-before-draw"]


def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    h.log_message = lambda *a: None
    srv = socketserver.TCPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/{HTML.name}"


async def open_page(p, url, scale=1):
    b = await p.chromium.launch(args=ARGS)
    pg = await b.new_page(viewport={"width": W, "height": H}, device_scale_factor=scale)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.goto(url)
    await pg.wait_for_function("window.ready === true", timeout=120000)
    await pg.evaluate("document.fonts.ready")
    await pg.add_style_tag(content="*,*::before,*::after{transition:none!important}.guide{display:none!important}")
    await pg.evaluate("document.getAnimations().forEach(a => a.pause())")
    cfg = await pg.evaluate("window.REEL || {}")
    return b, pg, errs, cfg


async def shot(pg, t, path, fmt="png"):
    await pg.evaluate(f"window.seek({t})")
    await pg.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
    el = await pg.query_selector("#stage")
    await el.screenshot(path=str(path), type=fmt, **({"quality": 95} if fmt == "jpeg" else {}))


def tile(folder, pattern, n, out, cols=4, size=270):
    rows = -(-n // cols)
    subprocess.run([FF, "-v", "error", "-y", "-i", str(folder / pattern), "-vf",
                    f"scale={size}:-1,tile={cols}x{rows}:padding=6:color=white", "-frames:v", "1", str(out)], check=True)


async def probe(times, name="probe.png", cols=4):
    d = OUT / "probe"; shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
    srv, url = serve()
    async with async_playwright() as p:
        b, pg, errs, cfg = await open_page(p, url)
        for i, t in enumerate(times): await shot(pg, t, d / f"p_{i:03d}.png")
        await b.close()
    srv.shutdown()
    if errs: print("PAGE ERRORS:", errs[:8])
    tile(d, "p_%03d.png", len(times), OUT / name, cols=cols)
    print("probe ->", OUT / name)


async def render(kind):
    srv, url = serve()
    async with async_playwright() as p:
        b, pg, errs, cfg = await open_page(p, url)
        T, FPS, cuts = float(cfg.get("duration", 10)), int(cfg.get("fps", 30)), list(cfg.get("cuts", []))
        n = int(round(T * FPS))
        sub = 1 if kind == "draft" else SUB
        d = OUT / ("draft_frames" if kind == "draft" else "frames"); shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        offs = [0.0] if sub == 1 else [(j - (sub - 1) / 2) * SHUTTER / (FPS * sub) for j in range(sub)]
        k = 0
        for i in range(n):
            c0 = i / FPS
            for o in offs:
                t = min(T - 1e-3, max(0.0, c0 + o))
                for c in cuts:   # never blur across a hard cut
                    if (t < c) != (c0 < c): t = c if c0 >= c else c - 1e-4
                await shot(pg, t, d / f"f_{k:05d}.jpg", "jpeg"); k += 1
            if i % (FPS * 2) == 0: print(f"frame {i}/{n}", flush=True)
        await b.close()
    srv.shutdown()
    if errs: print("PAGE ERRORS:", errs[:8])
    if kind == "draft":
        out = OUT / "draft.mp4"
        vf = "scale=540:-2"
        args = ["-framerate", str(FPS)]
        crf, preset = "23", "veryfast"
    else:
        out = OUT / (HTML.stem + ".mp4")
        vf = f"tmix=frames={sub},select='eq(mod(n\\,{sub})\\,{sub - 1})',setpts=N/{FPS}/TB" if sub > 1 else "null"
        args = ["-framerate", str(FPS * sub)]
        crf, preset = "16", "slow"
    vf += ",scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p"
    subprocess.run([FF, "-v", "error", "-y", *args, "-i", str(d / "f_%05d.jpg"), "-vf", vf, "-r", str(FPS),
                    "-c:v", "libx264", "-crf", crf, "-preset", preset, "-color_range", "tv", "-colorspace", "bt709",
                    "-movflags", "+faststart", str(out)], check=True)
    print(kind, "->", out)


def gray(path, size=180):
    raw = subprocess.run([FF, "-v", "quiet", "-i", str(path), "-vf", f"scale={size}:{size},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, size, size).astype(np.float32)


def pops(path):
    fr = gray(path); d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2)); hits = []
    for i in range(1, len(d) - 1):
        nb = max(d[i - 1], d[i + 1], 0.3)
        if d[i] > 3 * nb and d[i] > 2.0: hits.append((i + 1, round(float(d[i]), 2)))
    flashes = [n for n in range(1, len(fr) - 1) if min(d[n - 1], d[n]) > 2.0 and np.abs(fr[n + 1] - fr[n - 1]).mean() < 0.35 * min(d[n - 1], d[n])]
    print("pops (frame, diff):", hits or "none", "| one-frame flashes:", flashes or "none", "(intentional hard cuts also show up as pops)")


def sheet(path):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout.strip() or 10)
    r2, r1 = max(1, -(-int(dur * 2) // 8)), max(1, -(-int(dur) // 5))
    subprocess.run([FF, "-v", "error", "-y", "-i", str(path), "-vf", f"fps=2,scale=180:-1,tile=8x{r2}:padding=4:color=white", "-frames:v", "1", str(OUT / "contact.png")], check=True)
    subprocess.run([FF, "-v", "error", "-y", "-i", str(path), "-vf", f"fps=1,scale=360:-1,tile=5x{r1}:padding=4:color=white", "-frames:v", "1", str(OUT / "phone.png")], check=True)
    print("sheets ->", OUT / "contact.png", OUT / "phone.png")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    cmd = sys.argv[2]
    vid = Path(sys.argv[3]) if len(sys.argv) > 3 and cmd in ("pops", "sheet") else OUT / (HTML.stem + ".mp4")
    if cmd == "probe": asyncio.run(probe([float(x) for x in sys.argv[3:]]))
    elif cmd == "beats": asyncio.run(probe([i * 0.5 + 0.25 for i in range(int(sys.argv[3]) if len(sys.argv) > 3 else 30)], "beats.png", cols=6))
    elif cmd in ("draft", "full"): asyncio.run(render(cmd))
    elif cmd == "pops": pops(vid)
    elif cmd == "sheet": sheet(vid)
