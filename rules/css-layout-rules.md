# DOM Structure and CSS Layout Rules

Rules for simple DOM structures and common layout issue prevention.

## DOM Structure Principles

### Each DOM Level Must Have Clear Purpose
**Why**: Meaningless wrapper divs make debugging and maintenance difficult. Each element should solve a specific layout problem.

```tsx
<div className="layout-container">      {/* Layout purpose */}
  <div className="scroll-area">         {/* Scroll behavior */}
    <div className="content-padding">   {/* Spacing/padding */}
      {content}
    </div>
  </div>
</div>

// Better: Use semantic components
<ContentLayout>  {/* Encapsulates layout logic */}
  {content}
</ContentLayout>
```

### Separate Concerns Into Different Elements
**Why**: Multiple CSS concerns in one element make it hard to modify one aspect without affecting others.

```tsx
<div className="layout-container">
  <div className="scroll-area">
    {content}
  </div>
</div>
```

## Scroll Issues Prevention

### Single Scroll Container with Bottom Padding
**Why**: Nested scroll containers cause the last row to be cut off. Single container with padding ensures all content is visible.

```tsx
<div className="h-full overflow-auto" style={{ paddingBottom: '80px' }}>
  <table>...</table>
  <div style={{ height: '40px' }} />  {/* Extra spacer for visibility */}
</div>
```

### Sticky Headers
**Why**: Headers must have background color to remain visible over content. Padding on scroll container breaks sticky positioning.

```css
.container { overflow: auto; }
.container thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #color;  /* Prevents content showing through */
}
```

## Z-Index Scale
**Why**: Arbitrary z-index values create conflicts and make maintenance difficult. Consistent scale prevents layering issues.

```css
.z-base: 0
.z-sticky: 10  
.z-dropdown: 20
.z-modal: 30
.z-tooltip: 40
```

## Common Patterns

### Full Height Layout
**Why**: Flex layout automatically distributes space and handles overflow correctly.

```tsx
<div className="h-screen flex flex-col">
  <header className="flex-shrink-0">...</header>
  <main className="flex-1 overflow-auto">...</main>
  <footer className="flex-shrink-0">...</footer>
</div>
```

### Text Truncation
**Why**: Users need to see full text when content is cut off. Title attribute provides hover tooltip.

```tsx
<div className="truncate" title={fullText}>
  {fullText}
</div>
```

## Debug Helpers
```typescript
// Quick scroll debug
const debugScroll = (el: HTMLElement) => ({
  scrollHeight: el.scrollHeight,
  clientHeight: el.clientHeight,
  canScroll: el.scrollHeight > el.clientHeight
});
```

## Quick Checklist
- [ ] Each DOM level has clear purpose (avoid wrapper-1, wrapper-2 names)
- [ ] Component abstraction used instead of deep nesting
- [ ] No empty wrapper divs
- [ ] One scroll container per view
- [ ] Sticky headers have background color
- [ ] Bottom padding for scrollable content
- [ ] Consistent z-index scale used
- [ ] Title attribute on truncated text

## What to Avoid and Why
1. **Div soup**: Excessive nesting makes debugging impossible
2. **Multiple scroll containers**: Causes last row cutoff issues
3. **Padding on sticky container**: Breaks sticky positioning completely
4. **Arbitrary z-index**: Creates unpredictable layering conflicts
5. **Missing backgrounds on sticky**: Content shows through headers