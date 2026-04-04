# Tech Context — English_Teacher (VOT)

## Technologies

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.9.3 |
| Build | Vite 7.3.1 + vite-plugin-monkey |
| Styles | SCSS + LightningCSS |
| UI | lit-html 3.3.2 |
| Linter/Formatter | Biome |
| Testing | Bun test |
| Runtime | Userscript / Chrome/Firefox Extension |

## Core Dependencies

| Package | Purpose |
|---------|---------|
| `@vot.js/core`, `@vot.js/ext`, `@vot.js/shared` | Yandex translation SDK |
| `@toil/gmTypes` | GM API types |
| `bowser` | Browser detection |
| `chaimu` | Utility library |

## Build Commands

```bash
npm run build          # Standard userscript build
npm run build:min      # Minified build
npm run build:all      # Parallel standard + minified
npm run build:ext      # Native Chrome/Firefox extension
npm run build:chrome   # Chrome-specific extension build
npm run build:firefox  # Firefox-specific extension build
npm run build:dev      # Dev build with sourcemaps
npm run dev            # Development server
npm run test           # Run tests with Bun
npm run format         # Format code with Biome
npm run localize       # Localization CLI tool
npm run gen:wiki       # Generate wiki documentation
```

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Use `npm run dev` for development
4. Use `npm run build` or `npm run build:ext` for production builds