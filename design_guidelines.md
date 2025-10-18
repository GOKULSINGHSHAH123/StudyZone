# Visual Learning Assistant - Design Guidelines

## Design Approach
**System-Based with Custom Elements**: Material Design 3 principles for dark mode foundation, enhanced with Linear's polish and Notion's card-based modularity for educational content presentation.

## Core Design Principles
1. **Clarity Over Decoration**: Educational content demands readable, scannable layouts
2. **Progressive Disclosure**: Complex workflows revealed incrementally without overwhelming users
3. **Trust Through Polish**: Investor-grade finish with smooth animations and professional spacing
4. **Dark-First Design**: Optimized for extended learning sessions with reduced eye strain

---

## Color Palette

**Dark Mode Foundation:**
- Background Primary: `220 25% 8%` (deep blue-black)
- Background Secondary: `220 20% 12%` (elevated surfaces)
- Background Tertiary: `220 18% 16%` (cards, panels)

**Brand & Accent:**
- Primary: `240 65% 58%` (vibrant indigo - CTAs, key actions)
- Secondary: `270 60% 62%` (purple - workflow nodes, progress)
- Success: `142 71% 45%` (learning completion states)
- Warning: `38 92% 50%` (processing states)
- Error: `0 84% 60%` (validation, errors)

**Text Hierarchy:**
- Primary Text: `220 15% 95%` (main content)
- Secondary Text: `220 10% 70%` (descriptions, metadata)
- Tertiary Text: `220 8% 50%` (labels, hints)

**Interactive States:**
- Hover overlays: white at 8% opacity
- Active states: white at 12% opacity
- Focus rings: Primary color at 40% opacity with 2px offset

---

## Typography

**Font Families:**
- Interface: Inter (weights: 400, 500, 600, 700)
- Educational Content: system-ui fallback for optimal readability
- Code/Technical: JetBrains Mono (for data, technical concepts)

**Scale & Usage:**
- Hero/Page Titles: `text-4xl font-bold` (36px)
- Section Headings: `text-2xl font-semibold` (24px)
- Card Titles: `text-lg font-medium` (18px)
- Body Text: `text-base` (16px)
- Supporting Text: `text-sm` (14px)
- Captions/Meta: `text-xs` (12px)

**Line Height:** Use generous line-height of 1.6 for educational content readability

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 8, 12, 16** for consistent rhythm
- Component padding: `p-4` to `p-8`
- Section gaps: `gap-8` to `gap-12`
- Page margins: `px-8 py-12`

**Grid Structure:**
- Main Dashboard: 12-column grid with sidebar (3 cols) + content (9 cols)
- Content Cards: 2-column grid on desktop, single column on mobile
- Workflow Visualizer: Full-width with horizontal scroll on overflow

**Container Widths:**
- Main content: `max-w-7xl mx-auto`
- Reading content: `max-w-4xl` for optimal line length
- Full bleed sections: `w-full` for visualizations

---

## Component Library

### Navigation
**Top Bar (sticky):**
- Dark background with subtle bottom border
- Logo + workspace selector + user profile
- Height: `h-16`, backdrop blur for depth

**Side Navigation:**
- Persistent on desktop, slide-over on mobile
- Active state: Primary color background with 10% opacity
- Icons: 24px from Heroicons (outline style)

### Cards & Modules
**Learning Module Card:**
- Background: Tertiary with subtle border (`border-white/10`)
- Rounded corners: `rounded-xl`
- Padding: `p-6`
- Hover: Lift effect with `shadow-xl` and slight translate

**Content Streaming Cards:**
- Two-column layout: Image preview (40%) + Generated content (60%)
- Real-time typing indicator with animated dots
- Progress bar: thin gradient from Primary to Secondary

### Workflow Visualization
**Node Design:**
- Circular nodes with status-based borders (processing, complete, pending)
- Size: 48px diameter
- Connecting lines: 2px dashed, animating on active
- Labels: Below nodes, `text-sm font-medium`

**State Indicators:**
- Processing: Pulsing purple glow
- Complete: Static green checkmark
- Pending: Muted gray with low opacity

### Forms & Inputs
**Input Fields:**
- Background: slightly lighter than container (`bg-white/5`)
- Border: `border-white/20`, focus: Primary color
- Padding: `px-4 py-3`
- Rounded: `rounded-lg`

**Selectors (Age/Knowledge):**
- Segmented control style with active state background
- Equal-width buttons in horizontal layout
- Active: Primary background with full opacity

### Interactive Quiz
**Question Card:**
- Elevated card with generous padding (`p-8`)
- Option buttons: Full-width, left-aligned text, radio indicator on right
- Feedback states: Green background for correct, red border for incorrect
- Explanation: Collapsible panel below options

### Progress & Analytics
**Progress Rings:**
- Circular progress with gradient stroke (Primary → Secondary)
- Percentage in center with large, bold numerals
- Background ring at 10% opacity

**Stats Dashboard:**
- 3-column grid of metric cards
- Each card: Large number on top, label below, trend indicator (optional)

### Future Features Preview
**Mockup Cards:**
- Slightly desaturated compared to active features
- "Coming Soon" badge in top-right
- Hover shows brief description overlay

---

## Animations

**Use Sparingly - Only Where Meaningful:**

1. **Workflow Progression:**
   - Node-to-node connection line animation (500ms ease)
   - Pulsing effect on active processing nodes

2. **Content Streaming:**
   - Fade-in for new content blocks (300ms)
   - Typing indicator animation (continuous subtle pulse)

3. **State Transitions:**
   - Button hover: scale(1.02) with 200ms ease
   - Card hover: translateY(-4px) with 300ms ease
   - Tab switches: 250ms slide fade

**No Animations On:**
- Text rendering
- Static content
- Image loading (use skeleton loaders instead)

---

## Images

**Vision-Analyzed Educational Images:**
- Display at maximum width: 600px for clarity
- Rounded corners: `rounded-lg`
- Subtle shadow for depth against dark background
- Alt text derived from vision analysis for accessibility

**Placement:**
- Within content cards alongside generated explanations
- Gallery view for comparing multiple images per concept
- Lightbox on click for detailed examination

**No Hero Image:** This is a dashboard application - prioritize functional workspace over marketing imagery

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column, stacked navigation)
- Tablet: 768px - 1024px (adjusted sidebar, 2-column content)
- Desktop: > 1024px (full layout with persistent sidebar)

**Mobile Adaptations:**
- Workflow visualizer: Vertical layout with scroll
- Side navigation: Bottom sheet
- Two-column content: Stack to single column
- Reduce spacing units by 50% (e.g., `p-8` → `p-4`)

---

## Accessibility

- Minimum contrast ratio: 7:1 for body text (AAA standard)
- Focus indicators: 2px offset ring in Primary color
- Keyboard navigation: All interactive elements reachable via Tab
- Screen reader: Descriptive labels for all workflow states and progress indicators
- Dark mode optimized: No pure black backgrounds to prevent halation