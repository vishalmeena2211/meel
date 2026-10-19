"""Builds ask-meel-wireframes.html: the gallery shell and helpers from
meel-wireframes.src.html, with only the Ask Meel styles and screens."""
from pathlib import Path

HERE = Path(__file__).parent
src = (HERE / 'meel-wireframes.src.html').read_text()
css = (HERE / 'ask-meel' / 'style.css').read_text()
screens = (HERE / 'ask-meel' / 'screens.js').read_text()

SCREENS_MARK = '/* ── Screens ──'
GALLERY_MARK = '/* ── Gallery behaviour'
head = src[:src.index(SCREENS_MARK)]
gallery = src[src.index(GALLERY_MARK):]

swaps = [
    ('<title>Meel Wireframes</title>', '<title>Ask Meel</title>'),
    ('<h1>Meel wireframes</h1>', '<h1>Ask Meel</h1>'),
]
for old, new in swaps:
    assert old in head, old
    head = head.replace(old, new)

def swap_between(text, start, end, new):
    i = text.index(start)
    j = text.index(end, i)
    return text[:i] + new + text[j:]

head = swap_between(head, '<p class="lede">', '</p>',
    '<p class="lede">A text assistant for rideplanner.in that answers riders from Meel’s own facts, with a date and a source on every sentence. The plan first, then every screen and state.')
head = swap_between(head, '<p class="foot">', '</p>',
    '<p class="foot">Wireframes only, nothing built. Questions are examples; the facts quoted are Meel’s real facts as of 17 October 2026, except the Manali to Leh altitude drawing, which reuses the main gallery’s example figures. Colours and type follow the main Meel wireframes.')
head = head.replace('</style>', css + '\n</style>', 1)
gallery = gallery.replace("'meel-wireframe'", "'ask-meel-wireframe'")
assert gallery.count("'ask-meel-wireframe'") == 2

(HERE / 'ask-meel-wireframes.html').write_text(head + screens + '\n' + gallery)
print('built', len(head + screens + gallery), 'chars')
