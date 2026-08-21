# Media slots

This directory is optional. The demo works when every media file is missing and
shows an in-app placeholder until a local file is configured in `src/content.js`.

Each media slot may contain these local variants:

| Slot | Video | Poster | Russian captions | Russian audio |
| --- | --- | --- | --- | --- |
| `city-intro` | `city-intro.mp4` | `city-intro.webp` | `city-intro.ru.vtt` | `city-intro.ru.mp3` |
| `mirror-post` | `mirror-post.mp4` | `mirror-post.webp` | `mirror-post.ru.vtt` | `mirror-post.ru.mp3` |
| `secret-locks` | `secret-locks.mp4` | `secret-locks.webp` | `secret-locks.ru.vtt` | `secret-locks.ru.mp3` |
| `trick-market` | `trick-market.mp4` | `trick-market.webp` | `trick-market.ru.vtt` | `trick-market.ru.mp3` |
| `message-station` | `message-station.mp4` | `message-station.webp` | `message-station.ru.vtt` | `message-station.ru.mp3` |

Only use local, reviewed files. Configure a slot with relative local paths; do
not add remote media dependencies.
