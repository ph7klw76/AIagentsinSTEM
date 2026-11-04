# Build, media and edition guide

The supplied chapter MP4s are read-only inputs. `scripts/audit-media.py` probes and hashes them and records representative decoded frames. Set `COURSE_MEDIA_SOURCE`, `FFMPEG` and `FFPROBE` for a different machine; the current authoring workspace is documented in the delivery report.

`scripts/recover-captions.py` compares three speech-containing windows from each existing production clip with the chapters. Accepted matches require strong normalized correlation and a consistent clock. `scripts/transcribe-caption-gaps.py` uses the installed offline Whisper small.en model only for uncovered speech. `scripts/finalize-captions.py` preserves cue provenance and explicit terminology corrections. ASR gap wording still needs targeted perceptual review before installing captions on a new YouTube upload; automatic timing and text review are not a human listening score.

After inspecting the recovered captions:

```text
python scripts/finalize-captions.py
python scripts/media-kit.py
python scripts/verify-media-sync.py
```

Use a Python environment with NumPy/SciPy for synchronization checks. The local pipeline uses the existing isolated media/verification environments. Earlier packaging attempts are retained. The `*_1080p30_v03.mp4` files are the final local editions, with corrected chapter markers aligned to the acoustic source sections. V01 attempts with a conflicting optional text-subtitle track are not upload candidates. SRT/VTT remain separate, and the source's burned captions are preserved with the picture.

The final picture is stream-copied H.264 at 1920×1080 and 30 fps. A static audio gain targets approximately −16 LUFS, bounded by peak headroom; measured AAC peaks must remain ≤−1 dBTP. The 48 kHz/24-bit WAV is an uncompressed delivery master derived from the complete chapter AAC, so source compression remains. It is not claimed to restore a lost studio recording. Source color tags are reported exactly; untagged source pictures are not silently described as a color-converted new render.

On first JupyterLite use, wait for the kernel status to read **Idle** before **Run → Run All Cells**. The regression test checks that actual state, handles the optional kernel chooser and fails promptly on a Python traceback. Windows finalization excludes the manifest itself using normalized paths. A borderless HTML root and a small iframe-height allowance accommodate fractional pixel rounding without clipping content or using document height as a feedback loop.

Verification compares actual decoded RGB frames at opening, review, checkpoint and closing with each original. It correlates decoded final AAC with the WAV at three speech anchors, counts frames during full audio/video decoding, checks chapters and confirms the originals' hashes. Media durations and pictures retain zero timing changes. Questions are newly authored; there was no old H5P question schedule in the empty repository, so their old-to-new delta is not defined.

For isolated finished-MP4 H5P review:

```text
node scripts/build.mjs --local-preview
# Set LOCAL_MEDIA=1 for this owned loopback server only.
node scripts/serve.mjs
```

Open `http://127.0.0.1:4173/__preview/index.html`. The media route refuses to serve a missing finished v03 MP4. The preview is ignored, local-only and distinct from the public/native YouTube source. It is not evidence of YouTube streaming and is not a public fallback.

Each local upload kit includes a final MP4, matching WAV, SRT/VTT, thumbnail, chapter metadata, YouTube description, quiz CSV and measured report. If uploading this new mastered edition, use **Create → Upload videos** in YouTube Studio, select the exact v03 MP4, install the corresponding thumbnail/description/captions, review the copyright and disclosure settings, and obtain a new video ID. Native YouTube quiz availability depends on the channel. The CSV is an entry kit, not proof that channel quiz features were installed.

After the native/HTML build and media verification, run `node scripts/delivery-kit.mjs` to stage final editions in the sibling `AIagentsinSTEM-delivery` directory. It verifies master hashes, keeps earlier packaging attempts out, includes every answer and its feedback in the CSV, and supplies both individual native/HTML files and a ZIP with library provenance/licenses. MP4/WAV files use local hard links when available; copying a delivery folder to another disk produces ordinary complete files.

Real-player regression commands use `COURSE_REAL_STREAM=1` with `npx playwright test --grep 'real YouTube streaming|real chapter queue'`. Set `COURSE_BASE_URL=https://ph7klw76.github.io` for public checks; paths retain `/AIagentsinSTEM/`. Without that variable the owned loopback server is used. `npx playwright test --grep 'native fixture'` checks the final local MP4 preview. CI creates explicitly labelled synthetic fixtures instead. Set environment variables using the syntax appropriate to your shell; on Windows use `npx.cmd`.

The bridge acknowledges the latest external seek before the learner's next Play action, rejects messages from other origins/windows and measures the native content when resizing the iframe. Touch H5P may enter fullscreen automatically: use its accessible Exit Fullscreen control before returning to external chapter controls. Fullscreen/return, queued seeks, reset and the complete Summary are exercised through real controls.

Send the actual new URL after processing completes. Verify metadata, source ID, representative polished frames, synchronized events and embedded streaming before replacing `youtubeId` in central configuration. Retain `originalYoutubeId` for rollback. Rebuild native packages and HTML, rerun the real learning paths, and merge/deploy only the checked revision. The existing course can continue to use the ten explicitly supplied URLs while optional new mastered editions remain unactivated.

The ordinary source/site build uses the frozen archives in `vendor/`. An intentional upstream refresh uses `scripts/audit-inputs.mjs`, `scripts/prepare-upstream.mjs` and `scripts/retain-licenses.mjs`, followed by license review, regeneration, import and real-player tests. It is not an automatic step on every deployment.
