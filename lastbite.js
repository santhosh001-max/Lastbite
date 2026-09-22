// ==========================================
// 1. DATA LAYERS & STATE STORAGE
// ==========================================

const allSections = [
    'sectionhome',
    'sectionfooditemsedit',
    'sectiondonation',
    'sectionhotels',
    'sectionfooditemsbuy',
    'sectionthankingcustomers',
    'sectiondeliveryboy'
];

let foodItems = [{
        id: 1,
        name: "Mutton Biryani",
        desc: "A fragrant, slow-cooked dish of spiced mutton rice.",
        price: 100,
        img: "https://spiceeats.com/wp-content/uploads/2020/07/Mutton-Biryani.jpg"
    },
    {
        id: 2,
        name: "Parotta",
        desc: "Traditional South Indian layered flatbread.",
        price: 30,
        img: "https://www.cookclickndevour.com/wp-content/uploads/2017/08/malabar-parotta-recipe-c.jpg"
    },
    {
        id: 3,
        name: "Ghee Roast",
        desc: "Traditional South Indian Dosa roasted in ghee.",
        price: 40,
        img: "https://www.cookclickndevour.com/wp-content/uploads/2017/11/ghee-roast-dosa-recipe-b.jpg"
    },
    {
        id: 4,
        name: "Idli",
        desc: "Traditional South Indian steamed rice cake.",
        price: 15,
        img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJTdbtwoTkxAjJjgau90Q9-e16uRvxg7eJjg_t9I2Abasd4wHdUF9A7lVJ&s=10"
    }
];

let deliveryDashboardState = {
    activeJobs: 0,
    completedToday: 0,
    earningsToday: 0,
    rating: 4.9
};

let currentUploadedImageBase64 = "";
let map = null;


// ==========================================
// 1A. BACKEND API CONNECTION
// ==========================================
// Change this URL after deploying the Node.js backend.
// For local development: http://localhost:3000/api
const API_BASE_URL = window.LASTBITE_API_URL || "http://localhost:3000/api";

function mapApiFoodToUiFood(item) {
    return {
        id: item.id,
        name: item.name,
        desc: item.description || "Freshly added item.",
        price: Number(item.price) || 0,
        img: item.image_url || "https://via.placeholder.com/200"
    };
}

async function loadFoodItemsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/foods`);
        if (!response.ok) throw new Error("Food API request failed.");

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            throw new Error("Invalid food API response.");
        }

        foodItems = result.data.map(mapApiFoodToUiFood);

        // Clear dynamically generated cards before rebuilding them.
        ['sectionfooditemsedit', 'sectionfooditemsbuy'].forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const row = section ? section.querySelector('.row') : null;
            if (row) row.querySelectorAll('.dynamic-food-card').forEach(card => card.remove());
        });

        foodItems.forEach(item => {
            appendDishCardToContainer('sectionfooditemsedit', item, 'btn-danger', 'Edit');
            appendDishCardToContainer('sectionfooditemsbuy', item, 'btn-success', 'Order now');
        });

        console.log("LastBite: food items loaded from database.");
    } catch (error) {
        // Keep the existing demo food if the backend is not deployed/reachable yet.
        console.warn("LastBite backend is not reachable. Using local demo food items.", error);
    }
}

async function saveFoodItemToAPI(item) {
    const response = await fetch(`${API_BASE_URL}/foods`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: item.name,
            description: item.desc,
            price: item.price,
            image_url: item.img
        })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save food item.");
    }

    return mapApiFoodToUiFood(result.data);
}

// ==========================================
// 2. CORE UTILITY: NAVIGATION
// ==========================================

function switchSection(targetSectionId) {
    allSections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.style.display = (sectionId === targetSectionId) ? 'block' : 'none';
        }
    });

    // Refresh map alignment when entering donation section
    if (targetSectionId === 'sectiondonation' && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }
}
window.display = switchSection;

// ==========================================
// 3. HELPER: UI CARD GENERATOR (Defined early to avoid errors)
// ==========================================

function appendDishCardToContainer(sectionId, item, structuralBtnClass, functionalBtnLabel) {
    const sectionBlock = document.getElementById(sectionId);
    if (!sectionBlock) return;

    const targetRowElement = sectionBlock.querySelector('.row');
    if (!targetRowElement) return;

    const columnWrapper = document.createElement('div');
    columnWrapper.className = 'col-12 col-md-3 dynamic-food-card';
    columnWrapper.innerHTML = `
        <div class="dish-card shadow mb-3 pb-3">
            <div><img src="${item.img}" class="img4" style="height: 200px; width: 100%; border-top-left-radius: 10px; border-top-right-radius: 10px;" /></div>
            <div class="m-2">
                <h5>Name</h5><p>${item.name}</p>
                <h5>Description</h5><p>${item.desc}</p>
                <h5>Price</h5><p>Rs. ${item.price}</p>
                <button class="btn ${structuralBtnClass}">${functionalBtnLabel}</button>
            </div>
        </div>`;
    targetRowElement.appendChild(columnWrapper);
}

// ==========================================
// 4. FEATURE: DISH ADDITION ENGINE
// ==========================================

async function handleAddFoodItem() {
    const modalElement = document.getElementById('exampleModal2');
    const nameInput = document.getElementById('lastbiteItemName') ||
        modalElement.querySelectorAll('input[type="text"]')[0];
    const descInput = document.getElementById('lastbiteItemDescription') ||
        modalElement.querySelectorAll('input[type="text"]')[1];

    if (!nameInput || !nameInput.value.trim()) {
        alert("Please enter a valid Item Name.");
        return;
    }

    const newItem = {
        name: nameInput.value.trim(),
        desc: descInput ? descInput.value.trim() : "Freshly added item.",
        price: 50,
        img: currentUploadedImageBase64 || "https://via.placeholder.com/200"
    };

    // Save permanently through the Node.js + MySQL backend.
    // The UI is updated only after the database confirms the insert.
    let savedItem;
    try {
        savedItem = await saveFoodItemToAPI(newItem);
    } catch (error) {
        console.error("LastBite save error:", error);
        alert("Could not save the food item to the database. Please check that the backend is running.");
        return;
    }

    foodItems.push(savedItem);

    appendDishCardToContainer('sectionfooditemsedit', savedItem, 'btn-danger', 'Edit');
    appendDishCardToContainer('sectionfooditemsbuy', savedItem, 'btn-success', 'Order now');

    // Reset Modal
    nameInput.value = '';
    if (descInput) descInput.value = '';
    currentUploadedImageBase64 = "";
    document.getElementById('uploadPreviewThumbnail').classList.add('d-none');
    document.getElementById('triggerPlaceholderText').classList.remove('d-none');
}

// ==========================================
// 5. FEATURE: LEAFLET.JS MAP
// ==========================================

let activeMarker = null; // We will use one marker that moves

function initLeafletMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv || map) return; // Don't re-initialize if it already exists

    // Initialize map centered on Chennai
    map = L.map('map').setView([13.0827, 80.2707], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 13,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Create a starting marker
    activeMarker = L.marker([13.0827, 80.2707]).addTo(map)
        .bindPopup("Select an orphanage to see location")
        .openPopup();
}

// THIS IS THE KEY FUNCTION
// It makes the map work for every orphanage button
function focusMap(lat, lng, name) {
    if (!map) {
        initLeafletMap();
    }

    // 1. Move the map to the new coordinates
    map.setView([lat, lng], 16);

    // 2. Move the pin to the new coordinates
    activeMarker.setLatLng([lat, lng]);

    // 3. Update the text inside the pin
    activeMarker.setPopupContent(`<b>${name}</b><br>Click 'Donate Now' to help!`).openPopup();

    // 4. Smooth scroll the user to the map so they see it moved
    document.getElementById('map').scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// Ensure the map initializes when the page loads
document.addEventListener("DOMContentLoaded", () => {
    initLeafletMap();
    // ... your other existing init functions ...
});

// ==========================================
// 6. FEATURE: SEARCH FILTERS
// ==========================================

function setupDynamicFilter(searchInputId, sectionContainerId) {
    const searchInput = document.getElementById(searchInputId);
    if (!searchInput) return;

    searchInput.addEventListener('input', (event) => {
        const queryText = event.target.value.toLowerCase().trim();
        const parentContainer = document.getElementById(sectionContainerId);
        const cards = parentContainer.querySelectorAll('.dish-card');

        cards.forEach(card => {
            const content = card.textContent.toLowerCase();
            card.parentElement.style.display = content.includes(queryText) ? 'block' : 'none';
        });
    });
}

// ==========================================
// 7. FEATURE: LOCAL IMAGE UPLOADER
// ==========================================

function setupImageUploadLogic() {
    const fileInput = document.getElementById('foodItemImageUploader');
    const triggerBtn = document.getElementById('imageUploadTrigger');
    const previewImg = document.getElementById('uploadPreviewThumbnail');
    const placeholderText = document.getElementById('triggerPlaceholderText');

    if (!fileInput || !triggerBtn) return;

    triggerBtn.onclick = () => fileInput.click();

    fileInput.onchange = function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentUploadedImageBase64 = e.target.result;
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.classList.remove('d-none');
                }
                if (placeholderText) placeholderText.classList.add('d-none');
            };
            reader.readAsDataURL(file);
        }
    };
}

// ==========================================
// 8. FEATURE: DELIVERY DASHBOARD
// ==========================================

function renderDeliveryDashboard() {
    const parentContainer = document.getElementById('sectiondeliveryboy');
    if (!parentContainer) return;
    const statBoxes = parentContainer.querySelectorAll('.deliveryboy h4');
    if (statBoxes.length >= 4) {
        statBoxes[0].textContent = deliveryDashboardState.activeJobs;
        statBoxes[1].textContent = deliveryDashboardState.completedToday;
        statBoxes[2].textContent = `Rs.${deliveryDashboardState.earningsToday}`;
        statBoxes[3].textContent = deliveryDashboardState.rating.toFixed(1);
    }
}

function simulateOrderProcessingUpdate() {
    deliveryDashboardState.activeJobs += 1;
    deliveryDashboardState.completedToday += 1;
    deliveryDashboardState.earningsToday += 45;
    renderDeliveryDashboard();
}

// ==========================================
// 9. INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    switchSection('sectionhome');
    renderDeliveryDashboard();
    setupImageUploadLogic();
    initLeafletMap();
    loadFoodItemsFromAPI();

    const addConfirmBtn = document.getElementById('addFoodItemConfirmButton') ||
        document.querySelector('#exampleModal2 .modal-footer .btn-primary');
    if (addConfirmBtn) addConfirmBtn.addEventListener('click', handleAddFoodItem);

    // Setup Search Logic
    const editSearch = document.querySelector('#sectionfooditemsedit input[placeholder="Search"]');
    if (editSearch) {
        editSearch.id = 'editSearch';
        setupDynamicFilter('editSearch', 'sectionfooditemsedit');
    }

    const buySearch = document.querySelector('#sectionfooditemsbuy input[placeholder="Search"]');
    if (buySearch) {
        buySearch.id = 'buySearch';
        setupDynamicFilter('buySearch', 'sectionfooditemsbuy');
    }

    const hotelSearch = document.querySelector('#sectionhotels input[placeholder="Search"]');
    if (hotelSearch) {
        hotelSearch.id = 'hotelSearch';
        setupDynamicFilter('hotelSearch', 'sectionhotels');
    }

    document.querySelectorAll('button[onclick*="sectionthankingcustomers"]').forEach(btn => {
        btn.addEventListener('click', simulateOrderProcessingUpdate);
    });
});