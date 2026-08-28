/**
 * Usability Test Framework — #45
 *
 * 真实用户可用性测试方案与观察记录框架。
 *
 * Per #45 Acceptance criteria:
 * - [ ] 至少完成一轮真实用户测试
 * - [ ] 核心流程不需要口头教学
 * - [ ] 主要理解障碍被记录并分类
 * - [ ] 能识别算法问题 vs UI 问题
 * - [ ] 得到"是否真的想拼"的明确反馈
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                      USABILITY TEST PLAN                              ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║ 1. TEST TARGET                                                          ║
 * ║    First round: 10–20 participants                                      ║
 * ║    Priority coverage:                                                   ║
 * ║    [ ] Bead crafters / handcraft enthusiasts (拼豆玩家/手作爱好者)       ║
 * ║    [ ] Pet owners with pet photos (有宠物照片的人)                       ║
 * ║    [ ] Anime / pixel art fans (动漫/像素创作兴趣用户)                    ║
 * ║    [ ] General users unfamiliar with beads (不熟悉拼豆的普通用户)        ║
 * ║                                                                        ║
 * ║ 2. TEST ENVIRONMENT                                                     ║
 * ║    [ ] WeChat preview version (体验版)                                 ║
 * ║    [ ] Observer + recording (screen recording + verbal consent)        ║
 * ║    [ ] NO verbal instruction — observe if user can self-discover        ║
 * ║    [ ] Post-test interview (5–10 min)                                   ║
 * ║                                                                        ║
 * ║ 3. OBSERVATION CHECKLIST                                                ║
 * ║                                                                        ║
 * ║    Step 1: Home / First Impression                                      ║
 * ║    [ ] Does user know what to do first?                                ║
 * ║    [ ] Time to first action: ___ seconds                               ║
 * ║    [ ] First reaction to title "拼豆图纸": ___                          ║
 * ║    [ ] Does user understand what the app does? Y / N                    ║
 * ║                                                                        ║
 * ║    Step 2: Image Selection                                             ║
 * ║    [ ] Does user find the "选图" entry? Y / N                           ║
 * ║    [ ] Album or camera? ___                                             ║
 * ║    [ ] Any confusion about image requirements? ___                     ║
 * ║                                                                        ║
 * ║    Step 3: Generation Settings                                         ║
 * ║    [ ] Does user understand 32/48/64 sizes? Y / N                       ║
 * ║      - If confused, what do they think the numbers mean? ___           ║
 * ║    [ ] Does user understand 易拼/平衡/高还原? Y / N                     ║
 * ║      - Which preset do they choose by default? ___                      ║
 * ║      - Can they explain the difference? ___                             ║
 * ║    [ ] Does user click "生成" without hesitation? Y / N                 ║
 * ║                                                                        ║
 * ║    Step 4: Preview                                                      ║
 * ║    [ ] First reaction to generated pattern: ___                         ║
 * ║    [ ] Does user zoom/pan? Y / N                                       ║
 * ║    [ ] Does user toggle original/pattern? Y / N                        ║
 * ║    [ ] Does user notice bead holes? Y / N                               ║
 * ║    [ ] Does user try editing? Y / N                                    ║
 * ║      - If yes, is the edit flow intuitive? Y / N                       ║
 * ║    [ ] Does user look at color list? Y / N                              ║
 * ║    [ ] Does user check bead counts? Y / N                               ║
 * ║                                                                        ║
 * ║    Step 5: Export                                                       ║
 * ║    [ ] Does user find export entry? Y / N                               ║
 * ║    [ ] Does user save to album? Y / N                                   ║
 * ║    [ ] Permission flow: smooth / confusing / failed                     ║
 * ║                                                                        ║
 * ║    Step 6: Post-Test Interview                                          ║
 * ║    [ ] "What did you think this app does?" ___                          ║
 * ║    [ ] "Was anything confusing?" ___                                    ║
 * ║    [ ] "Would you actually make this in real life?" Y / N / Maybe       ║
 * ║    [ ] "What would make you more likely to actually make it?" ___      ║
 * ║    [ ] "Would you recommend this to a friend?" Y / N                    ║
 * ║                                                                        ║
 * ║ 4. CLASSIFICATION                                                       ║
 * ║    Issues found should be tagged:                                       ║
 * ║    [UI] — interface/interaction problem                                ║
 * ║    [ALGO] — algorithm/output quality problem                           ║
 * ║    [CONTENT] — wording/terminology problem                              ║
 * ║    [FLOW] — process/navigation problem                                  ║
 * ║    [PERF] — performance/speed problem                                   ║
 * ║                                                                        ║
 * ║ 5. METRICS TO REPORT                                                   ║
 * ║    - First-generation completion rate: ___/___                          ║
 * ║    - Average time to first generation: ___ seconds                     ║
 * ║    - % who tried editing: ___%                                         ║
 * ║    - % who exported: ___%                                              ║
 * ║    - % who expressed desire to actually craft: ___%                    ║
 * ║    - Top 3 confusion points:                                           ║
 * ║      1. ___                                                            ║
 * ║      2. ___                                                            ║
 * ║      3. ___                                                            ║
 * ║                                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Results from this test feed directly into #46 (用户反馈驱动的算法与体验修正).
 */
