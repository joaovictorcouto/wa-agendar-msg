# Design System Strategy: The Native Extension

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Seamless Integrator."** 

Unlike typical Chrome extensions that feel like "pop-ups" layered on top of a page, this design system is engineered to feel like a structural organ of the WhatsApp Web ecosystem. We are moving beyond simple "dark mode" into a high-end, editorial execution. By utilizing intentional asymmetry, tonal depth, and a complete rejection of traditional borders, we create a UI that feels "grown" into the host application rather than "pasted" onto it.

The goal is a signature experience where the user cannot distinguish where the extension ends and the native platform begins, achieved through a sophisticated "Material-Glass" aesthetic.

---

## 2. Colors & Surface Philosophy
This system relies on **Tonal Hierarchy** rather than structural lines.

### Palette Tokens
*   **Primary (Header/Brand):** `#008069` (The anchor of authority)
*   **Background (Canvas):** `#0a151a` (Deep immersion)
*   **Surfaces (Cards/Layers):** `#172127` (Container Low), `#1f2c34` (Container High)
*   **Action/Highlight:** `#59dcb5` (Vibrant interaction)
*   **Typography:** Primary `#E9EDEF` | Secondary `#8696A0`

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px solid` borders to define sections. You must prohibit the use of lines for separation. Instead:
*   **Define through Shift:** Use `surface_container_low` for the base and `surface_container_highest` for nested interactive elements.
*   **The Glass Rule:** For floating modals or dropdowns, use `surface_variant` at 80% opacity with a `20px` backdrop-blur. This creates a "frosted glass" effect that allows the underlying chat interface to bleed through subtly, maintaining context.

---

## 3. Typography: Editorial Precision
We utilize **Inter** to provide a clean, modern contrast to the platform's native Segoe UI, giving the scheduler its own "editorial voice."

*   **Display/Headline:** Use `headline-sm` (1.5rem) for main dashboard views. Track it at `-0.02em` for a premium, compact feel.
*   **The Title/Label Relationship:** Use `title-sm` (1rem) for task names and `label-sm` (0.6875rem) in ALL CAPS with `0.05em` letter-spacing for status metadata (e.g., "NEXT RUN"). This contrast creates immediate scannability.
*   **Body Copy:** Always default to `body-md` (0.875rem) for message previews. It balances legibility with information density.

---

## 4. Elevation & Depth
Depth is achieved through "Tonal Stacking," mimicking physical layers of fine material.

*   **The Layering Principle:** 
    *   **Level 0:** `background` (#0a151a) - The base extension pane.
    *   **Level 1:** `surface_container_low` (#131d23) - Grouped list sections.
    *   **Level 2:** `surface_container_highest` (#2c363d) - Individual interactive cards/scheduled items.
*   **Ambient Shadows:** For floating action buttons or menus, use a shadow with a `24px` blur, `0px` offset, and `rgba(0, 0, 0, 0.4)`. The shadow must feel like an atmospheric glow, not a hard drop shadow.
*   **The Ghost Border Fallback:** If high-contrast accessibility is required, use `outline_variant` at 15% opacity. Never use a 100% opaque border.

---

## 5. Components & Interaction Patterns

### Scheduled Message Cards
*   **Structure:** No dividers. Use `Spacing 4` (1rem) of vertical white space between cards.
*   **Background:** Use a subtle vertical gradient from `surface_container_low` to `surface_container_high`.
*   **Corner Radius:** `DEFAULT` (0.5rem/8px) for cards; `md` (0.75rem/12px) for larger dashboard containers.

### Buttons (The Interaction Core)
*   **Primary CTA:** Solid `primary_container` (#008064) with `on_primary_container` text. Use a slight `2px` inner-top-glow in a lighter teal to create a "pressed" high-end feel.
*   **Secondary/Ghost:** No background. Use `primary` (#59dcb5) text only. On hover, apply a `5%` opacity `primary` background.

### Input Fields
*   **Style:** Minimalist. No bottom line or full box. Use a subtle `surface_container_highest` fill with a `4px` bottom-radius.
*   **Focus State:** Smooth transition to a `2px` left-accent-bar of `primary` color. This avoids "boxing in" the user's input.

### Status Badges (Chips)
*   **Active:** `primary_fixed_dim` background with `on_primary_fixed` text.
*   **Paused:** Soft orange-tinted surface (Warning palette) with a `40%` opacity background to keep the focus on the content, not the alert.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical spacing (e.g., more padding on the left of a card than the right) to guide the eye toward "Send" actions.
*   **Do** use `0.5s` ease-in-out transitions for surface color shifts on hover.
*   **Do** leverage `surface_bright` for very small highlight elements (like a "New" indicator).

### Don't
*   **Don't** use black (`#000000`) for shadows; use a deepened version of your background color to maintain tonal richness.
*   **Don't** use traditional horizontal rules (`<hr>`). Use a `4px` gap of empty space or a subtle change in background tier.
*   **Don't** use pure white text. Stick to `on_surface` (#d9e4ec) to prevent "eye-bleed" in dark mode.

---

## 7. Signature Scheduler Components
*   **The "Timeline Node":** Instead of a list, use a vertical "Ghost Border" (10% opacity) that connects scheduled icons, creating a visual flow of time.
*   **The "Message Preview Glass":** A modal that uses `backdrop-blur(12px)` to show the user’s draft over the actual WhatsApp chat interface, ensuring the message looks correct in context before scheduling.