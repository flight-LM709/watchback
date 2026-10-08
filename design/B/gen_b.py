# Generates the Direction B HTML sources (Paper Mixtape).
HEAD='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="style.css"><style>{css}</style></head><body><div class="screen">'
TAIL='</div></body></html>'
CASS='<svg width="24" height="16" viewBox="0 0 22 15"><rect x="1" y="1" width="20" height="13" rx="2" fill="#1F1B16"/><rect x="4" y="3.5" width="14" height="5" rx="2.5" fill="#F3EBDD"/><circle cx="7.5" cy="6" r="1.5" fill="#1F1B16"/><circle cx="14.5" cy="6" r="1.5" fill="#1F1B16"/><path d="M6 14l1.5-3h7L16 14" fill="#B33A24"/></svg>'
def prog(n):
    return '<div class="progress">'+''.join('<span class="on"></span>' if i<n else ('<span class="half"></span>' if i==n else '<span></span>') for i in range(10))+'</div>'
TOP='<div class="topbar"><div class="brand">'+CASS+'Watchback</div><span class="close">✕</span></div>'
PERIOD='<div class="period">Oct 2025 – Oct 2026 <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#1F1B16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg></div>'
def underline(color='#B33A24',w=3.5):
    return f'<svg viewBox="0 0 200 14" preserveAspectRatio="none" style="display:block;width:100%;height:12px"><path d="M3 9 C 40 3, 80 13, 120 6 S 178 4, 197 9" stroke="{color}" stroke-width="{w}" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'
CIRCLE='<svg viewBox="0 0 200 100" preserveAspectRatio="none" style="position:absolute;inset:-14px -18px -10px -16px;width:calc(100% + 34px);height:calc(100% + 24px)"><path d="M150 10 C 104 0, 36 4, 12 32 C -6 56, 22 92, 96 94 C 166 96, 198 72, 193 44 C 188 18, 146 6, 96 8 C 70 9, 52 13, 40 19" stroke="#B33A24" stroke-width="3" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'
STAR='<svg width="{s}" height="{s}" viewBox="0 0 40 40"><path d="M20 2 L24 15 L38 16 L27 24 L31 38 L20 30 L9 38 L13 24 L2 16 L16 15 Z" fill="{c}" stroke="#1F1B16" stroke-width="2" stroke-linejoin="round"/></svg>'
SPARK='<svg width="{s}" height="{s}" viewBox="0 0 30 30"><path d="M15 2 C16 11 19 14 28 15 C19 16 16 19 15 28 C14 19 11 16 2 15 C11 14 14 11 15 2Z" fill="{c}"/></svg>'

pages={}

# 01 upload
pages['01-upload']=HEAD.format(css='''
.hero{padding-top:62px}
.logo{display:flex;align-items:flex-end;gap:10px}
.logo h2{font-size:44px;font-weight:800;font-style:italic;letter-spacing:-.03em;line-height:1}
.logo .wn{font-family:var(--mono);font-size:10.5px;color:var(--ink2);margin-bottom:6px}
.ul{width:200px;margin-top:2px}
.sub{font-size:16px;line-height:1.4;margin-top:10px;color:var(--ink)}
.sub i{color:var(--teal);font-weight:600}
.jcard{margin-top:22px;padding:12px 14px 6px;transform:rotate(-.6deg)}
.jh{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid var(--ink);padding-bottom:7px}
.jh span:last-child{color:var(--tomato)}
.tr{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(31,27,22,.35)}
.tr:last-child{border:0}
.tr .n{font-family:var(--mono);font-weight:700;font-size:13px;color:var(--tomato);padding-top:2px}
.tr b{display:block;font-size:15.5px;font-weight:600;line-height:1.25}
.tr small{display:block;font-size:13px;color:var(--ink2);font-style:italic;margin-top:1px}
.cass{position:relative;margin-top:26px;height:214px;border-radius:16px;background:var(--teal);border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:12px}
.cass .lab{height:136px;border-radius:8px;background:var(--paper2);border:2px dashed var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 16px;background-image:repeating-linear-gradient(transparent 0 23px,rgba(30,107,102,.16) 23px 24px)}
.cass .lab h1{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.05;text-wrap:balance}
.cass .lab small{font-size:15px;font-style:italic;margin-top:6px;color:var(--ink)}
.cass .lab small u{text-decoration-color:var(--tomato);text-decoration-thickness:2px;text-underline-offset:3px}
.win{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);width:170px;height:44px;border-radius:22px;background:#123F3C;border:2px solid var(--ink);display:flex;align-items:center;justify-content:space-between;padding:0 10px}
.reel{width:30px;height:30px;border-radius:50%;background:var(--paper2);border:2px solid var(--ink);display:grid;place-items:center}
.reel i{width:10px;height:10px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 3px var(--paper2),0 0 0 4.5px var(--ink)}
.win .band{flex:1;height:14px;margin:0 6px;background:#3B2A1E;border-radius:7px}
.screw{position:absolute;width:8px;height:8px;border-radius:50%;background:#123F3C;border:1.5px solid var(--ink);bottom:12px}
.arrow{position:absolute;right:14px;bottom:20px;font-family:var(--mono);font-size:10px;font-weight:700;color:#fff;letter-spacing:.06em}
.badge{display:inline-flex;align-items:center;gap:8px;margin:26px 0 0 4px;background:var(--tomato);color:#fff;font-size:15px;font-weight:600;padding:9px 16px;border:2px solid var(--ink);border-radius:99px;transform:rotate(-2deg);box-shadow:3px 3px 0 var(--ink)}
.disclaimer{position:absolute;bottom:18px;left:0;right:0}
''')+f'''
<span class="example tr">Example data</span>
<div class="hero">
<div class="logo"><h2>Watchback</h2><span class="wn">(working name)</span></div>
<div class="ul">{underline()}</div>
<p class="sub">Your year on <i>YouTube + YouTube Music</i>, played back like an old mixtape. Built from your Google Takeout file.</p>
<div class="sticker jcard">
<div class="jh"><span>Get your Takeout file</span><span>Side A · 3 tracks</span></div>
<div class="tr"><span class="n">01</span><div><b>Open takeout.google.com</b><small>Sign in with the account you watch on.</small></div></div>
<div class="tr"><span class="n">02</span><div><b>Pick “YouTube and YouTube Music”</b><small>Deselect everything else, export as .zip.</small></div></div>
<div class="tr"><span class="n">03</span><div><b>Download the .zip from the email</b><small>Usually arrives within a few minutes.</small></div></div>
</div>
<div class="cass">
<div class="lab"><h1>Drop your Takeout .zip here</h1><small>or <u>tap to choose a file</u></small></div>
<span class="screw" style="left:14px"></span><span class="screw" style="right:14px;display:none"></span>
<div class="win"><div class="reel"><i></i></div><div class="band"></div><div class="reel"><i></i></div></div>
<span class="arrow">.ZIP ▲</span>
</div>
<div class="badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Your file never leaves your device</div>
</div>
<div class="disclaimer">Not affiliated with YouTube or Google.</div>
'''+TAIL

# 02 big number
pages['02-big-number']=HEAD.format(css='''
.wrap{position:absolute;top:150px;left:24px;right:24px}
.lead{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
.lead em{font-style:italic;color:var(--tomato);position:relative;display:inline-block}
.lead em .u{position:absolute;left:-2px;right:-2px;bottom:-8px}
.vhs{margin:30px -8px 0;padding:0 0 14px;transform:rotate(-2deg)}
.stripes{display:flex;height:16px;border-bottom:2px solid var(--ink)}
.stripes i{flex:1}
.vmeta{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;font-weight:700;padding:8px 12px 0;letter-spacing:.06em}
.big{font-family:var(--mono);font-weight:700;font-size:100px;letter-spacing:-.075em;line-height:1;text-align:center;margin-top:6px;white-space:nowrap}
.vfoot{display:flex;justify-content:space-between;align-items:center;padding:4px 14px 0;font-family:var(--mono);font-size:10.5px;color:var(--ink2)}
.unit{font-size:32px;font-style:italic;font-weight:600;margin-top:22px;text-align:right;padding-right:6px}
.per{display:inline-block;margin-top:40px;background:var(--mustard);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:12px 18px;font-size:22px;font-weight:600;transform:rotate(1.5deg);border-radius:4px}
.per b{font-family:var(--mono);font-weight:700}
.hint{position:absolute;bottom:44px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:11px;color:var(--ink2);letter-spacing:.1em;text-transform:uppercase}
''')+prog(1)+TOP+PERIOD+f'''
<div class="doodle" style="right:26px;top:146px">{STAR.format(s=44,c="#E2A72E")}</div>
<div class="doodle" style="left:30px;bottom:150px">{SPARK.format(s=30,c="#1E6B66")}</div>
<div class="doodle" style="right:60px;bottom:200px">{SPARK.format(s=18,c="#B33A24")}</div>
<div class="wrap">
<div class="lead">You pressed <em>play<span class="u">{underline()}</span></em> on</div>
<div class="sticker vhs">
<span class="tape" style="left:-14px;top:-12px;transform:rotate(-24deg)"></span><span class="tape c" style="right:-18px;top:-10px;transform:rotate(28deg)"></span>
<div class="stripes"><i style="background:#B33A24"></i><i style="background:#E2A72E"></i><i style="background:#1E6B66"></i><i style="background:#1F1B16"></i></div>
<div class="vmeta"><span>VHS · T-120</span><span style="color:var(--tomato)">● REC</span></div>
<div class="big">12<span class="cm">,</span>480</div>
<div class="vfoot"><span>TAPE 01 / VIDEOS</span><span>SP</span></div>
</div>
<div class="unit">videos</div>
<div class="per">That’s about <b>34</b> a day</div>
</div>
<div class="hint">Tap to continue →</div>
<span class="example bl">Example data</span>
'''+TAIL

# 03 top creator
rows=[('02','Sample Channel B','812'),('03','Creator Name C','655'),('04','Sample Channel D','540'),('05','Creator Name E','498')]
pages['03-top-creator']=HEAD.format(css='''
.wrap{padding-top:112px;text-align:center}
.h{font-size:28px;font-weight:600;letter-spacing:-.02em}
.h em{font-style:italic}
.avw{position:relative;width:146px;height:146px;margin:22px auto 0}
.av{width:146px;height:146px;border-radius:50%;background:var(--teal);border:2.5px solid var(--ink);overflow:hidden;position:relative;display:flex;align-items:flex-end;justify-content:center}
.ring{position:absolute;inset:-12px;width:170px;height:170px}
.stamp{position:absolute;right:-26px;top:-8px;transform:rotate(12deg)}
.stamp span{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-weight:700;font-size:15px;padding-top:4px}
.name{font-size:32px;font-weight:700;letter-spacing:-.02em;margin-top:14px}
.count{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-top:2px}
.count b{font-family:var(--mono);font-size:68px;font-weight:700;letter-spacing:-.07em;color:var(--tomato);line-height:1}
.line{font-size:18px;font-style:italic;margin-top:2px}
.list{margin-top:18px;text-align:left;padding:10px 14px 4px;transform:rotate(.6deg)}
.lh{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.08em;border-bottom:1.5px solid var(--ink);padding-bottom:6px}
.row{display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(31,27,22,.35);font-size:16px;font-weight:600}
.row:last-child{border:0}
.row .n{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--tomato)}
.row .dots{flex:1;border-bottom:2px dotted rgba(31,27,22,.35);transform:translateY(-4px)}
.row .v{font-family:var(--mono);font-size:14px;font-weight:700}
''')+prog(3)+TOP+PERIOD+f'''
<div class="wrap">
<div class="h">Your #1 creator <em>was</em></div>
<div class="avw">
<div class="av"><svg width="104" height="112" viewBox="0 0 120 130"><circle cx="60" cy="46" r="28" fill="#F3EBDD" opacity=".85"/><path d="M8 132c4-34 26-52 52-52s48 18 52 52z" fill="#F3EBDD" opacity=".85"/></svg></div>
<svg class="ring" viewBox="0 0 170 170"><path d="M120 14 C 70 -2, 12 22, 10 84 C 8 140, 60 164, 100 158 C 150 150, 166 104, 160 70 C 154 34, 120 12, 82 12 C 66 12, 54 16, 44 22" stroke="#B33A24" stroke-width="3" fill="none" stroke-linecap="round"/></svg>
<div class="stamp">{STAR.format(s=64,c="#E2A72E")}<span>#1</span></div>
</div>
<div class="name">Creator Name A</div>
<div class="count"><b>1<span class="cm">,</span>204</b></div>
<div class="line">videos. That’s loyalty.</div>
<div class="sticker list">
<div class="lh"><span>B-SIDE · RUNNERS-UP</span><span>VIDEOS</span></div>
{''.join(f'<div class="row"><span class="n">{n}</span><span>{t}</span><span class="dots"></span><span class="v">{v}</span></div>' for n,t,v in rows)}
</div>
</div>
<span class="example bl">Example data</span>
'''+TAIL

# 04 prime time
pages['04-prime-time']=HEAD.format(css='''
.wrap{padding-top:112px}
h1{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
h1 .hero{display:block;font-size:54px;font-weight:800;letter-spacing:-.035em;line-height:1.02;margin-top:4px}
h1 .pm{position:relative;display:inline-block;color:var(--tomato);font-style:italic;padding:0 4px}
.sub{font-size:17px;font-style:italic;margin-top:14px}
.paper{margin-top:22px;padding:14px 12px 12px;background-color:#FFFDF7;background-image:linear-gradient(rgba(30,107,102,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(30,107,102,.09) 1px,transparent 1px);background-size:12px 12px;transform:rotate(-.8deg)}
.ph{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.04em;margin-bottom:10px}
.hm{display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;align-items:center}
.hm .d{font-family:var(--mono);font-size:10.5px;font-weight:700}
.hm .c{height:16px;border-radius:2px}
.hm .c.peak{outline:2.5px solid var(--ink);outline-offset:1.5px;position:relative;z-index:2}
.ax{display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;margin-top:6px;font-family:var(--mono);font-size:9.5px;color:var(--ink2);font-weight:700}
.ax span{white-space:nowrap}
.legend{display:flex;align-items:center;gap:5px;justify-content:space-between;margin-top:10px;font-family:var(--mono);font-size:10px;color:var(--ink2)}
.legend .sw{display:flex;gap:4px;align-items:center}
.legend i{width:13px;height:10px;border-radius:2px;display:inline-block}
.note{position:absolute;right:16px;top:-30px;font-style:italic;font-weight:600;font-size:15px;color:var(--tomato);display:flex;align-items:flex-end;gap:2px}
.stats{display:flex;gap:12px;margin-top:20px}
.st{flex:1;padding:10px 12px}
.st small{display:block;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.st b{display:block;font-family:var(--mono);font-size:24px;font-weight:700;margin-top:2px;letter-spacing:-.04em}
.st em{display:block;font-size:13px;color:var(--ink2)}
''')+prog(6)+TOP+PERIOD+f'''
<div class="doodle" style="right:20px;top:120px">{SPARK.format(s=34,c="#E2A72E")}</div>
<div class="wrap">
<h1>Prime time:<span class="hero">Sundays at <span class="pm">10 PM{CIRCLE}</span></span></h1>
<p class="sub">That’s when you hit play the most.</p>
<div class="sticker paper">
<span class="tape" style="left:-16px;top:-10px;transform:rotate(-28deg)"></span>
<div class="ph"><span>VIDEOS STARTED · DAY × HOUR (WIB)</span></div>
<div style="position:relative">
<div class="note">peak! <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#B33A24" stroke-width="2" stroke-linecap="round"><path d="M2 4 C 12 4, 18 10, 19 22"/><path d="M14 18 L19 23 L23 17"/></svg></div>
<div class="hm" id="hm"></div>
</div>
<div class="ax"><span></span><span style="grid-column:span 6">12 AM</span><span style="grid-column:span 6">6 AM</span><span style="grid-column:span 6">12 PM</span><span style="grid-column:span 6">6 PM</span></div>
<div class="legend"><span>← hour of day →</span><span class="sw">fewer <i style="background:#EDE3CF"></i><i style="background:#E8C77A"></i><i style="background:#E2A72E"></i><i style="background:#D9733A"></i><i style="background:#B33A24"></i> more</span></div>
</div>
<div class="stats"><div class="sticker st"><small>Peak slot</small><b>214</b><em>videos started</em></div><div class="sticker st" style="background:#E2A72E"><small>Night owl</small><b>38%</b><em style="color:var(--ink)">after 10 PM</em></div></div>
</div>
<span class="example bl">Example data</span>
<script>
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const pal=['#EDE3CF','#EBD8AE','#E8C77A','#E5B653','#E2A72E','#DD8D34','#D9733A','#D05B32','#B33A24'];
let seed=7;const rnd=()=>{{seed=(seed*16807)%2147483647;return seed/2147483647}};
const hm=document.getElementById('hm');
days.forEach((d,di)=>{{const l=document.createElement('div');l.className='d';l.textContent=d;hm.appendChild(l);
for(let h=0;h<24;h++){{let base=[.3,.15,.05,0,0,0,0,.05,.15,.2,.25,.3,.4,.35,.3,.3,.35,.45,.55,.65,.75,.8,.85,.6][h];
if(di>=5)base=Math.min(1,base*1.25+(h>8&&h<14?.2:0));let v=base*.85+rnd()*.25;const pk=di===6&&h===22;
const idx=Math.max(0,Math.min(7,Math.round(v*7)));const c=document.createElement('div');c.className='c'+(pk?' peak':'');c.style.background=pk?'#1F1B16':pal[idx];hm.appendChild(c);}}}});
</script>
'''+TAIL

# 05 share card
cre=[('01','Creator Name A','1,204'),('02','Sample Channel B','812'),('03','Creator Name C','655'),('04','Sample Channel D','540'),('05','Creator Name E','498')]
pages['05-share-card']=HEAD.format(css='''
.card{position:absolute;top:44px;left:24px;width:342px;height:608px;background:var(--paper2);border:2px solid var(--ink);box-shadow:5px 5px 0 var(--ink);overflow:hidden;
background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .27  0 0 0 0 .18  0 0 0 .1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.band{display:flex;height:12px;border-bottom:2px solid var(--ink)}
.band i{flex:1}
.in{padding:14px 18px 0}
.head{display:flex;justify-content:space-between;align-items:center}
.brand{font-size:18px}
.rec{font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--tomato);border:2px solid var(--tomato);padding:2px 7px;transform:rotate(4deg)}
.hl{font-size:28px;font-weight:700;letter-spacing:-.025em;line-height:1.05;margin-top:10px;text-wrap:balance}
.hl em{color:var(--tomato)}
.per{font-family:var(--mono);font-size:10.5px;color:var(--ink2);margin-top:5px}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.n{border:2px solid var(--ink);padding:9px 10px 8px;background:#fff}
.n.w{background:var(--mustard)}
.n small{display:block;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.n b{display:block;font-family:var(--mono);font-size:27px;font-weight:700;letter-spacing:-.06em;line-height:1.1;margin-top:3px;white-space:nowrap}
.n .u{font-size:13px;font-style:italic;display:flex;align-items:center;gap:6px;margin-top:1px}
.n .est{border-color:var(--ink);color:var(--ink);background:var(--paper2)}
.sec{display:flex;justify-content:space-between;margin-top:12px;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;border-bottom:1.5px solid var(--ink);padding-bottom:4px}
.row{display:flex;align-items:baseline;gap:9px;padding:5px 0;border-bottom:1px dashed rgba(31,27,22,.35);font-size:15px;font-weight:600}
.row:last-child{border:0}
.row .k{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--tomato)}
.row .dots{flex:1;border-bottom:2px dotted rgba(31,27,22,.3);transform:translateY(-4px)}
.row .v{font-family:var(--mono);font-size:12.5px;font-weight:700}
.song{display:flex;align-items:center;gap:10px;margin-top:8px;background:var(--teal);color:#fff;border:2px solid var(--ink);border-radius:10px;padding:8px 10px}
.mini{flex:none;width:52px;height:34px;border-radius:5px;background:var(--paper2);border:2px solid var(--ink);display:flex;align-items:center;justify-content:space-around;padding:0 5px}
.mini i{width:12px;height:12px;border-radius:50%;border:2.5px solid var(--ink)}
.song b{display:block;font-size:16px;font-weight:700;line-height:1.15}
.song small{display:block;font-size:13px;font-style:italic}
.song em{margin-left:auto;font-family:var(--mono);font-style:normal;font-size:11px;text-align:right;line-height:1.25}
.foot{position:absolute;left:0;right:0;bottom:0;padding:8px 18px 9px;border-top:2px solid var(--ink);display:flex;flex-wrap:wrap;justify-content:space-between;row-gap:3px;font-family:var(--mono);font-size:10.5px;font-weight:700;background:var(--paper)}
.foot .disclaimer{width:100%;text-align:left;font-weight:400;font-size:9.5px}
.btns{position:absolute;left:24px;right:24px;bottom:56px;display:flex;gap:12px}
.btn{flex:1;height:52px;border-radius:99px;display:grid;place-items:center;font-weight:700;font-size:17px;border:2px solid var(--ink)}
.btn.p{background:var(--ink);color:var(--paper2)}
.btn.s{background:var(--paper2);box-shadow:3px 3px 0 var(--ink)}
''')+prog(10)+f'''
<div class="card">
<div class="band"><i style="background:#B33A24"></i><i style="background:#E2A72E"></i><i style="background:#1E6B66"></i><i style="background:#1F1B16"></i></div>
<div class="in">
<div class="head"><div class="brand">{CASS}Watchback</div><span class="rec">RECAP</span></div>
<div class="hl">That was your <em>last 12 months</em></div>
<div class="per">Oct 2025 – Oct 2026 · YouTube + YouTube Music</div>
<div class="nums">
<div class="n"><small>Videos</small><b>12<span class="cm">,</span>480</b><div class="u">≈ 34 a day</div></div>
<div class="n w"><small>Watch time</small><b>≈ 1<span class="cm">,</span>920</b><div class="u">hours <span class="est">estimate</span></div></div>
</div>
<div class="sec"><span>TOP CREATORS</span><span>VIDEOS</span></div>
{''.join(f'<div class="row"><span class="k">{k}</span><span>{t}</span><span class="dots"></span><span class="v">{v}</span></div>' for k,t,v in cre)}
<div class="sec"><span>TOP SONG</span></div>
<div class="song"><div class="mini"><i></i><i></i></div><div><b>Song Title Example</b><small>Artist Name A</small></div><em>318<br>plays</em></div>
</div>
<div class="foot"><span>watchback.example.app</span><span>EXAMPLE DATA</span><span class="disclaimer">Not affiliated with YouTube or Google.</span></div>
</div>
<div class="btns"><div class="btn s">Save image</div><div class="btn p">Share</div></div>
<span class="example br">Example data</span>
'''+TAIL

for k,v in pages.items():
    open(k+'.html','w').write(v)
print('wrote',len(pages))
