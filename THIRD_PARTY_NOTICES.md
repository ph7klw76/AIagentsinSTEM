# Third-party notices

Course application code is distributed under GPL-3.0-or-later; see LICENSE. Newly authored quiz text and lesson summaries use CC BY 4.0 in native metadata. Linked YouTube videos, source slides and existing narration retain their original rights and attribution; no original video binary is published in this repository.

H5P core is from `h5p/h5p-php-library`, pinned to the exact revision in `vendor/provenance.json`; its original GPL license is retained in `vendor/h5p-core.zip`. Runtime and editor libraries come from the official H5P Hub archive, with H5P.Video replaced by the complete compatible official 1.6.81 library. Versions, individual source-file checksums, authors and upstream license declarations are retained in that provenance record.

Some older Hub libraries omit both a `license` metadata field and a license file. Their official README declarations, including complete MIT permission and copyright notices, are retained inside each affected library as `UPSTREAM_LICENSE.txt`. These files are copied verbatim from the official repository, with the upstream README blob SHA and SHA-256 recorded. No library version is renamed to imitate a newer adapter.

Font Awesome 4.x is by Dave Gandy. Its fonts use SIL OFL 1.1, its CSS/LESS code uses MIT, and its documentation uses CC BY 3.0, as specified by [Font Awesome's v4 license page](https://fontawesome.com/v4/license/). Embedded font files and their original metadata remain unchanged.

Lumi's `@lumieducation/h5p-server` and `@lumieducation/h5p-html-exporter` 10.0.4 are GPL-3.0-or-later. Their source is available from [Lumi's H5P Node.js library](https://github.com/Lumieducation/H5P-Nodejs-library). NPM versions, transitive integrity hashes and upstream notices are retained in the lockfile and installed packages.

The JupyterLite/Pyodide application and its packages retain their upstream licenses and notices. The Python and NPM lockfiles pin the tested build dependencies. Existing Remotion media was produced in the separate local production workspace; Remotion is source-available with conditional licensing, and is not represented here as unrestricted OSI software. No new Remotion render was performed by the course build.
