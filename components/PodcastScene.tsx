"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ReportButton from "./ReportButton";

export interface Episode { id: string | number; title: string; guest: string; topic: string; date: string; duration: string; notes: string[]; mediaUrl?: string; mediaType?: "audio" | "video" | "youtube"; youtubeId?: string; thumbnailUrl?: string; tags?: string[]; transcript?: string }

const COVERS = ["#3C515E", "#708693", "#D9A15F", "#B7C4CC"];
const INKS = ["#F8FAFC", "#1D2B36", "#1D2B36", "#1D2B36"];
const RADIUS = 5.5;
const DISC = 1.3;

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = ""; let yy = y;
  for (const w of text.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  ctx.fillText(line, x, yy);
  return yy;
}
function grooves(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let r = 140; r < 500; r += 14) { ctx.beginPath(); ctx.arc(512, 512, r, 0, Math.PI * 2); ctx.stroke(); }
}
function drawCover(c: CanvasRenderingContext2D, ep: Episode, i: number, img?: HTMLImageElement) {
  const ink = INKS[i % 4];
  if (img) { // thumbnail / cover image fills the whole disc
    const w = img.naturalWidth, h = img.naturalHeight;
    let side = Math.min(w, h), sx = (w - side) / 2, sy = (h - side) / 2;
    if (/ytimg|youtube/.test(img.src) && Math.abs(w / h - 4 / 3) < 0.05) { side = (w * 9) / 16; sx = (w - side) / 2; sy = (h - side) / 2; } // skip YouTube's black bars
    c.drawImage(img, sx, sy, side, side, 0, 0, 1024, 1024);
    grooves(c, "rgba(0,0,0,0.12)");
    c.fillStyle = "#1D2B36"; c.beginPath(); c.arc(512, 512, 110, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#D9A15F"; c.textAlign = "center"; c.font = "700 44px 'Helvetica Neue', Arial, sans-serif";
    c.fillText(`EP ${String(i + 1).padStart(2, "0")}`, 512, 526);
    return;
  }
  c.fillStyle = COVERS[i % 4]; c.fillRect(0, 0, 1024, 1024);
  grooves(c, "rgba(0,0,0,0.10)");
  c.fillStyle = ink; c.textAlign = "center"; c.font = "900 92px 'Helvetica Neue', Arial, sans-serif";
  wrap(c, ep.title.toUpperCase(), 512, 250, 640, 92);
  c.fillStyle = "#1D2B36"; c.beginPath(); c.arc(512, 560, 120, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#D9A15F"; c.font = "700 44px 'Helvetica Neue', Arial, sans-serif"; c.fillText(`EP ${String(i + 1).padStart(2, "0")}`, 512, 572);
  c.fillStyle = ink; c.font = "700 46px 'Helvetica Neue', Arial, sans-serif"; c.fillText(ep.topic, 512, 800);
}
function paintImage(c: CanvasRenderingContext2D, img: HTMLImageElement) {
  const w = img.naturalWidth, h = img.naturalHeight;
  let side = Math.min(w, h), sx = (w - side) / 2, sy = (h - side) / 2;
  if (/ytimg|youtube/.test(img.src) && Math.abs(w / h - 4 / 3) < 0.05) { side = (w * 9) / 16; sx = (w - side) / 2; sy = (h - side) / 2; }
  c.drawImage(img, sx, sy, side, side, 0, 0, 1024, 1024);
}

/** Back of the disc: the cover artwork, darkened, with the title, guest and chapters on top. */
function drawBack(c: CanvasRenderingContext2D, ep: Episode, i: number, img?: HTMLImageElement) {
  const sans = "'Helvetica Neue', Arial, sans-serif";
  if (img) paintImage(c, img);
  else {
    const g = c.createRadialGradient(330, 300, 0, 512, 512, 760);
    g.addColorStop(0, COVERS[i % 4]); g.addColorStop(1, "#1D2B36");
    c.fillStyle = g; c.fillRect(0, 0, 1024, 1024);
  }
  c.fillStyle = "rgba(14,22,28,0.55)"; c.fillRect(0, 0, 1024, 1024);
  grooves(c, "rgba(255,255,255,0.07)");
  c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 14;
  c.textAlign = "center"; c.fillStyle = "#F8FAFC";
  const long = ep.title.length > 26;
  c.font = `900 ${long ? 64 : 80}px ${sans}`;
  const endY = wrap(c, ep.title.toUpperCase(), 512, 190, 640, long ? 72 : 88);
  c.fillStyle = "#B7C4CC"; c.font = `500 36px ${sans}`; c.fillText(`with ${ep.guest}`, 512, endY + 54);
  c.shadowBlur = 0; c.shadowColor = "transparent";
  c.fillStyle = "rgba(14,22,28,0.95)"; c.beginPath(); c.arc(512, 512, 46, 0, Math.PI * 2); c.fill();
  c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 10;
  const fit = (t: string, w: number) => { let x = t; while (x.length > 1 && c.measureText(x).width > w) x = x.slice(0, -1); return x === t ? t : `${x.trimEnd()}…`; };
  c.font = `500 42px ${sans}`;
  if (!ep.notes.length) { c.fillStyle = "#B7C4CC"; c.textAlign = "center"; c.fillText("No timestamps for this episode", 512, 700); }
  ep.notes.slice(0, 5).forEach((line, k) => {
    const y = 625 + k * 62;
    const m = line.match(/^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/);
    if (!m) { c.textAlign = "center"; c.fillStyle = "#F8FAFC"; c.fillText(fit(line, 620), 512, y); return; }
    const stamp = `${m[1]}   `;
    const rest = fit(m[2], 620 - c.measureText(stamp).width);
    const x0 = 512 - (c.measureText(stamp).width + c.measureText(rest).width) / 2;
    c.textAlign = "left"; c.fillStyle = "#D9A15F"; c.fillText(stamp, x0, y);
    c.fillStyle = "#F8FAFC"; c.fillText(rest, x0 + c.measureText(stamp).width, y);
  });
  c.shadowBlur = 0; c.shadowColor = "transparent";
}

function makeTextures(ep: Episode, i: number) {
  const mk = (draw: (c: CanvasRenderingContext2D) => void) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1024;
    const c = cv.getContext("2d")!; draw(c);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const ink = INKS[i % 4];
  const front = mk((c) => drawCover(c, ep, i));
  const back = mk((c) => drawBack(c, ep, i));
  return [front, back] as const;
}

function Disc({ ep, index, total, active, flipped, rotation, onClick }: {
  ep: Episode; index: number; total: number; active: number; flipped: boolean; rotation: React.MutableRefObject<number>; onClick: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const flipper = useRef<THREE.Group>(null);
  const flip = useRef(0);
  const sc = useRef(0.82);
  const [front, back] = useMemo(() => makeTextures(ep, index), [ep, index]);
  useEffect(() => {
    if (!ep.thumbnailUrl) return;
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { drawCover((front.image as HTMLCanvasElement).getContext("2d")!, ep, index, img); front.needsUpdate = true; drawBack((back.image as HTMLCanvasElement).getContext("2d")!, ep, index, img); back.needsUpdate = true; };
    img.src = ep.thumbnailUrl;
  }, [ep, index, front, back]);
  useFrame((state, dt) => {
    const a = (index / total) * Math.PI * 2 - rotation.current;
    const g = group.current!;
    const on = index === active;
    g.position.set(Math.sin(a) * RADIUS, on ? Math.sin(state.clock.elapsedTime * 0.9) * 0.05 : 0, Math.cos(a) * RADIUS - RADIUS);
    g.rotation.y = a;
    sc.current = THREE.MathUtils.damp(sc.current, on ? (flipped ? 1.12 : 1) : 0.82, 4, dt);
    g.scale.setScalar(sc.current);
    flip.current = THREE.MathUtils.damp(flip.current, index === active && flipped ? Math.PI : 0, 6, dt);
    flipper.current!.rotation.y = flip.current;
    const p = Math.min(1, Math.max(0, flip.current / Math.PI)); // lift toward the viewer mid-flip, like a tossed coin
    flipper.current!.position.z = Math.sin(p * Math.PI) * 0.7;
    flipper.current!.rotation.x = Math.sin(p * Math.PI) * 0.12;
  });
  return (
    <group ref={group} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <group ref={flipper}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[DISC, DISC, 0.16, 96]} /><meshStandardMaterial color="#10181e" roughness={0.6} metalness={0.2} /></mesh>
        <mesh position={[0, 0, 0.09]}><circleGeometry args={[DISC * 0.998, 96]} /><meshBasicMaterial map={front} toneMapped={false} /></mesh>
        <mesh position={[0, 0, -0.09]} rotation={[0, Math.PI, 0]}><circleGeometry args={[DISC * 0.998, 96]} /><meshBasicMaterial map={back} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

function Rig({ rotation, target }: { rotation: React.MutableRefObject<number>; target: React.MutableRefObject<number> }) {
  useFrame(({ camera, pointer }, dt) => {
    rotation.current = THREE.MathUtils.damp(rotation.current, target.current, 3.5, dt);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.35, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.2, 3, dt);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

const savedPos = (id: string | number) => { try { const v = Number(localStorage.getItem(`nb-pos:${id}`) ?? 0); return v > 10 ? v : 0; } catch { return 0; } };

function lum([r, g, b]: number[]) {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function hexToRgb(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function avgColor(img: HTMLImageElement): number[] | null {
  try {
    const c = document.createElement("canvas"); c.width = c.height = 8;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4; return [r / n, g / n, b / n];
  } catch { return null; }
}
/** Background colour from the artwork, nudged out of the mid-tones so text always stays readable. */
function toneStyle(input: number[]) {
  let rgb = input;
  for (let i = 0; i < 14; i++) {
    const l = lum(rgb);
    if (l <= 0.17 || l >= 0.3) break;
    rgb = l < 0.235 ? rgb.map((v) => v * 0.85) : rgb.map((v) => v + (255 - v) * 0.15);
  }
  const dark = lum(rgb) < 0.235;
  return { bg: `rgb(${rgb.map(Math.round).join(",")})`, fg: dark ? "#F8FAFC" : "#1D2B36", dim: dark ? "rgba(248,250,252,0.72)" : "rgba(29,43,54,0.72)" };
}
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function PodcastScene({ episodes, initial = 0 }: { episodes: Episode[]; initial?: number }) {
  const n = episodes.length;
  const [active, setActive] = useState(initial);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"idle" | "playing" | "paused">("idle");
  const [muted, setMuted] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [liveDur, setLiveDur] = useState(0);
  const yt = useRef<HTMLIFrameElement>(null);
  const YT = "https://www.youtube.com";
  const ytCmd = (func: string, args: unknown[] = []) => yt.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT);
  const [time, setTime] = useState(0);
  const rotation = useRef(initial * ((Math.PI * 2) / n));
  const target = useRef(initial * ((Math.PI * 2) / n));
  const lock = useRef(false);
  const media = useRef<HTMLMediaElement | null>(null);
  const startRef = useRef(0);
  const step = (Math.PI * 2) / n;
  const ep = episodes[active];
  const total = useMemo(() => { const [m, s] = ep.duration.split(":").map(Number); return m * 60 + s; }, [ep]);
  const [rate, setRate] = useState(1);
  const [goto, setGoto] = useState("");
  const [showChapters, setShowChapters] = useState(false);
  const parseTime = (v: string) => { const p = v.trim().split(":").map(Number); return !v.trim() || p.length > 3 || p.some((x) => !Number.isFinite(x) || x < 0) ? NaN : p.reduce((a, x) => a * 60 + x, 0); };
  const seekTo = (sec: number) => {
    const t = Math.max(0, Math.min(liveDur || total || sec, sec));
    if (ep.youtubeId) ytCmd("seekTo", [t, true]); else if (media.current) media.current.currentTime = t;
    setTime(t);
  };
  const chapters = ep.notes.map((l) => l.match(/^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/)).filter((x): x is RegExpMatchArray => !!x).map((x) => ({ label: `${x[1]} ${x[2]}`, t: parseTime(x[1]) }));
  const seekable = !!(ep.mediaUrl || ep.youtubeId);

  const goTo = (i: number) => {
    let d = (i - active + n) % n; if (d > n / 2) d -= n;
    if (d === 0) return;
    startRef.current = savedPos(episodes[i].id);
    target.current += d * step; setActive(i); setFlipped(false); setTime(0);
    setMuted(episodes[i].mediaType === "youtube");
  };
  const go = (dir: number) => goTo((active + dir + n) % n);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const playing = mode !== "idle";
      const vid = ep.mediaType === "video" || ep.mediaType === "youtube";
      if (e.code === "Space") {
        if (tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        if (playing && vid) setMode(mode === "playing" ? "paused" : "playing"); else setFlipped((f) => !f);
      }
      if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        const dir = e.code === "ArrowRight" ? 1 : -1;
        if (playing && seekable) { e.preventDefault(); seekTo(time + dir * 5); } else go(dir);
      }
      if (playing && seekable && e.code === "KeyJ") seekTo(time - 10);
      if (playing && seekable && e.code === "KeyL") seekTo(time + 10);
      if (playing && e.code === "KeyK") setMode(mode === "playing" ? "paused" : "playing");
      if (playing && e.code === "KeyM") setMuted((m) => !m);
      if (e.code === "KeyF") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }
      if (e.code === "Escape") setMode("idle");
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); if (lock.current) return; lock.current = true;
      go(e.deltaY > 0 ? 1 : -1); setTimeout(() => (lock.current = false), 500);
    };
    let y0 = 0;
    const ts = (e: TouchEvent) => (y0 = e.touches[0].clientY);
    const te = (e: TouchEvent) => { const d = y0 - e.changedTouches[0].clientY; if (Math.abs(d) > 50) go(d > 0 ? 1 : -1); };
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("touchstart", ts); window.addEventListener("touchend", te);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("wheel", wheel); window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  });

  useEffect(() => { // simulated clock when an episode has no audio file
    if (mode !== "playing" || ep.mediaUrl || ep.youtubeId) return;
    const id = setInterval(() => setTime((t) => Math.min(total, t + 1)), 1000);
    return () => clearInterval(id);
  }, [mode, total, ep]);
  useEffect(() => setLiveDur(0), [active]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== YT || typeof e.data !== "string") return;
      try {
        const d = JSON.parse(e.data); const info = d.info;
        if (d.event === "infoDelivery" && info) {
          if (typeof info.currentTime === "number") setTime(info.currentTime);
          if (typeof info.duration === "number" && info.duration > 0) setLiveDur(info.duration);
          if (info.playerState === 0) setMode("paused");
        }
      } catch {}
    };
    window.addEventListener("message", onMsg); return () => window.removeEventListener("message", onMsg);
  }, []);
  useEffect(() => { if (ep.youtubeId && mode !== "idle") ytCmd(mode === "playing" ? "playVideo" : "pauseVideo"); }, [mode, active]); // eslint-disable-line
  useEffect(() => { if (ep.youtubeId) ytCmd(muted ? "mute" : "unMute"); }, [muted, active, mode]); // eslint-disable-line
  useEffect(() => { if (media.current) media.current.playbackRate = rate; if (ep.youtubeId) ytCmd("setPlaybackRate", [rate]); }, [rate, active, mode]); // eslint-disable-line
  useEffect(() => {
    const a = media.current; if (!a) return;
    a.muted = muted;
    if (mode === "playing") a.play().catch(() => {}); else a.pause();
  }, [mode, muted, active]);

  const [showTranscript, setShowTranscript] = useState(false);
  const [tq, setTq] = useState("");
  const cues = useMemo(() => (ep.transcript ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^\[?(\d{1,2}(?::\d{2}){1,2})\]?\s+(.*)$/);
    return m ? { t: parseTime(m[1]), stamp: m[1], text: m[2] } : { t: NaN, stamp: "", text: l };
  }), [ep.transcript]); // eslint-disable-line
  let activeCue = -1;
  cues.forEach((c, i) => { if (Number.isFinite(c.t) && c.t <= time) activeCue = i; });
  useEffect(() => {
    if (showTranscript && mode === "playing" && activeCue >= 0) document.getElementById(`cue-${activeCue}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeCue, showTranscript, mode]);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/podcast?ep=${ep.id}`;
    try {
      if (navigator.share) await navigator.share({ title: ep.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };
  const onMeta = (el: HTMLMediaElement) => {
    if (isFinite(el.duration)) setLiveDur(el.duration);
    if (startRef.current > 0 && isFinite(el.duration) && startRef.current < el.duration - 10) el.currentTime = startRef.current;
    startRef.current = 0;
  };
  const startPlay = () => {
    startRef.current = savedPos(ep.id);
    const el = media.current;
    if (el && ep.mediaUrl && startRef.current > 0 && isFinite(el.duration) && startRef.current < el.duration - 10) { el.currentTime = startRef.current; startRef.current = 0; }
    if (ep.youtubeId) setMuted(true); // start muted so autoplay is allowed on Android
    setMode("playing");
  };
  // remember where the listener stopped
  useEffect(() => {
    if (!seekable || mode === "idle") return;
    const k = `nb-pos:${ep.id}`;
    try {
      if (liveDur && time >= liveDur - 3) localStorage.removeItem(k);
      else if (time > 10 && Math.floor(time) % 5 === 0) localStorage.setItem(k, String(Math.floor(time)));
    } catch { /* storage unavailable */ }
  }, [time, mode, seekable, liveDur, ep.id]);
  // phone lock-screen and headphone controls
  const timeRef = useRef(0); timeRef.current = time;
  const seekRef = useRef(seekTo); seekRef.current = seekTo;
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !ep.mediaUrl || mode === "idle") return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: ep.title, artist: ep.guest !== "—" ? ep.guest : "NextGen Bio", album: "NextGen Bio", artwork: ep.thumbnailUrl ? [{ src: ep.thumbnailUrl }] : [] });
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, h); } catch { /* unsupported */ } };
    set("play", () => setMode("playing")); set("pause", () => setMode("paused"));
    set("seekbackward", () => seekRef.current(timeRef.current - 10)); set("seekforward", () => seekRef.current(timeRef.current + 10));
    set("seekto", (d) => { if (typeof d.seekTime === "number") seekRef.current(d.seekTime); });
    set("previoustrack", () => go(-1)); set("nexttrack", () => go(1));
    ms.playbackState = mode === "playing" ? "playing" : "paused";
    return () => { (["play", "pause", "seekbackward", "seekforward", "seekto", "previoustrack", "nexttrack"] as MediaSessionAction[]).forEach((a) => set(a, null)); };
  }, [mode, active, ep.mediaUrl]); // eslint-disable-line
  useEffect(() => {
    if (!("mediaSession" in navigator) || !ep.mediaUrl || !liveDur || mode === "idle") return;
    try { navigator.mediaSession.setPositionState({ duration: liveDur, position: Math.min(time, liveDur), playbackRate: rate }); } catch { /* unsupported */ }
  }, [Math.floor(time / 5), liveDur, rate, mode]); // eslint-disable-line
  const [tones, setTones] = useState<Record<string, number[]>>({});
  useEffect(() => {
    episodes.forEach((e, i) => {
      const k = String(e.id);
      const fallback = () => setTones((t) => (t[k] ? t : { ...t, [k]: hexToRgb(COVERS[i % 4]).map((v) => v * 0.6) }));
      if (!e.thumbnailUrl) { fallback(); return; }
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { const c = avgColor(img); if (c) setTones((t) => ({ ...t, [k]: c.map((v) => v * 0.85) })); else fallback(); };
      img.onerror = fallback;
      img.src = e.thumbnailUrl;
    });
  }, [episodes]);
  const tone = toneStyle(tones[String(ep.id)] ?? [29, 43, 54]);

  const isVideo = ep.mediaType === "video" || ep.mediaType === "youtube";
  const hideDiscs = isVideo && mode !== "idle";
  const btn = "pointer-events-auto text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-60";
  const label = "text-[0.65rem] uppercase tracking-widest text-[color:var(--dim)]";
  const topics = ep.tags?.length ? ep.tags : [ep.topic];
  const highlights = ep.notes.slice(0, 6).map((l) => {
    const m = l.match(/^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/);
    return m ? { stamp: m[1], text: m[2], t: parseTime(m[1]) } : { stamp: "", text: l, t: NaN };
  }).slice(0, 2);

  return (
    <div className="surface-dark fixed inset-0 transition-colors duration-700 [&_*]:transition-[color,background-color,border-color,opacity] [&_*]:duration-300"
      style={{ backgroundColor: tone.bg, color: tone.fg, ["--dim" as string]: tone.dim } as React.CSSProperties}>
      {ep.mediaUrl && ep.mediaType !== "video" && (
        <audio key={String(ep.id)} ref={(el) => { media.current = el; }} src={ep.mediaUrl}
          onLoadedMetadata={(e) => onMeta(e.currentTarget)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onEnded={() => setMode("paused")} />
      )}
      {ep.youtubeId && mode !== "idle" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-24">
          <iframe key={String(ep.id)} ref={yt} title={ep.title}
            src={`${YT}/embed/${ep.youtubeId}?enablejsapi=1&autoplay=1&mute=1&rel=0&playsinline=1&start=${Math.floor(startRef.current)}&origin=${encodeURIComponent(window.location.origin)}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen
            onLoad={() => {
              const w = yt.current?.contentWindow;
              if (!w) return;
              w.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT);
              w.postMessage(JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }), YT);
              if (mode === "playing") w.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), YT);
            }}
            className="pointer-events-auto aspect-video w-[min(72vw,90vh)] border-0 bg-black" />
        </div>
      )}
      {ep.mediaUrl && ep.mediaType === "video" && mode !== "idle" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-24">
          <video key={String(ep.id)} ref={(el) => { media.current = el; }} src={ep.mediaUrl} playsInline
            onLoadedMetadata={(e) => onMeta(e.currentTarget)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onEnded={() => setMode("paused")}
            onClick={() => setMode(mode === "playing" ? "paused" : "playing")}
            className="pointer-events-auto max-h-[52vh] max-w-[72vw] bg-black" />
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-500 ${hideDiscs ? "pointer-events-none opacity-0" : ""}`}>
        <Canvas flat dpr={[1, 1.75]} camera={{ position: [0, 0, 7.4], fov: 50 }}>
          <ambientLight intensity={1.1} />
          <directionalLight position={[3, 4, 6]} intensity={1.2} />
          <Rig rotation={rotation} target={target} />
          {episodes.map((e, i) => (
            <Disc key={e.id} ep={e} index={i} total={n} active={active} flipped={flipped} rotation={rotation}
              onClick={() => (i === active ? setFlipped((f) => !f) : goTo(i))} />
          ))}
        </Canvas>
      </div>

      {showTranscript && cues.length > 0 && (
        <aside aria-label="Transcript" style={{ backgroundColor: tone.bg }}
          className="absolute bottom-24 right-5 top-28 z-30 flex w-[min(420px,92vw)] flex-col border border-[color:var(--dim)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Find in transcript" aria-label="Find in transcript"
              className="w-full border-b border-current bg-transparent py-1 text-sm outline-none" />
            <button className={btn} onClick={() => setShowTranscript(false)}>Close</button>
          </div>
          <ol className="space-y-2 overflow-y-auto text-sm leading-relaxed">
            {cues.map((c, i) => (!tq || c.text.toLowerCase().includes(tq.toLowerCase())) && (
              <li key={i} id={`cue-${i}`} className={i === activeCue ? "font-bold" : ""}>
                {Number.isFinite(c.t) && seekable
                  ? <button className="mr-2 font-mono text-xs underline" onClick={() => seekTo(c.t)}>{c.stamp}</button>
                  : c.stamp && <span className="mr-2 font-mono text-xs">{c.stamp}</span>}
                {c.text}
              </li>
            ))}
          </ol>
        </aside>
      )}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between pb-6 pl-12 pr-5 pt-20 md:pl-20">
        <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="relative">
            <button className={btn} aria-expanded={showIndex} onClick={() => setShowIndex(!showIndex)}>Index</button>
            {showIndex && (
              <ul aria-label="Episode index" style={{ backgroundColor: tone.bg }}
                className="pointer-events-auto absolute left-0 top-8 z-30 max-h-[50vh] w-80 space-y-3 overflow-y-auto border border-[color:var(--dim)] p-4 text-sm">
                {episodes.map((e, i) => (
                  <li key={e.id}>
                    <button onClick={() => { goTo(i); setShowIndex(false); }} aria-current={i === active}
                      className={`block text-left hover:opacity-60 ${i === active ? "font-bold" : ""}`}>
                      <span className="block">{e.title}</span>
                      <span className={label}>{fmtDate(e.date)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="hidden text-center text-sm font-bold md:block">Discover the NextGen Bio library of episodes</p>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1">
            {mode !== "idle" && <button className={btn} onClick={() => setMode(mode === "playing" ? "paused" : "playing")}>{mode === "playing" ? "Pause" : "Play"}</button>}
            {cues.length > 0 && <button className={btn} aria-expanded={showTranscript} onClick={() => setShowTranscript(!showTranscript)}>Transcript</button>}
            <button className={btn} onClick={share}>{copied ? "Link copied" : "Share"}</button>
            {/^[0-9a-f-]{36}$/i.test(String(ep.id)) && <ReportButton targetType="post" targetId={String(ep.id)} className={btn} />}
            <span className="font-mono text-xs tabular-nums">{fmt(time)} / {liveDur ? fmt(liveDur) : ep.duration}</span>
            {mode !== "idle" && (
              <>
                <button className={btn} aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? "Sound off" : "Sound"}</button>
                <button className={btn} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>Maximize</button>
                <button className={btn} onClick={() => { setMode("idle"); setTime(0); if (media.current) media.current.currentTime = 0; }}>Close</button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_minmax(0,520px)_1fr] lg:items-end lg:gap-8">
          <div key={String(ep.id)} className="swap order-2 lg:order-none">
            <h2 className="text-2xl font-black uppercase leading-none tracking-tight md:text-4xl" aria-live="polite">{ep.title}</h2>
            <dl className="mt-4 grid max-w-md grid-cols-3 gap-4 text-sm">
              <div><dt className={label}>Guest</dt><dd className="mt-1 font-bold">{ep.guest}</dd></div>
              <div><dt className={label}>Date</dt><dd className="mt-1 font-bold">{fmtDate(ep.date)}</dd></div>
              <div><dt className={label}>Topics</dt><dd className="mt-1 font-bold capitalize">{topics.slice(0, 3).map((t) => <span key={t} className="block">{t}</span>)}</dd></div>
            </dl>
          </div>

          <div className="pointer-events-auto order-1 w-full lg:order-none lg:justify-self-center">
            {mode === "idle" ? (
              <div className="text-center">
                <button onClick={startPlay} className="text-lg font-black uppercase tracking-widest transition-opacity hover:opacity-60 md:text-2xl">
                  {isVideo ? "Tap to play" : "Tap for sound"}
                </button>
                <p className="mt-2 hidden text-xs text-[color:var(--dim)] sm:block">Scroll or swipe to rotate. Space or click to flip. Arrow keys skip 5 seconds.</p>
              </div>
            ) : seekable ? (
              <div>
                <input type="range" min={0} max={liveDur || 1} step={1} value={Math.min(time, liveDur || 1)} disabled={!liveDur}
                  onChange={(e) => seekTo(Number(e.target.value))} onPointerUp={(e) => e.currentTarget.blur()} aria-label="Seek" className="w-full accent-current" />
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  <button className={btn} onClick={() => seekTo(time - 5)}>Back 5s</button>
                  <button className={btn} onClick={() => seekTo(time + 5)}>Forward 5s</button>
                  <button className={btn} onClick={() => setRate(rate >= 2 ? 1 : rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 2)}>Speed {rate}x</button>
                  <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const t = parseTime(goto); if (Number.isFinite(t)) { seekTo(t); setGoto(""); } }}>
                    <label htmlFor="goto" className={label}>Go to</label>
                    <input id="goto" value={goto} onChange={(e) => setGoto(e.target.value)} placeholder="30:00" inputMode="numeric"
                      className="w-16 border-b border-current bg-transparent text-center font-mono text-sm outline-none" />
                    <button className={btn}>Go</button>
                  </form>
                  {chapters.length > 0 && <button className={btn} aria-expanded={showChapters} onClick={() => setShowChapters(!showChapters)}>Chapters</button>}
                </div>
                {showChapters && (
                  <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
                    {chapters.map((c) => <li key={c.label}><button className="hover:opacity-60" onClick={() => seekTo(c.t)}>{c.label}</button></li>)}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-[color:var(--dim)]">This is a sample episode, so there is no audio to control.</p>
            )}
          </div>

          <div key={`h-${String(ep.id)}`} className="swap order-3 hidden space-y-4 sm:block lg:order-none lg:justify-self-end lg:text-right">
            {highlights.map((h) => (
              <button key={h.text} disabled={!seekable || mode === "idle" || !Number.isFinite(h.t)} onClick={() => seekTo(h.t)}
                className="pointer-events-auto block text-left enabled:hover:opacity-60 disabled:cursor-default lg:text-right">
                {h.stamp && <span className={`${label} block`}>{h.stamp}</span>}
                <span className="block text-lg font-bold leading-tight">{h.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
