// ==========================================
// 1. DATA LAYERS & STATE STORAGE
// ==========================================

const allSections = [
    'sectionhome',
    'sectioncustomermenu',
    'sectionstaffcategories',
    'sectionvegetables',
    'sectionfruits',
    'sectioncereals',
    'sectionfooditemsedit',
    'sectionfestivalbounties',
    'sectionbestoffers',
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
    rating: 4.9,
    jobs: [],
    history: []
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

function getDefaultUnitForCategory(category) {
    return ["vegetables", "fruits", "cereals"].includes(normalizeFoodCategory(category))
        ? "kg"
        : "servings";
}

function mapApiFoodToUiFood(item) {
    const category = normalizeFoodCategory(item.category);
    const apiUnit = String(item.unit || "").toLowerCase();
    const unit = ["vegetables", "fruits", "cereals"].includes(category)
        ? (["kg", "g"].includes(apiUnit) ? apiUnit : "kg")
        : "servings";

    return {
        id: item.id,
        name: item.name,
        desc: item.description || "Freshly added item.",
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit,
        img: item.image_url || "https://via.placeholder.com/400x200?text=No+Image",
        category
    };
}

function normalizeFoodCategory(category) {
    const value = String(category || "food").toLowerCase().trim();
    if (value === "vegetable" || value === "vegetables") return "vegetables";
    if (value === "fruit" || value === "fruits") return "fruits";
    if (value === "cereal" || value === "cereals" || value === "pulses" || value === "cereals & pulses") return "cereals";
    return "food";
}

let selectedStaffFoodCategory = "food";

function setQuantityUnit(unit) {
    const unitInput = document.getElementById("lastbiteItemUnit");
    const buttons = document.querySelectorAll(".lastbite-unit-option");
    if (!unitInput) return;
    unitInput.value = unit;
    buttons.forEach((button) => {
        button.classList.toggle("active", button.dataset.unit === unit);
    });
}

function updateQuantityUnitForCategory(category, preferredUnit = "kg") {
    const normalized = normalizeFoodCategory(category);
    const unitInput = document.getElementById("lastbiteItemUnit");
    const switchBox = document.getElementById("lastbiteUnitSwitch");
    const quantityInput = document.getElementById("lastbiteItemQuantity");
    const help = document.getElementById("lastbiteQuantityHelp");
    if (!unitInput) return;
    const measured = ["vegetables", "fruits", "cereals"].includes(normalized);
    if (switchBox) switchBox.style.display = measured ? "flex" : "none";
    if (measured) {
        setQuantityUnit(["kg", "g"].includes(preferredUnit) ? preferredUnit : "kg");
        if (quantityInput) {
            quantityInput.min = "0.001";
            quantityInput.step = "0.001";
        }
        if (help) help.textContent = "Choose kg or g using the switch.";
    } else {
        unitInput.value = "servings";
        if (help) help.textContent = "Food Items use servings.";
    }
}
function filterStaffFoodCategory(category) {
    selectedStaffFoodCategory = normalizeFoodCategory(category);
    updateQuantityUnitForCategory(selectedStaffFoodCategory);

    const section = document.getElementById("sectionfooditemsedit");
    if (!section) return;

    section.querySelectorAll(".staff-food-card, .dynamic-food-card").forEach(card => {
        const cardCategory = normalizeFoodCategory(card.dataset.category);
        card.style.display = cardCategory === selectedStaffFoodCategory ? "" : "none";
    });

    const categorySelect = document.getElementById("lastbiteItemCategory");
    if (categorySelect) {
        categorySelect.value = selectedStaffFoodCategory;
    }
    updateQuantityUnitForCategory(selectedStaffFoodCategory);

    const categoryTitle = document.getElementById("staffSelectedCategoryTitle");
    const foodPageTitle = document.getElementById("staffFoodPageTitle");
    const names = {
        food: "Food",
        vegetables: "Vegetables",
        fruits: "Fruits",
        cereals: "Cereals & Pulses"
    };
    const selectedTitle = names[selectedStaffFoodCategory] || "Food";
    if (categoryTitle) categoryTitle.textContent = selectedTitle;
    if (foodPageTitle) foodPageTitle.textContent = selectedTitle;

    const addItemsButton = document.getElementById("button-addon2");
    if (addItemsButton) {
        addItemsButton.textContent = "Add Items";
        addItemsButton.setAttribute(
            "aria-label",
            "Add items to " + (categoryTitle ? categoryTitle.textContent : "Food")
        );
    }
}

function openStaffFoodCategory(category) {
    selectedStaffFoodCategory = normalizeFoodCategory(category);
    switchSection("sectionfooditemsedit");
    filterStaffFoodCategory(selectedStaffFoodCategory);

    const categorySelect = document.getElementById("lastbiteItemCategory");
    if (categorySelect) {
        categorySelect.value = selectedStaffFoodCategory;
    }
}

window.filterStaffFoodCategory = filterStaffFoodCategory;
window.openStaffFoodCategory = openStaffFoodCategory;

function getSafeQuantity(value, fallback = 1) {
    const quantity = Number(value);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
}

function createQuantityControl(initialQuantity = 1, foodId = "", unit = "servings", price = 0) {
    const wrapper = document.createElement("div");
    wrapper.className = "food-quantity-control mt-2 mb-2";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";

    const measured = ["kg", "g"].includes(String(unit).toLowerCase());
    const unitPrice = Number(price) || 0;
    let selectedUnit = measured ? String(unit).toLowerCase() : "servings";

    const label = document.createElement("span");
    label.textContent = "Quantity:";
    label.style.fontWeight = "600";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "btn btn-outline-secondary btn-sm";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Decrease quantity");

    const input = document.createElement("input");
    input.type = "number";
    input.className = "form-control form-control-sm food-quantity-input";
    input.min = measured ? "0.001" : "1";
    input.step = measured ? "0.001" : "1";
    input.value = String(measured ? Math.max(0.001, Number(initialQuantity) || 1) : getSafeQuantity(initialQuantity));
    input.dataset.foodId = foodId;
    input.style.width = "70px";
    input.style.textAlign = "center";

    const unitSwitch = document.createElement("div");
    unitSwitch.className = "lastbite-order-unit-switch";
    unitSwitch.innerHTML =
        '<button type="button" class="lastbite-order-unit active" data-unit="kg">kg</button>' +
        '<button type="button" class="lastbite-order-unit" data-unit="g">g</button>';
    unitSwitch.style.display = measured ? "flex" : "none";

    const setUnit = (nextUnit) => {
        selectedUnit = nextUnit;
        unitSwitch.querySelectorAll(".lastbite-order-unit").forEach((button) => {
            button.classList.toggle("active", button.dataset.unit === nextUnit);
        });
        input.step = nextUnit === "g" ? "1" : "0.001";
        input.min = nextUnit === "g" ? "1" : "0.001";
        const current = Number(input.value) || 1;
        input.value = nextUnit === "g" ? String(Math.max(1, Math.round(current))) : String(Math.max(0.001, current));
    };

    if (measured) setUnit(selectedUnit);

    const normalize = () => {
        const value = Number(input.value);
        input.value = measured
            ? String(Math.max(selectedUnit === "g" ? 1 : 0.001, Number.isFinite(value) ? value : 1))
            : String(Math.max(1, parseInt(input.value, 10) || 1));
    };

    minus.addEventListener("click", () => {
        normalize();
        const step = selectedUnit === "g" ? 1 : (measured ? 0.001 : 1);
        input.value = String(Math.max(selectedUnit === "g" ? 1 : 0.001, Number(input.value) - step));
    });

    plus.addEventListener("click", () => {
        normalize();
        const step = selectedUnit === "g" ? 1 : (measured ? 0.001 : 1);
        input.value = String(Number(input.value) + step);
    });

    input.addEventListener("change", normalize);
    input.addEventListener("input", () => {
        if (input.value !== "") normalize();
    });

    unitSwitch.querySelectorAll(".lastbite-order-unit").forEach((button) => {
        button.addEventListener("click", () => setUnit(button.dataset.unit));
    });

    const livePrice = document.createElement("div");
    livePrice.className = "lastbite-live-price-summary";
    livePrice.innerHTML = unitPrice > 0
        ? '<span>Price: ₹' + unitPrice.toFixed(2) + ' / ' + (measured ? selectedUnit : 'unit') + '</span><strong>Total: ₹' + (unitPrice * Number(input.value || 1)).toFixed(2) + '</strong>'
        : '<strong class="text-muted">Price: Set by provider</strong>';

    const refreshLivePrice = () => {
        if (unitPrice <= 0) return;
        const quantity = Number(input.value) || 0;
        const activeUnit = measured ? selectedUnit : "unit";
        livePrice.innerHTML =
            '<span>Price: ₹' + unitPrice.toFixed(2) + ' / ' + activeUnit + '</span>' +
            '<strong>Total: ₹' + (unitPrice * quantity).toFixed(2) + '</strong>';
    };

    input.addEventListener("input", refreshLivePrice);
    input.addEventListener("change", refreshLivePrice);

    const originalSetUnit = setUnit;
    setUnit = (nextUnit) => {
        originalSetUnit(nextUnit);
        refreshLivePrice();
    };

    wrapper.append(label, minus, input, plus, unitSwitch, livePrice);
    return wrapper;
}

function getCardQuantity(card) {
    const input = card ? card.querySelector(".food-quantity-input") : null;
    return getSafeQuantity(input ? input.value : 1);
}

function getCardUnit(card) {
    const switchBox = card ? card.querySelector(".lastbite-order-unit-switch") : null;
    const active = switchBox ? switchBox.querySelector(".lastbite-order-unit.active") : null;
    return active ? active.dataset.unit : "servings";
}

function getCardQuantity(card) {
    const input = card ? card.querySelector(".food-quantity-input") : null;
    return getSafeQuantity(input ? input.value : 1);
}

function ensurePaymentOrderSummary() {
    const modal = document.getElementById("lastbitePaymentModal");
    if (!modal) return null;

    let summary = modal.querySelector("#lastbiteOrderSummary");
    if (!summary) {
        summary = document.createElement("div");
        summary.id = "lastbiteOrderSummary";
        summary.className = "alert alert-light border mb-3";
        const body = modal.querySelector(".modal-body");
        if (body) body.insertBefore(summary, body.firstChild);
    }
    return summary;
}

function preparePaymentForFoodButton(button) {
    const card = button ? button.closest(".dish-card") : null;
    if (!card) return;

    const nameParagraph = card.querySelector("h5 + p");
    const priceParagraph = Array.from(card.querySelectorAll("h5")).find(h => h.textContent.trim().toLowerCase() === "price");
    const priceText = priceParagraph && priceParagraph.nextElementSibling
        ? priceParagraph.nextElementSibling.textContent
        : "Rs. 0";
    const price = Number((priceText.match(/[0-9]+(?:\.[0-9]+)?/) || ["0"])[0]);
    const quantity = getCardQuantity(card);
    const unit = getCardUnit(card);
    const name = nameParagraph ? nameParagraph.textContent.trim() : "Food item";
    const total = price * quantity;

    const summary = document.getElementById("lastbiteOrderSummary");
    const unitPriceEl = document.getElementById("lastbitePaymentUnitPrice");
    const totalEl = document.getElementById("lastbitePaymentTotal");
    const displayUnit = unit === "g" ? "g" : (unit === "kg" ? "kg" : "unit");
    const category = normalizeFoodCategory(card.closest("[data-category]")?.dataset.category || "");
    const weightCategory = ["vegetables", "fruits", "cereals"].includes(category);
    const displayPrice = weightCategory && unit === "g" ? price / 1000 : price;
    const displayTotal = weightCategory && unit === "g" ? displayPrice * quantity : total;

    if (summary) summary.classList.remove("d-none");
    if (unitPriceEl) unitPriceEl.textContent = "₹" + displayPrice.toFixed(2) + " / " + displayUnit;
    if (totalEl) totalEl.textContent = "₹" + displayTotal.toFixed(2);

    window.lastbiteSelectedOrder = { name, price: displayPrice, quantity, unit, total: displayTotal };
}

document.addEventListener("click", (event) => {
    const button = event.target.closest(".order-now-btn");
    if (button) preparePaymentForFoodButton(button);
});

function setupStaticFoodQuantityControls() {
    const sections = [
        "sectionfooditemsbuy",
        "sectionvegetables",
        "sectionfruits",
        "sectioncereals"
    ];

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) return;

        section.querySelectorAll(".dish-card").forEach(card => {
            if (card.closest(".dynamic-food-card") || card.querySelector(".food-quantity-control")) return;

            const orderButton = card.querySelector('button[data-target="#lastbitePaymentModal"]');
            if (!orderButton) return;

            const control = createQuantityControl(1, "");
            orderButton.parentElement.insertBefore(control, orderButton);
            orderButton.classList.add("order-now-btn");
        });
    });
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

async function getAIPriceRecommendation() {
    const name = document.getElementById("lastbiteItemName")?.value.trim() || "";
    const category = normalizeFoodCategory(document.getElementById("lastbiteItemCategory")?.value);
    const rawQuantity = Number(document.getElementById("lastbiteItemQuantity")?.value);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    const currentPrice = Number(document.getElementById("lastbiteItemPrice")?.value) || 0;
    const unit = document.getElementById("lastbiteItemUnit")?.value || "kg";
    const box = document.getElementById("aiPriceRecommendation");
    const button = document.getElementById("aiPriceSuggestButton");

    if (!["vegetables", "fruits", "cereals"].includes(category)) {
        if (box) {
            box.className = "lastbite-ai-price-box";
            box.innerHTML = "<strong>AI pricing is available for Vegetables, Fruits, and Cereals &amp; Pulses.</strong>";
        }
        return;
    }
    if (!name) {
        if (box) {
            box.className = "lastbite-ai-price-box lastbite-ai-price-warning";
            box.textContent = "Enter the item name first.";
        }
        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
        }
        if (box) {
            box.className = "lastbite-ai-price-box";
            box.textContent = "AI is analyzing category, quantity and price conditions...";
        }

        const result = await apiRequest("/pricing/recommend", {
            method: "POST",
            body: JSON.stringify({ name, category, quantity, unit, currentPrice })
        });
        const data = result.data || {};
        const suggested = Number(data.suggestedPrice) || 0;

        if (box) {
            box.className = "lastbite-ai-price-box";
            box.innerHTML =
                '<div class="lastbite-ai-price-title"><i class="fas fa-robot"></i> AI Price Recommendation</div>' +
                '<div class="lastbite-ai-price-value">₹' + suggested.toFixed(2) + ' / ' + (unit === "g" ? "g" : "kg") + '</div>' +
                '<div class="lastbite-ai-price-meta">' + escapeHtml(data.reason || "Recommended from the available item and pricing data.") + '</div>' +
                '<button type="button" class="btn btn-sm btn-success mt-2" id="useAIPriceButton">Use Recommended Price</button>';
            document.getElementById("useAIPriceButton")?.addEventListener("click", () => {
                const input = document.getElementById("lastbiteItemPrice");
                if (input) input.value = suggested.toFixed(2);
                box.className = "lastbite-ai-price-box lastbite-ai-price-used";
                box.insertAdjacentHTML("beforeend", '<div class="small mt-1">✓ Recommended price applied.</div>');
            });
        }
    } catch (error) {
        console.error("LastBite AI pricing error:", error);
        if (box) {
            box.className = "lastbite-ai-price-box lastbite-ai-price-warning";
            box.textContent = error.message || "AI pricing is temporarily unavailable.";
        }
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-robot"></i> AI Price';
        }
    }
}

function resetAIPriceRecommendation() {
    const box = document.getElementById("aiPriceRecommendation");
    if (box) {
        box.className = "lastbite-ai-price-box d-none";
        box.innerHTML = "";
    }
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
            quantity: getSafeQuantity(item.quantity),
            category: normalizeFoodCategory(item.category),
            quantity: getSafeQuantity(item.quantity),
            unit: item.unit || "servings",
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

    const categorySections = {
        food: "sectionfooditemsbuy",
        vegetables: "sectionvegetables",
        fruits: "sectionfruits",
        cereals: "sectioncereals"
    };

    Object.entries(categorySections).forEach(([category, sectionId]) => {
        const section = document.getElementById(sectionId);
        const row = section ? section.querySelector(".row") : null;
        if (!row) return;

        row.querySelectorAll(".dynamic-food-card").forEach(card => card.remove());

        const categoryItems = foodItems.filter(item => normalizeFoodCategory(item.category) === category);
        if (categoryItems.length) {
            row.querySelectorAll(".dish-card").forEach(card => {
                if (!card.closest(".dynamic-food-card")) card.closest("[class*='col-']")?.remove();
            });
            categoryItems.forEach(item => {
                appendDishCardToContainer(sectionId, item, "btn-success", "Order now");
            });
        }
    });

    foodItems.forEach(item => {
        appendDishCardToContainer("sectionfooditemsedit", item, "btn-danger", "Edit");
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
    columnWrapper.dataset.category = normalizeFoodCategory(item.category);

    const availableQuantity = getSafeQuantity(item.quantity);
    let actionButton = '<button type="button" class="btn btn-success order-now-btn" data-toggle="modal" data-target="#lastbitePaymentModal" data-whatever="@order">Order now</button>';

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
        (functionalBtnLabel === "Edit"
            ? '<h5>Available Quantity</h5><p>' + availableQuantity + ' ' + escapeHtml(item.unit || "servings") + '</p>'
            : '') +
        actionButton +
        '</div></div>';

    targetRowElement.appendChild(columnWrapper);

    if (functionalBtnLabel !== "Edit") {
        const actionArea = columnWrapper.querySelector(".m-2");
        const button = columnWrapper.querySelector(".order-now-btn");
        if (actionArea && button) {
            const control = createQuantityControl(1, item.id, item.unit || "servings", item.price);
            actionArea.insertBefore(control, button);
        }
    }
}

async function updateFoodItemToAPI(id, item) {
    const result = await apiRequest("/foods/" + id, {
        method: "PUT",
        body: JSON.stringify({
            name: item.name,
            description: item.desc,
            quantity: getSafeQuantity(item.quantity),
            unit: item.unit || "servings",
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
    window.editingStaticFoodCard = null;
}


function prepareNewFoodModal() {
    resetFoodModal();
    resetAIPriceRecommendation();

    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const quantityInput = document.getElementById("lastbiteItemQuantity");
    const categoryInput = document.getElementById("lastbiteItemCategory");
    const fileInput = document.getElementById("foodItemImageUploader");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");

    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";
    if (priceInput) priceInput.value = "";
    if (quantityInput) quantityInput.value = "1";
    const unitInput = document.getElementById("lastbiteItemUnit");
    if (unitInput) unitInput.value = "servings";
    if (categoryInput) categoryInput.value = "food";
    updateQuantityUnitForCategory("food");
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
    const quantityInput = document.getElementById("lastbiteItemQuantity");
    const categoryInput = document.getElementById("lastbiteItemCategory");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");

    window.editingFoodItemId = item.id;
    currentUploadedImageBase64 = item.img || "";
    resetAIPriceRecommendation();

    if (title) title.textContent = "Edit Food";
    if (nameInput) nameInput.value = item.name || "";
    if (descInput) descInput.value = item.desc || "";
    if (priceInput) priceInput.value = Number(item.price) || 0;
    if (categoryInput) categoryInput.value = normalizeFoodCategory(item.category);
    updateQuantityUnitForCategory(item.category);
    if (quantityInput) quantityInput.value = getSafeQuantity(item.quantity);
    const unitInput = document.getElementById("lastbiteItemUnit");
    if (unitInput) unitInput.value = item.unit || "servings";

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



function openStaticFoodCardEditor(button) {
    const card = button ? button.closest(".staff-food-card") : null;
    if (!card) return;

    const nameEl = card.querySelector("h5:nth-of-type(1) + p");
    const descEl = card.querySelector("h5:nth-of-type(2) + p");
    const priceEl = card.querySelector("h5:nth-of-type(3) + p");
    const imageEl = card.querySelector("img");

    const name = nameEl ? nameEl.textContent.trim() : "";
    const desc = descEl ? descEl.textContent.trim() : "";
    const priceText = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, "") : "0";
    const price = Number(priceText) || 0;
    const img = imageEl ? imageEl.src : "";
    const category = normalizeFoodCategory(card.dataset.category || "food");

    window.editingStaticFoodCard = card;
    window.editingFoodItemId = "static-card";
    currentUploadedImageBase64 = img;

    const modal = document.getElementById("exampleModal2");
    const title = modal ? modal.querySelector(".modal-title") : null;
    const nameInput = document.getElementById("lastbiteItemName");
    const descInput = document.getElementById("lastbiteItemDescription");
    const priceInput = document.getElementById("lastbiteItemPrice");
    const quantityInput = document.getElementById("lastbiteItemQuantity");
    const categoryInput = document.getElementById("lastbiteItemCategory");
    const previewImg = document.getElementById("uploadPreviewThumbnail");
    const placeholderText = document.getElementById("triggerPlaceholderText");
    const statusText = document.getElementById("foodImageUploadStatus");

    if (title) title.textContent = "Edit Food";
    if (nameInput) nameInput.value = name;
    if (descInput) descInput.value = desc;
    if (priceInput) priceInput.value = price;
    if (quantityInput) quantityInput.value = getSafeQuantity(card.dataset.quantity || 1);
    if (categoryInput) categoryInput.value = category;

    if (previewImg && img) {
        previewImg.src = img;
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
    const quantityInput = document.getElementById("lastbiteItemQuantity");
    const categoryInput = document.getElementById("lastbiteItemCategory");
    const saveButton = document.getElementById("saveFoodItemEditButton");

    const name = nameInput ? nameInput.value.trim() : "";
    const desc = descInput ? descInput.value.trim() : "";
    const price = priceInput ? Number(priceInput.value) : NaN;
    const quantity = quantityInput ? parseInt(quantityInput.value, 10) : NaN;

    if (!name) return alert("Please enter a valid Item Name.");
    if (!Number.isFinite(price) || price < 0) return alert("Please enter a valid price.");
    if (!Number.isInteger(quantity) || quantity < 1) return alert("Please enter a valid quantity.");

    const updated = { id, name, desc, price, quantity, category: normalizeFoodCategory(categoryInput?.value), img: currentUploadedImageBase64 || "" };

    try {
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Saving..."; }

        if (window.editingStaticFoodCard && String(id) === "static-card") {
            const card = window.editingStaticFoodCard;
            const imageEl = card.querySelector("img");
            const textEls = card.querySelectorAll(".m-2 h5 + p");

            if (textEls[0]) textEls[0].textContent = name;
            if (textEls[1]) textEls[1].textContent = desc;
            if (textEls[2]) textEls[2].textContent = "Rs. " + price.toFixed(2);
            if (imageEl && currentUploadedImageBase64) imageEl.src = currentUploadedImageBase64;

            card.dataset.category = normalizeFoodCategory(categoryInput.value);
            card.dataset.quantity = String(quantity);

            if (!card.querySelector(".staff-card-quantity")) {
                const quantityHeading = document.createElement("h5");
                quantityHeading.className = "staff-card-quantity";
                quantityHeading.textContent = "Available Quantity";
                const quantityValue = document.createElement("p");
                quantityValue.className = "staff-card-quantity-value";
                quantityValue.textContent = String(quantity);
                const action = card.querySelector(".edit-food-btn, .static-edit-food-btn");
                const content = card.querySelector(".m-2");
                if (content && action) {
                    content.insertBefore(quantityHeading, action);
                    content.insertBefore(quantityValue, action);
                }
            } else {
                const quantityValue = card.querySelector(".staff-card-quantity-value");
                if (quantityValue) quantityValue.textContent = String(quantity);
            }

            if (window.jQuery) window.jQuery("#exampleModal2").modal("hide");
            resetFoodModal();
            window.editingStaticFoodCard = null;
            return;
        }

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

    if (window.editingStaticFoodCard && String(id) === "static-card") {
        if (!confirm("Delete this food item permanently?")) return;
        window.editingStaticFoodCard.remove();
        window.editingStaticFoodCard = null;
        if (window.jQuery) window.jQuery("#exampleModal2").modal("hide");
        resetFoodModal();
        return;
    }

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
    const quantityInput = document.getElementById("lastbiteItemQuantity");
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
    const quantity = quantityInput ? parseInt(quantityInput.value, 10) : NaN;
    if (!Number.isFinite(price) || price < 0) {
        alert("Please enter a valid price.");
        if (priceInput) priceInput.focus();
        return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Please enter a valid quantity.");
        if (quantityInput) quantityInput.focus();
        return;
    }

    const newItem = {
        name: nameInput.value.trim(),
        desc: descInput ? descInput.value.trim() : "Freshly added item.",
        price: price,
        quantity: quantity,
        unit: unit,
        category: normalizeFoodCategory(document.getElementById("lastbiteItemCategory")?.value),
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
        if (quantityInput) quantityInput.value = "1";
        const unitInputAfterSave = document.getElementById("lastbiteItemUnit");
        if (unitInputAfterSave) unitInputAfterSave.value = "servings";
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
    const state = deliveryDashboardState;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

    set("deliveryActiveJobs", state.activeJobs);
    set("deliveryCompletedToday", state.completedToday);
    set("deliveryEarningsToday", "₹" + Number(state.earningsToday || 0).toFixed(0));
    set("deliveryRating", Number(state.rating || 0).toFixed(1));

    const jobs = Array.isArray(state.jobs) ? state.jobs : [];
    set("deliveryJobCount", jobs.length);

    const list = document.getElementById("deliveryAssignedList");
    const empty = document.getElementById("deliveryEmptyState");
    if (!list) return;

    if (!jobs.length) {
        list.innerHTML = "";
        if (empty) empty.style.display = "block";
        renderDeliveryTabContent("assigned");
        return;
    }

    if (empty) empty.style.display = "none";
    list.innerHTML = jobs.map((job, index) => {
        const status = job.status || "Ready for pickup";
        const order = escapeHtml(job.order || ("Order #" + (1001 + index)));
        const customer = escapeHtml(job.customer || "Customer");
        const address = escapeHtml(job.address || "Delivery address pending");
        const amount = Number(job.amount || 0).toFixed(2);
        return `<article class="delivery-job-card">
            <div class="delivery-job-top">
                <div><div class="delivery-job-title">${order}</div><small>${customer}</small></div>
                <span class="delivery-status">${escapeHtml(status)}</span>
            </div>
            <div class="delivery-job-meta">📍 ${address} &nbsp; • &nbsp; ₹${amount}</div>
            <div class="delivery-job-actions">
                <button type="button" class="btn btn-sm btn-primary" onclick="updateDeliveryJob(${index}, 'picked')">Mark Picked Up</button>
                <button type="button" class="btn btn-sm btn-success" onclick="updateDeliveryJob(${index}, 'delivered')">Mark Delivered</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="contactDeliveryCustomer(${index})">Contact</button>
            </div>
        </article>`;
    }).join("");
    renderDeliveryTabContent("assigned");
}

function renderDeliveryTabContent(tab) {
    const content = document.getElementById("deliveryTabContent");
    if (!content) return;
    document.querySelectorAll(".delivery-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.deliveryTab === tab));

    if (tab === "history") {
        const history = Array.isArray(deliveryDashboardState.history) ? deliveryDashboardState.history : [];
        content.innerHTML = history.length
            ? history.map(item => `<div class="delivery-job-card"><strong>${escapeHtml(item.order)}</strong> — ${escapeHtml(item.status || "Delivered")}<div class="delivery-job-meta">${escapeHtml(item.date || "Today")} • ₹${Number(item.amount || 0).toFixed(2)}</div></div>`).join("")
            : "<p class='mb-0'>No completed deliveries yet.</p>";
    } else if (tab === "earnings") {
        content.innerHTML = "<strong>Total today:</strong> ₹" + Number(deliveryDashboardState.earningsToday || 0).toFixed(2) +
            "<br><span>Completed deliveries: " + Number(deliveryDashboardState.completedToday || 0) + "</span>";
    } else {
        content.innerHTML = "<p class='mb-0'>Your current assigned deliveries are shown above.</p>";
    }
}

function showDeliveryTab(tab) {
    renderDeliveryTabContent(tab);
}

window.showDeliveryTab = showDeliveryTab;

function updateDeliveryJob(index, action) {
    const jobs = deliveryDashboardState.jobs || [];
    const job = jobs[index];
    if (!job) return;

    if (action === "picked") {
        job.status = "Out for delivery";
    } else if (action === "delivered") {
        job.status = "Delivered";
        deliveryDashboardState.activeJobs = Math.max(0, deliveryDashboardState.activeJobs - 1);
        deliveryDashboardState.completedToday += 1;
        deliveryDashboardState.earningsToday += Number(job.amount || 0);
        deliveryDashboardState.history = deliveryDashboardState.history || [];
        deliveryDashboardState.history.unshift({
            order: job.order || "Order",
            status: "Delivered",
            amount: job.amount || 0,
            date: new Date().toLocaleString()
        });
        jobs.splice(index, 1);
    }
    renderDeliveryDashboard();
    const availabilityBtn = document.getElementById("deliveryAvailabilityBtn");
    if (availabilityBtn) availabilityBtn.addEventListener("click", toggleDeliveryAvailability);
}

window.updateDeliveryJob = updateDeliveryJob;

function contactDeliveryCustomer(index) {
    const job = (deliveryDashboardState.jobs || [])[index];
    if (!job) return;
    alert("Customer contact: " + (job.customer || "Customer") + "\nPhone number will appear here when order data is connected.");
}

window.contactDeliveryCustomer = contactDeliveryCustomer;

function openDeliveryHelp() {
    alert("AsMr Foods Delivery Support\nPlease contact the operations team for help with an assigned delivery.");
}

window.openDeliveryHelp = openDeliveryHelp;

function deliveryLogout() {
    display("sectionhome");
}

window.deliveryLogout = deliveryLogout;

function toggleDeliveryAvailability() {
    const btn = document.getElementById("deliveryAvailabilityBtn");
    if (!btn) return;
    const online = !btn.classList.contains("is-online");
    btn.classList.toggle("is-online", online);
    btn.classList.toggle("offline", !online);
    btn.textContent = online ? "● Online" : "● Offline";
}

// ==========================================
// 9. INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    switchSection('sectionhome');
    setTimeout(() => filterStaffFoodCategory("food", document.querySelector('.staff-category-btn[data-category="food"]')), 150);
    renderDeliveryDashboard();
    setupImageUploadLogic();
    initLeafletMap();
    loadFoodItemsFromAPI();
    setupStaticFoodQuantityControls();

    document.querySelectorAll(".lastbite-order-unit").forEach((button) => {
        button.addEventListener("click", () => {
            const switchBox = button.closest(".lastbite-order-unit-switch");
            const card = button.closest(".dish-card");
            const input = card?.querySelector(".food-quantity-input");
            const unit = button.dataset.unit;
            switchBox?.querySelectorAll(".lastbite-order-unit").forEach((b) => b.classList.toggle("active", b === button));
            if (input) {
                input.step = unit === "g" ? "1" : "0.001";
                input.min = unit === "g" ? "1" : "0.001";
                input.value = unit === "g" ? String(Math.max(1, Math.round(Number(input.value) || 1))) : String(Math.max(0.001, Number(input.value) || 1));
            }
        });
    });

    document.querySelectorAll(".static-quantity-minus").forEach((button) => {
        button.addEventListener("click", () => {
            const card = button.closest(".dish-card");
            const input = card?.querySelector(".food-quantity-input");
            const active = card?.querySelector(".lastbite-order-unit.active")?.dataset.unit || "kg";
            if (input) input.value = String(Math.max(active === "g" ? 1 : 0.001, Number(input.value || 1) - (active === "g" ? 1 : 0.001)));
        });
    });

    document.querySelectorAll(".static-quantity-plus").forEach((button) => {
        button.addEventListener("click", () => {
            const card = button.closest(".dish-card");
            const input = card?.querySelector(".food-quantity-input");
            const active = card?.querySelector(".lastbite-order-unit.active")?.dataset.unit || "kg";
            if (input) input.value = String(Number(input.value || 1) + (active === "g" ? 1 : 0.001));
        });
    });

    const addConfirmBtn = document.getElementById('addFoodItemConfirmButton') ||
        document.querySelector('#exampleModal2 .modal-footer .btn-primary');
    const signupButton = document.getElementById("signupSubmitButton");
    if (signupButton) signupButton.addEventListener("click", handleSignup);

    const aiPriceButton = document.getElementById("aiPriceSuggestButton");
    if (aiPriceButton) aiPriceButton.addEventListener("click", getAIPriceRecommendation);

    const categoryInput = document.getElementById("lastbiteItemCategory");
    if (categoryInput) {
        categoryInput.addEventListener("change", () => {
            updateQuantityUnitForCategory(categoryInput.value);
            resetAIPriceRecommendation();
        });
    document.querySelectorAll(".lastbite-unit-option").forEach((button) => {
        button.addEventListener("click", () => setQuantityUnit(button.dataset.unit));
    });
    }
    updateQuantityUnitForCategory(categoryInput?.value || "food");

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
        const orderButton = event.target.closest(".order-now-btn");
        if (orderButton) preparePaymentForFoodButton(orderButton);

        const editButton = event.target.closest(".edit-food-btn");
        if (editButton) {
            event.preventDefault();
            openEditFoodItem(editButton.dataset.foodId);
            return;
        }

        const staticEditButton = event.target.closest(".static-edit-food-btn");
        if (staticEditButton) {
            event.preventDefault();
            openStaticFoodCardEditor(staticEditButton);
        }
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