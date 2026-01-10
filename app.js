document.addEventListener('alpine:init', () => {
    Alpine.store('fortress', {
        // --- UI State ---
        tab: 'calc',
        storageStatus: 'Initializing...',
        showManageFunds: false,
        
        // --- Form State (Sticky Inputs) ---
        newFundName: '',
        newTodoTitle: '',
        newTodoDate: '',
        surplus: 0,

        // --- Data ---
        fileName: 'fortress_v8_final.json',
        masterFunds: ['ICICI Savings', 'Axis Short Duration', 'ICICI BAF', 'UTI Nifty 50 Index', 'SBI Gold Fund'],
        allocations: [
            { fundName: 'ICICI Savings', ratio: 50 },
            { fundName: 'Axis Short Duration', ratio: 30 },
            { fundName: 'ICICI BAF', ratio: 20 }
        ],
        history: [],
        todos: [],

        // --- Initialization ---
        async init() {
            try {
                // Ensure we are in a secure context before even trying
                if (!window.isSecureContext) {
                    throw new Error("Not a secure context");
                }
        
                // Wait a tiny bit for the browser to stabilize the Origin
                await new Promise(resolve => setTimeout(resolve, 100));
        
                const root = await navigator.storage.getDirectory();
                const fileHandle = await root.getFileHandle(this.fileName, { create: true });
                
                const file = await fileHandle.getFile();
                const text = await file.text();
                
                if (text) {
                    const data = JSON.parse(text);
                    this.history = data.history || [];
                    this.todos = data.todos || [];
                    this.masterFunds = data.masterFunds || this.masterFunds;
                    this.allocations = data.allocations || this.allocations;
                }
                
                this.storageStatus = 'STORAGE: SECURE (OPFS)';
                
                // Request persistent storage so the browser doesn't clear it
                if (navigator.storage && navigator.storage.persist) {
                    const isPersisted = await navigator.storage.persist();
                    console.log("Storage persisted:", isPersisted);
                }
        
            } catch (e) {
                console.error("OPFS Initialization Failed:", e);
                this.storageStatus = 'STORAGE: LOCAL CACHE (INSECURE)';
            }
        },

        // --- Actions ---
        async saveData() {
            try {
                const root = await navigator.storage.getDirectory();
                const fileHandle = await root.getFileHandle(this.fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify({
                    history: this.history,
                    todos: this.todos,
                    masterFunds: this.masterFunds,
                    allocations: this.allocations
                }));
                await writable.close();
            } catch (e) { console.error("Save Error:", e); }
        },

        logInvestment() {
            if (this.surplus <= 0) return;
            const summary = this.allocations.filter(a => a.ratio > 0).map(a => `${a.fundName} (${a.ratio}%)`).join(' | ');
            this.history.unshift({
                date: new Date().toLocaleDateString('en-IN'),
                total: this.surplus,
                summary: summary,
                detail: JSON.parse(JSON.stringify(this.allocations))
            });
            this.saveData();
            this.tab = 'history';
        },

        addMasterFund() {
            if (this.newFundName.trim()) {
                this.masterFunds.push(this.newFundName.trim());
                this.newFundName = '';
                this.saveData();
            }
        },

        addTodo() {
            if (this.newTodoTitle.trim() && this.newTodoDate) {
                this.todos.push({ title: this.newTodoTitle, date: this.newTodoDate, completed: false });
                this.todos.sort((a, b) => new Date(a.date) - new Date(b.date));
                this.newTodoTitle = ''; this.newTodoDate = '';
                this.saveData();
            }
        },

        // --- Getters ---
        get totalSaved() {
            return this.history.reduce((sum, entry) => sum + (entry.total || 0), 0);
        },

        getFundTotals() {
            let totals = {};
            this.masterFunds.forEach(f => totals[f] = 0);
            this.history.forEach(entry => {
                if (entry.detail) {
                    entry.detail.forEach(alloc => {
                        let amount = (entry.total * (alloc.ratio || 0)) / 100;
                        if (totals.hasOwnProperty(alloc.fundName)) totals[alloc.fundName] += amount;
                    });
                }
            });
            return totals;
        },

        // --- View Helpers ---
        async loadPartial(tabName) {
            const response = await fetch(`partials/${tabName}.html`);
            return await response.text();
        },
        formatCurrency(v) { return (v || 0).toLocaleString('en-IN'); },
        formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); },
        exportData() {
            const data = JSON.stringify({ history: this.history, todos: this.todos, masterFunds: this.masterFunds }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fortress_backup.json`;
            a.click();
        }
    });
});
