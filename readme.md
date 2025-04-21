# Pine Icon Library

A simple way to add beautiful icons to your web projects using Kajabi's Pine Design System. These icons work in any modern browser and are easy to customize.

[![npm version](https://badge.fury.io/js/%40pine-ds%2Ficons.svg)](https://badge.fury.io/js/%40pine-ds%2Ficons)

## What's Included
- Ready-to-use SVG icons that load fast
- Works in any modern browser
- Easy to change colors and sizes
- Works with TypeScript
- Automatic updates from Figma designs
- Built for accessibility

## Quick Start

Choose one of these two simple ways to start:

### 1. Direct Browser Use (No Framework Needed)

Add this line to your HTML:
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@pine-ds/icons@9.1.0/dist/pds-icons/pds-icons.esm.js"></script>
```

Then use icons anywhere in your HTML:
```html
<pds-icon name="icon-name"></pds-icon>
```

### 2. Using with React/npm

Install the package:
```bash
npm install @pine-ds/icons
```

Use in your code:
```jsx
<pds-icon name="icon-name"></pds-icon>
```

## How to Use Icons

### Basic Example
```html
<pds-icon name="icon-name"></pds-icon>
```

### Customize Your Icons

Change the size:
```html
<!-- Using preset sizes -->
<pds-icon name="icon-name" size="small"></pds-icon>     <!-- 12px -->
<pds-icon name="icon-name" size="regular"></pds-icon>   <!-- 16px -->
<pds-icon name="icon-name" size="medium"></pds-icon>    <!-- 20px -->
<pds-icon name="icon-name" size="large"></pds-icon>     <!-- 24px -->

<!-- Using custom sizes -->
<pds-icon name="icon-name" size="24px"></pds-icon>
<pds-icon name="icon-name" size="24"></pds-icon>
```

Change the color:
```html
<pds-icon name="icon-name" color="#663399"></pds-icon>
```

### Available Options

| Option | What it Does | Default | Examples |
|--------|-------------|---------|-----------|
| name   | Picks which icon to show | Required | `"menu"`, `"close"` |
| size   | Sets icon size | `"regular"` (16px) | `"small"`, `"medium"`, `"24px"` |
| color  | Changes icon color | Matches text color | `"#663399"`, `"blue"` |

## Need Help?

### Common Problems

1. Icons not showing up?
   - Check that you added the script correctly
   - Make sure you're using the right icon name
   - Check your browser's console for errors

2. Build issues?
   - Make sure you have Node.js version 22.7.0 or newer
   - Try running `npm install` to reinstall everything

### Get Support

Found a bug or need a new feature? [Open an issue](https://github.com/Kajabi/pine-icons/issues/new)

## Want to Contribute?

We welcome help! Here's how to get started:

1. Fork the project
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pine-icons.git
   cd pine-icons
   ```
3. Install what you need:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   This runs on port 7200 and shows your changes live.

5. Make your changes and test them:
   ```bash
   npm test
   ```

6. Create a pull request with your changes

### Development Requirements

- Node.js v22.7.0 or newer
- npm (comes with Node.js)
- Git

