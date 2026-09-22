/**
 * Central IFC Categories Configuration
 * Add new categories here and everything updates automatically!
 */

export const IFC_CATEGORIES = {
    walls: {
        label: 'Walls',
        ifcTypes: ['IfcWall', 'IfcWallStandardCase']
    },
    slabs: {
        label: 'Slabs',
        ifcTypes: ['IfcSlab']
    },
    doors: {
        label: 'Doors',
        ifcTypes: ['IfcDoor']
    },
    roofs: {
        label: 'Roofs',
        ifcTypes: ['IfcRoof']
    },
    railings: {
        label: 'Railings',
        ifcTypes: ['IfcRailing']
    },
    furniture: {
        label: 'Furniture',
        ifcTypes: ['IfcFurnishingElement', 'IfcFurniture']
    },
    windows: {
        label: 'Windows',
        ifcTypes: ['IfcWindow']
    },
    ramps: {
        label: 'Ramp',
        ifcTypes: ['IfcRamp']
    },
    stairs: {
        label: 'Stairs',
        ifcTypes: ['IfcStair', 'IfcStairFlight']
    },
    curtainwall: {
        label: 'Curtain Wall',
        ifcTypes: ['IfcCurtainWall']
    },
    others: {
        label: 'Others',
        ifcTypes: [] // Catches everything else
    }
};

// Helper: Get all category names
export function getCategoryNames() {
    return Object.keys(IFC_CATEGORIES);
}

// Helper: Get class mapping for ifc-utils
export function getClassMapping() {
    const mapping = {};
    for (const [category, config] of Object.entries(IFC_CATEGORIES)) {
        if (category !== 'others') {
            config.ifcTypes.forEach(type => {
                mapping[type] = category;
            });
        }
    }
    return mapping;
}

// Helper: Get empty buckets for ifc-utils
export function getEmptyBuckets() {
    const buckets = {};
    for (const category of Object.keys(IFC_CATEGORIES)) {
        buckets[category] = [];
    }
    return buckets;
}