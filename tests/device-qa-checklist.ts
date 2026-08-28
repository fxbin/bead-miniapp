/**
 * Device QA Checklist — #50
 *
 * This file documents the code-level small-screen and safety improvements
 * and provides a manual verification checklist for real device testing.
 *
 * Per protocol #49 rule 9: "涉及 UI 的修改必须说明真机/开发者工具验证结果；
 * 无法验证时明确标记需要人工验证。"
 *
 * The code changes in this PR address small-screen layout and safe area
 * issues programmatically. Real device verification is still required.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                      MANUAL VERIFICATION CHECKLIST                   │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │ Test matrix:                                                          │
 * │   [ ] iOS real device (e.g. iPhone 12/13/14/15)                      │
 * │   [ ] Android real device (e.g. Xiaomi/Huawei/Samsung)                │
 * │   [ ] Small screen simulation in DevTools (375px width)              │
 * │   [ ] WeChat DevTools latest stable                                  │
 * │                                                                      │
 * │ Core flow: 首页 → 选图 → 生成设置 → 生成 → Preview → 编辑 → Export    │
 * │                                                                      │
 * │ Home / Generate:                                                      │
 * │   [ ] Title not obscured by WeChat capsule button                     │
 * │   [ ] Image picker entry visible on small screens                     │
 * │   [ ] Size chips (32/48/64) not wrapping/squished on small screens    │
 * │   [ ] Three preset buttons fit on small screens                       │
 * │   [ ] Loading animation does not freeze UI                            │
 * │                                                                      │
 * │ Preview / Editor:                                                      │
 * │   [ ] Canvas renders correctly at 32/48/64 on all screen sizes       │
 * │   [ ] Adaptive cellSize: 64x64 grid fits on 375px screen              │
 * │   [ ] Bead holes are sharp on high-DPR devices (dpr scaling)          │
 * │   [ ] Pan/drag does not conflict with page scroll                     │
 * │   [ ] Original/pattern toggle state is consistent                     │
 * │   [ ] Color picker bottom sheet not cut by safe area                  │
 * │   [ ] Color picker respects safe-area-inset-bottom                    │
 * │                                                                      │
 * │ Export:                                                               │
 * │   [ ] Export preview is complete and readable                         │
 * │   [ ] Color list is scrollable for long lists                         │
 * │   [ ] Save to album: permission dialog + success/fail feedback         │
 * │   [ ] Exported image is clear when viewed in photo album              │
 * │                                                                      │
 * │ Performance:                                                          │
 * │   [ ] Image selection to settings page: < 2s                         │
 * │   [ ] Generate button to Preview: < 3s for 32/48, < 5s for 64         │
 * │   [ ] No UI freeze during generation                                  │
 * │   [ ] No OOM or Canvas init failure                                    │
 * │                                                                      │
 * │ Regression evidence:                                                  │
 * │   Device: ____  OS: ____  WeChat version: ____                        │
 * │   Issues found: ____                                                  │
 * │   Fix PR: ____                                                         │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// Code-level improvements in this PR:
//
// 1. Adaptive cellSize (preview.ts):
//    - On small screens, cellSize is reduced to fit grid within 90% of screen width
//    - Minimum cellSize is 6px to maintain usability
//    - 64x64 grid on 375px screen: cellSize ≈ 5px → clamped to 6px
//
// 2. Safe area adaptation (preview.wxss, app.wxss):
//    - Color picker bottom sheet: padding-bottom includes env(safe-area-inset-bottom)
//    - Global container: padding-bottom includes env(safe-area-inset-bottom)
//    - Prevents content from being obscured by home indicator on iPhone X+
//
// 3. Canvas DPR handling (preview.ts, already existed):
//    - canvas.width = totalWidth * dpr; ctx.scale(dpr, dpr)
//    - Ensures sharp rendering on high-DPR displays
//
// 4. Canvas size safety (imageAdapter.ts, from #51):
//    - getImageData wrapped in try/catch
//    - Canvas dimensions validated before use
