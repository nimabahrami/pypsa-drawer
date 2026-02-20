// js/properties.js - Property Editor Panel
// Click a component -> shows editable attributes in the right panel

import { COMPONENT_TYPES, DEFAULT_CARRIERS, createComponent } from './components.js';

export class PropertyEditor {
    constructor(panelEl, app) {
        this.panel = panelEl;
        this.app = app;
        this.currentId = null;
        this._render(null);
    }

    show(comp) {
        this.currentId = comp ? comp.id : null;
        this._render(comp);
    }

    focusField(key) {
        const input = this.panel.querySelector(`[data-key="${key}"]`);
        if (input) { input.focus(); input.select(); }
    }

    // Get all available carrier names (from Carrier definitions + defaults)
    _getCarrierOptions() {
        const carriers = new Set(DEFAULT_CARRIERS);
        // Add user-defined carriers from canvas components
        for (const comp of this.app.canvas.components) {
            if (comp.type === 'Carrier' && comp.data.name) {
                carriers.add(comp.data.name);
            }
        }
        return Array.from(carriers).sort();
    }

    _render(comp) {
        if (!comp) {
            this.panel.innerHTML = `<div class="prop-empty">
        <div class="prop-empty-icon">--</div>
        <div>Select a component to edit its properties</div>
      </div>`;
            return;
        }

        const typeDef = COMPONENT_TYPES[comp.type];
        const buses = this.app.canvas.getBuses();
        const carrierOptions = this._getCarrierOptions();

        let html = `<div class="prop-header">
      <span class="prop-type-badge">${typeDef.label}</span>
      <span class="prop-name">${comp.data.name}</span>
      <button class="prop-delete-btn" title="Delete (Del)">x</button>
    </div>
    <div class="prop-fields">`;

        for (const attr of typeDef.attrs) {
            const val = comp.data[attr.key];
            html += `<div class="prop-row">
        <label class="prop-label" title="${attr.label}">${attr.label}</label>`;

            if (attr.type === 'bus') {
                html += `<select class="prop-input prop-select" data-key="${attr.key}">
          <option value="">(none)</option>`;
                for (const b of buses) {
                    html += `<option value="${b.data.name}" ${val === b.data.name ? 'selected' : ''}>${b.data.name}</option>`;
                }
                html += `</select>`;
            } else if (attr.type === 'carrier') {
                // Carrier dropdown populated from defined carriers
                html += `<select class="prop-input prop-select" data-key="${attr.key}">
          <option value="">(none)</option>`;
                for (const c of carrierOptions) {
                    html += `<option value="${c}" ${val === c ? 'selected' : ''}>${c}</option>`;
                }
                html += `</select>`;
            } else if (attr.type === 'select') {
                html += `<select class="prop-input prop-select" data-key="${attr.key}">`;
                for (const opt of attr.options) {
                    html += `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`;
                }
                html += `</select>`;
            } else if (attr.type === 'bool') {
                html += `<label class="prop-toggle">
          <input type="checkbox" data-key="${attr.key}" ${val ? 'checked' : ''}>
          <span class="prop-toggle-slider"></span>
        </label>`;
            } else if (attr.type === 'float' || attr.type === 'int') {
                const displayVal = (val === Infinity) ? 'inf' : (isNaN(val) ? '' : val);
                html += `<input type="text" class="prop-input" data-key="${attr.key}" value="${displayVal}" placeholder="${attr.default}">`;
            } else {
                html += `<input type="text" class="prop-input" data-key="${attr.key}" value="${val || ''}" placeholder="${attr.default}">`;
            }

            html += `</div>`;
        }

        html += `</div>`;

        // Bus rotation
        if (comp.type === 'Bus') {
            html += `<div class="prop-actions">
        <button class="prop-action-btn" id="rotate-bus-btn">Rotate 90 deg</button>
      </div>`;
        }

        this.panel.innerHTML = html;

        // Bind events
        this.panel.querySelector('.prop-delete-btn').addEventListener('click', () => {
            this.app.canvas.deleteComponent(comp.id);
        });

        if (comp.type === 'Bus') {
            this.panel.querySelector('#rotate-bus-btn')?.addEventListener('click', () => {
                comp.rotation = (comp.rotation + 90) % 360;
                this.app.canvas._renderComponent(comp);
                this.app.canvas._redrawConnections();
                this.app.pushHistory();
            });
        }

        // Bind input changes
        this.panel.querySelectorAll('.prop-input, .prop-select, input[type="checkbox"]').forEach(input => {
            const key = input.dataset.key;
            const attrDef = typeDef.attrs.find(a => a.key === key);
            const handler = () => {
                if (attrDef.type === 'bool') {
                    comp.data[key] = input.checked;
                } else if (attrDef.type === 'float') {
                    const v = input.value.trim();
                    comp.data[key] = v === 'inf' ? Infinity : (v === '' ? NaN : parseFloat(v));
                } else if (attrDef.type === 'int') {
                    comp.data[key] = parseInt(input.value) || 0;
                } else {
                    comp.data[key] = input.value;
                }

                if (key === 'name') {
                    this.panel.querySelector('.prop-name').textContent = comp.data.name;
                    // Re-render canvas component to update label
                    if (comp.type !== 'Carrier') {
                        this.app.canvas._renderComponent(comp);
                    }
                }

                if (attrDef.type === 'bus' || attrDef.type === 'carrier') {
                    this.app.canvas._redrawConnections();
                }

                // Auto-create Carrier component if it doesn't exist yet
                if (attrDef.type === 'carrier' && comp.data[key]) {
                    const carrierName = comp.data[key];
                    const exists = this.app.canvas.components.some(
                        c => c.type === 'Carrier' && c.data.name === carrierName
                    );
                    if (!exists) {
                        const newCarrier = createComponent('Carrier', { name: carrierName });
                        this.app.canvas.components.push(newCarrier);
                    }
                }

                this.app.onComponentsChanged();
                this.app.pushHistory();
            };

            if (attrDef.type === 'bool') {
                input.addEventListener('change', handler);
            } else {
                input.addEventListener('input', handler);
                input.addEventListener('change', handler);
            }
        });
    }
}
