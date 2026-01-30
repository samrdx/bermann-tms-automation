# Gemini Context - Bermann TMS QA Automation

## 🎯 Quick Start for Gemini

**IMPORTANT:** This project uses a skills system. Always check [AGENTS.md](AGENTS.md) first.

- **For skill index:** [AGENTS.md](AGENTS.md)
- **For skills documentation:** [skills/](skills/)
- **For project overview:** Continue reading

---

## Gemini-Specific Notes

### How You're Used in This Project

1. **Stagehand AI Integration** (Primary use)
   - Cost: ~$0.002-0.006 per action
   - Used for: Complex UI exploration, dynamic elements
   - API: Gemini 2.0 Flash via GEMINI_API_KEY

2. **Code Generation** (Secondary use)
   - When Claude Terminal unavailable
   - Emergency fallback
   - Manual prompts via terminal

### API Configuration
```typescript
// Stagehand uses Gemini automatically
const stagehand = new Stagehand({
  env: 'LOCAL',
  enableCaching: true,
  // Gemini configured via GEMINI_API_KEY env var
});
```

### Cost Optimization

**Your role in the 80/20 strategy:**
- 80% Playwright (free) ← Main automation
- 20% You (Gemini via Stagehand) ← Complex cases only

**When to use you:**
- Dynamic dropdowns without stable selectors
- Complex modal interactions
- Visual element identification
- Exploratory testing

**When NOT to use you:**
- Stable form fields (use Playwright)
- Known selectors (use Page Objects)
- Login/logout flows (use Playwright)
- Simple CRUD operations

### Skills to Follow

When generating code for this project:

1. **ALWAYS check AGENTS.md** for auto-invoke rules
2. **Read relevant skills** before generating:
   - tms-selectors: Selector priority
   - tms-dropdowns: Bootstrap patterns
   - tms-page-objects: POM structure
   - tms-tests: Test phases

3. **Follow existing patterns:**
   - Page Object Model
   - Winston logging
   - TypeScript strict mode
   - Error handling with screenshots

### Example Prompt for You
```
Using @tms-page-objects skill, create [ModuleName]Page.ts with:
- Selectors: [list from Confluence]
- Methods: [list of actions]
- Follow ContratosFormPage.ts pattern
```

### Output Format

When generating code, always:
- Use TypeScript with strict types
- Include Winston logging
- Add error handling
- Follow skill templates exactly
- Reference Confluence for selectors

### Integration with Other AIs
```
Claude Pro (claude.ai) → Strategic planning, architecture
    ↓
Gemini (you) → Code execution, Stagehand automation
    ↓
Cursor AI → Inline completion, refactoring
    ↓
Skills System → All follow same patterns
```

### Critical Rules (Same as Claude)

❌ **Never:**
- Hardcode selectors not in Confluence
- Skip reading skills before coding
- Use .fill() on readonly inputs
- Assume dropdown state

✅ **Always:**
- Check AGENTS.md first
- Read skill documentation
- Follow Page Object Model
- Use Winston logging
- Take screenshots on error
- Wait for cascading dropdowns (1.5s)

---

## Project Context

**Tech Stack:**
- Playwright + TypeScript
- Page Object Model
- Winston logging
- Stagehand + Gemini 2.0 Flash (you!)

**Modules:**
- Login/Logout ✅
- Contratos ✅
- Planificar Viajes ✅
- Asignar Viajes 🎯
- Reportes 📋

**Metrics:**
- Tests: 8 (100% passing)
- Skills: 4 generic
- Cost per test: ~$0.001 average
- Your contribution: ~10-20% of automation

---

## Resources

- **Skills:** [AGENTS.md](AGENTS.md)
- **Confluence:** TMS Selector Database
- **GitHub:** https://github.com/samrdx/bermann-tms-automation
- **TMS QA:** https://moveontruckqa.bermanntms.cl

---

**Your Role:** Intelligent automation where Playwright can't reach  
**Cost-effective:** Only when necessary  
**Quality:** Follow skills for consistency  

**Last Updated:** Day 4 - January 30, 2025