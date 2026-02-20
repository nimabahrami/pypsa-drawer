# PyPSA Network Drawer

A browser-based visual editor for designing [PyPSA](https://pypsa.org/) energy system networks. Draw network schematics with an intuitive drag-and-drop interface and generate ready-to-run PyPSA Python code.

## Features

- **Visual Network Design** — Drag and drop buses, generators, loads, storage units, lines, links, transformers, and more onto an SVG canvas
- **Schematic Rendering** — Clean engineering-style schematics with orthogonal connection routing and auto-sizing bus bars
- **Property Editor** — Click any component to edit its PyPSA attributes (nominal power, efficiency, carrier, bus assignments, etc.)
- **Carrier Management** — Define energy carriers (AC, DC, heat, hydrogen, etc.) with CO₂ emission parameters
- **Code Generation** — Automatically generates PyPSA Python code with proper `n.add()` calls, one keyword argument per line
- **PNG Export** — Export your network diagram as a high-resolution PNG with a component legend
- **Undo/Redo** — Full history support for all editing operations
- **Pan & Zoom** — Navigate large networks with mouse wheel zoom and drag-to-pan

## Supported Components

| Component | Category | Description |
|-----------|----------|-------------|
| Bus | Node | Electrical/energy bus |
| Generator | One-port | Power generation unit |
| Load | One-port | Power consumption |
| Storage Unit | One-port | Battery / pumped hydro |
| Store | One-port | Energy store |
| Shunt Impedance | One-port | Reactive compensation |
| Line | Branch | AC transmission line |
| Link | Branch | DC link / power flow control |
| Transformer | Branch | Voltage transformer |
| Carrier | Definition | Energy carrier type |

## Getting Started

### Run Locally

No build step required — just serve the files with any static HTTP server:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Deploy to GitHub Pages

This project is fully static and ready for GitHub Pages deployment:

1. Push to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch** → `main` / `root`
4. Your app will be live at `https://<username>.github.io/<repo-name>/`

## Project Structure

```
├── index.html          # Main HTML layout
├── style.css           # Styling (frosted glass UI, light theme)
└── js/
    ├── app.js          # Application entry point & toolbar
    ├── canvas.js       # SVG canvas engine (pan, zoom, drag, connections)
    ├── components.js   # PyPSA component definitions & SVG symbols
    ├── properties.js   # Right-side property editor panel
    ├── codegen.js      # Python code generator
    ├── export.js       # PNG export with legend
    └── history.js      # Undo/redo state management
```

## Technology

Pure HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies. Uses SVG for crisp, scalable rendering.

## License

MIT
