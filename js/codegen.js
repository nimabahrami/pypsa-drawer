// js/codegen.js - PyPSA Python Code Generator

import { COMPONENT_TYPES } from './components.js';

export class CodeGenerator {
    constructor(outputEl, app) {
        this.output = outputEl;
        this.app = app;
    }

    generate(components) {
        let code = '';

        // Imports
        code += 'import pypsa\n';
        code += 'import numpy as np\n';
        code += '\n';

        // Create network
        code += '# Create network\n';
        code += 'n = pypsa.Network()\n';
        code += 'n.set_snapshots(range(24))  # Adjust as needed\n';
        code += '\n';

        // Collect carriers from Carrier components
        const carriers = components.filter(c => c.type === 'Carrier');
        if (carriers.length > 0) {
            code += '# --- Carriers ---\n';
            for (const comp of carriers) {
                const args = this._buildArgs(comp);
                code += `n.add(\n    "Carrier",\n    "${comp.data.name}",\n${args})\n`;
            }
            code += '\n';
        }

        // Group remaining components by type for clean output
        const grouped = {};
        for (const comp of components) {
            if (comp.type === 'Carrier') continue;
            if (!grouped[comp.type]) grouped[comp.type] = [];
            grouped[comp.type].push(comp);
        }

        // Order: Bus first, then one-ports, then branches
        const order = ['Bus', 'Generator', 'Load', 'StorageUnit', 'Store', 'ShuntImpedance', 'Line', 'Link', 'Transformer'];

        for (const type of order) {
            const items = grouped[type];
            if (!items || items.length === 0) continue;

            const plural = type === 'Bus' ? 'Buses'
                : type === 'ShuntImpedance' ? 'Shunt Impedances'
                    : `${COMPONENT_TYPES[type].label}s`;
            code += `# --- ${plural} ---\n`;

            for (const comp of items) {
                const args = this._buildArgs(comp);
                if (args) {
                    code += `n.add(\n    "${type}",\n    "${comp.data.name}",\n${args})\n`;
                } else {
                    code += `n.add("${type}", "${comp.data.name}")\n`;
                }
            }
            code += '\n';
        }

        // Footer
        code += '# --- Solve ---\n';
        code += '# n.optimize(solver_name="highs")  # Uncomment to solve\n';
        code += '# n.statistics()  # View results\n';

        return code;
    }

    _buildArgs(comp) {
        const typeDef = COMPONENT_TYPES[comp.type];
        const parts = [];

        for (const attr of typeDef.attrs) {
            if (attr.key === 'name') continue;
            const val = comp.data[attr.key];
            const def = attr.default;
            const isEssential = attr.essential === true;

            // Determine if value differs from default
            let isDiff = false;
            if (val !== def) {
                isDiff = true;
                // Handle NaN === NaN
                if (typeof val === 'number' && typeof def === 'number' && isNaN(val) && isNaN(def)) isDiff = false;
                // Handle Infinity === Infinity
                if (val === Infinity && def === Infinity) isDiff = false;
            }
            // Empty string equals empty string
            if (val === '' && def === '') isDiff = false;

            // Include if value differs from default OR if it is an essential parameter
            if (!isDiff && !isEssential) continue;

            // Format value
            let formatted;
            if (typeof val === 'boolean') {
                formatted = val ? 'True' : 'False';
            } else if (typeof val === 'string') {
                if (val === '' && !isEssential) continue;
                formatted = `"${val}"`;
            } else if (val === Infinity) {
                formatted = 'np.inf';
            } else if (isNaN(val)) {
                formatted = 'np.nan';
            } else {
                formatted = String(val);
            }

            parts.push(`    ${attr.key}=${formatted},`);
        }

        if (parts.length === 0) return '';
        return parts.join('\n') + '\n';
    }

    render(components) {
        const code = this.generate(components);
        this.output.textContent = code;
        return code;
    }
}
