import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IFCLoader } from "web-ifc-three/IFCLoader.js";
import { createCategorySubsets } from './src/ifc-utils.js';
import { getCategoryNames } from './src/ifc-categories-config.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("viewer").appendChild(renderer.domElement);

// Controls and lights
const controls = new OrbitControls(camera, renderer.domElement);
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light, new THREE.AmbientLight(0xffffff, 0.7));

// Grid
scene.add(new THREE.GridHelper(200, 30, 0x444444, 0x888888));

// IFC Loader
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("/wasm/");

// Global variables
let subsets = {};
let ifcModel = null;

// Check compliance and highlight violations
async function checkCompliance(file) {
    const formData = new FormData();
    formData.append('ifc', file);
    
    const response = await fetch('http://localhost:5000/api/check-compliance', {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    console.log('Backend response:', data);  // Debug
    
    // Fix: access violations from data.violations
    const violations = data.violations || [];
    
    if (violations.length > 0) {
        alert(`Found ${violations.length} doors with violations!`);
        // Extract the IDs and pass the current modelID
        const ids = violations.map(v => v.door_id);
        highlightViolations(ids, ifcModel.modelID);
    } else {
        alert('All doors comply with building code!');
    }
}


async function highlightViolations(ids, modelID) {
    await ifcLoader.ifcManager.createSubset({
        modelID: modelID,
        ids: ids,
        scene: scene,
        removePrevious: true,
        material: new THREE.MeshLambertMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8
        })
    });
    
    console.log(`Highlighted IDs: ${ids}`);
}

// Store the uploaded file globally
let uploadedFile = null;
// Load IFC file
document.getElementById("file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    uploadedFile = file;

    const url = URL.createObjectURL(file);
    
    ifcLoader.load(url, async (model) => {
        ifcModel = model;
        ifcModel.visible = false;
        scene.add(ifcModel);
        
        // Fit camera to see entire building
        const box = new THREE.Box3().setFromObject(ifcModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;
        
        camera.position.set(
            center.x + cameraDistance,
            center.y + cameraDistance,
            center.z + cameraDistance
        );
        controls.target.copy(center);
        camera.lookAt(center);
        controls.update();
        
        // Create subsets
        subsets = await createCategorySubsets(ifcLoader, ifcModel.modelID, scene);
        //window.subsets = subsets;

        // Connect checkboxes
        connectCheckboxes();
        
        // Check compliance
        //await checkCompliance(file);
    });
});

// Connect checkboxes to visibility
function connectCheckboxes() {
    getCategoryNames().forEach(category => {
        const checkbox = document.getElementById(category);
        if (checkbox && subsets[category]) {
            checkbox.onchange = (e) => subsets[category].visible = e.target.checked;
        }
    });
}

// Show/Hide all buttons
window.showAll = () => {
    Object.entries(subsets).forEach(([cat, subset]) => {
        subset.visible = true;
        const checkbox = document.getElementById(cat);
        if (checkbox) checkbox.checked = true;
    });
};

window.hideAll = () => {
    Object.entries(subsets).forEach(([cat, subset]) => {
        subset.visible = false;
        const checkbox = document.getElementById(cat);
        if (checkbox) checkbox.checked = false;
    });
};

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};