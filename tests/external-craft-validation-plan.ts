/**
 * External Craft Validation Framework — #36
 *
 * 外部真实制作验证方案与记录框架。
 *
 * Per #36: "项目负责人当前没有实体拼豆材料，因此 v0.2 不把
 * 自己购买整套材料并亲自制作设为前置条件。"
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              EXTERNAL CRAFT VALIDATION PLAN                           ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║ 1. VALIDATION CHANNELS (priority order)                                ║
 * ║    [ ] Channel 1: Bead crafters / handcraft enthusiasts               ║
 * ║    [ ] Channel 2: 闲鱼 / 小红书 sellers with bead-making ability        ║
 * ║    [ ] Channel 3: Commission 1-2 representative pieces for demo       ║
 * ║    [ ] Channel 4: Buy own materials only if absolutely necessary       ║
 * ║                                                                        ║
 * ║ 2. TARGET SAMPLES (3-5 representative works)                           ║
 * ║    [ ] Pet / cat (宠物/猫咪)                                           ║
 * ║    [ ] Portrait (人像)                                                 ║
 * ║    [ ] Anime / illustration (动漫/插画)                                  ║
 * ║    [ ] Logo / geometric (Logo/几何图形)                                  ║
 * ║    [ ] Landscape / multi-color (风景/多色照片)                           ║
 * ║                                                                        ║
 * ║    Minimum success: 1 complete external craft loop                     ║
 * ║    Target: 3-5 representative samples total                            ║
 * ║                                                                        ║
 * ║ 3. PROCESS PER SAMPLE                                                  ║
 * ║    [ ] Select original photo                                           ║
 * ║    [ ] Generate pattern in mini-program (32/48/64, preset)              ║
 * ║    [ ] Export craft sheet (图纸)                                       ║
 * ║    [ ] Send sheet to external tester                                   ║
 * ║    [ ] Tester crafts with their beads                                   ║
 * ║    [ ] Record process feedback                                         ║
 * ║    [ ] Photograph physical result                                      ║
 * ║    [ ] Compare: original → digital → physical                          ║
 * ║                                                                        ║
 * ║ 4. TWO VALIDATION LEVELS                                               ║
 * ║                                                                        ║
 * ║    A. Craftability validation                                          ║
 * ║    [ ] Is the sheet easy to read and follow?                           ║
 * ║    [ ] Are color codes / counts sufficient?                            ║
 * ║    [ ] Are similar colors too many or over-merged?                     ║
 * ║    [ ] Are isolated pixels a burden?                                   ║
 * ║    [ ] Does cleanup damage eyes/highlights/contours?                   ║
 * ║    [ ] Major perceptual differences between digital and physical?     ║
 * ║    [ ] Which steps need extra explanation?                             ║
 * ║                                                                        ║
 * ║    B. Color calibration validation (only if same brand: Artkal C)      ║
 * ║    [ ] Tester's actual brand: ___                                      ║
 * ║    [ ] If Artkal C: results can feed into #37 L2 calibration           ║
 * ║    [ ] If different brand: record but do NOT use for Artkal calibration║
 * ║                                                                        ║
 * ║ 5. ISSUE CLASSIFICATION                                                ║
 * ║    [PALETTE] — color palette problem                                   ║
 * ║    [ALGORITHM] — algorithm/output quality problem                     ║
 * ║    [UI-EXPORT] — export/sheet presentation problem                     ║
 * ║    [BRAND-MISMATCH] — difference due to brand, not algorithm           ║
 * ║                                                                        ║
 * ║ 6. SAMPLE RECORD TEMPLATE                                              ║
 * ║    Sample #: ___                                                       ║
 * ║    Category: pet/portrait/anime/logo/landscape                          ║
 * ║    Original photo: [attached]                                          ║
 * ║    Grid size: 32/48/64                                                  ║
 * ║    Preset: easy/balanced/fidelity                                       ║
 * ║    Tester bead brand: ___                                              ║
 * ║    Tester experience level: beginner/intermediate/expert              ║
 * ║    Craft time: ___ hours                                               ║
 * ║    Process feedback:                                                   ║
 * ║      - Sheet readability: easy/medium/hard                             ║
 * ║      - Color list usefulness: yes/no/partial                           ║
 * ║      - Similar color issues: ___                                       ║
 * ║      - Isolated pixel issues: ___                                      ║
 * ║      - Cleanup damage: none/minor/significant                          ║
 * ║    Physical result: [photo attached]                                   ║
 * ║    Digital vs physical comparison: ___                                 ║
 * ║    Issues found:                                                       ║
 * ║      1. [CATEGORY] description                                         ║
 * ║      2. [CATEGORY] description                                         ║
 * ║    Overall verdict: would-make-again / needs-improvement / not-worth  ║
 * ║                                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Results from this validation feed into:
 * - #37 (palette calibration, only if same brand)
 * - #40 (preset tuning, if craftability issues found)
 * - #46 (convergence fixes, all issues)
 */
