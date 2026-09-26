// ==========================================
// 1. DATA LAYERS & STATE STORAGE
// ==========================================

const allSections = [
    'sectionhome',
    'sectioncustomermenu',
    'sectionvegetables',
    'sectionfruits',
    'sectioncereals',
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
const API_BASE_URL = window.LASTBITE_API_URL || "https://asmr-foods-api-production.up.railway.app/api";
const LOCAL_FOOD_STORAGE_KEY = "lastbite_local_food_items_v1";

function getLocalFoodItems() {
    try {
        const items = JSON.parse(localStorage.getItem(LOCAL_FOOD_STORAGE_KEY) || "[]");
        return Array.isArray(items) ? items : [];
    } catch (_) {
        return [];
    }
}

function saveLocalFoodItems(items) {
    localStorage.setItem(LOCAL_FOOD_STORAGE_KEY, JSON.stringify(items));
}

function mapApiFoodToUiFood(item) {
    return {
        id: item.id,
        name: item.name,
        desc: item.description || "Freshly added item.",
        price: Number(item.price) || 0,
        img: item.image_url || "https://via.placeholder.com/400x200?text=No+Image"
    };
}

async function apiRequest(path, options = {}) {
    const response = await fetch(API_BASE_URL + path, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Request failed (" + response.status + ")");
    }
    return result;
}

async function loadFoodItemsFromAPI() {
    try {
        const result = await apiRequest("/foods");
        foodItems = Array.isArray(result.data) ? result.data.map(mapApiFoodToUiFood) : [];

        // Include items created while the public backend was unavailable.
        const localItems = getLocalFoodItems();
        const ids = new Set(foodItems.map(item => String(item.id)));
        localItems.forEach(item => {
            if (!ids.has(String(item.id))) foodItems.push(item);
        });

        renderDynamicFoodCards();
        console.log("LastBite: food items loaded from backend.");
    } catch (error) {
        const localItems = getLocalFoodItems();
        if (localItems.length) {
            foodItems = localItems;
            renderDynamicFoodCards();
        }
        console.warn("LastBite backend unavailable. Local persistence is active.", error);
    }
}

async function saveFoodItemToAPI(item) {
    const result = await apiRequest("/foods", {
        method: "POST",
        body: JSON.stringify({
            name: item.name,
            description: item.desc,
            price: item.price,
            image_url: item.img
        })
    });
    return mapApiFoodToUiFood(result.data);
}

async function deleteFoodItemFromAPI(id) {
    return apiRequest("/foods/" + id, { method: "DELETE" });
}

function renderDynamicFoodCards() {
    ["sectionfooditemsedit", "sectionfooditemsbuy"].forEach(sectionId => {
        const section = document.getElementById(sectionId);
        const row = section ? section.querySelector(".row") : null;
        if (row) row.querySelectorAll(".dynamic-food-card").forEach(card => card.remove());
    });

    foodItems.forEach(item => {
        appendDishCardToContainer("sectionfooditemsedit", item, "btn-danger", "Edit");
        appendDishCardToContainer("sectionfooditemsbuy", item, "btn-success", "Order now");
    });
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

function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
}

function appendDishCardToContainer(sectionId, item, structuralBtnClass, functionalBtnLabel) {
    const sectionBlock = document.getElementById(sectionId);
    if (!sectionBlock) return;
    const targetRowElement = sectionBlock.querySelector(".row");
    if (!targetRowElement) return;

    const columnWrapper = document.createElement("div");
    columnWrapper.className = "col-12 col-md-3 dynamic-food-card";
    columnWrapper.dataset.foodId = item.id;

    let actionButton = '<button type="button" class="btn btn-success" data-toggle="modal" data-target="#lastbitePaymentModal" data-whatever="@order">Order now</button>';
    if (functionalBtnLabel === "Edit") {
        actionButton = '<button type="button" class="btn btn-danger edit-food-btn" data-food-id="' +
            escapeHtml(item.id) + '">Edit</button>';
    }

    columnWrapper.innerHTML =
        '<div class="dish-card shadow mb-3 pb-3">' +
        '<div><img src="' + escapeHtml(item.img) + '" class="img4" alt="' + escapeHtml(item.name) +
        '" style="height: 200px; width: 100%; object-fit: cover; border-top-left-radius: 10px; border-top-right-radius: 10px;" /></div>' +
        '<div class="m-2">' +
        '<h5>Name</h5><p>' + escapeHtml(item.name) + '</p>' +
        '<h5>Description</h5><p>' + escapeHtml(item.desc) + '</p>' +
        '<h5>Price</h5><p>Rs. ' + Number(item.price).toFixed(2) + '</p>' +
        actionButton +
        '</div></div>';

    targetRowElement.appendChild(columnWrapper);
}

async function updateFoodItemToAPI(id, item) {
    const result = await apiRequest("/foods/" + id, {
        method: "PUT",
        body: JSON.stringify({
            name: item.name,
            description: item.desc,
            price: item.price,
            image_url: item.img
        })
    });
    return mapApiFoodToUiFood(result.data);
}

function resetFoodModal() {
    const modal = document.getElementById("exampleModal2");
    const title = modal ? modal.querySelector(".modal-title") : null;
    const addButton = document.getElementById("addFoodItemConfirmButton");
    const saveButton = document.getElementById("saveFoodItemEditButton");
    const deleteButton = document.getElementById("deleteFoodItemEditButton");
    const closeButton = document.getElementById("closeFoodItemModalButton");

    if (title) title.textContent = "New Food";
    if (addButton) addButton.classList.remove("d-none");
    if (saveButton) saveButton.classList.add("d-none");
    if (deleteButton) deleteButton.classList.add("d-none");
    if (closeButton) closeButton.textContent = "Close";
    if (addButton) addButton.disabled = false;
    window.editingFoodItemId = null;
}


function prepareNewFoodModal() {
    resetFoodModal();

    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const fileInput = document.getElementById("foodItemImageUploader");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");

    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";
    if (priceInput) priceInput.value = "";
    if (fileInput) fileInput.value = "";
    currentUploadedImageBase64 = "";

    if (previewImg) {
        previewImg.src = "";
        previewImg.style.display = "none";
    }
    if (placeholderText) {
        placeholderText.classList.remove("d-none");
        placeholderText.style.display = "";
    }
    if (statusText) statusText.textContent = "Click + to choose a food image";
}

function openEditFoodItem(id) {
    const item = foodItems.find(food => String(food.id) === String(id));
    if (!item) return;

    const modal = document.getElementById("exampleModal2");
    const title = modal ? modal.querySelector(".modal-title") : null;
    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");

    window.editingFoodItemId = item.id;
    currentUploadedImageBase64 = item.img || "";

    if (title) title.textContent = "Edit Food";
    if (nameInput) nameInput.value = item.name || "";
    if (descInput) descInput.value = item.desc || "";
    if (priceInput) priceInput.value = Number(item.price) || 0;

    if (previewImg && item.img) {
        previewImg.src = item.img;
        previewImg.style.display = "block";
        previewImg.style.visibility = "visible";
        previewImg.style.opacity = "1";
    }
    if (placeholderText) {
        placeholderText.classList.add("d-none");
        placeholderText.style.display = "none";
    }
    if (statusText) statusText.textContent = "Current image";

    document.getElementById("addFoodItemConfirmButton")?.classList.add("d-none");
    document.getElementById("saveFoodItemEditButton")?.classList.remove("d-none");
    document.getElementById("deleteFoodItemEditButton")?.classList.remove("d-none");

    if (window.jQuery && modal) window.jQuery(modal).modal("show");
}

async function handleSaveFoodItemEdit() {
    const id = window.editingFoodItemId;
    if (!id) return;

    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const saveButton = document.getElementById("saveFoodItemEditButton");

    const name = nameInput ? nameInput.value.trim() : "";
    const desc = descInput ? descInput.value.trim() : "";
    const price = priceInput ? Number(priceInput.value) : NaN;

    if (!name) return alert("Please enter a valid Item Name.");
    if (!Number.isFinite(price) || price < 0) return alert("Please enter a valid price.");

    const updated = { id, name, desc, price, img: currentUploadedImageBase64 || "" };

    try {
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Saving..."; }

        if (String(id).startsWith("local-")) {
            const locals = getLocalFoodItems().map(item =>
                String(item.id) === String(id) ? updated : item
            );
            saveLocalFoodItems(locals);
        } else {
            const saved = await updateFoodItemToAPI(id, updated);
            updated.img = saved.img;
        }

        foodItems = foodItems.map(item =>
            String(item.id) === String(id) ? updated : item
        );
        renderDynamicFoodCards();

        if (window.jQuery) window.jQuery("#exampleModal2").modal("hide");
        resetFoodModal();
    } catch (error) {
        console.error("LastBite edit error:", error);
        alert("Could not save the changes.");
    } finally {
        if (saveButton) { saveButton.disabled = false; saveButton.textContent = "Save"; }
    }
}

async function handleEditModalDelete() {
    const id = window.editingFoodItemId;
    if (!id) return;
    await handleDeleteFoodItem(id, document.getElementById("deleteFoodItemEditButton"));
    if (!foodItems.some(item => String(item.id) === String(id))) {
        if (window.jQuery) window.jQuery("#exampleModal2").modal("hide");
        resetFoodModal();
    }
}

async function handleDeleteFoodItem(id, button) {
    if (!id || !confirm("Delete this food item permanently?")) return;

    if (button) {
        button.disabled = true;
        button.textContent = "Deleting...";
    }

    try {
        const isLocal = String(id).startsWith("local-");

        if (isLocal) {
            saveLocalFoodItems(getLocalFoodItems().filter(item => String(item.id) !== String(id)));
        } else {
            try {
                await deleteFoodItemFromAPI(id);
            } catch (apiError) {
                console.warn("Backend delete failed; removing local copy.", apiError);
            }
        }

        foodItems = foodItems.filter(item => String(item.id) !== String(id));
        renderDynamicFoodCards();
    } catch (error) {
        console.error("LastBite delete error:", error);
        alert("Could not delete the food item.");
        if (button) {
            button.disabled = false;
            button.textContent = "Delete";
        }
    }
}

// ==========================================
// 4. FEATURE: DISH ADDITION ENGINE
// ==========================================

async function handleAddFoodItem() {
    const modalElement = document.getElementById("exampleModal2");
    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const fileInput = document.getElementById("foodItemImageUploader");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");
    const addButton = document.getElementById("addFoodItemConfirmButton");

    if (!nameInput || !nameInput.value.trim()) {
        alert("Please enter a valid Item Name.");
        return;
    }
    if (!currentUploadedImageBase64) {
        alert("Please select a food image. The selected image must appear in the preview box.");
        return;
    }

    const price = priceInput ? Number(priceInput.value) : NaN;
    if (!Number.isFinite(price) || price < 0) {
        alert("Please enter a valid price.");
        if (priceInput) priceInput.focus();
        return;
    }

    const newItem = {
        name: nameInput.value.trim(),
        desc: descInput ? descInput.value.trim() : "Freshly added item.",
        price: price,
        img: currentUploadedImageBase64
    };

    try {
        if (addButton) { addButton.disabled = true; addButton.textContent = "Saving..."; }
        if (statusText) statusText.textContent = "Saving food item...";

        let savedItem;
        try {
            savedItem = await saveFoodItemToAPI(newItem);
            console.log("LastBite: item saved to database.");
        } catch (apiError) {
            // GitHub Pages cannot reach localhost. Keep the feature usable until a
            // public backend URL is configured.
            savedItem = { ...newItem, id: "local-" + Date.now() };
            const localItems = getLocalFoodItems();
            localItems.push(savedItem);
            saveLocalFoodItems(localItems);
            console.warn("Backend unavailable; item saved locally.", apiError);
        }

        foodItems.push(savedItem);
        appendDishCardToContainer("sectionfooditemsedit", savedItem, "btn-danger", "Edit");
        appendDishCardToContainer("sectionfooditemsbuy", savedItem, "btn-success", "Order now");

        nameInput.value = "";
        if (descInput) descInput.value = "";
        if (priceInput) priceInput.value = "";
        currentUploadedImageBase64 = "";

        if (previewImg) {
            previewImg.src = "";
            previewImg.style.display = "none";
            previewImg.classList.remove("d-none");
            previewImg.style.display = "none";
        }
        if (placeholderText) {
            placeholderText.classList.remove("d-none");
            placeholderText.style.display = "";
        }
        if (fileInput) fileInput.value = "";
        if (statusText) statusText.textContent = "Food item saved successfully.";

        if (window.jQuery && modalElement) window.jQuery(modalElement).modal("hide");
    } catch (error) {
        console.error("LastBite save error:", error);
        if (statusText) statusText.textContent = "Save failed.";
        alert("Could not add the food item. Please try again.");
    } finally {
        if (addButton) { addButton.disabled = false; addButton.textContent = "Add"; }
    }
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
async function handleSignup() {
    const name = document.getElementById("signupName")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
    const password = document.getElementById("signupPassword")?.value || "";
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";
    const role = document.getElementById("signupRole")?.value || "user";
    const staffCode = document.getElementById("signupStaffCode")?.value || "";
    const message = document.getElementById("signupMessage");
    const button = document.getElementById("signupSubmitButton");

    const showMessage = (text, ok) => {
        if (message) {
            message.textContent = text;
            message.className = "small mt-2 " + (ok ? "text-success" : "text-danger");
        }
    };

    if (!name || !email || !password || !confirmPassword) {
        showMessage("Please fill in all fields.", false);
        return;
    }
    if (password.length < 8) {
        showMessage("Password must contain at least 8 characters.", false);
        return;
    }
    if (password !== confirmPassword) {
        showMessage("Passwords do not match.", false);
        return;
    }

    try {
        if (button) { button.disabled = true; button.textContent = "Creating..."; }
        const result = await apiRequest("/auth/signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password, role, staffCode })
        });
        showMessage(result.message || "Account created successfully.", true);
        document.getElementById("signupForm")?.reset();
        setTimeout(() => {
            if (window.jQuery) window.jQuery("#signupModal").modal("hide");
        }, 1000);
    } catch (error) {
        console.error("LastBite signup error:", error);
        showMessage(error.message || "Could not create the account.", false);
    } finally {
        if (button) { button.disabled = false; button.textContent = "Create Account"; }
    }
}

function setupSignupPasswordToggles() {
    const password = document.getElementById("signupPassword");
    const confirmPassword = document.getElementById("signupConfirmPassword");
    const passwordButton = document.getElementById("toggleSignupPassword");
    const confirmButton = document.getElementById("toggleSignupConfirmPassword");

    function togglePassword(input, button) {
        if (!input || !button) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "👁️" : "🙈";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    }

    if (passwordButton) {
        passwordButton.addEventListener("click", () => togglePassword(password, passwordButton));
    }

    if (confirmButton) {
        confirmButton.addEventListener("click", () => togglePassword(confirmPassword, confirmButton));
    }
}

function toggleLoginPassword(button) {
    const wrap = button && button.closest(".password-toggle-wrap");
    const input = wrap && wrap.querySelector(".login-password-input");
    if (!input) return false;

    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "🙈" : "👁️";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    button.setAttribute("title", show ? "Hide password" : "Show password");
    return false;
}

function setupLoginPasswordToggles() {
    const buttons = document.querySelectorAll(".toggle-login-password");

    buttons.forEach((button) => {
        button.addEventListener("click", function () {
            const group = this.closest(".password-toggle-wrap");
            const input = group ? group.querySelector(".login-password-input") : null;
            if (!input) return;

            const showing = input.type === "text";
            input.type = showing ? "password" : "text";
            this.textContent = showing ? "👁️" : "🙈";
            this.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupLoginPasswordToggles();

    setupSignupPasswordToggles();

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
    const fileInput = document.getElementById("foodItemImageUploader");
    const triggerBtn = document.getElementById("imageUploadTrigger");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");
    if (!fileInput || !triggerBtn) return;

    triggerBtn.onclick = () => fileInput.click();

    fileInput.onchange = function () {
        const file = this.files && this.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            fileInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = event => {
            currentUploadedImageBase64 = event.target.result;

            if (previewImg) {
                previewImg.src = currentUploadedImageBase64;
                previewImg.classList.remove("d-none");
                previewImg.style.display = "block";
                previewImg.style.visibility = "visible";
                previewImg.style.opacity = "1";
            }

            if (placeholderText) {
                placeholderText.classList.add("d-none");
                placeholderText.style.display = "none";
            }

            if (statusText) statusText.textContent = file.name + " selected";
        };

        reader.onerror = () => {
            alert("The image could not be read. Please choose another image.");
        };

        reader.readAsDataURL(file);
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
    const signupButton = document.getElementById("signupSubmitButton");
    if (signupButton) signupButton.addEventListener("click", handleSignup);

    const addFoodItemsButton = document.getElementById("button-addon2");
    if (addFoodItemsButton) {
        addFoodItemsButton.addEventListener("click", prepareNewFoodModal);
    }

    if (addConfirmBtn) addConfirmBtn.addEventListener('click', handleAddFoodItem);

    const saveEditBtn = document.getElementById("saveFoodItemEditButton");
    const deleteEditBtn = document.getElementById("deleteFoodItemEditButton");
    if (saveEditBtn) saveEditBtn.addEventListener("click", handleSaveFoodItemEdit);
    if (deleteEditBtn) deleteEditBtn.addEventListener("click", handleEditModalDelete);

    document.addEventListener("click", event => {
        const editButton = event.target.closest(".edit-food-btn");
        if (editButton) openEditFoodItem(editButton.dataset.foodId);
    });

    const modalElement = document.getElementById("exampleModal2");
    if (modalElement) modalElement.addEventListener("hidden.bs.modal", resetFoodModal);

    document.addEventListener("click", event => {
        const deleteButton = event.target.closest(".delete-food-btn");
        if (deleteButton) handleDeleteFoodItem(deleteButton.dataset.foodId, deleteButton);
    });

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