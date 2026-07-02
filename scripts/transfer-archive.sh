#!/bin/bash
# David Lovelace Archive — Transfer Script
# Save this file, then: bash transfer-archive.sh
# Transfers ~2.8T from external SSD to openclaw server.
# Each step shows real-time progress with speed and ETA.

SRC="/media/robin/foss4lh/david-lovelace-archive"
PASS="bis2602"
DEST="clausrl@openclaw:/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean"
LOG="$HOME/dla-transfer-$(date +%Y%m%d-%H%M).log"

echo "============================================" | tee -a "$LOG"
echo " David Lovelace Archive — Transfer"          | tee -a "$LOG"
echo " Started: $(date)"                           | tee -a "$LOG"
echo " Log: $LOG"                                  | tee -a "$LOG"
echo "============================================" | tee -a "$LOG"

start_ts=$(date +%s)

run() {
  local label="$1" cmd="$2"
  echo "" | tee -a "$LOG"
  echo "━━━ $label ━━━" | tee -a "$LOG"
  echo "  Started: $(date)" | tee -a "$LOG"
  echo "" | tee -a "$LOG"

  # Print progress to terminal AND log
  eval "$cmd" 2>&1 | tee -a "$LOG"

  local rc=${PIPESTATUS[0]}
  if [ "$rc" = 0 ]; then
    echo "  ✅ $label done at $(date)" | tee -a "$LOG"
  else
    echo "  ❌ $label FAILED (exit $rc)" | tee -a "$LOG"
  fi
}

# ── 1. Habitat (32G) ──
run "Habitat (32G)" \
  "sshpass -p '$PASS' rsync -av --info=progress2 '$SRC/Habitat/' '$DEST/habitat-surveys/'"

# ── 2. AirPhotos (408G) ──
run "AirPhotos (408G)" \
  "sshpass -p '$PASS' rsync -av --info=progress2 '$SRC/AirPhotos/' '$DEST/aerial-photography/'"

# ── 3. Maps (538G) ──
run "Maps (538G)" \
  "sshpass -p '$PASS' rsync -av --info=progress2 '$SRC/Maps/' '$DEST/maps/'"

# ── 4. History (912G) ──
run "History (912G)" \
  "sshpass -p '$PASS' rsync -av --info=progress2 '$SRC/History/' '$DEST/historical-documents/'"

# ── 5. Places.zip (155G) ──
run "Places.zip (155G)" \
  "sshpass -p '$PASS' rsync -av --progress '$SRC/Places.zip' '$DEST/projects/source-zips/'"

# ── 6. Projects.zip (717G) ──
run "Projects.zip (717G)" \
  "sshpass -p '$PASS' rsync -av --progress '$SRC/Projects.zip' '$DEST/projects/source-zips/'"

# ── Summary ──
elapsed=$(( $(date +%s) - start_ts ))
printf "\n============================================\n" | tee -a "$LOG"
printf " All transfers complete\n"                  | tee -a "$LOG"
printf " Finished: %s\n" "$(date)"                  | tee -a "$LOG"
printf " Duration: %d:%02d hr:min\n" $((elapsed/3600)) $((elapsed%3600/60)) | tee -a "$LOG"
printf " Log saved to: %s\n" "$LOG"                 | tee -a "$LOG"
printf "============================================\n" | tee -a "$LOG"
