#!/usr/bin/env bash

set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MODE="${1:-}"
readonly FFMPEG_BIN="${FFMPEG_BIN:-/opt/homebrew/bin/ffmpeg}"
readonly CURL_BIN="${CURL_BIN:-curl}"

cd "$PROJECT_ROOT"

case "$MODE" in
  ""|--identity-only) ;;
  *)
    echo "Usage: $0 [--identity-only]" >&2
    exit 2
    ;;
esac

if ! command -v "$CURL_BIN" >/dev/null 2>&1; then
  echo "curl is required to download the approved teacher photo: $CURL_BIN" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'from PIL import Image, ImageDraw, ImageFont, ImageOps'; then
  echo "Python Pillow is required to prepare teacher and social media" >&2
  exit 1
fi

# Approved teacher photo source; the face is only resized, never generated or retouched.
# https://www.ct-bratan.by/assets/lyudmila-ershova-BAE4kYzB.jpg
readonly TEACHER_SOURCE_URL="https://www.ct-bratan.by/assets/lyudmila-ershova-BAE4kYzB.jpg"
readonly TEACHER_SOURCE_SHA256="e34ebd4fb1ad4261c9831d6f0a28ab27320ad2eed2ff0c15b053bb5045329caa"

prepare_identity_assets() (
  set -euo pipefail

  local actual_sha256 media_temp_dir teacher_source
  media_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/octopus-identity.XXXXXX")"
  trap 'rm -rf -- "$media_temp_dir"' EXIT
  teacher_source="$media_temp_dir/lyudmila-source.jpg"

  mkdir -p public/media
  "$CURL_BIN" -fsSL --retry 3 "$TEACHER_SOURCE_URL" -o "$teacher_source"

  actual_sha256="$(python3 - "$teacher_source" <<'PY'
from hashlib import sha256
from pathlib import Path
import sys

print(sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)"
  if [[ "$actual_sha256" != "$TEACHER_SOURCE_SHA256" ]]; then
    echo "Teacher photo checksum mismatch: expected $TEACHER_SOURCE_SHA256, got $actual_sha256" >&2
    exit 1
  fi

  python3 - "$teacher_source" public/media/lyudmila.webp public/media/og-background.png public/og-image.jpg <<'PY'
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

source_path, webp_path, background_path, og_path = map(Path, sys.argv[1:])
resampling = Image.Resampling.LANCZOS

with Image.open(source_path) as source:
    teacher_source = ImageOps.exif_transpose(source).convert('RGB')

teacher_webp = teacher_source.copy()
teacher_webp.thumbnail((960, 960), resampling)
teacher_webp.save(webp_path, 'WEBP', quality=82, method=6)

with Image.open(background_path) as source:
    background = ImageOps.fit(
        ImageOps.exif_transpose(source).convert('RGB'),
        (1200, 630),
        method=resampling,
    ).convert('RGBA')

overlay = Image.new('RGBA', background.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# All important content stays inside the 1080 x 566 safe area: x=60..1140, y=32..598.
draw.rounded_rectangle((60, 45, 1140, 585), radius=48, fill=(255, 255, 255, 224))

bold_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
regular_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font_brand = ImageFont.truetype(bold_path, 24)
font_title = ImageFont.truetype(bold_path, 82)
font_subtitle = ImageFont.truetype(bold_path, 48)
font_detail = ImageFont.truetype(regular_path, 25)
font_price = ImageFont.truetype(bold_path, 66)
font_period = ImageFont.truetype(bold_path, 27)
font_teacher = ImageFont.truetype(bold_path, 25)
font_role = ImageFont.truetype(regular_path, 20)

purple = (91, 43, 217, 255)
purple_dark = (50, 18, 112, 255)
yellow = (255, 216, 77, 255)
white = (255, 255, 255, 255)

draw.rounded_rectangle((84, 72, 343, 116), radius=22, fill=purple)
draw.text((106, 81), 'ОСЬМИНОГ AI', font=font_brand, fill=white)
draw.text((82, 145), 'ЦЭ/ЦТ', font=font_title, fill=purple_dark, stroke_width=1)
draw.text((84, 237), 'по русскому', font=font_subtitle, fill=purple)
draw.text((86, 311), 'AI-репетитор • 7 дней бесплатно', font=font_detail, fill=purple_dark)

draw.rounded_rectangle((82, 377, 590, 535), radius=40, fill=yellow)
draw.text((112, 392), '49 BYN', font=font_price, fill=purple_dark)
draw.text((116, 477), '/ месяц', font=font_period, fill=purple_dark)

teacher = ImageOps.contain(teacher_source, (430, 430), method=resampling)
photo_mask = Image.new('L', teacher.size, 0)
ImageDraw.Draw(photo_mask).rounded_rectangle((0, 0, teacher.width - 1, teacher.height - 1), radius=44, fill=255)
photo_x, photo_y = 684, 67
draw.rounded_rectangle(
    (photo_x - 8, photo_y - 8, photo_x + teacher.width + 8, photo_y + teacher.height + 8),
    radius=52,
    fill=white,
)
overlay.paste(teacher.convert('RGBA'), (photo_x, photo_y), photo_mask)

draw.rounded_rectangle((722, 493, 1116, 566), radius=30, fill=purple_dark)
draw.text((749, 501), 'Людмила Ершова', font=font_teacher, fill=white)
draw.text((749, 535), 'автор методики • 20 лет', font=font_role, fill=white)

result = Image.alpha_composite(background, overlay).convert('RGB')
result.save(og_path, 'JPEG', quality=91, optimize=True, progressive=True)
PY
)

if [[ "$MODE" == "--identity-only" ]]; then
  prepare_identity_assets
  exit 0
fi

if ! command -v "$FFMPEG_BIN" >/dev/null 2>&1; then
  echo "ffmpeg not found: $FFMPEG_BIN" >&2
  exit 1
fi

if "$FFMPEG_BIN" -hide_banner -encoders 2>/dev/null | grep -q '[[:space:]]libwebp[[:space:]]'; then
  readonly HAS_FFMPEG_WEBP=true
else
  readonly HAS_FFMPEG_WEBP=false
  if ! python3 -c 'from PIL import features; raise SystemExit(not features.check("webp"))'; then
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

prepare_identity_assets

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
