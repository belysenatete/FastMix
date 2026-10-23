"""Interpret mix directions and refinement notes as engine-neutral version settings.

A version's settings come from the session direction; each refinement note adjusts
the settings of the version it refines, so every version records what produced it.
"""

import copy
import re
import unicodedata


GENRE_PATTERNS = [
    # Ordered: the first match wins, so specific genres come before broad families.
    (r"\b(reggaeton|dembow)\b", "REGGAETON"),
    (r"\b(afro|afrobeats?|afro ?trap|afroswing|amapiano)\b", "AFROBEAT"),
    (r"\b(trap|drill|rage|phonk)\b", "TRAP"),
    (r"\b(lo-?fi)\b", "LO_FI"),
    (r"\b(k-?pop)\b", "K_POP"),
    (r"\b(latin|latino|salsa|bachata)\b", "LATIN"),
    (r"\b(jazz|jazzy)\b", "JAZZ"),
    (r"\b(house)\b", "HOUSE"),
    (r"\b(techno)\b", "TECHNO"),
    (r"\b(country)\b", "COUNTRY_ACOUSTIC"),
    (r"\b(cinematic|cinematique|film score)\b", "CINEMATIC"),
    (r"\b(rap|hip[ -]?hop|grime|boom ?bap|cloud ?rap|rnb|r&b)\b", "HIPHOP_GRIME"),
    (r"\b(pop|catchy|radio)\b", "POP"),
    (r"\b(acoustic|acoustique|folk|unplugged)\b", "ACOUSTIC"),
    (r"\b(electronic|electronique|edm|synth)\b", "ELECTRONIC"),
    (r"\b(metal|heavy metal)\b", "METAL"),
    (r"\b(rock|indie|guitar band)\b", "ROCK_INDIE"),
    (r"\b(reggae|dub)\b", "REGGAE_DUB"),
    (r"\b(orchestral|strings)\b", "ORCHESTRAL"),
]
# RoEx's mix and mastering endpoints accept fewer styles than /recombine.
BASE_STYLE = {
    "TRAP": "HIPHOP_GRIME", "AFROBEAT": "HIPHOP_GRIME", "LO_FI": "HIPHOP_GRIME", "REGGAETON": "OTHER",
    "K_POP": "POP", "LATIN": "OTHER", "JAZZ": "OTHER", "HOUSE": "ELECTRONIC", "TECHNO": "ELECTRONIC",
    "COUNTRY_ACOUSTIC": "ACOUSTIC", "CINEMATIC": "ORCHESTRAL",
}
GENRE_NAMES = {
    "HIPHOP_GRIME": "Hip-hop", "LO_FI": "Lo-fi", "K_POP": "K-pop", "COUNTRY_ACOUSTIC": "Country",
    "ROCK_INDIE": "Rock/indie", "REGGAE_DUB": "Reggae/dub", "OTHER": "Auto style",
}
LOUDNESS_LEVELS = ["LOW", "MEDIUM", "HIGH"]
REVERB_LEVELS = ["NONE", "LOW", "MEDIUM", "HIGH"]
AUTOTUNE_STRENGTHS = [0.45, 0.8, 1.0]
AUTOTUNE_NAMES = {0.45: "subtle", 0.8: "normal", 1.0: "hard"}
MAX_VOCAL_GAIN_DB = 6.0
VOCAL_STEP_DB = 2.0

NOTE_CLASSES = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
SOLFEGE = {"do": "c", "re": "d", "mi": "e", "fa": "f", "sol": "g", "la": "a", "si": "b"}
SCALE_STEPS = {"major": (0, 2, 4, 5, 7, 9, 11), "minor": (0, 2, 3, 5, 7, 8, 10)}

# "vocal reverb" or "vocal autotune" names an effect, not the vocal level.
VOCAL = r"(?:lead )?(?:vocals?|voice|voix|vox)(?!\s*(?:reverb|reverbe|space|effects?|fx|auto-?tune|tuning))"
VOCAL_UP = rf"\b{VOCAL}\b.{{0,20}}?\b(?:louder|up|higher|forward|upfront|on top|more present|plus forte?|devant|en avant)\b|\b(?:louder|more|turn up|boost|raise)\b.{{0,12}}?\b{VOCAL}\b"
VOCAL_DOWN = rf"\b{VOCAL}\b.{{0,20}}?\b(?:quieter|lower|down|softer|back|buried|blended|less|plus basse?|en retrait|moins forte?)\b|\b(?:quieter|less|lower|turn down|reduce)\b.{{0,12}}?\b{VOCAL}\b"


def normalize_prompt(text: str) -> str:
    """Lowercase and strip accents so English and French directions match the same patterns."""
    return "".join(character for character in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(character))


def detect_genre(text: str) -> str | None:
    for pattern, genre in GENRE_PATTERNS:
        if re.search(pattern, text):
            return genre
    return None


def style_for(genre: str, endpoint: str) -> str:
    """Map a canonical genre to the style enum accepted by a RoEx endpoint."""
    if endpoint == "recombine":
        return genre
    style = BASE_STYLE.get(genre, genre)
    return "OTHER" if endpoint == "master" and style == "ORCHESTRAL" else style


def _key(text: str) -> tuple[list[int], str] | None:
    english = re.search(r"\b([a-g])\s*(#|sharp|b|flat)?\s*(major|minor|maj|min)\b", text)
    french = re.search(r"\b(do|re|mi|fa|sol|la|si)\s*(#|diese|b|bemol)?\s*(majeur|mineur)\b", text)
    match = english or french
    if not match:
        return None
    note, accidental, quality = match.groups()
    letter = SOLFEGE.get(note, note)
    root = NOTE_CLASSES[letter]
    sign = ""
    if accidental in {"#", "sharp", "diese"}:
        root, sign = root + 1, "#"
    elif accidental in {"b", "flat", "bemol"}:
        root, sign = root - 1, "b"
    minor = quality in {"minor", "min", "mineur"}
    scale = sorted((root + step) % 12 for step in SCALE_STEPS["minor" if minor else "major"])
    return scale, f"{letter.upper()}{sign} {'minor' if minor else 'major'}"


def _autotune(text: str) -> dict | None:
    if re.search(r"\b(no|without|sans|pas d'?)\s*(auto-?tune|pitch correction)\b", text):
        return None
    if not re.search(r"\b(auto-?tune[ds]?|autotunee?|pitch[ -]correct(ion|ed)?|tuned vocals?|t-?pain|melodyne)\b", text):
        return None
    strength = 0.8
    if re.search(r"\b(hard|heavy|strong|robotic|robotique|t-?pain|extreme|fort|max)\b", text):
        strength = 1.0
    elif re.search(r"\b(subtle|light|natural|gentle|soft|leger|legere|discret|naturel)\b", text):
        strength = 0.45
    key = _key(text)
    return {"strength": strength, "scale": key[0] if key else None, "key": key[1] if key else None}


def _loudness(text: str) -> str:
    if re.search(r"\b(loud|louder|club|competitive|aggressive|banger|fort|puissant)\b", text):
        return "HIGH"
    if re.search(r"\b(dynamic|dynamique|quiet|soft|gentle|natural|naturel|doux)\b", text):
        return "LOW"
    return "MEDIUM"


def _vocal_gain(text: str) -> float:
    if re.search(VOCAL_UP, text):
        return VOCAL_STEP_DB
    if re.search(VOCAL_DOWN, text):
        return -VOCAL_STEP_DB
    return 0.0


def _reverb(text: str) -> str:
    if re.search(r"\b(dry|sec|seche|no reverb|without reverb|sans reverbe?)\b", text):
        return "NONE"
    if re.search(r"\b(lush|spacious|echoey|echoing|heavy reverb|lots of reverb)\b", text):
        return "HIGH"
    if re.search(r"\b(some reverb|medium reverb|roomy|space|spacieux)\b", text):
        return "MEDIUM"
    if re.search(r"\b(reverb|reverbe|ambient)\b", text):
        return "LOW"
    return "NONE"


def settings_from_prompt(prompt: str) -> dict:
    text = normalize_prompt(prompt)
    # Vocal-level phrases ("vocals louder") must not also read as overall loudness.
    overall = re.sub(VOCAL_UP + "|" + VOCAL_DOWN, " ", text)
    return {
        "genre": detect_genre(text) or "OTHER",
        "loudness": _loudness(overall),
        "vocal_gain_db": _vocal_gain(text),
        "reverb": _reverb(text),
        "autotune": _autotune(text),
    }


def _step(levels: list, current, delta: int):
    index = levels.index(current) if current in levels else 0
    return levels[max(0, min(len(levels) - 1, index + delta))]


def refine(settings: dict, note: str) -> tuple[dict, list[str]]:
    """Apply a refinement note to a version's settings. Returns the new settings and what changed."""
    text = normalize_prompt(note)
    updated = copy.deepcopy(settings)
    changes: list[str] = []

    genre = detect_genre(text)
    if genre and genre != updated["genre"]:
        updated["genre"] = genre
        changes.append(f"style: {genre_name(genre)}")

    if re.search(VOCAL_UP, text) or re.search(VOCAL_DOWN, text):
        delta = VOCAL_STEP_DB if re.search(VOCAL_UP, text) else -VOCAL_STEP_DB
        gain = max(-MAX_VOCAL_GAIN_DB, min(MAX_VOCAL_GAIN_DB, updated["vocal_gain_db"] + delta))
        if gain != updated["vocal_gain_db"]:
            updated["vocal_gain_db"] = gain
            changes.append(f"vocal {gain:+g} dB")
    overall = re.sub(VOCAL_UP + "|" + VOCAL_DOWN, " ", text)

    if re.search(r"\b(no reverb|without reverb|sans reverbe?|completely dry|bone dry)\b", text):
        reverb = "NONE"
    elif re.search(r"\b(more reverb|more space|wetter|bigger reverb|plus de reverbe?|plus d'espace)\b", text):
        reverb = _step(REVERB_LEVELS, updated["reverb"], 1)
    elif re.search(r"\b(less reverb|less space|drier|dryer|moins de reverbe?)\b", text):
        reverb = _step(REVERB_LEVELS, updated["reverb"], -1)
    else:
        reverb = updated["reverb"]
    if reverb != updated["reverb"]:
        updated["reverb"] = reverb
        changes.append(f"reverb: {reverb.lower()}")

    autotune = copy.deepcopy(updated["autotune"])
    if re.search(r"\b(no|without|sans|remove( the)?|pas d'?)\s*(auto-?tune|pitch correction)\b", text):
        autotune = None
    elif re.search(r"\b(hard|harder|heavy|robotic|t-?pain)\b.{0,12}\bauto-?tune\b|\bauto-?tune\b.{0,12}\b(harder|heavier|more robotic)\b", text):
        autotune = {**(autotune or {"scale": None, "key": None}), "strength": 1.0}
    elif re.search(r"\b(more|stronger)\s+auto-?tune\b", text):
        autotune = {**(autotune or {"scale": None, "key": None}), "strength": _step(AUTOTUNE_STRENGTHS, autotune["strength"], 1) if autotune else 0.8}
    elif re.search(r"\b(less|softer|subtler|lighter|moins d'?)\s*auto-?tune\b|\bauto-?tune\b.{0,12}\b(softer|subtler|more natural|lighter)\b", text):
        if autotune:
            autotune["strength"] = _step(AUTOTUNE_STRENGTHS, autotune["strength"], -1)
    elif re.search(r"\b(add|with|put|avec|mets?)\b.{0,10}\bauto-?tune\b", text) and not autotune:
        autotune = {"strength": 0.8, "scale": None, "key": None}
    key = _key(text)
    if key and autotune:
        autotune["scale"], autotune["key"] = key
    if autotune != updated["autotune"]:
        updated["autotune"] = autotune
        changes.append(f"autotune: {AUTOTUNE_NAMES[autotune['strength']]}{' in ' + autotune['key'] if autotune.get('key') else ''}" if autotune else "autotune off")

    if re.search(r"\b(louder|more punch|punchier|more loud|more aggressive|plus fort|plus de punch)\b", overall):
        loudness = _step(LOUDNESS_LEVELS, updated["loudness"], 1)
    elif re.search(r"\b(quieter|more dynamic|less loud|less compressed|less aggressive|moins fort|plus dynamique)\b", overall):
        loudness = _step(LOUDNESS_LEVELS, updated["loudness"], -1)
    else:
        loudness = updated["loudness"]
    if loudness != updated["loudness"]:
        updated["loudness"] = loudness
        changes.append(f"loudness: {loudness.lower()}")

    return updated, changes


def genre_name(genre: str) -> str:
    return GENRE_NAMES.get(genre, genre.replace("_", " ").capitalize())


def describe(settings: dict | None) -> str | None:
    """A short, human-readable summary of the settings that produced a version."""
    if not settings:
        return None
    parts = [genre_name(settings["genre"]), f"{settings['loudness'].lower()} loudness"]
    if settings["vocal_gain_db"]:
        parts.append(f"vocal {settings['vocal_gain_db']:+g} dB")
    if settings["reverb"] != "NONE":
        parts.append(f"{settings['reverb'].lower()} vocal reverb")
    autotune = settings.get("autotune")
    if autotune:
        parts.append(f"{AUTOTUNE_NAMES[autotune['strength']]} autotune{' in ' + autotune['key'] if autotune.get('key') else ''}")
    return " · ".join(parts)
