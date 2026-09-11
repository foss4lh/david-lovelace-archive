#!/usr/bin/env bash
set -euo pipefail

# Render the 4-tier archive delivery structure diagram to a crisp PNG image
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_IMG_DIR="$ROOT_DIR/docs/images"
mkdir -p "$DOCS_IMG_DIR"

MMD_TMP="$(mktemp /tmp/bid-diagram-XXXXXX.mmd)"
CSS_TMP="$(mktemp /tmp/bid-diagram-XXXXXX.css)"
OUT_PNG="$DOCS_IMG_DIR/archive-structure.png"

cat << 'EOF' > "$MMD_TMP"
flowchart TD
    classDef default fill:#f8f9fa,stroke:#2b2d42,stroke-width:1.5px,color:#2b2d42,font-family:sans-serif;
    classDef tier1 fill:#edf2f4,stroke:#2b2d42,stroke-width:2px;
    classDef tier2 fill:#e8f4f8,stroke:#1d3557,stroke-width:1.5px;
    classDef tier3 fill:#eaf4ec,stroke:#2a9d8f,stroke-width:1.5px;
    classDef tier4 fill:#fbf0ea,stroke:#e76f51,stroke-width:1.5px;

    T1["<b>1. Permanent Archive Copies</b> (Hard Disks)<br/>HARC Deposit • Woolhope Club Library • Data Orchard Master"]:::tier1
    T2["<b>2. Immediate Direct Downloads</b><br/>Web Download Portal: Original Tithe Map Scans, Photos, Documents"]:::tier2
    T3["<b>3. Fast Web Map Layers</b><br/>Streamable Map Layers: Instant browser display, zero server costs"]:::tier3
    T4["<b>4. Public Web Explorer</b><br/>Interactive Community Web Map: Parish search, historical slider, mobile-friendly"]:::tier4

    T1 --> T2
    T1 --> T3
    T3 --> T4
EOF

cat << 'EOF' > "$CSS_TMP"
.node rect, .node circle, .node ellipse, .node polygon, .node path {
    rx: 8px;
    ry: 8px;
}
.node .label {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: 14px;
    line-height: 1.5;
}
EOF

echo "Rendering diagram to $OUT_PNG..."
npx -y @mermaid-js/mermaid-cli \
    -i "$MMD_TMP" \
    -o "$OUT_PNG" \
    -b white \
    -s 2 \
    -t neutral \
    -C "$CSS_TMP"

rm -f "$MMD_TMP" "$CSS_TMP"

echo "Successfully generated $OUT_PNG"
