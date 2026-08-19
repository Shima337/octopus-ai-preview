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

readonly GAME_SOURCES=(
  "/Users/user/Downloads/IMG_8074.MOV"
  "/Users/user/Downloads/IMG_8403.MOV"
  "/Users/user/Downloads/IMG_8404.MOV"
  "/Users/user/Downloads/IMG_8405.MOV"
  "/Users/user/Downloads/IMG_8406.MOV"
)

readonly REVIEW_SOURCES=(
  "/Users/user/Desktop/video1.mp4"
  "/Users/user/Desktop/video3.mp4"
  "/Users/user/Desktop/video4.mp4"
  "/Users/user/Desktop/video5.mp4"
  "/Users/user/Desktop/video.mp4"
  "/Users/user/Desktop/2026-08-19 15.26.00.mp4"
  "/Users/user/Desktop/2026-08-19 15.25.54.mp4"
)

for source in "${GAME_SOURCES[@]}" "${REVIEW_SOURCES[@]}"; do
  if [[ ! -r "$source" ]]; then
    echo "Media source is not readable: $source" >&2
    exit 1
  fi
done

mkdir -p public/media/games public/media/reviews

for index in "${!GAME_SOURCES[@]}"; do
  number=$(printf '%02d' "$((index + 1))")
  source="${GAME_SOURCES[$index]}"

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

for index in "${!REVIEW_SOURCES[@]}"; do
  number=$(printf '%02d' "$((index + 1))")
  source="${REVIEW_SOURCES[$index]}"

  "$FFMPEG_BIN" -y -i "$source" \
    -map 0:v:0 -map 0:a:0? \
    -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -movflags +faststart -crf 24 \
    "public/media/reviews/review-${number}.mp4"

  if [[ "$HAS_FFMPEG_WEBP" == true ]]; then
    "$FFMPEG_BIN" -y -ss 00:00:01 -i "$source" -frames:v 1 \
      -vf "scale=400:400:force_original_aspect_ratio=increase,crop=400:400" \
      -c:v libwebp -quality 78 \
      "public/media/reviews/review-${number}.webp"
  else
    "$FFMPEG_BIN" -hide_banner -loglevel error -ss 00:00:01 -i "$source" -frames:v 1 \
      -vf "scale=400:400:force_original_aspect_ratio=increase,crop=400:400" -f image2pipe -c:v png - \
      | python3 -c 'import sys; from PIL import Image; Image.open(sys.stdin.buffer).save(sys.argv[1], "WEBP", quality=78, method=6)' \
        "public/media/reviews/review-${number}.webp"
  fi
done
