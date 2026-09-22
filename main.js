import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IFCLoader } from "web-ifc-three/IFCLoader.js";
import { createCategorySubsets } from './src/ifc-utils.js';
import { getCategoryNames } from './src/ifc-categories-config.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);
// --- Grid ---
const grid = new THREE.GridHelper(200, 30, 0x444444, 0x888888);
scene.add(grid);
// --- SetCamera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("viewer").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.DirectionalLight(0xffffff, 1), new THREE.AmbientLight(0xffffff, 0.7));

// --- IFC Loader ---
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("/wasm/");

let subsets = {};
let ifcModel = null;
let uploadedFile = null;
let violationLayer = null

// --- 1. The Button Connection (The "Why" Fix) ---
// This connects the HTML button to the private JS module logic
const checkBtn = document.getElementById("check-compliance-btn");
if (checkBtn) {
    checkBtn.addEventListener("click", async () => {
        if (!uploadedFile || !ifcModel) {
            alert("Please upload an IFC file first!");
            return;
        }
        console.log("Checking compliance...");
        await checkCompliance(uploadedFile);
    });
}

// --- 2. Compliance Logic ---
async function checkCompliance(file) {
    const formData = new FormData();
    formData.append('ifc', file);
    
    try {
        const response = await fetch('http://localhost:5000/api/check-compliance', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        const violations = data.violations || [];
        
        if (violations.length > 0) {
            alert(`Found ${violations.length} doors with violations!`);
            const ids = violations.map(v => v.door_id);
            highlightViolations(ids, ifcModel.modelID);
        } else {
            alert('All doors comply with building code!');
        }
    } catch (err) {
        console.error("Backend connection failed:", err);
    }
}

/*
async function highlightViolations(ids, modelID) {
    // Create the red highlight subset
    await ifcLoader.ifcManager.createSubset({
        modelID: modelID,
        ids: ids,
        scene: scene,
        removePrevious: true,
        material: new THREE.MeshLambertMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8,
            depthTest: false // Makes red visible through walls
        })
    });
    console.log(`Highlighted ${ids.length} objects.`);
}
*/
async function highlightViolations(ids, modelID) {
    // Assign the subset to the global variable so showAll/hideAll can find it
    violationLayer = await ifcLoader.ifcManager.createSubset({
        modelID: modelID,
        ids: ids,
        scene: scene,
        removePrevious: true,
        material: new THREE.MeshLambertMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8,
            depthTest: false 
        })
    });
    console.log(`Highlighted ${ids.length} objects.`);
}



// --- Colour fix ---
// A handful of elements in these IFC files (e.g. the roof) carry an
// unusually saturated reddish material. That reads as "violation red" once
// checkCompliance() highlights non-compliant doors in the same hue, so the
// two are impossible to tell apart at a glance. This neutralises any
// strongly reddish base material to a mid grey, so the bright 0xff0000
// violation highlight (added separately, after this runs) stays the only
// red in the scene.
function isReddish(color) {
    return color.r > 0.35 && color.r > color.g * 1.3 && color.r > color.b * 1.3;
}

function neutralizeReddishMaterials(object) {
    const neutral = new THREE.Color(0.62, 0.62, 0.62);
    object.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
            if (mat && mat.color && isReddish(mat.color)) {
                mat.color.copy(neutral);
            }
        });
    });
}

// --- 3. File Loading ---
document.getElementById("file-input").onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    uploadedFile = file; // Remember the file for the button
    const url = URL.createObjectURL(file);

    ifcLoader.load(url, async (model) => {
        ifcModel = model;
        ifcModel.visible = false;
        scene.add(ifcModel);
        neutralizeReddishMaterials(ifcModel);

        // Fit camera
        const box = new THREE.Box3().setFromObject(ifcModel);
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        camera.position.set(center.x + 20, center.y + 20, center.z + 20);
        controls.update();

        // Generate visible subsets
        subsets = await createCategorySubsets(ifcLoader, ifcModel.modelID, scene);
        Object.values(subsets).forEach((subset) => neutralizeReddishMaterials(subset));
        connectCheckboxes();
    });
};

// --- Helpers ---
/*
function connectCheckboxes() {
    getCategoryNames().forEach(category => {
        const checkbox = document.getElementById(category);
        if (checkbox && subsets[category]) {
            checkbox.onchange = (e) => subsets[category].visible = e.target.checked;
        }
    });
}
*/

function connectCheckboxes() {
    getCategoryNames().forEach(category => {
        const checkbox = document.getElementById(category);
        if (checkbox && subsets[category]) {
            checkbox.onchange = (e) => {
                const isVisible = e.target.checked;
                subsets[category].visible = isVisible;
                
                // If this is the door category, also hide the red highlights
                if (category.toUpperCase().includes("DOOR") && violationLayer) {
                    violationLayer.visible = isVisible;
                }
            };
        }
    });
}

// These are 'window' functions so the HTML 'onclick' can find them
//window.showAll = () => Object.values(subsets).forEach(s => s.visible = true);
//window.hideAll = () => Object.values(subsets).forEach(s => s.visible = false);

// --- Global Visibility Buttons ---

window.showAll = () => {
    // 1. Get every possible category name from your config
    const allCategories = getCategoryNames(); 

    allCategories.forEach(cat => {
        // 2. Update the Checkbox UI (even if the category isn't in the model)
        const cb = document.getElementById(cat);
        if (cb) cb.checked = true;

        // 3. Update the 3D Visibility (if the category exists in the model)
        if (subsets[cat]) {
            subsets[cat].visible = true;
        }
    });

    // 4. Also show the red violations if they exist
    if (violationLayer) violationLayer.visible = true;
};

window.hideAll = () => {
    const allCategories = getCategoryNames();

    allCategories.forEach(cat => {
        // 2. Update the Checkbox UI
        const cb = document.getElementById(cat);
        if (cb) cb.checked = false;

        // 3. Update the 3D Visibility
        if (subsets[cat]) {
            subsets[cat].visible = false;
        }
    });

    // 4. Also hide the red violations
    if (violationLayer) violationLayer.visible = false;
};



function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};