# Verification / 29 October 2026

## Passed

`node --test tests/physics.test.mjs`: **14 tests passed, 0 failed** on Node.js v22.18.0.

Follow-up correction: the original visual board normal used reversed horizontal signs, so the rendered plane rose in the physics acceleration direction. Corrected the display normal, preserving the intended input directions. Added regressions using Three.js quaternions to verify downhill height change for every cardinal/diagonal input and agreement between rendered board orientation and local gravity. An independent QA agent confirmed the original defect. The initial 12 physics-only tests did not cover this rendering/physics mismatch.

Coverage: equal-height neutrality, backwards input example, deadzone and input separation, maximum radial tilt, stationary floor contact, acceleration/coasting/counter-tilt reversal, mud threshold and slowing, hole falls, rails and barrier collisions, uphill ramp support and downhill acceleration, goal settling, rate-limited travel facing, and timestep consistency.

`node --check game.js`: passed. `node build.mjs`: prepared static output successfully.

Browser QA in the Codex in-app browser at http://127.0.0.1:8788:

- Course renders with four physical openings, two ramps, mud, rails, barriers, sphere and goal.
- Cabin view renders from inside the transparent shell, with reduced seam opacity.
- W held for approximately 0.9 seconds produced a visible speed reading of 1.24 m/s. A later opposite S input produced a 0.19 m/s reading; the automated test independently verifies slowing and reversal without intervening collisions.
- Reset restored 0.00 m/s and 0.0° tilt.
- Course/cabin buttons work. Preview screenshots saved beside the source folder.
- No runtime JavaScript errors observed. An initial deprecated PCFSoftShadowMap warning was addressed by using PCFShadowMap; the browser log retains that historical message from before the fix.
- Browser reports no VR headset detected, and the entry button clearly reflects that state.

## Not yet verified

Actual Quest 3 stereo rendering, controller mapping on hardware, seated scale, tracking loss/recovery, frame rate and comfort. The included tests are not a substitute for device testing.

The custom sphere/height-field collision model deliberately simplifies hole-rim support and sharp ramp transitions. Those are prototype limitations, described in README.md.

## Hosting

The public GitHub Pages build uses the generated `docs/` folder. All runtime module references are relative so the game can run below the repository's `/tilt-sphere/` URL prefix. Local development metadata is excluded from the repository.
