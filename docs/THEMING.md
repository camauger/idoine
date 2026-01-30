# IDOINE Theming Guide

This guide explains how to create and customize themes for IDOINE. As a theme builder, IDOINE provides a flexible architecture that allows you to create unique visual identities while maintaining a consistent structure.

## Table of Contents

1. [Theme Architecture](#theme-architecture)
2. [CSS Variables System](#css-variables-system)
3. [Creating a New Theme](#creating-a-new-theme)
4. [Dark Mode Support](#dark-mode-support)
5. [Typography System](#typography-system)
6. [Component Styling](#component-styling)
7. [Template Customization](#template-customization)
8. [Best Practices](#best-practices)

## Theme Architecture

IDOINE uses a modular SCSS architecture organized by concern:

```
src/styles/
├── main.scss              # Entry point - imports all modules
├── base/                  # Foundation styles
│   ├── _variables.scss    # CSS custom properties (theme tokens)
│   ├── _reset.scss        # CSS reset/normalize
│   ├── _typography.scss   # Font styles and text utilities
│   ├── _fonts.scss        # @font-face declarations
│   ├── _accessibility.scss # Focus states, skip links
│   ├── _animations.scss   # Keyframes and transitions
│   └── _utils.scss        # Utility classes
├── layout/                # Structural components
│   ├── _header.scss       # Site header and navigation
│   ├── _footer.scss       # Site footer
│   ├── _layout.scss       # Grid and container systems
│   ├── _page.scss         # Page-level layouts
│   └── _pagination.scss   # Pagination styles
├── components/            # Reusable UI components
│   ├── _buttons.scss      # Button styles
│   ├── _card.scss         # Card component
│   ├── _gallery.scss      # Image gallery
│   └── _image-detail.scss # Single image view
├── pages/                 # Page-specific styles
│   ├── _home.scss         # Homepage
│   ├── _about.scss        # About page
│   ├── _hero.scss         # Hero sections
│   ├── _glossary-term.scss
│   └── _glossary-tag.scss
└── posts/                 # Blog-specific styles
    ├── _post.scss         # Single post
    ├── _posts.scss        # Post listings
    └── _tags.scss         # Tag styles
```

## CSS Variables System

IDOINE uses CSS custom properties (variables) for theming. All theme tokens are defined in `src/styles/base/_variables.scss`.

### Color Tokens

```scss
:root {
  /* Primary brand colors */
  --color-primary: #2a9d8f;
  --color-primary-light: #4cc9b0;
  --color-primary-dark: #237a68;

  /* Secondary/accent colors */
  --color-secondary: #e76f51;
  --color-secondary-dark: #d65a3e;

  /* Text colors */
  --color-text: #333333;
  --color-text-light: #666666;
  --color-text-muted: #888888;

  /* Background colors */
  --color-background: #fafafa;
  --color-background-alt: #f5f5f5;

  /* UI colors */
  --color-border: #e0e0e0;
  --color-white: #ffffff;
}
```

### Typography Tokens

```scss
:root {
  /* Font families */
  --font-primary: "Montserrat", sans-serif;
  --font-display: "Cinzel Decorative", serif;
  --font-mono: "Fira Code", monospace;

  /* Font sizes (fluid scale) */
  --text-sm: 1rem;      /* 16px */
  --text-base: 1.2rem;  /* 19.2px */
  --text-lg: 1.6rem;    /* 25.6px */
  --text-xl: 2rem;      /* 32px */
  --text-2xl: 2.4rem;   /* 38.4px */
  --text-3xl: 3rem;     /* 48px */
  --text-4xl: 4rem;     /* 64px */
}
```

### Spacing Tokens

```scss
:root {
  /* Spacing scale (based on 0.4rem = 6.4px) */
  --spacing-1: 0.4rem;   /* 6.4px */
  --spacing-2: 0.8rem;   /* 12.8px */
  --spacing-3: 1.2rem;   /* 19.2px */
  --spacing-4: 1.6rem;   /* 25.6px */
  --spacing-6: 2.4rem;   /* 38.4px */
  --spacing-8: 3.2rem;   /* 51.2px */
  --spacing-12: 4.8rem;  /* 76.8px */
}
```

### Layout Tokens

```scss
:root {
  /* Container widths */
  --container-width: 120rem;  /* 1920px */
  --post-width: 60rem;        /* 960px */

  /* Border radius */
  --border-radius: 0.4rem;
  --border-radius-lg: 0.8rem;

  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 0.3s;
  --transition-normal: 0.5s;

  /* Z-index layers */
  --z-nav: 90;
  --z-modal: 100;
  --z-overlay: 80;
}
```

## Creating a New Theme

### Step 1: Create Theme Variables

Create a new file `src/styles/themes/_my-theme.scss`:

```scss
// My Custom Theme
// =============================================================================

[data-theme="my-theme"] {
  // Brand colors
  --color-primary: #6366f1;        // Indigo
  --color-primary-light: #818cf8;
  --color-primary-dark: #4f46e5;
  --color-secondary: #f59e0b;      // Amber
  --color-secondary-dark: #d97706;

  // Accent color for special elements
  --color-accent: #ec4899;         // Pink

  // Text
  --color-text: #1f2937;
  --color-text-light: #4b5563;
  --color-text-muted: #9ca3af;

  // Backgrounds
  --color-background: #ffffff;
  --color-background-alt: #f9fafb;

  // Borders
  --color-border: #e5e7eb;

  // Custom gradients
  --gradient-primary: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  --gradient-hero: linear-gradient(to bottom right, #6366f1, #ec4899);
}
```

### Step 2: Import Theme in Main SCSS

Update `src/styles/main.scss`:

```scss
@use "base";
@use "themes/my-theme";  // Add your theme
@use "layout";
@use "components";
@use "pages";
@use "posts";
```

### Step 3: Add Theme Toggle (Optional)

If you want users to switch themes, update `src/scripts/themeToggle.js`:

```javascript
const themes = ['light', 'dark', 'my-theme'];
let currentTheme = localStorage.getItem('theme') || 'light';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function cycleTheme() {
  const currentIndex = themes.indexOf(currentTheme);
  currentTheme = themes[(currentIndex + 1) % themes.length];
  setTheme(currentTheme);
}
```

## Dark Mode Support

IDOINE includes built-in dark mode support. Override dark mode colors using the `[data-theme="dark"]` selector:

```scss
[data-theme="dark"] {
  // Text colors (ensure WCAG contrast)
  --color-text: #e0e0e0;
  --color-text-light: #b8b8b8;

  // Background colors
  --color-background: #121212;
  --color-background-alt: #1e1e1e;

  // Borders
  --color-border: #2d3748;

  // Adjusted shadows for dark backgrounds
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.4);
}
```

### Automatic Dark Mode Detection

The base template includes automatic dark mode detection:

```html
<script>
  if (
    localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark-mode");
  }
</script>
```

## Typography System

### Font Setup

Fonts are self-hosted in `src/assets/fonts/`. Define `@font-face` rules in `src/styles/base/_fonts.scss`:

```scss
/* Primary font - Montserrat */
@font-face {
  font-family: 'Montserrat';
  src: url('/assets/fonts/montserrat/montserrat-latin-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Montserrat';
  src: url('/assets/fonts/montserrat/montserrat-latin-700-normal.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Display font - Cinzel Decorative */
@font-face {
  font-family: 'Cinzel Decorative';
  src: url('/assets/fonts/cinzel-decorative/cinzel-decorative-latin-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Using Custom Fonts

1. Add font files to `src/assets/fonts/your-font/`
2. Update `_fonts.scss` with `@font-face` declarations
3. Update `_variables.scss` with new font family variables

```scss
:root {
  --font-primary: "Your Font", sans-serif;
  --font-display: "Your Display Font", serif;
}
```

### Typography Classes

Use the typography system in `_typography.scss`:

```scss
.text-sm { font-size: var(--text-sm); }
.text-base { font-size: var(--text-base); }
.text-lg { font-size: var(--text-lg); }
.text-xl { font-size: var(--text-xl); }

.font-primary { font-family: var(--font-primary); }
.font-display { font-family: var(--font-display); }

.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## Component Styling

### Card Component Example

```scss
// src/styles/components/_card.scss

.card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform var(--transition-fast),
              box-shadow var(--transition-fast);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }

  &__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  &__content {
    padding: var(--spacing-4);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--color-text);
    margin-bottom: var(--spacing-2);
  }

  &__description {
    color: var(--color-text-light);
    font-size: var(--text-base);
  }
}
```

### Button Component Example

```scss
// src/styles/components/_buttons.scss

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--border-radius);
  transition: all var(--transition-fast);
  cursor: pointer;

  &--primary {
    background: var(--color-primary);
    color: var(--color-white);
    border: none;

    &:hover {
      background: var(--color-primary-dark);
    }
  }

  &--secondary {
    background: transparent;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);

    &:hover {
      background: var(--color-primary);
      color: var(--color-white);
    }
  }

  &--ghost {
    background: transparent;
    color: var(--color-text);
    border: none;

    &:hover {
      background: var(--color-background-alt);
    }
  }
}
```

## Template Customization

### Overriding Templates

To customize the HTML structure, modify templates in `src/templates/`:

```
src/templates/
├── base.html              # Base layout (html, head, body)
├── page.html              # Generic page wrapper
├── components/
│   ├── header.html        # Site header
│   ├── footer.html        # Site footer
│   ├── hero.html          # Hero section
│   ├── lang-switcher.html # Language selector
│   └── ...
├── pages/
│   ├── home.html          # Homepage template
│   ├── about.html         # About page
│   ├── blog.html          # Blog listing
│   └── gallery.html       # Image gallery
└── posts/
    └── post.html          # Single blog post
```

### Template Variables

Templates have access to these variables:

```jinja2
{# Site configuration #}
{{ site.title }}
{{ site.description }}
{{ site.author }}
{{ site.languages }}

{# Page-specific #}
{{ page.title }}
{{ page.description }}
{{ page.lang }}
{{ page.url }}
{{ page.content_translations }}

{# Translations #}
{{ t.home }}
{{ t.blog }}
{{ t.read_more }}

{# Content #}
{{ content }}  {# Rendered Markdown #}
```

### Creating a Custom Page Template

1. Create `src/templates/pages/custom.html`:

```jinja2
{% extends "base.html" %}

{% block content %}
<article class="custom-page">
  <header class="custom-page__header">
    <h1>{{ page.title }}</h1>
    {% if page.subtitle %}
    <p class="subtitle">{{ page.subtitle }}</p>
    {% endif %}
  </header>

  <div class="custom-page__content">
    {{ content }}
  </div>

  {% if page.cta_text %}
  <div class="custom-page__cta">
    <a href="{{ page.cta_url }}" class="btn btn--primary">
      {{ page.cta_text }}
    </a>
  </div>
  {% endif %}
</article>
{% endblock %}
```

2. Reference in frontmatter:

```yaml
---
title: My Custom Page
template: pages/custom.html
subtitle: A beautiful subtitle
cta_text: Learn More
cta_url: /about/
---
```

## Best Practices

### 1. Use CSS Variables for All Theme Values

```scss
// ✅ Good - uses variables
.element {
  color: var(--color-text);
  padding: var(--spacing-4);
}

// ❌ Bad - hardcoded values
.element {
  color: #333333;
  padding: 16px;
}
```

### 2. Follow BEM Naming Convention

```scss
// Block
.card { }

// Element
.card__title { }
.card__content { }

// Modifier
.card--featured { }
.card--compact { }
```

### 3. Ensure Accessibility

```scss
// Ensure sufficient color contrast (WCAG AA)
:root {
  --color-text: #333333;       // 12.6:1 on white
  --color-text-light: #666666; // 5.74:1 on white (passes AA)
}

// Provide focus states
.btn:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
```

### 4. Mobile-First Responsive Design

```scss
.container {
  padding: var(--spacing-4);

  @media (min-width: 768px) {
    padding: var(--spacing-6);
  }

  @media (min-width: 1024px) {
    padding: var(--spacing-8);
  }
}
```

### 5. Optimize Font Loading

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/assets/fonts/montserrat/montserrat-latin-400-normal.woff2"
      as="font" type="font/woff2" crossorigin>
```

### 6. Use Semantic Color Names

```scss
// ✅ Good - semantic names
--color-primary: #2a9d8f;
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;

// ❌ Bad - literal color names
--color-teal: #2a9d8f;
--color-green: #10b981;
```

## Theme Examples

### Minimal Light Theme

```scss
[data-theme="minimal"] {
  --color-primary: #000000;
  --color-secondary: #666666;
  --color-text: #111111;
  --color-background: #ffffff;
  --color-background-alt: #fafafa;
  --color-border: #eeeeee;

  --font-primary: "Inter", sans-serif;
  --font-display: "Inter", sans-serif;

  --border-radius: 0;
  --shadow-sm: none;
  --shadow-md: none;
}
```

### Vibrant Theme

```scss
[data-theme="vibrant"] {
  --color-primary: #8b5cf6;      // Purple
  --color-secondary: #06b6d4;    // Cyan
  --color-accent: #f43f5e;       // Rose

  --color-text: #1e1b4b;
  --color-background: #faf5ff;
  --color-background-alt: #f3e8ff;

  --gradient-primary: linear-gradient(135deg, #8b5cf6, #06b6d4);
  --gradient-hero: linear-gradient(to right, #8b5cf6, #f43f5e, #06b6d4);
}
```

### Corporate Theme

```scss
[data-theme="corporate"] {
  --color-primary: #0066cc;
  --color-secondary: #003366;

  --color-text: #1a1a1a;
  --color-background: #ffffff;
  --color-background-alt: #f5f7fa;

  --font-primary: "Open Sans", sans-serif;
  --font-display: "Playfair Display", serif;

  --border-radius: 4px;
  --border-radius-lg: 8px;
}
```

## Building and Testing Themes

```bash
# Development with live reload
npm run dev

# Build for production
npm run build

# Test theme in different browsers
# Open http://localhost:9000 and toggle themes
```

## Resources

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [WCAG Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Google Fonts](https://fonts.google.com/)
- [Fontsource](https://fontsource.org/) - Self-hosted fonts
- [BEM Methodology](https://getbem.com/)

