document.addEventListener('alpine:init', () => {
    Alpine.store('fortress', {
        // State
        tab: 'calc',
        surplus: 0,
        showManageFunds: false,
        newFundName: '',
        storageStatus: 'Initializing...',
        fileName: 'fortress_v8_modular.json',

        // Data Arrays
        masterFunds: ['ICICI Savings', 'Axis Short Duration', 'ICICI BAF', 'UTI Nifty 50 Index', 'SBI Gold Fund'],
        allocations: [
            { fundName: 'ICICI Savings', ratio: 50 },
            { fundName: 'Axis Short Duration', ratio: 30 },
            { fundName: 'ICICI BAF', ratio: 20 }
        ],
        history: [],
        todos: [
            { title: 'SBI FD Maturity (2.02L)', date: '2026-01-14', completed: false }
        ],

        // Initialization
        async init() {
            try {
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

                // Request Persistence
                if (navigator.storage && navigator.storage.persist) {
                    await navigator.storage.persist();
                }
                this.checkReminders();
            } catch (e) {
                this.storageStatus = 'STORAGE: SESSION ONLY';
            }
        },

        // Getters (Computed Properties)
        get totalSaved() {
            return this.history.reduce((sum, entry) => sum + (entry.total || 0), 0);
        },

        getFundTotals() {
            let totals = {};
            // Initialize totals for all master funds to 0 so they show up on history tab cards
            this.masterFunds.forEach(fund => totals[fund] = 0);

            this.history.forEach(entry => {
                if (entry.detail) {
                    entry.detail.forEach(alloc => {
                        let amount = (entry.total * (alloc.ratio || 0)) / 100;
                        // Only count it if the fund still exists in masterFunds
                        if (totals.hasOwnProperty(alloc.fundName)) {
                            totals[alloc.fundName] += amount;
                        }
                    });
                }
            });
            return totals;
        },

        // Actions
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

        addTodo(title, date) {
            this.todos.push({ title, date, completed: false });
            this.todos.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.saveData();
        },

        // Utilities
        formatCurrency(v) {
            return (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
        },

        // NEW: Partial Loader Logic
        async loadPartial(tabName) {
            try {
                const response = await fetch(`partials/${tabName}.html`);
                return await response.text();
            } catch (e) {
                return `<div class="p-4 bg-red-50 text-red-500">Error loading ${tabName} component</div>`;
            }
        },

        // RESTORED: Export Logic
        exportData() {
            const data = JSON.stringify({ 
                history: this.history, 
                todos: this.todos, 
                masterFunds: this.masterFunds,
                allocations: this.allocations 
            }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fortress_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        },

        // RESTORED: Notification Logic
        requestNotificationPermission() {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") this.saveData();
            });
        },

        checkReminders() {
            const today = new Date().toISOString().split('T')[0];
            this.todos.forEach(todo => {
                if (todo.date === today && !todo.completed && Notification.permission === 'granted') {
                    new Notification("Fortress Alert", { body: `Milestone: ${todo.title}` });
                }
            });
        },

        formatDate(d) {
            return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    });
});