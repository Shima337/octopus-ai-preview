#!/usr/bin/env bash

set -euo pipefail

readonly FFMPEG_BIN="${FFMPEG_BIN:-/opt/homebrew/bin/ffmpeg}"

if ! command -v "$FFMPEG_BIN" >/dev/null 2>&1; then
  echo "ffmpeg not found: $FFMPEG_BIN" >&2
  exit 1
fi

if "$FFMPEG_BIN" -hide_banner -encoders 2>/dev/null | grep -q '[[:space:]]libwebp[[:space:]]'; then
  readonly HAS_FFMPEG_WEBP=true
else
  readonly HAS_FFMPEG_WEBP=false
  if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'from PIL import features; raise SystemExit(not features.check("webp"))'; then
    echo "Neither ffmpeg libwebp nor Python Pillow WebP support is available" >&2
    exit 1
  fi
fi

readonly SOURCES=(
  "/Users/user/Downloads/IMG_8074.MOV"
  "/Users/user/Downloads/IMG_8403.MOV"
  "/Users/user/Downloads/IMG_8404.MOV"
  "/Users/user/Downloads/IMG_8405.MOV"
  "/Users/user/Downloads/IMG_8406.MOV"
)

for source in "${SOURCES[@]}"; do
  if [[ ! -r "$source" ]]; then
    echo "Media source is not readable: $source" >&2
    exit 1
  fi
done

mkdir -p public/media/games

for index in "${!SOURCES[@]}"; do
  number=$(printf '%02d' "$((index + 1))")
  source="${SOURCES[$index]}"

  "$FFMPEG_BIN" -y -i "$source" -an \
    -vf "scale=720:-2:flags=lanczos" \
    -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p \
    -movflags +faststart -crf 24 \
    "public/media/games/game-${number}.mp4"

  if [[ "$HAS_FFMPEG_WEBP" == true ]]; then
    "$FFMPEG_BIN" -y -ss 00:00:01 -i "$source" -frames:v 1 \
      -vf "scale=480:-2:flags=lanczos" \
      -c:v libwebp -quality 78 \
      "public/media/games/game-${number}.webp"
  else
    "$FFMPEG_BIN" -hide_banner -loglevel error -ss 00:00:01 -i "$source" -frames:v 1 \
      -vf "scale=480:-2:flags=lanczos" -f image2pipe -c:v png - \
      | python3 -c 'import sys; from PIL import Image; Image.open(sys.stdin.buffer).save(sys.argv[1], "WEBP", quality=78, method=6)' \
        "public/media/games/game-${number}.webp"
  fi
done
