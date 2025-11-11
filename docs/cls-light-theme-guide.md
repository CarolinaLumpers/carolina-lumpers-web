# CLS Dashboard Light Theme – Amber Accent Design Guide

## Purpose

This document defines the use of the amber brand color (#FFBF00) in light-mode user interfaces for Carolina Lumper Service web systems.
The goal is to preserve brand consistency while maintaining high readability and professional visual balance.

## 1. Design Philosophy

- Amber should **enhance, not dominate**, the light theme.
- It is used for **focus, hierarchy, and interactive states**, never as a base background.
- Neutral backgrounds (white, off-white, light gray) form the primary canvas.
- Amber provides **energy and warmth** without reducing text contrast or user comfort.

## 2. Core Color Palette (Light Theme)

| Role | Color | Hex | Notes |
|------|-------|-----|-------|
| Primary Amber | amber-500 | #F59E0B | Main accent for CTAs |
| Amber Hover | amber-600 | #D97706 | Darker tone for hover/active states |
| Highlight Amber | amber-400 | #FBBF24 | Used for icons, labels, and dividers |
| Text Primary | Neutral 900 | #1A1A1A | Body and header text |
| Background | Base-100 | #FFFFFF | Default UI background |
| Secondary Background | Gray-100 | #F9FAFB | Panels, cards, inputs |
| Border | Gray-300 | #D1D5DB | Table borders, section lines |
| Success | Green-600 | #16A34A | Confirmations, positive alerts |
| Danger | Red-600 | #DC2626 | Errors, declines, deletions |

## 3. Usage Guidelines

### a. Buttons

Amber is used only for **primary call-to-action elements**.

**Example:**
```html
<button class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-md">
  Clock In
</button>
```

**Rules:**
- Use white text on amber backgrounds.
- Use darker amber for hover and focus.
- Avoid amber outlined buttons on white backgrounds (low contrast).

### b. Text & Icons

Amber may accent status, icons, or key values, but **never replace main text color**.

```html
<span class="text-amber-600 font-semibold">On Duty</span>
```

**Use cases:**
- Status highlights (Approved, Pending)
- Dashboard indicators (active worker, task in progress)
- Icons beside neutral text for quick visual cues

### c. Navigation & Links

Keep navigation links neutral (gray or black).
Reserve amber for **hover or active link states**.

```html
<a href="#" class="text-gray-700 hover:text-amber-600">Dashboard</a>
```

### d. Tables & Data

Amber highlights should **guide attention, not color the entire table**.

```html
<tr class="bg-white hover:bg-amber-50">
  <td class="text-amber-600 font-medium">Active</td>
  <td>Worker ID: CL-002</td>
</tr>
```

- Use `bg-amber-50` sparingly for row hovers or highlight bands.
- Keep alternating rows neutral.

### e. Cards & Panels

Amber serves as a **visual header or border indicator**.

```html
<div class="bg-white border-t-4 border-amber-500 shadow-sm rounded-lg p-6">
  <h2 class="text-amber-600 font-bold text-lg mb-3">Clock-In Summary</h2>
  <p class="text-gray-700">Last clock-in: 7:58 AM</p>
</div>
```

**Design intent:**
- Clear separation of sections.
- Visual rhythm across dashboard widgets.

## 4. Accessibility Standards

| Element | Minimum Contrast | Recommendation |
|---------|-----------------|----------------|
| Amber text on white | 4.5:1 | Use only for icons or short labels |
| White text on amber | 7:1 | Meets standard for CTAs |
| Amber hover vs base | ≥ 1.25x luminance difference | Maintain visible interaction feedback |

**Tools to validate:**
- [contrast-ratio.com](https://contrast-ratio.com)
- Chrome DevTools → Accessibility → Contrast Checker

## 5. Tailwind + DaisyUI Configuration

**tailwind.config.js:**

```javascript
module.exports = {
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        clsLight: {
          primary: "#F59E0B",
          secondary: "#FBBF24",
          accent: "#D97706",
          neutral: "#1A1A1A",
          "base-100": "#FFFFFF",
          "base-200": "#F9FAFB",
          info: "#2563EB",
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
        },
      },
    ],
  },
};
```

**Usage Example:**

```html
<button class="btn btn-primary">Clock In</button>
<div class="text-primary">Shift Active</div>
```

## 6. Recommended Pairings

| Component | Primary Tone | Complementary Tone |
|-----------|--------------|-------------------|
| Buttons | Amber | White / Neutral-900 |
| Charts | Amber + Orange + Gray | Balanced color rhythm |
| Alerts | Amber + Gray | Visual warmth |
| Dividers | Amber-300 | Subtle highlight lines |
| Header Icons | Amber-500 | Black / Gray base |

## 7. Practical Examples

### Dashboard Card
```html
<div class="bg-white rounded-lg shadow p-5 border border-gray-200">
  <h3 class="text-amber-600 font-bold mb-2">Employee Hours</h3>
  <p class="text-gray-700">You have logged 36 hours this week.</p>
</div>
```

### Status Tag
```html
<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">
  Pending Approval
</span>
```

### Input Field
```html
<input
  class="input input-bordered focus:border-amber-500 focus:ring-amber-400"
  placeholder="Enter Worksite"
/>
```

## 8. Implementation Notes

- Light theme loads by default for public or client-facing views.
- Dark theme remains default for administrative or warehouse contexts.
- **Amber acts as the brand connector between both themes** — bright in dark mode, restrained in light mode.
- Use CSS variables for easy adjustment if brand shades evolve.

## 9. Summary

### Do:
- ✅ Use amber to emphasize action and feedback.
- ✅ Keep backgrounds neutral and text dark.
- ✅ Maintain visual consistency with DaisyUI's theme system.

### Don't:
- ❌ Use amber as text color on white backgrounds.
- ❌ Overuse amber in large panels.
- ❌ Mix multiple amber shades inconsistently.
