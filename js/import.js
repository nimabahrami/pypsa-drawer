// js/import.js - PyPSA Python Code Importer and Auto-Layouter

import { COMPONENT_TYPES, createComponent } from './components.js';

export function parseAndImport(pyCode, app) {
    // Clear existing components
    app.canvas.clear();

    // 1. Remove comments
    let cleanCode = pyCode.split('\n').map(line => {
        const commentIdx = line.indexOf('#');
        return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    }).join(' ');

    // 2. Extract all n.add(...) matches
    // This regex looks for: n.add( "Type", "Name" , <optional args> )
    const regex = /n\.add\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"](.*?)\)/g;

    let match;
    const componentsData = [];

    while ((match = regex.exec(cleanCode)) !== null) {
        const type = match[1];
        const name = match[2];
        const argsStr = match[3];

        componentsData.push({ type, name, argsStr });
    }

    if (componentsData.length === 0) {
        throw new Error("No n.add(...) statements found in the code.");
    }

    // Process each extracted component
    let createdComponents = [];
    for (const data of componentsData) {
        if (!COMPONENT_TYPES[data.type]) {
            console.warn(`Skipping unknown component type: ${data.type}`);
            continue;
        }

        const comp = createComponent(data.type, { name: data.name });

        // Parse kwargs
        if (data.argsStr && data.argsStr.trim().length > 0) {
            // Very simple kwarg parser: key=value
            // E.g., , p_nom=1000, carrier='AC', bus='Bus 1'
            const kwargRegex = /([a-zA-Z0-9_]+)\s*=\s*([^,]+)/g;
            let kwMatch;
            while ((kwMatch = kwargRegex.exec(data.argsStr)) !== null) {
                const key = kwMatch[1].trim();
                let valStr = kwMatch[2].trim();

                // Clean up trailing parenthesis or spaces
                if (valStr.endsWith(')')) valStr = valStr.substring(0, valStr.length - 1);

                // Try to infer type
                let val = valStr;
                if (valStr === 'True') val = true;
                else if (valStr === 'False') val = false;
                else if (valStr === 'np.inf') val = Infinity;
                else if (valStr === 'np.nan') val = NaN;
                else if (valStr.startsWith('"') && valStr.endsWith('"')) val = valStr.slice(1, -1);
                else if (valStr.startsWith("'") && valStr.endsWith("'")) val = valStr.slice(1, -1);
                else if (!isNaN(Number(valStr))) val = Number(valStr);

                // Assign to component data if it is a valid attribute
                const attrDef = COMPONENT_TYPES[data.type].attrs.find(a => a.key === key);
                if (attrDef) {
                    comp.data[key] = val;
                }
            }
        }

        createdComponents.push(comp);
    }

    // Separate carriers vs purely visual components
    const carriers = createdComponents.filter(c => c.type === 'Carrier');
    const visualComps = createdComponents.filter(c => c.type !== 'Carrier');

    // Add carriers to app state directly
    carriers.forEach(c => app.canvas.components.push(c));

    if (visualComps.length > 0) {
        // Layout the visual components
        autoLayout(visualComps);

        // Add visual components to canvas
        visualComps.forEach(c => app.canvas.components.push(c));
    }

    app.canvas.redraw();
    app.canvas.centerView();
    app.pushHistory();
    app.onComponentsChanged();
}

/**
 * Organizes components spatially
 * 1. Place Buses in a grid
 * 2. Arrange 1-port components around their connected Buses
 * 3. Branches bridge between buses
 */
function autoLayout(components) {
    const buses = components.filter(c => c.type === 'Bus');
    const branches = components.filter(c => COMPONENT_TYPES[c.type].category === 'branch');
    const onePorts = components.filter(c => COMPONENT_TYPES[c.type].category === 'one-port');

    // Basic bus grid layout
    const gridSpacing = 200;
    const cols = Math.max(1, Math.ceil(Math.sqrt(buses.length)));

    buses.forEach((bus, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        bus.cx = col * gridSpacing;
        bus.cy = row * gridSpacing;
    });

    // Attach 1-ports to buses
    // Map buses to their attached components
    const attachedToBus = {};
    buses.forEach(b => attachedToBus[b.data.name] = []);

    onePorts.forEach(comp => {
        const busName = comp.data.bus;
        if (busName && attachedToBus[busName]) {
            attachedToBus[busName].push(comp);
        } else if (buses.length > 0) {
            // Default to first bus if unattached or missing bus
            comp.data.bus = buses[0].data.name;
            attachedToBus[buses[0].data.name].push(comp);
        } else {
            comp.cx = 0; comp.cy = 0;
        }
    });

    // Arrange attached components nicely around the bus
    buses.forEach(bus => {
        const attached = attachedToBus[bus.data.name];
        if (!attached || attached.length === 0) return;

        // Place them above or below the bus
        const spacing = 40;
        const startX = bus.cx - ((attached.length - 1) * spacing) / 2;

        attached.forEach((comp, idx) => {
            comp.cx = startX + (idx * spacing);
            // Alternate above and below
            comp.cy = bus.cy + ((idx % 2 === 0) ? -50 : 50);
        });
    });

    // Branches can just be centered between their buses
    branches.forEach(branch => {
        const def = COMPONENT_TYPES[branch.type];
        const bus0Name = branch.data[def.busKeys[0]];
        const bus1Name = branch.data[def.busKeys[1]];

        const b0 = buses.find(b => b.data.name === bus0Name);
        const b1 = buses.find(b => b.data.name === bus1Name);

        if (b0 && b1) {
            branch.cx = (b0.cx + b1.cx) / 2;
            branch.cy = (b0.cy + b1.cy) / 2;
        } else if (b0) {
            branch.cx = b0.cx + 50;
            branch.cy = b0.cy;
        } else if (b1) {
            branch.cx = b1.cx - 50;
            branch.cy = b1.cy;
        } else if (buses.length > 0) {
            branch.cx = buses[0].cx + 100;
            branch.cy = buses[0].cy;
            branch.data[def.busKeys[0]] = buses[0].data.name;
        } else {
            branch.cx = 0; branch.cy = 0;
        }
    });
}
