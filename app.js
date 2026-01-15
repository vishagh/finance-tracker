document.addEventListener('alpine:init', () => {
    Alpine.store('fortress', {
        // --- State ---
        tab: 'calc',
        surplus: 0,
        logDate: new Date().toISOString().split('T')[0],
        storageStatus: 'Initializing...',
        showManageFunds: false,
        visibleLimit: 5,
        showInsights: false,
        newFundName: '',
        newFundCategory: 'equity',
        newTodoTitle: '',
        newTodoDate: '',

        // --- Configurable Settings ---
        settings: {
            emergencyTarget: 600000,
            wealthTarget: 5000000
        },

        // --- Data Persistence ---
        fileName: 'fortress_v9_logic.json',
        masterFunds: [
            { name: 'ICICI Savings', category: 'debt' },
            { name: 'Axis Short Duration', category: 'debt' },
            { name: 'ICICI BAF', category: 'equity' },
            { name: 'UTI Nifty 50 Index', category: 'equity' },
            { name: 'SBI Gold Fund', category: 'commodity' }
        ],
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
                    this.settings = data.settings || this.settings;
                }
                this.storageStatus = 'STORAGE: SECURE (OPFS)';
                if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
            } catch (e) {
                console.error("Storage Error:", e);
                this.storageStatus = 'STORAGE: LOCAL CACHE';
            }
        },

        // --- Non-Destructive View Getters ---
        get totalWealth() {
            return this.history.reduce((sum, entry) => sum + (entry.total || 0), 0);
        },

        get emergencyWealth() {
            return this.history.reduce((totalDebt, entry) => {
                if (!entry.detail) return totalDebt;
                const entryDebt = entry.detail.reduce((subSum, alloc) => {
                    const fund = this.masterFunds.find(f => f.name === alloc.fundName);
                    return (fund && fund.category === 'debt') 
                        ? subSum + (entry.total * (alloc.ratio || 0)) / 100 
                        : subSum;
                }, 0);
                return totalDebt + entryDebt;
            }, 0);
        },

        get groupedHistory() {
            const sorted = [...this.history].sort((a, b) => {
                const dateA = new Date(a.isoDate || a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.isoDate || b.date.split('/').reverse().join('-'));
                return dateB - dateA;
            });
            const groups = {};
            sorted.forEach(entry => {
                if (!groups[entry.date]) groups[entry.date] = [];
                const cleanedSummary = entry.summary ? entry.summary.replace(/\s\(\d+%\)/g, '') : '';
                groups[entry.date].push({
                    ...entry,
                    cleanSummary: cleanedSummary,
                    originalIndex: this.history.indexOf(entry)
                });
            });
            return groups;
        },

        get paginatedGroups() {
            const keys = Object.keys(this.groupedHistory);
            const paginated = {};
            keys.slice(0, this.visibleLimit).forEach(key => {
                paginated[key] = this.groupedHistory[key];
            });
            return paginated;
        },

        get hasMore() {
            return Object.keys(this.groupedHistory).length > this.visibleLimit;
        },

        get strategicInsights() {
            const now = new Date();
            const thisYearEntries = this.history.filter(e => new Date(e.isoDate || e.date).getFullYear() === now.getFullYear());
            const yearlyTotal = thisYearEntries.reduce((sum, e) => sum + e.total, 0);
            const avg = thisYearEntries.length > 0 ? yearlyTotal / (now.getMonth() + 1) : 0;
            
            let suggestion = "Maintain SIP momentum.";
            if (this.emergencyWealth < this.settings.emergencyTarget) suggestion = "Priority: 6L Fortress.";
            else if (this.totalWealth > 1000000) suggestion = "Increase Equity to 70%.";

            return {
                avgMonthly: avg,
                burnRateCovered: (this.emergencyWealth / 100000).toFixed(1),
                suggestion: suggestion
            };
        },

        // --- Core Actions ---
        async saveData() {
            try {
                const root = await navigator.storage.getDirectory();
                const fileHandle = await root.getFileHandle(this.fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify({
                    history: this.history, todos: this.todos,
                    masterFunds: this.masterFunds, allocations: this.allocations,
                    settings: this.settings
                }));
                await writable.close();
            } catch (e) { console.error("Save failed", e); }
        },

        logInvestment() {
            if (this.surplus <= 0) return;
            const summary = this.allocations.filter(a => a.ratio > 0).map(a => `${a.fundName} (${a.ratio}%)`).join(' | ');
            this.history.unshift({
                date: new Date(this.logDate).toLocaleDateString('en-IN'),
                isoDate: this.logDate,
                total: this.surplus,
                summary: summary,
                detail: JSON.parse(JSON.stringify(this.allocations))
            });
            this.history.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
            this.saveData();
            this.surplus = 0;
            this.tab = 'history';
        },

        loadMore() { this.visibleLimit += 5; },

        removeHistoryEntry(index) {
            if (confirm("Delete this record?")) {
                this.history.splice(index, 1);
                this.saveData();
            }
        },

        addMasterFund() {
            if (this.newFundName.trim()) {
                this.masterFunds.push({ name: this.newFundName.trim(), category: this.newFundCategory });
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

        exportData() {
            const data = JSON.stringify({ history: this.history, todos: this.todos, masterFunds: this.masterFunds, settings: this.settings }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `fortress_backup.json`;
            a.click();
        },

        async importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = JSON.parse(e.target.result);
                    this.history = content.history || [];
                    this.todos = content.todos || [];
                    this.masterFunds = content.masterFunds || this.masterFunds;
                    this.settings = content.settings || this.settings;
                    await this.saveData();
                    alert("Import Successful!");
                    this.tab = 'history';
                } catch (err) { alert("Invalid Backup File"); }
            };
            reader.readAsText(file);
        },

        getFundTotals() {
            let totals = {};
            this.masterFunds.forEach(f => totals[f.name] = 0);
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

        formatCurrency(v) { return (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); },
        formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); },
        async loadPartial(tabName) {
            const response = await fetch(`partials/${tabName}.html`);
            return await response.text();
        }
    });
});