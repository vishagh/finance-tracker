document.addEventListener('alpine:init', () => {
    Alpine.store('fortress', {
        // --- State ---
        tab: 'calc',
        surplus: 0,
        storageStatus: 'Initializing...',
        showManageFunds: false,
        newFundName: '',
        newTodoTitle: '',
        newTodoDate: '',
        fileName: 'fortress_v8_final.json',
        
        // --- Data Arrays ---
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
                if (!window.isSecureContext) throw new Error("Insecure Context");
                
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
                
                // Persistence Request
                if (navigator.storage && navigator.storage.persist) {
                    await navigator.storage.persist();
                }
            } catch (e) {
                console.error("OPFS Error:", e);
                this.storageStatus = 'STORAGE: LOCAL CACHE';
            }
        },

        // --- Core Methods ---
        async loadPartial(tabName) {
            try {
                const response = await fetch(`partials/${tabName}.html`);
                if (!response.ok) throw new Error('Fetch failed');
                return await response.text();
            } catch (e) {
                return `<div class="p-4 bg-red-50 text-red-500 rounded-xl">Error loading ${tabName} partial.</div>`;
            }
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

        removeHistoryEntry(index) {
            if (confirm("Permanently delete this record? This will affect your total progress.")) {
                this.history.splice(index, 1);
                this.saveData();
            }
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
            } catch (e) { console.error("Save failed", e); }
        },

        // --- Getters (Computed) ---
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

        // --- Helpers ---
        formatCurrency(v) { return (v || 0).toLocaleString('en-IN'); },
        formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); },
        exportData() {
            const data = JSON.stringify({ history: this.history, todos: this.todos, masterFunds: this.masterFunds }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'fortress_backup.json'; a.click();
        },
        // Inside app.js -> Alpine.store('fortress', { ... })

        async importData(event) {
            const file = event.target.files[0];
            if (!file) return;
        
            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const content = JSON.parse(e.target.result);
                    
                    // 1. Update the live State
                    this.history = content.history || [];
                    this.todos = content.todos || [];
                    this.masterFunds = content.masterFunds || this.masterFunds;
                    this.allocations = content.allocations || this.allocations;
        
                    // 2. Persist to OPFS immediately
                    await this.saveData();
                    
                    alert("Data Imported Successfully! Fortress has been restored.");
                    
                    // 3. Optional: Reset to history tab to see the results
                    this.tab = 'history';
                };
                reader.readAsText(file);
            } catch (err) {
                console.error("Import failed:", err);
                alert("Failed to import file. Ensure it is a valid Fortress backup JSON.");
            }
        },
    });
});
