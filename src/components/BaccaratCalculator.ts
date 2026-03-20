class BaccaratCalculator extends HTMLElement {
    netUnits: number;
    steps: number;
    unitHistory: number[];
    sessionStartTime: number | null;
    sessions: any[];
    isLogOpen: boolean;
    storageKey: string;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // State
        this.netUnits = 0;
        this.steps = 0;
        this.unitHistory = [];
        this.sessionStartTime = null;
        this.sessions = [];
        this.isLogOpen = false;
        this.storageKey = 'baccarat_sessions_react';
    }

    connectedCallback() {
        this.storageKey = this.getAttribute('storage-key') || 'baccarat_sessions_react';
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.sessions = JSON.parse(saved);
            }
        } catch (e) {
            this.sessions = [];
        }

        this.render();
        this.setupEventListeners();
        this.updateUI();
    }

    handleUnitChange(delta: number) {
        if (this.sessionStartTime === null) {
            this.sessionStartTime = Date.now();
        }
        this.netUnits += delta;
        this.steps += 1;
        this.unitHistory.push(delta);
        this.updateUI();
    }

    handleUndoUnitChange() {
        if (this.unitHistory.length > 0) {
            const lastDelta = this.unitHistory.pop()!;
            this.netUnits -= lastDelta;
            this.steps -= 1;
            if (this.unitHistory.length === 0) {
                this.sessionStartTime = null;
            }
            this.updateUI();
        }
    }

    handleRefreshCalculator() {
        if (this.sessionStartTime !== null && this.steps > 0) {
            const endTime = Date.now();
            const durationMs = endTime - this.sessionStartTime;
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            const durationStr = `${minutes}m ${seconds}s`;
            
            const newSession = {
                id: Math.random().toString(36).substring(2, 9),
                date: new Date().toLocaleString(),
                duration: durationStr,
                net: this.netUnits,
                steps: this.steps,
                model: 'nwb'
            };
            
            this.sessions.unshift(newSession);
            localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
        }
        
        this.netUnits = 0;
        this.steps = 0;
        this.unitHistory = [];
        this.sessionStartTime = null;
        this.updateUI();
    }

    handleExportCSV() {
        const headers = ['Date', 'Time', 'Duration', 'Steps', 'Net', 'Model'];
        const rows = this.sessions.map(session => {
            const datePart = session.date.includes(',') ? session.date.split(',')[0].trim() : session.date;
            const timePart = session.date.includes(',') ? session.date.split(',')[1]?.trim() : '';
            return [
                datePart,
                timePart,
                session.duration,
                session.steps || 0,
                session.net,
                session.model || 'nwb'
            ].join(',');
        });
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'baccarat_sessions.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    toggleCalcLog() {
        this.isLogOpen = !this.isLogOpen;
        this.updateUI();
    }

    clearAllSessions() {
        const modal = this.shadowRoot!.getElementById('calc-modal')!;
        modal.classList.remove('hidden');
    }

    confirmClearAll() {
        this.sessions = [];
        localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
        this.updateUI();
        this.closeModal();
    }

    closeModal() {
        const modal = this.shadowRoot!.getElementById('calc-modal')!;
        modal.classList.add('hidden');
    }

    setupEventListeners() {
        this.shadowRoot!.getElementById('btn-calc-minus')!.addEventListener('click', () => this.handleUnitChange(-1));
        this.shadowRoot!.getElementById('btn-calc-plus')!.addEventListener('click', () => this.handleUnitChange(1));
        this.shadowRoot!.getElementById('btn-calc-undo')!.addEventListener('click', () => this.handleUndoUnitChange());
        this.shadowRoot!.getElementById('btn-calc-refresh')!.addEventListener('click', () => this.handleRefreshCalculator());
        this.shadowRoot!.getElementById('btn-calc-log')!.addEventListener('click', () => this.toggleCalcLog());
        this.shadowRoot!.getElementById('btn-calc-export-csv')!.addEventListener('click', () => this.handleExportCSV());
        this.shadowRoot!.getElementById('btn-calc-clear-all')!.addEventListener('click', () => this.clearAllSessions());
        
        this.shadowRoot!.getElementById('btn-modal-cancel')!.addEventListener('click', () => this.closeModal());
        this.shadowRoot!.getElementById('btn-modal-confirm')!.addEventListener('click', () => this.confirmClearAll());
    }

    updateUI() {
        // Value
        const calcNetValue = this.shadowRoot!.getElementById('calc-net-value')!;
        calcNetValue.textContent = (this.netUnits > 0 ? '+' : '') + this.netUnits;
        calcNetValue.className = 'calc-value';
        if (this.netUnits > 0) calcNetValue.classList.add('positive');
        else if (this.netUnits < 0) calcNetValue.classList.add('negative');

        // Buttons
        (this.shadowRoot!.getElementById('btn-calc-undo') as HTMLButtonElement).disabled = this.unitHistory.length === 0;

        // Panel
        const calcLogPanel = this.shadowRoot!.getElementById('calc-log-panel')!;
        const btnCalcLog = this.shadowRoot!.getElementById('btn-calc-log')!;
        if (this.isLogOpen) {
            calcLogPanel.classList.remove('hidden');
            btnCalcLog.classList.add('active');
        } else {
            calcLogPanel.classList.add('hidden');
            btnCalcLog.classList.remove('active');
        }

        // Subtotal
        const subtotal = this.sessions.reduce((sum, session) => sum + session.net, 0);
        const subtotalEl = this.shadowRoot!.getElementById('calc-log-subtotal');
        if (subtotalEl) {
            subtotalEl.textContent = (subtotal > 0 ? '+' : '') + subtotal;
            subtotalEl.className = 'calc-log-subtotal-value';
            if (subtotal > 0) subtotalEl.classList.add('positive');
            else if (subtotal < 0) subtotalEl.classList.add('negative');
        }

        // List
        const calcLogEmpty = this.shadowRoot!.getElementById('calc-log-empty')!;
        const calcLogList = this.shadowRoot!.getElementById('calc-log-list')!;
        const btnCalcClearAll = this.shadowRoot!.getElementById('btn-calc-clear-all')!;
        const btnCalcExportCsv = this.shadowRoot!.getElementById('btn-calc-export-csv')!;

        if (this.sessions.length === 0) {
            calcLogEmpty.style.display = 'block';
            calcLogList.style.display = 'none';
            btnCalcClearAll.classList.add('hidden');
            btnCalcExportCsv.classList.add('hidden');
        } else {
            calcLogEmpty.style.display = 'none';
            calcLogList.style.display = 'block';
            btnCalcClearAll.classList.remove('hidden');
            btnCalcExportCsv.classList.remove('hidden');
            
            calcLogList.innerHTML = '';
            
            // Group by date
            const groupedSessions = this.sessions.reduce((acc, session) => {
                const datePart = session.date.split(',')[0];
                if (!acc[datePart]) acc[datePart] = [];
                acc[datePart].push(session);
                return acc;
            }, {});

            Object.entries(groupedSessions).forEach(([date, dateSessions]: [string, any]) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'calc-log-group';
                
                const header = document.createElement('h4');
                header.className = 'calc-log-group-header';
                header.textContent = date;
                groupDiv.appendChild(header);
                
                const tableContainer = document.createElement('div');
                tableContainer.className = 'calc-log-table-container';
                
                const table = document.createElement('table');
                table.className = 'calc-log-table';
                
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Time</th>
                        <th>Duration</th>
                        <th class="text-right">Steps</th>
                        <th class="text-right">Net</th>
                        <th class="hidden">Model</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                const tbody = document.createElement('tbody');
                dateSessions.forEach((session: any) => {
                    const tr = document.createElement('tr');
                    const timePart = session.date.split(',')[1] ? session.date.split(',')[1].trim() : session.date;
                    const netClass = session.net > 0 ? 'text-emerald' : session.net < 0 ? 'text-rose' : 'text-zinc';
                    const netText = (session.net > 0 ? '+' : '') + session.net;
                    const stepsText = session.steps || 0;
                    const modelText = session.model || 'nwb';
                    
                    tr.innerHTML = `
                        <td class="text-zinc-400">${timePart}</td>
                        <td class="text-zinc-300">${session.duration}</td>
                        <td class="text-zinc-300 text-right">${stepsText}</td>
                        <td class="font-bold text-right ${netClass}">${netText}</td>
                        <td class="hidden">${modelText}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                table.appendChild(tbody);
                tableContainer.appendChild(table);
                groupDiv.appendChild(tableContainer);
                calcLogList.appendChild(groupDiv);
            });
        }
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #18181b;
                    border-top: 1px solid rgba(39, 39, 42, 0.8);
                    flex-shrink: 0;
                    font-family: 'Inter', sans-serif;
                    color: #f4f4f5;
                }
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                .calc-container {
                    padding: 16px;
                }

                .calc-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .calc-net {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .calc-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #f4f4f5;
                }

                .calc-value.positive { color: #34d399; } /* emerald-400 */
                .calc-value.negative { color: #fb7185; } /* rose-400 */

                .calc-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-calc {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }

                .btn-calc-minus {
                    background-color: rgba(244, 63, 94, 0.1);
                    color: #fb7185;
                    border-color: rgba(244, 63, 94, 0.2);
                }

                .btn-calc-minus:hover {
                    background-color: rgba(244, 63, 94, 0.2);
                }

                .btn-calc-plus {
                    background-color: rgba(16, 185, 129, 0.1);
                    color: #34d399;
                    border-color: rgba(16, 185, 129, 0.2);
                }

                .btn-calc-plus:hover {
                    background-color: rgba(16, 185, 129, 0.2);
                }

                .btn-calc-undo {
                    background-color: #27272a; /* zinc-800 */
                    color: #d4d4d8; /* zinc-300 */
                    border-color: rgba(63, 63, 70, 0.5);
                }

                .btn-calc-undo:not(:disabled):hover {
                    background-color: #3f3f46; /* zinc-700 */
                }

                .btn-calc-undo:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .calc-divider {
                    width: 1px;
                    height: 32px;
                    background-color: #27272a;
                    margin: 0 8px;
                }

                .btn-calc-icon {
                    padding: 8px;
                    border-radius: 6px;
                    background-color: #27272a;
                    color: #d4d4d8;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-calc-icon:hover {
                    background-color: #3f3f46;
                }

                .btn-calc-icon.active {
                    background-color: rgba(6, 182, 212, 0.2);
                    color: #22d3ee; /* cyan-400 */
                }

                .calc-log-panel {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(39, 39, 42, 0.8);
                }

                .calc-log-subtotal-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding: 12px;
                    background-color: rgba(24, 24, 27, 0.5);
                    border-radius: 8px;
                    border: 1px solid rgba(39, 39, 42, 0.5);
                }

                .calc-log-subtotal-label {
                    font-size: 14px;
                    color: #a1a1aa;
                    font-weight: 500;
                }

                .calc-log-subtotal-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #f4f4f5;
                }
                .calc-log-subtotal-value.positive { color: #34d399; }
                .calc-log-subtotal-value.negative { color: #fb7185; }

                .calc-log-panel.hidden {
                    display: none;
                }

                .calc-log-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .calc-log-header h3 {
                    font-size: 14px;
                    font-weight: 600;
                    color: #d4d4d8;
                }

                .calc-log-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .btn-calc-export-csv {
                    background: none;
                    border: none;
                    color: #22d3ee;
                    font-size: 12px;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .btn-calc-export-csv:hover {
                    color: #67e8f9; /* cyan-300 */
                }

                .btn-calc-export-csv.hidden {
                    display: none;
                }

                .btn-calc-clear-all {
                    background: none;
                    border: none;
                    color: #fb7185;
                    font-size: 12px;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .btn-calc-clear-all:hover {
                    color: #fda4af; /* rose-300 */
                }

                .btn-calc-clear-all.hidden {
                    display: none;
                }

                .calc-log-empty {
                    font-size: 14px;
                    color: #71717a; /* zinc-500 */
                    font-style: italic;
                }

                .calc-log-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    max-height: 240px;
                    overflow-y: auto;
                    padding-right: 8px;
                }

                .calc-log-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .calc-log-group-header {
                    font-size: 12px;
                    font-weight: 500;
                    color: #71717a;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    position: sticky;
                    top: 0;
                    background-color: #18181b; /* zinc-900 */
                    padding: 4px 0;
                    z-index: 1;
                }

                .calc-log-table-container {
                    background-color: rgba(9, 9, 11, 0.5);
                    border-radius: 8px;
                    border: 1px solid rgba(39, 39, 42, 0.5);
                    overflow: hidden;
                }

                .calc-log-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                    text-align: left;
                }

                .calc-log-table th {
                    font-size: 12px;
                    color: #71717a;
                    background-color: rgba(24, 24, 27, 0.5);
                    border-bottom: 1px solid rgba(39, 39, 42, 0.5);
                    padding: 8px 12px;
                    font-weight: 500;
                }

                .calc-log-table td {
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(39, 39, 42, 0.5);
                }

                .calc-log-table tr:last-child td {
                    border-bottom: none;
                }

                .calc-log-table tr:hover {
                    background-color: rgba(24, 24, 27, 0.3);
                }

                .text-right { text-align: right; }
                .text-zinc-400 { color: #a1a1aa; }
                .text-zinc-300 { color: #d4d4d8; }
                .text-emerald { color: #34d399; }
                .text-rose { color: #fb7185; }
                .text-zinc { color: #a1a1aa; }
                .font-bold { font-weight: 700; }
                .hidden { display: none !important; }

                .calc-modal {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 50;
                    backdrop-filter: blur(2px);
                }

                .calc-modal-content {
                    background-color: #18181b;
                    border: 1px solid rgba(63, 63, 70, 0.5);
                    border-radius: 8px;
                    padding: 16px;
                    width: 90%;
                    max-width: 300px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                }

                .calc-modal-content h4 {
                    margin: 0 0 8px 0;
                    color: #f4f4f5;
                    font-size: 16px;
                    font-weight: 600;
                }

                .calc-modal-content p {
                    margin: 0 0 16px 0;
                    color: #a1a1aa;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .calc-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }

                .btn-modal-cancel {
                    padding: 6px 12px;
                    border-radius: 6px;
                    background-color: transparent;
                    color: #d4d4d8;
                    border: 1px solid rgba(63, 63, 70, 0.5);
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .btn-modal-cancel:hover {
                    background-color: rgba(63, 63, 70, 0.5);
                }

                .btn-modal-confirm {
                    padding: 6px 12px;
                    border-radius: 6px;
                    background-color: #ef4444;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-modal-confirm:hover {
                    background-color: #dc2626;
                }
            </style>
            
            <div class="calc-container" style="position: relative;">
                <div class="calc-header">
                    <div class="calc-net">
                        <span id="calc-net-value" class="calc-value">0</span>
                    </div>
                    <div class="calc-actions">
                        <button id="btn-calc-minus" class="btn-calc btn-calc-minus">-1</button>
                        <button id="btn-calc-plus" class="btn-calc btn-calc-plus">+1</button>
                        <button id="btn-calc-undo" class="btn-calc btn-calc-undo" disabled>C</button>
                        <div class="calc-divider"></div>
                        <button id="btn-calc-refresh" class="btn-calc-icon" title="Refresh Session">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                        <button id="btn-calc-log" class="btn-calc-icon" title="Session Log">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                
                <div id="calc-log-panel" class="calc-log-panel hidden">
                    <div class="calc-log-subtotal-container">
                        <span class="calc-log-subtotal-label">Session Sub Total:</span>
                        <span id="calc-log-subtotal" class="calc-log-subtotal-value">0</span>
                    </div>
                    <div class="calc-log-header">
                        <h3>Session History</h3>
                        <div class="calc-log-header-actions">
                            <button id="btn-calc-export-csv" class="btn-calc-export-csv hidden">Export CSV</button>
                            <button id="btn-calc-clear-all" class="btn-calc-clear-all hidden">Clear All</button>
                        </div>
                    </div>
                    <div id="calc-log-empty" class="calc-log-empty">No sessions recorded yet.</div>
                    <div id="calc-log-list" class="calc-log-list"></div>
                </div>

                <div id="calc-modal" class="calc-modal hidden">
                    <div class="calc-modal-content">
                        <h4>Clear History</h4>
                        <p>Are you sure you want to clear all session history? This action cannot be undone.</p>
                        <div class="calc-modal-actions">
                            <button id="btn-modal-cancel" class="btn-modal-cancel">Cancel</button>
                            <button id="btn-modal-confirm" class="btn-modal-confirm">Clear All</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('baccarat-calculator')) {
    customElements.define('baccarat-calculator', BaccaratCalculator);
}
