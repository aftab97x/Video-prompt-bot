// pages/index.js
import { useState, useRef, useCallback, useEffect } from "react";

export default function Home() {
  const [tg, setTg] = useState(null);
  const [theme, setTheme] = useState({ bg: "#0A0A0F", card: "#13131A", text: "#E8E8F0", hint: "#8888AA", accent: "#FF3D57" });
  const [video, setVideo] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [copied, setCopied] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // âœ… Telegram SDK initialize
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand(); // Full screen à¦–à§à¦²à¦¬à§‡
      setTg(webapp);

      // Telegram à¦à¦° theme colors use à¦•à¦°à§‹
      const tp = webapp.themeParams;
      if (tp && Object.keys(tp).length > 0) {
        setTheme({
          bg: tp.bg_color || "#0A0A0F",
          card: tp.secondary_bg_color || "#13131A",
          text: tp.text_color || "#E8E8F0",
          hint: tp.hint_color || "#8888AA",
          accent: tp.button_color || "#FF3D57",
        });
      }

      // Back button
      webapp.BackButton.onClick(() => {
        if (prompts) {
          setPrompts(null);
        } else if (videoURL) {
          setVideo(null);
          setVideoURL(null);
        } else {
          webapp.close();
        }
      });
    }
  }, []);

  // Back button visibility
  useEffect(() => {
    if (!tg) return;
    if (videoURL || prompts) {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
  }, [videoURL, prompts, tg]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("video/")) {
      setError("à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦à¦•à¦Ÿà¦¿ à¦­à¦¿à¦¡à¦¿à¦“ à¦«à¦¾à¦‡à¦² à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§à¦¨à¥¤");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("à¦­à¦¿à¦¡à¦¿à¦“ à¦¸à¦¾à¦‡à¦œ à§§à§¦à§¦MB à¦à¦° à¦•à¦® à¦¹à¦¤à§‡ à¦¹à¦¬à§‡à¥¤");
      return;
    }
    setVideo(file);
    setVideoURL(URL.createObjectURL(file));
    setPrompts(null);
    setError(null);
  };

  const extractFrames = useCallback(() => {
    return new Promise((resolve, reject) => {
      const vid = videoRef.current;
      const canvas = canvasRef.current;
      if (!vid || !canvas) return reject("Video not ready");
      const frames = [];
      const ctx = canvas.getContext("2d");
      const duration = vid.duration;
      const numFrames = Math.min(6, Math.max(3, Math.floor(duration)));
      const timestamps = Array.from({ length: numFrames }, (_, i) =>
        (duration / (numFrames + 1)) * (i + 1)
      );
      canvas.width = 640;
      canvas.height = 360;
      let idx = 0;
      const captureNext = () => {
        if (idx >= timestamps.length) return resolve(frames);
        vid.currentTime = timestamps[idx];
      };
      vid.onseeked = () => {
        ctx.drawImage(vid, 0, 0, 640, 360);
        frames.push(canvas.toDataURL("image/jpeg", 0.65).split(",")[1]);
        idx++;
        captureNext();
      };
      vid.onerror = reject;
      captureNext();
    });
  }, []);

  const analyzeVideo = async () => {
    if (!video || !videoRef.current) return;
    setLoading(true);
    setError(null);

    // Telegram MainButton loading state
    if (tg) {
      tg.MainButton.showProgress();
      tg.MainButton.disable();
    }

    try {
      setProgress("à¦­à¦¿à¦¡à¦¿à¦“ à¦¥à§‡à¦•à§‡ à¦«à§à¦°à§‡à¦® à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦šà§à¦›à§‡...");
      const frames = await extractFrames();
      setProgress(`${frames.length}à¦Ÿà¦¿ à¦«à§à¦°à§‡à¦® AI à¦¦à¦¿à¦¯à¦¼à§‡ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦¹à¦šà§à¦›à§‡...`);

      // âœ… API call goes to /api/analyze (Vercel serverless function)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server error");
      }

      const data = await res.json();
      setPrompts(data);
      setProgress("");

      if (tg) {
        tg.HapticFeedback.notificationOccurred("success");
      }
    } catch (err) {
      setError("à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾: " + err.message);
      if (tg) tg.HapticFeedback.notificationOccurred("error");
    } finally {
      setLoading(false);
      if (tg) {
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
      }
    }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      if (tg) tg.HapticFeedback.impactOccurred("light");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const platformColors = { YouTube: "#FF0000", TikTok: "#69C9D0", Instagram: "#E1306C", Sora: "#7C3AED", Kling: "#F59E0B", RunwayML: "#22C55E" };
  const getPColor = (p) => { for (const [k, c] of Object.entries(platformColors)) { if (p?.includes(k)) return c; } return theme.accent; };

  const s = {
    page: { minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Noto Sans Bengali', 'Segoe UI', sans-serif", padding: "0 0 40px" },
    header: { padding: "16px", borderBottom: `1px solid ${theme.card}`, background: theme.card },
    headerTitle: { margin: 0, fontSize: "17px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" },
    headerSub: { margin: "4px 0 0", fontSize: "12px", color: theme.hint },
    body: { padding: "16px" },
    dropzone: { border: `2px dashed ${dragOver ? theme.accent : "#3A3A5A"}`, borderRadius: "14px", background: dragOver ? `${theme.accent}10` : theme.card, padding: "36px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: "14px" },
    dropIcon: { fontSize: "40px", marginBottom: "10px" },
    dropTitle: { margin: "0 0 4px", fontSize: "16px", fontWeight: "600" },
    dropSub: { margin: 0, fontSize: "12px", color: theme.hint },
    videoCard: { background: theme.card, borderRadius: "14px", padding: "14px", marginBottom: "14px" },
    video: { width: "100%", borderRadius: "10px", marginBottom: "10px" },
    analyzeBtn: { width: "100%", background: loading ? "#333" : theme.accent, color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" },
    progressBox: { background: "#1A1A2E", borderRadius: "10px", padding: "12px 14px", marginTop: "10px", fontSize: "13px", color: theme.hint },
    errorBox: { background: "#2A0A0A", border: "1px solid #5A1A1A", borderRadius: "10px", padding: "12px", color: "#FF8888", fontSize: "13px", marginBottom: "14px" },
    analysisCard: { background: `${theme.card}CC`, border: `1px solid #3A2A5A`, borderRadius: "14px", padding: "14px 16px", marginBottom: "14px" },
    chip: (bg, color) => ({ background: bg, color: color, borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: "600", display: "inline-block", marginRight: "6px", marginTop: "6px" }),
    promptCard: (color) => ({ background: theme.card, borderLeft: `3px solid ${color}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }),
    promptLabel: (color) => ({ background: `${color}22`, color: color, borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: "700", marginRight: "6px" }),
    promptBox: { background: "#0D0D18", borderRadius: "8px", padding: "10px 12px", marginTop: "10px" },
    promptLang: { fontSize: "10px", color: theme.hint, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" },
    promptText: { margin: 0, fontSize: "13px", lineHeight: "1.7", color: theme.text },
    copyBtn: (active) => ({ background: active ? "#1A3A1A" : "#1E1E30", border: "none", color: active ? "#77DD77" : theme.hint, borderRadius: "8px", padding: "7px 12px", fontSize: "12px", cursor: "pointer", marginTop: "8px", marginRight: "6px" }),
    sectionTitle: { margin: "0 0 12px", fontSize: "16px", fontWeight: "700" },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.headerTitle}>ðŸŽ¬ Video Prompt Generator</h1>
        <p style={s.headerSub}>à¦­à¦¿à¦¡à¦¿à¦“ à¦¦à¦¾à¦“ â†’ AI prompt à¦¬à¦¾à¦¨à¦¾à¦¬à§‡</p>
      </div>

      <div style={s.body}>
        {/* Upload */}
        {!videoURL && (
          <div
            style={s.dropzone}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={s.dropIcon}>ðŸ“¹</div>
            <p style={s.dropTitle}>à¦­à¦¿à¦¡à¦¿à¦“ à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§‹</p>
            <p style={s.dropSub}>MP4, MOV, AVI, WebM â€¢ à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à§§à§¦à§¦MB</p>
          </div>
        )}

        {/* Video preview */}
        {videoURL && !prompts && (
          <div style={s.videoCard}>
            <video ref={videoRef} src={videoURL} controls style={s.video} playsInline />
            <div style={{ fontSize: "12px", color: theme.hint, marginBottom: "10px" }}>ðŸ“ {video?.name}</div>
            <button onClick={analyzeVideo} disabled={loading} style={s.analyzeBtn}>
              {loading ? "â³ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦¹à¦šà§à¦›à§‡..." : "ðŸ” Prompt à¦¬à¦¾à¦¨à¦¾à¦“"}
            </button>
            {loading && progress && <div style={s.progressBox}>âš™ï¸ {progress}</div>}
          </div>
        )}

        {error && <div style={s.errorBox}>âš ï¸ {error}</div>}

        {/* Results */}
        {prompts && (
          <>
            {/* Analysis */}
            <div style={s.analysisCard}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "1.7", color: "#CCCCEE" }}>
                ðŸŽ¯ {prompts.video_analysis}
              </p>
              <span style={s.chip("#2A1A3A", "#AA77DD")}>ðŸŽ¨ {prompts.style}</span>
              <span style={s.chip("#1A2A1A", "#77DD77")}>âœ¨ {prompts.mood}</span>
            </div>

            <p style={s.sectionTitle}>ðŸ“ à¦¤à§‹à¦®à¦¾à¦° Prompts</p>

            {prompts.prompts?.map((p, i) => {
              const color = getPColor(p.platform);
              return (
                <div key={i} style={s.promptCard(color)}>
                  <div style={{ marginBottom: "8px" }}>
                    <span style={s.promptLabel(color)}>{p.platform}</span>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>{p.title}</span>
                  </div>

                  <div style={s.promptBox}>
                    <div style={s.promptLang}>à¦¬à¦¾à¦‚à¦²à¦¾</div>
                    <p style={s.promptText}>{p.prompt}</p>
                  </div>

                  <div style={{ ...s.promptBox, marginTop: "8px", borderLeft: "2px solid #3A3A6A" }}>
                    <div style={s.promptLang}>English</div>
                    <p style={{ ...s.promptText, fontSize: "12px", fontFamily: "monospace", color: "#AAAACC" }}>{p.english_prompt}</p>
                  </div>

                  <div>
                    <button onClick={() => copyText(p.prompt, `bn-${i}`)} style={s.copyBtn(copied === `bn-${i}`)}>
                      {copied === `bn-${i}` ? "âœ… Copied!" : "ðŸ“‹ à¦¬à¦¾à¦‚à¦²à¦¾ Copy"}
                    </button>
                    <button onClick={() => copyText(p.english_prompt, `en-${i}`)} style={s.copyBtn(copied === `en-${i}`)}>
                      {copied === `en-${i}` ? "âœ… Copied!" : "ðŸ“‹ English Copy"}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* New video button */}
            <button
              onClick={() => { setVideo(null); setVideoURL(null); setPrompts(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              style={{ ...s.analyzeBtn, background: "#1E1E30", marginTop: "4px" }}
            >
              ðŸ”„ à¦¨à¦¤à§à¦¨ à¦­à¦¿à¦¡à¦¿à¦“
            </button>
          </>
        )}

        <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
