# Generates the Direction B (Paper Mixtape) mockup HTML and the reusable SVG assets.
# Run from design/B:  python3 gen_b.py && cd .. && node render.js B
# Copy comes from src/copy/en.ts (branch copy/en). Data is fake example data.
import json, os

# ---------------------------------------------------------------- assets
INK, PAPER, PAPER2, TOMATO, MUSTARD, TEAL = '#1F1B16', '#F3EBDD', '#FBF6EC', '#B33A24', '#E2A72E', '#1E6B66'
ASSETS = {
 'hand-circle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="none" fill="none"><path d="M150 10 C 104 0, 36 4, 12 32 C -6 56, 22 92, 96 94 C 166 96, 198 72, 193 44 C 188 18, 146 6, 96 8 C 70 9, 52 13, 40 19" stroke="currentColor" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>',
 'underline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 14" preserveAspectRatio="none" fill="none"><path d="M3 9 C 40 3, 80 13, 120 6 S 178 4, 197 9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>',
 'arrow': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4 C 12 4, 18 10, 19 22"/><path d="M14 18 L19 23 L23 17"/></svg>',
 'star': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 2 L24 15 L38 16 L27 24 L31 38 L20 30 L9 38 L13 24 L2 16 L16 15 Z" fill="currentColor" stroke="#1F1B16" stroke-width="2" stroke-linejoin="round"/></svg>',
 'sparkle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><path d="M15 2 C16 11 19 14 28 15 C19 16 16 19 15 28 C14 19 11 16 2 15 C11 14 14 11 15 2Z" fill="currentColor"/></svg>',
 'tape': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 22"><path d="M2 1 L72 0 L73 4 L71 8 L73 12 L71 17 L72 21 L1 22 L3 17 L1 12 L3 7 L1 3 Z" fill="#E2A72E" fill-opacity=".55"/></svg>',
 'cassette-outline': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="3" y="3" width="234" height="144" rx="14"/><rect x="22" y="18" width="196" height="76" rx="6" stroke-dasharray="6 5"/><rect x="62" y="44" width="116" height="34" rx="17"/><circle cx="84" cy="61" r="10"/><circle cx="156" cy="61" r="10"/><path d="M58 147 L70 116 H170 L182 147"/><circle cx="92" cy="132" r="4"/><circle cx="148" cy="132" r="4"/></svg>',
 'cassette-icon': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 22 15"><rect x="1" y="1" width="20" height="13" rx="2" fill="#1F1B16"/><rect x="4" y="3.5" width="14" height="5" rx="2.5" fill="#F3EBDD"/><circle cx="7.5" cy="6" r="1.5" fill="#1F1B16"/><circle cx="14.5" cy="6" r="1.5" fill="#1F1B16"/><path d="M6 14l1.5-3h7L16 14" fill="#B33A24"/></svg>',
 'vhs-label-frame': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 200" preserveAspectRatio="none"><rect x="1" y="1" width="338" height="198" fill="#FBF6EC" stroke="#1F1B16" stroke-width="2" vector-effect="non-scaling-stroke"/><rect x="2" y="2" width="84" height="16" fill="#B33A24"/><rect x="86" y="2" width="84" height="16" fill="#E2A72E"/><rect x="170" y="2" width="84" height="16" fill="#1E6B66"/><rect x="254" y="2" width="84" height="16" fill="#1F1B16"/><path d="M1 18 H339" stroke="#1F1B16" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>',
 'check-scribble': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13 C 6 15, 8 18, 9 20 C 12 13, 16 7, 22 3"/></svg>',
 'x-scribble': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 5 C 9 10, 14 15, 20 20"/><path d="M19 4 C 14 10, 9 14, 5 20"/></svg>',
}
os.makedirs('../assets', exist_ok=True)
for k, v in ASSETS.items():
    open(f'../assets/{k}.svg', 'w').write(v + '\n')

def inline(name, style='', color=None, cls=''):
    s = ASSETS[name].replace('<svg xmlns="http://www.w3.org/2000/svg"', f'<svg aria-hidden="true" class="{cls}" style="{style}{"color:"+color+";" if color else ""}"', 1)
    return s

def star(size, color=MUSTARD, style=''): return inline('star', f'width:{size}px;height:{size}px;{style}', color)
def spark(size, color=TEAL, style=''): return inline('sparkle', f'width:{size}px;height:{size}px;{style}', color)
def underline(color=TOMATO, h=12): return inline('underline', f'display:block;width:100%;height:{h}px;', color)
def circle(l=16, t=14, r=18, b=10, color=TOMATO): return inline('hand-circle', f'position:absolute;left:-{l}px;top:-{t}px;width:calc(100% + {l+r}px);height:calc(100% + {t+b}px);pointer-events:none;', color)
def arrow(size=26, color=TOMATO, style=''): return inline('arrow', f'width:{size}px;height:{size}px;{style}', color)
CASS = ASSETS['cassette-icon'].replace('xmlns="http://www.w3.org/2000/svg" ', 'aria-hidden="true" ')


# ---------------------------------------------------------------- monogram avatar (Takeout has no avatars)
import unicodedata
MONO_PALETTE = [  # (background, text) - every pair passes WCAG AA, see SPEC "Monogram avatar"
    ('#1E6B66', '#FBF6EC'),  # teal / paper-2       5.82
    ('#B33A24', '#FBF6EC'),  # tomato / paper-2     5.50
    ('#E2A72E', '#1F1B16'),  # mustard / ink        7.99
    ('#123F3C', '#FBF6EC'),  # teal-dark / paper-2 10.82
    ('#EDE3CF', '#1F1B16'),  # paper-dark / ink    13.44
]
def _alnum(c): return unicodedata.category(c)[0] in 'LN'
def _latin_or_digit(c): return unicodedata.category(c)[0] == 'N' or 'LATIN' in unicodedata.name(c, '')
def initials(name):
    words = [w for w in (''.join(w[i:] for i in [next((i for i, c in enumerate(w) if _alnum(c)), len(w))]) for w in unicodedata.normalize('NFKC', name).split()) if w]
    if not words: return '?'
    first = words[0][0]
    if not _latin_or_digit(first): return first
    if len(words) >= 2: return (first + words[1][0]).upper()
    return ''.join(c for c in words[0] if _alnum(c))[:2].upper()
def name_hash(name):  # FNV-1a 32-bit over code points of NFKC(trim(lower(name)))
    h = 2166136261
    for c in unicodedata.normalize('NFKC', name).strip().lower():
        h = ((h ^ ord(c)) * 16777619) & 0xffffffff
    return h
def monogram(name, size, tape=False, extra_style=''):
    h = name_hash(name); bg, fg = MONO_PALETTE[h % len(MONO_PALETTE)]
    tilt = ((h >> 8) % 11) - 5
    ini = initials(name); fs = 46 if len(ini) == 1 else 38
    sh = 4 if size >= 96 else 2
    tp = '<span class="tape" style="left:50%;top:-8px;width:{w}px;height:{hh}px;transform:translateX(-50%) rotate({r}deg)"></span>'.format(w=round(size*.42), hh=round(size*.12), r=-tilt*2-8) if tape else ''
    return (f'<span class="mono-st" style="position:relative;display:inline-block;flex:none;width:{size}px;height:{size}px;transform:rotate({tilt}deg);filter:drop-shadow({sh}px {sh}px 0 #1F1B16);{extra_style}" role="img" aria-label="{name}">'
            f'<svg viewBox="0 0 100 100" width="{size}" height="{size}" aria-hidden="true" style="display:block">'
            f'<circle cx="50" cy="50" r="48" fill="#FBF6EC" stroke="#1F1B16" stroke-width="{2 if size>=96 else 4}" vector-effect="{"non-scaling-stroke" if size>=96 else "none"}"/>'
            f'<circle cx="50" cy="50" r="41" fill="{bg}"/>'
            f'<circle cx="50" cy="50" r="44.5" fill="none" stroke="#1F1B16" stroke-opacity=".3" stroke-width="{.8 if size>=96 else 1.6}" stroke-dasharray="{"2 2.5" if size>=96 else "3 4"}"/>'
            + f'<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="{fs}" letter-spacing="-1.5" fill="{fg}">{ini}</text>'
            f'</svg>{tp}</span>')
MONO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="176" height="176">
  <!-- Watchback monogram sticker (Paper Mixtape). Reference for the <MonogramSticker> component; see SPEC.md "Monogram avatar".
       Slots: {BG} {FG} come from the palette picked by hashing the creator name; {INITIALS} from the initials rule.
       Wrapper (CSS, not in this file): rotate(tilt from hash, -5..+5deg), filter: drop-shadow(4px 4px 0 #1F1B16) (2px at 40px),
       optional TapeStrip across the top (hero size only). Example below shows palette slot 1 (tomato / paper-2) with initials "CN". -->
  <!-- paper rim (the cut-out sticker edge) -->
  <circle cx="50" cy="50" r="48" fill="#FBF6EC" stroke="#1F1B16" stroke-width="2" vector-effect="non-scaling-stroke"/>
  <!-- coloured disc: {BG} -->
  <circle cx="50" cy="50" r="41" fill="#B33A24"/>
  <!-- die-cut dashed ring -->
  <circle cx="50" cy="50" r="44.5" fill="none" stroke="#1F1B16" stroke-opacity=".3" stroke-width=".8" stroke-dasharray="2 2.5"/>
  <!-- initials: Fraunces 800, font-size 38 for 2 letters / 46 for 1, fill {FG} -->
  <text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="38" letter-spacing="-1.5" fill="#FBF6EC">CN</text>
</svg>
"""
open('../assets/monogram-sticker.svg', 'w').write(MONO_SVG)

# ---------------------------------------------------------------- page chrome
TOTAL = 14  # story slides when every slide is present (12 without the two Shorts slides)
def prog(n):
    return '<div class="progress">' + ''.join('<span class="on"></span>' if i < n-1 else ('<span class="half"></span>' if i == n-1 else '<span></span>') for i in range(TOTAL)) + '</div>'
def prog_full(): return '<div class="progress">' + '<span class="on"></span>'*TOTAL + '</div>'
TOP = '<div class="topbar"><div class="brand">' + CASS + 'Watchback</div><span class="close">✕</span></div>'
BRAND_ONLY = '<div class="topbar"><div class="brand">' + CASS + 'Watchback</div></div>'
CHEV = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#1F1B16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg>'
PERIOD_LABEL = 'Nov 2025 – Oct 2026'   # en.period.last12, 12 calendar months ending with the latest watch
PERIOD = f'<div class="period">{PERIOD_LABEL} {CHEV}</div>'
EX = lambda pos='bl': f'<span class="example {pos}">Example data</span>'
DISCLAIMER = 'Not affiliated with YouTube or Google.'
HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390">{meta}<link rel="stylesheet" href="style.css"><style>{css}</style></head><body><div class="screen">'
TAIL = '</div></body></html>'

pages = {}
def page(name, css, body, meta=''):
    pages[name] = HEAD.format(css=css, meta=meta) + body + TAIL

STRIPES = '<div class="stripes"><i style="background:#B33A24"></i><i style="background:#E2A72E"></i><i style="background:#1E6B66"></i><i style="background:#1F1B16"></i></div>'
LOCK = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
INFO = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.5"/></svg>'

def cassette(w=300, label_html='', reels_spin=False, color=TEAL, cls='cass'):
    # CSS cassette used on landing, crunching, music and the upload drop zone
    return f'''<div class="{cls}" style="width:{w}px;background:{color}">
<div class="clab">{label_html}</div>
<div class="win"><div class="reel"><i></i></div><div class="band"></div><div class="reel"><i></i></div></div>
<span class="screw" style="left:10px;top:10px"></span><span class="screw" style="right:10px;top:10px"></span><span class="screw" style="left:10px;bottom:10px"></span><span class="screw" style="right:10px;bottom:10px"></span>
</div>'''
CASS_CSS = '''
.cass{position:relative;border-radius:var(--r-cassette);border:2px solid var(--ink);box-shadow:var(--sh-sticker);padding:14px 14px 64px}
.cass .clab{min-height:96px;border-radius:var(--r-label);background:var(--paper2);border:2px solid var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 16px;background-image:repeating-linear-gradient(transparent 0 23px,rgba(30,107,102,.16) 23px 24px)}
.cass .win{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);width:62%;height:42px;border-radius:21px;background:var(--teal-dark);border:2px solid var(--ink);display:flex;align-items:center;justify-content:space-between;padding:0 8px}
.cass .reel{width:28px;height:28px;border-radius:50%;background:var(--paper2);border:2px solid var(--ink);display:grid;place-items:center}
.cass .reel i{width:9px;height:9px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 3px var(--paper2),0 0 0 4.5px var(--ink)}
.cass .band{flex:1;height:12px;margin:0 6px;background:var(--reel);border-radius:6px}
.cass .screw{position:absolute;width:8px;height:8px;border-radius:50%;background:var(--teal-dark);border:1.5px solid var(--ink)}
'''

# ================================================================ 00 landing
page('00-landing', CASS_CSS + '''
.art{position:absolute;top:80px;left:56px;transform:rotate(-5deg) scale(.88);transform-origin:top left}
.art .clab b{font-family:var(--hand);font-size:38px;line-height:1;color:var(--ink)}
.art .clab small{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--ink2);margin-top:4px}
.copy{position:absolute;top:286px;left:24px;right:24px}
h1{font-size:38px;font-weight:700;letter-spacing:-.03em;line-height:1.04;text-wrap:balance}
h1 em{color:var(--tomato);position:relative;display:inline-block}
h1 em .u{position:absolute;left:0;right:0;bottom:-6px}
.lede{font-size:18px;font-style:italic;line-height:1.35;margin-top:16px;max-width:320px}
.pnote{position:absolute;top:548px;left:24px;right:24px;padding:10px 14px;font-size:13px;line-height:1.38;transform:rotate(.6deg);box-shadow:var(--sh-chip)}
.cta{position:absolute;left:24px;right:24px;bottom:60px}
.cta .btn{height:56px;font-size:18px}
.cta .btn span{display:inline-flex;gap:10px;align-items:center}
.priv{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;font-size:15px;font-weight:600;color:var(--teal)}
.disclaimer{position:absolute;left:0;right:0;bottom:16px}
''', BRAND_ONLY + EX('tr') + f'''
<div class="doodle" style="right:26px;top:96px">{star(40)}</div>
<div class="doodle" style="left:22px;top:250px">{spark(22, TOMATO)}</div>
<div class="art">{cassette(300, '<b>Watchback</b>')}</div>
<div class="copy">
<h1>Your last 12 months on YouTube, <em>played back.<span class="u">{underline()}</span></em></h1>
<p class="lede">See who you watched, what you replayed, and when you couldn’t stop.</p>
</div>
<div class="sticker pnote"><span class="tape c" style="left:-14px;top:-9px;transform:rotate(-22deg);width:56px;height:18px"></span>Your Takeout file is read right here in your browser and never uploaded. The only thing that leaves your device is a list of video IDs, used to look up video lengths for your watch-time estimate. No account, no tracking, nothing saved. Close the tab and it’s gone.</div>
<div class="cta"><div class="btn p"><span>Get started <span aria-hidden="true">→</span></span></div>
<div class="priv">{LOCK}Your file never leaves your device.</div></div>
<div class="disclaimer">{DISCLAIMER}</div>
''')

# ================================================================ 01 upload
steps = [
 'Go to <u>takeout.google.com</u> and tap Deselect all.',
 'Scroll to YouTube and YouTube Music and tick it.',
 'Tap All YouTube data included and leave only history ticked. It makes the file much smaller.',
 'Tap Multiple formats and set History to JSON. HTML works too, but JSON is faster.',
 'Tap Next step, choose Export once and .zip, then Create export.',
 'Google emails you when it’s ready, which can take a few minutes or a few hours. Download the .zip and drop it here. No need to unzip it.',
]
page('01-upload', CASS_CSS + '''
h1{position:absolute;top:76px;left:24px;right:24px;font-size:30px;font-weight:700;letter-spacing:-.025em;line-height:1.08}
h1 em{color:var(--tomato)}
.drop{position:absolute;top:160px;left:24px;right:24px}
.drop .cass{width:100%;padding-bottom:62px}
.drop .clab{min-height:100px;border-style:dashed}
.drop .clab b{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.05;text-wrap:balance}
.drop .clab small{font-size:15px;font-style:italic;margin-top:5px}
.drop .clab small u{text-decoration-color:var(--tomato);text-decoration-thickness:2px;text-underline-offset:3px}
.zip{position:absolute;right:14px;bottom:22px;font-family:var(--mono);font-size:10px;font-weight:700;color:#fff;letter-spacing:.06em}
.badge{position:absolute;top:338px;left:30px;display:inline-flex;align-items:center;gap:8px;background:var(--tomato);color:#fff;font-size:15px;font-weight:600;padding:8px 15px;border:2px solid var(--ink);border-radius:99px;transform:rotate(-2deg);box-shadow:3px 3px 0 var(--ink);z-index:5}
.liner{position:absolute;top:404px;left:24px;right:24px;padding:16px 14px 4px;transform:rotate(.5deg)}
.liner .tlab{position:absolute;top:-13px;right:10px;transform:rotate(2deg);background:var(--tape-mustard);padding:3px 10px;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--ink);text-transform:uppercase}
.liner h2{font-size:16px;font-weight:700;border-bottom:1.5px solid var(--ink);padding-bottom:6px}
.st{display:flex;gap:9px;padding:6px 0;border-bottom:1px dashed var(--rule);font-size:13px;line-height:1.32}
.st:last-child{border:0}
.st .n{flex:none;font-family:var(--mono);font-weight:700;font-size:12px;color:var(--tomato);padding-top:1px}
.st u{text-decoration-color:var(--tomato);text-decoration-thickness:1.5px;text-underline-offset:2px;font-weight:600}
.disclaimer{position:absolute;bottom:16px;left:0;right:0}
''', BRAND_ONLY + EX('tr') + f'''
<h1>Bring your history. <em>We’ll do the math.</em></h1>
<div class="drop">{cassette(342, '<b>Drop your Takeout .zip here</b><small><u>or tap to choose a file</u></small>')}<span class="zip">.ZIP ▲</span></div>
<div class="badge">{LOCK}Processed on your device</div>
<div class="sticker liner"><span class="tlab">Liner notes · 6 steps</span>
<h2>Get your file from Google Takeout</h2>
{''.join(f'<div class="st"><span class="n">{i+1:02d}</span><span>{s}</span></div>' for i, s in enumerate(steps))}
</div>
<div class="disclaimer">{DISCLAIMER}</div>
''')

# ================================================================ 02b crunching
page('02b-crunching', CASS_CSS + '''
.art{position:absolute;top:130px;left:50%;transform:translateX(-50%) rotate(-3deg)}
.art .clab b{font-family:var(--hand);font-size:30px;line-height:1}
.art .reel{animation:none}
.cnt{position:absolute;top:380px;left:24px;right:24px;text-align:center}
.cnt .l{font-size:26px;font-weight:600;letter-spacing:-.02em}
.cnt .hero-n{margin:6px 0 4px}
.track{position:absolute;top:596px;left:40px;right:40px;height:14px;border:2px solid var(--ink);border-radius:8px;background:var(--paper2);overflow:hidden}
.track i{position:absolute;left:0;top:0;bottom:0;width:67%;background:repeating-linear-gradient(-45deg,var(--reel) 0 6px,#5A4231 6px 12px)}
.rot{position:absolute;top:636px;left:24px;right:24px;text-align:center;font-size:19px;font-style:italic}
.dots{display:flex;gap:6px;justify-content:center;margin-top:12px}
.dots i{width:7px;height:7px;border-radius:50%;background:var(--track)}
.dots i.on{background:var(--tomato)}
''', BRAND_ONLY + EX('bl') + f'''
<div class="doodle" style="right:30px;top:120px">{spark(26, MUSTARD)}</div>
<div class="doodle" style="left:30px;top:300px">{spark(18, TOMATO)}</div>
<div class="art">{cassette(260, '<b>Watchback</b>')}</div>
<div class="cnt" role="status"><div class="l">Reading</div><div class="hero-n">8<span class="cm">,</span>312</div><div class="l">history entries…</div></div>
<div class="track" aria-hidden="true"><i></i></div>
<div class="rot">Rewinding the tape…<div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i><i></i></div></div>
''')

# ================================================================ 02 big number (total videos)
page('02-big-number', '''
.wrap{position:absolute;top:150px;left:24px;right:24px}
.lead{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
.lead em{font-style:italic;color:var(--tomato);position:relative;display:inline-block}
.lead em .u{position:absolute;left:-2px;right:-2px;bottom:-8px}
.vhs{margin:30px -8px 0;padding:0 0 18px;transform:rotate(-2deg)}
.stripes{display:flex;height:16px;border-bottom:2px solid var(--ink)}
.stripes i{flex:1}
.vmeta{display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;font-weight:700;padding:8px 12px 0;letter-spacing:.06em}
.big{text-align:center;margin-top:10px}
.unit{font-size:32px;font-style:italic;font-weight:600;margin-top:22px;text-align:right;padding-right:6px}
.per{display:inline-block;margin-top:40px;background:var(--mustard);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:12px 18px;font-size:22px;font-weight:600;transform:rotate(1.5deg);border-radius:4px}
.per b{font-family:var(--mono);font-weight:700}
.hint{position:absolute;bottom:52px;left:40px;right:40px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;line-height:1.5;color:var(--ink2);text-wrap:balance}
''', prog(1) + TOP + PERIOD + f'''
<div class="doodle" style="right:26px;top:146px">{star(44)}</div>
<div class="doodle" style="left:30px;bottom:150px">{spark(30)}</div>
<div class="doodle" style="right:60px;bottom:200px">{spark(18, TOMATO)}</div>
<div class="wrap">
<div class="lead">You pressed <em>play<span class="u">{underline()}</span></em> on</div>
<div class="sticker vhs">
<span class="tape" style="left:-14px;top:-12px;transform:rotate(-24deg)"></span><span class="tape c" style="right:-18px;top:-10px;transform:rotate(28deg)"></span>
{STRIPES}
<div class="vmeta"><span>T-120</span><span style="color:var(--tomato)">● REC</span></div>
<div class="big hero-n" style="font-size:100px">12<span class="cm">,</span>480</div>
</div>
<div class="unit">videos.</div>
<div class="per">That’s about <b>34</b> a day.</div>
</div>
<div class="hint">Tap right for next, left to go back. Hold to pause.</div>
''' + EX('bl'))

# ================================================================ 05b watch time (+ explainer variant)
WT_CSS = '''
.wrap{position:absolute;top:176px;left:24px;right:24px}
.approx{display:flex;align-items:flex-end;gap:8px}
.approx .sym{font-family:var(--mono);font-weight:700;font-size:56px;line-height:1;color:var(--tomato);padding-bottom:22px}
.ctr{display:flex;gap:5px}
.ctr span{display:block;width:58px;height:112px;border:2px solid var(--ink);border-radius:6px;background:var(--paper2);box-shadow:3px 3px 0 var(--ink);font-family:var(--mono);font-weight:700;font-size:96px;line-height:112px;text-align:center;letter-spacing:-.04em;background-image:linear-gradient(transparent 49%,rgba(31,27,22,.18) 49% 51%,transparent 51%)}
.ctr span.c{width:auto;border:0;box-shadow:none;background:none;font-size:56px;line-height:150px;margin:0 -6px}
.unit{font-size:32px;font-style:italic;font-weight:600;margin-top:18px;line-height:1.1}
.chip{display:inline-flex;align-items:center;height:44px;margin-top:16px}
.chip .est{font-size:12px;padding:6px 10px;gap:6px;border-width:2px;box-shadow:2px 2px 0 var(--tomato)}
.chip .t{font-size:14px;font-style:italic;color:var(--ink2);margin-left:10px}
.per{display:inline-block;margin-top:28px;background:var(--mustard);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:12px 18px;font-size:22px;font-weight:600;transform:rotate(-1.5deg);border-radius:4px}
.per b{font-family:var(--mono);font-weight:700}
.sheet h2{display:inline-block;font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tomato);border:2px solid var(--tomato);padding:4px 10px;border-radius:3px;transform:rotate(-2deg);margin-top:6px}
.sheet p{font-size:17px;line-height:1.5;margin-top:16px}
.sheet .x{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:var(--mono);font-size:18px;border:2px solid var(--ink);background:var(--paper)}
.sheet .note{display:flex;gap:10px;align-items:center;margin-top:18px;padding-top:14px;border-top:1px dashed var(--rule);font-size:15px;font-weight:600;color:var(--teal)}
'''
def wt_body(sheet=False):
    b = prog(2) + TOP + PERIOD + f'''
<div class="doodle" style="right:30px;top:360px">{star(40, MUSTARD)}</div>
<div class="doodle" style="left:40px;bottom:170px">{spark(24, TOMATO)}</div>
<div class="wrap">
<div class="approx" aria-label="approximately 1,920"><span class="sym">≈</span><div class="ctr"><span>1</span><span class="c">,</span><span>9</span><span>2</span><span>0</span></div></div>
<div class="unit">hours of watching.</div>
<div class="chip"><span class="est">{INFO}Estimate</span></div>
<div><div class="per">That’s <b>80</b> full days.</div></div>
</div>
''' + ('' if sheet else EX('bl'))
    if sheet:
        b += f'''<div class="scrim"></div>
<div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div><span class="x" aria-label="Close">✕</span>
<h2>Estimate</h2>
<p>We looked up the lengths of your most-played videos plus a random sample of the rest, assumed you watched each one to the end, and scaled that up to your whole history. Very long videos and livestreams count for 3 hours at most. Skips happen, so treat this as a ballpark.</p>
<div class="note">{LOCK}Your file never leaves your device.</div>
</div><span class="example" style="top:120px;right:18px">Example data</span>'''
    return b
page('05b-watch-time', WT_CSS, wt_body())
page('05b-watch-time-explainer', WT_CSS, wt_body(True))

# ================================================================ 16 Shorts vs long-form (new) - copy: slides.shortsVsLong, deco.shortsTape/longTape
PHONE = '<svg aria-hidden="true" width="40" height="68" viewBox="0 0 44 74"><rect x="1.5" y="1.5" width="41" height="71" rx="8" fill="#1F1B16"/><rect x="5" y="9" width="34" height="52" rx="3" fill="#FBF6EC"/><rect x="9" y="14" width="26" height="22" rx="2" fill="#E2A72E"/><rect x="9" y="41" width="20" height="4" rx="2" fill="#1F1B16"/><rect x="9" y="49" width="14" height="4" rx="2" fill="#4A4238"/><path d="M33 52 l3 -4 l3 4" fill="none" stroke="#B33A24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="17" y="65" width="10" height="3" rx="1.5" fill="#FBF6EC"/></svg>'
FRAME = '<svg aria-hidden="true" width="80" height="50" viewBox="0 0 86 54"><rect x="1.5" y="1.5" width="83" height="51" rx="5" fill="#1F1B16"/><rect x="6" y="6" width="74" height="38" rx="2" fill="#1E6B66"/><circle cx="58" cy="22" r="7" fill="#E2A72E"/><path d="M6 44 L24 28 L36 36 L50 24 L80 42 L80 44 Z" fill="#123F3C"/><rect x="30" y="47" width="26" height="3" rx="1.5" fill="#4A4238"/></svg>'
TAPE_LABEL_CSS = """
.tl{position:absolute;z-index:6;padding:1px 12px 3px;font-family:var(--hand);font-size:22px;font-weight:700;line-height:1.1;color:var(--ink);white-space:nowrap;box-shadow:var(--sh-tape)}
.tl.m{background:var(--tape-mustard)}
.tl.c{background:var(--tape-clear);border:1px solid rgba(31,27,22,.08)}
"""
page('16-shorts-vs-long', TAPE_LABEL_CSS + """
h1{position:absolute;top:108px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{position:relative;display:inline-block;font-style:italic;color:var(--tomato)}
h1 em .u{position:absolute;left:0;right:0;bottom:-8px}
.fc{position:absolute;left:24px;right:24px;padding:0 16px 12px}
.fc.s{top:212px;transform:rotate(-1.2deg)}
.fc.l{top:452px;transform:rotate(1deg)}
.band{margin:0 -16px;height:30px;display:flex;align-items:center;padding:0 14px;border-bottom:2px solid var(--ink);color:var(--paper2);font-size:16px;font-weight:700;letter-spacing:-.01em}
.fc.s .band{background:var(--tomato)}
.fc.l .band{background:var(--teal-dark)}
.motif{position:absolute;z-index:5}
.fc.s .motif{right:20px;top:-18px;transform:rotate(8deg)}
.fc.l .motif{right:14px;top:-14px;transform:rotate(-6deg)}
.hr{display:flex;align-items:flex-end;gap:6px;margin-top:8px}
.hr .ap{font-family:var(--mono);font-weight:700;font-size:48px;line-height:1;padding-bottom:12px}
.fc.s .hr{color:var(--tomato)}
.unit{font-size:22px;font-style:italic;font-weight:600;margin-top:-2px}
.stats{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:8px;border-top:1px dashed var(--rule);font-family:var(--mono);font-size:14px;font-weight:700;white-space:nowrap}
.sub{position:absolute;top:688px;left:24px;right:24px;font-size:18px;font-style:italic;font-weight:600;line-height:1.3}
.chiprow{position:absolute;top:744px;left:24px;right:24px;display:flex;align-items:center;gap:10px;min-height:44px}
.chiprow .est{font-size:11px;padding:5px 9px;gap:5px;border-width:2px;box-shadow:2px 2px 0 var(--tomato);flex:none}
.chiprow .n{font-size:13px;font-style:italic;line-height:1.35;color:var(--ink2)}
""", prog(3) + TOP + PERIOD + f"""
<h1>Quick scrolls vs. <em>long watches.<span class="u">{underline()}</span></em></h1>
<div class="sticker fc s">
<span class="tl m" style="left:-12px;top:-28px;transform:rotate(-5deg)" aria-hidden="true">Singles</span>
<div class="band">Shorts</div>
<div class="motif">{PHONE}</div>
<div class="hr" aria-label="about 8,620 videos"><span class="ap">≈</span><span class="hero-n">8<span class="cm">,</span>620</span></div>
<div class="unit">videos</div>
<div class="stats"><span>≈ 84 hours</span><span>69% of your plays</span></div>
</div>
<div class="sticker fc l">
<span class="tl c" style="left:-10px;top:-27px;transform:rotate(3deg)" aria-hidden="true">Long play</span>
<div class="band">Long‑form</div>
<div class="motif">{FRAME}</div>
<div class="hr" aria-label="about 3,860 videos"><span class="ap">≈</span><span class="hero-n">3<span class="cm">,</span>860</span></div>
<div class="unit">videos</div>
<div class="stats"><span>≈ 1,836 hours</span><span>31% of your plays</span></div>
</div>
<p class="sub">Shorts got most of your plays. Long‑form got most of your time.</p>
<div class="chiprow"><span class="est">{INFO}Estimate</span><span class="n">A video counts as a Short if you opened it from a Shorts link, or if it’s 3 minutes or shorter and vertical.</span></div>
""" + EX('br'))

# ================================================================ 17 top creators split (new) - copy: slides.topCreatorsSplit
fmt_cols = [
  ('s', 'Top Shorts creators', 'Singles', 'm', [('Sample Shorts Studio', '476'), ('Tiny Sample Clips', '391'), ('★ Example Gaming Channel', '302')]),
  ('l', 'Top long‑form creators', 'Long play', 'c', [('Creator Name A', '1,150'), ('The Very Long Sample Channel Name That Keeps Going', '790'), ('見本チャンネル', '521')]),
]
def fmt_col(c, label, tape, tc, rows):
    (n1, v1), rest = rows[0], rows[1:]
    rot = -6 if c == 's' else 5
    return f"""<div class="sticker cc {c}"><span class="tl {tc}" style="{'left' if c=='s' else 'right'}:-10px;top:-28px;transform:rotate({rot}deg)" aria-hidden="true">{tape}</span>
<div class="band">{label}</div>
<div class="mg">{monogram(n1, 64)}</div>
<div class="nm">{n1}</div>
<div class="ct">≈ <b>{v1}</b><span class="vu">videos</span></div>
<div class="rn">{''.join(f'<div class="r"><span class="k">{i+2:02d}</span><div class="m"><div class="t">{t}</div><div class="v">≈ {v} videos</div></div></div>' for i, (t, v) in enumerate(rest))}</div>
</div>"""
page('17-creators-by-format', TAPE_LABEL_CSS + """
h1{position:absolute;top:108px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 .s{color:var(--tomato);font-style:italic}
h1 .l{color:var(--teal);font-style:italic}
.cols{position:absolute;top:236px;left:24px;right:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cc{padding:0 12px 4px;text-align:center;min-width:0}
.cc.s{transform:rotate(-1.5deg)}
.cc.l{transform:rotate(1.5deg)}
.band{margin:0 -12px;min-height:46px;padding:4px 10px;display:flex;align-items:center;justify-content:center;border-bottom:2px solid var(--ink);color:var(--paper2);font-size:15px;font-weight:700;line-height:1.15;text-wrap:balance}
.cc.s .band{background:var(--tomato)}
.cc.l .band{background:var(--teal-dark)}
.mg{margin-top:16px;height:68px}
.nm{font-size:18px;font-weight:700;line-height:1.18;margin-top:10px;min-height:42px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-wrap:balance}
.nm .k{font-family:var(--mono);font-size:12px;color:var(--tomato)}
.ct{font-family:var(--mono);font-size:22px;font-weight:700;margin-top:6px;white-space:nowrap}
.ct b{font-size:34px;letter-spacing:-.06em}
.ct .vu{display:block;font-family:var(--serif);font-size:16px;font-style:italic;font-weight:600;margin-top:2px}
.cc.s .ct b{color:var(--tomato)}
.rn{margin-top:12px;border-top:1.5px solid var(--ink);text-align:left}
.r{display:flex;gap:7px;align-items:baseline;padding:7px 0;border-bottom:1px dashed var(--rule)}
.r:last-child{border:0}
.r .k{flex:none;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--tomato)}
.r .m{flex:1;min-width:0}
.r .t{font-size:15px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r .v{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--ink2);margin-top:1px}
.chiprow{position:absolute;top:664px;left:24px;display:flex;align-items:center;min-height:44px}
.chiprow .est{font-size:11px;padding:5px 9px;gap:5px;border-width:2px;box-shadow:2px 2px 0 var(--tomato)}
""", prog(4) + TOP + PERIOD + f"""
<div class="doodle" style="right:40px;bottom:92px">{star(30)}</div>
<div class="doodle" style="left:150px;bottom:70px">{spark(18, TOMATO)}</div>
<h1>Your top creators, <span class="s">short</span> and <span class="l">long.</span></h1>
<div class="cols">{''.join(fmt_col(*c) for c in fmt_cols)}</div>
<div class="chiprow"><span class="est">{INFO}Estimate</span></div>
""" + EX('bl'))

# ================================================================ 03 top creator (runners-up removed: they live on 06b)
AVATAR = '<svg aria-hidden="true" viewBox="0 0 120 130" style="width:72%;height:auto"><circle cx="60" cy="46" r="28" fill="#F3EBDD" opacity=".85"/><path d="M8 132c4-34 26-52 52-52s48 18 52 52z" fill="#F3EBDD" opacity=".85"/></svg>'
page('03-top-creator', '''
.wrap{padding-top:122px;text-align:center}
.h{font-size:30px;font-weight:600;letter-spacing:-.02em}
.h em{font-style:italic}
.avw{position:relative;width:176px;height:176px;margin:26px auto 0}
.stamp{position:absolute;right:-34px;top:-14px;transform:rotate(12deg);width:72px;height:72px}
.stamp span{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-weight:700;font-size:17px;padding-top:5px}
.name{font-size:32px;font-weight:700;letter-spacing:-.02em;margin-top:22px;max-width:100%}
.name .t{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.vhs{margin:26px 6px 0;padding:0 0 14px;transform:rotate(-2deg)}
.stripes{display:flex;height:14px;border-bottom:2px solid var(--ink)}
.stripes i{flex:1}
.count{color:var(--tomato);font-size:var(--fs-hero-xl);margin-top:10px}
.line{font-size:22px;font-style:italic;font-weight:600;margin-top:22px}
.line .u{display:block;width:150px;margin:4px auto 0}
''', prog(5) + TOP + PERIOD + f'''
<div class="doodle" style="left:30px;top:200px">{spark(30, MUSTARD)}</div>
<div class="doodle" style="right:40px;top:356px">{spark(18, TOMATO)}</div>
<div class="doodle" style="left:34px;top:418px;transform:rotate(-30deg)">{arrow(34)}</div>
<div class="doodle" style="right:34px;bottom:120px">{star(34, TEAL)}</div>
<div class="wrap">
<div class="h">Your #1 creator <em>was</em></div>
<div class="avw">
{monogram("Creator Name A", 176, tape=True)}
{circle(16,16,16,14)}
<div class="stamp">{star(72)}<span>#1</span></div>
</div>
<div class="name"><span class="t">Creator Name A.</span></div>
<div class="sticker vhs">
<span class="tape" style="left:-16px;top:-11px;transform:rotate(-24deg)"></span><span class="tape c" style="right:-16px;bottom:-8px;transform:rotate(-20deg)"></span>
{STRIPES}
<div class="count hero-n">1<span class="cm">,</span>204</div>
</div>
<div class="line">videos. That’s loyalty.<span class="u">{underline(TOMATO, 10)}</span></div>
</div>
''' + EX('bl'))

# ================================================================ 06b top 5 creators
cre5 = [('Creator Name A', 1204), ('The Very Long Sample Channel Name That Keeps Going', 812), ('★ Example Gaming Channel', 655), ('見本チャンネル', 540), ('Exampletube', 498)]
avc = [TEAL, TOMATO, MUSTARD, '#4A4238', TEAL]
page('06b-top5-creators', '''
h1{position:absolute;top:112px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{position:relative;display:inline-block;font-style:italic;color:var(--tomato)}
h1 em .u{position:absolute;left:0;right:0;bottom:-8px}
.jc{position:absolute;top:228px;left:24px;right:24px;padding:0 0 4px;transform:rotate(-.6deg)}
.jc .stripes{display:flex;height:12px;border-bottom:2px solid var(--ink)}.jc .stripes i{flex:1}
.r{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px dashed var(--rule);min-height:70px}
.r:last-child{border:0}
.r .k{flex:none;width:26px;font-family:var(--mono);font-size:14px;font-weight:700;color:var(--tomato)}
.r .a{flex:none;width:40px;height:40px;border-radius:50%;border:2px solid var(--ink);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.r .m{flex:1;min-width:0}
.r .t{font-size:17px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r .bm{display:flex;align-items:center;gap:8px;margin-top:5px}.r .bar{height:8px;border:1.5px solid var(--ink);border-radius:2px;background:var(--mustard)}
.r .v{flex:none;font-family:var(--mono);font-size:13px;font-weight:700;text-align:right;white-space:nowrap}
.r.first{background:var(--mustard);margin:0;border-bottom:2px solid var(--ink)}
.r.first .bar{background:var(--tomato)}
.r.first .k{color:var(--ink)}
.r.first .t{font-size:21px}
.r.first .a{width:52px;height:52px}
.foot{position:absolute;top:640px;right:40px;font-family:var(--hand);font-size:26px;color:var(--tomato);transform:rotate(-4deg)}
''', prog(6) + TOP + PERIOD + f'''
<div class="doodle" style="right:22px;top:110px">{spark(26, MUSTARD)}</div>
<h1>Your top 5 creators, <em>in heavy rotation<span class="u">{underline()}</span></em></h1>
<div class="sticker jc">
<span class="tape" style="left:-18px;top:-10px;transform:rotate(-26deg)"></span>
{STRIPES}
{''.join(f'<div class="r{" first" if i==0 else ""}"><span class="k">{i+1:02d}</span>{monogram(t, 52 if i==0 else 40)}<div class="m"><div class="t">{t}</div><div class="bm"><div class="bar" style="width:{round(v/cre5[0][1]*62)}%"></div><span class="v">{v:,} videos</span></div></div></div>' for i, (t, v) in enumerate(cre5))}
</div>
<div class="doodle" style="left:30px;bottom:110px">{star(30, TOMATO)}</div>
''' + EX('bl'))

# ================================================================ 07 favorite video
page('07-favorite-video', '''
h1{position:absolute;top:112px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{font-style:italic;color:var(--tomato)}
.pol{position:absolute;top:208px;left:30px;right:30px;padding:12px 12px 14px;transform:rotate(-2deg)}
.thumb{aspect-ratio:16/9;border:2px solid var(--ink);background-color:var(--paper-dark);background-image:repeating-linear-gradient(-45deg,rgba(30,107,102,.18) 0 10px,transparent 10px 20px);display:grid;place-items:center;position:relative}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.thumb .ph{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--ink2);background:var(--paper2);border:1.5px solid var(--ink);padding:3px 8px}
.thumb .dur{position:absolute;right:6px;bottom:6px;font-family:var(--mono);font-size:11px;font-weight:700;background:var(--ink);color:var(--paper2);padding:1px 5px;border-radius:2px}
.cap{margin-top:12px}
.cap .t{font-size:19px;font-weight:700;line-height:1.22;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cap .c{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink2);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cnt{position:absolute;top:530px;left:24px;right:24px;display:flex;align-items:flex-end;gap:12px}
.cnt .w{font-size:26px;font-style:italic;font-weight:600;padding-bottom:16px}
.cnt .hero-n{font-size:var(--fs-hero-xl);color:var(--tomato);position:relative}
.cnt .x{font-size:26px;font-style:italic;font-weight:600;padding-bottom:16px}
.rw{position:absolute;top:668px;left:24px;display:flex;gap:6px}
.rw i{display:block;width:22px;height:22px;border-radius:50%;border:2px solid var(--ink);background:var(--paper2)}
.rw i.on{background:var(--mustard)}
''', prog(7) + TOP + PERIOD + f'''
<h1>You couldn’t stop <em>rewatching</em> this one.</h1>
<div class="sticker pol">
<span class="tape" style="left:50%;top:-12px;transform:translateX(-50%) rotate(-3deg)"></span>
<div class="thumb"><img src="img/thumb-example.jpg" alt="Example Video Title That Is Deliberately Very Long To Prove The Two Line Clamp Works On Small Phones Every Time"><span class="dur">12:34</span></div>
<div class="cap"><div class="t">Example Video Title That Is Deliberately Very Long To Prove The Two Line Clamp Works On Small Phones Every Time</div><div class="c">An Example Creator With A Rather Long Channel Name Too</div></div>
</div>
<div class="doodle" style="right:20px;top:470px">{star(42)}</div>
<div class="cnt"><span class="w">watched</span><span class="hero-n">23</span><span class="x">times.</span></div>
<div class="doodle" style="left:30px;bottom:110px">{spark(22, TOMATO)}</div>
''' + EX('bl'))

# ================================================================ 08 busiest month
months = ['N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O']
vals = [820, 940, 1110, 1020, 1486, 1180, 990, 1050, 1210, 1130, 960, 584]
peak = vals.index(max(vals))
bars = ''.join(f'<div class="b{" pk" if i==peak else ""}"><div class="col" style="height:{round(v/max(vals)*150)}px">{"<span class=vl>1,486</span>" if i==peak else ""}</div><span class="m">{m}</span></div>' for i, (m, v) in enumerate(zip(months, vals)))
page('08-busiest-month', '''
h1{position:absolute;top:112px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{position:relative;display:inline-block;color:var(--tomato);font-style:italic}
h1 em .u{position:absolute;left:0;right:0;bottom:-8px}
.n{position:absolute;top:196px;left:24px}
.n .x{font-size:20px;font-style:italic;font-weight:600;margin-top:2px}
.card{position:absolute;top:372px;left:24px;right:24px;padding:14px 12px 10px;background-color:var(--grid);background-image:linear-gradient(rgba(30,107,102,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(30,107,102,.09) 1px,transparent 1px);background-size:12px 12px;transform:rotate(.8deg)}
.card .label{display:flex;justify-content:space-between;margin-bottom:8px}
.chart{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;align-items:end;height:200px;padding-top:26px;border-bottom:2px solid var(--ink)}
.b{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;height:100%;position:relative}
.col{background:var(--heat-2,#E8C77A);background:#E8C77A;border:1.5px solid var(--ink);border-bottom:0;border-radius:3px 3px 0 0;position:relative}
.b.pk .col{background:var(--tomato)}
.vl{position:absolute;left:50%;top:-24px;transform:translateX(-50%);font-family:var(--mono);font-size:12px;font-weight:700;white-space:nowrap;color:var(--tomato)}
.m{position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700}
.b.pk .m{color:var(--tomato)}
.axis{display:flex;justify-content:space-between;margin-top:26px;font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--ink2)}
.ring{position:absolute;z-index:5}
.note{position:absolute;font-family:var(--hand);font-size:24px;color:var(--tomato);transform:rotate(-6deg);z-index:5}
''', prog(8) + TOP + PERIOD + f'''
<div class="doodle" style="right:24px;top:200px">{star(40)}</div>
<h1><em>March<span class="u">{underline()}</span></em> was your biggest month.</h1>
<div class="n"><div class="hero-n">1<span class="cm">,</span>486</div><div class="x">videos in one month.</div></div>
<div class="sticker card">
<span class="tape c" style="right:-16px;top:-10px;transform:rotate(24deg)"></span>
<div class="chart">{bars}</div>
<div class="axis"><span>Nov 2025</span><span>Oct 2026</span></div>
</div>
''' + EX('bl'))

# ================================================================ 04 prime time
page('04-prime-time', '''
.wrap{padding-top:108px}
h1{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
h1 .d{display:block;font-size:44px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:2px}
h1 .hr{position:relative;display:inline-block;font-size:96px;font-weight:800;letter-spacing:-.045em;line-height:.95;color:var(--tomato);font-style:italic;padding:0 6px;margin-left:-6px}
.sub{margin-top:18px}
.paper{margin-top:18px;padding:12px 12px 10px;background-color:var(--grid);background-image:linear-gradient(rgba(30,107,102,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(30,107,102,.09) 1px,transparent 1px);background-size:12px 12px;transform:rotate(-.8deg)}
.ph{margin-bottom:8px}
.hm{display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;align-items:center}
.hm .d{font-family:var(--mono);font-size:10.5px;font-weight:700}
.hm .c{height:15px;border-radius:2px}
.hm .c.peak{outline:2.5px solid var(--ink);outline-offset:1.5px;position:relative;z-index:2}
.ax{display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;margin-top:6px;font-family:var(--mono);font-size:10px;color:var(--ink2);font-weight:700}
.ax span{white-space:nowrap}
.note{position:absolute;right:8px;top:-34px;font-family:var(--hand);font-weight:700;font-size:24px;color:var(--tomato);display:flex;align-items:flex-end;gap:2px;transform:rotate(-3deg)}
.stats{display:flex;gap:12px;margin-top:20px;align-items:stretch}
.st{padding:10px 12px}
.st small{display:block}
.st b{display:block;font-family:var(--mono);font-size:24px;font-weight:700;margin-top:2px;letter-spacing:-.04em}
.st em{display:block;font-size:14px;font-style:italic;color:var(--ink2)}
.st.badge{flex:1.4;background:var(--mustard);transform:rotate(1.5deg)}
.st.badge .bt{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;line-height:1.15;margin-top:4px}
''', prog(9) + TOP + PERIOD + f'''
<div class="doodle" style="right:22px;top:118px">{spark(34, MUSTARD)}</div>
<div class="wrap">
<h1>Prime time:<span class="d">Sundays at</span><span class="hr">10 PM.{circle(16,14,14,8)}</span></h1>
<p class="sub">That’s when you hit play the most.</p>
<div class="sticker paper">
<span class="tape" style="left:-16px;top:-10px;transform:rotate(-28deg)"></span>
<div class="ph label">Day × hour · WIB</div>
<div style="position:relative">
<div class="note">prime time! {arrow(26)}</div>
<div class="hm" id="hm"></div>
</div>
<div class="ax"><span></span><span style="grid-column:span 6">12 AM</span><span style="grid-column:span 6">6 AM</span><span style="grid-column:span 6">12 PM</span><span style="grid-column:span 6">6 PM</span></div>
</div>
<div class="stats"><div class="sticker st" style="flex:1"><small class="label">Your peak hour</small><b>214</b><em>videos</em></div><div class="sticker st badge"><small class="label">&nbsp;</small><div class="bt"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="#1F1B16"/></svg>Night owl, 38% of plays</div></div></div>
</div>
<script>
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const pal=['#EDE3CF','#EBD8AE','#E8C77A','#E5B653','#E2A72E','#DD8D34','#D9733A','#D05B32','#B33A24'];
let seed=7;const rnd=()=>{{seed=(seed*16807)%2147483647;return seed/2147483647}};
const hm=document.getElementById('hm');
days.forEach((d,di)=>{{const l=document.createElement('div');l.className='d';l.textContent=d;hm.appendChild(l);
for(let h=0;h<24;h++){{let base=[.3,.15,.05,0,0,0,0,.05,.15,.2,.25,.3,.4,.35,.3,.3,.35,.45,.55,.65,.75,.8,.85,.6][h];
if(di>=5)base=Math.min(1,base*1.25+(h>8&&h<14?.2:0));let v=base*.85+rnd()*.25;const pk=di===6&&h===22;
const idx=Math.max(0,Math.min(7,Math.round(v*7)));const c=document.createElement('div');c.className='c'+(pk?' peak':'');c.style.background=pk?'#1F1B16':pal[idx];hm.appendChild(c);}}}});
</script>
''' + EX('bl'))

# ================================================================ 09 streak
cal = []
for i in range(6): cal.append('')       # Mar 1 2026 is a Sunday -> 6 blanks in a Monday-first grid
cal += [str(d) for d in range(1, 32)]
cells = ''.join('<i class="e"></i>' if c == '' else f'<i class="{"s" if 3 <= int(c) <= 19 else ""}{" a" if int(c) in (3, 19) else ""}">{c}</i>' for c in cal)
page('09-streak', '''
.n{position:absolute;top:112px;left:24px;right:24px;display:flex;align-items:flex-end;gap:12px}
.n .hero-n{font-size:var(--fs-hero-xl);color:var(--tomato)}
.n .h{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1;padding-bottom:14px}
.sub{position:absolute;top:248px;left:24px;right:24px}
.cal{position:absolute;top:322px;left:24px;right:24px;padding:14px 14px 14px;transform:rotate(-1deg)}
.cal .mh{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid var(--ink);padding-bottom:6px;margin-bottom:8px}
.cal .mh b{font-size:20px;font-weight:700}
.g{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.g .w{font-family:var(--mono);font-size:11px;font-weight:700;text-align:center;color:var(--ink2);padding-bottom:2px}
.g i{font-style:normal;height:38px;display:grid;place-items:center;font-family:var(--mono);font-size:13px;font-weight:700;border-radius:4px;position:relative}
.g i.s{background:var(--mustard);border:1.5px solid var(--ink)}
.g i.a{background:var(--tomato);color:#fff}
.stk{position:absolute;top:650px;right:34px;width:92px;height:92px;z-index:6;transform:rotate(10deg);border-radius:50%;background:var(--tomato);border:2px solid var(--ink);box-shadow:var(--sh-chip);display:grid;place-items:center}
.stk span{font-family:var(--hand);font-size:30px;font-weight:700;color:#fff;line-height:.85;text-align:center}
''', prog(10) + TOP + PERIOD + f'''
<div class="n"><span class="hero-n">17</span><span class="h">days in a row.</span></div>
<p class="sub">Your longest streak, from Mar 3 to Mar 19.</p>
<div class="stk" aria-hidden="true"><span>No<br>skips</span></div>
<div class="sticker cal">
<span class="tape" style="left:-14px;top:-10px;transform:rotate(-24deg)"></span>
<div class="mh"><b>March 2026</b></div>
<div class="g"><span class="w">M</span><span class="w">T</span><span class="w">W</span><span class="w">T</span><span class="w">F</span><span class="w">S</span><span class="w">S</span>{cells}</div>
</div>
<div class="doodle" style="left:40px;bottom:96px">{spark(24, TEAL)}</div>
''' + EX('bl'))

# ================================================================ 10 top searches
searches = ['how to fold a fitted sheet', 'lofi beats to study to', 'easy fried rice recipe', 'example search that is deliberately far too long to fit on one label', 'cat compilation']
rot = [-2, 1.5, -1, 2, -1.5]
page('10-top-searches', '''
h1{position:absolute;top:112px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{position:relative;display:inline-block;font-style:italic;color:var(--tomato)}
h1 em .u{position:absolute;left:0;right:0;bottom:-8px}
.list{position:absolute;top:212px;left:24px;right:24px;display:flex;flex-direction:column;gap:20px}
.dy{display:flex;align-items:center;gap:12px;max-width:100%}
.dy .k{flex:none;width:36px;height:36px;border-radius:50%;border:2px solid var(--ink);background:var(--paper2);display:grid;place-items:center;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--tomato)}
.dy .lab{min-width:0;background:var(--ink);color:var(--paper2);font-family:var(--mono);font-size:15px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:11px 14px;border-radius:3px;box-shadow:3px 3px 0 rgba(31,27,22,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background-image:linear-gradient(rgba(255,255,255,.07) 50%,transparent 50%)}
.dy.first .lab{background-color:var(--tomato);font-size:16px;padding:14px 14px}
.foot{position:absolute;top:600px;left:24px;right:24px;font-size:18px;font-style:italic;line-height:1.35;display:flex;gap:10px;align-items:flex-start}
''', prog(11) + TOP + PERIOD + f'''
<div class="doodle" style="right:26px;top:150px">{spark(26, MUSTARD)}</div>
<h1>You <em>searched<span class="u">{underline()}</span></em> for these the most.</h1>
<div class="list">{''.join(f'<div class="dy{" first" if i==0 else ""}" style="transform:rotate({rot[i]}deg)"><span class="k">{i+1:02d}</span><span class="lab">{s}</span></div>' for i, s in enumerate(searches))}</div>
<div class="foot">{LOCK.replace('width="15" height="15"','width="20" height="20" style="flex:none;margin-top:3px;color:#1E6B66"')}The rest stays between you and your search bar.</div>
''' + EX('bl'))

# ================================================================ 11 music total + top artist
page('11-music-total', CASS_CSS + '''
.wrap{position:absolute;top:112px;left:24px;right:24px}
.l{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
.wrap .hero-n{color:var(--teal);margin:6px 0 2px}
.l2{font-size:28px;font-weight:600;font-style:italic;letter-spacing:-.02em;line-height:1.1}
.by{position:absolute;top:376px;left:24px;right:24px;font-size:20px;font-style:italic}
.art{position:absolute;top:420px;left:40px;transform:rotate(-3deg)}
.art .clab{min-height:104px}
.art .clab .sm{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--ink2)}
.art .clab b{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.1;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;max-width:250px}
.art .clab .ul{width:150px;margin-top:2px}
''', prog(12) + TOP + PERIOD + f'''
<div class="doodle" style="right:26px;top:140px">{star(40)}</div>
<div class="wrap">
<div class="l">You played</div>
<div class="hero-n">3<span class="cm">,</span>912</div>
<div class="l2">songs on YouTube Music.</div>
</div>
<div class="by">Most of them were by</div>
<div class="art">{cassette(310, '<b>Artist Name A.</b><div class="ul">' + underline(TOMATO, 10) + '</div>', color=TOMATO)}</div>
<div class="doodle" style="left:36px;bottom:96px">{spark(22, TEAL)}</div>
''' + EX('bl'))

# ================================================================ 12 top 5 songs
songs = [('Song Title Example', 'Artist Name A', 318), ('Another Sample Song With A Deliberately Long Title Here', 'Artist Name B', 241), ('Example Track C', 'Artist Name A', 199), ('Sample Song D', 'An Artist With An Unusually Long Name', 176), ('Example Track E', 'Artist Name E', 150)]
page('12-top5-songs', '''
h1{position:absolute;top:112px;left:24px;right:24px;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12}
h1 em{font-style:italic;color:var(--teal)}
.np{position:absolute;top:208px;left:24px;right:24px;background:var(--teal);color:#fff;border:2px solid var(--ink);border-radius:14px;box-shadow:var(--sh-sticker);padding:12px 14px;display:flex;gap:12px;align-items:center;transform:rotate(-1.2deg)}
.np .mini{flex:none;width:64px;height:42px;border-radius:6px;background:var(--paper2);border:2px solid var(--ink);display:flex;align-items:center;justify-content:space-around;padding:0 6px}
.np .mini i{width:15px;height:15px;border-radius:50%;border:3px solid var(--ink)}
.np .m{flex:1;min-width:0}
.np small{display:block;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--paper2)}
.np b{display:block;font-size:20px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.np em{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.np .p{flex:none;font-family:var(--mono);font-size:12px;font-weight:700;text-align:right;line-height:1.2}
.np .p b{font-size:22px}
.jc{position:absolute;top:322px;left:24px;right:24px;padding:4px 14px 2px;transform:rotate(.6deg)}
.r{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--rule)}
.r:last-child{border:0}
.r .k{flex:none;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--tomato);width:24px}
.r .m{flex:1;min-width:0}
.r .t{font-size:17px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r .a{font-size:14px;font-style:italic;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r .v{flex:none;font-family:var(--mono);font-size:12.5px;font-weight:700;text-align:right}
''', prog(13) + TOP + PERIOD + f'''
<h1><em>Side A:</em> your top 5 songs, on repeat.</h1>
<div class="np"><div class="mini"><i></i><i></i></div><div class="m"><small>Now playing</small><b>{songs[0][0]}</b><em>{songs[0][1]} · {songs[0][2]} plays</em></div></div>
<div class="sticker jc">
<span class="tape c" style="right:-16px;top:-10px;transform:rotate(22deg)"></span>
{''.join(f'<div class="r"><span class="k">{i+2:02d}</span><div class="m"><div class="t">{t}</div><div class="a">{a}</div></div><span class="v">{v} plays</span></div>' for i, (t, a, v) in enumerate(songs[1:]))}
</div>
<div class="doodle" style="right:40px;bottom:96px">{star(30, MUSTARD)}</div>
''' + EX('bl'))

# ================================================================ share card (story, 9:16) + fallback
cre = [('01', 'Creator Name A', '1,204'), ('02', 'The Very Long Sample Channel Name That Keeps Going', '812'), ('03', '★ Example Gaming Channel', '655'), ('04', '見本チャンネル', '540'), ('05', 'Exampletube', '498')]
SHARE_CSS = '''
.card{position:absolute;top:40px;left:24px;width:342px;height:608px;background-color:var(--paper2);background-image:var(--grain-card);border:2px solid var(--ink);box-shadow:var(--sh-card);overflow:hidden}
.stripes{display:flex;height:12px;border-bottom:2px solid var(--ink)}
.stripes i{flex:1}
.in{padding:14px 18px 0}
.head{display:flex;justify-content:space-between;align-items:center}
.stamp{font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.12em;color:var(--tomato);border:2px solid var(--tomato);padding:2px 7px;transform:rotate(4deg)}
.hl{font-size:28px;font-weight:700;letter-spacing:-.025em;line-height:1.05;margin-top:10px;text-wrap:balance}
.hl em{color:var(--tomato)}
.per{font-family:var(--mono);font-size:10.5px;color:var(--ink2);margin-top:5px}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.n{border:2px solid var(--ink);padding:9px 10px 8px;background:#fff;position:relative}
.n.w{background:var(--mustard)}
.n small{display:block;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.n b{display:block;font-family:var(--mono);font-size:27px;font-weight:700;letter-spacing:-.06em;line-height:1.1;margin-top:3px;white-space:nowrap}
.n .u{font-size:13px;font-style:italic;display:flex;align-items:center;gap:6px;margin-top:1px}
.n .est{border-color:var(--ink);color:var(--ink);background:var(--paper2);font-size:9px}
.sec{display:flex;justify-content:space-between;margin-top:12px;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;border-bottom:1.5px solid var(--ink);padding-bottom:4px;text-transform:uppercase}
.row{display:flex;align-items:baseline;gap:9px;padding:5px 0;border-bottom:1px dashed var(--rule);font-size:15px;font-weight:600}
.row:last-child{border:0}
.row .k{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--tomato)}
.row .t{min-width:0;max-width:62%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .dots{flex:1;border-bottom:2px dotted rgba(31,27,22,.3);transform:translateY(-4px)}
.row .v{font-family:var(--mono);font-size:12.5px;font-weight:700}
.song{display:flex;align-items:center;gap:10px;margin-top:8px;background:var(--teal);color:#fff;border:2px solid var(--ink);border-radius:10px;padding:8px 10px}
.mini{flex:none;width:52px;height:34px;border-radius:5px;background:var(--paper2);border:2px solid var(--ink);display:flex;align-items:center;justify-content:space-around;padding:0 5px}
.mini i{width:12px;height:12px;border-radius:50%;border:2.5px solid var(--ink)}
.song .m{min-width:0;flex:1}
.song small{display:block;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.song b{display:block;font-size:16px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song em{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song .p{margin-left:auto;font-family:var(--mono);font-style:normal;font-size:11px;text-align:right;line-height:1.25;flex:none}
.foot{position:absolute;left:0;right:0;bottom:0;padding:8px 18px 9px;border-top:2px solid var(--ink);display:flex;flex-wrap:wrap;justify-content:space-between;row-gap:3px;font-family:var(--mono);font-size:10.5px;font-weight:700;background:var(--paper)}
.foot .disclaimer{width:100%;text-align:left;font-weight:400;font-size:9.5px}
.btns{position:absolute;left:24px;right:24px;top:670px;display:flex;gap:12px}
.btns .btn{flex:1}
.again{position:absolute;left:0;right:0;top:734px;display:flex;justify-content:center}
.again span{height:44px;display:grid;place-items:center;padding:0 16px;font-size:16px;font-weight:600;text-decoration:underline;text-decoration-color:var(--tomato);text-decoration-thickness:2px;text-underline-offset:4px}
.tip{position:absolute;z-index:10;left:150px;right:12px;top:308px;background:var(--ink);color:var(--paper2);font-size:14.5px;line-height:1.35;padding:11px 13px;border-radius:8px;box-shadow:3px 3px 0 rgba(31,27,22,.25)}
.tip::before{content:"";position:absolute;top:-8px;right:60px;border:8px solid transparent;border-top:0;border-bottom-color:var(--ink)}
.n .i{position:absolute;top:2px;right:2px;width:28px;height:28px;display:grid;place-items:center}
'''
def share_body(fallback=False):
    wt = ('<div class="n w"><small>Your peak hour</small><b>10 PM</b><div class="u">Sundays</div><span class="i">' + INFO.replace('width="12" height="12"', 'width="16" height="16"') + '</span></div>') if fallback else \
         '<div class="n w"><small>Watch time</small><b>≈ 1<span class="cm">,</span>920</b><div class="u">hours <span class="est">Estimate</span></div></div>'
    b = prog_full() + f'''
<div class="card">
{STRIPES}
<div class="in">
<div class="head"><div class="brand">{CASS.replace('width="24" height="16"','width="33" height="22"')}</div><span class="stamp">WATCHBACK</span></div>
<div class="hl">That was your <em>last 12 months.</em></div>
<div class="per">{PERIOD_LABEL} · YouTube + YouTube Music</div>
<div class="nums">
<div class="n"><small>Videos</small><b>12<span class="cm">,</span>480</b><div class="u">≈ 34 a day</div></div>
{wt}
</div>
<div class="sec"><span>Top creators</span><span>Videos</span></div>
{''.join(f'<div class="row"><span class="k">{k}</span><span class="t">{t}</span><span class="dots"></span><span class="v">{v}</span></div>' for k, t, v in cre)}
<div class="sec"><span>Top song</span></div>
<div class="song"><div class="mini"><i></i><i></i></div><div class="m"><small>Now playing</small><b>Song Title Example</b><em>Artist Name A</em></div><span class="p">318<br>plays</span></div>
</div>
<div class="foot"><span>watchback.example.app</span><span>EXAMPLE DATA</span><span class="disclaimer">{DISCLAIMER}</span></div>
</div>
<div class="btns"><div class="btn s">Save story</div><div class="btn p">Save square</div></div>
<div class="again"><span>Start over</span></div>
''' + EX('br')
    if fallback:
        b += '<div class="tip" role="tooltip">Watch time is taking a break today. Try again tomorrow to see it.</div>'
    return b
page('05-share-card', SHARE_CSS, share_body())
page('14-fallback-share-card', SHARE_CSS, share_body(True))

# ================================================================ 13 share square (360x360 CSS @3x = 1080x1080)
page('13-share-square', '''
html,body,.screen{width:360px;height:360px}
.screen{padding:0}
.card{position:absolute;inset:0;background-color:var(--paper2);background-image:var(--grain-card);overflow:hidden}
.stripes{display:flex;height:10px;border-bottom:2px solid var(--ink)}.stripes i{flex:1}
.in{padding:12px 16px 0}
.head{display:flex;justify-content:space-between;align-items:center}
.brand{font-size:15px}
.stamp{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.12em;color:var(--tomato);border:2px solid var(--tomato);padding:1px 6px;transform:rotate(4deg)}
.hl{font-size:26px;font-weight:700;letter-spacing:-.025em;line-height:1.05;margin-top:8px}
.hl em{color:var(--tomato)}
.per{font-family:var(--mono);font-size:9.5px;color:var(--ink2);margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.n{border:2px solid var(--ink);padding:9px 9px 9px;background:#fff;min-width:0}
.n.w{background:var(--mustard)}
.n.t{background:var(--teal);color:#fff}
.n small{display:block;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.n b{display:block;font-family:var(--mono);font-size:24px;font-weight:700;letter-spacing:-.06em;line-height:1.1;margin-top:2px;white-space:nowrap}
.n .nm{font-size:15px;font-weight:700;line-height:1.12;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.n .u{font-size:12px;font-style:italic;display:flex;align-items:center;gap:5px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n .est{border-color:var(--ink);color:var(--ink);background:var(--paper2);font-size:8.5px;padding:1px 5px}
.foot{position:absolute;left:0;right:0;bottom:0;padding:6px 16px 7px;border-top:2px solid var(--ink);display:flex;flex-wrap:wrap;justify-content:space-between;row-gap:2px;font-family:var(--mono);font-size:9.5px;font-weight:700;background:var(--paper)}
.foot .disclaimer{width:100%;text-align:left;font-weight:400;font-size:9px}
.example{display:none}
''', f'''
<div class="card">
{STRIPES}
<div class="in">
<div class="head"><div class="brand">{CASS.replace('width="24" height="16"','width="30" height="20"')}</div><span class="stamp">WATCHBACK</span></div>
<div class="hl">That was your <em>last 12 months.</em></div>
<div class="per">{PERIOD_LABEL} · YouTube + YouTube Music</div>
<div class="grid">
<div class="n"><small>Videos</small><b>12<span class="cm">,</span>480</b><div class="u">≈ 34 a day</div></div>
<div class="n w"><small>Watch time</small><b>≈ 1<span class="cm">,</span>920</b><div class="u">hours <span class="est">Estimate</span></div></div>
<div class="n"><small>#1 creator</small><span class="nm">Creator Name A</span><div class="u">1,204 videos</div></div>
<div class="n t"><small>Top song</small><span class="nm">Song Title Example</span><div class="u">Artist Name A · 318 plays</div></div>
</div>
</div>
<div class="foot"><span>watchback.example.app</span><span>EXAMPLE DATA</span><span class="disclaimer">{DISCLAIMER}</span></div>
</div>
''', meta='<meta name="mockup-size" content="360x360@3">')

# ================================================================ 15 period sheet (pill open)
opts = [('Last 12 months', PERIOD_LABEL, True), ('2026', None, False), ('2025', None, False), ('2024', None, False), ('2023', None, False), ('All time', None, False)]
def opt(label, sub, sel):
    return f'<div class="o{" sel" if sel else ""}" role="option" aria-selected="{str(sel).lower()}"><div><b>{label}</b>{f"<small>{sub}</small>" if sub else ""}</div>{"<span class=ck>" + inline("check-scribble", "width:26px;height:26px;", TOMATO) + "</span>" if sel else ""}</div>'
page('15-period-sheet', '''
.ghost{position:absolute;top:150px;left:24px;right:24px}
.ghost .l{font-size:30px;font-weight:600}
.ghost .hero-n{margin-top:40px;font-size:100px}
.period{z-index:25}
.period svg{transform:rotate(180deg)}
.sheet{padding-bottom:30px}
.sheet h2{font-size:22px;font-weight:700;letter-spacing:-.02em}
.grp{margin:14px 0 4px}
.o{display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:6px 14px;border-bottom:1px dashed var(--rule)}
.o b{display:block;font-size:18px;font-weight:600}
.o small{display:block;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink2);margin-top:1px}
.o.sel{background:var(--mustard);border:2px solid var(--ink);border-radius:6px;box-shadow:var(--sh-chip)}
.o.sel b{font-weight:700}
.o.last{border:0}
''', prog(1) + TOP + PERIOD + f'''
<div class="ghost" aria-hidden="true"><div class="l">You pressed play on</div><div class="hero-n">12<span class="cm">,</span>480</div></div>
<div class="scrim"></div>
<div class="sheet" role="listbox"><div class="handle"></div>
<h2>Choose a period</h2>
<div style="margin-top:14px">{opt(*opts[0])}</div>
<div class="grp label">Calendar years</div>
{''.join(opt(*o) for o in opts[1:5])}
<div style="margin-top:12px">{opt(*opts[5]).replace('class="o"', 'class="o last"')}</div>
</div>
''' + EX('tr'))

# ---------------------------------------------------------------- write
ORDER = [
 ('00-landing', 'Landing'), ('01-upload', 'Upload'), ('02b-crunching', 'Crunching'),
 ('02-big-number', '1 · Total videos'), ('05b-watch-time', '2 · Watch time'), ('05b-watch-time-explainer', '2 · Estimate explainer (sheet)'),
 ('16-shorts-vs-long', '3 · Shorts vs long-form (new)'), ('17-creators-by-format', '4 · Top creators, short and long (new)'),
 ('03-top-creator', '5 · #1 creator'), ('06b-top5-creators', '6 · Top 5 creators'), ('07-favorite-video', '7 · Favorite video'),
 ('08-busiest-month', '8 · Busiest month'), ('04-prime-time', '9 · Prime time + badge'), ('09-streak', '10 · Streak'),
 ('10-top-searches', '11 · Top searches'), ('11-music-total', '12 · Music total + top artist'), ('12-top5-songs', '13 · Top 5 songs'),
 ('05-share-card', '14 · Share (story 9:16)'), ('13-share-square', 'Share image · square 1080×1080'),
 ('14-fallback-share-card', 'Fallback · watch time unavailable'), ('15-period-sheet', 'Period pill · open'),
]
assert set(k for k, _ in ORDER) == set(pages), set(pages) ^ set(k for k, _ in ORDER)
for k, v in pages.items():
    open(k + '.html', 'w').write(v)
json.dump(ORDER, open('order.json', 'w'), indent=1, ensure_ascii=False)
print('wrote', len(pages), 'pages and', len(ASSETS), 'assets')
