// js/app.js — Main Application Entry Point

import { COMPONENT_TYPES, DEFAULT_CARRIERS, createComponent } from './components.js';
import { Canvas } from './canvas.js';
import { PropertyEditor } from './properties.js';
import { CodeGenerator } from './codegen.js';
import { Exporter } from './export.js';
import { History } from './history.js';

class App {
    constructor() {
        this.canvas = new Canvas(document.getElementById('svg-canvas'), this);
        this.properties = new PropertyEditor(document.getElementById('prop-panel-content'), this);
        this.codegen = new CodeGenerator(document.getElementById('code-output'), this);
        this.exporter = new Exporter(this);
        this.history = new History(this);

        this._buildPalette();
        this._bindToolbar();
        this._bindCodePanel();

        // Initial history snapshot
        this.pushHistory();

        // Center the view
        this.canvas.panX = window.innerWidth / 2;
        this.canvas.panY = window.innerHeight / 2;
        this.canvas._applyTransform();
    }

    _buildPalette() {
        const palette = document.getElementById('palette-list');
        const categories = {
            'Definitions': ['Carrier'],
            'Nodes': ['Bus'],
            'One-Port': ['Generator', 'Load', 'StorageUnit', 'Store', 'ShuntImpedance'],
            'Branches': ['Line', 'Link', 'Transformer'],
        };

        for (const [cat, types] of Object.entries(categories)) {
            const header = document.createElement('div');
            header.className = 'palette-category';
            header.textContent = cat;
            palette.appendChild(header);

            for (const type of types) {
                const def = COMPONENT_TYPES[type];
                const btn = document.createElement('button');
                btn.className = 'palette-item';
                btn.dataset.type = type;
                btn.innerHTML = `<span class="palette-icon">${def.icon}</span>
                         <span class="palette-label">${def.label}</span>`;
                btn.addEventListener('click', () => {
                    if (type === 'Carrier') {
                        // Create carrier directly and show in properties sidebar
                        const comp = createComponent('Carrier');
                        this.canvas.components.push(comp);
                        this.onComponentsChanged();
                        this.pushHistory();
                        // Select it to show properties in the right sidebar
                        this.canvas.selectedId = comp.id;
                        this.properties.show(comp);
                        return;
                    }
                    // Toggle active state
                    palette.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.canvas.startPlacing(type);
                });
                palette.appendChild(btn);
            }
        }

        // Visual tools section
        const vizHeader = document.createElement('div');
        vizHeader.className = 'palette-category';
        vizHeader.textContent = 'Visual';
        palette.appendChild(vizHeader);

        const terrBtn = document.createElement('button');
        terrBtn.className = 'palette-item';
        terrBtn.innerHTML = `<span class="palette-icon" style="font-size:11px">[ ]</span>
                     <span class="palette-label">Territory</span>`;
        terrBtn.addEventListener('click', () => {
            palette.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active'));
            terrBtn.classList.add('active');
            this.canvas.startDrawingTerritory();
            const hint = document.getElementById('canvas-hint');
            if (hint) {
                hint.textContent = 'Click and drag to draw a territory rectangle -- Esc to cancel';
                hint.classList.add('visible');
            }
        });
        palette.appendChild(terrBtn);
    }

    _bindToolbar() {
        document.getElementById('btn-undo').addEventListener('click', () => this.history.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.history.redo());
        document.getElementById('btn-clear').addEventListener('click', () => {
            if (this.canvas.components.length === 0 || confirm('Clear all components?')) {
                this.canvas.clear();
                this.pushHistory();
            }
        });
        document.getElementById('btn-center').addEventListener('click', () => this.canvas.centerView());
        document.getElementById('btn-export').addEventListener('click', () => this.exporter.exportPNG());
        document.getElementById('btn-code').addEventListener('click', () => this.toggleCodePanel());

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.history.redo();
                else this.history.undo();
            }
        });
    }

    _bindCodePanel() {
        document.getElementById('btn-copy-code').addEventListener('click', () => {
            const code = this.codegen.generate(this.canvas.components);
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.getElementById('btn-copy-code');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy Code'; }, 1500);
            });
        });
        document.getElementById('btn-close-code').addEventListener('click', () => {
            const p = document.getElementById('code-panel');
            p.classList.remove('open');
            p.style.height = '';
        });

        // Drag-to-resize code panel
        const panel = document.getElementById('code-panel');
        const handle = document.getElementById('code-resize-handle');
        if (handle) {
            let startY, startH;
            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                startY = e.clientY;
                startH = panel.offsetHeight;
                const onMove = (e2) => {
                    const newH = Math.max(80, Math.min(600, startH + (startY - e2.clientY)));
                    panel.style.height = newH + 'px';
                };
                const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
            });
        }
    }

    toggleCodePanel() {
        const panel = document.getElementById('code-panel');
        const isOpen = panel.classList.toggle('open');
        if (isOpen) {
            panel.style.height = '';
            this.codegen.render(this.canvas.components);
        } else {
            panel.style.height = '';
        }
    }

    // Callbacks from canvas
    onComponentsChanged() {
        // Update code if panel is open
        const panel = document.getElementById('code-panel');
        if (panel.classList.contains('open')) {
            this.codegen.render(this.canvas.components);
        }
        // Update component count
        // Update component count (exclude carriers from visual count)
        const visualCount = this.canvas.components.filter(c => c.type !== 'Carrier').length;
        const carrierCount = this.canvas.components.filter(c => c.type === 'Carrier').length;
        let countText = `${visualCount} components`;
        if (carrierCount > 0) countText += ` | ${carrierCount} carriers`;
        document.getElementById('comp-count').textContent = countText;
    }

    onSelectionChanged(id) {
        const comp = id ? this.canvas.getComponentById(id) : null;
        this.properties.show(comp);

        // If a component is selected, also show its connected bus info
        document.getElementById('prop-panel').classList.toggle('has-selection', !!(comp || this.canvas.selectedTerritoryId));
    }

    onTerritorySelected(terr) {
        this.properties.showTerritory(terr);
        document.getElementById('prop-panel').classList.toggle('has-selection', !!terr);
    }

    onPlacingDone() {
        document.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active'));
    }

    focusProperty(key) {
        this.properties.focusField(key);
    }

    pushHistory() {
        this.history.push();
    }
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
