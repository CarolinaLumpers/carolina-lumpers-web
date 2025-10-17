# Button Style Guide - Carolina Lumpers Dashboard

Quick reference for using the standardized button system.

---

## ✅ Modern Button Classes (Use These)

### Primary Actions
```html
<button class="btn btn-primary">Clock In</button>
<button class="btn btn-primary">Load Data</button>
```
**When to use**: Main actions, primary calls-to-action

### Secondary Actions
```html
<button class="btn btn-secondary">Send Report</button>
<button class="btn btn-secondary">Export PDF</button>
```
**When to use**: Important but not primary actions

### Success/Approve Actions
```html
<button class="btn btn-success">✓ Approve</button>
<button class="btn btn-success">Confirm</button>
```
**When to use**: Approve, confirm, save actions

### Danger/Delete Actions
```html
<button class="btn btn-danger">✗ Deny</button>
<button class="btn btn-danger">Delete</button>
```
**When to use**: Deny, delete, destructive actions

### Ghost/Tertiary Actions
```html
<button class="btn btn-ghost">Cancel</button>
<button class="btn btn-ghost">Clear Filter</button>
```
**When to use**: Cancel, clear, less important actions

---

## ⚠️ Legacy Classes (Deprecated - Still Work)

These still function but use the modern classes above instead:

```html
<!-- DON'T USE THESE ANYMORE -->
<button class="btn btn-blue">...</button>   <!-- Use btn-primary -->
<button class="btn btn-gray">...</button>   <!-- Use btn-ghost -->
<button class="btn btn-green">...</button>  <!-- Use btn-secondary -->
```

---

## 🎨 Color Reference

| Class | Color | Hex | Use Case |
|-------|-------|-----|----------|
| `btn-primary` | Amber | #FFBF00 | Main actions |
| `btn-secondary` | Orange | #FBB040 | Secondary actions |
| `btn-success` | Green | #4CAF50 | Approve/Confirm |
| `btn-danger` | Red | #f44336 | Deny/Delete |
| `btn-ghost` | Transparent | - | Cancel/Clear |

---

## 📱 Multilingual Support

All buttons should include translation attributes:

```html
<button class="btn btn-success"
        data-en="Approve" 
        data-es="Aprobar" 
        data-pt="Aprovar">
  Approve
</button>
```

---

## 🔧 CSS Variables Available

Use these in custom styles:

```css
var(--color-primary)         /* #FFBF00 - Amber */
var(--color-primary-hover)   /* #E8A317 - Darker amber */
var(--color-secondary)       /* #FBB040 - Orange */
var(--color-success)         /* #4CAF50 - Green */
var(--color-success-hover)   /* #45a049 - Darker green */
var(--color-danger)          /* #f44336 - Red */
var(--color-danger-hover)    /* #da190b - Darker red */
var(--color-warning)         /* #ff9800 - Orange */
var(--color-info)            /* #2196F3 - Blue */
```

---

## 💡 Quick Tips

1. **Always use `.btn` base class** before variant classes
2. **Add translations** for all user-facing buttons
3. **Use semantic classes** (success/danger) instead of colors
4. **Keep button text short** - 1-3 words ideal
5. **Icons optional** - Use emoji or none for consistency

---

## 🚫 Common Mistakes

### ❌ Wrong
```html
<button class="btn-primary">Click</button>
<!-- Missing .btn base class -->

<button style="background: green; color: white;">Approve</button>
<!-- Inline styles instead of classes -->

<button class="approve-btn">Approve</button>
<!-- Old custom class -->
```

### ✅ Correct
```html
<button class="btn btn-primary">Click</button>
<!-- Has .btn base class -->

<button class="btn btn-success">Approve</button>
<!-- Uses design system class -->

<button class="btn btn-success" 
        data-en="Approve" 
        data-es="Aprobar" 
        data-pt="Aprovar">
  Approve
</button>
<!-- Perfect: class + translations -->
```

---

**Last Updated**: October 17, 2025
