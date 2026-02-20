// js/export.js - PNG Export with Legend

import { COMPONENT_TYPES, COMPONENT_SYMBOLS } from './components.js';

export class Exporter {
    constructor(app) {
        this.app = app;
    }

    async exportPNG() {
        const svg = this.app.canvas.svg;
        const components = this.app.canvas.components;
        const visualComponents = components.filter(c => c.type !== 'Carrier');

        if (visualComponents.length === 0) {
            alert('No components to export.');
            return;
        }

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of visualComponents) {
            minX = Math.min(minX, c.cx - 60);
            minY = Math.min(minY, c.cy - 60);
            maxX = Math.max(maxX, c.cx + 60);
            maxY = Math.max(maxY, c.cy + 60);
        }

        const padding = 60;
        // Only show used component types in legend
        const usedTypes = new Set(visualComponents.map(c => c.type));
        const legendEntries = Object.entries(COMPONENT_TYPES).filter(([type]) => type !== 'Carrier' && usedTypes.has(type));
        const legendW = 150;
        const legendRowH = 24;
        const legendPadV = 12;
        const legendTitleH = 20;
        const legendH = legendTitleH + legendEntries.length * legendRowH + legendPadV * 2;

        const width = (maxX - minX) + padding * 2 + legendW + 20;
        const height = Math.max((maxY - minY) + padding * 2, legendH + padding * 2);

        // Clone SVG for export
        const clonedSvg = svg.cloneNode(true);
        clonedSvg.setAttribute('width', width);
        clonedSvg.setAttribute('height', height);
        clonedSvg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);

        // White background
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', minX - padding);
        bgRect.setAttribute('y', minY - padding);
        bgRect.setAttribute('width', width);
        bgRect.setAttribute('height', height);
        bgRect.setAttribute('fill', '#ffffff');
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

        // Reset transform
        const mainG = clonedSvg.querySelector('#main-transform');
        if (mainG) mainG.setAttribute('transform', 'translate(0,0) scale(1)');

        // Clean up for export
        clonedSvg.querySelectorAll('.comp-label').forEach(t => t.setAttribute('fill', '#333'));
        clonedSvg.querySelectorAll('.sel-ring').forEach(r => r.setAttribute('opacity', '0'));
        const grid = clonedSvg.querySelector('#grid-layer');
        if (grid) grid.remove();

        // Add legend
        const legendX = maxX + 30;
        const legendY = minY - padding + 20;
        const legendG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // Legend box
        const legendBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        legendBox.setAttribute('x', legendX - 8);
        legendBox.setAttribute('y', legendY - 8);
        legendBox.setAttribute('width', legendW);
        legendBox.setAttribute('height', legendH);
        legendBox.setAttribute('fill', '#fafafa');
        legendBox.setAttribute('stroke', '#e0e0e0');
        legendBox.setAttribute('stroke-width', '1');
        legendBox.setAttribute('rx', '4');
        legendG.appendChild(legendBox);

        // Legend title
        const legendTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        legendTitle.setAttribute('x', legendX + legendW / 2 - 8);
        legendTitle.setAttribute('y', legendY + 10);
        legendTitle.setAttribute('text-anchor', 'middle');
        legendTitle.setAttribute('font-size', '11');
        legendTitle.setAttribute('font-weight', 'bold');
        legendTitle.setAttribute('fill', '#333');
        legendTitle.setAttribute('font-family', "'Inter', sans-serif");
        legendTitle.textContent = 'Legend';
        legendG.appendChild(legendTitle);

        let ly = legendY + legendTitleH + legendPadV;
        for (const [type, def] of legendEntries) {
            // Component symbol (scaled down)
            const symbolG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const symbolSvg = COMPONENT_SYMBOLS[type](0);
            symbolG.innerHTML = symbolSvg;
            const scale = type === 'Bus' ? 0.25 : 0.4;
            symbolG.setAttribute('transform', `translate(${legendX + 14}, ${ly}) scale(${scale})`);
            legendG.appendChild(symbolG);

            // Label
            const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lbl.setAttribute('x', legendX + 34);
            lbl.setAttribute('y', ly + 4);
            lbl.setAttribute('font-size', '10');
            lbl.setAttribute('fill', '#333');
            lbl.setAttribute('font-family', "'Inter', sans-serif");
            lbl.textContent = def.label;
            legendG.appendChild(lbl);

            ly += legendRowH;
        }

        const legendMainG = clonedSvg.querySelector('#main-transform') || clonedSvg;
        legendMainG.appendChild(legendG);

        // Render to PNG
        const svgStr = new XMLSerializer().serializeToString(clonedSvg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((pngBlob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(pngBlob);
                a.download = 'pypsa_network.png';
                a.click();
                URL.revokeObjectURL(a.href);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = url;
    }
}
