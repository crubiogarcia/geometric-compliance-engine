import { IFC_CATEGORIES } from './src/ifc-categories-config.js';

/**
 * Auto-generate checkboxes from config
 * Call this on page load to create checkboxes dynamically
 */
export function generateCategoryCheckboxes(containerId = 'category-checkboxes') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }
    
    container.innerHTML = ''; // Clear existing
    
    for (const [category, config] of Object.entries(IFC_CATEGORIES)) {
        const item = document.createElement('div');
        item.className = 'category-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = category;
        checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = category;
        label.textContent = `${config.label}`;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        container.appendChild(item);
    }
}
