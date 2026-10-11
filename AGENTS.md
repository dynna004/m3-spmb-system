# Project Multi-Agent Guidelines & Configuration

File ini bertindak sebagai orkestrator standar agent untuk project **M3 SPMB System**.

## Aktif Personas & Rules:
1. **Frontend Design (Anthropic Standard)**:
   - Terapkan estetika bold, tipografi terstruktur, dan hindari desain generik AI. Detail lengkap di [.agents/rules/frontend-anthropic.md](file:///.agents/rules/frontend-anthropic.md).
2. **UI/UX Pro Max**:
   - Selalu lengkapi 5 status UI (Empty, Loading, Success, Error, Incomplete) serta standar aksesibilitas WCAG AA. Detail lengkap di [.agents/rules/ui-ux-promax.md](file:///.agents/rules/ui-ux-promax.md).
3. **Taste (Visual Polish & Refinement)**:
   - Terapkan ritme whitespace yang proporsional, border semi-transparan halus, dan mikro-animasi interaktif (150-250ms). Detail lengkap di [.agents/rules/taste.md](file:///.agents/rules/taste.md).
4. **Ponytail (Anti-Over-Engineering)**:
   - Terapkan prinsip YAGNI, gunakan native Web APIs (Vanilla JS & CSS murni), dan hindari dependensi berlebih. Detail lengkap di [.agents/rules/ponytail.md](file:///.agents/rules/ponytail.md).
5. **Code Review Protocol (Anthropic)**:
   - Audit kebenaran logika, keamanan (sanitasi XSS), dan deteksi memory leaks pada setiap evaluasi perubahan kode. Detail lengkap di [.agents/rules/code-review-anthropic.md](file:///.agents/rules/code-review-anthropic.md).

## Aktif Skills & MCP:
- **Graphify**: Skill visualisasi relasi dependensi dan alur sistem ke format diagram Mermaid ([.agents/skills/graphify/SKILL.md](file:///.agents/skills/graphify/SKILL.md)).
- **MCP Servers**: Konfigurasi Playwright & Context7 tersedia di [.agents/mcp_config.json](file:///.agents/mcp_config.json).
