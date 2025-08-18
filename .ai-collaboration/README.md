# AI Collaboration System
## Augment ↔ Claude Communication Setup

### 🎯 Purpose
Enable strategic collaboration between Augment (codebase AI) and Claude (terminal AI) for enhanced development workflow.

### 📁 File Structure
- **`augment-to-claude.md`** - Augment writes context, questions, and status updates
- **`claude-to-augment.md`** - Human pastes Claude's responses here
- **`shared-context.json`** - Current project state and metrics
- **`README.md`** - This file (setup instructions)

### 🔄 Workflow
1. **Augment** analyzes codebase and writes summary to `augment-to-claude.md`
2. **Human** copies content and pastes to Claude in terminal
3. **Claude** provides strategic guidance and analysis
4. **Human** pastes Claude's response to `claude-to-augment.md`
5. **Augment** reads Claude's guidance and implements suggestions
6. **Repeat** for continuous AI collaboration

### 🎯 Collaboration Benefits
- **Strategic + Tactical:** Claude provides high-level strategy, Augment handles implementation
- **Different Perspectives:** Two AI reasoning approaches on same problem
- **Continuous Context:** Shared understanding of project state
- **Efficient Handoffs:** Clear communication protocol

### 🚀 Getting Started
1. Copy content from `augment-to-claude.md`
2. Paste to Claude in terminal (process ID 2523897)
3. Get Claude's response
4. Paste response to `claude-to-augment.md`
5. Augment will read and continue work

### 📊 Current Status
- **System:** Ready for first collaboration
- **Project:** Maritime Onboarding System (stable)
- **Waiting:** Claude's strategic input on next development priorities
