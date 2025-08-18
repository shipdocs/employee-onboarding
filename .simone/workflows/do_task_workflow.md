# Task Execution Workflow

## Workflow ID: do_task
**Versie**: 1.0  
**Laatst bijgewerkt**: 2025-06-10  
**Doel**: Systematische uitvoering van Simone tasks met volledige context

---

## 📋 Workflow Overzicht

Deze workflow beschrijft de stappen voor het uitvoeren van een Simone task, van initiële analyse tot voltooiing en documentatie.

## 🎯 Prerequisites

### Vereiste Bestanden
- [ ] Task file bestaat en is leesbaar
- [ ] Project manifest is up-to-date
- [ ] Relevante requirements documentatie beschikbaar
- [ ] Codebase toegankelijk voor analyse

### Vereiste State
- [ ] Task status is "open" of "in_progress"
- [ ] Geen blocking dependencies
- [ ] Sprint context beschikbaar

## 🔄 Workflow Stappen

### Stap 1: Context Gathering
**Doel**: Verzamel alle relevante project context

#### Acties
1. **Lees Project Manifest**
   ```
   Bestand: .simone/00_PROJECT_MANIFEST.md
   Focus: Project doelen, architectuur, huidige status
   ```

2. **Analyseer Task Details**
   ```
   Bestand: [Task file path]
   Focus: Beschrijving, acceptatie criteria, subtasks
   ```

3. **Zoek Gerelateerde ADRs**
   ```
   Directory: .simone/05_ARCHITECTURAL_DECISIONS/
   Filter: ADRs gerelateerd aan task sprint/milestone
   ```

4. **Review Requirements**
   ```
   Directory: .simone/02_REQUIREMENTS/[milestone]/
   Focus: Relevante requirements voor task scope
   ```

#### Validatie
- [ ] Alle context documenten gelezen
- [ ] Task scope duidelijk begrepen
- [ ] Dependencies geïdentificeerd
- [ ] Architecturale constraints bekend

### Stap 2: Codebase Analysis
**Doel**: Begrijp huidige codebase en integratiepunten

#### Acties
1. **Analyseer Bestaande Code**
   ```
   Tool: codebase-retrieval
   Query: Relevante componenten, services, en patterns
   ```

2. **Identificeer Integratiepunten**
   ```
   Focus: Classes, functions, APIs die geraakt worden
   Documenteer: Bestaande patterns en conventions
   ```

3. **Review Test Patterns**
   ```
   Directory: tests/
   Focus: Bestaande test approaches en patterns
   ```

#### Validatie
- [ ] Integratiepunten geïdentificeerd
- [ ] Bestaande patterns begrepen
- [ ] Test strategie bepaald

### Stap 3: Implementation Planning
**Doel**: Maak gedetailleerd implementatieplan

#### Acties
1. **Break Down Subtasks**
   ```
   Review: Task subtasks lijst
   Prioriteer: Logische volgorde van implementatie
   ```

2. **Identificeer Risico's**
   ```
   Technisch: Complexe integraties, performance impacts
   Business: Scope creep, requirement changes
   ```

3. **Plan Testing Approach**
   ```
   Unit tests: Voor nieuwe functionaliteit
   Integration tests: Voor API changes
   E2E tests: Voor user-facing features
   ```

#### Validatie
- [ ] Implementatieplan compleet
- [ ] Risico's geïdentificeerd en gemitigeerd
- [ ] Test strategie gedefinieerd

### Stap 4: Task Execution
**Doel**: Implementeer de task volgens plan

#### Acties
1. **Update Task Status**
   ```
   Status: "in_progress"
   Timestamp: Huidige tijd
   ```

2. **Iteratieve Implementatie**
   ```
   Voor elke subtask:
   - Implementeer changes
   - Test implementatie
   - Update subtask status
   - Log progress
   ```

3. **Continuous Validation**
   ```
   Check: Acceptatie criteria
   Test: Functionaliteit werkt correct
   Review: Code quality standards
   ```

#### Validatie
- [ ] Alle subtasks voltooid
- [ ] Acceptatie criteria voldaan
- [ ] Code quality standards gehaald

### Stap 5: Quality Assurance
**Doel**: Zorg voor kwaliteit en betrouwbaarheid

#### Acties
1. **Code Review**
   ```
   Check: Code standards, best practices
   Review: Security implications
   Validate: Performance impact
   ```

2. **Testing**
   ```
   Run: Unit tests
   Execute: Integration tests
   Verify: E2E scenarios
   ```

3. **Documentation Update**
   ```
   Update: Relevante documentatie
   Add: Nieuwe ADRs indien nodig
   Document: Implementation decisions
   ```

#### Validatie
- [ ] Code review passed
- [ ] Alle tests slagen
- [ ] Documentatie bijgewerkt

### Stap 6: Task Completion
**Doel**: Finaliseer task en update project state

#### Acties
1. **Final Validation**
   ```
   Check: Alle acceptatie criteria voldaan
   Verify: Geen regressies geïntroduceerd
   Confirm: Stakeholder requirements voldaan
   ```

2. **Update Task Status**
   ```
   Status: "completed"
   Completion time: Huidige timestamp
   Rename file: TX[TASK_ID]_[original_name].md
   ```

3. **Update Project State**
   ```
   File: .simone/00_PROJECT_MANIFEST.md
   Update: Task completion status
   Update: Sprint progress
   ```

4. **Generate Report**
   ```
   Summary: Wat is geïmplementeerd
   Impact: Wat is de business impact
   Next steps: Aanbevelingen voor vervolgstappen
   ```

#### Validatie
- [ ] Task status correct bijgewerkt
- [ ] Project state gesynchroniseerd
- [ ] Completion report gegenereerd

## 📊 Success Criteria

### Technical Success
- [ ] Alle subtasks voltooid
- [ ] Acceptatie criteria voldaan
- [ ] Code quality standards gehaald
- [ ] Tests slagen

### Process Success
- [ ] Workflow stappen gevolgd
- [ ] Documentatie bijgewerkt
- [ ] State management correct
- [ ] Stakeholder communicatie

## 🚨 Error Handling

### Common Issues
1. **Missing Dependencies**
   - Action: Identificeer en documenteer dependencies
   - Escalation: Blokkeer task en informeer stakeholders

2. **Scope Creep**
   - Action: Documenteer scope changes
   - Escalation: Overleg met product owner

3. **Technical Blockers**
   - Action: Documenteer blocker en workarounds
   - Escalation: Maak ADR voor technische beslissing

### Rollback Procedures
1. **Code Rollback**: Git revert procedures
2. **State Rollback**: Herstel vorige task status
3. **Documentation Rollback**: Herstel documentatie state

## 📈 Metrics & KPIs

### Task Metrics
- Task completion time
- Number of subtasks
- Code changes (lines added/removed)
- Test coverage impact

### Quality Metrics
- Code review feedback
- Bug reports post-completion
- Performance impact
- User satisfaction

## 🔄 Continuous Improvement

### Workflow Optimization
- Regelmatige review van workflow effectiviteit
- Feedback verzameling van development team
- Automatisering van repetitieve stappen
- Template updates gebaseerd op lessons learned

### Knowledge Sharing
- Documenteer lessons learned
- Share best practices met team
- Update workflow templates
- Verbeter context gathering procedures

---

**Workflow Eigenaar**: Development Team  
**Review Frequentie**: Maandelijks  
**Volgende Review**: 2025-07-10
