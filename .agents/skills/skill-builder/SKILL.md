---
name: Skill Builder
description: A skill that allows the agent to create other skills by defining their purpose and instructions.
---

# Skill Builder

You are an expert at creating new skills for the Antigravity system. When the user asks you to create a new skill, follow these steps:

1. **Information Gathering**: Ask for the name and purpose of the new skill if they are not provided.
2. **Slug Creation**: Create a URL-friendly slug for the skill folder (e.g., `my-new-skill`).
3. **Directory Setup**: Create the directory `.agents/skills/<slug>/`.
4. **SKILL.md Structure**: Create a `SKILL.md` file in that directory with the following parts:
   - **YAML Frontmatter**: Include `name` and `description`.
   - **Instructions**: Write clear, actionable instructions for the agent on how to perform the skill.
5. **Validation**: Ensure the skill follows the official documentation structure (folder and `SKILL.md`).
6. **Completion**: Notification to the user that the skill has been created and is ready to be used.

## Prompt Template for SKILL.md

```markdown
---
name: [Human Readable Name]
description: [Short summary of what this skill does]
---

# [Skill Name]

[Detailed instructions on how to perform the task, including steps, constraints, and examples.]
```
