// js/components.js - PyPSA Component Definitions
// Each component type has: attributes, SVG render function, category
// All schematics are pure black, no colors.

export const COMPONENT_TYPES = {
  Carrier: {
    category: 'definition',
    label: 'Carrier',
    icon: 'Cr',
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'co2_emissions', type: 'float', default: 0, label: 'CO2 Emissions (t/MWh)', essential: true },
      { key: 'nice_name', type: 'string', default: '', label: 'Nice Name' },
      { key: 'color', type: 'string', default: '', label: 'Color (hex)' },
      { key: 'max_growth', type: 'float', default: Infinity, label: 'Max Growth' },
      { key: 'max_relative_growth', type: 'float', default: Infinity, label: 'Max Relative Growth' },
    ],
  },
  Bus: {
    category: 'node',
    label: 'Bus',
    icon: '--',
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'v_nom', type: 'float', default: 1.0, label: 'Nominal Voltage (kV)' },
      { key: 'carrier', type: 'carrier', default: 'AC', label: 'Carrier', essential: true },
      { key: 'x', type: 'float', default: 0, label: 'Longitude (x)' },
      { key: 'y', type: 'float', default: 0, label: 'Latitude (y)' },
      { key: 'control', type: 'select', default: 'PQ', label: 'Control', options: ['PQ', 'PV', 'Slack'] },
    ],
  },
  Generator: {
    category: 'one-port',
    label: 'Generator',
    icon: 'G~',
    busKeys: ['bus'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus', type: 'bus', default: '', label: 'Bus', required: true },
      { key: 'carrier', type: 'carrier', default: '', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Type' },
      { key: 'p_nom', type: 'float', default: 0, label: 'Nominal Power (MW)', essential: true },
      { key: 'p_nom_extendable', type: 'bool', default: false, label: 'P Nom Extendable' },
      { key: 'p_nom_min', type: 'float', default: 0, label: 'P Nom Min (MW)' },
      { key: 'p_nom_max', type: 'float', default: Infinity, label: 'P Nom Max (MW)' },
      { key: 'p_min_pu', type: 'float', default: 0, label: 'P Min (p.u.)' },
      { key: 'p_max_pu', type: 'float', default: 1, label: 'P Max (p.u.)' },
      { key: 'p_set', type: 'float', default: 0, label: 'P Set (MW)', essential: true },
      { key: 'q_set', type: 'float', default: 0, label: 'Q Set (MVar)' },
      { key: 'sign', type: 'float', default: 1, label: 'Sign' },
      { key: 'marginal_cost', type: 'float', default: 0, label: 'Marginal Cost', essential: true },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
      { key: 'efficiency', type: 'float', default: 1, label: 'Efficiency' },
      { key: 'committable', type: 'bool', default: false, label: 'Committable' },
      { key: 'min_up_time', type: 'int', default: 0, label: 'Min Up Time (snapshots)' },
      { key: 'min_down_time', type: 'int', default: 0, label: 'Min Down Time (snapshots)' },
      { key: 'ramp_limit_up', type: 'float', default: NaN, label: 'Ramp Up Limit (p.u.)' },
      { key: 'ramp_limit_down', type: 'float', default: NaN, label: 'Ramp Down Limit (p.u.)' },
      { key: 'start_up_cost', type: 'float', default: 0, label: 'Start-Up Cost' },
      { key: 'shut_down_cost', type: 'float', default: 0, label: 'Shut-Down Cost' },
      { key: 'control', type: 'select', default: 'PQ', label: 'Control', options: ['PQ', 'PV', 'Slack'] },
    ],
  },
  Load: {
    category: 'one-port',
    label: 'Load',
    icon: 'Ld',
    busKeys: ['bus'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus', type: 'bus', default: '', label: 'Bus', required: true },
      { key: 'carrier', type: 'carrier', default: '', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Type' },
      { key: 'p_set', type: 'float', default: 0, label: 'P Set (MW)', essential: true },
      { key: 'q_set', type: 'float', default: 0, label: 'Q Set (MVar)' },
      { key: 'sign', type: 'float', default: -1, label: 'Sign' },
    ],
  },
  StorageUnit: {
    category: 'one-port',
    label: 'Storage Unit',
    icon: 'SU',
    busKeys: ['bus'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus', type: 'bus', default: '', label: 'Bus', required: true },
      { key: 'carrier', type: 'carrier', default: '', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Type' },
      { key: 'p_nom', type: 'float', default: 0, label: 'Nominal Power (MW)', essential: true },
      { key: 'p_nom_extendable', type: 'bool', default: false, label: 'P Nom Extendable' },
      { key: 'p_nom_min', type: 'float', default: 0, label: 'P Nom Min (MW)' },
      { key: 'p_nom_max', type: 'float', default: Infinity, label: 'P Nom Max (MW)' },
      { key: 'p_min_pu', type: 'float', default: -1, label: 'P Min (p.u.)' },
      { key: 'p_max_pu', type: 'float', default: 1, label: 'P Max (p.u.)' },
      { key: 'max_hours', type: 'float', default: 6, label: 'Max Hours (h)', essential: true },
      { key: 'efficiency_store', type: 'float', default: 1, label: 'Charging Efficiency' },
      { key: 'efficiency_dispatch', type: 'float', default: 1, label: 'Discharging Efficiency' },
      { key: 'standing_loss', type: 'float', default: 0, label: 'Standing Loss (1/h)' },
      { key: 'state_of_charge_initial', type: 'float', default: 0, label: 'Initial SOC (MWh)' },
      { key: 'cyclic_state_of_charge', type: 'bool', default: false, label: 'Cyclic SOC' },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
      { key: 'marginal_cost', type: 'float', default: 0, label: 'Marginal Cost', essential: true },
      { key: 'inflow', type: 'float', default: 0, label: 'Inflow (MW)' },
      { key: 'sign', type: 'float', default: 1, label: 'Sign' },
      { key: 'spill_cost', type: 'float', default: 0, label: 'Spill Cost' },
    ],
  },
  Store: {
    category: 'one-port',
    label: 'Store',
    icon: 'St',
    busKeys: ['bus'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus', type: 'bus', default: '', label: 'Bus', required: true },
      { key: 'carrier', type: 'carrier', default: '', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Type' },
      { key: 'e_nom', type: 'float', default: 0, label: 'Nominal Energy (MWh)', essential: true },
      { key: 'e_nom_extendable', type: 'bool', default: false, label: 'E Nom Extendable' },
      { key: 'e_nom_min', type: 'float', default: 0, label: 'E Nom Min (MWh)' },
      { key: 'e_nom_max', type: 'float', default: Infinity, label: 'E Nom Max (MWh)' },
      { key: 'e_initial', type: 'float', default: 0, label: 'Initial Energy (MWh)' },
      { key: 'e_cyclic', type: 'bool', default: false, label: 'Cyclic Energy' },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
      { key: 'marginal_cost', type: 'float', default: 0, label: 'Marginal Cost', essential: true },
      { key: 'standing_loss', type: 'float', default: 0, label: 'Standing Loss (1/h)' },
      { key: 'sign', type: 'float', default: 1, label: 'Sign' },
    ],
  },
  ShuntImpedance: {
    category: 'one-port',
    label: 'Shunt Impedance',
    icon: 'SI',
    busKeys: ['bus'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus', type: 'bus', default: '', label: 'Bus', required: true },
      { key: 'g', type: 'float', default: 0, label: 'Conductance (S)', essential: true },
      { key: 'b', type: 'float', default: 0, label: 'Susceptance (S)', essential: true },
      { key: 'sign', type: 'float', default: 1, label: 'Sign' },
    ],
  },
  Line: {
    category: 'branch',
    label: 'Line',
    icon: '--',
    busKeys: ['bus0', 'bus1'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus0', type: 'bus', default: '', label: 'Bus0 (from)', required: true },
      { key: 'bus1', type: 'bus', default: '', label: 'Bus1 (to)', required: true },
      { key: 'carrier', type: 'carrier', default: 'AC', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Standard Type' },
      { key: 'r', type: 'float', default: 0, label: 'Resistance (p.u.)' },
      { key: 'x', type: 'float', default: 0, label: 'Reactance (p.u.)', essential: true },
      { key: 'b', type: 'float', default: 0, label: 'Susceptance (p.u.)' },
      { key: 'g', type: 'float', default: 0, label: 'Conductance (p.u.)' },
      { key: 's_nom', type: 'float', default: 0, label: 'Nominal Power (MVA)', essential: true },
      { key: 's_nom_extendable', type: 'bool', default: false, label: 'S Nom Extendable' },
      { key: 's_nom_min', type: 'float', default: 0, label: 'S Nom Min (MVA)' },
      { key: 's_nom_max', type: 'float', default: Infinity, label: 'S Nom Max (MVA)' },
      { key: 'length', type: 'float', default: 1, label: 'Length (km)' },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
      { key: 'num_parallel', type: 'float', default: 1, label: 'Parallel Lines' },
      { key: 'terrain_factor', type: 'float', default: 1, label: 'Terrain Factor' },
    ],
  },
  Link: {
    category: 'branch',
    label: 'Link',
    icon: '->',
    busKeys: ['bus0', 'bus1'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus0', type: 'bus', default: '', label: 'Bus0 (from)', required: true },
      { key: 'bus1', type: 'bus', default: '', label: 'Bus1 (to)', required: true },
      { key: 'carrier', type: 'carrier', default: '', label: 'Carrier' },
      { key: 'type', type: 'string', default: '', label: 'Type' },
      { key: 'p_nom', type: 'float', default: 0, label: 'Nominal Power (MW)', essential: true },
      { key: 'p_nom_extendable', type: 'bool', default: false, label: 'P Nom Extendable' },
      { key: 'p_nom_min', type: 'float', default: 0, label: 'P Nom Min (MW)' },
      { key: 'p_nom_max', type: 'float', default: Infinity, label: 'P Nom Max (MW)' },
      { key: 'p_min_pu', type: 'float', default: 0, label: 'P Min (p.u.) [-1=bidir]' },
      { key: 'p_max_pu', type: 'float', default: 1, label: 'P Max (p.u.)' },
      { key: 'efficiency', type: 'float', default: 1, label: 'Efficiency', essential: true },
      { key: 'marginal_cost', type: 'float', default: 0, label: 'Marginal Cost' },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
      { key: 'length', type: 'float', default: 1, label: 'Length (km)' },
    ],
  },
  Transformer: {
    category: 'branch',
    label: 'Transformer',
    icon: 'Tr',
    busKeys: ['bus0', 'bus1'],
    attrs: [
      { key: 'name', type: 'string', default: '', label: 'Name', required: true },
      { key: 'bus0', type: 'bus', default: '', label: 'Bus0 (HV)', required: true },
      { key: 'bus1', type: 'bus', default: '', label: 'Bus1 (LV)', required: true },
      { key: 'type', type: 'string', default: '', label: 'Standard Type' },
      { key: 'model', type: 'select', default: 't', label: 'Model', options: ['t', 'pi'] },
      { key: 'r', type: 'float', default: 0, label: 'Resistance (p.u.)' },
      { key: 'x', type: 'float', default: 0, label: 'Reactance (p.u.)', essential: true },
      { key: 'g', type: 'float', default: 0, label: 'Conductance (p.u.)' },
      { key: 'b', type: 'float', default: 0, label: 'Susceptance (p.u.)' },
      { key: 's_nom', type: 'float', default: 0, label: 'Nominal Power (MVA)', essential: true },
      { key: 's_nom_extendable', type: 'bool', default: false, label: 'S Nom Extendable' },
      { key: 's_nom_min', type: 'float', default: 0, label: 'S Nom Min (MVA)' },
      { key: 's_nom_max', type: 'float', default: Infinity, label: 'S Nom Max (MVA)' },
      { key: 'tap_ratio', type: 'float', default: 1, label: 'Tap Ratio' },
      { key: 'phase_shift', type: 'float', default: 0, label: 'Phase Shift' },
      { key: 'capital_cost', type: 'float', default: 0, label: 'Capital Cost' },
    ],
  },
};

// Default carrier options always available
export const DEFAULT_CARRIERS = ['AC', 'DC', 'heat', 'gas', 'hydrogen', 'oil', 'biomass', 'co2', 'water'];

// Bounding box sizes per component type (half-width, half-height)
// Used for connection endpoint calculations
export const COMPONENT_BOUNDS = {
  Bus: { hw: 40, hh: 4 },
  BusVert: { hw: 4, hh: 40 },
  Generator: { hw: 16, hh: 16 },
  Load: { hw: 12, hh: 20 },
  StorageUnit: { hw: 16, hh: 12 },
  Store: { hw: 14, hh: 12 },
  ShuntImpedance: { hw: 10, hh: 20 },
  Line: { hw: 20, hh: 6 },
  Link: { hw: 10, hh: 10 },
  Transformer: { hw: 20, hh: 12 },
};

// SVG symbol paths - all pure black strokes, no fill colors
export const COMPONENT_SYMBOLS = {
  Bus: (rotation = 0) => {
    if (rotation === 90 || rotation === 270) {
      return `<rect x="-3" y="-40" width="6" height="80" rx="1" fill="#1d1d1f"/>`;
    }
    return `<rect x="-40" y="-3" width="80" height="6" rx="1" fill="#1d1d1f"/>`;
  },
  Generator: () => {
    return `<circle cx="0" cy="0" r="16" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>
            <text x="0" y="5" text-anchor="middle" font-size="16" fill="#1d1d1f" font-family="serif">~</text>`;
  },
  Load: () => {
    return `<polygon points="0,-18 12,10 -12,10" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>
            <line x1="0" y1="10" x2="0" y2="18" stroke="#1d1d1f" stroke-width="1.8"/>
            <line x1="-8" y1="18" x2="8" y2="18" stroke="#1d1d1f" stroke-width="1.8"/>`;
  },
  StorageUnit: () => {
    return `<rect x="-14" y="-10" width="28" height="20" fill="none" stroke="#1d1d1f" stroke-width="1.8" rx="2"/>
            <line x1="-6" y1="-4" x2="-6" y2="4" stroke="#1d1d1f" stroke-width="1.8"/>
            <line x1="-2" y1="-7" x2="-2" y2="7" stroke="#1d1d1f" stroke-width="1.2"/>
            <line x1="2" y1="-4" x2="2" y2="4" stroke="#1d1d1f" stroke-width="1.8"/>
            <line x1="6" y1="-7" x2="6" y2="7" stroke="#1d1d1f" stroke-width="1.2"/>`;
  },
  Store: () => {
    return `<rect x="-14" y="-12" width="28" height="24" fill="none" stroke="#1d1d1f" stroke-width="1.8" rx="3"/>
            <text x="0" y="5" text-anchor="middle" font-size="11" fill="#1d1d1f" font-weight="bold">E</text>`;
  },
  ShuntImpedance: () => {
    return `<line x1="0" y1="-14" x2="0" y2="-6" stroke="#1d1d1f" stroke-width="1.8"/>
            <polyline points="-8,-6 8,-6 6,0 -6,0 -4,6 4,6 2,12 -2,12" fill="none" stroke="#1d1d1f" stroke-width="1.5"/>
            <line x1="-10" y1="14" x2="10" y2="14" stroke="#1d1d1f" stroke-width="1.8"/>
            <line x1="-6" y1="17" x2="6" y2="17" stroke="#1d1d1f" stroke-width="1.5"/>
            <line x1="-3" y1="20" x2="3" y2="20" stroke="#1d1d1f" stroke-width="1"/>`;
  },
  Line: () => {
    return `<line x1="-20" y1="0" x2="20" y2="0" stroke="#1d1d1f" stroke-width="1.8"/>`;
  },
  Link: () => {
    return `<polygon points="0,-8 8,0 0,8 -8,0" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>`;
  },
  Transformer: () => {
    return `<circle cx="-8" cy="0" r="12" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>
            <circle cx="8" cy="0" r="12" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>`;
  },
};

// Auto-name counters
let counters = {};
export function resetCounters() { counters = {}; }
export function autoName(type) {
  if (!counters[type]) counters[type] = 0;
  counters[type]++;
  return `${type}_${counters[type]}`;
}

// Create a new component instance with default values
export function createComponent(type, overrides = {}) {
  const def = COMPONENT_TYPES[type];
  if (!def) throw new Error(`Unknown component type: ${type}`);
  const data = {};
  for (const attr of def.attrs) {
    data[attr.key] = attr.default;
  }
  data.name = overrides.name || autoName(type);
  Object.assign(data, overrides);
  return {
    id: crypto.randomUUID(),
    type,
    data,
    cx: overrides.cx || 200,
    cy: overrides.cy || 200,
    rotation: overrides.rotation || 0,
  };
}
