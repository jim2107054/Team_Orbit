"""
Carry the reference deck's embedded fonts into the generated deck.

The reference (Untitled_design.pptx) ships Open Sauce / Open Sauce Bold /
Open Sauce Italics / DM Sans as embedded font parts. Without them the restyled
deck substitutes a different family and loses the reference's exact weight and
width. pptxgenjs cannot embed fonts, so this runs after the build:

  * copy ppt/fonts/*.fntdata
  * declare the fntdata default content type
  * add one presentation relationship per font
  * insert <p:embeddedFontLst> in its schema-correct slot

Usage:  python embed_fonts.py <built.pptx> <reference.pptx> <output.pptx>
"""
import re
import shutil
import sys
import zipfile

CT_DEFAULT = '<Default ContentType="application/x-fontdata" Extension="fntdata"/>'
REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"

# <p:presentation> child order per the PML schema. embeddedFontLst must follow
# notesSz/smartTags and precede custShowLst/photoAlbum/.../defaultTextStyle.
AFTER_CANDIDATES = ["</p:notesSz>", "</p:sldSz>"]
BEFORE_CANDIDATES = [
    "<p:custShowLst", "<p:photoAlbum", "<p:custDataLst", "<p:kinsoku",
    "<p:defaultTextStyle", "<p:modifyVerifier", "<p:extLst",
]


def read_all(path):
    with zipfile.ZipFile(path) as z:
        return {n: z.read(n) for n in z.namelist()}


def main(built, reference, out):
    pkg = read_all(built)
    ref = read_all(reference)

    ref_pres = ref["ppt/presentation.xml"].decode("utf8")
    m = re.search(r"<p:embeddedFontLst>.*?</p:embeddedFontLst>", ref_pres, re.S)
    if not m:
        print("reference has no embeddedFontLst; nothing to do")
        shutil.copyfile(built, out)
        return 0
    font_lst = m.group(0)

    ref_rels = ref["ppt/_rels/presentation.xml.rels"].decode("utf8")
    ref_font_rels = dict(
        re.findall(r'<Relationship Id="([^"]+)"[^>]*Target="(fonts/[^"]+)"[^>]*%s' % "Type=\"" + REL_TYPE, ref_rels)
    ) if False else {
        rid: tgt
        for rid, tgt in re.findall(
            r'<Relationship Id="([^"]+)"\s+Target="(fonts/[^"]+)"\s+Type="[^"]*/font"\s*/>', ref_rels
        )
    }
    if not ref_font_rels:
        # attribute order varies; fall back to a looser scan
        for rel in re.findall(r"<Relationship[^>]*/>", ref_rels):
            if "/font" in rel and "fonts/" in rel:
                rid = re.search(r'Id="([^"]+)"', rel).group(1)
                tgt = re.search(r'Target="([^"]+)"', rel).group(1)
                ref_font_rels[rid] = tgt
    if not ref_font_rels:
        print("ERROR: reference declares fonts but no font relationships found")
        return 1

    # ── 1. copy the font parts ──
    for tgt in ref_font_rels.values():
        part = "ppt/" + tgt
        if part not in ref:
            print(f"ERROR: missing font part {part} in reference")
            return 1
        pkg[part] = ref[part]

    # ── 2. content type ──
    ct = pkg["[Content_Types].xml"].decode("utf8")
    if "fntdata" not in ct:
        ct = ct.replace("<Types ", "<Types ", 1)
        idx = ct.index(">", ct.index("<Types ")) + 1
        ct = ct[:idx] + CT_DEFAULT + ct[idx:]
        pkg["[Content_Types].xml"] = ct.encode("utf8")

    # ── 3. relationships, renumbered so they cannot collide ──
    rels = pkg["ppt/_rels/presentation.xml.rels"].decode("utf8")
    used = {int(n) for n in re.findall(r'Id="rId(\d+)"', rels)}
    next_id = (max(used) + 1) if used else 1

    remap = {}
    add = []
    for old_rid, tgt in ref_font_rels.items():
        new_rid = f"rId{next_id}"
        next_id += 1
        remap[old_rid] = new_rid
        add.append(f'<Relationship Id="{new_rid}" Type="{REL_TYPE}" Target="{tgt}"/>')
    rels = rels.replace("</Relationships>", "".join(add) + "</Relationships>")
    pkg["ppt/_rels/presentation.xml.rels"] = rels.encode("utf8")

    # ── 4. splice embeddedFontLst in, with the remapped r:ids ──
    for old_rid, new_rid in remap.items():
        font_lst = font_lst.replace(f'r:id="{old_rid}"', f'r:id="{new_rid}"')

    pres = pkg["ppt/presentation.xml"].decode("utf8")
    if "<p:embeddedFontLst>" in pres:
        pres = re.sub(r"<p:embeddedFontLst>.*?</p:embeddedFontLst>", font_lst, pres, flags=re.S)
    else:
        pos = -1
        for tag in BEFORE_CANDIDATES:
            i = pres.find(tag)
            if i != -1:
                pos = i
                break
        if pos == -1:
            for tag in AFTER_CANDIDATES:
                i = pres.find(tag)
                if i != -1:
                    pos = i + len(tag)
                    break
        if pos == -1:
            pos = pres.rindex("</p:presentation>")
        pres = pres[:pos] + font_lst + pres[pos:]

    if 'embedTrueTypeFonts="true"' not in pres:
        pres = re.sub(r"<p:presentation(\s)", r'<p:presentation embedTrueTypeFonts="true"\1', pres, count=1)
    pkg["ppt/presentation.xml"] = pres.encode("utf8")

    # ── 5. rewrite the package ──
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in pkg.items():
            z.writestr(name, data)

    print(f"embedded {len(ref_font_rels)} fonts -> {out}")
    for rid, tgt in ref_font_rels.items():
        print(f"   {tgt}  ({rid} -> {remap[rid]})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3]))
