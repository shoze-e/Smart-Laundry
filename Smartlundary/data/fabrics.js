// data/fabrics.js

export const FABRICS = {
  "silk": {
    name: "Silk",
    baseDryingFactor: 0.6, // Dries fast
    description: "Lightweight, delicate fabric. Dries very quickly."
  },
  "synthetic": {
    name: "Synthetic",
    baseDryingFactor: 0.7,
    description: "Polyester or nylon blends. Retains little water, dries fast."
  },
  "tshirt": {
    name: "T-shirt (Cotton/Blend)",
    baseDryingFactor: 0.9,
    description: "Standard clothing. Dries at a medium-fast rate."
  },
  "cotton": {
    name: "Cotton",
    baseDryingFactor: 1.0, // Baseline
    description: "Standard natural fabric. Moderate drying time."
  },
  "linen": {
    name: "Linen",
    baseDryingFactor: 1.1,
    description: "Breathable but retains some moisture. Moderate drying time."
  },
  "mixed": {
    name: "Mixed Fabric",
    baseDryingFactor: 1.1,
    description: "A mixture of clothing types."
  },
  "jeans": {
    name: "Jeans (Denim)",
    baseDryingFactor: 1.6,
    description: "Heavy cotton fabric. Takes a long time to dry."
  },
  "towels": {
    name: "Towels",
    baseDryingFactor: 1.8,
    description: "Thick absorbent material. Requires significant drying time."
  }
};

export const WASHING_METHODS = {
  "high_spin": {
    name: "Washing Machine - High Spin",
    timeMultiplier: 0.8, // Extracts most water
    description: "Leaves clothes damp but not wet."
  },
  "normal_spin": {
    name: "Washing Machine - Normal Spin",
    timeMultiplier: 1.0, // Baseline
    description: "Standard machine washing."
  },
  "low_spin": {
    name: "Washing Machine - Low Spin",
    timeMultiplier: 1.3,
    description: "Leaves clothes quite wet."
  },
  "hand_wash": {
    name: "Hand Wash",
    timeMultiplier: 1.6,
    description: "Retains high amount of water compared to machine spin."
  }
};

export const LOAD_SIZES = {
  "small": {
    name: "Small",
    timeMultiplier: 0.9
  },
  "medium": {
    name: "Medium",
    timeMultiplier: 1.0 // Baseline
  },
  "large": {
    name: "Large",
    timeMultiplier: 1.25 // Less air circulation, takes longer
  }
};
