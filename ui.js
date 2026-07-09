const UI = {
    async init() {
        await State.init();
        Calendar.init();
        this.setupEventListeners();
        this.populateDropdowns();
    },

    setupEventListeners() {
        document.getElementById('prev-month-btn').addEventListener('click', () => Calendar.changeMonth(-1));
        document.getElementById('next-month-btn').addEventListener('click', () => Calendar.changeMonth(1));
        
        // Go to Today
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

        document.getElementById('form-transaction').addEventListener('submit', this.handleTransactionSubmit.bind(this));
        document.getElementById('form-add-gown').addEventListener('submit', this.handleAddGownSubmit.bind(this));
        document.getElementById('form-memo').addEventListener('submit', this.handleMemoSubmit.bind(this));
        document.getElementById('form-reschedule').addEventListener('submit', this.handleRescheduleSubmit.bind(this));
    },

    openModal(id) { document.getElementById(id).classList.add('active'); },
    closeModal(id) { 
        document.getElementById(id).classList.remove('active'); 
        const form = document.getElementById(id).querySelector('form');
        if(form) form.reset();
        if(id === 'modal-transaction') {
            document.getElementById('new-user-fields').style.display = 'none';
            document.getElementById('custom-deposit-field').style.display = 'none';
        }
    },

    populateDropdowns() {
        const gownSelect = document.getElementById('trans-gown');
        gownSelect.innerHTML = '<option value="">-- Select Gown --</option>';
        State.data.gowns.forEach(g => {
            gownSelect.innerHTML += `<option value="${g.id}">${g.id} - ${g.name}</option>`;
        });

        const userSelect = document.getElementById('trans-user');
        userSelect.innerHTML = `<option value="">-- Select Existing or Add New --</option><option value="NEW">+ Add New Customer</option>`;
        State.data.users.forEach(u => {
            userSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.phone})</option>`;
        });
    },

    calculateCleaningDate(lendDateStr) {
        const d = new Date(lendDateStr);
        d.setDate(d.getDate() - 21);
        return d.toISOString().split('T')[0];
    },

    async handleTransactionSubmit(e) {
        e.preventDefault();
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
            gownId: document.getElementById('trans-gown').value,
            userId: userId,
            lendDate: lendDate,
            cleaningDate: cleaningDate,
            deposit: depositVal
        });

        this.closeModal('modal-transaction');
        Calendar.render();
        if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
    },
    
    async deleteTransaction(id) {
        if(confirm("Are you sure you want to delete this event? This will remove BOTH the scheduled cleaning and lending for this transaction.")) {
            await State.deleteTransaction(id);
            Calendar.render();
            if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
        }
    },

    // Gowns UI
    renderGowns() {
        const list = document.getElementById('gown-list');
        list.innerHTML = '';
        State.data.gowns.forEach(g => {
            list.innerHTML += `
                <div class="gown-item">
                    <div><strong>${g.id}</strong> - ${g.name}</div>
                    <div style="display:flex; gap:5px;">
                        <button type="button" class="btn secondary small" onclick="UI.editGown('${g.id}')">Edit</button>
                        <button type="button" class="btn danger small" onclick="UI.deleteGown('${g.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    },
    
    async handleAddGownSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('new-gown-id').value;
        const name = document.getElementById('new-gown-name').value;
        if(!State.addGown(id, name)) {
            alert("This Gown ID already exists!");
        } else {
            document.getElementById('form-add-gown').reset();
            document.getElementById('new-gown-id').value = State.getNextGownId();
            this.renderGowns();
            this.populateDropdowns();
        }
    },
    
    editGown(id) {
        const g = State.getGown(id);
        const newId = prompt(`Edit Barcode / ID:`, g.id);
        if(!newId || newId.trim() === '') return;
        
        const newName = prompt(`Edit Name / Description:`, g.name);
        if(!newName || newName.trim() === '') return;

        if(!State.updateGown(id, newId.trim(), newName.trim())) {
            alert("Update Failed: That Barcode/ID is already in use by another gown.");
        } else {
            this.renderGowns();
            this.populateDropdowns();
            Calendar.render();
            if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
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

    // Sidebar & Memos
    renderSidebar(dateStr) {
        document.getElementById('sidebar-date-title').textContent = new Date(dateStr).toDateString();
        const content = document.getElementById('sidebar-content');
        content.innerHTML = '';

        let hasItems = false;

        State.data.transactions.filter(t => t.cleaningDate === dateStr).forEach(t => {
            hasItems = true;
            const u = State.getUser(t.userId);
            const g = State.getGown(t.gownId);
            content.innerHTML += `
                <div class="detail-card clean">
                    <h4>🧹 Gown Cleaning (${g ? g.id : t.gownId})</h4>
                    <p>Reserved for: ${u ? u.name : 'Unknown'}</p>
                    <div style="display:flex; gap:5px;">
                        <button class="btn secondary small" onclick="UI.promptReschedule('${t.id}', 'CLEAN', '${dateStr}')">Reschedule</button>
                        <button class="btn danger small" onclick="UI.deleteTransaction('${t.id}')">Delete</button>
                    </div>
                </div>
            `;
        });

        State.data.transactions.filter(t => t.lendDate === dateStr).forEach(t => {
            hasItems = true;
            const u = State.getUser(t.userId);
            const g = State.getGown(t.gownId);
            content.innerHTML += `
                <div class="detail-card lend">
                    <h4>👗 Lending Out (${g ? g.id : t.gownId})</h4>
                    <p>Customer: ${u ? u.name : 'Unknown'} (${u ? u.phone : 'No Phone'})</p>
                    <p>Deposit: $${t.deposit}</p>
                    <div style="display:flex; gap:5px;">
                        <button class="btn secondary small" onclick="UI.promptReschedule('${t.id}', 'LEND', '${dateStr}')">Reschedule</button>
                        <button class="btn danger small" onclick="UI.deleteTransaction('${t.id}')">Delete</button>
                    </div>
                </div>
            `;
        });

        State.data.events.filter(e => e.date === dateStr).forEach(e => {
            hasItems = true;
            content.innerHTML += `
                <div class="detail-card event">
                    <h4>📝 Memo</h4>
                    <p>${e.title}</p>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <button class="btn secondary small" onclick="UI.promptReschedule('${e.id}', 'EVENT', '${dateStr}')">Reschedule</button>
                        <button class="btn danger small" onclick="UI.deleteMemo('${e.id}')">Delete</button>
                    </div>
                </div>
            `;
        });

        if(!hasItems) {
            content.innerHTML += '<p class="empty-state">No cleanings, lendings, or memos scheduled for this day.</p>';
        }

        content.innerHTML += `
            <div style="margin-top: 20px;">
                <button class="btn secondary full-width" onclick="UI.promptAddMemo('${dateStr}')">+ Add Memo for this Date</button>
            </div>
        `;
    },

    promptAddMemo(dateStr) {
        document.getElementById('memo-date').value = dateStr;
        this.openModal('modal-memo');
    },

    async handleMemoSubmit(e) {
        e.preventDefault();
        const date = document.getElementById('memo-date').value;
        const text = document.getElementById('memo-text').value;
        await State.addMemo({ date, text });
        this.closeModal('modal-memo');
        Calendar.render();
        if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
    },

    async deleteMemo(id) {
        if(confirm("Delete this memo?")) {
            await State.deleteMemo(id);
            Calendar.render();
            if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
        }
    },

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
        const id = document.getElementById('reschedule-id').value;
        const type = document.getElementById('reschedule-type').value;
        const newDate = document.getElementById('reschedule-date').value;
        await State.reschedule(id, type, newDate);
        this.closeModal('modal-reschedule');
        Calendar.render();
        if(Calendar.selectedDateStr) this.renderSidebar(Calendar.selectedDateStr);
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
