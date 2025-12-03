// Proof Guard — Final Build with All Fixes
const LS_KEY = "pg_items_v10";
const LS_TRASH = "pg_trash_v10";
const LS_LOGS = "pg_edit_logs_v10";
const LS_PG_SERIAL_COUNTER = "pg_serial_counter_v5";
const LS_LOG_COUNTER = "pg_log_counter_v5";

// --- LS Getters/Setters ---
function getItems() { 
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); 
    } catch {
        return [];
    }
}

function setItems(items) { 
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(items)); 
    } catch (e) {
        console.error("Error saving items:", e);
    }
}

function getTrash() { 
    try {
        return JSON.parse(localStorage.getItem(LS_TRASH) || "[]"); 
    } catch {
        return [];
    }
}

function setTrash(items) { 
    try {
        localStorage.setItem(LS_TRASH, JSON.stringify(items)); 
    } catch (e) {
        console.error("Error saving trash:", e);
    }
}

function getLogs() { 
    try {
        return JSON.parse(localStorage.getItem(LS_LOGS) || "[]"); 
    } catch {
        return [];
    }
}

function setLogs(logs) { 
    try {
        localStorage.setItem(LS_LOGS, JSON.stringify(logs)); 
    } catch (e) {
        console.error("Error saving logs:", e);
    }
}

// Fix 2: 8-digit PG Serial (PG625001 থেকে শুরু)
function nextPgSerial() {
    try {
        let n = Number(localStorage.getItem(LS_PG_SERIAL_COUNTER) || "625001");
        n += 1; 
        if (n > 699999) n = 625001;
        localStorage.setItem(LS_PG_SERIAL_COUNTER, String(n));
        return 'PG' + n.toString().padStart(6, '0');
    } catch {
        const fallback = 625000 + Math.floor(Math.random() * 10000);
        return 'PG' + fallback.toString().padStart(6, '0');
    }
}

// Fix 9: 8-digit HEX capital letters
function nextLogId() {
    try {
        let n = Number(localStorage.getItem(LS_LOG_COUNTER) || '10000000');
        n += 1; 
        localStorage.setItem(LS_LOG_COUNTER, String(n));
        return n.toString(16).padStart(8, '0').toUpperCase();
    } catch {
        return Date.now().toString(16).slice(-8).toUpperCase();
    }
}

function saveLog(itemId, itemName, pgSerial, changes) {
    if (changes.length === 0) return;
    
    try {
        const items = getItems();
        const item = items.find(i => i.id === itemId);
        const editIndex = (item ? item.editCount : 0) + 1;

        const logs = getLogs();
        const newLog = {
            id: nextLogId(),
            itemId,
            name: itemName,
            pgSerial,
            changes,
            editIndex,
            at: new Date().toISOString()
        };
        logs.push(newLog);
        setLogs(logs);
    } catch (e) {
        console.error("Error saving log:", e);
    }
}

// --- Utility Functions ---
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDatePretty(date) {
    try {
        if (!(date instanceof Date) || isNaN(date)) return '';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

function formatTime12(date) {
    try {
        if (!(date instanceof Date) || isNaN(date)) return '';
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '';
    }
}

function showSnackbar(message, type = 'info') {
    try {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;
        
        snackbar.textContent = message;
        snackbar.className = `snackbar show ${type}`;
        setTimeout(() => { 
            if (snackbar) snackbar.className = 'snackbar'; 
        }, 3000);
    } catch (e) {
        console.error("Error showing snackbar:", e);
    }
}

// --- DOM Elements ---
const itemList = document.getElementById('itemList');
const noDataMessage = document.getElementById('noDataMessage');
const addEditDialog = document.getElementById('addEditDialog');
const addEditTitle = document.getElementById('addEditTitle');
const addEditForm = document.getElementById('addEditForm');
const addSaveBtn = document.getElementById('addSaveBtn');
const addEditError = document.getElementById('addEditError');
const detailsDialog = document.getElementById('detailsDialog');
const trashDialog = document.getElementById('trashDialog');
const logsDialog = document.getElementById('logsDialog');
const trashList = document.getElementById('trashList');
const logsList = document.getElementById('logsList');
const dDeleteBtn = document.getElementById('dDeleteBtn');
const dEditBtn = document.getElementById('dEditBtn');
const dMeta = document.getElementById('dMeta');
const printBtn = document.getElementById('printBtn');
const statusListDialog = document.getElementById('statusListDialog');
const statusListTitle = document.getElementById('statusListTitle');
const statusList = document.getElementById('statusList');
const confirmDialog = document.getElementById('confirmDialog');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmBtn = document.getElementById('confirmBtn');
const confirmCancel = document.getElementById('confirmCancel');
const importCsvInput = document.getElementById('importCsvInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const notifBtn = document.getElementById('notifBtn');
const aboutBtn = document.getElementById('aboutBtn');
const notifCount = document.getElementById('notifCount');

// Fix 1.1: Logs search elements with proper placement
const logsSearchToggleBtn = document.getElementById('logsSearchToggleBtn');
const logsSearchContainer = document.getElementById('logsSearchContainer');
const logsSearchInput = document.getElementById('logsSearchInput');
const clearLogsSearchBtn = document.getElementById('clearLogsSearchBtn');

let currentDetailsItem = null;
let editingItemId = null;

// Fix 0: 36 hours for NEW tag
function isItemNew(item) {
    if (!item || !item.createdAt) return false;
    try {
        const createdTime = new Date(item.createdAt).getTime();
        const currentTime = new Date().getTime();
        const thirtySixHours = 36 * 60 * 60 * 1000;
        return (currentTime - createdTime) < thirtySixHours;
    } catch {
        return false;
    }
}

// Fix 2: Check if item is imported and cannot be edited
function isItemImported(item) {
    return item && item.importMeta && item.importMeta.includes("Imported from CSV");
}

// --- Main Logic ---

function calculateStatus(item) {
    try {
        if (!item || !item.endDate) return 'active';
        
        const endDate = new Date(item.endDate);
        const now = new Date();
        
        if (isNaN(endDate.getTime())) return 'active';
        
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'expired';
        if (diffDays <= (item.remindDays || 30)) return 'expiringSoon';
        return 'active';
    } catch {
        return 'active';
    }
}

// Fix 6.1: Days until expiry calculate
function getDaysUntilExpiry(item) {
    try {
        if (!item || !item.endDate) return '';
        
        const endDate = new Date(item.endDate);
        const now = new Date();
        
        if (isNaN(endDate.getTime())) return '';
        
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'Expired';
        return `${diffDays.toString().padStart(2, '0')} D`;
    } catch {
        return '';
    }
}

function renderAll() {
    try {
        const items = getItems();
        const activeItems = items.filter(i => calculateStatus(i) === 'active');
        const soonItems = items.filter(i => calculateStatus(i) === 'expiringSoon');
        const expiredItems = items.filter(i => calculateStatus(i) === 'expired');

        // Update counts
        document.getElementById('activeCount').textContent = activeItems.length;
        document.getElementById('expiringSoonCount').textContent = soonItems.length;
        document.getElementById('expiredCount').textContent = expiredItems.length;

        // Render items - REMOVED IMPORTED BADGE
        itemList.innerHTML = items.map(item => {
            const status = calculateStatus(item);
            const endDatePretty = formatDatePretty(new Date(item.endDate));
            const daysUntilExpiry = getDaysUntilExpiry(item);
            const className = status === 'expiringSoon' ? 'soon' : status;
            const showNewTag = isItemNew(item);
            const isImported = isItemImported(item);

            return `
                <li class="list-item ${className} ${isImported ? 'imported-item' : ''}" onclick="openDetails('${item.id}')">
                    <div class="item-header">
                        <div class="item-name">${escapeHtml(item.name)} ${showNewTag ? '<span class="badge">NEW</span>' : ''}</div>
                        <div class="days-badge ${status === 'expired' ? 'expired' : ''}">${daysUntilExpiry}</div>
                    </div>
                    <div class="item-meta">${escapeHtml(item.pgSerial)} | ${escapeHtml(item.shop || 'No Shop')}</div>
                    <div class="item-dates">
                        End Date: <span class="item-end-date">${endDatePretty}</span>
                    </div>
                </li>
            `;
        }).join('');

        noDataMessage.style.display = items.length === 0 ? 'block' : 'none';
        
        // Update notification count
        notifCount.textContent = soonItems.length;
        
        // Update notification badge color
        if (soonItems.length > 0) {
            notifBtn.classList.add('has-notif');
        } else {
            notifBtn.classList.remove('has-notif');
        }
    } catch (e) {
        console.error("Error in renderAll:", e);
        showSnackbar("Error rendering items", "error");
    }
}

function openDetails(id) {
    try {
        const items = getItems();
        const item = items.find(i => i.id === id);
        if (!item) {
            showSnackbar('Product not found.', 'error');
            return;
        }

        currentDetailsItem = item;
        detailsDialog.showModal();
        document.getElementById('dName').textContent = escapeHtml(item.name);

        // Fix 6: Meta data update
        dMeta.innerHTML = `
            <div class="meta-bar">
                <div class="mini-meta">${escapeHtml(item.pgSerial)}</div>
                <div class="mini-meta right">Last Edited: ${formatTime12(new Date(item.lastEdited))}, ${formatDatePretty(new Date(item.lastEdited))}</div>
            </div>
            ${item.importMeta ? `<div class="mini-meta import-meta">${escapeHtml(item.importMeta)}</div>` : ''}
            ${(item.editCount || 0) > 0 ? `<div class="mini-meta edit-meta">Edits: ${item.editCount} (Limit: 2)</div>` : ''}
        `;

        // Content rendering
        const dContent = document.getElementById('dContent');
        const daysUntilExpiry = getDaysUntilExpiry(item);
        const isImported = isItemImported(item);
        
        dContent.innerHTML = `
            <div class="details-section">
                <h4>General Info</h4>
                <table class="details-table">
                    <tr><td>Shop / Place</td><td>${escapeHtml(item.shop || 'Not specified')}</td></tr>
                    <tr><td>Kind</td><td>${escapeHtml(item.kind || 'Not specified')}</td></tr>
                    <tr><td>Serial No.</td><td>${escapeHtml(item.serial || 'Not specified')}</td></tr>
                </table>
            </div>
            <div class="details-section">
                <h4>Dates & Status</h4>
                <table class="details-table">
                    <tr><td>Buying Date</td><td>${formatDatePretty(new Date(item.buyDate))}</td></tr>
                    <tr><td>Period</td><td>${escapeHtml(item.periodValue)} ${escapeHtml(item.periodUnit)}</td></tr>
                    <tr><td>End Date</td><td><strong style="color:var(--${calculateStatus(item) === 'expired' ? 'red' : 'primary-2'})">${formatDatePretty(new Date(item.endDate))}</strong></td></tr>
                    <tr><td>Days Left</td><td><strong>${daysUntilExpiry}</strong></td></tr>
                    <tr><td>Reminder</td><td>${escapeHtml(item.remindDays)} days before</td></tr>
                </table>
            </div>
            ${item.notes ? `<div class="details-section"><h4>Notes</h4><p>${escapeHtml(item.notes)}</p></div>` : ''}
        `;

        // Button logic
        dDeleteBtn.textContent = 'Move to Trash';
        printBtn.style.display = 'block';
        
        // Fix 2: Disable edit for imported items (but no badge)
        if (isImported) {
            dEditBtn.textContent = '✏️ Edit (Import Locked)';
            dEditBtn.className = 'btn btn-light disabled-edit';
            dEditBtn.disabled = true;
            dEditBtn.onclick = null;
        } else {
            dEditBtn.textContent = '✏️ Edit';
            dEditBtn.className = 'btn btn-light';
            dEditBtn.disabled = false;
            dEditBtn.onclick = () => {
                detailsDialog.close();
                openAddEditDialog(item.id);
            };
        }
        dEditBtn.style.display = 'block';

        // Delete Logic
        dDeleteBtn.onclick = () => {
            detailsDialog.close();
            confirmDialog.showModal();
            confirmTitle.textContent = "Confirm Move to Trash";
            confirmMessage.innerHTML = `Are you sure you want to move <strong>${escapeHtml(item.name)}</strong> to trash?`;
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.textContent = 'Move to Trash';
            confirmBtn.onclick = () => {
                confirmDialog.close();
                moveToTrash(item.id); 
            };
        };
    } catch (e) {
        console.error("Error in openDetails:", e);
        showSnackbar("Error opening details", "error");
    }
}

// Fix 3: Permanent Delete Function
function confirmPermanentDelete(id) {
    const trash = getTrash();
    const item = trash.find(i => i.id === id);
    
    if (!item) {
        showSnackbar("Item not found in trash", "error");
        return;
    }
    
    confirmDialog.showModal();
    confirmTitle.textContent = "Permanent Delete";
    confirmMessage.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="font-size: 48px; color: var(--red); margin-bottom: 10px;">⚠️</div>
            <h4 style="color: var(--red); margin: 10px 0;">Warning: This action cannot be undone!</h4>
            <p>Are you sure you want to permanently delete <strong>${escapeHtml(item.name)}</strong>?</p>
            <p style="font-size: 14px; color: var(--muted); margin-top: 10px;">
                Item will be permanently removed from trash.
            </p>
            <p style="font-size: 13px; color: var(--muted); font-style: italic; margin-top: 15px;">
                Note: Edit history logs will be preserved.
            </p>
        </div>
    `;
    
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Permanently Delete';
    confirmBtn.onclick = () => {
        confirmDialog.close();
        permanentDeleteItem(id);
    };
}

// Fix 1: Do NOT delete log data when item is deleted
function permanentDeleteItem(id) {
    try {
        let trash = getTrash();
        const index = trash.findIndex(i => i.id === id);

        if (index !== -1) {
            const [deletedItem] = trash.splice(index, 1);
            setTrash(trash);
            
            // Fix 1: Do NOT remove from logs - keep edit history
            // const logs = getLogs();
            // const filteredLogs = logs.filter(log => log.itemId !== id);
            // setLogs(filteredLogs);
            
            showSnackbar(`'${deletedItem.name}' permanently deleted.`, 'success');
            openTrash(); // Refresh trash list
        }
    } catch (e) {
        console.error("Error in permanent delete:", e);
        showSnackbar("Error deleting item", "error");
    }
}

// Fix 4: Open Status List
function openStatusList(status) {
    try {
        const items = getItems().filter(i => calculateStatus(i) === status);
        let titleText = '';

        if (status === 'active') titleText = 'Active Warranties';
        else if (status === 'expiringSoon') titleText = 'Expiring Soon';
        else if (status === 'expired') titleText = 'Expired Warranties';
        
        statusListTitle.textContent = titleText;
        statusList.innerHTML = items.map(item => {
            const endDatePretty = formatDatePretty(new Date(item.endDate));
            const daysUntilExpiry = getDaysUntilExpiry(item);
            const className = status === 'expiringSoon' ? 'soon' : status;
            const showNewTag = isItemNew(item);
            const isImported = isItemImported(item);
            
            return `
                <li class="list-item ${className} ${isImported ? 'imported-item' : ''}" onclick="openDetails('${item.id}'); statusListDialog.close();">
                    <div class="item-header">
                        <div class="item-name">${escapeHtml(item.name)} ${showNewTag ? '<span class="badge">NEW</span>' : ''}</div>
                        <div class="days-badge ${status === 'expired' ? 'expired' : ''}">${daysUntilExpiry}</div>
                    </div>
                    <div class="item-meta">${escapeHtml(item.pgSerial)} | ${escapeHtml(item.shop || 'No Shop')}</div>
                    <div class="item-dates">
                        End Date: <span class="item-end-date">${endDatePretty}</span>
                    </div>
                </li>
            `;
        }).join('') || `<li class="no-data">No items in this category.</li>`;
        
        statusListDialog.showModal();
    } catch (e) {
        console.error("Error in openStatusList:", e);
        showSnackbar("Error opening status list", "error");
    }
}

// NEW: Open Notifications
function openNotifications() {
    try {
        const soonItems = getItems().filter(i => calculateStatus(i) === 'expiringSoon');
        
        statusListTitle.textContent = 'Expiring Soon - Notifications';
        statusList.innerHTML = soonItems.map(item => {
            const endDatePretty = formatDatePretty(new Date(item.endDate));
            const daysUntilExpiry = getDaysUntilExpiry(item);
            const showNewTag = isItemNew(item);
            const isImported = isItemImported(item);
            
            return `
                <li class="list-item soon ${isImported ? 'imported-item' : ''}" onclick="openDetails('${item.id}'); statusListDialog.close();">
                    <div class="item-header">
                        <div class="item-name">${escapeHtml(item.name)} ${showNewTag ? '<span class="badge">NEW</span>' : ''}</div>
                        <div class="days-badge">${daysUntilExpiry}</div>
                    </div>
                    <div class="item-meta">${escapeHtml(item.pgSerial)} | ${escapeHtml(item.shop || 'No Shop')}</div>
                    <div class="item-dates">
                        <div>End Date: <span class="item-end-date">${endDatePretty}</span></div>
                        <div class="notif-alert">⚠️ Expiring soon</div>
                    </div>
                </li>
            `;
        }).join('') || `<li class="no-data">No expiring items. All good! ✅</li>`;
        
        statusListDialog.showModal();
    } catch (e) {
        console.error("Error in openNotifications:", e);
        showSnackbar("Error opening notifications", "error");
    }
}

// Fix 3: Classic About page with credit
function openAbout() {
    confirmDialog.showModal();
    confirmTitle.textContent = "About Proof Guard";
    confirmMessage.innerHTML = `
        <div class="classic-about">
            <div class="about-header">
                <div class="about-icon">🛡️</div>
                <h3 class="about-title">Proof Guard</h3>
                <p class="about-version">Version 1.3.0</p>
                <p class="about-description">
                    A comprehensive warranty and guarantee tracking solution designed to help you 
                    manage all your product warranties in one place with elegance and efficiency.
                </p>
            </div>
            
            <div class="about-features">
                <h4>Key Features</h4>
                <ul>
                    <li>Track warranty periods and expiration dates</li>
                    <li>Get notifications before warranties expire</li>
                    <li>Import/Export data via CSV files</li>
                    <li>Complete edit history tracking</li>
                    <li>Trash system with restore capability</li>
                    <li>Classic and clean print-ready reports</li>
                    <li>Secure local storage (your data stays on your device)</li>
                </ul>
            </div>
            
            <div class="about-credit">
                <div class="credit-title">Created with ❤️ by</div>
                <div class="credit-name">Rahy Bhuiyan</div>
                <div class="credit-role">Developer & Product Designer</div>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center;">
                <p style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
                    <strong>Important Notice:</strong>
                </p>
                <p style="font-size: 13px; color: var(--text); text-align: left; margin-top: 10px; background: rgba(255, 193, 7, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid var(--yellow);">
                    Your data is stored locally in your browser. For backup, please regularly export your data. 
                    This application works completely offline - no data is sent to any server.
                </p>
            </div>
        </div>
    `;
    confirmBtn.textContent = 'Close';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.onclick = () => {
        confirmDialog.close();
    };
}

// Fix 4: Print Functionality - More classic and organized
function printItem(it) {
    try {
        const printArea = document.getElementById('printArea');
        const daysUntilExpiry = getDaysUntilExpiry(it);
        
        printArea.innerHTML = `
            <h2 class="print-title">Proof Guard - Warranty Details</h2>
            <div class="print-meta">
                <div>${escapeHtml(it.pgSerial)}</div>
                <div>Last Edited: ${formatTime12(new Date(it.lastEdited))}, ${formatDatePretty(new Date(it.lastEdited))}</div>
            </div>
            <div class="print-section">
                <h4>Product Information</h4>
                <table class="print-table">
                    <tr><td><strong>Name</strong></td><td>${escapeHtml(it.name)}</td></tr>
                    <tr><td><strong>Shop / Place</strong></td><td>${escapeHtml(it.shop || 'Not specified')}</td></tr>
                    <tr><td><strong>Kind</strong></td><td>${escapeHtml(it.kind || 'Not specified')}</td></tr>
                    <tr><td><strong>Serial No.</strong></td><td>${escapeHtml(it.serial || 'Not specified')}</td></tr>
                </table>
            </div>
            <div class="print-section">
                <h4>Dates & Period</h4>
                <table class="print-table">
                    <tr><td><strong>Buying date</strong></td><td>${formatDatePretty(new Date(it.buyDate))}</td></tr>
                    <tr><td><strong>Period</strong></td><td>${escapeHtml(it.periodValue)} ${escapeHtml(it.periodUnit)}</td></tr>
                    <tr><td><strong>End date</strong></td><td>${formatDatePretty(new Date(it.endDate))}</td></tr>
                    <tr><td><strong>Days Left</strong></td><td>${daysUntilExpiry}</td></tr>
                    <tr><td><strong>Remind before</strong></td><td>${escapeHtml(it.remindDays)} days</td></tr>
                </table>
            </div>
            ${it.notes ? `<div class="print-section"><h4>Notes</h4><p style="white-space: pre-wrap;">${escapeHtml(it.notes)}</p></div>` : ''}
            <div class="footer-note">
                Generated by Proof Guard • ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
        `;
        
        window.print();
        
        // Clear print area after printing
        setTimeout(() => {
            printArea.innerHTML = '';
        }, 100);
    } catch (e) {
        console.error("Error printing:", e);
        showSnackbar("Error printing document", "error");
    }
}

// Fix 1.1: Logs with search functionality and proper button placement
function openLogs() {
    try {
        logsSearchContainer.style.display = 'none';
        logsSearchInput.value = '';
        
        const logs = getLogs().slice().sort((a,b) => new Date(b.at) - new Date(a.at));
        
        logsDialog.showModal();
        renderLogsList(logs);
        
        // Add search functionality
        logsSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toUpperCase();
            const filteredLogs = logs.filter(log => 
                (log.pgSerial && log.pgSerial.toUpperCase().includes(searchTerm)) ||
                (log.name && log.name.toUpperCase().includes(searchTerm))
            );
            renderLogsList(filteredLogs);
        });
        
        // Clear search button
        if (clearLogsSearchBtn) {
            clearLogsSearchBtn.addEventListener('click', () => {
                logsSearchInput.value = '';
                renderLogsList(logs);
            });
        }
    } catch (e) {
        console.error("Error opening logs:", e);
        showSnackbar("Error opening logs", "error");
    }
}

function renderLogsList(logs) {
    try {
        logsList.innerHTML = logs.length ? logs.map(l => {
            let changeHtml = l.changes.map(c => {
                let oldValue = String(c.oldValue || "");
                let newValue = String(c.newValue || "");
                
                if (c.field.toLowerCase().includes('date')) {
                    try {
                        oldValue = oldValue ? formatDatePretty(new Date(oldValue)) : '';
                        newValue = newValue ? formatDatePretty(new Date(newValue)) : '';
                    } catch {
                        // Keep original if date parsing fails
                    }
                }

                return `<div><strong>${escapeHtml(c.field)}:</strong> <span class="log-old">${escapeHtml(oldValue)}</span> → <span class="log-new">${escapeHtml(newValue)}</span></div>`;
            }).join('');

            return `
                <li>
                    <div>
                        <strong>${escapeHtml(l.name || "")}</strong> 
                        <span class="mini-meta tag">${l.id} | ${l.pgSerial}</span>
                    </div>
                    <div class="tag">${formatTime12(new Date(l.at))}, ${formatDatePretty(new Date(l.at))} • Edit #${l.editIndex}</div>
                    <div style="margin-top:6px;">${changeHtml}</div>
                </li>
            `;
        }).join('') : `<li class="no-data">No edit logs yet.</li>`;
    } catch (e) {
        console.error("Error rendering logs:", e);
        logsList.innerHTML = `<li class="no-data">Error loading logs</li>`;
    }
}

// --- Add/Edit Form Logic ---

function openAddEditDialog(id = null) {
    try {
        editingItemId = id;
        addEditForm.reset();
        addEditError.textContent = '';
        addEditError.classList.add('hidden');
        
        const isEditing = id !== null;
        addEditTitle.textContent = isEditing ? 'Edit Warranty' : 'Add New Warranty';
        
        if (isEditing) {
            const item = getItems().find(i => i.id === id);
            if (item) {
                // Fix 2: Disable editing for imported items
                if (isItemImported(item)) {
                    addSaveBtn.disabled = true;
                    addEditError.textContent = "This item was imported from CSV and cannot be edited.";
                    addEditError.classList.remove('hidden');
                    
                    // Disable all form fields
                    const formElements = addEditForm.querySelectorAll('input, select, textarea');
                    formElements.forEach(el => {
                        el.disabled = true;
                        el.style.opacity = '0.6';
                        el.style.cursor = 'not-allowed';
                    });
                } else {
                    addSaveBtn.disabled = false;
                    const formElements = addEditForm.querySelectorAll('input, select, textarea');
                    formElements.forEach(el => {
                        el.disabled = false;
                        el.style.opacity = '1';
                        el.style.cursor = 'auto';
                    });
                }
                
                document.getElementById('nameInput').value = item.name;
                document.getElementById('shopInput').value = item.shop;
                document.getElementById('kindInput').value = item.kind;
                document.getElementById('serialInput').value = item.serial;
                document.getElementById('buyDateInput').value = item.buyDate ? item.buyDate.substring(0, 10) : '';
                document.getElementById('periodValueInput').value = item.periodValue;
                document.getElementById('periodUnitInput').value = item.periodUnit;
                document.getElementById('remindDaysInput').value = item.remindDays;
                document.getElementById('notesInput').value = item.notes || '';
                
                if (!isItemImported(item) && (item.editCount || 0) >= 2) {
                    addSaveBtn.disabled = true;
                    addEditError.textContent = "Edit limit (2) reached for this item.";
                    addEditError.classList.remove('hidden');
                }
            }
        } else {
            // New item - set defaults and enable
            addSaveBtn.disabled = false;
            const formElements = addEditForm.querySelectorAll('input, select, textarea');
            formElements.forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'auto';
            });
            
            const today = new Date();
            document.getElementById('buyDateInput').value = today.toISOString().substring(0, 10);
            document.getElementById('periodValueInput').value = 1;
            document.getElementById('remindDaysInput').value = 30;
            document.getElementById('notesInput').value = '';
        }
        
        addEditDialog.showModal();
    } catch (e) {
        console.error("Error opening add/edit dialog:", e);
        showSnackbar("Error opening form", "error");
    }
}

addSaveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    try {
        // Fix 2: Check if editing imported item
        if (editingItemId) {
            const item = getItems().find(i => i.id === editingItemId);
            if (item && isItemImported(item)) {
                showSnackbar("Imported items cannot be edited.", "error");
                return;
            }
        }
        
        const name = document.getElementById('nameInput').value.trim();
        const shop = document.getElementById('shopInput').value.trim();
        const kind = document.getElementById('kindInput').value.trim();
        const serial = document.getElementById('serialInput').value.trim();
        const buyDate = document.getElementById('buyDateInput').value;
        const periodValue = Number(document.getElementById('periodValueInput').value);
        const periodUnit = document.getElementById('periodUnitInput').value;
        const remindDays = Number(document.getElementById('remindDaysInput').value) || 30;
        const notes = document.getElementById('notesInput').value.trim(); // Fix 2.1: Get notes properly
        
        addEditError.textContent = ''; 
        addEditError.classList.add('hidden');

        // Validation
        if (!name) {
            addEditError.textContent = 'Product Name is required.';
            addEditError.classList.remove('hidden');
            return;
        }
        if (!buyDate) {
            addEditError.textContent = 'Buying Date is required.';
            addEditError.classList.remove('hidden');
            return;
        }
        if (periodValue <= 0 || isNaN(periodValue)) {
            addEditError.textContent = 'Period must be a positive number.';
            addEditError.classList.remove('hidden');
            return;
        }
        if (periodValue > 100) {
            addEditError.textContent = 'Period cannot exceed 100.';
            addEditError.classList.remove('hidden');
            return;
        }
        if (remindDays < 1 || remindDays > 365) {
            addEditError.textContent = 'Reminder days must be between 1 and 365.';
            addEditError.classList.remove('hidden');
            return;
        }
        
        const buyDateObj = new Date(buyDate);
        if (isNaN(buyDateObj.getTime())) {
            addEditError.textContent = 'Invalid buying date.';
            addEditError.classList.remove('hidden');
            return;
        }
        
        // Calculate end date correctly
        let endDate = new Date(buyDateObj);
        if (periodUnit === 'Years') {
            endDate.setFullYear(endDate.getFullYear() + periodValue);
            endDate.setDate(endDate.getDate() - 1);
        } else if (periodUnit === 'Months') {
            endDate.setMonth(endDate.getMonth() + periodValue);
            endDate.setDate(endDate.getDate() - 1);
        } else if (periodUnit === 'Days') {
            endDate.setDate(endDate.getDate() + periodValue - 1);
        }
        
        // Ensure end date is not before buy date
        if (endDate.getTime() < buyDateObj.getTime()) {
            endDate = new Date(buyDateObj);
        }

        const newItem = {
            name: name,
            shop: shop,
            kind: kind,
            serial: serial,
            buyDate: buyDateObj.toISOString(),
            periodValue: periodValue,
            periodUnit: periodUnit,
            endDate: endDate.toISOString(),
            remindDays: remindDays,
            notes: notes, // Fix 2.1: Save notes properly
        };

        let items = getItems();
        if (editingItemId) {
            const oldItem = items.find(i => i.id === editingItemId);
            if (oldItem) {
                const changes = [];
                
                // Track Changes for Logging
                const fields = ['name', 'shop', 'kind', 'serial', 'buyDate', 'periodValue', 'periodUnit', 'endDate', 'remindDays', 'notes'];
                fields.forEach(key => {
                    const oldValue = oldItem[key] !== undefined ? oldItem[key] : '';
                    const newValue = newItem[key] !== undefined ? newItem[key] : '';

                    let isDifferent = false;
                    if (key.includes('Date')) {
                        const oldTime = new Date(oldValue).getTime();
                        const newTime = new Date(newValue).getTime();
                        isDifferent = oldTime !== newTime && !(isNaN(oldTime) && isNaN(newTime));
                    } else {
                        isDifferent = String(oldValue) !== String(newValue);
                    }

                    if (isDifferent) {
                        changes.push({ 
                            field: key, 
                            oldValue: oldValue, 
                            newValue: newValue 
                        });
                    }
                });

                if (changes.length > 0) {
                    // Preserve important fields
                    newItem.id = oldItem.id;
                    newItem.pgSerial = oldItem.pgSerial;
                    newItem.createdAt = oldItem.createdAt;
                    newItem.lastEdited = new Date().toISOString();
                    newItem.editCount = (oldItem.editCount || 0) + 1;
                    newItem.importMeta = oldItem.importMeta; // Preserve import metadata
                    
                    // Update the item
                    const index = items.indexOf(oldItem);
                    items[index] = newItem;
                    
                    saveLog(oldItem.id, oldItem.name, oldItem.pgSerial, changes);
                    showSnackbar(`'${oldItem.name}' updated successfully!`, 'success');
                } else {
                    showSnackbar('No changes detected.', 'info');
                }
            }
        } else {
            // Add new item
            // Check for duplicate name and serial
            const duplicate = items.find(i => 
                i.name.toLowerCase() === name.toLowerCase() && 
                i.serial && 
                i.serial.toLowerCase() === serial.toLowerCase()
            );
            
            if (duplicate) {
                addEditError.textContent = 'Product with same name and serial already exists.';
                addEditError.classList.remove('hidden');
                return;
            }
            
            newItem.id = crypto.randomUUID();
            newItem.pgSerial = nextPgSerial();
            newItem.createdAt = new Date().toISOString();
            newItem.lastEdited = new Date().toISOString();
            newItem.editCount = 0;
            items.push(newItem);
            showSnackbar(`'${newItem.name}' added successfully!`, 'success');
        }

        setItems(items);
        addEditDialog.close();
        renderAll();
    } catch (e) {
        console.error("Error saving item:", e);
        showSnackbar("Error saving item", "error");
    }
});

// --- Trash Logic ---
function moveToTrash(id) {
    try {
        let items = getItems();
        const trash = getTrash();
        const index = items.findIndex(i => i.id === id);

        if (index !== -1) {
            const [itemToTrash] = items.splice(index, 1);
            itemToTrash.deletedAt = new Date().toISOString();
            itemToTrash.originalId = itemToTrash.id;
            trash.push(itemToTrash);
            setItems(items);
            setTrash(trash);
            showSnackbar(`'${itemToTrash.name}' moved to Trash.`, 'info');
            renderAll();
        }
    } catch (e) {
        console.error("Error moving to trash:", e);
        showSnackbar("Error moving item to trash", "error");
    }
}

function restoreItem(id) {
    try {
        let trash = getTrash();
        const items = getItems();
        const index = trash.findIndex(i => i.id === id);

        if (index !== -1) {
            const [itemToRestore] = trash.splice(index, 1);
            delete itemToRestore.deletedAt;
            delete itemToRestore.originalId;
            // Don't mark restored items as new
            if (itemToRestore.createdAt) {
                const oldDate = new Date(itemToRestore.createdAt);
                oldDate.setHours(oldDate.getHours() - 37);
                itemToRestore.createdAt = oldDate.toISOString();
            }
            items.push(itemToRestore);
            setItems(items);
            setTrash(trash);
            showSnackbar(`'${itemToRestore.name}' restored successfully!`, 'success');
            openTrash(); // Refresh trash list
        }
    } catch (e) {
        console.error("Error restoring item:", e);
        showSnackbar("Error restoring item", "error");
    }
}

function openTrash() {
    try {
        const trash = getTrash().slice().sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt));
        
        trashList.innerHTML = trash.map(item => {
            const deletedDate = formatDatePretty(new Date(item.deletedAt));
            const isImported = isItemImported(item);
            
            return `
                <li class="list-item trash-item ${isImported ? 'imported-item' : ''}">
                    <div class="item-header">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                    </div>
                    <div class="item-meta">${escapeHtml(item.pgSerial)} | ${escapeHtml(item.shop || 'No Shop')}</div>
                    <div class="item-dates">
                        Deleted: <span class="item-end-date">${deletedDate}</span>
                    </div>
                    <div class="trash-actions">
                        <button class="btn btn-primary" onclick="restoreItem('${item.id}')">Restore</button>
                        <button class="btn btn-danger" onclick="confirmPermanentDelete('${item.id}')">Delete Permanently</button>
                    </div>
                </li>
            `;
        }).join('') || `<li class="no-data">Trash is empty.</li>`;
        
        trashDialog.showModal();
    } catch (e) {
        console.error("Error opening trash:", e);
        showSnackbar("Error opening trash", "error");
    }
}

// --- CSV Import/Export Logic ---

function processCsvContent(csvContent) {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            showSnackbar("CSV file is empty or has no data.", "error");
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const dataLines = lines.slice(1);
        
        let items = getItems();
        let stats = { 
            total: dataLines.length, 
            added: 0, 
            duplicates: 0, 
            errors: 0,
            duplicateItems: [] 
        };

        dataLines.forEach((line, index) => {
            try {
                // Parse CSV line with proper handling of quoted fields and newlines in fields
                const values = [];
                let inQuotes = false;
                let currentField = "";
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(currentField.trim());
                        currentField = "";
                    } else {
                        currentField += char;
                    }
                }
                values.push(currentField.trim());
                
                // Remove surrounding quotes from each field
                const cleanedValues = values.map(val => {
                    if (val.startsWith('"') && val.endsWith('"')) {
                        return val.slice(1, -1).replace(/""/g, '"');
                    }
                    return val;
                });

                if (cleanedValues.length !== headers.length) {
                    console.warn(`Line ${index + 2}: Expected ${headers.length} columns, got ${cleanedValues.length}`);
                    stats.errors++;
                    return;
                }
                
                let itemData = {};
                headers.forEach((header, i) => {
                    itemData[header] = cleanedValues[i];
                });

                // Fix 2.1: Extract notes properly with multiple possible column names
                const name = itemData.name || itemData.Name || itemData.Product || itemData.product || '';
                const serial = itemData.serial || itemData.Serial || itemData['Serial Number'] || itemData.serial_number || '';
                const notes = itemData.notes || itemData.Note || itemData.Notes || itemData.Description || 
                             itemData.description || itemData.Comments || itemData.comments || '';
                
                if (!name.trim()) {
                    stats.errors++;
                    return;
                }

                // Check for duplicates (by name + serial)
                const isDuplicate = items.some(item => 
                    item.name.toLowerCase() === name.toLowerCase() && 
                    item.serial.toLowerCase() === serial.toLowerCase()
                );
                
                if (isDuplicate) {
                    stats.duplicates++;
                    stats.duplicateItems.push(`${name} (${serial})`);
                    return;
                }

                // Calculate dates with better date parsing
                let buyDate;
                const buyDateStr = itemData.buyDate || itemData.buy_date || itemData.purchaseDate || 
                                 itemData.date || itemData.Date || itemData.purchase_date || '';
                
                if (buyDateStr) {
                    // Try multiple date formats
                    const parsedDate = new Date(buyDateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        buyDate = parsedDate;
                    } else {
                        // Try DD/MM/YYYY or MM/DD/YYYY format
                        const parts = buyDateStr.split(/[\/\-\.]/);
                        if (parts.length === 3) {
                            const day = parseInt(parts[0]);
                            const month = parseInt(parts[1]) - 1;
                            const year = parseInt(parts[2]);
                            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                buyDate = new Date(year, month, day);
                            }
                        }
                        if (!buyDate || isNaN(buyDate.getTime())) {
                            buyDate = new Date();
                        }
                    }
                } else {
                    buyDate = new Date();
                }
                
                const periodValue = Number(itemData.periodValue || itemData.period_value || itemData.period || itemData.duration || 1);
                const periodUnit = itemData.periodUnit || itemData.period_unit || itemData.unit || itemData.PeriodUnit || 'Years';
                
                let endDate = new Date(buyDate);
                const periodUnitLower = periodUnit.toLowerCase();
                if (periodUnitLower.includes('year')) {
                    endDate.setFullYear(endDate.getFullYear() + periodValue);
                    endDate.setDate(endDate.getDate() - 1);
                } else if (periodUnitLower.includes('month')) {
                    endDate.setMonth(endDate.getMonth() + periodValue);
                    endDate.setDate(endDate.getDate() - 1);
                } else if (periodUnitLower.includes('day')) {
                    endDate.setDate(endDate.getDate() + periodValue - 1);
                } else {
                    // Default to years
                    endDate.setFullYear(endDate.getFullYear() + periodValue);
                    endDate.setDate(endDate.getDate() - 1);
                }

                const newItem = {
                    id: crypto.randomUUID(),
                    pgSerial: nextPgSerial(),
                    name: name.trim(),
                    shop: (itemData.shop || itemData.Shop || itemData.store || itemData.Store || itemData.vendor || '').trim(),
                    kind: (itemData.kind || itemData.Kind || itemData.type || itemData.Type || itemData.warranty_type || 'Warranty').trim(),
                    serial: serial.trim(),
                    buyDate: buyDate.toISOString(),
                    periodValue: periodValue,
                    periodUnit: periodUnit.charAt(0).toUpperCase() + periodUnit.slice(1).toLowerCase(),
                    endDate: endDate.toISOString(),
                    remindDays: Number(itemData.remindDays || itemData.remind_days || itemData.reminder || itemData.notify_before || 30),
                    notes: notes.trim(), // Fix 2.1: Save notes properly
                    createdAt: new Date().toISOString(),
                    lastEdited: new Date().toISOString(),
                    editCount: 0,
                    importMeta: `Imported from CSV • ${formatDatePretty(new Date())}`,
                    isImported: true // Flag to identify imported items
                };

                items.push(newItem);
                stats.added++;
                
            } catch(e) {
                console.error("CSV Parse Error on line", index + 2, e);
                stats.errors++;
            }
        });

        setItems(items);
        
        showImportSummary(stats);
        
        renderAll();
        
    } catch (e) {
        console.error("Error processing CSV:", e);
        showSnackbar("Error processing CSV file", "error");
    }
}

function showImportSummary(stats) {
    confirmDialog.showModal();
    confirmTitle.textContent = "CSV Import Summary";
    
    let duplicateList = '';
    if (stats.duplicateItems.length > 0) {
        duplicateList = `
            <div style="margin-top: 15px; padding: 10px; background: var(--soft); border-radius: 6px;">
                <strong style="color: var(--yellow);">Duplicate Items Skipped (${stats.duplicateItems.length}):</strong>
                <div style="max-height: 150px; overflow-y: auto; margin-top: 5px;">
                    ${stats.duplicateItems.map(item => 
                        `<div style="padding: 3px 0; border-bottom: 1px solid var(--border); font-size: 13px;">${escapeHtml(item)}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    let errorNote = '';
    if (stats.errors > 0) {
        errorNote = `<p style="color: var(--muted); font-size: 13px; margin-top: 10px;">${stats.errors} lines had formatting errors and were skipped.</p>`;
    }
    
    confirmMessage.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="display: flex; justify-content: center; gap: 20px; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--green);">${stats.added}</div>
                    <div style="font-size: 12px; color: var(--muted);">Added</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--yellow);">${stats.duplicates}</div>
                    <div style="font-size: 12px; color: var(--muted);">Duplicates</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--red);">${stats.errors}</div>
                    <div style="font-size: 12px; color: var(--muted);">Errors</div>
                </div>
            </div>
            <p style="margin: 15px 0; color: var(--text);">
                Total processed: <strong>${stats.total}</strong> items
            </p>
            ${duplicateList}
            <div style="margin-top: 20px; padding: 15px; background: rgba(13, 110, 253, 0.1); border-radius: 8px; border-left: 4px solid var(--primary);">
                <p style="font-size: 14px; color: var(--primary); margin: 0;">
                    <strong>Note:</strong> Imported items cannot be edited to maintain data integrity.
                </p>
            </div>
            ${errorNote}
        </div>
    `;
    
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'OK';
    confirmBtn.onclick = () => {
        confirmDialog.close();
        if (stats.added > 0) {
            showSnackbar(`Import complete: ${stats.added} new items added`, 'success');
        } else {
            showSnackbar('No new items were added from CSV.', 'info');
        }
    };
}

// Fix 2: Better CSV export filename
exportCsvBtn.addEventListener('click', () => {
    try {
        const items = getItems();
        if (items.length === 0) {
            showSnackbar("No items to export.", 'info');
            return;
        }
        
        // Define the headers
        const headers = ['name', 'pgSerial', 'shop', 'kind', 'serial', 'buyDate', 'periodValue', 'periodUnit', 'endDate', 'remindDays', 'notes'];
        const csvRows = [headers.join(',')];

        items.forEach(item => {
            const values = headers.map(header => {
                let value = item[header] !== undefined ? item[header] : '';
                // Format dates nicely
                if (header === 'buyDate' || header === 'endDate') {
                    value = formatDatePretty(new Date(value));
                }
                // Handle special characters in notes
                if (header === 'notes' && value) {
                    value = value.replace(/"/g, '""').replace(/\n/g, ' ');
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value}"`;
                    }
                }
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${String(value).replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const date = new Date();
        const filename = `ProofGuard_Backup_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}.csv`;

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSnackbar(`Exported ${items.length} items to CSV.`, 'success');
    } catch (e) {
        console.error("Error exporting CSV:", e);
        showSnackbar("Error exporting CSV", "error");
    }
});

// CSV Import with confirmation
importCsvInput.addEventListener('change', () => {
    if (!importCsvInput.files.length) return;

    const file = importCsvInput.files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showSnackbar("Please select a CSV file.", "error");
        importCsvInput.value = '';
        return;
    }

    confirmDialog.showModal();
    confirmTitle.textContent = "Confirm CSV Import";
    confirmMessage.innerHTML = `
        <div style="margin-bottom: 15px;">
            Import data from <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(2)} KB)?
        </div>
        <div style="font-size: 14px; color: var(--muted); padding: 10px; background: var(--soft); border-radius: 6px;">
            <strong>⚠️ Important Information:</strong>
            <ul style="margin: 5px 0 0 20px; padding: 0;">
                <li>Duplicate items (same name + serial) will be skipped</li>
                <li>Each imported item will get a new PG Serial</li>
                <li>Imported items <strong>cannot be edited</strong> (data integrity)</li>
                <li>Existing data will not be modified</li>
                <li>Supported columns: name, shop, kind, serial, buyDate, periodValue, periodUnit, remindDays, notes</li>
            </ul>
        </div>
    `;
    
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'Start Import';
    confirmBtn.onclick = () => {
        confirmDialog.close();
        const fileToRead = importCsvInput.files[0];
        importCsvInput.value = '';
        
        const reader = new FileReader();
        reader.onload = (e) => processCsvContent(e.target.result);
        reader.onerror = () => showSnackbar("Error reading file.", 'error');
        reader.readAsText(fileToRead);
    };
});

// --- Initialization ---
function init() {
    try {
        renderAll();
        
        // Dialog Close buttons
        document.getElementById('addEditClose').addEventListener('click', () => addEditDialog.close());
        document.getElementById('detailsClose').addEventListener('click', () => detailsDialog.close());
        document.getElementById('trashClose').addEventListener('click', () => trashDialog.close());
        document.getElementById('logsClose').addEventListener('click', () => logsDialog.close());
        document.getElementById('addCancelBtn').addEventListener('click', () => addEditDialog.close());
        document.getElementById('statusListClose').addEventListener('click', () => statusListDialog.close());
        document.getElementById('confirmClose').addEventListener('click', () => confirmDialog.close());
        
        // Global Cancel Button
        confirmCancel.addEventListener('click', () => {
            confirmDialog.close();
            if (importCsvInput.files.length > 0) importCsvInput.value = ''; 
        });

        // Main UI Buttons
        document.getElementById('addToggleBtn').addEventListener('click', () => openAddEditDialog());
        document.getElementById('trashBtn').addEventListener('click', openTrash);
        document.getElementById('logsBtn').addEventListener('click', openLogs);
        notifBtn.addEventListener('click', openNotifications);
        aboutBtn.addEventListener('click', openAbout);
        
        // Fix 1.1: Logs search toggle with proper placement
        logsSearchToggleBtn.addEventListener('click', () => {
            logsSearchContainer.style.display = logsSearchContainer.style.display === 'none' ? 'block' : 'none';
            if (logsSearchContainer.style.display === 'block') {
                logsSearchInput.focus();
            }
        });
        
        // Print Button
        printBtn.addEventListener('click', () => {
            if (currentDetailsItem) {
                detailsDialog.close();
                printItem(currentDetailsItem);
            }
        });

        // Status Card Click Listeners
        document.getElementById('activeCard').addEventListener('click', () => openStatusList('active'));
        document.getElementById('expiringSoonCard').addEventListener('click', () => openStatusList('expiringSoon'));
        document.getElementById('expiredCard').addEventListener('click', () => openStatusList('expired'));

        // Drawer Toggle
        const drawerToggle = document.getElementById('drawerToggle');
        const appDrawer = document.getElementById('appDrawer');
        drawerToggle.addEventListener('click', () => appDrawer.classList.toggle('open'));

        // Close drawer when clicking outside
        document.addEventListener('click', (e) => {
            if (appDrawer.classList.contains('open') && 
                !appDrawer.contains(e.target) && 
                e.target !== drawerToggle) {
                appDrawer.classList.remove('open');
            }
        });

        // Search Functionality
        const searchToggleBtn = document.getElementById('searchToggleBtn');
        const searchPopover = document.getElementById('searchPopover');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        searchToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchPopover.classList.toggle('hidden');
            if (!searchPopover.classList.contains('hidden')) {
                searchInput.focus();
                searchInput.value = '';
                searchResults.innerHTML = '';
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchPopover.classList.contains('hidden') && 
                !searchPopover.contains(e.target) && 
                e.target !== searchToggleBtn) {
                searchPopover.classList.add('hidden');
            }
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            const items = getItems().filter(i => 
                i.name.toLowerCase().includes(query) ||
                (i.shop || '').toLowerCase().includes(query) ||
                (i.serial || '').toLowerCase().includes(query) ||
                (i.pgSerial || '').toLowerCase().includes(query) ||
                (i.kind || '').toLowerCase().includes(query)
            );
            
            searchResults.innerHTML = items.map(item => {
                const status = calculateStatus(item);
                const daysUntilExpiry = getDaysUntilExpiry(item);
                const statusClass = status === 'expiringSoon' ? 'soon' : status;
                const showNewTag = isItemNew(item);
                const isImported = isItemImported(item);
                
                return `
                    <li class="list-item ${statusClass} ${isImported ? 'imported-item' : ''}" onclick="openDetails('${item.id}'); searchPopover.classList.add('hidden');">
                        <div class="item-header">
                            <div class="item-name">${escapeHtml(item.name)} ${showNewTag ? '<span class="badge">NEW</span>' : ''}</div>
                            <div class="days-badge ${status === 'expired' ? 'expired' : ''}">${daysUntilExpiry}</div>
                        </div>
                        <div class="item-meta">${escapeHtml(item.pgSerial)} | ${escapeHtml(item.shop || 'No Shop')}</div>
                    </li>
                `;
            }).join('') || `<li class="no-data-msg">No results for "${escapeHtml(query)}".</li>`;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchPopover.classList.remove('hidden');
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                searchPopover.classList.add('hidden');
            }
        });

        // Show welcome message
        const firstLoad = localStorage.getItem('pg_first_load');
        if (!firstLoad) {
            setTimeout(() => {
                showSnackbar('Welcome to Proof Guard! Your data is stored locally in your browser.', 'info');
                localStorage.setItem('pg_first_load', 'true');
            }, 1000);
        }

        // Auto-check for expiring items
        setTimeout(() => {
            const soonItems = getItems().filter(i => calculateStatus(i) === 'expiringSoon');
            if (soonItems.length > 0) {
                showSnackbar(`You have ${soonItems.length} item(s) expiring soon! Check notifications.`, 'info');
            }
        }, 2000);

    } catch (e) {
        console.error("Error in init:", e);
        showSnackbar("Error initializing app", "error");
    }
}

// Handle page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}