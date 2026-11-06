# AI agents in STEM

An English course by Dr Woon Kai Lin, produced as an individual. Ten supplied videos are retained in the requested order: **1, 2, 3, 4, 5, 5.1, 6, 6.1, 7, 8**.

The learning path combines one **Watch & Question** player with chapter controls, a pausing concept checkpoint, misconception-specific feedback, a native remediation jump, retry, a two-part Summary and a submit/review screen. Independent practice, a Python laboratory and an unfamiliar transfer task follow the lesson. Static practice has no account-linked grade persistence.

The repository was empty at the initial audit. Existing polished local chapter media, narration and caption sources were reused; unrelated video production work is preserved outside this repository. The active edition uses the supplied YouTube IDs in `course.config.json`. Local remastered upload kits are separate editions and are not public fallbacks.

## Build and check

Use Node 24 and Python 3.12. Commands below are portable; on Windows use `npm.cmd` and your environment's Python executable.

```text
npm ci --ignore-scripts
python -m venv .venv
python -m pip install -r requirements-course.lock.txt
python scripts/execute-notebook.py
npm run build
npm test
node scripts/import-h5p.mjs
python -m jupyterlite_core.app build --contents content/lab --output-dir dist/lite
node scripts/finalize-build.mjs
npm run serve
```

Activate the virtual environment before the Python commands. Visit `http://127.0.0.1:4173/AIagentsinSTEM/`. The exact repository prefix is required and is used throughout the build and browser checks.

`dist/downloads/` contains **20 real native H5P ZIP archives**, each with metadata, parameters and libraries: ten interactive videos and ten independent practice activities. `dist/exports/` contains the corresponding **20 Lumi HTML exports**. The lesson HTML uses the same authored native content and Lumi's exporter, not a replacement custom quiz.

The corrected official H5P.Video **1.6.81** adapter requires H5P core API **1.28**. A host limited to core 1.27 must be upgraded before importing these native packages. The exported HTML bundles its tested core and runtime. Serve YouTube HTML exports over HTTP(S); `file://` may lack the referrer YouTube requires. Standalone independent practice contains no video dependency. Native import was tested through Lumi's open-source H5P server; authenticated LMS import/grade reporting is a separate, untested host operation.

## Editable sources

- `course.config.json`: course order, active/original video IDs, frame counts, chapters, questions, distractor feedback and review targets.
- `scripts/h5p.mjs`: native parameters and genuine Lumi HTML exports, with compatible Summary serialization.
- `web/`: responsive course and origin-validated player bridge. External chapters seek the same H5P instance; readiness supports queued actions.
- `content/captions/`: editable acoustic caption cues, SRT and VTT. Provenance distinguishes recovered canonical cues from ASR-filled gaps.
- `content/lab/scientific_model.py`: SI-unit analytical and independent discrete checks. The notebook embeds this exact model.
- `scripts/prepare-notebook.py`: regenerate the notebook after changing its canonical model.
- `vendor/`: pinned official libraries/core, licenses and per-file provenance/checksums. Normal builds use these frozen archives; they do not fetch mutable upstream code.
- `scripts/media-kit.py` and `scripts/verify-media-sync.py`: local timing-preserving media packaging, loudness, full decode and independent synchronization checks. Full lecture rendering does not run on every Pages push.

The existing Remotion project is `../remotion-studio` in the established local workspace. Its original compositions and production scripts are retained there; follow its `AGENTS.md`, README and installed official skills for visual edits. The current course task stream-copies existing polished video pictures and masters audio; it does not synthesize new speech or change visible lip movements.

## Scientific scope

The executable lab compares a uniform small-strain axial bar's analytical solution with an assembled 1D finite-element equilibrium solve. It independently locates a single-pole amplifier's half-power cutoff and tests gain and bandwidth separately. A clearly labelled synthetic occupancy sequence shows why a small mean is not proof of zero events.

These teaching checks do not validate arbitrary 3D FEM models, ORCA calculations, real amplifier hardware or the recorded GROMACS bilayer. The notebook states its boundary conditions, units, parameter limits and omitted physics. Existing recorded demonstrations retain the qualifications in their source videos.

## Verification and publication

`evidence/` distinguishes local media checks, browser contexts, native imports, desktop/Pyodide computation and public deployment evidence. A previous green run is not evidence for another revision. `tests/learning-path.mjs` exercises real controls, natural timestamp crossing, pause stability, specific feedback, remediation, reset/retry, scoring and all Summary statements.

CI creates ignored synthetic color/silence MP4s to exercise native H5P interactions at the authored timestamps. Those fixtures are **not lecture playback evidence** and never enter Pages or native downloads. Hosted YouTube checks are explicitly **startup-only**; real streaming is checked separately on an accessible network. No timeout is converted into a streaming pass.

The workflow builds and checks feature-branch pull requests and pushes to `main`. Only a checked push to `main` can deploy through the `github-pages` environment and its required approvals. The public build includes exact resource hashes and its source revision. Media masters, voice profiles, weights, caches, environments and credentials are excluded by both ignore rules and a publication allowlist.

For a new upload, keep the original IDs for rollback, verify the actual new URL and decoded playback, update central configuration, regenerate and test both native and HTML exports, then publish the reviewed revision. A local MP4, an HTTP 200 response or a source push does not establish that a new YouTube edition is available.

See [build and media guide](docs/build-and-media.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Section 9 — Interactive workshop

[Watch the workshop held on 6 November 2026](https://ph7klw76.github.io/AIagentsinSTEM/workshop-09/). The 26:48 professional edit includes the original voice, existing results, English captions, chapter navigation, review questions, and downloadable reflection notes. Source: `web/workshop-09/`.
