# Pine Icon Library

This is the Icon Library for Kajabi's Pine Design System. It provides a comprehensive set of SVG icons as web components that can be easily integrated into your projects.

[![npm version](https://badge.fury.io/js/%40pine-ds%2Ficons.svg)](https://badge.fury.io/js/%40pine-ds%2Ficons)

## Features

- SVG icons optimized for web use
- Icon web component for easy integration
- Customizable icon colors and sizes

## Usage in Your App
### Installation

```bash
npm install @pine-ds/icons
```

### Usage

```html
<pds-icon name="icon-name"></pds-icon>
```

## Contributing

1. Clone the repository
2. Create your feature branch (`git checkout -b style/amazing-style`)
3. Commit your changes (`git commit -m 'style(header): Add some amazing style'`)
  - Use conventional commits for your commit messages
4. Push to the branch (`git push origin style/amazing-style`)
5. Open a Pull Request

## Local Development

### Prerequisites

- Node.js (v22.7.0 or higher)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Kajabi/pine-icons.git
cd pine-icons
```

2. Install dependencies:
```bash
npm ci
```

3. Start the development server:
```bash
npm start
```

The development server will run on **port 7200**.

## Available Commands

- `npm start` - Start development server
- `npx nx run @pine-ds/icons:build` - Build the icon library
- `npx nx run @pine-ds/icons:update` - Update icons from Figma
- `npm test` - Run tests
- `npm run lint` - Run linting

## Support

For support, please [open an issue](https://github.com/Kajabi/pine-icons/issues/new) on GitHub.
