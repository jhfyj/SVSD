---
name: canvas-first-design
description: Design-before-code process for building UI with an agent. Define the job to be done, explore and rate several directions on a design canvas (Lunagraph, Figma via MCP, or an HTML scratch canvas), prototype and test the winner as the user, design every state, then implement and hand off with annotations. Use when starting a new screen, flow or feature and the user wants it designed properly, not just coded, or says "design it first" or "use the canvas".
metadata:
  category: process
  tags: [process, design-first, canvas, lunagraph, figma, prototyping, handoff]
---

# Canvas-first design

**Rule zero:** use the canvas as your thinking tool. Don't write project code until the design is decided.

The original prompt is in [references/original-prompt.md](references/original-prompt.md). This is the same process, adapted so it works with whichever canvas is available.

## Pick the canvas

1. **Lunagraph** if it's connected (MCP or in-app chat). It's real React, so step 5 is a working prototype for free.
2. **Figma** via the Figma MCP if the user works in Figma. Load the `figma-use` skill first.
3. Otherwise, a **scratch HTML canvas**: one page outside the codebase with every direction and state laid out side by side, previewed in the browser.

## The steps

### 1. Job to be done
Write down: **who** the user is, **what** they're trying to do, and **what "done" looks like** for them. Keep it to three or four sentences. Everything after this gets judged against it.

### 2. Solution and requirements
- What has to be true for it to work (content, data, constraints, platforms, accessibility).
- What's **out of scope**, stated explicitly.

### 3. Explore on the canvas
- Bring in the screen and the real components (from the project's design system or a `brands/*/DESIGN.md`).
- Make **at least three directions** that actually differ (layout, hierarchy, interaction model), not three color swaps. Add variations within the strongest ones.
- No functionality yet.
- Look at references first: [Mobbin](../../resources/galleries/mobbin.md) for flows and [Spotted in Prod](../../resources/galleries/spotted-in-prod.md) for interactions.

### 4. Rate each one, honestly
Score each direction out of 10 on:

| Criterion | Question |
|---|---|
| Job fit | Does it get the user to "done" with the least effort? |
| UI clarity | Is the hierarchy obvious at a glance? Is it clear what to do first? |
| UX | Are the flow, feedback and error recovery right? |

Write one line of reasoning for each score. **Iterate until a direction scores 10/10.** If none can get there, go back to step 3.

### 5. Prototype the winner
Make it work on the canvas. Then **role-play the user** from step 1 and try to complete the job. Note every hesitation. If it isn't good, go back to step 4. Iterate, iterate, iterate.

### 6. Refine every state
Loading, empty, error, success, long or edge-case content, and mobile. Lay them out side by side on the canvas.

### 7. Implement (only if the user asks)
Build it in the codebase, then bring the result back next to the design and compare: spacing, type, states. Fix any drift.

### 8. Hand off
Annotate on the canvas so the user doesn't have to read the log:
- **Look at this first.** The one or two things that most need their judgment.
- What you did, what you considered, **what you decided and why**.
- What still needs review.
Keep the full process documented, but keep the summary short.

## Output checklist

- [ ] JTBD + requirements + out-of-scope written down
- [ ] ≥3 real directions on the canvas
- [ ] A rating table with reasons, ending at 10/10
- [ ] A prototype tested by role-playing the user
- [ ] All states designed (loading, empty, error, mobile)
- [ ] Hand-off notes on the canvas, starting with "look at this first"
