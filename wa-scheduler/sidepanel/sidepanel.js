document.addEventListener('DOMContentLoaded', () => {
    loadList('ativos');

    ['ativos', 'pausados', 'concluidos'].forEach(tab => {
        document.getElementById(`tab-${tab}`).addEventListener('click', () => {
            setTabActive(tab);
            loadList(tab);
        });
    });

    // FAB
    document.getElementById('fab-add').addEventListener('click', () => {
        openImportModal(); // Or openTemplateManager in the future. Opening import covers scheduling.
    });

    // Modals
    // Header Buttons
    document.getElementById('btn-import-header').addEventListener('click', () => {
        // Quick access to template manager / import
        setTabActive('templates');
        loadList('templates');
    });
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', () => document.getElementById('modal-settings').classList.add('hidden'));
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    // Import
    document.getElementById('btn-import').addEventListener('click', openImportModal);
    document.getElementById('btn-close-import').addEventListener('click', () => document.getElementById('modal-import').classList.add('hidden'));
    document.getElementById('btn-fetch-contacts').addEventListener('click', fetchContactsFromWA);
    document.getElementById('btn-do-import').addEventListener('click', doBatchImport);

    // Template Builder
    document.getElementById('btn-close-template').addEventListener('click', () => document.getElementById('modal-template').classList.add('hidden'));
    document.getElementById('btn-tpl-add-msg').addEventListener('click', () => addTemplateMessageRow());
    document.getElementById('btn-save-template').addEventListener('click', saveTemplate);

    // Storage updates
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.flows || changes.templates)) {
            const activeTabMatch = document.querySelector('.border-[#00a884]');
            const currentTabId = activeTabMatch ? activeTabMatch.id.replace('tab-', '') : 'ativos';
            loadList(currentTabId);
        }
    });
});

// --- SETTINGS ---
function openSettings() {
    chrome.storage.local.get("settings", (data) => {
        const s = data.settings || { horaInicio: '08:00', horaFim: '20:00', delayRand: true };
        document.getElementById('set-hora-inicio').value = s.horaInicio;
        document.getElementById('set-hora-fim').value = s.horaFim;
        document.getElementById('set-delay-rand').checked = s.delayRand;
        document.getElementById('modal-settings').classList.remove('hidden');
    });
}
function saveSettings() {
    const s = {
        horaInicio: document.getElementById('set-hora-inicio').value,
        horaFim: document.getElementById('set-hora-fim').value,
        delayRand: document.getElementById('set-delay-rand').checked
    };
    chrome.storage.local.set({ settings: s }, () => {
        document.getElementById('modal-settings').classList.add('hidden');
    });
}

// --- IMPORT / SELECTION ---
function openImportModal() {
    chrome.storage.local.get("templates", (data) => {
        const tpls = data.templates || [];
        const select = document.getElementById('import-template-select');
        select.innerHTML = '<option value="">(Selecione um template)</option>';
        tpls.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
        });
        document.getElementById('wa-contacts-list').classList.add('hidden');
        document.getElementById('wa-contacts-list').innerHTML = '';
        document.getElementById('import-data').value = '';
        document.getElementById('modal-import').classList.remove('hidden');
    });
}

function fetchContactsFromWA() {
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
        if (tabs.length === 0) {
            alert("Nenhuma aba do WhatsApp Web encontrada. Abra o WhatsApp primeiro.");
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: "getContacts" }, (response) => {
            if (response && response.success && response.contacts) {
                const list = document.getElementById('wa-contacts-list');
                list.innerHTML = '';
                if(response.contacts.length === 0) {
                    list.innerHTML = '<p class="text-xs text-white p-2">Nenhum contato recente localizado no painel visível.</p>';
                } else {
                    response.contacts.forEach(c => {
                        list.innerHTML += `
                        <label class="flex items-center gap-2 text-white text-xs bg-surface-container-highest p-2 rounded cursor-pointer">
                            <input type="checkbox" class="wa-contact-cb accent-primary" value="${c}">
                            ${c}
                        </label>`;
                    });
                }
                list.classList.remove('hidden');
                document.getElementById('import-data').classList.add('hidden');
                document.getElementById('import-data').value = ''; // clears manual input
            } else {
                alert("Falha ao capturar contatos. Verifique se o WhatsApp Web está carregado.");
            }
        });
    });
}

function doBatchImport() {
    const tplId = document.getElementById('import-template-select').value;
    if (!tplId) { alert("Selecione um template!"); return; }

    chrome.storage.local.get("templates", (data) => {
        const tpl = (data.templates || []).find(t => t.id === tplId);
        if (!tpl) return;

        let targets = [];
        
        // Se a lista de checkbox estiver visivel, usamos ela
        if (!document.getElementById('wa-contacts-list').classList.contains('hidden')) {
            const cbx = document.querySelectorAll('.wa-contact-cb:checked');
            cbx.forEach(c => targets.push({ tel: c.value, nome: c.value }));
        } else {
            // Usa o textarea manual
            const raw = document.getElementById('import-data').value;
            const lines = raw.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
            lines.forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    targets.push({ tel: parts[0].trim(), nome: parts[1].trim() });
                } else {
                    targets.push({ tel: line, nome: line });
                }
            });
        }

        if (targets.length === 0) { alert("Selecione/insira pelo menos um contato."); return; }

        targets.forEach(t => {
            const newFlow = {
                contato: t.nome,
                telefone: t.tel,
                mensagens: JSON.parse(JSON.stringify(tpl.mensagens)) 
            };
            chrome.runtime.sendMessage({ action: "saveFlow", data: newFlow });
        });

        alert(`${targets.length} contatos agendados com o template ${tpl.nome}!`);
        document.getElementById('modal-import').classList.add('hidden');
    });
}

// --- TAB ROUTING ---
function setTabActive(tabName) {
    const tabs = ['ativos', 'pausados', 'concluidos'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if(el) {
            if (t === tabName) {
                el.className = "text-white border-b-4 border-[#00a884] pb-2 font-bold text-[13px] tracking-wide flex items-center gap-1.5 transition-all duration-300";
            } else {
                el.className = "text-[#8696a0] border-b-4 border-transparent pb-2 text-[13px] tracking-wide hover:text-[#e9edef] transition-all duration-300 flex items-center gap-1.5";
            }
        }
    });

    if (tabName === 'templates') {
        document.getElementById('flows-list').classList.add('hidden');
        document.getElementById('templates-list').classList.remove('hidden');
    } else {
        document.getElementById('flows-list').classList.remove('hidden');
        document.getElementById('templates-list').classList.add('hidden');
    }
}

function loadList(statusFilter) {
    if (statusFilter === 'templates') {
        renderTemplates();
    } else {
        renderFlows(statusFilter);
    }
}

// --- TEMPLATES logic ---
function renderTemplates() {
    const listEl = document.getElementById('templates-list');
    listEl.innerHTML = '';

    const createBtnHtml = `
        <button id="btn-new-template" class="w-full py-3 mb-4 bg-surface-container-low hover:bg-surface-container-high border border-dashed border-primary/50 text-primary font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[18px]">add</span> Criar Novo Template
        </button>
    `;

    chrome.storage.local.get("templates", (data) => {
        const tpls = data.templates || [];
        
        listEl.innerHTML = createBtnHtml;

        if (tpls.length === 0) {
            listEl.innerHTML += `
                <div class="pt-8 flex flex-col items-center justify-center opacity-20 select-none pointer-events-none">
                    <span class="material-symbols-outlined text-6xl shadow-none">library_books</span>
                    <p class="mt-2 text-xs uppercase tracking-widest font-bold">Nenhum template salvo</p>
                </div>
            `;
        }

        tpls.forEach(t => {
            const cardHtml = `
            <div class="bg-[#1F2C34] rounded-lg p-[12px] group relative shadow-sm border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[#00A884]">format_list_bulleted</span>
                        <h3 class="text-white font-medium text-[14px] truncate">${t.nome}</h3>
                    </div>
                </div>
                <p class="text-[#8696A0] text-[12px] mt-1">${t.mensagens.length} mensagem(s)</p>
                
                <div class="mt-3 pt-3 border-t border-outline-variant/10 flex justify-end gap-2 w-full">
                    <button class="btn-edit-tpl px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-white text-xs font-bold rounded flex items-center gap-1 transition-colors" data-id="${t.id}">
                        <span class="material-symbols-outlined text-[14px]">edit</span> Editar
                    </button>
                    <button class="btn-del-tpl px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded flex items-center gap-1 transition-colors" data-id="${t.id}">
                        <span class="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                </div>
            </div>`;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = cardHtml;
            listEl.appendChild(wrapper.firstElementChild);
        });

        // Add Listeners
        document.getElementById('btn-new-template').addEventListener('click', () => openTemplateModal());
        
        document.querySelectorAll('.btn-edit-tpl').forEach(btn => {
            btn.addEventListener('click', (e) => openTemplateModal(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-del-tpl').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm("Excluir este template?")) {
                    const tid = e.currentTarget.getAttribute('data-id');
                    chrome.storage.local.get("templates", (dt) => {
                        const nt = (dt.templates || []).filter(x => x.id !== tid);
                        chrome.storage.local.set({ templates: nt });
                    });
                }
            });
        });
    });
}

function openTemplateModal(id = null) {
    const modal = document.getElementById('modal-template');
    const container = document.getElementById('tpl-messages-container');
    document.getElementById('tpl-id').value = id || '';
    document.getElementById('tpl-name').value = '';
    container.innerHTML = '';
    
    if (id) {
        document.getElementById('template-modal-title').innerHTML = '<span class="material-symbols-outlined">edit_square</span> Editar Template';
        chrome.storage.local.get("templates", (data) => {
            const t = (data.templates || []).find(x => x.id === id);
            if (t) {
                document.getElementById('tpl-name').value = t.nome;
                t.mensagens.forEach(m => addTemplateMessageRow(m.texto, m.delay_dias, m.delay_seg));
            }
            modal.classList.remove('hidden');
        });
    } else {
        document.getElementById('template-modal-title').innerHTML = '<span class="material-symbols-outlined">add_box</span> Novo Template';
        addTemplateMessageRow(); // 1 empty row
        modal.classList.remove('hidden');
    }
}

function addTemplateMessageRow(texto='', dd=0, ds=30) {
    const container = document.getElementById('tpl-messages-container');
    const rowHtml = `
    <div class="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 relative mt-2 tpl-msg-row">
        <button class="absolute top-2 right-2 text-outline hover:text-error transition-colors" onclick="this.closest('.tpl-msg-row').remove()">
            <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
        <textarea class="tpl-msg-text w-full bg-surface-container-highest border-none rounded p-2 text-xs text-white outline-none min-h-[50px] resize-none mb-2 focus:ring-1 focus:ring-primary" placeholder="Mensagem... Ex: Olá {{nome}}">${texto}</textarea>
        <div class="flex items-center gap-2">
            <div class="flex-1">
                <label class="text-[0.6rem] text-tertiary">Dias</label>
                <input class="tpl-msg-dd w-full bg-surface-container-highest border-none rounded p-1 text-xs text-white outline-none focus:ring-1 focus:ring-primary" type="number" value="${dd}">
            </div>
            <div class="flex-1">
                <label class="text-[0.6rem] text-tertiary">Sgs</label>
                <input class="tpl-msg-ds w-full bg-surface-container-highest border-none rounded p-1 text-xs text-white outline-none focus:ring-1 focus:ring-primary" type="number" value="${ds}">
            </div>
        </div>
    </div>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rowHtml;
    container.appendChild(wrapper.firstElementChild);
}

function saveTemplate() {
    const id = document.getElementById('tpl-id').value || crypto.randomUUID();
    const nome = document.getElementById('tpl-name').value.trim() || 'Template sem nome';
    const messages = [];
    document.querySelectorAll('.tpl-msg-row').forEach(row => {
        const text = row.querySelector('.tpl-msg-text').value;
        const dd = parseInt(row.querySelector('.tpl-msg-dd').value, 10) || 0;
        const ds = parseInt(row.querySelector('.tpl-msg-ds').value, 10) || 0;
        if (text.trim() !== '') {
            messages.push({ texto: text, delay_dias: dd, delay_seg: ds });
        }
    });

    if (messages.length === 0) { alert("Adicione pelo menos uma mensagem."); return; }

    chrome.storage.local.get("templates", (data) => {
        const tpls = data.templates || [];
        const idx = tpls.findIndex(t => t.id === id);
        const tObj = { id, nome, mensagens: messages };
        if (idx >= 0) {
            tpls[idx] = tObj;
        } else {
            tpls.push(tObj);
        }
        chrome.storage.local.set({ templates: tpls }, () => {
             document.getElementById('modal-template').classList.add('hidden');
        });
    });
}

// --- FLOWS logic ---
function renderFlows(statusFilter) {
    const listEl = document.getElementById('flows-list');
    listEl.innerHTML = '';

    chrome.storage.local.get("flows", (data) => {
        const flows = data.flows || [];
        
        let filteredFlows = flows.filter(f => {
            if (statusFilter === 'ativos') return !f.pausados && f.indice_atual < f.mensagens.length;
            if (statusFilter === 'pausados') return f.pausado && f.indice_atual < f.mensagens.length;
            if (statusFilter === 'concluidos') return f.indice_atual >= f.mensagens.length;
            return false;
        });

        if (filteredFlows.length === 0) {
            listEl.innerHTML = `
                <div class="pt-8 flex flex-col items-center justify-center opacity-20 select-none pointer-events-none">
                    <span class="material-symbols-outlined text-6xl shadow-none">forum</span>
                    <p class="mt-2 text-xs uppercase tracking-widest font-bold">Fim da lista</p>
                </div>
            `;
            return;
        }

        filteredFlows.forEach(flow => {
            const perc = flow.mensagens.length > 0 
                ? Math.round((flow.indice_atual / flow.mensagens.length) * 100) 
                : 100;

            let statusBadge = '';
            let avatarColor = '';
            let progressColor = '';
            let btnActionHtml = '';

            if (statusFilter === 'ativos') {
                statusBadge = '<span class="bg-[#00A884]/10 text-[#00A884] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">ATIVO</span>';
                avatarColor = 'bg-[#008069]';
                progressColor = 'bg-[#00A884]';
                btnActionHtml = `
                    <button class="btn-pause px-4 py-2 bg-[#F0AD4E]/10 hover:bg-[#F0AD4E]/20 text-[#F0AD4E] border border-[#F0AD4E]/30 text-xs font-bold rounded flex items-center gap-1 transition-all" data-id="${flow.id}">
                        <span class="material-symbols-outlined text-[16px]">pause</span> Pausar
                    </button>
                `;
            } else if (statusFilter === 'pausados') {
                statusBadge = '<span class="bg-[#F0AD4E]/10 text-[#F0AD4E] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">PAUSADO</span>';
                avatarColor = 'bg-[#1F2C34] opacity-50';
                progressColor = 'bg-[#F0AD4E]';
                btnActionHtml = `
                    <button class="btn-resume px-4 py-2 bg-[#00A884]/10 hover:bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30 text-xs font-bold rounded flex items-center gap-1 transition-all" data-id="${flow.id}">
                        <span class="material-symbols-outlined text-[16px]">play_arrow</span> Retomar
                    </button>
                `;
            } else {
                statusBadge = '<span class="bg-[#8696A0]/10 text-[#8696A0] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">CONCLUÍDO</span>';
                avatarColor = 'bg-[#1F2C34] opacity-30';
                progressColor = 'bg-[#8696A0]';
            }

            const cardHtml = `
            <div class="bg-[#1F2C34] rounded-[10px] p-[16px] mb-3 shadow-md border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.1)] group relative overflow-hidden transition-all duration-300">
                <div class="flex items-start gap-4 ${statusFilter === 'concluidos' ? 'opacity-70' : ''}">
                    <div class="w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center shrink-0 border border-white/5">
                        <span class="text-white font-bold text-sm uppercase">${flow.contato.substring(0,2)}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h3 class="text-white font-bold text-[15px] truncate pr-16">${flow.contato}</h3>
                            <div class="absolute right-[16px] top-[16px]">
                                ${statusBadge}
                            </div>
                        </div>
                        <p class="text-[#8696A0] text-[12px] mt-1 truncate">${flow.telefone} - Próximo: ${statusFilter === 'ativos' ? 'Em breve' : '---'}</p>
                        
                        <div class="mt-4">
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-[11px] text-[#8696A0] tracking-wide">Progresso: ${flow.indice_atual}/${flow.mensagens.length}</span>
                                <span class="text-[11px] text-[${progressColor === 'bg-[#00A884]' ? '#00A884' : (progressColor === 'bg-[#F0AD4E]' ? '#F0AD4E' : '#8696A0')}] font-bold">${perc}%</span>
                            </div>
                            <div class="w-full bg-[#0a151a] h-1.5 rounded-full overflow-hidden">
                                <div class="${progressColor} h-full transition-all duration-500 rounded-full" style="width: ${perc}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                ${statusFilter !== 'concluidos' ? `
                <div class="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end gap-2 w-full opacity-5 hover:opacity-100 transition-opacity">
                    <button class="btn-del-flow px-3 py-1 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded flex items-center gap-1 transition-colors mr-auto" data-id="${flow.id}">
                        <span class="material-symbols-outlined text-[14px]">delete</span> Excluir
                    </button>
                    ${btnActionHtml}
                </div>
                ` : `
                <div class="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end gap-2 w-full opacity-5 hover:opacity-100 transition-opacity">
                    <button class="btn-del-flow px-3 py-1 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded flex items-center gap-1 transition-colors mr-auto" data-id="${flow.id}">
                        <span class="material-symbols-outlined text-[14px]">delete</span> Excluir Histórico
                    </button>
                </div>
                `}
            </div>
            `;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = cardHtml;
            listEl.appendChild(wrapper.firstElementChild);
        });

        document.querySelectorAll('.btn-pause').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flowId = e.currentTarget.getAttribute('data-id');
                const f = flows.find(x => x.id === flowId);
                chrome.runtime.sendMessage({ action: "pauseFlow", telefone: f.telefone });
            });
        });

        document.querySelectorAll('.btn-resume').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flowId = e.currentTarget.getAttribute('data-id');
                chrome.runtime.sendMessage({ action: "resumeFlow", id: flowId });
            });
        });

        document.querySelectorAll('.btn-del-flow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm("Excluir este fluxo?")) {
                    const flowId = e.currentTarget.getAttribute('data-id');
                    chrome.storage.local.get("flows", dt => {
                        const nt = (dt.flows || []).filter(x => x.id !== flowId);
                        chrome.storage.local.set({ flows: nt });
                    });
                }
            });
        });

    });
}
