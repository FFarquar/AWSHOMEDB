
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

    let currentItemNotes = [];     // Notes collection for the currently open item
    let editingNoteId = null;      // noteId of the note being edited (null = adding new)
    let currentNoteAttachments = []; // Attachments staged for the note form

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
        }

        // 3. Display build version in header
        fetch("version.json")
            .then(r => r.json())
            .then(v => {
                const badge = document.getElementById("versionBadge");
                if (badge && v.build) badge.textContent = `build #${v.build}`;
            })
            .catch(() => {});

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
                ? `<td class="td-actions">
                    <button onclick="edit('${pk}')" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Edit</button>
                    <button onclick="removeItem('${pk}')" class="btn-danger" style="min-height:30px; height:30px; padding:2px 12px; font-size:13px; line-height:1;">Delete</button>
                </td>`
                : "";

            const row = document.createElement("tr");
            row.style.cursor = "pointer";

            row.innerHTML = `
                <td class="td-name"><strong>${c.name}</strong></td>
                <td data-label="Purchased">${c.purchaseDate || ""}</td>
                <td data-label="Price">$${Number(c.purchasePrice || 0).toLocaleString()}</td>
                <td data-label="Warranty">${c.extendedWarrantyFinishDate || c.warrantyFinishDate || ""}</td>
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

    function deleteCurrentItem() {
        if (!editingItemId || !canManageItems) return;
        deleteChildItem(editingItemId);
    }

    async function finalizeContainerDelete(pk) {
        if (window.APP_CONFIG?.USE_MOCK) {
            // ✨ FIXED: Target "containers" array memory directly
            containers = containers.filter(c => c.PK !== pk);
            renderTable();
            showSuccessToast("Container deleted successfully.");
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
            showSuccessToast("Container deleted successfully.");
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
        document.getElementById("itemsTableTitle").innerText = "Items for " + (containerObj ? containerObj.name : cleanShortId);

        
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
        tbody.innerHTML = `<tr><td colspan="6">Searching for child records...</td></tr>`;

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
                
                // ✨ FIX: Map and normalise structural variations coming back from DynamoDB
                childItems = Array.isArray(rawItems) ? rawItems.map(item => {
                    // Check both legacy attachments column and your explicit itemAttachments schema property
                    let rawAtts = item.itemAttachments || item.attachments;
                    
                    if (typeof rawAtts === "string" && rawAtts.trim() !== "") {
                        try {
                            rawAtts = JSON.parse(rawAtts);
                        } catch (e) {
                            rawAtts = [];
                        }
                    }
                    
                    // Normalise every entry to have unified keys to satisfy your frontend HTML loops perfectly
                    item.attachments = Array.isArray(rawAtts) ? rawAtts.map(a => ({
                        ...a,
                        label: a.filename || a.label || "File Attachment",
                        s3Url: a.fileUrl || a.s3Url || ""
                    })) : [];
                    
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
            tbody.innerHTML = `<tr><td colspan="6">No items stored in this container segment room.</td></tr>`;
            return;
        }

        childItems.forEach(item => {
            const attCount = Array.isArray(item.attachments) ? item.attachments.length : 0;

            const row = document.createElement("tr");
            row.style.cursor = canManageItems ? "pointer" : "default";
            row.innerHTML = `
                <td class="td-name"><strong>${item.itemName || "Unnamed Asset"}</strong></td>
                <td data-label="Purchased">${item.purchaseDate || "N/A"}</td>
                <td data-label="Price">$${Number(item.purchasePrice || 0).toLocaleString()}</td>
                <td data-label="Warranty">${item.warrantyExpiryDate === "1970-01-01" ? "N/A" : (item.warrantyExpiryDate || "N/A")}</td>
                <td data-label="Notes" data-note-count="${item.itemId}">...</td>
                <td data-label="Attachments">${attCount}</td>
            `;

            if (canManageItems) {
                row.addEventListener("click", () => openItemEdit(item.itemId));
            }

            tbody.appendChild(row);
        });

        loadNoteCountsAsync();
    }

    async function loadNoteCountsAsync() {
        await Promise.all(childItems.map(async item => {
            const cell = document.querySelector(`td[data-note-count="${item.itemId}"]`);
            if (!cell) return;
            try {
                let count = 0;
                if (window.APP_CONFIG?.USE_MOCK) {
                    const allNotes = await apiGet(
                        `/containers/${activeShortContainerId}/items/${item.itemId}/notes`,
                        "mock-notes.json"
                    );
                    count = Array.isArray(allNotes)
                        ? allNotes.filter(n => n.containerId === activeShortContainerId && n.itemId === item.itemId).length
                        : 0;
                } else {
                    const res = await fetch(
                        `${API}/containers/${activeShortContainerId}/items/${item.itemId}/notes`,
                        { method: "GET", headers: authHeaders() }
                    );
                    if (res.ok) {
                        const notes = await res.json();
                        count = Array.isArray(notes) ? notes.length : 0;
                    }
                }
                cell.textContent = count;
            } catch {
                cell.textContent = "-";
            }
        }));
    }

     function openItemCreate() {
        if (!canManageItems) return;
        editingItemId = null;
        currentItemAttachments = [];
        document.getElementById("itemModalTitle").innerText = "Add New Item Asset";
        clearItemForm();
        renderModalAttachments();
        document.getElementById("notesSection").style.display = "none";
        const btnDelete = document.getElementById("btnDeleteItem");
        if (btnDelete) btnDelete.style.display = "none";
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

        // Show notes section and load existing notes for this item
        currentItemNotes = [];
        editingNoteId = null;
        currentNoteAttachments = [];
        document.getElementById("notesSection").style.display = "block";
        document.getElementById("noteForm").style.display = "none";
        const btnDelete = document.getElementById("btnDeleteItem");
        if (btnDelete) btnDelete.style.display = canManageItems ? "inline-block" : "none";
        loadNotes();

        document.getElementById("itemModal").style.display = "flex";
    }

    function closeItemModal() {
        document.getElementById("itemModal").style.display = "none";
        editingItemId = null;
        currentItemNotes = [];
        editingNoteId = null;
        currentNoteAttachments = [];
        document.getElementById("noteForm").style.display = "none";
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

        // Clean file properties structure ensuring compatibility across both modal variations
        const cleanedAttachments = currentItemAttachments.map(att => ({
            attachmentId: att.attachmentId || `att-${Date.now()}`,
            filename: att.filename || att.label || "File Attachment",
            fileUrl: att.fileUrl || att.s3Url || "",
            label: att.filename || att.label || "File Attachment", 
            s3Url: att.fileUrl || att.s3Url || ""                  
        }));

        // ✨ The Fix: Payload variable strings mapped exactly to match items-create backend properties
        const payload = {
            itemName: nameVal,
            itemCategory: document.getElementById("itemCategory").value.trim() || "General",
            itempurchasedFrom: document.getElementById("itemPurchasedFrom").value.trim() || "Unknown",
            itempurchasePrice: Number(document.getElementById("itemPurchasePrice").value) || 0,
            itempurchaseDate: document.getElementById("itemPurchaseDate").value || null,
            itemwarrantyPeriod: document.getElementById("itemWarrantyExpiryDate").value || "1970-01-01",
            itemphysicalPaperStorageLocation: document.getElementById("itemPhysicalLocation").value.trim(),
            // 🌟 Crucial Alignment Fix: Matches body.itemAttachments exactly
            itemAttachments: cleanedAttachments 
        };

        if (window.APP_CONFIG?.USE_MOCK) {
            if (editingItemId) {
                const idx = childItems.findIndex(i => i.itemId === editingItemId && i.containerId === activeShortContainerId);
                if (idx !== -1) Object.assign(childItems[idx], payload);
            } else {
                const generatedId = "ITEM" + Date.now();
                childItems.push({
                    PK: `CONTAINER#${activeShortContainerId}`,
                    SK: `ITEM#${generatedId}`,
                    entityType: "ITEM",
                    containerId: activeShortContainerId,
                    itemId: generatedId,
                    createdDate: new Date().toISOString().split('T'),
                    ...payload
                });
            }
            closeItemModal();
            showSuccessToast('Item saved successfully to the local mock!');
            renderItemsTable();
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

            // Fetch the updated dataset completely from AWS
            await loadItems();
            
            // Close the form modal safely
            closeItemModal();
            
            // alert("Item saved successfully to the database!");
            showSuccessToast('Item saved successfully to the database!');

        } catch (error) {
            alert(`Save lifecycle failed: ${error.message}`);
        }
    }




    async function finalizeItemDelete(itemId) {
        if (window.APP_CONFIG?.USE_MOCK) {
            childItems = childItems.filter(i => i.itemId !== itemId);
            renderItemsTable();
            showSuccessToast("Item and related data deleted.");
            return;
        }

        try {
            // Cascade: delete all related notes first
            try {
                const notesRes = await fetch(
                    `${API}/containers/${activeShortContainerId}/items/${itemId}/notes`,
                    { method: "GET", headers: authHeaders() }
                );
                if (notesRes.ok) {
                    const notes = await notesRes.json();
                    if (Array.isArray(notes)) {
                        await Promise.all(notes.map(note =>
                            fetch(`${API}/containers/${activeShortContainerId}/items/${itemId}/notes/${note.noteId}`, {
                                method: "DELETE",
                                headers: authHeaders()
                            })
                        ));
                    }
                }
            } catch (noteErr) {
                console.warn("Could not cascade delete notes:", noteErr);
            }

            const res = await fetch(`${API}/containers/${activeShortContainerId}/items/${itemId}`, {
                method: "DELETE",
                headers: authHeaders()
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            await loadItems();
            showSuccessToast("Item and related data deleted successfully.");
        } catch (err) {
            alert(`Delete transaction failure: ${err.message}`);
        }
    }

    // ==========================================
    // SECTION 3: SYSTEM UTILITIES METHODS
    // ==========================================

    async function confirmDownload(event, url, label) {
        event.preventDefault();
        if (!confirm(`Download "${label}"?`)) return;

        let downloadUrl = url;

        if (!window.APP_CONFIG?.USE_MOCK && url.includes('.amazonaws.com/')) {
            try {
                const s3Key = new URL(url).pathname.slice(1);
                const res = await fetch(`${API}/attachments/download?key=${encodeURIComponent(s3Key)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
                ({ downloadUrl } = await res.json());
            } catch (err) {
                alert(`Could not prepare download: ${err.message}`);
                return;
            }
        }

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = label;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ✨ PASTE DESTINATION LOCATION: Global deletion state variables and helpers sit here
    let deleteTargetType = null; 
    let deleteTargetId = null;   

    function openDeleteModal(type, id, displayName) {
        deleteTargetType = type;
        deleteTargetId = id;

        const messageElement = document.getElementById("deleteModalMessage");
        const cascade = type === "ITEM"
            ? `<br><small style="color:#888;">All related notes and attachments will also be deleted.</small>`
            : "";
        messageElement.innerHTML = `Are you sure you want to permanently purge <br><strong>"${displayName}"</strong>?${cascade}`;

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
            closeItemModal();
            await finalizeItemDelete(targetId);
        } else if (targetType === "NOTE") {
            await finalizeNoteDelete(targetId);
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

// Add this helper function somewhere in your script
function showSuccessToast(message) {
    // Create toast container
    const toast = document.createElement("div");
    
    // Style the toast (can also be done via CSS class)
    Object.assign(toast.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#e6f4ea",
        color: "#137333",
        border: "1px solid #137333",
        padding: "12px 20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: "9999",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "sans-serif",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        opacity: "0",
        transform: "translateY(20px)"
    });

    // Green tick + Text
    toast.innerHTML = `<span>✅</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    // Trigger slide up and fade in
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 10);

    // Fade out after 2 seconds, then remove from DOM
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 500); // Wait for transition to finish
    }, 2000);
}

async function handleAttachmentUpload() {
    const fileInput = document.getElementById("itemFilePicker");
    const progressStatus = document.getElementById("uploadProgressBar");

    if (!fileInput || !fileInput.files.length) {
        return alert("Please select a file first."); // Kept as alert since it blocks an error state
    }
    
    const file = fileInput.files[0];
    
    if (progressStatus) {
        progressStatus.style.display = "block";
        progressStatus.innerText = "⏳ Processing file upload...";
    }

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
        
        // 🔄 REPLACED ALERT IN MOCK MODE
        showSuccessToast(`Staged local mock for "${file.name}"`);
        return;
    }

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

        if (!editingItemId) {
            // 💡 PATHWAY A: BRAND NEW ITEM 
            console.log("📝 Staging attachment locally until item creation is finalized.");
            
            const stagedAttachment = {
                attachmentId: `att-${Date.now()}`,
                filename: file.name,
                fileUrl: fileUrl,
                label: file.name,      
                s3Url: fileUrl,        
                name: file.name,       
                url: fileUrl           
            };

            currentItemAttachments.push(stagedAttachment);
            renderModalAttachments();
            
            // 🔄 REPLACED ALERT
            showSuccessToast(`Staged "${file.name}"! Will save with item.`);

        } else {
            // 💡 PATHWAY B: EXISTING ITEM 
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
            const rawAttachments = dbResult.attachments || [];

            currentItemAttachments = rawAttachments.map(att => ({
                ...att,
                label: att.filename || att.label,
                s3Url: att.fileUrl || att.s3Url
            }));

            renderModalAttachments();
            
            // 🔄 REPLACED ALERT
            showSuccessToast(`Uploaded ${file.name} successfully!`);
        }

    } catch (err) {
        alert(`Attachment pipeline error: ${err.message}`); // Left intact to catch critical failures
    } finally {
        if (progressStatus) progressStatus.style.display = "none";
        fileInput.value = "";
    }
}

// ==========================================
// SECTION 4: NOTES LOGIC METHODS
// ==========================================

async function loadNotes() {
    if (!editingItemId || !activeShortContainerId) return;

    if (window.APP_CONFIG?.USE_MOCK) {
        try {
            const allNotes = await apiGet(
                `/containers/${activeShortContainerId}/items/${editingItemId}/notes`,
                "mock-notes.json"
            );
            currentItemNotes = Array.isArray(allNotes)
                ? allNotes.filter(n => n.containerId === activeShortContainerId && n.itemId === editingItemId)
                : [];
        } catch (err) {
            console.error("💥 Mock Notes Read Error:", err);
            currentItemNotes = [];
        }
    } else {
        try {
            const res = await fetch(`${API}/containers/${activeShortContainerId}/items/${editingItemId}/notes`, {
                method: "GET",
                headers: authHeaders()
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            currentItemNotes = Array.isArray(data) ? data.map(n => ({
                ...n,
                attachments: Array.isArray(n.attachments) ? n.attachments.map(a => ({
                    ...a,
                    label: a.filename || a.label || "File",
                    s3Url: a.fileUrl || a.s3Url || ""
                })) : []
            })) : [];
        } catch (err) {
            console.error("💥 Failed to load notes:", err);
            currentItemNotes = [];
        }
    }
    renderNotesSection();
}

function renderNotesSection() {
    const list = document.getElementById("notesList");
    if (!list) return;

    if (currentItemNotes.length === 0) {
        list.innerHTML = `<p style="color:#888; font-style:italic; font-size:13px; margin:0 0 6px 0;">No notes recorded yet.</p>`;
        return;
    }

    list.innerHTML = currentItemNotes.map(note => {
        const attachLinks = note.attachments && note.attachments.length > 0
            ? note.attachments.map(a =>
                `<a href="#" class="note-att-link" onclick="confirmDownload(event, '${(a.s3Url || "").replace(/'/g, "\\'")}', '${(a.label || "attachment").replace(/'/g, "\\'")}'); return false;">📎 ${a.label}</a>`
              ).join("")
            : "";

        return `
            <div class="note-card" onclick="openEditNote('${note.noteId}')">
                <div class="note-date">${note.date || "No date"}</div>
                <div class="note-desc">${note.description || ""}</div>
                ${attachLinks ? `<div class="note-links">${attachLinks}</div>` : ""}
            </div>`;
    }).join("");
}

function openAddNote() {
    editingNoteId = null;
    currentNoteAttachments = [];
    document.getElementById("noteFormTitle").innerText = "Add Note";
    document.getElementById("noteDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("noteDescription").value = "";
    renderNoteAttachmentList();
    const btnDel = document.getElementById("btnDeleteNoteInForm");
    if (btnDel) btnDel.style.display = "none";
    document.getElementById("noteForm").style.display = "block";
}

function openEditNote(noteId) {
    const note = currentItemNotes.find(n => n.noteId === noteId);
    if (!note) return;

    editingNoteId = noteId;
    currentNoteAttachments = Array.isArray(note.attachments) ? [...note.attachments] : [];

    document.getElementById("noteFormTitle").innerText = "Edit Note";
    document.getElementById("noteDate").value = note.date || "";
    document.getElementById("noteDescription").value = note.description || "";
    renderNoteAttachmentList();
    const btnDel = document.getElementById("btnDeleteNoteInForm");
    if (btnDel) btnDel.style.display = "inline-block";
    document.getElementById("noteForm").style.display = "block";
}

function closeNoteForm() {
    document.getElementById("noteForm").style.display = "none";
    editingNoteId = null;
    currentNoteAttachments = [];
}

function deleteNoteFromForm() {
    if (!editingNoteId) return;
    const noteIdToDelete = editingNoteId;
    closeNoteForm();
    confirmDeleteNote(noteIdToDelete);
}

function renderNoteAttachmentList() {
    const list = document.getElementById("noteAttachmentList");
    if (!list) return;

    if (!currentNoteAttachments || currentNoteAttachments.length === 0) {
        list.innerHTML = `<li style="color:#888; font-style:italic; list-style:none; margin-left:-20px; font-size:12px;">No files attached.</li>`;
        return;
    }

    list.innerHTML = currentNoteAttachments.map((att, idx) => `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; background:#fff; padding:3px 6px; border-radius:3px; border:1px solid #eee;">
            <span style="font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:72%;">📎 ${att.filename || att.label || `File ${idx + 1}`}</span>
            <button type="button" onclick="removeNoteAttachmentFromState(${idx})" style="background:#ff4d4d; color:white; border:none; border-radius:3px; padding:1px 5px; font-size:11px; cursor:pointer; font-weight:bold;">X</button>
        </li>
    `).join("");
}

function removeNoteAttachmentFromState(idx) {
    currentNoteAttachments.splice(idx, 1);
    renderNoteAttachmentList();
}

async function handleNoteAttachmentUpload() {
    const fileInput = document.getElementById("noteFilePicker");
    const progressStatus = document.getElementById("noteUploadProgress");

    if (!fileInput || !fileInput.files.length) {
        return alert("Please select a file first.");
    }

    const file = fileInput.files[0];
    if (progressStatus) { progressStatus.style.display = "block"; progressStatus.innerText = "⏳ Processing..."; }

    if (window.APP_CONFIG?.USE_MOCK) {
        const localUrl = URL.createObjectURL(file);
        currentNoteAttachments.push({
            attachmentId: "ATT#" + Date.now(),
            filename: file.name,
            fileUrl: localUrl,
            label: file.name,
            s3Url: localUrl
        });
        renderNoteAttachmentList();
        if (progressStatus) progressStatus.style.display = "none";
        fileInput.value = "";
        showSuccessToast(`Staged "${file.name}" for note.`);
        return;
    }

    try {
        if (progressStatus) progressStatus.innerText = "⏳ Contacting AWS S3 Storage Gateway...";
        const presignPath = `${API}/attachments/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`;
        const res = await fetch(presignPath, { headers: authHeaders() });
        if (!res.ok) throw new Error("Failed to get presigned URL.");
        const { uploadUrl, fileUrl } = await res.json();

        if (progressStatus) progressStatus.innerText = "⏳ Uploading to S3...";
        const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!uploadRes.ok) throw new Error("S3 upload failed.");

        if (!editingNoteId) {
            // New note: stage locally until note is saved
            currentNoteAttachments.push({
                attachmentId: `att-${Date.now()}`,
                filename: file.name,
                fileUrl,
                label: file.name,
                s3Url: fileUrl
            });
            renderNoteAttachmentList();
            showSuccessToast(`Staged "${file.name}"! Will save with note.`);
        } else {
            // Existing note: persist attachment to DB immediately
            if (progressStatus) progressStatus.innerText = "⏳ Logging metadata to database...";
            const cleanContainerId = String(activeShortContainerId).replace("CONTAINER#", "").trim();
            const dbPayload = {
                pk: `CONTAINER#${cleanContainerId.toUpperCase()}`,
                sk: `NOTE#${editingItemId}#${editingNoteId}`,
                filename: file.name,
                fileUrl
            };
            const dbRes = await fetch(`${API}/attachments`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(dbPayload)
            });
            if (!dbRes.ok) throw new Error("Failed to link file to note record.");
            const dbResult = await dbRes.json();
            currentNoteAttachments = (dbResult.attachments || []).map(a => ({
                ...a,
                label: a.filename || a.label,
                s3Url: a.fileUrl || a.s3Url
            }));
            renderNoteAttachmentList();
            showSuccessToast(`Uploaded "${file.name}" to note!`);
        }
    } catch (err) {
        alert(`Note attachment error: ${err.message}`);
    } finally {
        if (progressStatus) progressStatus.style.display = "none";
        fileInput.value = "";
    }
}

async function saveNote() {
    const description = document.getElementById("noteDescription").value.trim();
    if (!description) return alert("Description is required.");

    const date = document.getElementById("noteDate").value || new Date().toISOString().split("T")[0];

    const cleanedAttachments = currentNoteAttachments.map(att => ({
        attachmentId: att.attachmentId || `att-${Date.now()}`,
        filename: att.filename || att.label || "File",
        fileUrl: att.fileUrl || att.s3Url || "",
        uploadedAt: att.uploadedAt || new Date().toISOString()
    }));

    const payload = { description, date, attachments: cleanedAttachments };

    if (window.APP_CONFIG?.USE_MOCK) {
        if (editingNoteId) {
            const idx = currentItemNotes.findIndex(n => n.noteId === editingNoteId);
            if (idx !== -1) Object.assign(currentItemNotes[idx], payload);
        } else {
            const generatedNoteId = "NOTE" + Date.now();
            currentItemNotes.push({
                PK: `CONTAINER#${activeShortContainerId}`,
                SK: `NOTE#${editingItemId}#${generatedNoteId}`,
                entityType: "NOTE",
                containerId: activeShortContainerId,
                itemId: editingItemId,
                noteId: generatedNoteId,
                createdDate: new Date().toISOString().split("T")[0],
                ...payload
            });
        }
        closeNoteForm();
        renderNotesSection();
        showSuccessToast("Note saved!");
        return;
    }

    try {
        let path = `${API}/containers/${activeShortContainerId}/items/${editingItemId}/notes`;
        let method = "POST";
        if (editingNoteId) {
            path += `/${editingNoteId}`;
            method = "PUT";
        }

        const res = await fetch(path, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);

        closeNoteForm();
        await loadNotes();
        showSuccessToast("Note saved successfully!");
    } catch (err) {
        alert(`Failed to save note: ${err.message}`);
    }
}

function confirmDeleteNote(noteId) {
    const note = currentItemNotes.find(n => n.noteId === noteId);
    const preview = note ? (note.description || "").substring(0, 50) : "This Note";
    openDeleteModal("NOTE", noteId, preview);
}

async function finalizeNoteDelete(noteId) {
    if (window.APP_CONFIG?.USE_MOCK) {
        currentItemNotes = currentItemNotes.filter(n => n.noteId !== noteId);
        renderNotesSection();
        showSuccessToast("Note deleted.");
        return;
    }

    try {
        const res = await fetch(
            `${API}/containers/${activeShortContainerId}/items/${editingItemId}/notes/${noteId}`,
            { method: "DELETE", headers: authHeaders() }
        );
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        await loadNotes();
        showSuccessToast("Note deleted successfully.");
    } catch (err) {
        alert(`Failed to delete note: ${err.message}`);
    }
}