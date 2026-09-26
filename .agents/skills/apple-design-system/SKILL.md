---
name: apple-design-system
description: Complete guide for building beautiful, accessible, platform-native apps with Expo Router. Covers iOS design principles, fundamentals, styling, components, navigation, animations, interaction patterns, and native tabs.
version: 1.0.1
license: MIT
---

# iOS Design Principles

> A practical product-design specification for building an iPhone app that feels clear, familiar, adaptive, accessible, and at home on iOS.

**Status:** Working design standard  
**Platform:** iOS  
**Primary implementation:** SwiftUI  
**Reference:** Apple Human Interface Guidelines  
**Last reviewed:** June 13, 2026

---

## 1. Purpose

This document defines the visual, interaction, accessibility, and content principles for the product.

It is not a pixel-perfect imitation of Apple apps. The goal is to use iOS conventions so people can understand the interface quickly, focus on their content, and complete tasks with confidence.

Use this document when:

- Designing a new screen or flow
- Reviewing a prototype
- Choosing between custom and system components
- Implementing reusable SwiftUI components
- Checking accessibility and platform consistency
- Evaluating whether a visual effect improves usability

---

## 2. Experience Goals

Every screen should feel:

### Clear

People can immediately identify:

- Where they are
- What the screen contains
- What they can do next
- What will happen after an action

### Familiar

Navigation, controls, gestures, terminology, and feedback should behave like the rest of iOS unless the product has a strong, tested reason to differ.

### Content-first

The interface supports the content instead of competing with it. Decoration, branding, and effects must not reduce readability or obscure primary tasks.

### Responsive

Every interaction provides timely visual, haptic, or state feedback. Loading, success, failure, and disabled states are explicit.

### Adaptive

The experience remains useful across device sizes, orientations, appearance modes, text sizes, accessibility settings, and localization.

### Trustworthy

The app explains sensitive actions, requests permissions in context, protects user data, and avoids deceptive or surprising behavior.

---

## 3. Core Design Principles

## 3.1 Establish Strong Hierarchy

Use position, spacing, typography, grouping, and contrast to communicate importance.

- Give each screen one primary purpose.
- Make the primary action visually clear without making every action prominent.
- Group related information and separate unrelated information.
- Prefer whitespace and alignment over excessive borders.
- Reveal secondary detail progressively.
- Keep persistent navigation visually distinct from scrolling content.
- Avoid placing several equally weighted calls to action in the same region.

**Decision rule:** A person should understand the screen structure before reading every word.

---

## 3.2 Create Visual Harmony

The interface should feel integrated with the device, the operating system, and the content.

- Respect safe areas, rounded display corners, the Dynamic Island, system bars, and keyboard.
- Use system typography, semantic colors, materials, and native components where practical.
- Align corner radii, icon weights, control sizes, and spacing across related elements.
- Let backgrounds, controls, and content form clear layers.
- Use current system materials for navigation and controls instead of manually reproducing translucent effects.
- Treat branding as an accent, not a replacement for platform behavior.

**Decision rule:** Custom styling is acceptable when it strengthens product identity without weakening usability or platform familiarity.

---

## 3.3 Maintain Behavioral Consistency

Elements that look alike must behave alike. Repeated actions should use the same wording, placement, and feedback.

- Use the same component for the same purpose throughout the app.
- Preserve expected gesture behavior, including scrolling, swipe-back navigation, selection, and text editing.
- Use standard terminology for common actions such as Save, Cancel, Done, Delete, Share, Search, and Settings.
- Do not repurpose familiar icons for unrelated actions.
- Keep destructive actions visually and verbally distinct.
- Preserve user choices and state whenever reasonable.

**Decision rule:** Do not require people to relearn a pattern they already understand from iOS.

---

## 3.4 Favor Direct, Reversible Interaction

People should feel that they are manipulating content rather than operating an abstract control panel.

- Make tappable items visibly interactive.
- Place controls near the content they affect.
- Update the interface immediately when an action is safe to reverse.
- Support undo for meaningful destructive or high-cost actions.
- Confirm actions only when the consequence is difficult to reverse.
- Use drag, swipe, pinch, and long-press only where they are discoverable or supplementary.
- Never make a hidden gesture the only way to perform an essential action.

**Decision rule:** Prefer an action that is obvious, immediate, and recoverable.

---

## 3.5 Design for Focus

Reduce cognitive load and keep attention on the current task.

- Remove controls that do not support the screen’s primary purpose.
- Use progressive disclosure for advanced options.
- Avoid interrupting people with unnecessary alerts, permission prompts, ratings requests, or notifications.
- Keep modal flows short and focused.
- Preserve context when moving between related views.
- Use animation to explain change, not to delay progress.

**Decision rule:** Every visible element must justify the attention it consumes.

---

## 3.6 Build Accessibility In

Accessibility is a design requirement, not a final audit.

- Support Dynamic Type and avoid layouts that depend on one fixed text size.
- Provide useful accessibility labels, values, hints, traits, and logical reading order.
- Ensure controls have a comfortable hit area; use at least **44 × 44 points** for touch targets.
- Do not communicate meaning through color alone.
- Maintain sufficient contrast between foreground and background.
- Support VoiceOver, Switch Control, Voice Control, Full Keyboard Access where applicable, and Reduce Motion.
- Respect Bold Text, Increase Contrast, Differentiate Without Color, Reduce Transparency, and content-size settings.
- Caption meaningful media and provide alternatives for non-text content.
- Test with long translations and right-to-left layouts.

**Decision rule:** The primary task must remain achievable without relying on perfect vision, hearing, dexterity, memory, or motion tolerance.

---

## 3.7 Protect Privacy and User Control

- Request access only when a feature needs it.
- Explain the benefit before triggering a system permission prompt.
- Make permission denial recoverable without blocking unrelated functionality.
- Minimize data collection and retention.
- Clearly distinguish local, synced, shared, and public data.
- Make subscription, deletion, sign-out, and account-management behavior transparent.
- Avoid dark patterns, disguised advertisements, artificial urgency, and confusing consent.

**Decision rule:** A person should understand what the app is doing with their data and remain in control.

---

## 4. Visual Foundations

## 4.1 Layout

### Safe areas

- Anchor interface chrome to safe areas.
- Allow intentional edge-to-edge content only when readability and interaction remain safe.
- Avoid placing essential controls beneath system overlays or near accidental-touch regions.
- Account for the software keyboard, call/status indicators, and changing system-bar heights.

### Spacing

Use a small, consistent spacing scale as a project convention:

| Token     | Value | Typical use                    |
| --------- | ----: | ------------------------------ |
| `space-1` |  4 pt | Tight icon/label relationships |
| `space-2` |  8 pt | Compact internal spacing       |
| `space-3` | 12 pt | Related controls               |
| `space-4` | 16 pt | Standard content padding       |
| `space-5` | 20 pt | Comfortable section padding    |
| `space-6` | 24 pt | Section separation             |
| `space-8` | 32 pt | Major visual separation        |

These are product tokens, not a claim that iOS requires one universal spacing grid. Adjust them when Dynamic Type, localization, or content density requires more room.

### Alignment

- Use leading-edge alignment for most text.
- Align controls and content to shared guides.
- Keep visual rhythm consistent between repeated rows and cards.
- Avoid arbitrary centering of long text or form content.
- Prefer content-driven height over fixed-height containers.

### Adaptive behavior

- Use flexible frames and content priorities.
- Avoid device-model-specific layouts.
- Support portrait by default and landscape when the product benefits from it.
- Reflow rather than merely shrink content.
- Test compact and regular horizontal-size environments where applicable.

---

## 4.2 Typography

Use the system font unless a brand typeface provides a clear benefit and remains fully legible.

- Use semantic text styles such as Large Title, Title, Headline, Body, Callout, Footnote, and Caption.
- Support Dynamic Type with scalable text styles.
- Use weight and size sparingly to establish hierarchy.
- Keep body text readable and avoid overly light weights.
- Prefer sentence case for labels and buttons.
- Avoid truncating essential content.
- Let multiline labels grow vertically.
- Use monospaced digits only for data that benefits from stable alignment, such as timers or changing financial values.
- Do not place important text inside raster images.

### Recommended hierarchy

| Role               | Suggested semantic style                |
| ------------------ | --------------------------------------- |
| Screen title       | Large Title or Title                    |
| Section title      | Title 2, Title 3, or Headline           |
| Primary content    | Body                                    |
| Supporting content | Callout or Subheadline                  |
| Metadata           | Footnote or Caption                     |
| Button label       | Body or Headline, depending on emphasis |

---

## 4.3 Color

Use semantic colors rather than fixed RGB values wherever possible.

- Use system background, grouped background, label, secondary label, separator, fill, and tint roles.
- Support Light Mode, Dark Mode, increased contrast, and reduced transparency.
- Use the app tint color for interactive emphasis, not for every decorative element.
- Reserve red for destructive actions, errors, or critical status.
- Validate contrast over every actual background, including imagery and translucent material.
- Pair status color with text, iconography, or shape.
- Avoid pure black and pure white when semantic system colors provide better adaptation.

### Product color tokens

Define tokens by purpose:

```text
color.background.primary
color.background.secondary
color.surface.elevated
color.text.primary
color.text.secondary
color.text.tertiary
color.action.primary
color.action.destructive
color.status.success
color.status.warning
color.status.error
color.separator
```

Map tokens to dynamic platform colors in code.

---

## 4.4 Materials and Depth

Use depth to explain structure and interaction.

- Keep primary content in the content layer.
- Use system-provided material for navigation, toolbars, tab bars, menus, sheets, and floating controls.
- In current iOS design, system materials such as Liquid Glass can form a distinct functional layer above content.
- Prefer native APIs so appearance responds correctly to context, motion, accessibility settings, and future OS changes.
- Avoid stacking multiple translucent layers.
- Do not place large amounts of body text on visually noisy transparent surfaces.
- Avoid manually adding blur, shine, refraction, borders, and shadows merely to mimic system material.
- Use shadows sparingly and only when they clarify elevation.

**Rule:** Material is functional structure, not decoration.

---

## 4.5 Icons and Symbols

Prefer SF Symbols for common interface actions.

- Match symbol weight and scale to adjacent text.
- Use standard symbols for standard actions.
- Provide text labels where meaning may be ambiguous.
- Avoid mixing unrelated icon styles.
- Use filled and outlined variants consistently to communicate state.
- Do not rely on subtle symbol changes as the only state indicator.
- Mirror directional symbols in right-to-left layouts when appropriate.
- Provide accessibility labels that describe the action, not the symbol’s appearance.

---

## 4.6 Shape

- Use shape to group content or indicate interaction.
- Keep corner-radius choices consistent by component family.
- Prefer system control shapes and sizes.
- Avoid turning every section into a floating card.
- Ensure clipping does not hide focus, shadows, badges, or large text.
- Use capsules for compact controls and status labels, not for long paragraphs or complex forms.

---

## 5. Navigation and Information Architecture

## 5.1 Navigation Model

Choose the simplest model that reflects the content hierarchy.

### Tab navigation

Use a tab bar for persistent, top-level destinations of similar importance.

- Keep tabs stable across sessions.
- Use concise labels and recognizable symbols.
- Do not use a tab as a one-time action.
- Preserve each tab’s navigation state when reasonable.
- Avoid hiding essential destinations behind a “More” pattern unless necessary.

### Hierarchical navigation

Use a navigation stack for drill-down content.

- Use clear titles.
- Preserve the standard back behavior and interactive swipe-back gesture.
- Avoid replacing the Back label with an unrelated action.
- Keep deep hierarchies understandable with meaningful screen titles.

### Modal presentation

Use a sheet or full-screen cover for a focused task that temporarily interrupts the current context.

- Provide a clear completion or dismissal action.
- Avoid placing an entire app hierarchy inside a modal.
- Warn before dismissing unsaved, nonrecoverable work.
- Use alerts only for important decisions that require immediate attention.

---

## 5.2 Search

- Make search easy to find when it is central to the experience.
- Show useful suggestions, recent searches, or scope controls where relevant.
- Update results promptly without excessive animation.
- Preserve the query when navigating into and back from a result.
- Provide an empty state that helps people refine the search.
- Distinguish “no results” from connectivity or loading failures.

---

## 6. Components and Controls

Prefer system components before creating custom ones.

| Need                        | Preferred iOS pattern                              |
| --------------------------- | -------------------------------------------------- |
| Primary navigation          | `NavigationStack`, `TabView`                       |
| Structured content          | `List`, `Section`, `Form`                          |
| Simple action               | `Button`                                           |
| On/off setting              | `Toggle`                                           |
| One choice from a small set | `Picker`, segmented control                        |
| Range or continuous value   | `Slider`, `Stepper`                                |
| Date or time                | `DatePicker`                                       |
| Contextual commands         | `Menu`, context menu                               |
| Focused temporary task      | `sheet`, `fullScreenCover`                         |
| Important decision          | `alert`, `confirmationDialog`                      |
| Sharing                     | System share sheet                                 |
| Destructive row action      | Swipe action plus visible alternative where needed |
| Symbolic action             | SF Symbol with accessible label                    |

### Button hierarchy

Use a limited emphasis hierarchy:

1. **Primary:** The main action for the current context
2. **Secondary:** A useful alternative
3. **Tertiary:** Low-emphasis or inline action
4. **Destructive:** An irreversible or harmful action

Do not make multiple actions appear primary.

### Forms

- Place labels near their controls.
- Use appropriate keyboards and content types.
- Validate as close to the input as possible.
- Keep entered data after a recoverable error.
- Explain formatting requirements before submission.
- Move focus to the first invalid field only when it helps.
- Never use placeholder text as the only persistent label.
- Mark optional fields instead of marking every required field.

---

## 7. Feedback and System States

Every data-driven component should define the following states where relevant:

| State               | Required behavior                                         |
| ------------------- | --------------------------------------------------------- |
| Initial             | Show the starting content or a clear call to action       |
| Loading             | Communicate progress without unnecessary blocking         |
| Refreshing          | Preserve existing content while updating                  |
| Empty               | Explain why it is empty and what to do next               |
| Success             | Confirm completion proportionally                         |
| Validation error    | Identify the field and corrective action                  |
| Recoverable error   | Explain the problem and offer Retry                       |
| Offline             | Preserve usable local content and explain limitations     |
| Permission denied   | Explain how to continue or change access                  |
| Disabled            | Make the unavailable state understandable                 |
| Destructive pending | Explain consequences and offer cancellation when possible |

### Loading

- Prefer skeletons or inline progress for content that has a predictable layout.
- Use a spinner for indeterminate, short waits.
- Avoid blocking the whole screen when only one region is loading.
- Prevent duplicate submissions.
- Never show fake progress that can move backward or stall indefinitely.

### Errors

Use plain language:

1. State what happened.
2. Explain the impact.
3. Provide a next step.
4. Preserve the person’s work.

Avoid internal error codes in primary messaging.

---

## 8. Motion and Haptics

Motion should communicate relationship, continuity, and result.

- Animate state changes that would otherwise feel abrupt or confusing.
- Keep common transitions brief and responsive.
- Use spring behavior only when it supports the physical relationship between elements.
- Avoid constant decorative motion.
- Do not animate large regions when a small local update is sufficient.
- Respect Reduce Motion and replace spatial motion with fades or instant changes where appropriate.
- Avoid flashing or rapid repetitive effects.
- Use haptics for meaningful confirmation, warning, selection, or impact.
- Do not attach haptics to every tap.

**Rule:** Motion must explain change, provide feedback, or strengthen spatial understanding.

---

## 9. Content and Writing

Interface copy should be direct, human, and useful.

### Voice

- Clear
- Calm
- Concise
- Respectful
- Specific
- Free of blame

### Labels

- Begin action labels with a verb: “Add account,” “Save changes,” “Try again.”
- Describe the result, not the control type.
- Keep terminology consistent.
- Avoid jargon when a familiar word exists.
- Do not use punctuation in short button labels unless needed.
- Avoid “Yes” and “No” when specific actions are clearer.

### Alerts

A useful alert contains:

- A title that states the situation
- A short explanation when necessary
- Specific action labels
- A safe default
- A clearly identified destructive action

### Empty states

A good empty state answers:

- What belongs here?
- Why is it empty?
- What can the person do next?

---

## 10. Accessibility Acceptance Criteria

A feature is not design-complete until:

- [ ] All interactive elements are reachable and operable with VoiceOver.
- [ ] Accessibility labels describe purpose and state.
- [ ] Reading and focus order match the visual and logical order.
- [ ] Text supports Dynamic Type without clipping or overlap.
- [ ] Essential controls maintain at least a 44 × 44 pt hit area.
- [ ] Information is not communicated by color alone.
- [ ] Foreground/background combinations meet the project’s contrast target.
- [ ] Light Mode and Dark Mode are both reviewed.
- [ ] Bold Text, Increase Contrast, Reduce Motion, and Reduce Transparency are tested.
- [ ] The interface remains usable at large accessibility text sizes.
- [ ] Media has captions, transcripts, descriptions, or appropriate alternatives.
- [ ] Errors are announced and associated with the relevant field or control.
- [ ] Custom controls expose correct roles, values, actions, and states.
- [ ] Localization and right-to-left behavior have been reviewed.

---

## 11. SwiftUI Implementation Guidance

### Prefer semantic APIs

```swift
Text("Portfolio")
    .font(.title)
    .foregroundStyle(.primary)
```

Prefer semantic styles over hardcoded font sizes and colors.

### Support scalable layouts

```swift
VStack(alignment: .leading, spacing: 12) {
    Text(title)
        .font(.headline)

    Text(summary)
        .font(.body)
        .foregroundStyle(.secondary)
}
.fixedSize(horizontal: false, vertical: true)
```

### Provide accessible controls

```swift
Button {
    addItem()
} label: {
    Label("Add item", systemImage: "plus")
}
.accessibilityHint("Adds a new item to the current list")
```

### Use native navigation and presentation

```swift
NavigationStack {
    ContentView()
        .navigationTitle("Overview")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add", systemImage: "plus") {
                    isPresentingAddFlow = true
                }
            }
        }
}
.sheet(isPresented: $isPresentingAddFlow) {
    AddItemView()
}
```

### Centralize design tokens

```swift
enum AppSpacing {
    static let compact: CGFloat = 8
    static let standard: CGFloat = 16
    static let section: CGFloat = 24
}
```

Keep tokens small, semantic, and adaptable. Do not use tokens to override native component behavior unnecessarily.

---

## 12. Design Review Questions

Before approving a screen, ask:

### Purpose

- What is the one primary task?
- Is the primary action obvious?
- Can anything be removed?

### Hierarchy

- Is the reading order clear?
- Are related elements grouped?
- Are secondary actions appropriately subdued?

### Platform fit

- Does the screen use familiar iOS navigation and controls?
- Does standard back, dismiss, scroll, and editing behavior work?
- Are custom components genuinely necessary?

### Adaptability

- Does it work with long content, localization, Dark Mode, and large text?
- Does it respect safe areas and keyboard changes?
- Does content reflow instead of shrinking excessively?

### Accessibility

- Can the flow be completed with VoiceOver?
- Are touch targets large enough?
- Is meaning preserved without color, transparency, or motion?

### Trust

- Are consequences clear?
- Can destructive actions be reversed or confirmed appropriately?
- Are permission and privacy decisions understandable?

### Polish

- Are loading, empty, offline, success, and error states designed?
- Does feedback appear immediately?
- Is motion purposeful and restrained?

---

## 13. Common Anti-Patterns

Avoid:

- Fixed layouts designed for one iPhone size
- Tiny icon-only controls without clear meaning
- Multiple competing primary buttons
- Excessive cards, shadows, gradients, or glass effects
- Custom navigation that breaks swipe-back behavior
- Placeholder-only form labels
- Hidden gestures as the only route to essential actions
- Alerts for routine information
- Permission prompts shown at app launch without context
- Gray text with insufficient contrast
- Fixed text heights that break with Dynamic Type
- Color-only success, warning, or error indicators
- Destructive actions placed beside common safe actions
- Long onboarding that explains features instead of letting people use them
- Recreating native controls with visually similar but behaviorally incomplete custom components

---

## 14. Definition of Done

A feature is ready for release when:

- [ ] It has a clear primary task and information hierarchy.
- [ ] It uses native patterns or documents why a custom pattern is necessary.
- [ ] All major states are designed and implemented.
- [ ] Dynamic Type, VoiceOver, appearance modes, and relevant accessibility settings are tested.
- [ ] Touch targets and contrast meet acceptance criteria.
- [ ] Navigation and gestures behave consistently with iOS.
- [ ] Copy is final, localized-ready, and free of placeholder language.
- [ ] Sensitive actions and permissions are explained in context.
- [ ] Motion and haptics are purposeful and respect user settings.
- [ ] The implementation has been reviewed on a small and a large iPhone configuration.
- [ ] The design remains usable with realistic, empty, long, and erroneous data.

---

## 15. Authoritative References

- Apple Human Interface Guidelines:  
  https://developer.apple.com/design/human-interface-guidelines/
- Designing for iOS:  
  https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
- Accessibility:  
  https://developer.apple.com/design/human-interface-guidelines/accessibility
- Layout:  
  https://developer.apple.com/design/human-interface-guidelines/layout
- Typography:  
  https://developer.apple.com/design/human-interface-guidelines/typography
- Color:  
  https://developer.apple.com/design/human-interface-guidelines/color
- Materials:  
  https://developer.apple.com/design/human-interface-guidelines/materials
- SF Symbols:  
  https://developer.apple.com/design/human-interface-guidelines/sf-symbols
- Adopting Liquid Glass:  
  https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass

---

## 16. Product-Specific Extension Template

Complete this section for the actual product.

### Product promise

> [One sentence describing the value delivered to the user.]

### Primary audiences

- [Audience 1]
- [Audience 2]

### Top-level destinations

1. [Destination]
2. [Destination]
3. [Destination]

### Primary actions

- [Action]
- [Action]

### Brand expression

- **Tint:** [Semantic tint definition]
- **Typography:** System / [Approved brand typeface]
- **Illustration style:** [Description]
- **Tone:** [Voice attributes]

### Accessibility target

- [Target standard and internal acceptance criteria]

### Supported environments

- Minimum iOS version: [Version]
- Devices: [iPhone / iPad]
- Orientations: [Portrait / Landscape]
- Localization: [Languages]
- Offline behavior: [Summary]
