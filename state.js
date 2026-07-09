const State = {
    data: {
        gowns: [],
        users: [],
        transactions: [],
        events: [] 
    },
    
    isSaving: false,
    saveQueue: false,

    async init() {
        let gistData = await Api.fetchGistData();
        
        if (!gistData) {
            // Start completely empty, let the manager add gowns
            this.data.gowns = [];
            await this.save(); 
        } else {
            this.data = gistData;
        }
    },

    async save() {
        if (this.isSaving) {
            this.saveQueue = true;
            return;
        }
        
        this.isSaving = true;
        const btn = document.getElementById('submit-transaction');
        if(btn) { btn.textContent = "Saving..."; btn.disabled = true; }
        
        await Api.saveGistData(this.data);
        
        this.isSaving = false;
        if(btn) { btn.textContent = "Save Transaction"; btn.disabled = false; }

        if (this.saveQueue) {
            this.saveQueue = false;
            this.save(); 
        }
    },

    addTransaction(transaction) {
        transaction.id = 'T-' + Date.now();
        this.data.transactions.push(transaction);
        return this.save();
    },
    
    deleteTransaction(id) {
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        return this.save();
    },

    addUser(user) {
        user.id = 'U-' + Date.now();
        this.data.users.push(user);
        return this.save();
    },

    // Gown Management
    getNextGownId() {
        if (this.data.gowns.length === 0) return "GWN-0001";
        let max = 0;
        this.data.gowns.forEach(g => {
            const match = g.id.match(/^GWN-(\d+)$/i);
            if(match) {
                const num = parseInt(match[1], 10);
                if(num > max) max = num;
            }
        });
        if (max === 0) return `GWN-${String(this.data.gowns.length + 1).padStart(4, '0')}`;
        return `GWN-${String(max + 1).padStart(4, '0')}`;
    },

    addGown(id, name) {
        if (this.data.gowns.find(g => g.id === id)) return false; 
        this.data.gowns.push({ id, name });
        this.save();
        return true;
    },

    updateGown(oldId, newId, newName) {
        if (oldId !== newId && this.data.gowns.find(x => x.id === newId)) return false; // New ID is already taken
        
        const g = this.data.gowns.find(x => x.id === oldId);
        if(g) {
            g.id = newId;
            g.name = newName;

            // Cascade the ID change to any transactions using this gown
            this.data.transactions.forEach(t => {
                if (t.gownId === oldId) t.gownId = newId;
            });
        }
        return this.save();
    },

    deleteGown(id) {
        this.data.gowns = this.data.gowns.filter(x => x.id !== id);
        return this.save();
    },

    // Memos (Events)
    addMemo(memo) {
        memo.id = 'M-' + Date.now();
        this.data.events.push({
            id: memo.id,
            title: memo.text,
            date: memo.date
        });
        return this.save();
    },
    
    deleteMemo(id) {
        this.data.events = this.data.events.filter(e => e.id !== id);
        return this.save();
    },

    reschedule(id, type, newDate) {
        if(type === 'LEND') {
            const t = this.data.transactions.find(x => x.id === id);
            if(t) t.lendDate = newDate;
        } else if (type === 'CLEAN') {
            const t = this.data.transactions.find(x => x.id === id);
            if(t) t.cleaningDate = newDate;
        } else if (type === 'EVENT') {
            const e = this.data.events.find(x => x.id === id);
            if(e) e.date = newDate;
        }
        return this.save();
    },

    getUser(userId) { return this.data.users.find(u => u.id === userId); },
    getGown(gownId) { return this.data.gowns.find(g => g.id === gownId); }
};
