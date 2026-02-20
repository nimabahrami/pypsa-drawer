// js/canvas.js — SVG Canvas Engine
// Handles: pan, zoom, grid, component placement, selection, connections, bus rotation

import { COMPONENT_TYPES, COMPONENT_SYMBOLS, COMPONENT_BOUNDS, createComponent } from './components.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_SIZE = 20;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;
const SCHEMATIC_COLOR = '#1d1d1f';

export class Canvas {
    constructor(svgEl, app) {
        this.svg = svgEl;
        this.app = app;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = null;
        this.components = [];
        this.connections = [];
        this.territories = [];
        this.selectedId = null;
        this.selectedTerritoryId = null;
        this.dragging = null;
        this.placingType = null;
        this.drawingTerritory = false;
        this.territoryDraw = null;

        // Create SVG sub-groups
        this.gridGroup = this._createGroup('grid-layer');
        this.territoryGroup = this._createGroup('territory-layer');
        this.connectionGroup = this._createGroup('connection-layer');
        this.componentGroup = this._createGroup('component-layer');
        this.uiGroup = this._createGroup('ui-layer');
        this.mainGroup = document.createElementNS(SVG_NS, 'g');
        this.mainGroup.id = 'main-transform';
        this.mainGroup.appendChild(this.gridGroup);
        this.mainGroup.appendChild(this.territoryGroup);
        this.mainGroup.appendChild(this.connectionGroup);
        this.mainGroup.appendChild(this.componentGroup);
        this.mainGroup.appendChild(this.uiGroup);
        this.svg.appendChild(this.mainGroup);

        this._drawGrid();
        this._bindEvents();
    }

    _createGroup(id) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.id = id;
        return g;
    }

    _drawGrid() {
        const defs = document.createElementNS(SVG_NS, 'defs');
        const pattern = document.createElementNS(SVG_NS, 'pattern');
        pattern.id = 'grid-pattern';
        pattern.setAttribute('width', GRID_SIZE);
        pattern.setAttribute('height', GRID_SIZE);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', GRID_SIZE);
        dot.setAttribute('cy', GRID_SIZE);
        dot.setAttribute('r', '0.6');
        dot.setAttribute('fill', 'rgba(0,0,0,0.08)');
        pattern.appendChild(dot);
        defs.appendChild(pattern);
        this.svg.insertBefore(defs, this.mainGroup);

        const gridRect = document.createElementNS(SVG_NS, 'rect');
        gridRect.setAttribute('x', -10000);
        gridRect.setAttribute('y', -10000);
        gridRect.setAttribute('width', 20000);
        gridRect.setAttribute('height', 20000);
        gridRect.setAttribute('fill', 'url(#grid-pattern)');
        this.gridGroup.appendChild(gridRect);
    }

    _bindEvents() {
        // Pan
        this.svg.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.component-group')) return;

            // Territory click — select and start dragging (but NOT when placing components)
            if (e.target.closest('.territory-rect') && !this.placingType && !this.drawingTerritory) {
                const terrEl = e.target.closest('.territory-rect');
                const handleEl = e.target.closest('.territory-handle');
                if (handleEl) {
                    // Start resizing
                    const terr = this.territories.find(t => t.id === terrEl.dataset.id);
                    this.selectTerritory(terrEl.dataset.id);
                    this.dragging = {
                        resizing: terr,
                        handle: handleEl.dataset.corner,
                        startX: e.clientX, startY: e.clientY,
                        origX: terr.x, origY: terr.y, origW: terr.w, origH: terr.h
                    };
                } else {
                    this.selectTerritory(terrEl.dataset.id);
                    this.dragging = {
                        territory: this.territories.find(t => t.id === terrEl.dataset.id),
                        startX: e.clientX, startY: e.clientY
                    };
                }
                return;
            }

            // Start territory drawing
            if (this.drawingTerritory) {
                const pt = this._screenToWorld(e.clientX, e.clientY);
                const snapped = this._snap(pt.x, pt.y);
                this.territoryDraw = { startX: snapped.x, startY: snapped.y };
                return;
            }

            if (e.target === this.svg || e.target.closest('#grid-layer')) {
                if (e.button === 0 && !this.placingType) {
                    this.isPanning = true;
                    this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                    this.svg.style.cursor = 'grabbing';
                }
                if (!this.placingType) {
                    this.select(null);
                    this.selectTerritory(null);
                }
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStart.x;
                this.panY = e.clientY - this.panStart.y;
                this._applyTransform();
            }
            if (this.territoryDraw) {
                // Preview territory rectangle while dragging
                const pt = this._screenToWorld(e.clientX, e.clientY);
                const snapped = this._snap(pt.x, pt.y);
                const td = this.territoryDraw;
                let preview = this.uiGroup.querySelector('.territory-preview');
                if (!preview) {
                    preview = document.createElementNS(SVG_NS, 'rect');
                    preview.classList.add('territory-preview');
                    preview.setAttribute('fill', 'rgba(220, 50, 50, 0.08)');
                    preview.setAttribute('stroke', '#cc3333');
                    preview.setAttribute('stroke-width', '1.5');
                    preview.setAttribute('stroke-dasharray', '6 4');
                    preview.setAttribute('rx', '4');
                    this.uiGroup.appendChild(preview);
                }
                preview.setAttribute('x', Math.min(td.startX, snapped.x));
                preview.setAttribute('y', Math.min(td.startY, snapped.y));
                preview.setAttribute('width', Math.abs(snapped.x - td.startX));
                preview.setAttribute('height', Math.abs(snapped.y - td.startY));
                return;
            }
            if (this.dragging) {
                if (this.dragging.resizing) {
                    // Resize territory
                    const dx = (e.clientX - this.dragging.startX) / this.zoom;
                    const dy = (e.clientY - this.dragging.startY) / this.zoom;
                    const t = this.dragging.resizing;
                    const corner = this.dragging.handle;
                    if (corner === 'se') {
                        t.w = Math.max(40, this.dragging.origW + dx);
                        t.h = Math.max(40, this.dragging.origH + dy);
                    } else if (corner === 'sw') {
                        t.x = this.dragging.origX + dx;
                        t.w = Math.max(40, this.dragging.origW - dx);
                        t.h = Math.max(40, this.dragging.origH + dy);
                    } else if (corner === 'ne') {
                        t.y = this.dragging.origY + dy;
                        t.w = Math.max(40, this.dragging.origW + dx);
                        t.h = Math.max(40, this.dragging.origH - dy);
                    } else if (corner === 'nw') {
                        t.x = this.dragging.origX + dx;
                        t.y = this.dragging.origY + dy;
                        t.w = Math.max(40, this.dragging.origW - dx);
                        t.h = Math.max(40, this.dragging.origH - dy);
                    }
                    this._renderTerritory(t);
                } else if (this.dragging.territory) {
                    // Drag territory
                    const dx = (e.clientX - this.dragging.startX) / this.zoom;
                    const dy = (e.clientY - this.dragging.startY) / this.zoom;
                    this.dragging.territory.x += dx;
                    this.dragging.territory.y += dy;
                    this.dragging.startX = e.clientX;
                    this.dragging.startY = e.clientY;
                    this._renderTerritory(this.dragging.territory);
                } else {
                    const pt = this._screenToWorld(e.clientX, e.clientY);
                    const snapped = this._snap(pt.x, pt.y);
                    this.dragging.comp.cx = snapped.x;
                    this.dragging.comp.cy = snapped.y;
                    this._updateComponentPosition(this.dragging.comp);
                    this._redrawConnections();
                }
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (this.territoryDraw) {
                // Finish drawing territory
                const pt = this._screenToWorld(e.clientX, e.clientY);
                const snapped = this._snap(pt.x, pt.y);
                const td = this.territoryDraw;
                const x = Math.min(td.startX, snapped.x);
                const y = Math.min(td.startY, snapped.y);
                const w = Math.abs(snapped.x - td.startX);
                const h = Math.abs(snapped.y - td.startY);
                if (w > 20 && h > 20) {
                    const territory = {
                        id: 'terr_' + Date.now(),
                        name: 'Zone ' + (this.territories.length + 1),
                        x, y, w, h,
                        fillColor: '#dc3232',
                        opacity: 0.08,
                        borderColor: '#cc3333',
                    };
                    this.territories.push(territory);
                    this._renderTerritory(territory);
                    this.selectTerritory(territory.id);
                    this.app.pushHistory();
                }
                // Remove preview
                const preview = this.uiGroup.querySelector('.territory-preview');
                if (preview) preview.remove();
                this.territoryDraw = null;
                if (!e.shiftKey) {
                    this.drawingTerritory = false;
                    this.svg.style.cursor = 'default';
                    this.app.onPlacingDone();
                }
                return;
            }
            this.isPanning = false;
            this.dragging = null;
            this.svg.style.cursor = this.placingType || this.drawingTerritory ? 'crosshair' : 'default';
        });

        // Zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * delta));
            const rect = this.svg.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
            this.panY = my - (my - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
            this._applyTransform();
        }, { passive: false });

        // Place component on click
        this.svg.addEventListener('click', (e) => {
            if (this.placingType) {
                const pt = this._screenToWorld(e.clientX, e.clientY);
                const snapped = this._snap(pt.x, pt.y);
                this.addComponent(this.placingType, snapped.x, snapped.y);
                if (!e.shiftKey) {
                    this.placingType = null;
                    this.svg.style.cursor = 'default';
                    this.app.onPlacingDone();
                    const hint = document.getElementById('canvas-hint');
                    if (hint) hint.classList.remove('visible');
                }
            }
        });

        // Context menu for rotation
        this.svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const compEl = e.target.closest('.component-group');
            if (compEl) {
                const comp = this.components.find(c => c.id === compEl.dataset.id);
                if (comp && comp.type === 'Bus') {
                    comp.rotation = (comp.rotation + 90) % 360;
                    this._renderComponent(comp);
                    this._redrawConnections();
                }
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.placingType = null;
                this.svg.style.cursor = 'default';
                this.app.onPlacingDone();
                const hint = document.getElementById('canvas-hint');
                if (hint) hint.classList.remove('visible');
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
                if (this.selectedTerritoryId) {
                    this.deleteTerritory(this.selectedTerritoryId);
                } else if (this.selectedId) {
                    this.deleteComponent(this.selectedId);
                }
            }
            if (e.key === 'Escape') {
                if (this.drawingTerritory) {
                    this.drawingTerritory = false;
                    this.territoryDraw = null;
                    const preview = this.uiGroup.querySelector('.territory-preview');
                    if (preview) preview.remove();
                    this.svg.style.cursor = 'default';
                    this.app.onPlacingDone();
                }
            }
        });
    }

    _applyTransform() {
        this.mainGroup.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoom})`);
    }

    _screenToWorld(sx, sy) {
        const rect = this.svg.getBoundingClientRect();
        return {
            x: (sx - rect.left - this.panX) / this.zoom,
            y: (sy - rect.top - this.panY) / this.zoom,
        };
    }

    _snap(x, y) {
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        };
    }

    startPlacing(type) {
        this.placingType = type;
        this.svg.style.cursor = 'crosshair';
        const hint = document.getElementById('canvas-hint');
        if (hint) hint.classList.add('visible');
    }

    addComponent(type, x, y) {
        const comp = createComponent(type, { cx: x, cy: y });
        this.components.push(comp);

        // Auto-assign nearest bus for one-port and branch components
        const typeDef = COMPONENT_TYPES[type];
        if (typeDef.busKeys) {
            const buses = this.getBuses();
            if (buses.length > 0) {
                for (const busKey of typeDef.busKeys) {
                    if (!comp.data[busKey]) {
                        let nearest = null, minDist = Infinity;
                        for (const b of buses) {
                            const d = Math.hypot(b.cx - x, b.cy - y);
                            if (d < minDist) { minDist = d; nearest = b; }
                        }
                        if (nearest) comp.data[busKey] = nearest.data.name;
                    }
                }
            }
        }

        this._renderComponent(comp);
        this._redrawConnections();
        this.select(comp.id);
        this.app.onComponentsChanged();
        this.app.pushHistory();
        return comp;
    }

    deleteComponent(id) {
        this.components = this.components.filter(c => c.id !== id);
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
        const el = this.componentGroup.querySelector(`[data-id="${id}"]`);
        if (el) el.remove();
        this._redrawConnections();
        this.select(null);
        this.app.onComponentsChanged();
        this.app.pushHistory();
    }

    select(id) {
        this.componentGroup.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        this.connectionGroup.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        this.selectedId = id;
        if (id) {
            const el = this.componentGroup.querySelector(`[data-id="${id}"]`);
            if (el) el.classList.add('selected');
            const connEl = this.connectionGroup.querySelector(`[data-id="${id}"]`);
            if (connEl) connEl.classList.add('selected');
        }
        this.app.onSelectionChanged(id);
    }

    getComponentById(id) {
        return this.components.find(c => c.id === id);
    }

    getBuses() {
        return this.components.filter(c => c.type === 'Bus');
    }

    // Get bounding box of a component for connection endpoints
    _getBounds(comp) {
        if (comp.type === 'Bus') {
            // Count connected components
            let connCount = 0;
            for (const c of this.components) {
                const td = COMPONENT_TYPES[c.type];
                if (!td.busKeys) continue;
                for (const bk of td.busKeys) {
                    if (c.data[bk] === comp.data.name) connCount++;
                }
            }
            const baseLen = 40;
            const extra = Math.max(0, connCount - 2) * 18;
            const len = baseLen + extra;
            const isVert = comp.rotation === 90 || comp.rotation === 270;
            return isVert ? { hw: 4, hh: len } : { hw: len, hh: 4 };
        }
        return COMPONENT_BOUNDS[comp.type] || { hw: 20, hh: 20 };
    }

    // Calculate connection point on the bounding box edge
    // from center of `from` toward center of `to`
    _edgePoint(from, to) {
        const bounds = this._getBounds(from);
        const dx = to.cx - from.cx;
        const dy = to.cy - from.cy;

        if (dx === 0 && dy === 0) return { x: from.cx, y: from.cy };

        // Calculate intersection with bounding box
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        let t;
        if (absDx * bounds.hh > absDy * bounds.hw) {
            // Intersects left or right edge
            t = bounds.hw / absDx;
        } else {
            // Intersects top or bottom edge
            t = bounds.hh / absDy;
        }

        return {
            x: from.cx + dx * t,
            y: from.cy + dy * t,
        };
    }

    _renderComponent(comp) {
        const existing = this.componentGroup.querySelector(`[data-id="${comp.id}"]`);
        if (existing) existing.remove();

        const g = document.createElementNS(SVG_NS, 'g');
        g.classList.add('component-group');
        g.dataset.id = comp.id;
        g.dataset.type = comp.type;
        g.setAttribute('transform', `translate(${comp.cx}, ${comp.cy})`);

        // Hit area
        const bounds = this._getBounds(comp);
        const hit = document.createElementNS(SVG_NS, 'rect');
        hit.setAttribute('x', -(bounds.hw + 10));
        hit.setAttribute('y', -(bounds.hh + 10));
        hit.setAttribute('width', (bounds.hw + 10) * 2);
        hit.setAttribute('height', (bounds.hh + 10) * 2);
        hit.setAttribute('fill', 'transparent');
        hit.classList.add('hit-area');
        g.appendChild(hit);

        // Component symbol (dynamic for Bus)
        let symbolSvg;
        if (comp.type === 'Bus') {
            const isVert = comp.rotation === 90 || comp.rotation === 270;
            if (isVert) {
                symbolSvg = `<rect x="-3" y="-${bounds.hh}" width="6" height="${bounds.hh * 2}" rx="1" fill="#1d1d1f"/>`;
            } else {
                symbolSvg = `<rect x="-${bounds.hw}" y="-3" width="${bounds.hw * 2}" height="6" rx="1" fill="#1d1d1f"/>`;
            }
        } else {
            symbolSvg = COMPONENT_SYMBOLS[comp.type](comp.rotation);
        }
        const symbolGroup = document.createElementNS(SVG_NS, 'g');
        symbolGroup.innerHTML = symbolSvg;
        symbolGroup.classList.add('symbol');
        g.appendChild(symbolGroup);

        // Selection ring
        const selRing = document.createElementNS(SVG_NS, 'rect');
        selRing.setAttribute('x', -(bounds.hw + 6));
        selRing.setAttribute('y', -(bounds.hh + 6));
        selRing.setAttribute('width', (bounds.hw + 6) * 2);
        selRing.setAttribute('height', (bounds.hh + 6) * 2);
        selRing.setAttribute('rx', 4);
        selRing.setAttribute('fill', 'none');
        selRing.setAttribute('stroke', '#0071e3');
        selRing.setAttribute('stroke-width', '1.5');
        selRing.setAttribute('stroke-dasharray', '4 3');
        selRing.setAttribute('opacity', '0');
        selRing.classList.add('sel-ring');
        g.appendChild(selRing);

        // Label with background
        const labelY = -(bounds.hh + 10);
        const labelText = comp.data.name;
        const labelWidth = labelText.length * 6.2 + 10;
        const labelHeight = 16;

        const labelBg = document.createElementNS(SVG_NS, 'rect');
        labelBg.setAttribute('x', -labelWidth / 2);
        labelBg.setAttribute('y', labelY - labelHeight / 2 - 1);
        labelBg.setAttribute('width', labelWidth);
        labelBg.setAttribute('height', labelHeight);
        labelBg.setAttribute('rx', 3);
        labelBg.setAttribute('fill', 'rgba(255,255,255,0.88)');
        labelBg.setAttribute('stroke', 'rgba(0,0,0,0.08)');
        labelBg.setAttribute('stroke-width', '0.5');
        labelBg.classList.add('comp-label-bg');
        g.appendChild(labelBg);

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', 0);
        label.setAttribute('y', labelY + 3);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', '#1d1d1f');
        label.setAttribute('font-family', "'Inter', sans-serif");
        label.setAttribute('font-weight', '500');
        label.textContent = labelText;
        label.classList.add('comp-label');
        g.appendChild(label);

        // Event handlers
        g.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.select(comp.id);
            this.dragging = { comp, startX: e.clientX, startY: e.clientY };
        });

        g.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.app.focusProperty('name');
        });

        if (comp.id === this.selectedId) g.classList.add('selected');
        this.componentGroup.appendChild(g);
    }

    _updateComponentPosition(comp) {
        const g = this.componentGroup.querySelector(`[data-id="${comp.id}"]`);
        if (g) g.setAttribute('transform', `translate(${comp.cx}, ${comp.cy})`);
    }

    _redrawConnections() {
        while (this.connectionGroup.firstChild) this.connectionGroup.removeChild(this.connectionGroup.firstChild);

        // Re-render all buses so their size updates based on connection count
        for (const comp of this.components) {
            if (comp.type === 'Bus') this._renderComponent(comp);
        }


        for (const comp of this.components) {
            const typeDef = COMPONENT_TYPES[comp.type];
            if (!typeDef.busKeys) continue;

            if (typeDef.category === 'branch') {
                this._drawBranchConnection(comp, typeDef);
            } else {
                // One-port: orthogonal L-path from component to bus
                for (const busKey of typeDef.busKeys) {
                    const busName = comp.data[busKey];
                    if (!busName) continue;
                    const bus = this.components.find(c => c.type === 'Bus' && c.data.name === busName);
                    if (!bus) continue;
                    this._drawOrthogonalPath(bus, comp);
                }
            }
        }
    }

    // Draw orthogonal L-shaped path from a bus to a target component
    _drawOrthogonalPath(bus, target, opts = {}) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.classList.add('connection');
        if (!opts.skipId) g.dataset.id = target.id;

        const busBounds = this._getBounds(bus);
        const targetBounds = this._getBounds(target);

        const dx = target.cx - bus.cx;
        const dy = target.cy - bus.cy;
        const isVert = bus.rotation === 90 || bus.rotation === 270;

        // Bus connection point
        let bx, by;
        if (isVert) {
            bx = bus.cx + (dx >= 0 ? busBounds.hw : -busBounds.hw);
            by = Math.max(bus.cy - busBounds.hh, Math.min(bus.cy + busBounds.hh, target.cy));
        } else {
            bx = Math.max(bus.cx - busBounds.hw, Math.min(bus.cx + busBounds.hw, target.cx));
            by = bus.cy + (dy >= 0 ? busBounds.hh : -busBounds.hh);
        }

        // Target connection point
        let tx, ty;
        if (Math.abs(dx) > Math.abs(dy) || isVert) {
            tx = target.cx + (dx >= 0 ? -targetBounds.hw : targetBounds.hw);
            ty = target.cy;
        } else {
            tx = target.cx;
            ty = target.cy + (dy >= 0 ? -targetBounds.hh : targetBounds.hh);
        }

        // Orthogonal L-path
        const path = document.createElementNS(SVG_NS, 'path');
        let d;
        if (isVert) {
            d = `M${bx},${by} L${tx},${by} L${tx},${ty}`;
        } else {
            d = `M${bx},${by} L${bx},${ty} L${tx},${ty}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', SCHEMATIC_COLOR);
        path.setAttribute('stroke-width', '1.2');
        if (opts.dash) path.setAttribute('stroke-dasharray', opts.dash);

        // Small square at bus connection point
        const busNode = document.createElementNS(SVG_NS, 'rect');
        busNode.setAttribute('x', bx - 2.5);
        busNode.setAttribute('y', by - 2.5);
        busNode.setAttribute('width', 5);
        busNode.setAttribute('height', 5);
        busNode.setAttribute('fill', SCHEMATIC_COLOR);
        g.appendChild(busNode);

        g.appendChild(path);
        this.connectionGroup.appendChild(g);
        return { bx, by, tx, ty, g };
    }

    // Draw branch: two orthogonal L-paths, bus0 -> comp and comp -> bus1
    _drawBranchConnection(comp, typeDef) {
        const bus0Name = comp.data[typeDef.busKeys[0]];
        const bus1Name = comp.data[typeDef.busKeys[1]];

        const bus0 = bus0Name ? this.components.find(c => c.type === 'Bus' && c.data.name === bus0Name) : null;
        const bus1 = bus1Name ? this.components.find(c => c.type === 'Bus' && c.data.name === bus1Name) : null;

        // Dash style
        let dash = null;
        if (comp.type === 'Link') dash = '6 3';
        else if (comp.type === 'Transformer') dash = '3 2';

        // Draw path from bus0 to component
        if (bus0) {
            this._drawOrthogonalPath(bus0, comp, { dash, skipId: false });
        }

        // Draw path from bus1 to component
        if (bus1) {
            this._drawOrthogonalPath(bus1, comp, { dash, skipId: true });
        }

        // Direction arrow for Link — right after the component on the bus1 path
        if (comp.type === 'Link' && bus1) {
            const isBidirectional = comp.data.p_min_pu < 0;
            if (!isBidirectional) {
                const compBounds = this._getBounds(comp);
                const ddx = bus1.cx - comp.cx;
                const ddy = bus1.cy - comp.cy;
                const isVert1 = bus1.rotation === 90 || bus1.rotation === 270;

                // Determine direction of the first segment leaving the component toward bus1
                let ax, ay, angle;
                const arrowOffset = 14; // distance past the component edge
                if (Math.abs(ddx) > Math.abs(ddy) || isVert1) {
                    // First segment is horizontal
                    ax = comp.cx + (ddx >= 0 ? compBounds.hw + arrowOffset : -(compBounds.hw + arrowOffset));
                    ay = comp.cy;
                    angle = ddx >= 0 ? 0 : 180;
                } else {
                    // First segment is vertical
                    ax = comp.cx;
                    ay = comp.cy + (ddy >= 0 ? compBounds.hh + arrowOffset : -(compBounds.hh + arrowOffset));
                    angle = ddy >= 0 ? 90 : -90;
                }

                const arrowG = document.createElementNS(SVG_NS, 'g');
                arrowG.classList.add('connection');
                const arrow = document.createElementNS(SVG_NS, 'polygon');
                arrow.setAttribute('points', '6,0 -4,-4 -4,4');
                arrow.setAttribute('fill', SCHEMATIC_COLOR);
                arrow.setAttribute('transform', `translate(${ax},${ay}) rotate(${angle})`);
                arrowG.appendChild(arrow);
                this.connectionGroup.appendChild(arrowG);
            }
        }
    }

    redraw() {
        for (const comp of this.components) {
            if (comp.type === 'Carrier') continue;
            this._renderComponent(comp);
        }
        this._redrawConnections();
    }

    clear() {
        this.components = [];
        this.connections = [];
        this.territories = [];
        while (this.componentGroup.firstChild) this.componentGroup.removeChild(this.componentGroup.firstChild);
        while (this.connectionGroup.firstChild) this.connectionGroup.removeChild(this.connectionGroup.firstChild);
        while (this.territoryGroup.firstChild) this.territoryGroup.removeChild(this.territoryGroup.firstChild);
        this.select(null);
        this.selectTerritory(null);
        this.app.onComponentsChanged();
    }

    serialize() {
        return {
            components: this.components.map(c => ({ ...c, data: { ...c.data } })),
            territories: this.territories.map(t => ({ ...t })),
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY,
        };
    }

    restore(state) {
        this.components = state.components;
        this.territories = state.territories || [];
        this.zoom = state.zoom;
        this.panX = state.panX;
        this.panY = state.panY;
        this._applyTransform();
        while (this.componentGroup.firstChild) this.componentGroup.removeChild(this.componentGroup.firstChild);
        while (this.connectionGroup.firstChild) this.connectionGroup.removeChild(this.connectionGroup.firstChild);
        while (this.territoryGroup.firstChild) this.territoryGroup.removeChild(this.territoryGroup.firstChild);
        for (const t of this.territories) this._renderTerritory(t);
        this.redraw();
    }

    centerView() {
        if (this.components.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of this.components) {
            minX = Math.min(minX, c.cx);
            minY = Math.min(minY, c.cy);
            maxX = Math.max(maxX, c.cx);
            maxY = Math.max(maxY, c.cy);
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rect = this.svg.getBoundingClientRect();
        this.panX = rect.width / 2 - cx * this.zoom;
        this.panY = rect.height / 2 - cy * this.zoom;
        this._applyTransform();
    }
    // --- Territory methods ---

    startDrawingTerritory() {
        this.drawingTerritory = true;
        this.placingType = null;
        this.svg.style.cursor = 'crosshair';
    }

    _renderTerritory(t) {
        let existing = this.territoryGroup.querySelector(`[data-id="${t.id}"]`);
        if (existing) existing.remove();

        const g = document.createElementNS(SVG_NS, 'g');
        g.classList.add('territory-rect');
        g.dataset.id = t.id;

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', t.x);
        rect.setAttribute('y', t.y);
        rect.setAttribute('width', t.w);
        rect.setAttribute('height', t.h);
        rect.setAttribute('rx', 6);
        rect.setAttribute('fill', t.fillColor || '#dc3232');
        rect.setAttribute('fill-opacity', t.opacity != null ? t.opacity : 0.08);
        rect.setAttribute('stroke', t.borderColor || '#cc3333');
        rect.setAttribute('stroke-width', '1.5');
        rect.setAttribute('stroke-dasharray', '8 4');
        // Let clicks pass through to components above
        rect.style.pointerEvents = 'auto';
        g.appendChild(rect);

        // Name label at top-left inside
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', t.x + 10);
        label.setAttribute('y', t.y + 18);
        label.setAttribute('font-size', '12');
        label.setAttribute('fill', t.borderColor || '#cc3333');
        label.setAttribute('font-family', "'Inter', sans-serif");
        label.setAttribute('font-weight', '600');
        label.setAttribute('opacity', '0.8');
        label.textContent = t.name;
        g.appendChild(label);

        // Selection highlight + resize handles
        if (t.id === this.selectedTerritoryId) {
            const selRect = document.createElementNS(SVG_NS, 'rect');
            selRect.setAttribute('x', t.x - 2);
            selRect.setAttribute('y', t.y - 2);
            selRect.setAttribute('width', t.w + 4);
            selRect.setAttribute('height', t.h + 4);
            selRect.setAttribute('rx', 7);
            selRect.setAttribute('fill', 'none');
            selRect.setAttribute('stroke', '#0071e3');
            selRect.setAttribute('stroke-width', '1.5');
            selRect.setAttribute('stroke-dasharray', '4 3');
            g.appendChild(selRect);

            // Resize handles at corners
            const handleSize = 8;
            const corners = [
                { cx: t.x, cy: t.y, corner: 'nw', cursor: 'nw-resize' },
                { cx: t.x + t.w, cy: t.y, corner: 'ne', cursor: 'ne-resize' },
                { cx: t.x, cy: t.y + t.h, corner: 'sw', cursor: 'sw-resize' },
                { cx: t.x + t.w, cy: t.y + t.h, corner: 'se', cursor: 'se-resize' },
            ];
            for (const c of corners) {
                const handle = document.createElementNS(SVG_NS, 'rect');
                handle.setAttribute('x', c.cx - handleSize / 2);
                handle.setAttribute('y', c.cy - handleSize / 2);
                handle.setAttribute('width', handleSize);
                handle.setAttribute('height', handleSize);
                handle.setAttribute('fill', '#fff');
                handle.setAttribute('stroke', '#0071e3');
                handle.setAttribute('stroke-width', '1.5');
                handle.setAttribute('rx', 2);
                handle.style.cursor = c.cursor;
                handle.classList.add('territory-handle');
                handle.dataset.corner = c.corner;
                g.appendChild(handle);
            }
        }

        this.territoryGroup.appendChild(g);
    }

    selectTerritory(id) {
        this.selectedTerritoryId = id;
        if (id) {
            this.select(null); // Deselect components
            const terr = this.territories.find(t => t.id === id);
            if (terr) {
                this.app.onTerritorySelected(terr);
                // Re-render all territories to update selection highlight
                for (const t of this.territories) this._renderTerritory(t);
            }
        } else {
            for (const t of this.territories) this._renderTerritory(t);
        }
    }

    deleteTerritory(id) {
        this.territories = this.territories.filter(t => t.id !== id);
        const el = this.territoryGroup.querySelector(`[data-id="${id}"]`);
        if (el) el.remove();
        this.selectTerritory(null);
        this.app.onComponentsChanged();
        this.app.pushHistory();
    }
}
