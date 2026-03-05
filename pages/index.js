import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const canvasRef = useRef(null)
  const [screen, setScreen] = useState('upload') // upload | loading | result
  const [videoFile, setVideoFile] = useState(null)
  const [videoBase64, setVideoBase64] = useState(null)
  const [type, setType] = useState(null)
  const [results, setResults] = useState(null)
  const [activeAI, setActiveAI] = useState('groq')
  const [loadingStatus, setLoadingStatus] = useState({})
  const [loadingProgress, setLoadingProgress] = useState({})
  const [allDone, setAllDone] = useState(false)
  const [openPlat, setOpenPlat] = useState({})

  const AIS = [
    { id: 'groq',     name: 'Groq',       model: 'Llama 4 Scout Â· Vision', color: '#F97316' },
    { id: 'cohere',   name: 'Cohere',     model: 'Command R+',             color: '#d97706' },
    { id: 'openr',    name: 'OpenRouter', model: 'DeepSeek R1 Free',       color: '#fbbf24' },
    { id: 'samba',    name: 'Sambanova',  model: 'Llama 3.3 70B',          color: '#14b8a6' },
    { id: 'cerebras', name: 'Cerebras',   model: 'Llama 3.1 70B',          color: '#818cf8' },
  ]
  const PLATFORMS = ['YouTube', 'Facebook', 'TikTok', 'Instagram', 'X (Twitter)']

  // Neural canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.3 + .3, alpha: Math.random() * .3 + .1
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0,255,180,${.06 * (1 - d / 130)})`; ctx.lineWidth = .6; ctx.stroke()
          }
        }
      }
      nodes.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,255,180,${p.alpha})`; ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  // File to base64
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleFile = async (file) => {
    if (!file) return
    setVideoFile(file)
    const b64 = await fileToBase64(file)
    setVideoBase64(b64)
  }

  // Fake progress animation
  const animateProgress = (aiId, duration, onDone) => {
    let progress = 0
    const interval = setInterval(() => {
      progress = Math.min(100, progress + (100 / (duration / 50)) + Math.random() * 1.5)
      setLoadingProgress(prev => ({ ...prev, [aiId]: Math.floor(progress) }))
      if (progress >= 100) {
        clearInterval(interval)
        setLoadingStatus(prev => ({ ...prev, [aiId]: 'done' }))
        if (onDone) onDone()
      }
    }, 50)
  }

  const startLoading = async (selectedType) => {
    setType(selectedType)
    setScreen('loading')
    setAllDone(false)
    setResults(null)
    setLoadingStatus({ groq: 'run', cohere: 'wait', openr: 'wait', samba: 'wait', cerebras: 'wait' })
    setLoadingProgress({ groq: 0, cohere: 0, openr: 0, samba: 0, cerebras: 0 })

    // Start Groq animation
    animateProgress('groq', 2400, () => {
      // Start rest parallel
      setLoadingStatus(prev => ({ ...prev, cohere: 'run', openr: 'run', samba: 'run', cerebras: 'run' }))
      let restDone = 0
      ;['cohere', 'openr', 'samba', 'cerebras'].forEach((id, i) => {
        setTimeout(() => {
          animateProgress(id, 1400 + Math.random() * 800, () => {
            restDone++
            if (restDone === 4) setAllDone(true)
          })
        }, i * 300)
      })
    })

    // Real API call
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoBase64, type: selectedType, fileName: videoFile?.name })
      })
      const data = await res.json()
      setResults(data.results)
    } catch (e) {
      console.error(e)
    }
  }

  const togglePlat = (aiId, platName) => {
    const key = `${aiId}-${platName}`
    setOpenPlat(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('âœ… Copied!'))
      .catch(() => alert('Copy failed'))
  }

  const getPlatOutput = (aiId, platName) => {
    if (!results || !results[aiId]) return 'à¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡...'
    if (results[aiId].error) return `Error: ${results[aiId].error}`
    return results[aiId][platName] || 'Output à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿'
  }

  return (
    <>
      <Head>
        <title>Zypt AI â€” Video Script & Prompt Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@200;400;700;900&family=Bebas+Neue&family=Russo+One&family=Orbitron:wght@700;900&family=Noto+Sans+Bengali:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <div className="aurora" />

      <div className="wrap">

        {/* â•â• UPLOAD â•â• */}
        {screen === 'upload' && (
          <div className="screen">
            <div className="header">
              {/* Zypt Logo */}
              <div className="zypt-logo">
                <div className="zypt-hex">
                  <div className="glow-ring" />
                  <div className="scan-line" />
                  <svg className="hex-ring" viewBox="0 0 90 90">
                    <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00ffb4" stopOpacity=".8" /><stop offset="50%" stopColor="#00d4ff" stopOpacity=".3" /><stop offset="100%" stopColor="#00ffb4" stopOpacity=".8" /></linearGradient></defs>
                    <polygon points="45,4 80,23 80,67 45,86 10,67 10,23" fill="none" stroke="url(#hg)" strokeWidth="1.2" strokeDasharray="6 3" />
                  </svg>
                  <svg className="zypt-icon" viewBox="0 0 160 160">
                    <defs>
                      <linearGradient id="zg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00ffb4" /><stop offset="100%" stopColor="#00d4ff" /></linearGradient>
                      <filter id="zglow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    <circle cx="80" cy="80" r="68" fill="rgba(0,255,180,0.03)" stroke="rgba(0,255,180,0.1)" strokeWidth="1" />
                    <path d="M 38 38 L 122 38 L 38 122 L 122 122" fill="none" stroke="url(#zg1)" strokeWidth="11" strokeLinecap="square" filter="url(#zglow)" />
                    <circle cx="80" cy="14" r="4" fill="#00ffb4" filter="url(#zglow)" opacity=".8" />
                    <circle cx="130" cy="44" r="3" fill="#00d4ff" filter="url(#zglow)" opacity=".8" />
                    <circle cx="30" cy="116" r="3" fill="#00ffb4" filter="url(#zglow)" opacity=".8" />
                    <circle cx="80" cy="146" r="4" fill="#00d4ff" filter="url(#zglow)" opacity=".8" />
                  </svg>
                </div>
              </div>

              <div className="brand-row"><span className="brand-name">zypt</span><span className="ai-badge">AI</span></div>
              <div className="brand-tag">Encrypted Â· Intelligent Â· Fast</div>

              <div className="page-title">
                <div className="pt-video">V I D E O</div>
                <div className="pt-script">SCRIPT</div>
                <div className="pt-sep">
                  <div className="pt-sep-line" />
                  <div className="pt-sep-badge">&amp;</div>
                  <div className="pt-sep-line r" />
                </div>
                <div className="pt-prompt">PROMPT</div>
                <div className="pt-gen">G E N E R A T O R</div>
              </div>
              <p className="page-sub">à¦­à¦¿à¦¡à¦¿à¦“ à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§à¦¨ â€” à§«à¦Ÿà¦¿ AI à¦à¦•à¦¸à¦¾à¦¥à§‡ Script à¦“ Prompt à¦¤à§ˆà¦°à¦¿ à¦•à¦°à¦¬à§‡</p>
            </div>

            {/* Powered by */}
            <div className="powered-by">
              <span className="pb-label">Powered by</span>
              <div className="pb-logos">
                {AIS.map(ai => (
                  <div key={ai.id} className="pb-logo" title={ai.name} style={{ border: `1px solid ${ai.color}33` }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: 11, color: ai.color }}>{ai.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            {!videoFile ? (
              <div className="drop" onClick={() => document.getElementById('fileInput').click()}>
                <input id="fileInput" type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
                <div className="drop-inner">
                  <div className="drop-icon-wrap">
                    <svg viewBox="0 0 56 56" fill="none">
                      <defs>
                        <linearGradient id="dg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00ffb4" /><stop offset="100%" stopColor="#00d4ff" /></linearGradient>
                        <filter id="dglow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      <rect x="4" y="10" width="48" height="36" rx="5" stroke="url(#dg1)" strokeWidth="2" fill="rgba(0,255,180,0.04)" filter="url(#dglow)" />
                      <rect x="7" y="15" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <rect x="7" y="24" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <rect x="7" y="33" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <rect x="44" y="15" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <rect x="44" y="24" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <rect x="44" y="33" width="5" height="4" rx="1.5" fill="url(#dg1)" opacity=".6" />
                      <path d="M22 20 L38 28 L22 36 Z" fill="url(#dg1)" filter="url(#dglow)" opacity=".9" />
                      <path d="M4 17 L4 10 L11 10" stroke="url(#dg1)" strokeWidth="2" strokeLinecap="round" fill="none" />
                      <path d="M52 17 L52 10 L45 10" stroke="url(#dg1)" strokeWidth="2" strokeLinecap="round" fill="none" />
                      <path d="M4 39 L4 46 L11 46" stroke="url(#dg1)" strokeWidth="2" strokeLinecap="round" fill="none" />
                      <path d="M52 39 L52 46 L45 46" stroke="url(#dg1)" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div className="drop-title">à¦­à¦¿à¦¡à¦¿à¦“ à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§à¦¨</div>
                  <div className="drop-sub">à¦¡à§à¦°à§à¦¯à¦¾à¦— à¦•à¦°à§à¦¨ à¦…à¦¥à¦¬à¦¾ à¦•à§à¦²à¦¿à¦• à¦•à¦°à§‡ à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨</div>
                  <div className="drop-btn">âš¡ à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à§‡à¦›à§‡ à¦¨à¦¿à¦¨</div>
                  <div className="drop-fmt">MP4 Â· MOV Â· AVI Â· WebM Â· à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à§§à§¦à§¦MB</div>
                </div>
              </div>
            ) : (
              <div className="vcard">
                <div className="vthumb">ðŸŽž<div className="vplay">â–¶</div></div>
                <div className="vinfo">
                  <div className="vname">ðŸŽž <b>{videoFile.name}</b></div>
                  <div className="vchg" onClick={() => { setVideoFile(null); setVideoBase64(null) }}>à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨ à¦•à¦°à§à¦¨</div>
                </div>
              </div>
            )}

            {videoFile && (
              <div className="abtns">
                <div className="abtn bp" onClick={() => startLoading('prompt')}>
                  <span className="bico">ðŸŽ¯</span><span>Prompt à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨</span><span className="bsub">AI Prompt Generator</span>
                </div>
                <div className="abtn bs" onClick={() => startLoading('script')}>
                  <span className="bico">ðŸ“</span><span>Script à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨</span><span className="bsub">AI Script Writer</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* â•â• LOADING â•â• */}
        {screen === 'loading' && (
          <div className="screen lcenter">
            <div className="ltitle">{allDone ? 'à¦¸à¦®à§à¦ªà¦¨à§à¦¨!' : 'AI ARENA à¦šà¦²à¦›à§‡'}</div>
            <div className="lsub">
              {allDone ? 'à¦¸à¦¬ AI à¦¸à¦®à§à¦ªà¦¨à§à¦¨ âœ…' :
                loadingStatus.groq === 'run' ? 'Groq à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦•à¦°à¦›à§‡...' : 'à¦¬à¦¾à¦•à¦¿ à§ªà¦Ÿà¦¿ AI à¦à¦•à¦¸à¦¾à¦¥à§‡ à¦•à¦¾à¦œ à¦•à¦°à¦›à§‡...'}
            </div>

            {/* Active AI showcase */}
            <div className="showcase" style={{ borderColor: AIS.find(a => loadingStatus[a.id] === 'run')?.color + '44' || 'rgba(0,255,180,0.12)' }}>
              <div className="showcase-scan" />
              {(() => {
                const active = AIS.find(a => loadingStatus[a.id] === 'run') || AIS[4]
                return <>
                  <div className="sc-name" style={{ color: active.color }}>{active.name.toUpperCase()}</div>
                  <div className="sc-status">{loadingStatus[active.id] === 'done' ? 'âœ… à¦¸à¦®à§à¦ªà¦¨à§à¦¨' : 'à¦²à¦¿à¦–à¦›à§‡...'}</div>
                  <div className="sc-bar">
                    <div className="sc-fill" style={{ width: `${loadingProgress[active.id] || 0}%`, background: active.color }} />
                  </div>
                </>
              })()}
            </div>

            <div className="mini-list">
              {AIS.map(ai => (
                <div key={ai.id} className={`mini ${loadingStatus[ai.id]}`} style={{ color: ai.color }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 12, width: 24, height: 20, background: ai.color + '22', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ai.name.slice(0, 2).toUpperCase()}
                  </span>
                  {ai.name}
                  {loadingStatus[ai.id] === 'done' && ' âœ…'}
                </div>
              ))}
            </div>

            {allDone && (
              <button className="vrbtn" onClick={() => setScreen('result')}>âœ¨ Result à¦¦à§‡à¦–à§à¦¨</button>
            )}
          </div>
        )}

        {/* â•â• RESULT â•â• */}
        {screen === 'result' && (
          <div className="screen">
            <div className="rhead">
              <div className="reyebrow">âœ¦ Zypt AI à¦¸à¦®à§à¦ªà¦¨à§à¦¨</div>
              <div className="rtitle">RESULTS READY</div>
              <div className="rsub">à§«à¦Ÿà¦¿ AI à¦†à¦²à¦¾à¦¦à¦¾à¦­à¦¾à¦¬à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦•à¦°à§‡à¦›à§‡</div>
              <div className="rtype-badge">{type === 'prompt' ? 'ðŸŽ¯ PROMPT MODE' : 'ðŸ“ SCRIPT MODE'}</div>
            </div>

            <div className="stats">
              <div className="scard"><div className="snum" style={{ color: '#00ffb4' }}>5</div><div className="slbl">AI Models</div></div>
              <div className="scard"><div className="snum" style={{ color: '#00d4ff' }}>5</div><div className="slbl">Platforms</div></div>
              <div className="scard"><div className="snum" style={{ color: '#a78bfa' }}>25</div><div className="slbl">Outputs</div></div>
            </div>

            <div className="tabs-wrap">
              {AIS.map(ai => (
                <button key={ai.id} className={`rtab ${activeAI === ai.id ? 'on' : ''}`}
                  onClick={() => setActiveAI(ai.id)}
                  style={activeAI === ai.id ? { color: ai.color } : {}}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 11, width: 20, height: 20, background: ai.color + '22', borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                    {ai.name.slice(0, 2).toUpperCase()}
                  </span>
                  {ai.name.length > 7 ? ai.name.slice(0, 6) + '..' : ai.name}
                </button>
              ))}
            </div>

            {AIS.filter(ai => ai.id === activeAI).map(ai => (
              <div key={ai.id} className="rcard">
                <div className="rcard-stripe" style={{ background: `linear-gradient(90deg,${ai.color},${ai.color}44)` }} />
                <div className="rcard-body">
                  <div className="rcard-top">
                    <div className="rai">
                      <div className="ravatar" style={{ background: ai.color + '22', border: `1px solid ${ai.color}44` }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: ai.color }}>{ai.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="raname" style={{ color: ai.color }}>{ai.name}</div>
                        <div className="ramodel">{ai.model}</div>
                      </div>
                    </div>
                    <div className="copall" onClick={() => {
                      const all = PLATFORMS.map(p => `[${p}]\n${getPlatOutput(ai.id, p)}`).join('\n\n---\n\n')
                      copyText(all)
                    }}>ðŸ“‹ à¦¸à¦¬ Copy</div>
                  </div>
                  <div className="platrows">
                    {PLATFORMS.map(plat => {
                      const key = `${ai.id}-${plat}`
                      const isOpen = openPlat[key]
                      return (
                        <div key={plat} className="platrow">
                          <div className={`platrow-head ${isOpen ? 'open' : ''}`} onClick={() => togglePlat(ai.id, plat)}>
                            <div className="platname">
                              <div className="platicon">{platIcon(plat)}</div>
                              {plat}
                            </div>
                            <div className={`platarrow ${isOpen ? 'open' : ''}`}>â–¾</div>
                          </div>
                          {isOpen && (
                            <div className="plat-inner">
                              <div className="out-label">{type === 'prompt' ? 'ðŸŽ¯ Prompt' : 'ðŸ“ Script'}</div>
                              <div className="out-text" style={{ borderLeftColor: ai.color }}>
                                {getPlatOutput(ai.id, plat)}
                              </div>
                              <div className="copy-row">
                                <button className="copybtn" onClick={() => copyText(getPlatOutput(ai.id, plat))}>ðŸ“‹ Copy</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}

            <button className="backbtn" onClick={() => { setScreen('upload'); setVideoFile(null); setVideoBase64(null); setResults(null) }}>
              ðŸ”„ à¦¨à¦¤à§à¦¨ à¦­à¦¿à¦¡à¦¿à¦“ à¦†à¦ªà¦²à§‹à¦¡ à¦•à¦°à§à¦¨
            </button>
          </div>
        )}

      </div>

      <style jsx global>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#040408;--text:#eefffa;--muted:rgba(200,255,240,0.38);--green:#00ffb4;--cyan:#00d4ff;--border:rgba(0,255,180,0.1)}
        html,body{background:var(--bg);color:var(--text);font-family:'Exo 2','Noto Sans Bengali',sans-serif;min-height:100vh;overflow-x:hidden}
        .aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .aurora::before{content:'';position:absolute;width:700px;height:400px;background:radial-gradient(ellipse,rgba(0,255,180,0.06) 0%,transparent 70%);top:-100px;left:-150px;animation:auroraMove 12s ease-in-out infinite alternate;border-radius:50%}
        .aurora::after{content:'';position:absolute;width:600px;height:350px;background:radial-gradient(ellipse,rgba(0,212,255,0.05) 0%,transparent 70%);bottom:-80px;right:-100px;animation:auroraMove 15s ease-in-out infinite alternate-reverse;border-radius:50%}
        @keyframes auroraMove{to{transform:translate(60px,40px) scale(1.1)}}
        .wrap{max-width:600px;margin:0 auto;padding:0 16px;position:relative;z-index:1;min-height:100vh}
        .screen{min-height:100vh;padding:28px 0 80px}
        .lcenter{display:flex;flex-direction:column;align-items:center;padding-top:30px}
        .header{text-align:center;margin-bottom:24px}
        /* Logo */
        .zypt-logo{display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px;animation:logoIn 1s cubic-bezier(.22,1,.36,1) both}
        @keyframes logoIn{from{opacity:0;transform:scale(.6) rotate(-15deg)}to{opacity:1;transform:scale(1) rotate(0)}}
        .zypt-hex{position:relative;width:90px;height:90px;display:flex;align-items:center;justify-content:center}
        .hex-ring{position:absolute;inset:0;width:100%;height:100%;animation:spinSlow 12s linear infinite}
        @keyframes spinSlow{to{transform:rotate(360deg)}}
        .glow-ring{position:absolute;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,rgba(0,255,180,0.1) 0%,transparent 70%);animation:gpulse 2.5s ease-in-out infinite}
        @keyframes gpulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.15);opacity:1}}
        .scan-line{position:absolute;width:100%;height:2px;background:linear-gradient(90deg,transparent,rgba(0,255,180,0.7),transparent);top:0;animation:scanAnim 3s ease-in-out 2s infinite;opacity:0}
        @keyframes scanAnim{0%{top:15%;opacity:1}100%{top:85%;opacity:0}}
        .zypt-icon{width:64px;height:64px;position:relative;z-index:2;filter:drop-shadow(0 0 14px rgba(0,255,180,0.5))}
        /* Brand */
        .brand-row{display:flex;align-items:baseline;gap:8px;justify-content:center;margin-bottom:4px;animation:fadeUp .8s ease 1s both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .brand-name{font-size:30px;font-weight:900;letter-spacing:-.04em;background:linear-gradient(135deg,#00ffb4,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ai-badge{font-size:11px;font-weight:200;letter-spacing:.18em;color:rgba(0,255,180,.5);border:1px solid rgba(0,255,180,.25);padding:2px 8px;border-radius:4px}
        .brand-tag{font-size:11px;letter-spacing:.28em;color:rgba(255,255,255,.2);margin-bottom:12px;animation:fadeUp .8s ease 1.1s both}
        /* Title */
        .page-title{text-align:center;margin-bottom:12px}
        .pt-video{font-family:'Orbitron',sans-serif;font-size:clamp(9px,2.5vw,12px);font-weight:700;letter-spacing:.5em;color:rgba(200,255,240,0.35);text-transform:uppercase;opacity:0;animation:fadeUp .5s ease 1.1s forwards;margin-bottom:2px}
        .pt-script{font-family:'Russo One',sans-serif;font-size:clamp(52px,14vw,92px);line-height:.88;font-style:italic;color:var(--text);display:block;opacity:0;transform:translateX(-30px);animation:ptLeft .7s cubic-bezier(.22,1,.36,1) 1.2s forwards;text-shadow:0 0 40px rgba(255,255,255,0.06)}
        .pt-sep{display:flex;align-items:center;gap:10px;justify-content:center;margin:4px 0;opacity:0;animation:fadeUp .4s ease 1.55s forwards}
        .pt-sep-line{flex:1;max-width:50px;height:1px;background:linear-gradient(90deg,transparent,rgba(0,255,180,0.35))}
        .pt-sep-line.r{background:linear-gradient(90deg,rgba(0,255,180,0.35),transparent)}
        .pt-sep-badge{font-family:'Orbitron',sans-serif;font-size:9px;font-weight:700;letter-spacing:.15em;color:var(--green);border:1px solid rgba(0,255,180,0.3);padding:2px 9px;border-radius:100px;background:rgba(0,255,180,0.05);animation:badgePulse 2s ease-in-out 2.5s infinite}
        @keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,180,0)}50%{box-shadow:0 0 0 5px rgba(0,255,180,0.1)}}
        .pt-prompt{font-family:'Russo One',sans-serif;font-size:clamp(52px,14vw,92px);line-height:.88;font-style:italic;background:linear-gradient(120deg,#00ffb4 0%,#00d4ff 55%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block;opacity:0;transform:translateX(30px);animation:ptRight .7s cubic-bezier(.22,1,.36,1) 1.4s forwards,neonPulse 4s ease 3s infinite;filter:drop-shadow(0 0 22px rgba(0,255,180,0.3))}
        .pt-gen{font-family:'Orbitron',sans-serif;font-size:clamp(9px,2.5vw,12px);font-weight:700;letter-spacing:.45em;color:rgba(200,255,240,0.3);text-transform:uppercase;opacity:0;animation:fadeUp .5s ease 1.8s forwards;margin-top:5px}
        @keyframes ptLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ptRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes neonPulse{0%,100%{filter:drop-shadow(0 0 22px rgba(0,255,180,0.3))}50%{filter:drop-shadow(0 0 38px rgba(0,255,180,0.55))}}
        /* Sub */
        .page-sub{font-size:13px;color:var(--muted);line-height:1.65;font-family:'Noto Sans Bengali','Exo 2',sans-serif;animation:fadeUp .7s ease 1.3s both}
        /* Powered by */
        .powered-by{display:flex;align-items:center;justify-content:center;gap:10px;margin:16px 0;flex-wrap:wrap;animation:fadeUp .7s ease 1.4s both}
        .pb-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
        .pb-logos{display:flex;gap:7px}
        .pb-logo{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);transition:all .2s;cursor:default}
        .pb-logo:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,255,180,0.15)}
        /* Drop */
        .drop{border:1.5px solid rgba(0,255,180,0.2);border-radius:24px;background:linear-gradient(135deg,rgba(0,255,180,0.02),rgba(0,212,255,0.02));padding:40px 20px;text-align:center;cursor:pointer;transition:all .3s;margin-bottom:14px;position:relative;overflow:hidden;backdrop-filter:blur(10px);animation:fadeUp .7s ease 1.5s both}
        .drop:hover{transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,255,180,0.08);border-color:rgba(0,255,180,0.4)}
        .drop-inner{position:relative;z-index:1}
        .drop-icon-wrap{width:80px;height:80px;border-radius:22px;margin:0 auto 16px;background:linear-gradient(135deg,rgba(0,255,180,0.1),rgba(0,212,255,0.1));border:1px solid rgba(0,255,180,0.2);display:flex;align-items:center;justify-content:center;animation:iconFloat 3s ease-in-out infinite}
        @keyframes iconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .drop-icon-wrap svg{width:40px;height:40px}
        .drop-title{font-size:17px;font-weight:700;margin-bottom:6px}
        .drop-sub{color:var(--muted);font-size:13px;margin-bottom:18px;font-family:'Noto Sans Bengali','Exo 2',sans-serif}
        .drop-btn{display:inline-block;background:linear-gradient(135deg,rgba(0,255,180,0.1),rgba(0,212,255,0.1));border:1px solid rgba(0,255,180,0.3);color:var(--green);padding:10px 24px;border-radius:100px;font-size:13px;font-weight:700;letter-spacing:.04em}
        .drop-fmt{margin-top:14px;font-size:11px;color:var(--muted);letter-spacing:.05em}
        /* Video card */
        .vcard{border-radius:20px;overflow:hidden;background:rgba(10,15,25,0.9);border:1px solid var(--border);margin-bottom:14px;backdrop-filter:blur(10px)}
        .vthumb{height:175px;background:linear-gradient(135deg,#04040f,#0a0820);display:flex;align-items:center;justify-content:center;font-size:44px;position:relative}
        .vplay{position:absolute;width:52px;height:52px;border-radius:50%;background:rgba(0,255,180,0.12);border:2px solid rgba(0,255,180,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--green)}
        .vinfo{display:flex;align-items:center;justify-content:space-between;padding:12px 16px}
        .vname{font-size:12px;color:var(--muted)}
        .vname b{color:var(--text);font-weight:600}
        .vchg{font-size:11px;color:var(--green);background:rgba(0,255,180,0.08);border:1px solid rgba(0,255,180,0.2);padding:5px 13px;border-radius:100px;cursor:pointer}
        /* Action btns */
        .abtns{display:grid;grid-template-columns:1fr 1fr;gap:10px;animation:fadeUp .5s ease both}
        .abtn{padding:20px 14px;border-radius:20px;border:none;cursor:pointer;font-family:'Exo 2',sans-serif;font-size:14px;font-weight:700;transition:all .35s;text-align:center;backdrop-filter:blur(10px)}
        .abtn:hover{transform:translateY(-4px)}
        .bp{background:linear-gradient(135deg,rgba(0,255,180,0.08),rgba(0,212,255,0.06));border:1px solid rgba(0,255,180,0.22);color:var(--green)}
        .bp:hover{box-shadow:0 16px 42px rgba(0,255,180,0.15)}
        .bs{background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(0,212,255,0.06));border:1px solid rgba(124,58,237,0.22);color:#a78bfa}
        .bs:hover{box-shadow:0 16px 42px rgba(124,58,237,0.15)}
        .bico{font-size:28px;margin-bottom:8px;display:block}
        .bsub{font-size:11px;opacity:.5;font-weight:400;display:block;margin-top:3px}
        /* Loading */
        .ltitle{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.1em;margin-bottom:5px;background:linear-gradient(135deg,var(--green),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lsub{font-size:13px;color:var(--muted);margin-bottom:22px;font-family:'Noto Sans Bengali','Exo 2',sans-serif;text-align:center}
        .showcase{width:100%;background:rgba(10,15,25,0.9);border-radius:24px;padding:24px 20px;border:1px solid rgba(0,255,180,0.12);margin-bottom:16px;display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden;backdrop-filter:blur(12px);transition:border-color .4s}
        .showcase-scan{position:absolute;width:100%;height:2px;background:linear-gradient(90deg,transparent,rgba(0,255,180,0.5),transparent);top:0;animation:scanAnim 3s ease-in-out infinite;opacity:0}
        .sc-name{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.1em;margin-bottom:4px}
        .sc-status{font-size:13px;color:var(--muted);margin-bottom:14px;font-family:'Noto Sans Bengali'}
        .sc-bar{width:100%;height:4px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden}
        .sc-fill{height:100%;border-radius:100px;transition:width .3s ease,background .4s}
        .mini-list{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-bottom:24px}
        .mini{display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(10,15,25,0.8);border:1px solid rgba(255,255,255,0.06);border-radius:100px;font-size:11px;font-weight:600;transition:all .3s}
        .mini.run{border-color:currentColor;box-shadow:0 0 14px -4px currentColor}
        .mini.done{opacity:.45}
        .vrbtn{width:100%;padding:16px;border-radius:16px;border:none;background:linear-gradient(135deg,var(--green),var(--cyan));color:#030a08;font-family:'Exo 2',sans-serif;font-size:15px;font-weight:900;cursor:pointer;transition:all .3s;box-shadow:0 8px 30px rgba(0,255,180,0.25);letter-spacing:.04em;animation:popin .5s ease}
        @keyframes popin{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
        .vrbtn:hover{transform:translateY(-2px);box-shadow:0 14px 42px rgba(0,255,180,0.38)}
        /* Result */
        .rhead{margin-bottom:16px}
        .reyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--green);margin-bottom:6px;display:flex;align-items:center;gap:8px}
        .reyebrow::before{content:'';width:18px;height:1px;background:var(--green)}
        .rtitle{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.04em;margin-bottom:4px}
        .rsub{font-size:13px;color:var(--muted);font-family:'Noto Sans Bengali','Exo 2',sans-serif}
        .rtype-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(0,255,180,0.08);border:1px solid rgba(0,255,180,0.2);border-radius:100px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--green);margin-top:8px;letter-spacing:.04em}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
        .scard{background:rgba(10,15,25,0.85);border:1px solid rgba(0,255,180,0.08);border-radius:14px;padding:14px 10px;text-align:center;backdrop-filter:blur(10px)}
        .snum{font-family:'Bebas Neue',sans-serif;font-size:30px;line-height:1;margin-bottom:3px}
        .slbl{font-size:10px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
        .tabs-wrap{background:rgba(10,15,25,0.85);border:1px solid rgba(0,255,180,0.08);border-radius:16px;padding:5px;margin-bottom:16px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;backdrop-filter:blur(10px)}
        .tabs-wrap::-webkit-scrollbar{display:none}
        .rtab{display:flex;align-items:center;gap:6px;padding:9px 10px;border-radius:11px;border:none;background:transparent;font-size:11px;font-weight:700;cursor:pointer;transition:all .22s;white-space:nowrap;flex-shrink:0;color:var(--muted);font-family:'Exo 2',sans-serif;flex:1;justify-content:center}
        .rtab.on{background:rgba(0,255,180,0.07);color:var(--text)}
        .rcard{border-radius:22px;overflow:hidden;animation:su .4s ease;margin-bottom:12px}
        @keyframes su{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .rcard-stripe{height:4px}
        .rcard-body{background:rgba(10,15,25,0.9);border:1px solid rgba(255,255,255,0.06);border-top:none;border-radius:0 0 22px 22px;backdrop-filter:blur(12px)}
        .rcard-top{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between}
        .rai{display:flex;align-items:center;gap:12px}
        .ravatar{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .raname{font-size:15px;font-weight:800}
        .ramodel{font-size:11px;color:var(--muted);margin-top:2px}
        .copall{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);padding:7px 12px;border-radius:100px;cursor:pointer;transition:all .2s}
        .copall:hover{color:var(--green)}
        .platrows{padding:4px 0}
        .platrow{border-bottom:1px solid rgba(255,255,255,0.03);overflow:hidden}
        .platrow:last-child{border-bottom:none}
        .platrow-head{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;cursor:pointer;transition:background .15s}
        .platrow-head:hover,.platrow-head.open{background:rgba(0,255,180,0.02)}
        .platname{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700}
        .platicon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .platicon svg{width:24px;height:24px}
        .platarrow{font-size:12px;color:var(--muted);transition:transform .25s}
        .platarrow.open{transform:rotate(180deg)}
        .plat-inner{padding:4px 18px 14px}
        .out-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:7px;margin-top:12px}
        .out-text{background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;font-size:13px;line-height:1.8;color:rgba(238,255,250,.85);font-family:'Noto Sans Bengali','Exo 2',sans-serif;border-left:3px solid;margin-bottom:8px;white-space:pre-wrap}
        .copy-row{display:flex;justify-content:flex-end}
        .copybtn{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:6px 14px;border-radius:100px;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:var(--muted);transition:all .2s;font-family:'Exo 2',sans-serif}
        .copybtn:hover{border-color:rgba(0,255,180,0.3);color:var(--green)}
        .backbtn{display:flex;align-items:center;justify-content:center;gap:8px;background:transparent;border:1px solid rgba(255,255,255,0.07);color:var(--muted);padding:14px;border-radius:14px;font-size:13px;cursor:pointer;transition:all .2s;margin-top:6px;width:100%;font-family:'Exo 2',sans-serif}
        .backbtn:hover{border-color:rgba(0,255,180,0.25);color:var(--green)}
      `}</style>
    </>
  )
}

// Platform icons
function platIcon(name) {
  const icons = {
    YouTube: <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#FF0000"/><path d="M19.6 8.2s-.2-1.3-.8-1.9c-.7-.8-1.6-.8-2-.8C14.6 5.4 12 5.4 12 5.4s-2.6 0-4.8.1c-.4 0-1.3.1-2 .8-.6.6-.8 1.9-.8 1.9S4.2 9.6 4.2 11v1.3c0 1.4.2 2.8.2 2.8s.2 1.3.8 1.9c.7.8 1.7.7 2.1.8 1.5.1 6.7.2 6.7.2s2.6 0 4.8-.2c.4 0 1.3-.1 2-.8.6-.6.8-1.9.8-1.9s.2-1.4.2-2.8V11c0-1.4-.2-2.8-.2-2.8zM10.2 14V9.7l5.4 2.2-5.4 2.1z" fill="white"/></svg>,
    Facebook: <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M16.5 12H14v8h-3v-8h-2V9h2V7.5C11 5.6 12.1 4 14.5 4H17v3h-1.5c-.6 0-.5.3-.5.7V9h2.5l-.5 3z" fill="white"/></svg>,
    TikTok: <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#000"/><path d="M16.5 6.5c-.9-.7-1.5-1.7-1.5-2.8h-2.3v11.1c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.2 0 .4 0 .6.1V10.5c-.2 0-.4-.1-.6-.1-2.4 0-4.3 1.9-4.3 4.3S8.3 19 10.7 19s4.3-1.9 4.3-4.3V8.8c.9.6 2 .9 3.2.9V7.5c-.6 0-1.2-.4-1.7-1z" fill="white"/></svg>,
    Instagram: <svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="igr" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><rect width="24" height="24" rx="6" fill="url(#igr)"/><rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="16.2" cy="7.8" r="1" fill="white"/></svg>,
    'X (Twitter)': <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#000"/><path d="M17.5 5h-2.3l-3.4 4.5L8.5 5H4l5.8 7.7L4 19h2.3l3.7-4.9 3.5 4.9H18l-6.1-8.1L17.5 5z" fill="white"/></svg>,
  }
  return icons[name] || name
}
