// pages/index.js
import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";

const PLATFORM_META = {
  YouTube:   { icon: "▶", color: "#FF4444" },
  TikTok:    { icon: "♪", color: "#00E5CC" },
  Instagram: { icon: "◈", color: "#E1306C" },
  Sora:      { icon: "◉", color: "#8B5CF6" },
  Kling:     { icon: "◆", color: "#F59E0B" },
  RunwayML:  { icon: "⬡", color: "#10B981" },
};

export default function Home() {
  const [tg, setTg] = useState(null);
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

  // ─── Telegram SDK ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const webapp = window.Telegram?.WebApp;
    if (!webapp) return;
    webapp.ready();
    webapp.expand();
    setTg(webapp);
  }, []);

  // Back button
  useEffect(() => {
    if (!tg) return;
    const handle = () => {
      if (prompts) { setPrompts(null); }
      else if (videoURL) { setVideo(null); setVideoURL(null); }
      else { tg.close(); }
    };
    tg.BackButton.onClick(handle);
    if (videoURL || prompts) tg.BackButton.show();
    else tg.BackButton.hide();
    return () => tg.BackButton.offClick(handle);
  }, [tg, videoURL, prompts]);

  // ─── File handler ────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("video/")) {
      setError("অনুগ্রহ করে একটি ভিডিও ফাইল আপলোড করুন।");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("ভিডিও সাইজ ১০০MB এর কম হতে হবে।");
      return;
    }
    setVideo(file);
    setVideoURL(URL.createObjectURL(file));
    setPrompts(null);
    setError(null);
  };

  // ─── Frame extractor ─────────────────────────────────────────────
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

  // ─── Analyze ─────────────────────────────────────────────────────
  const analyzeVideo = async () => {
    if (!video || !videoRef.current) return;
    setLoading(true);
    setError(null);
    try {
      setProgress("ভিডিও থেকে ফ্রেম নেওয়া হচ্ছে...");
      const frames = await extractFrames();
      setProgress(`${frames.length}টি ফ্রেম AI দিয়ে বিশ্লেষণ হচ্ছে...`);
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
      if (tg) tg.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      setError("বিশ্লেষণে সমস্যা: " + err.message);
      if (tg) tg.HapticFeedback?.notificationOccurred("error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Copy ────────────────────────────────────────────────────────
  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      if (tg) tg.HapticFeedback?.impactOccurred("light");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("কপি করা যায়নি।");
    }
  };

  const reset = () => {
    setVideo(null);
    setVideoURL(null);
    setPrompts(null);
    setError(null);
    setProgress("");
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Video Prompt Generator</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="color-scheme" content="dark" />
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=Noto+Sans+Bengali:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --bg: #070710;
            --bg2: #0e0e1a;
            --bg3: #13131f;
            --border: rgba(255,255,255,0.07);
            --bh: rgba(255,255,255,0.14);
            --text: #f0f0f8;
            --muted: rgba(240,240,248,0.42);
            --accent: #6C63FF;
            --glow: rgba(108,99,255,0.28);
          }

          html, body {
            background: var(--bg);
            color: var(--text);
            font-family: 'DM Sans', 'Noto Sans Bengali', sans-serif;
            min-height: 100vh;
            overflow-x: hidden;
          }

          body::before {
            content: '';
            position: fixed; inset: 0;
            background:
              radial-gradient(ellipse 80% 50% at 15% 5%, rgba(108,99,255,0.13) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 85% 95%, rgba(255,101,132,0.09) 0%, transparent 60%);
            pointer-events: none; z-index: 0;
          }

          .page {
            max-width: 560px; margin: 0 auto;
            padding: 36px 18px 80px;
            position: relative; z-index: 1;
          }

          /* Header */
          .header { text-align: center; margin-bottom: 40px; }
          .badge {
            display: inline-flex; align-items: center; gap: 7px;
            background: rgba(108,99,255,0.1);
            border: 1px solid rgba(108,99,255,0.28);
            border-radius: 100px; padding: 5px 15px;
            font-size: 11px; font-family: 'Syne', sans-serif;
            letter-spacing: .1em; text-transform: uppercase;
            color: var(--accent); margin-bottom: 18px;
          }
          .badge-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--accent); animation: blink 2s infinite;
          }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }

          h1 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(30px, 8vw, 52px);
            font-weight: 800; line-height: 1.05;
            letter-spacing: -.03em; margin-bottom: 12px;
          }
          h1 em {
            font-style: normal;
            background: linear-gradient(135deg, #6C63FF, #FF6584);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .subtitle {
            font-size: 14px; color: var(--muted);
            font-weight: 300; line-height: 1.65;
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
          }

          /* Upload */
          .drop {
            border: 1.5px dashed var(--bh);
            border-radius: 22px; background: var(--bg2);
            padding: 52px 20px; text-align: center;
            cursor: pointer; transition: border-color .25s, background .25s;
            margin-bottom: 20px;
          }
          .drop.over, .drop:hover {
            border-color: var(--accent);
            background: rgba(108,99,255,0.04);
          }
          .drop-icon {
            width: 66px; height: 66px; border-radius: 18px;
            background: rgba(108,99,255,0.1);
            border: 1px solid rgba(108,99,255,0.22);
            display: flex; align-items: center;
            justify-content: center; font-size: 28px;
            margin: 0 auto 16px;
          }
          .drop-title {
            font-family: 'Syne', sans-serif;
            font-size: 18px; font-weight: 700; margin-bottom: 6px;
          }
          .drop-sub {
            color: var(--muted); font-size: 13px; margin-bottom: 18px;
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
          }
          .drop-btn {
            display: inline-block;
            background: rgba(108,99,255,0.14);
            border: 1px solid rgba(108,99,255,0.32);
            color: var(--accent); padding: 9px 22px;
            border-radius: 100px; font-size: 13px; font-weight: 500;
          }
          .drop-fmt { margin-top: 14px; font-size: 11px; color: var(--muted); letter-spacing: .04em; }

          /* Video card */
          .vcard {
            border-radius: 20px; overflow: hidden;
            background: var(--bg2); border: 1px solid var(--border);
            margin-bottom: 16px;
          }
          .vcard video {
            width: 100%; display: block;
            max-height: 300px; object-fit: contain; background: #000;
          }
          .vinfo {
            display: flex; align-items: center;
            justify-content: space-between; padding: 13px 16px;
          }
          .vname {
            font-size: 13px; color: var(--muted);
            display: flex; align-items: center; gap: 7px;
          }
          .vname b {
            color: var(--text); font-weight: 500;
            max-width: 180px; overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
          }
          .vchange {
            font-size: 12px; color: var(--accent);
            background: rgba(108,99,255,0.1);
            border: 1px solid rgba(108,99,255,0.2);
            padding: 5px 13px; border-radius: 100px; cursor: pointer;
          }

          /* Analyze button */
          .abtn {
            width: 100%; padding: 17px; border-radius: 14px; border: none;
            background: linear-gradient(135deg, #6C63FF, #8B5CF6);
            color: #fff; font-family: 'Syne', sans-serif;
            font-size: 16px; font-weight: 700; cursor: pointer;
            transition: transform .25s, box-shadow .25s;
            box-shadow: 0 8px 28px var(--glow);
            letter-spacing: .02em; margin-bottom: 10px;
          }
          .abtn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 36px var(--glow); }
          .abtn:active:not(:disabled) { transform: translateY(0); }
          .abtn:disabled { opacity: .55; cursor: not-allowed; }

          /* Progress */
          .progress { text-align: center; padding: 36px 0; }
          .spinner {
            width: 44px; height: 44px; border-radius: 50%;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            animation: spin .75s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .progress-text {
            font-size: 14px; color: var(--muted);
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
          }

          /* Error */
          .errbox {
            background: rgba(255,60,60,0.08);
            border: 1px solid rgba(255,60,60,0.22);
            border-radius: 14px; padding: 14px 16px;
            margin-bottom: 16px; font-size: 13px; color: #ff7b7b;
            display: flex; gap: 10px; align-items: flex-start;
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
            line-height: 1.5;
          }

          /* Results */
          .divider { height: 1px; background: var(--border); margin: 32px 0; }
          .res-label {
            font-size: 11px; font-family: 'Syne', sans-serif;
            letter-spacing: .12em; text-transform: uppercase;
            color: var(--accent); margin-bottom: 8px;
          }
          .res-title {
            font-family: 'Syne', sans-serif;
            font-size: 24px; font-weight: 800; margin-bottom: 24px;
          }

          /* Summary grid */
          .sgrid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 28px; }
          .sc { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
          .sc.full { grid-column: 1/-1; }
          .sc-label {
            font-size: 10px; text-transform: uppercase;
            letter-spacing: .1em; color: var(--muted);
            margin-bottom: 6px; font-family: 'Syne', sans-serif;
          }
          .sc-value {
            font-size: 13px; font-weight: 500; line-height: 1.5;
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
          }

          /* Platform cards */
          .plat-label {
            font-size: 11px; font-family: 'Syne', sans-serif;
            letter-spacing: .1em; text-transform: uppercase;
            color: var(--muted); margin-bottom: 12px;
          }
          .pc {
            background: var(--bg2); border: 1px solid var(--border);
            border-radius: 18px; overflow: hidden;
            margin-bottom: 12px; transition: border-color .2s, transform .2s;
          }
          .pc:hover { border-color: var(--bh); transform: translateY(-2px); }
          .ph {
            display: flex; align-items: center; gap: 12px;
            padding: 15px 16px 12px; border-bottom: 1px solid var(--border);
          }
          .pi {
            width: 36px; height: 36px; border-radius: 10px;
            display: flex; align-items: center;
            justify-content: center; font-size: 17px; flex-shrink: 0;
          }
          .pn { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; }
          .pb { padding: 14px 16px; }
          .pm-label {
            font-size: 10px; text-transform: uppercase;
            letter-spacing: .1em; color: var(--muted);
            margin-bottom: 6px; font-family: 'Syne', sans-serif;
          }
          .pm-text {
            font-size: 13px; line-height: 1.7; margin-bottom: 12px;
            color: rgba(240,240,248,.85);
            font-family: 'Noto Sans Bengali', 'DM Sans', sans-serif;
          }
          .pm-en {
            background: var(--bg3); border-radius: 10px;
            padding: 12px 14px; font-size: 12px; line-height: 1.6;
            color: var(--muted); border-left: 2px solid;
            font-style: italic; margin-bottom: 10px;
          }
          .cpbtn {
            display: inline-flex; align-items: center; gap: 5px;
            background: transparent; border: 1px solid var(--bh);
            color: var(--muted); padding: 6px 13px;
            border-radius: 100px; font-size: 11px; cursor: pointer;
            transition: all .2s; font-family: 'DM Sans', sans-serif;
          }
          .cpbtn:hover, .cpbtn.done { border-color: var(--accent); color: var(--accent); }

          /* Reset */
          .rbtn {
            width: 100%; padding: 14px; border-radius: 13px;
            border: 1px solid var(--bh); background: transparent;
            color: var(--muted); font-size: 14px;
            font-family: 'DM Sans', sans-serif;
            cursor: pointer; transition: all .2s; margin-top: 6px;
          }
          .rbtn:hover { border-color: var(--accent); color: var(--accent); background: rgba(108,99,255,0.04); }

          @media (max-width: 420px) {
            .sgrid { grid-template-columns: 1fr; }
            .page { padding: 28px 14px 70px; }
          }
        `}</style>
      </Head>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="page">

        {/* Header */}
        <div className="header">
          <div className="badge">
            <div className="badge-dot" />
            AI Powered · Gemini
          </div>
          <h1>Video <em>Prompt</em><br />Generator</h1>
          <p className="subtitle">ভিডিও আপলোড করুন, AI আপনার জন্য সেরা prompt তৈরি করবে</p>
        </div>

        {/* Error */}
        {error && (
          <div className="errbox">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Upload View */}
        {!videoURL && !prompts && (
          <div
            className={`drop${dragOver ? " over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
          >
            <div className="drop-icon">🎬</div>
            <div className="drop-title">ভিডিও এখানে ড্রপ করুন</div>
            <div className="drop-sub">অথবা ক্লিক করে ভিডিও বেছে নিন</div>
            <div className="drop-btn">ভিডিও বেছে নিন</div>
            <div className="drop-fmt">MP4 · MOV · AVI · WebM · সর্বোচ্চ ১০০MB</div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Video Preview */}
        {videoURL && !prompts && (
          <>
            <div className="vcard">
              <video
                ref={videoRef}
                src={videoURL}
                controls
                playsInline
                preload="metadata"
              />
              <div className="vinfo">
                <div className="vname">🎞 <b>{video?.name}</b></div>
                <div className="vchange" onClick={reset}>পরিবর্তন করুন</div>
              </div>
            </div>

            {loading ? (
              <div className="progress">
                <div className="spinner" />
                <p className="progress-text">{progress || "বিশ্লেষণ হচ্ছে..."}</p>
              </div>
            ) : (
              <button className="abtn" onClick={analyzeVideo} disabled={loading}>
                ✨ Prompt তৈরি করুন
              </button>
            )}
          </>
        )}

        {/* Results */}
        {prompts && (
          <>
            <div className="divider" />
            <div className="res-label">✦ বিশ্লেষণ সম্পন্ন</div>
            <div className="res-title">আপনার Prompts প্রস্তুত</div>

            <div className="sgrid">
              {prompts.video_analysis && (
                <div className="sc full">
                  <div className="sc-label">ভিডিও সারসংক্ষেপ</div>
                  <div className="sc-value">{prompts.video_analysis}</div>
                </div>
              )}
              {prompts.style && (
                <div className="sc">
                  <div className="sc-label">স্টাইল</div>
                  <div className="sc-value">{prompts.style}</div>
                </div>
              )}
              {prompts.mood && (
                <div className="sc">
                  <div className="sc-label">মুড</div>
                  <div className="sc-value">{prompts.mood}</div>
                </div>
              )}
            </div>

            <div className="plat-label">প্ল্যাটফর্ম অনুযায়ী Prompts</div>

            {prompts.prompts?.map((p, i) => {
              const meta = PLATFORM_META[p.platform] || { icon: "◈", color: "#6C63FF" };
              return (
                <div className="pc" key={i}>
                  <div className="ph">
                    <div className="pi" style={{ background: `${meta.color}1a`, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="pn">{p.platform}</div>
                  </div>
                  <div className="pb">
                    {p.prompt && (
                      <>
                        <div className="pm-label">বাংলা Prompt</div>
                        <div className="pm-text">{p.prompt}</div>
                      </>
                    )}
                    {p.english_prompt && (
                      <>
                        <div className="pm-label">English Prompt</div>
                        <div className="pm-en" style={{ borderColor: meta.color }}>
                          {p.english_prompt}
                        </div>
                      </>
                    )}
                    <button
                      className={`cpbtn${copied === i ? " done" : ""}`}
                      onClick={() => copyText(p.english_prompt || p.prompt, i)}
                    >
                      {copied === i ? "✅ Copied!" : "📋 কপি করুন"}
                    </button>
                  </div>
                </div>
              );
            })}

            <button className="rbtn" onClick={reset}>
              🔄 নতুন ভিডিও আপলোড করুন
            </button>
          </>
        )}

      </div>
    </>
  );
}
