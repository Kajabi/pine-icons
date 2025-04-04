# Pine Icon Library

This is the Icon Library for Kajabi's Pine Design System. It provides a comprehensive set of optimized SVG icons as web components that can be easily integrated into your projects.

[![npm version](https://badge.fury.io/js/%40pine-ds%2Ficons.svg)](https://badge.fury.io/js/%40pine-ds%2Ficons)

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## Features

- **Optimized SVG Icons:** Minimal file sizes for efficient web performance.
- **Custom Web Component:** Seamlessly integrate icons into any project with browser native support.
- **Customizable:** Modify icon properties like color and size effortlessly.
- **TypeScript Support:** Fully typed definitions for robust development.
- **Automated Figma Integration:** Keep icons up-to-date with design iterations.
- **Accessibility-First:** Built with ARIA attributes for improved accessibility.

## Quick Start

Get up and running in minutes:
1. **Install the package:**
   ```bash
   npm install @pine-ds/icons
   ```
2. **Import and register the web components:**
   ```javascript
   import '@pine-ds/icons';
   ```
3. **Use the icon in your HTML:**
   ```html
   <pds-icon name="icon-name"></pds-icon>
   ```

## Pine Core Integration

Pine Icons is designed to work alongside Pine Core, our main design system package. Before using Pine Icons, ensure you have Pine Core set up in your project:

```html
<!-- Add to your <head> tag -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@pine-ds/core@[VERSION]/dist/pine-core/pine-core.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@pine-ds/core@[VERSION]/dist/pine-core/pine-core.esm.js"></script>
<script nomodule src="https://cdn.jsdelivr.net/npm/@pine-ds/core@[VERSION]/dist/pine-core/index.esm.js"></script>
```

Once Pine Core is set up, you can proceed with installing and using Pine Icons either through npm (as shown in Quick Start) or via CDN.

## Installation & Setup

### Using npm

```bash
npm install @pine-ds/icons
```

### Using yarn

```bash
yarn add @pine-ds/icons
```

### Import and Registration

```javascript
// Import in your main application file
import '@pine-ds/icons';
// The web components will be automatically registered
```

## Usage

### Basic Usage

```html
<pds-icon name="icon-name"></pds-icon>
```

### Customization Options

```html
<!-- Custom size -->
<pds-icon name="icon-name" size="24px"></pds-icon>

<!-- Custom color -->
<pds-icon name="icon-name" color="#663399"></pds-icon>
```

### Available Properties

| Property | Type   | Default         | Description                                                         |
|----------|--------|-----------------|---------------------------------------------------------------------|
| name     | string | **required**    | The name of the icon to display                                     |
| size     | number | `regular`            | Size of the icon in pixels                                          |
| color    | string | | Color of the icon (supports hex, rgb, Pine token, or CSS color names) |

## Contributing

We welcome contributions! Please follow these guidelines when contributing to the project.

### Development Workflow

1. **Fork the repository.**
2. **Clone:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pine-icons.git
   cd pine-icons
   ```
3. **Create your branch:**
   ```bash
   git checkout -b style/your-style-update
   ```
4. **Install dependencies:**
   ```bash
   npm ci
   ```
5. **Develop and test your changes:**
   ```bash
   npm start
   npm test
   ```
6. **Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):**
   ```bash
   git commit -m 'style(header): add new header styles'
   ```
7. **Push your branch:**
   ```bash
   git push origin style/your-style-update
   ```
8. **Open a Pull Request.**

### Development Prerequisites

- **Node.js:** v22.7.0 or higher
- **npm:** (comes with Node.js)
- **Git**

### Local Development

1. **Start the development server:**
   ```bash
   npm start
   ```
   The server runs on **port 7200** and provides a live preview.
2. **Run tests:** Ensure your changes pass all tests.

### Available Commands

| Command                                   | Description                                      |
|-------------------------------------------|--------------------------------------------------|
| `npm start`                               | Start development server with live preview       |
| `npx nx run @pine-ds/icons:build`           | Build the icon library for production            |
| `npx nx run @pine-ds/icons:update`          | Update icons from Figma source                   |
| `npm test`                                | Run unit and integration tests                   |
| `npm run lint`                            | Run code linting                                 |

### Code Style Guidelines

- Follow the existing code style.
- Use TypeScript for all new code.
- Aim for 100% test coverage on new features.
- Include JSDoc comments for all public APIs.
- Adhere to accessibility best practices.

## Troubleshooting

### Common Issues

1. **Icons not displaying:**
   - Verify that the package is installed correctly.
   - Confirm that web components are registered.
   - Check that the icon name is correct.

2. **Build errors:**
   - Ensure you're using the correct Node.js version.
   - Clear the npm cache and reinstall dependencies with `npm ci`.

## Support

For bugs and feature requests, please [open an issue](https://github.com/Kajabi/pine-icons/issues/new).

