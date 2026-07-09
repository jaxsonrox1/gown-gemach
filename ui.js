const UI = {
    async init() {
        await State.init();
        this.checkAuth();
        Calendar.init();
        this.setupEventListeners();
        this.populateDropdowns();
    },
    
    checkAuth() {
        const overlay = document.getElementById('auth-overlay');
        const savedAuth = localStorage.getItem('gemach_auth');
        if(savedAuth === State.data.settings.password) {
            overlay.style.display = 'none';
        } else {
            overlay.style.display = 'flex';
        }
        
        document.getElementById('form-auth').addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = document.getElementById('auth-password').value;
            if(pass === State.data.settings.password) {
                localStorage.setItem('gemach_auth', pass);
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 300);
            } else {
                document.getElementById('auth-error').style.display = 'block';
            }
        });
    },

    setupEventListeners() {
        document.getElementById('prev-month-btn').addEventListener('click', () => Calendar.changeMonth(-1));
        document.getElementById('next-month-btn').addEventListener('click', () => Calendar.changeMonth(1));
        
        document.getElementById('btn-today').addEventListener('click', () => {
            const today = new Date();
            Calendar.currentDate = today;
            Calendar.selectedDateStr = Calendar.formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
            Calendar.render();
            this.renderSidebar(Calendar.selectedDateStr);
        });

        // Open Modals
        document.getElementById('btn-add-transaction').addEventListener('click', () => {
            this.populateDropdowns();
            this.openModal('modal-transaction');
        });
        document.getElementById('btn-manage-gowns').addEventListener('click', () => {
            document.getElementById('new-gown-id').value = State.getNextGownId();
            this.renderGowns();
            this.openModal('modal-gowns');
        });
        document.getElementById('btn-open-gown-selector').addEventListener('click', () => {
            this.renderGownSelectionGrid();
            this.openModal('modal-select-gown');
        });
        document.getElementById('btn-settings').addEventListener('click', () => {
            document.getElementById('set-password').value = State.data.settings.password;
            document.getElementById('set-theme').value = State.data.settings.theme;
            document.getElementById('set-accent').value = State.data.settings.accent;
            document.getElementById('set-secondary').value = State.data.settings.secondary;
            this.openModal('modal-settings');
        });

        // Close Modals
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.dataset.modal));
        });

        // Forms
        document.getElementById('trans-user').addEventListener('change', (e) => {
            document.getElementById('new-user-fields').style.display = e.target.value === 'NEW' ? 'block' : 'none';
        });
        document.getElementById('trans-deposit').addEventListener('change', (e) => {
            document.getElementById('custom-deposit-field').style.display = e.target.value === 'CUSTOM' ? 'block' : 'none';
        });
        
        // Search filter for gown selection
        document.getElementById('search-gown').addEventListener('input', (e) => this.renderGownSelectionGrid(e.target.value));

        document.getElementById('form-transaction').addEventListener('submit', this.handleTransactionSubmit.bind(this));
        document.getElementById('form-add-gown').addEventListener('submit', this.handleAddGownSubmit.bind(this));
        document.getElementById('form-edit-gown').addEventListener('submit', this.handleEditGownSubmit.bind(this));
        document.getElementById('form-memo').addEventListener('submit', this.handleMemoSubmit.bind(this));
        document.getElementById('form-reschedule').addEventListener('submit', this.handleRescheduleSubmit.bind(this));
        document.getElementById('form-settings').addEventListener('submit', this.handleSettingsSubmit.bind(this));
    },

    openModal(id) { document.getElementById(id).classList.add('active'); },
    closeModal(id) { 
        document.getElementById(id).classList.remove('active'); 
        const form = document.getElementById(id).querySelector('form');
        if(form) form.reset();
        if(id === 'modal-transaction') {
            document.getElementById('new-user-fields').style.display = 'none';
            document.getElementById('custom-deposit-field').style.display = 'none';
            document.getElementById('trans-gown').value = '';
            document.getElementById('selected-gown-text').textContent = 'No Gown Selected';
        }
    },
    
    compressImage(file, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL('image/jpeg', 0.6)); 
            }
        }
    },

    populateDropdowns() {
        const userSelect = document.getElementById('trans-user');
        userSelect.innerHTML = `<option value="">-- Select Existing or Add New --</option><option value="NEW">+ Add New Customer</option>`;
        State.data.users.forEach(u => {
            userSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.phone})</option>`;
        });
    },
    
    renderGownSelectionGrid(searchQuery = '') {
        const grid = document.getElementById('gown-selection-grid');
        grid.innerHTML = '';
        const lowerSearch = searchQuery.toLowerCase();
        
        State.data.gowns.forEach(g => {
            if (g.id.toLowerCase().includes(lowerSearch) || g.name.toLowerCase().includes(lowerSearch)) {
                const imgHTML = g.imageUrl ? `<img src="${g.imageUrl}" class="gown-image" alt="Gown">` : `<div class="gown-image placeholder">No Image</div>`;
                
                const card = document.createElement('div');
                card.className = 'gown-card';
                card.innerHTML = `
                    ${imgHTML}
                    <div class="gown-info" style="padding: 10px;">
                        <div style="font-size:0.9rem;"><strong>${g.id}</strong><br><span style="color:var(--text-muted);">${g.name}</span></div>
                    </div>
                `;
                card.onclick = () => {
                    document.getElementById('trans-gown').value = g.id;
                    document.getElementById('selected-gown-text').textContent = `${g.id} - ${g.name}`;
                    this.closeModal('modal-select-gown');
                };
                grid.appendChild(card);
            }
        });
    },

    calculateCleaningDate(lendDateStr) {
        const d = new Date(lendDateStr);
        d.setDate(d.getDate() - 21);
        return d.toISOString().split('T')[0];
    },

    async handleTransactionSubmit(e) {
        e.preventDefault();
        
        const gownId = document.getElementById('trans-gown').value;
        if (!gownId) { alert("Please select a gown."); return; }

        let userId = document.getElementById('trans-user').value;
        if (userId === 'NEW') {
            const newUser = {
                name: document.getElementById('nu-name').value,
                phone: document.getElementById('nu-phone').value,
                email: document.getElementById('nu-email').value
            };
            await State.addUser(newUser);
            userId = State.data.users[State.data.users.length - 1].id;
        }

        let depositVal = document.getElementById('trans-deposit').value;
        if(depositVal === 'CUSTOM') depositVal = document.getElementById('trans-custom-deposit').value;

        const lendDate = document.getElementById('trans-date').value;
        const cleaningDate = this.calculateCleaningDate(lendDate);

        await State.addTransaction({
            gownId: gownId,
            userId: userId,
            lendDate: lendDate,
            cleaningDate: cleaningDate,
            deposit: depositVal
        });

        this.closeModal('modal-transaction');
        Calendar.render();
        if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
    },
    
    async handleSettingsSubmit(e) {
        e.preventDefault();
        const newSettings = {
            password: document.getElementById('set-password').value,
            theme: document.getElementById('set-theme').value,
            accent: document.getElementById('set-accent').value,
            secondary: document.getElementById('set-secondary').value
        };
        await State.updateSettings(newSettings);
        localStorage.setItem('gemach_auth', newSettings.password); 
        this.closeModal('modal-settings');
    },

    renderGowns() {
        const list = document.getElementById('gown-list');
        list.innerHTML = '';
        State.data.gowns.forEach(g => {
            const imgHTML = g.imageUrl ? `<img src="${g.imageUrl}" class="gown-image" alt="Gown">` : `<div class="gown-image placeholder">No Image</div>`;
            
            const history = State.getGownHistory(g.id);
            let historyHTML = '';
            if (history.length === 0) {
                historyHTML = '<div class="history-item">No history found.</div>';
            } else {
                history.forEach(h => { historyHTML += `<div class="history-item"><strong>${h.action}:</strong> ${h.date}</div>`; });
            }

            list.innerHTML += `
                <div class="gown-card">
                    ${imgHTML}
                    <div class="gown-info">
                        <div><strong>${g.id}</strong><br><span style="color:var(--text-muted);font-size:0.9rem;">${g.name}</span></div>
                        <div style="display:flex; gap:5px; flex-wrap:wrap;">
                            <button type="button" class="btn secondary small" style="flex:1;" onclick="UI.promptEditGown('${g.id}')">Edit</button>
                            <button type="button" class="btn danger small" style="flex:1;" onclick="UI.deleteGown('${g.id}')">Delete</button>
                        </div>
                        <button type="button" class="btn small" style="background:var(--surface); color:var(--text-main); border: 1px solid var(--border-color);" onclick="UI.toggleHistory('${g.id}')">View History</button>
                        <div id="history-${g.id}" class="history-list" style="display:none; max-height:100px; overflow-y:auto; font-size:0.8rem;">
                            ${historyHTML}
                        </div>
                    </div>
                </div>
            `;
        });
    },

    toggleHistory(id) {
        const el = document.getElementById(`history-${id}`);
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    },
    
    handleAddGownSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('new-gown-id').value;
        const name = document.getElementById('new-gown-name').value;
        const fileInput = document.getElementById('new-gown-image-file');

        const finishAdd = (base64Img) => {
            if(!State.addGown(id, name, base64Img)) {
                alert("This Gown ID already exists!");
            } else {
                document.getElementById('form-add-gown').reset();
                document.getElementById('new-gown-id').value = State.getNextGownId();
                this.renderGowns();
                this.populateDropdowns();
            }
        };

        if (fileInput.files && fileInput.files[0]) {
            this.compressImage(fileInput.files[0], finishAdd);
        } else {
            finishAdd('');
        }
    },
    
    promptEditGown(id) {
        const g = State.getGown(id);
        document.getElementById('edit-gown-original-id').value = g.id;
        document.getElementById('edit-gown-id').value = g.id;
        document.getElementById('edit-gown-name').value = g.name;
        document.getElementById('edit-gown-image-file').value = '';
        this.openModal('modal-edit-gown');
    },

    handleEditGownSubmit(e) {
        e.preventDefault();
        const oldId = document.getElementById('edit-gown-original-id').value;
        const newId = document.getElementById('edit-gown-id').value.trim();
        const newName = document.getElementById('edit-gown-name').value.trim();
        const fileInput = document.getElementById('edit-gown-image-file');

        const finishEdit = (base64Img) => {
            if(!State.updateGown(oldId, newId, newName, base64Img)) {
                alert("Update Failed: That Barcode/ID is already in use by another gown.");
            } else {
                this.closeModal('modal-edit-gown');
                this.renderGowns();
                this.populateDropdowns();
                Calendar.render();
                if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
            }
        };

        if (fileInput.files && fileInput.files[0]) {
            this.compressImage(fileInput.files[0], finishEdit);
        } else {
            finishEdit(undefined); 
        }
    },
    
    deleteGown(id) {
        if(confirm(`Are you sure you want to delete gown ${id}?`)) {
            State.deleteGown(id);
            this.renderGowns();
            this.populateDropdowns();
            Calendar.render();
        }
    },

    renderSidebar(dateStr) {
        const localDate = new Date(dateStr + 'T00:00:00');
        document.getElementById('sidebar-date-title').textContent = localDate.toDateString();
        
        const content = document.getElementById('sidebar-content');
        content.innerHTML = '';
        let hasItems = false;

        State.data.transactions.filter(t => t.cleaningDate === dateStr).forEach(t => {
            hasItems = true;
            const u = State.getUser(t.userId);
            const g = State.getGown(t.gownId);
            content.innerHTML += `<div class="detail-card clean"><h4>🧹 Gown Cleaning (${g ? g.id : t.gownId})</h4><p>Reserved for: ${u ? u.name : 'Unknown'}</p><div style="display:flex; gap:5px;"><button class="btn secondary small" onclick="UI.promptReschedule('${t.id}', 'CLEAN', '${dateStr}')">Reschedule</button><button class="btn danger small" onclick="UI.deleteTransaction('${t.id}')">Delete</button></div></div>`;
        });

        State.data.transactions.filter(t => t.lendDate === dateStr).forEach(t => {
            hasItems = true;
            const u = State.getUser(t.userId);
            const g = State.getGown(t.gownId);
            content.innerHTML += `<div class="detail-card lend"><h4>👗 Lending Out (${g ? g.id : t.gownId})</h4><p>Customer: ${u ? u.name : 'Unknown'} (${u ? u.phone : 'No Phone'})</p><p>Deposit: $${t.deposit}</p><div style="display:flex; gap:5px;"><button class="btn secondary small" onclick="UI.promptReschedule('${t.id}', 'LEND', '${dateStr}')">Reschedule</button><button class="btn danger small" onclick="UI.deleteTransaction('${t.id}')">Delete</button></div></div>`;
        });

        State.data.events.filter(e => e.date === dateStr).forEach(e => {
            hasItems = true;
            content.innerHTML += `<div class="detail-card event"><h4>📝 Memo</h4><p>${e.title}</p><div style="display:flex; gap:5px; margin-top:10px;"><button class="btn secondary small" onclick="UI.promptReschedule('${e.id}', 'EVENT', '${dateStr}')">Reschedule</button><button class="btn danger small" onclick="UI.deleteMemo('${e.id}')">Delete</button></div></div>`;
        });

        if(!hasItems) { content.innerHTML += '<p class="empty-state">No cleanings, lendings, or memos scheduled for this day.</p>'; }
        content.innerHTML += `<div style="margin-top: 20px;"><button class="btn secondary full-width" onclick="UI.promptAddMemo('${dateStr}')">+ Add Memo for this Date</button></div>`;
    },

    promptAddMemo(dateStr) { document.getElementById('memo-date').value = dateStr; this.openModal('modal-memo'); },
    async handleMemoSubmit(e) { e.preventDefault(); await State.addMemo({ date: document.getElementById('memo-date').value, text: document.getElementById('memo-text').value }); this.closeModal('modal-memo'); Calendar.render(); if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr); },
    async deleteMemo(id) { if(confirm("Delete this memo?")) { await State.deleteMemo(id); Calendar.render(); if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr); } },
    
    promptReschedule(id, type, currentDate) {
        document.getElementById('reschedule-id').value = id;
        document.getElementById('reschedule-type').value = type;
        document.getElementById('reschedule-date').value = currentDate;
        const typeStr = type === 'LEND' ? 'Lending Date' : (type === 'CLEAN' ? 'Cleaning Date' : 'Memo Date');
        document.getElementById('reschedule-desc').textContent = `Select a new date for this ${typeStr}.`;
        this.openModal('modal-reschedule');
    },

    async handleRescheduleSubmit(e) {
        e.preventDefault();
        await State.reschedule(document.getElementById('reschedule-id').value, document.getElementById('reschedule-type').value, document.getElementById('reschedule-date').value);
        this.closeModal('modal-reschedule');
        Calendar.render();
        if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
