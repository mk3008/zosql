# DOM Structure and CSS Layout Rules

Rules for simple DOM structures and common layout issue prevention.

## DOM Structure Principles

### Each DOM Level Must Have Clear Purpose
**Why**: Meaningless wrapper divs make debugging and maintenance difficult
**How**: Use semantic components instead of nested divs, each element solves one layout problem

### Separate Concerns Into Different Elements  
**Why**: Multiple CSS concerns in one element make modifications difficult
**How**: Split layout, scroll, and styling concerns into separate containers

## Scroll Issues Prevention

### Single Scroll Container with Bottom Padding
**Why**: Nested scroll containers cause last row cutoff, single container with padding ensures visibility
**How**: `overflow-auto` on parent with `paddingBottom: '80px'`, avoid nested scroll containers

### Sticky Headers
**Why**: Headers need background color to remain visible, padding on scroll container breaks positioning  
**How**: `position: sticky; top: 0; background: color;` on header, `overflow: auto` on container only

### Z-Index Scale
**Why**: Consistent scale prevents layering conflicts and eases maintenance
**How**: Use scale: base(0), sticky(10), dropdown(20), modal(30), tooltip(40)

### Full Height Layout
**Why**: Flex layout automatically distributes space and handles overflow
**How**: `h-screen flex flex-col` with `flex-shrink-0` headers/footers, `flex-1 overflow-auto` main

### Text Truncation
**Why**: Title attribute provides hover tooltip for cut-off content
**How**: `truncate` class with `title={fullText}` attribute

## Key Rules
- **Clear Purpose**: Each DOM level solves specific layout problem, use semantic components
- **Single Scroll**: One scroll container per view with bottom padding
- **Sticky Headers**: Background color required, no padding on scroll container
- **Z-Index Scale**: Consistent scale prevents conflicts
- **Full Height**: Use flexbox for automatic space distribution
- **Text Truncation**: Include title attribute for accessibility