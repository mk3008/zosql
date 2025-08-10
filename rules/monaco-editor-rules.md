# Monaco Editor Integration Rules

Rules for Monaco Editor SQL integration, theme management, and remount prevention.

### Theme Management (CRITICAL)
**Why**: Re-initializing themes on remounts causes visible flicker
**How**: Use global flag to define theme once, apply on each mount

### Prevent Unnecessary Remounts  
**Why**: Inline objects/functions cause editor to recreate and lose state
**How**: Use `useMemo` for options, `useCallback` for handlers

### Editor Reference Management
**Why**: Proper cleanup prevents memory leaks and recreation issues
**How**: Store editor refs, dispose on unmount, avoid recreation

### IntelliSense Configuration
**Why**: SQL completions improve developer productivity and reduce errors  
**How**: Register SQL language once, provide completion items with workspace context

### Common Issues & Solutions
- **Dark mode flash**: Define theme globally once, apply on mount
- **State loss on tab switch**: Hide/show with CSS, don't unmount editor
- **Missing IntelliSense**: Set language to 'sql', register completion provider

### Performance Optimization  
**Why**: Debounced updates and virtual scrolling improve responsiveness
**How**: Debounce onChange (300ms), enable virtual scrolling options

### Testing Checklist
- [ ] No theme flicker on mount/tab switch
- [ ] Editor state preserved across tabs  
- [ ] IntelliSense shows workspace context
- [ ] No memory leaks on unmount
- [ ] Smooth scrolling for large files