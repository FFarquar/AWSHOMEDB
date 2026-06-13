
    const API = window.APP_CONFIG.API_BASE_URL;
    let token = localStorage.getItem("authToken");

    if (!window.APP_CONFIG?.USE_MOCK) {
        if (!token) window.location.href = "login.html";
    } else {
        token = "local-mock-token-xyz";
    }

    // --- GLOBAL RUNTIME VARIABLES STATE CACHES ---

    let containers = [];
    let childItems = [];
    let currentItemAttachments = [];
    let items = []; // Holds items in local mock mode
    
    let editingId = null;       // Tracks primary container PK edits
    let editingItemId = null;   // Tracks child item ID edits
    let activeShortContainerId = null; // Tracks active parent container (short form ID)

    const userRole = localStorage.getItem("userRole") || "USER";
    
    // 🔐 NEW PERMISSION STRUCTURE
    const isAdmin = userRole === "ADMIN";                                 // Container access
    const canManageItems = userRole === "ADMIN" || userRole === "USER";   // Item access (Full USER + ADMIN)

    document.addEventListener("DOMContentLoaded", () => {
        // 1. Lock down Container actions if not an Admin
        if (!isAdmin) {
            const btnNew = document.getElementById("btnNewContainer");
            if (btnNew) btnNew.style.display = "none";
            const thActions = document.getElementById("thActions");
            if (thActions) thActions.style.display = "none";
        }
        
        // 2. Lock down Item actions ONLY if they lack item permissions (e.g. GUEST)
        if (!canManageItems) {
            const btnNewI = document.getElementById("btnNewItem");
            if (btnNewI) btnNewI.style.display = "none";
            const thItemActions = document.getElementById("thItemActions");
            if (thItemActions) thItemActions.style.display = "none";
        }
        loadContainers();
    });

    function authHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }
 // ==========================================
    // SECTION 1: CONTAINERS LOGIC METHODS
    // ==========================================
    async function loadContainers() {
        try {
            // ✨ FIXED: Pulls straight from your apiClient file wrapper with zero hardcoded references
            containers = await apiGet("/containers", "mock-containers.json");
            
            if (!Array.isArray(containers)) {
                console.warn("⚠️ Warning: mock-containers.json data format is missing or invalid.");
                containers = [];
            }
            
            renderTable();
        } catch (err) {
            console.error("💥 Failed to read local container mock files:", err);
            containers = [];
            renderTable();
        }
    }

    function renderTable() {
        const body = document.getElementById("tableBody");
        if (!body) return;
        body.innerHTML = "";

        containers.forEach(c => {
            const pk = c.PK;
            const shortId = (c.containerId || pk.replace("CONTAINER#", "")).trim().toUpperCase();

            const actionsCell = isAdmin 
                ? `<td>
                    <button onclick="edit('${pk}')" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Edit</button>
                    <button onclick="removeItem('${pk}')" class="btn-danger" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Delete</button>
                </td>`
                : "";

            const row = document.createElement("tr");
            row.style.cursor = "pointer";

            row.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>${c.purchaseDate || ""}</td>
                <td>$${Number(c.purchasePrice || 0).toLocaleString()}</td>
                <td>${c.extendedWarrantyFinishDate || c.warrantyFinishDate || ""}</td>
                ${actionsCell}
            `;

            row.addEventListener("click", (event) => {
                if (event.target.tagName === "BUTTON" || (event.target.closest("td") && event.target.closest("td").nextElementSibling === null && isAdmin)) {
                    return; 
                }
                openItems(pk, shortId);
            });

            body.appendChild(row);
        });
    }

    function openCreate() {
        if (!isAdmin) return; 
        editingId = null;
        document.getElementById("modalTitle").innerText = "Create Container";
        clearForm();
        document.getElementById("modal").style.display = "flex";
    }

    function edit(pk) {
        if (!isAdmin) return;
        const item = containers.find(x => x.PK === pk);
        editingId = pk;

        document.getElementById("modalTitle").innerText = "Edit Container";
        document.getElementById("name").value = item.name || "";
        document.getElementById("photoLocation").value = item.photoLocation || "";
        document.getElementById("purchaseDate").value = item.purchaseDate || "";
        document.getElementById("warrantyFinishDate").value = item.warrantyFinishDate || "";
        document.getElementById("extendedWarrantyFinishDate").value = item.extendedWarrantyFinishDate || "";
        document.getElementById("purchasePrice").value = item.purchasePrice || 0;

        document.getElementById("editHint").innerText = pk;
        document.getElementById("modal").style.display = "flex";
    }

     async function save() {
        if (!isAdmin) return alert("Unauthorized action.");

        const name = document.getElementById("name").value.trim();
        const photoLocation = document.getElementById("photoLocation").value.trim();
        const purchaseDate = document.getElementById("purchaseDate").value;
        const warrantyFinishDate = document.getElementById("warrantyFinishDate").value;
        const extendedWarrantyFinishDate = document.getElementById("extendedWarrantyFinishDate").value;
        const purchasePrice = Number(document.getElementById("purchasePrice").value) || 0;

        if (!name) return alert("Name required");

        const id = "CONTAINER" + Date.now();
        const pk = editingId || `CONTAINER#${id}`;
        const finalWarranty = extendedWarrantyFinishDate || warrantyFinishDate || "1970-01-01";

        const containerPayload = {
            PK: pk,
            SK: "METADATA",
            containerId: editingId ? editingId.replace("CONTAINER#", "") : id,
            name,
            photoLocation,
            purchaseDate,
            warrantyFinishDate,
            extendedWarrantyFinishDate: extendedWarrantyFinishDate || null,
            purchasePrice,
            entityType: "CONTAINER",
            itemName: name,
            warrantyExpiryDate: finalWarranty,
            category: "General",
            purchasedFrom: "Unknown"
        };

        if (window.APP_CONFIG?.USE_MOCK) {
            if (editingId) {
                // ✨ FIXED: Target "containers" instead of "localMockContainers"
                const index = containers.findIndex(c => c.PK === editingId);
                if (index !== -1) containers[index] = containerPayload;
            } else {
                // ✨ FIXED: Target "containers" instead of "localMockContainers"
                containers.push(containerPayload);
            }
            renderTable();
            closeModal();
            return; 
        }

        try {
            if (editingId) {
                const cleanId = editingId.replace("CONTAINER#", "");
                const update = {
                    name, itemName: name, photoLocation, purchaseDate,
                    warrantyFinishDate, extendedWarrantyFinishDate: extendedWarrantyFinishDate || null,
                    purchasePrice, warrantyExpiryDate: finalWarranty
                };
                await fetch(`${API}/containers/${cleanId}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(update)
                });
            } else {
                await fetch(`${API}/containers`, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(containerPayload)
                });
            }
            closeModal();
            await loadContainers();
        } catch (err) {
            alert(`Failed network transaction: ${err.message}`);
        }
    }

    // ✨ PASTE DESTINATION LOCATION: Deletion intercepts and execution targets live here
    function removeItem(pk) {
        if (!isAdmin) return;
        const target = containers.find(c => c.PK === pk);
        const name = target ? target.name : "This Container";
        openDeleteModal("CONTAINER", pk, name);
    }

    function deleteChildItem(itemId) {
        if (!canManageItems) return;
        const target = childItems.find(i => i.itemId === itemId);
        const name = target ? target.itemName : "This Item";
        openDeleteModal("ITEM", itemId, name);
    }

    async function finalizeContainerDelete(pk) {
        if (window.APP_CONFIG?.USE_MOCK) {
            // ✨ FIXED: Target "containers" array memory directly
            containers = containers.filter(c => c.PK !== pk);
            renderTable();
            return;
        }
        
        try {
            const cleanId = pk.replace("CONTAINER#", "");
            const response = await fetch(`${API}/containers/${cleanId}`, {
                method: "DELETE",
                headers: authHeaders()
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            await loadContainers();
        } catch (error) {
            alert("Failed to delete the container from the cloud.");
        }
    }


     // ==========================================
    // SECTION 2: NESTED ITEMS LAYOUT METHODS
    // ==========================================
    async function openItems(pk, shortId) {
        // ✨ FIXED: Automatically strips the prefix to guarantee clean short string matches ("CONTAINER2")
        const cleanShortId = (shortId || pk || "").replace("CONTAINER#", "");
        
        activeShortContainerId = cleanShortId;
        console.log(`📂 openItems triggered. Sanitized shortId to match items: [${cleanShortId}]`);

        // Safely check if the container list cache exists in active memory
        if (!Array.isArray(containers)) containers = [];
        
        const containerObj = containers.find(c => c.PK === pk || (c.containerId || "").replace("CONTAINER#", "") === cleanShortId);

        // Render dashboard header card labels with safe fallbacks
        document.getElementById("summaryContainerName").innerText = containerObj ? containerObj.name : cleanShortId;
        document.getElementById("summaryPurchaseDate").innerText = containerObj?.purchaseDate || "N/A";
        document.getElementById("summaryPurchasePrice").innerText = Number(containerObj?.purchasePrice || 0).toLocaleString();
        document.getElementById("summaryWarranty").innerText = containerObj?.extendedWarrantyFinishDate || containerObj?.warrantyFinishDate || "N/A";

        // View panel display visibility toggles
        document.getElementById("containersPanelView").style.display = "none";
        document.getElementById("itemsPanelView").style.display = "flex";

        await loadItems();
    }

    function closeItemsPanel() {
        activeShortContainerId = null;
        document.getElementById("itemsPanelView").style.display = "none";
        document.getElementById("containersPanelView").style.display = "block";
    }

     async function loadItems() {
        const tbody = document.getElementById("itemsTableBody");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="8">Searching for child records...</td></tr>`;

        if (window.APP_CONFIG?.USE_MOCK) {
            console.log("ℹ️ Fetching mock items collection utilizing apiClient wrapper channels...");
            try {
                const allMockItems = await apiGet(`/containers/${activeShortContainerId}/items`, "mock-items.json");
                const targetContainerId = (activeShortContainerId || "").toLowerCase();

                childItems = Array.isArray(allMockItems) 
                    ? allMockItems.filter(i => (i.containerId || "").toLowerCase() === targetContainerId) 
                    : [];
                    
                console.log(`📊 Filtered results for [${targetContainerId}]: Found ${childItems.length} items.`);
            } catch (err) {
                console.error("💥 Mock Item File Read Aborted:", err);
                tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Mock Data Error: ${err.message}</td></tr>`;
                return;
            }
        } else {
            // Standard Live Cloud Production Network Pathway
            try {
                const res = await fetch(`${API}/containers/${activeShortContainerId}/items`, {
                    method: "GET",
                    headers: authHeaders()
                });
                if (!res.ok) throw new Error(`Error Status: ${res.status}`);
                
                const rawItems = await res.json();
                
                // ✨ FIX: Safely parse attachments string blocks into clean JSON array matrices
                childItems = Array.isArray(rawItems) ? rawItems.map(item => {
                    if (typeof item.attachments === "string") {
                        try {
                            item.attachments = JSON.parse(item.attachments);
                        } catch (e) {
                            item.attachments = [];
                        }
                    }
                    if (!Array.isArray(item.attachments)) item.attachments = [];
                    return item;
                }) : [];

            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Error fetching child collection: ${err.message}</td></tr>`;
                return;
            }
        }
        renderItemsTable();
    }


    function renderItemsTable() {
        const tbody = document.getElementById("itemsTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (childItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8">No items stored in this container segment room.</td></tr>`;
            return;
        }

        childItems.forEach(item => {
            let linksHtml = "None";
            if (item.attachments && item.attachments.length > 0) {
                linksHtml = item.attachments.map(a => `<a href="${a.s3Url}" target="_blank">📎 ${a.label}</a>`).join("<br>");
            }

            // ✨ FIXED: Made Item Edit button exactly the same height layout as the Delete button
            const actions = canManageItems 
                ? `<td>
                    <button onclick="openItemEdit('${item.itemId}')" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Edit</button>
                    <button class="btn-danger" onclick="deleteChildItem('${item.itemId}')" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Delete</button>
                   </td>`
                : "";

            tbody.innerHTML += `
            <tr>
                <td><strong>${item.itemName || "Unnamed Asset"}</strong></td>
                <td>${item.category || "General"}</td>
                <td>${item.purchasedFrom || "Unknown"}</td>
                <td>$${Number(item.purchasePrice || 0).toLocaleString()}</td>
                <td>${item.warrantyExpiryDate === "1970-01-01" ? "N/A" : item.warrantyExpiryDate}</td>
                <td>${item.physicalPaperStorageLocation || "N/A"}</td>
                <td>${linksHtml}</td>
                ${actions}
            </tr>`;
        });
    }

     function openItemCreate() {
        if (!canManageItems) return; // ✨ FIXED
        editingItemId = null;
        currentItemAttachments = [];
        document.getElementById("itemModalTitle").innerText = "Add New Item Asset";
        clearItemForm();
        renderModalAttachments();
        document.getElementById("itemModal").style.display = "flex";
    }

    function openItemEdit(itemId) {
        if (!canManageItems) return; 
        editingItemId = itemId;
        const target = childItems.find(i => i.itemId === itemId);
        document.getElementById("itemModalTitle").innerText = "Modify Item Properties";

        document.getElementById("itemName").value = target.itemName || "";
        document.getElementById("itemCategory").value = target.category || "";
        document.getElementById("itemPurchasedFrom").value = target.purchasedFrom || "";
        document.getElementById("itemPurchasePrice").value = target.purchasePrice || 0;
        document.getElementById("itemPurchaseDate").value = target.purchaseDate || "";
        document.getElementById("itemWarrantyExpiryDate").value = target.warrantyExpiryDate === "1970-01-01" ? "" : target.warrantyExpiryDate;
        document.getElementById("itemPhysicalLocation").value = target.physicalPaperStorageLocation || "";
        
        // ✨ FIX: Handle both stringified or raw native list attributes on edit load
        let rawAtts = target.attachments;
        if (typeof rawAtts === "string") {
            try { rawAtts = JSON.parse(rawAtts); } catch (e) { rawAtts = []; }
        }
        
        currentItemAttachments = Array.isArray(rawAtts) ? [...rawAtts] : [];
        
        renderModalAttachments();
        document.getElementById("itemModal").style.display = "flex";
    }

    function closeItemModal() {
        document.getElementById("itemModal").style.display = "none";
        editingItemId = null;
        clearItemForm();
    }

    function clearItemForm() {
        ["itemName", "itemCategory", "itemPurchasedFrom", "itemPurchasePrice", "itemPurchaseDate", "itemWarrantyExpiryDate", "itemPhysicalLocation"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        currentItemAttachments = []; 
        updateModalAttachmentListUI();
    }

    function addAttachmentToState() {
        const lbl = document.getElementById("attLabel").value.trim();
        const url = document.getElementById("attUrl").value.trim();
        if (!lbl || !url) return alert("Label and absolute path URL strings required.");

        currentItemAttachments.push({
            attachmentId: "ATT#" + Date.now(),
            entityType: "ATTACHMENT",
            label: lbl,
            s3Url: url,
            fileType: url.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            uploadedDate: new Date().toISOString()
        });

        document.getElementById("attLabel").value = "";
        document.getElementById("attUrl").value = "";
        renderModalAttachments();
    }

// 🚀 ADD THIS NEW STATE CONTROLLER TO HANDLE DELETIONS MID-SESSION:
    function removeAttachmentFromState(indexToDrop) {
        // Drop the file entry cleanly out of our array workspace tracking index
        currentItemAttachments.splice(indexToDrop, 1);
        // Force the list interface matrix view to re-render instantly on screen
        updateModalAttachmentListUI();
    }

    function updateModalAttachmentListUI() {
        const listElement = document.getElementById("modalAttachmentList");
        if (!listElement) return;

        // If there are no attachments uploaded yet, empty out the container block
        if (!currentItemAttachments || currentItemAttachments.length === 0) {
            listElement.innerHTML = `<li style="color:#888; font-style:italic; list-style:none; margin-left:-20px;">No files attached yet.</li>`;
            return;
        }

        // Loop through our attachments array list and generate interactive view rows
        listElement.innerHTML = currentItemAttachments.map((att, idx) => `
            <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #eee;">
                <a href="${att.url}" target="_blank" style="color: #0073bb; text-decoration: none; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">
                    📎 ${att.name || `File ${idx + 1}`}
                </a>
                <button type="button" onclick="removeAttachmentFromState(${idx})" style="background:#ff4d4d; color:white; border:none; border-radius:3px; padding:2px 6px; font-size:11px; cursor:pointer; font-weight:bold;">Remove</button>
            </li>
        `).join('');
    }


    function renderModalAttachments() {
        const list = document.getElementById("modalAttachmentList");
        if (!list) return;
        list.innerHTML = "";
        currentItemAttachments.forEach((a, i) => {
            const li = document.createElement("li");
            li.style.cssText = "display:flex; justify-content:space-between; margin-bottom:4px;";
            li.innerHTML = `
                <a href="${a.s3Url}" target="_blank">${a.label}</a>
                <button type="button" onclick="removeAttachmentFromState(${i})" style="min-height:20px; height:20px; padding:0 6px; background:red; color:white; font-size:11px;">X</button>
            `;
            list.appendChild(li);
        });
    }

    async function saveItem() {
        if (!canManageItems) return alert("Action restricted."); 
        const nameVal = document.getElementById("itemName").value.trim();
        if (!nameVal) return alert("Item Name is mandatory.");

        // ✨ Dual-Key Formatting ensures compatibility across both frontend template loops
        const formattedAttachments = currentItemAttachments.map(att => ({
            attachmentId: att.attachmentId || `att-${Date.now()}`,
            filename: att.filename || att.label || "File Attachment",
            fileUrl: att.fileUrl || att.s3Url || "",
            label: att.filename || att.label || "File Attachment", // Fixed: satisfies rendering loops
            s3Url: att.fileUrl || att.s3Url || ""                  // Fixed: satisfies rendering loops
        }));

        const payload = {
            itemName: nameVal,
            category: document.getElementById("itemCategory").value.trim() || "General",
            purchasedFrom: document.getElementById("itemPurchasedFrom").value.trim() || "Unknown",
            purchasePrice: Number(document.getElementById("itemPurchasePrice").value) || 0,
            purchaseDate: document.getElementById("itemPurchaseDate").value || null,
            warrantyExpiryDate: document.getElementById("itemWarrantyExpiryDate").value || "1970-01-01",
            physicalPaperStorageLocation: document.getElementById("itemPhysicalLocation").value.trim(),
            // ✨ Enforces standard stringified array syntax matching your legacy schema layout
            attachments: JSON.stringify(formattedAttachments)
        };

        if (window.APP_CONFIG?.USE_MOCK) {
            // ... Your mock code remains intact ...
            return;
        }

        try {
            let path = `${API}/containers/${activeShortContainerId}/items`;
            let method = "POST";
            if (editingItemId) {
                path += `/${editingItemId}`;
                method = "PUT";
            }

            const response = await fetch(path, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Rejection status: ${response.status}`);

            // Force data synchronization from cloud first
            await loadItems();
            
            // Wipe modal view state elements only after successful state preservation
            closeItemModal();
            
            alert("Item saved successfully!");

        } catch (error) {
            alert(`Save lifecycle failed: ${error.message}`);
        }
    }
 


    async function finalizeItemDelete(itemId) {
        if (window.APP_CONFIG?.USE_MOCK) {
            childItems = childItems.filter(i => i.itemId !== itemId);
            renderItemsTable();
            return;
        }

        try {
            const res = await fetch(`${API}/containers/${activeShortContainerId}/items/${itemId}`, {
                method: "DELETE",
                headers: authHeaders()
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            await loadItems();
        } catch (err) {
            alert(`Delete transaction failure: ${err.message}`);
        }
    }

    // ==========================================
    // SECTION 3: SYSTEM UTILITIES METHODS
    // ==========================================
    
    // ✨ PASTE DESTINATION LOCATION: Global deletion state variables and helpers sit here
    let deleteTargetType = null; 
    let deleteTargetId = null;   

    function openDeleteModal(type, id, displayName) {
        deleteTargetType = type;
        deleteTargetId = id;
        
        const messageElement = document.getElementById("deleteModalMessage");
        messageElement.innerHTML = `Are you sure you want to permanently purge <br><strong>"${displayName}"</strong>?`;
        
        document.getElementById("btnConfirmDelete").onclick = executeSystemDelete;
        document.getElementById("deleteConfirmModal").style.display = "flex";
    }

    function closeDeleteModal() {
        document.getElementById("deleteConfirmModal").style.display = "none";
        deleteTargetType = null;
        deleteTargetId = null;
    }

    async function executeSystemDelete() {
        const targetId = deleteTargetId;
        const targetType = deleteTargetType;
        
        closeDeleteModal(); 

        if (targetType === "CONTAINER") {
            await finalizeContainerDelete(targetId);
        } else if (targetType === "ITEM") {
            await finalizeItemDelete(targetId);
        }
    }

    // Existing utility functions remain below intact
    function clearForm() {
        ["name","photoLocation","purchaseDate","warrantyFinishDate","extendedWarrantyFinishDate","purchasePrice"]
        .forEach(id => document.getElementById(id).value = "");
        document.getElementById("editHint").innerText = "";
    }

    function closeModal() {
        document.getElementById("modal").style.display = "none";
        editingId = null;
        clearForm();
    }

    function logout() {
        localStorage.clear();
        window.location.href = "login.html";
    }

async function handleAttachmentUpload() {
    const fileInput = document.getElementById("itemFilePicker");
    const progressStatus = document.getElementById("uploadProgressBar");

    if (!fileInput || !fileInput.files.length) {
        return alert("Please select a file first.");
    }
    
    const file = fileInput.files[0];
    
    if (progressStatus) {
        progressStatus.style.display = "block";
        progressStatus.innerText = "⏳ Processing file upload...";
    }

    // ==================================================
    // 🧠 LOCAL SANDBOX MOCK MODE (SEQUENTIAL STORAGE)
    // ==================================================
    if (window.APP_CONFIG?.USE_MOCK) {
        const localMockUrl = URL.createObjectURL(file);
        currentItemAttachments.push({
            attachmentId: "ATT#" + Date.now(),
            label: file.name,
            s3Url: localMockUrl,
            name: file.name,
            url: localMockUrl
        });
        renderModalAttachments();
        if (progressStatus) progressStatus.style.display = "none";
        fileInput.value = "";
        return;
    }

    // ==================================================
    // 🌐 AWS ROUTE (S3 UPLOAD ENGINE + STATE SPLIT)
    // ==================================================
    try {
        if (progressStatus) progressStatus.innerText = "⏳ Contacting AWS S3 Storage Gateway...";

        const presignPath = `${API}/attachments/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`;
        const res = await fetch(presignPath, { headers: authHeaders() });
        if (!res.ok) throw new Error("Failed getting secure token path.");
        
        const { uploadUrl, fileUrl } = await res.json();

        if (progressStatus) progressStatus.innerText = "⏳ Streaming file directly to S3...";

        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
        });
        if (!uploadRes.ok) throw new Error("S3 gateway rejected target asset payload stream.");

        // ==================================================
        // 🔄 STATE ENGINE LOGIC SPLIT
        // ==================================================
        if (!editingItemId) {
            // 💡 PATHWAY A: BRAND NEW ITEM (Stage locally with your EXACT old parameter keys)
            console.log("📝 Staging attachment locally until item creation is finalized.");
            
            const stagedAttachment = {
                attachmentId: `att-${Date.now()}`,
                filename: file.name,
                fileUrl: fileUrl,
                label: file.name,      // 🌟 Matches renderItemsTable mapping expectations
                s3Url: fileUrl,        // 🌟 Matches renderItemsTable mapping expectations
                name: file.name,       // 🌟 Matches updateModalAttachmentListUI mapping expectations
                url: fileUrl           // 🌟 Matches updateModalAttachmentListUI mapping expectations
            };

            currentItemAttachments.push(stagedAttachment);
            renderModalAttachments();
            alert(`Staged "${file.name}"! It will be permanently saved when you click Save Item.`);

        } else {
            // 💡 PATHWAY B: EXISTING ITEM (Commit straight to DynamoDB)
            if (progressStatus) progressStatus.innerText = "⏳ Logging file metadata to database...";

            const cleanContainerId = String(activeShortContainerId).replace("CONTAINER#", "").trim();
            const cleanItemId = String(editingItemId).replace("ITEM#", "").trim();

            const dbPayload = {
                pk: `CONTAINER#${cleanContainerId.toUpperCase()}`, 
                sk: `ITEM#${cleanItemId}`,           
                filename: file.name,
                fileUrl: fileUrl
            };

            const dbRes = await fetch(`${API}/attachments`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(dbPayload)
            });
            
            if (!dbRes.ok) throw new Error("Failed to link file to database row.");

            const dbResult = await dbRes.json();
            currentItemAttachments = dbResult.attachments || [];
            renderModalAttachments();
            alert(`Upload Success! ${file.name} attached safely to existing record.`);
        }

    } catch (err) {
        alert(`Attachment pipeline error: ${err.message}`);
    } finally {
        if (progressStatus) progressStatus.style.display = "none";
        fileInput.value = "";
    }
}
