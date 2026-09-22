import { getClassMapping, getEmptyBuckets } from './ifc-categories-config.js';

export async function createCategorySubsets(ifcLoader, modelID, scene) {
    // Get buckets and mapping from config
    const idsByCategory = getEmptyBuckets();
    const classMapping = getClassMapping();
    
    // Get building structure tree
    const structure = await ifcLoader.ifcManager.getSpatialStructure(modelID);
    
    // Recursively collect IDs by category
    async function collectIds(item) {
        if (item.children?.length > 0) {
            for (const child of item.children) {
                await collectIds(child);
            }
        } else {
            const props = await ifcLoader.ifcManager.getItemProperties(modelID, item.expressID);
            const elementType = props.__proto__.constructor.name;
            
            const category = classMapping[elementType];
            if (category) {
                idsByCategory[category].push(item.expressID);
            } else {
                idsByCategory.others.push(item.expressID);  
            }
        }
    }
    
    await collectIds(structure);
    
    // Create visual subsets for each category
    const subsets = {};
    for (const [category, ids] of Object.entries(idsByCategory)) {
        if (ids.length > 0) {
            subsets[category] = ifcLoader.ifcManager.createSubset({
                modelID,
                ids,
                scene,
                removePrevious: true,
                customID: category
            });
            console.log(`✅ ${category}: ${ids.length} elements`);
        }
    }
    
    return subsets;
}