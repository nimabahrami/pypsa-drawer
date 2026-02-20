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

    showTerritory(terr) {
        this.currentId = null;
        this.panel.innerHTML = '';
        if (!terr) return;

        const header = document.createElement('div');
        header.className = 'prop-header';
        header.innerHTML = `<span class="prop-type-badge" style="background:#cc3333;color:#fff">Territory</span>
                            <span class="prop-name">${terr.name}</span>`;
        this.panel.appendChild(header);

        const fields = document.createElement('div');
        fields.className = 'prop-fields';

        // Name
        const nameRow = document.createElement('div');
        nameRow.className = 'prop-row';
        nameRow.innerHTML = `<span class="prop-label">Name</span>`;
        const nameInput = document.createElement('input');
        nameInput.className = 'prop-input';
        nameInput.type = 'text';
        nameInput.value = terr.name;
        nameInput.addEventListener('input', () => {
            terr.name = nameInput.value;
            header.querySelector('.prop-name').textContent = terr.name;
            this.app.canvas._renderTerritory(terr);
        });
        nameRow.appendChild(nameInput);
        fields.appendChild(nameRow);

        // Fill Color
        const colorRow = document.createElement('div');
        colorRow.className = 'prop-row';
        colorRow.innerHTML = `<span class="prop-label">Fill Color</span>`;
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = terr.fillColor || '#dc3232';
        colorInput.style.cssText = 'width:36px;height:26px;border:1px solid var(--border-strong);border-radius:4px;cursor:pointer;padding:1px;';
        colorInput.addEventListener('input', () => {
            terr.fillColor = colorInput.value;
            terr.borderColor = colorInput.value;
            borderInput.value = colorInput.value;
            this.app.canvas._renderTerritory(terr);
        });
        colorRow.appendChild(colorInput);
        fields.appendChild(colorRow);

        // Border Color
        const borderRow = document.createElement('div');
        borderRow.className = 'prop-row';
        borderRow.innerHTML = `<span class="prop-label">Border Color</span>`;
        const borderInput = document.createElement('input');
        borderInput.type = 'color';
        borderInput.value = terr.borderColor || '#cc3333';
        borderInput.style.cssText = 'width:36px;height:26px;border:1px solid var(--border-strong);border-radius:4px;cursor:pointer;padding:1px;';
        borderInput.addEventListener('input', () => {
            terr.borderColor = borderInput.value;
            this.app.canvas._renderTerritory(terr);
        });
        borderRow.appendChild(borderInput);
        fields.appendChild(borderRow);

        // Opacity
        const opacityRow = document.createElement('div');
        opacityRow.className = 'prop-row';
        opacityRow.innerHTML = `<span class="prop-label">Opacity</span>`;
        const opacityWrap = document.createElement('div');
        opacityWrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:6px;';
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = '0';
        opacitySlider.max = '100';
        opacitySlider.value = Math.round((terr.opacity != null ? terr.opacity : 0.08) * 100);
        opacitySlider.style.cssText = 'flex:1;height:4px;cursor:pointer;';
        const opacityLabel = document.createElement('span');
        opacityLabel.style.cssText = 'font-size:10px;color:var(--text-dim);width:30px;text-align:right;font-family:var(--mono);';
        opacityLabel.textContent = opacitySlider.value + '%';
        opacitySlider.addEventListener('input', () => {
            terr.opacity = parseInt(opacitySlider.value) / 100;
            opacityLabel.textContent = opacitySlider.value + '%';
            this.app.canvas._renderTerritory(terr);
        });
        opacityWrap.appendChild(opacitySlider);
        opacityWrap.appendChild(opacityLabel);
        opacityRow.appendChild(opacityWrap);
        fields.appendChild(opacityRow);

        this.panel.appendChild(fields);

        // Delete button
        const actions = document.createElement('div');
        actions.className = 'prop-actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'prop-action-btn';
        delBtn.style.cssText = 'color:var(--danger);border-color:var(--danger);';
        delBtn.textContent = 'Delete Territory';
        delBtn.addEventListener('click', () => {
            this.app.canvas.deleteTerritory(terr.id);
        });
        delBtn.addEventListener('mouseenter', () => {
            delBtn.style.background = 'rgba(255,59,48,0.06)';
        });
        delBtn.addEventListener('mouseleave', () => {
            delBtn.style.background = '#fff';
        });
        actions.appendChild(delBtn);
        this.panel.appendChild(actions);
    }
}
