# UI Style Guide - A Voxel Christmas

## Design Philosophy

The UI follows a **winter wonderland aesthetic** with:
- **Dark, translucent backgrounds** with backdrop blur for depth
- **Cool color palette** (blues, whites, light grays)
- **Subtle glow effects** for magical winter atmosphere
- **Smooth transitions** and hover states
- **Consistent spacing and typography**

---

## Color Palette

### Primary Colors
- **Background Dark**: `rgba(5, 5, 16, 0.95)` - Main dark background
- **Background Gradient**: `linear-gradient(135deg, rgba(5, 5, 16, 0.95) 0%, rgba(20, 30, 50, 0.98) 100%)`
- **Text Primary**: `#fff` (white)
- **Text Secondary**: `#aaddff` (light blue)
- **Text Tertiary**: `#aaa` (light gray)
- **Text Disabled**: `#666` (medium gray)

### Accent Colors
- **Primary Accent**: `rgba(200, 220, 255, 0.3)` - Light blue glow
- **Secondary Accent**: `rgba(150, 200, 255, 0.2)` - Deeper blue
- **Warning/Quit**: `rgba(255, 50, 50, 0.2)` - Red tint for destructive actions
- **Border Standard**: `rgba(255, 255, 255, 0.2)` - Subtle white border
- **Border Highlight**: `rgba(255, 255, 255, 0.4)` - Brighter border for active states

---

## Button Types

### 1. Primary Action Button (Play Button / Splash Button)

**Use Case**: Main call-to-action buttons that require user attention.

**Base Styles**:
```css
background: linear-gradient(135deg, rgba(200, 220, 255, 0.2) 0%, rgba(150, 200, 255, 0.3) 100%);
border: 2px solid rgba(255, 255, 255, 0.3);
color: #fff;
padding: 15px 40px;
font-size: 1.1rem;
border-radius: 12px;
cursor: pointer;
font-weight: 600;
letter-spacing: 1px;
backdrop-filter: blur(10px);
box-shadow: 0 0 20px rgba(150, 200, 255, 0.2);
transition: all 0.3s ease;
```

**Hover State**:
```css
background: linear-gradient(135deg, rgba(220, 240, 255, 0.3) 0%, rgba(170, 220, 255, 0.4) 100%);
transform: translateY(-2px);
box-shadow: 0 0 30px rgba(200, 220, 255, 0.4);
text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
```

### 2. Standard UI Button (Settings, Fullscreen, Quit)

**Use Case**: Secondary controls that should be accessible but not distracting.

**Base Styles**:
```css
background: rgba(255, 255, 255, 0.1);
color: white;
border: 1px solid rgba(255, 255, 255, 0.2);
padding: 10px 20px;
border-radius: 8px;
cursor: pointer;
font-size: 0.9rem;
transition: background 0.2s;
backdrop-filter: blur(4px);
```

**Hover State**:
```css
background: rgba(255, 255, 255, 0.2);
transform: translateY(-2px);
```

---

## Panel Styling

### Panel Container

**Base Styles**:
```css
background: rgba(5, 5, 16, 0.95);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 12px;
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
padding: 0;
```

### Panel Header

**Base Styles**:
```css
display: flex;
justify-content: space-between;
align-items: center;
padding: 20px 25px;
border-bottom: 1px solid rgba(255, 255, 255, 0.1);
```

**Header Text**:
```css
color: #fff;
font-size: 1.5rem;
font-weight: 600;
letter-spacing: 1px;
margin: 0;
```

### Panel Content

**Base Styles**:
```css
padding: 25px;
```

---

## Typography

### Headings
- **H1**: `4.5rem`, `font-weight: 800`, gradient text (`linear-gradient(to bottom, #fff 40%, #cceeff 100%)`)
- **H2**: `1.5rem` to `2.5rem`, `font-weight: 600`, white color
- **Letter Spacing**: `1px` to `4px` for headings

### Body Text
- **Font Family**: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- **Size**: `1rem` (16px) standard
- **Line Height**: `1.5`
- **Colors**: See Palette

---

## Interactive Elements

### Sliders (Volume/Settings)
- **Track**: `rgba(255, 255, 255, 0.1)`
- **Fill**: `linear-gradient(90deg, rgba(200, 220, 255, 0.6), rgba(150, 200, 255, 0.8))`
- **Handle**: White circle with subtle shadow and glow
- **Hover**: Scale handle by `1.15`

### Toggle Switches
- **Background**: `rgba(255, 255, 255, 0.2)`
- **Knob**: White circle
- **Active Background**: `rgba(200, 220, 255, 0.6)`
- **Active Glow**: `box-shadow: 0 0 10px rgba(200, 220, 255, 0.4)`

### Tabs
- **Container**: `background: rgba(0, 0, 0, 0.2)`
- **Tab Item**: Transparent background, text color `#aaa`
- **Active Tab**: Text color `#fff`, bottom border `2px solid rgba(200, 220, 255, 0.6)`, slight background tint

---

## State Management

### Visibility Classes
- **Hidden**: `opacity: 0`, `pointer-events: none`, `visibility: hidden`
- **Visible**: `opacity: 1`, `pointer-events: auto`, `visibility: visible`

### Disabled States
- **Visual**: `opacity: 0` or `color: #666`
- **Interaction**: `pointer-events: none`, `cursor: default` or `cursor: not-allowed`

---

## Best Practices

### DO ✅
- Use consistent color values from the palette
- Apply backdrop-filter for depth
- Include smooth transitions (0.2s - 0.3s)
- Use appropriate border-radius (8px-12px)
- Add hover states with subtle transforms
- Maintain consistent padding and spacing
- Use letter-spacing for uppercase text
- Apply glow effects sparingly (primary actions only)

### DON'T ❌
- Use solid backgrounds (prefer rgba with transparency)
- Skip hover states on interactive elements
- Use harsh color transitions
- Mix different border-radius values inconsistently
- Forget to add disabled states
- Overuse glow effects (reserve for special buttons)
- Use opacity without backdrop-filter for depth

---

## Quick Reference

### Button Template (Primary)
```css
.my-button {
    background: linear-gradient(135deg, rgba(200, 220, 255, 0.2) 0%, rgba(150, 200, 255, 0.3) 100%);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    padding: 15px 40px;
    font-size: 1.1rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    letter-spacing: 1px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.my-button:hover {
    background: linear-gradient(135deg, rgba(200, 220, 255, 0.3) 0%, rgba(150, 200, 255, 0.4) 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(150, 200, 255, 0.3);
}

.my-button:active {
    transform: translateY(0);
}
```

### Button Template (Secondary)
```css
.my-ui-button {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
    backdrop-filter: blur(4px);
}

.my-ui-button:hover {
    background: rgba(255, 255, 255, 0.2);
}
```

### Panel Template
```css
.my-panel {
    background: rgba(5, 5, 16, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    padding: 0;
}

.my-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## Implementation Notes

### CSS Specificity & State Toggles
- **Visibility Classes**: State classes like `.pause-menu-hidden` or `.settings-panel-hidden` often use `!important` to ensure they override default element styles (e.g., `display: flex`).
- **Syntax Integrity**: The CSS file is large. Ensure all blocks are properly closed with `}` to avoid cascading parsing errors that can break subsequent UI components (like Settings Tabs).
- **Z-Index Layering**:
  - `z-index: 100` - Standard UI overlays
  - `z-index: 150` - Pause Menu
  - `z-index: 200` - Modals (Settings, Gallery)
  - `z-index: 1000` - Crosshair/Cursor
