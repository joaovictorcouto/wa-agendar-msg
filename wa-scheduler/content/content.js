/*
 * Content Script do WA Scheduler
 * Injeta botões e monita o DOM do WhatsApp Web
 */

const WADOM = {
    chatHeader: 'header',
    chatName: 'header span[title]',
    chatPhone: 'header span[title]', // Usually same or nearby
    messageContainer: 'div[data-testid="conversation-panel-messages"]', // Or similar
    inputBox: 'div[contenteditable="true"][data-tab="10"]',
    sendButton: '[data-icon="send"]'
};

let currentContactName = "";
let currentContactPhone = "";

const observer = new MutationObserver((mutations) => {
    // 1. Injetar Botão no Header
    injectSchedulerButton();
    
    // 2. Observar novas mensagens recebidas
    monitorIncomingMessages();
});

observer.observe(document.body, { childList: true, subtree: true });

function injectSchedulerButton() {
    const header = document.querySelector(WADOM.chatHeader);
    if (!header) return;

    if (document.getElementById('wa-scheduler-btn')) return;

    const btnContainer = document.createElement('div');
    btnContainer.id = 'wa-scheduler-btn';
    btnContainer.className = 'wa-scheduler-inject';
    // Utilizando o design do botão
    btnContainer.innerHTML = `
        <button id="wa-btn-trigger" title="Agendar Fluxo" style="
            background: none; 
            border: none; 
            cursor: pointer; 
            padding: 8px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
        ">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--icon-lighter, #aebac1)">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"></path>
            </svg>
        </button>
    `;

    // Localizar a barra de icones no header, geralmente a div mais a direita
    const iconsContainer = header.querySelector('div[role="button"]')?.parentNode;
    if (iconsContainer && iconsContainer.parentNode) {
        iconsContainer.parentNode.insertBefore(btnContainer, iconsContainer);
    } else {
        header.appendChild(btnContainer);
    }

    btnContainer.addEventListener('click', openFlowModal);
}

function monitorIncomingMessages() {
    // Procura o painel de mensagens
    const panel = document.querySelector('[role="application"]'); 
    // Pode ser ajustado conforme a estrutura do wpp: div[data-testid="conversation-panel-messages"] etc.
    
    // Simplificando lógica para encontrar mensagens não lidas ou recebidas
    const receivedMessages = document.querySelectorAll('div[data-id][data-pre-plain-text]');
    Array.from(receivedMessages).forEach(msg => {
        if (msg.getAttribute('data-id').includes('false_')) {
            // false_ prefix usually means received
            const phoneStr = msg.getAttribute('data-id').split('_')[1].split('@')[0];
            
            // Avisar o brackground para pausar se tem fluxo ativo
            chrome.runtime.sendMessage({
                action: "pauseFlow",
                telefone: phoneStr
            });
        }
    });
}

function openFlowModal() {
    // Extract contact name from header
    const titleEl = document.querySelector(WADOM.chatName);
    if (titleEl) {
        currentContactName = titleEl.getAttribute('title');
    }

    // Attempt to extract the number if possible, sometimes it's the title itself
    // Or it might be the data-id from the chat list
    currentContactPhone = currentContactName; // Placeholder

    // Inject the Modal UI into DOM
    if (!document.getElementById('wa-scheduler-modal')) {
        const modalHtml = `
<div id="wa-scheduler-modal" class="font-body text-on-surface antialiased fixed inset-0 flex items-center justify-center p-4 z-[99999]" style="z-index: 99999;">
    <!-- Modal Overlay Backdrop -->
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" id="wa-modal-backdrop"></div>
    <!-- Main Flow Creation Modal -->
    <div class="relative z-50 w-full max-w-[560px] bg-[#1F2C34] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[921px]">
        <!-- Header -->
        <header class="bg-[#008069] text-white flex items-center justify-between px-6 py-4 shadow-lg">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[20px]" data-icon="schedule">schedule</span>
                <h1 class="font-headline font-bold text-[15px] tracking-wide">Criar Novo Fluxo</h1>
            </div>
            <button id="wa-modal-close" class="hover:bg-white/10 p-1 rounded-full transition-colors duration-200 flex items-center">
                <span class="material-symbols-outlined text-[20px]" data-icon="close">close</span>
            </button>
        </header>
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <!-- Recipient Information Grid -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider font-bold text-[#59dcb5] pl-3">Contact Name</label>
                    <div class="py-2 border-l-2 border-[#59dcb5] pl-3">
                        <input id="wa-flow-name" class="bg-transparent border-none w-full focus:ring-0 text-[#d9e4ec] font-medium text-sm outline-none" readonly type="text" value="`+currentContactName+`">
                    </div>
                </div>
                <!-- Phone Field can be disabled/hidden if we only have name -->
                <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider font-bold text-[#59dcb5] pl-3">Phone Number</label>
                    <div class="py-2 border-l-2 border-[#59dcb5] pl-3">
                        <input class="bg-transparent border-none w-full focus:ring-0 text-[#d9e4ec] font-medium text-sm outline-none" readonly type="text" value="+`+currentContactPhone+`">
                    </div>
                </div>
            </div>
            <!-- Flow Messages Section -->
            <div class="space-y-4" id="wa-messages-container">
                <div class="flex items-center justify-between border-b border-[#3e4945]/30 pb-2">
                    <h2 class="font-headline font-bold text-[#d9e4ec] text-[15px]">Mensagens do Fluxo</h2>
                    <span class="bg-[#59dcb5]/10 text-[#59dcb5] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Timeline</span>
                </div>
                <!-- Message Rows via JS -->
            </div>
            <!-- Add Message Button -->
            <div class="pl-6 pt-4">
                <button id="wa-add-msg" class="flex items-center gap-2 text-[#59dcb5] font-bold text-sm hover:bg-[#59dcb5]/10 px-4 py-3 rounded-lg transition-all border border-dashed border-[#59dcb5]/30 w-full justify-center">
                    <span class="material-symbols-outlined text-[20px]" data-icon="add">add</span> Adicionar Mensagem
                </button>
            </div>
            <!-- Native Style Toggle -->
            <div class="flex items-center justify-between bg-[#131d23] p-4 rounded-xl shadow-sm mt-8 border border-transparent">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[#59dcb5]">smart_toy</span>
                    <div>
                        <p class="text-[14px] font-bold text-white">Pausar se responder</p>
                        <p class="text-[12px] text-[#8696A0]">Interrompe o fluxo automaticamente ao receber retorno.</p>
                    </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input checked class="sr-only peer" type="checkbox" id="wa-pause-toggle">
                    <div class="w-11 h-6 bg-[#2c363d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8696A0] after:border-[#8696A0] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#008069] peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                </label>
            </div>
        </div>
        <!-- Footer Actions -->
        <footer class="p-6 bg-[#131d23] border-t border-[#3e4945]/30 flex flex-col items-center">
            <button id="wa-save-flow" class="w-full bg-[#008069] hover:bg-[#00a884] text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-black/20 text-[15px]">
                <span class="material-symbols-outlined text-[20px]" data-icon="save">save</span> Salvar Fluxo
            </button>
            <p class="text-center text-[9px] text-[#8696A0] mt-4 uppercase tracking-[0.2em] font-bold">WA Scheduler Engine v2.4</p>
        </footer>
    </div>
</div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        document.body.appendChild(wrapper.firstElementChild);

        // Modal Events
        document.getElementById('wa-modal-close').addEventListener('click', closeFlowModal);
        document.getElementById('wa-modal-backdrop').addEventListener('click', closeFlowModal);
        document.getElementById('wa-add-msg').addEventListener('click', createMessageRow);
        document.getElementById('wa-save-flow').addEventListener('click', saveFlowFromModal);

        // Initial default message
        createMessageRow();
    }
}

function closeFlowModal() {
    const modal = document.getElementById('wa-scheduler-modal');
    if (modal) {
        modal.remove();
    }
}

function createMessageRow() {
    const container = document.getElementById('wa-messages-container');
    const rowId = Date.now();
    const rowHtml = `
<div class="relative pl-6 wa-msg-row mt-4 group">
    <div class="absolute left-[7px] top-0 bottom-0 w-[2px] bg-[#3e4945]/30"></div>
    <div class="absolute left-0 top-6 w-4 h-4 rounded-full border-2 border-[#59dcb5] bg-[#1F2C34] z-10"></div>
    <div class="bg-[#2c363d] p-4 rounded-xl border border-transparent hover:border-[#3e4945]/50 transition-all duration-300 shadow-sm">
        <div class="flex items-center justify-between mb-3">
            <span class="material-symbols-outlined text-[#8696A0] cursor-grab active:cursor-grabbing text-[18px]" data-icon="drag_indicator">drag_indicator</span>
            <button class="text-[#8696A0] hover:text-error transition-colors" onclick="this.closest('.wa-msg-row').remove()">
                <span class="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
            </button>
        </div>
        <textarea class="wa-msg-text w-full bg-[#1F2C34] border-none rounded p-3 text-sm text-[#d9e4ec] focus:ring-1 focus:ring-[#59dcb5] min-h-[70px] resize-none mb-4 outline-none" placeholder="Digite sua mensagem aqui... variáveis aceitas: {{nome}}"></textarea>
        
        <div class="flex items-center gap-3">
            <div class="flex-1 space-y-1.5">
                <label class="text-[9px] text-[#8696A0] uppercase tracking-wider font-bold">Atraso (Dias)</label>
                <input class="wa-msg-dd w-full bg-[#1F2C34] border-none rounded p-2.5 text-[13px] focus:ring-1 focus:ring-[#59dcb5] outline-none text-[#d9e4ec]" type="number" value="0">
            </div>
            <div class="flex-1 space-y-1.5">
                <label class="text-[9px] text-[#8696A0] uppercase tracking-wider font-bold">Atraso (Segundos)</label>
                <input class="wa-msg-ds w-full bg-[#1F2C34] border-none rounded p-2.5 text-[13px] focus:ring-1 focus:ring-[#59dcb5] outline-none text-[#d9e4ec]" type="number" value="30">
            </div>
        </div>
    </div>
</div>
    `;

    const rowWrapper = document.createElement('div');
    rowWrapper.innerHTML = rowHtml;
    container.appendChild(rowWrapper.firstElementChild);
}

function saveFlowFromModal() {
    const messages = [];
    const rows = document.querySelectorAll('.wa-msg-row');
    rows.forEach(row => {
        const text = row.querySelector('.wa-msg-text').value;
        const delayDias = parseInt(row.querySelector('.wa-msg-dd').value, 10) || 0;
        const delaySegs = parseInt(row.querySelector('.wa-msg-ds').value, 10) || 0;
        
        if (text.trim() !== "") {
            messages.push({ texto: text, delay_dias: delayDias, delay_seg: delaySegs });
        }
    });

    if (messages.length === 0) {
        alert("Adicione pelo menos uma mensagem.");
        return;
    }

    const flowData = {
        contato: currentContactName,
        telefone: currentContactName, // For WA Web we might need an id or exact phone
        mensagens: messages
    };

    chrome.runtime.sendMessage({ action: "saveFlow", data: flowData }, (res) => {
        if (res && res.success) {
            closeFlowModal();
            // Show toast or something
        }
    });
}

// Escuta a ordem do Background para ENVIAR MENSAGEM NATIVAMENTE
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sendMessage") {
        console.log("Comando de enviar mensagem recebido do Background:", request);
        
        // Aqui simula
        // 1. Procurar chat do telefone (pode exigir clicar na lista lateral de conversas)
        // 2. Inserir texto
        // 3. Clicar em enviar
        // Como o WPP web eh dinamico, a forma mais confiavel de mandar mensagem
        // em background requer que a conversa ou esteja ativa ou usar a API de Link do WPP
        
        // Simulação na conversa ATUAL (para fins de prototipo rápido)
        const inputBox = document.querySelector(WADOM.inputBox);
        if (inputBox) {
            inputBox.focus();
            document.execCommand('insertText', false, request.texto);
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                const sendBtn = document.querySelector(WADOM.sendButton);
                if (sendBtn) {
                    sendBtn.click();
                    sendResponse({ success: true });
                }
            }, 500); // 500ms typyng delay
            return true;
        } else {
            sendResponse({ success: false, error: "Input box não encontrada" });
        }
    } else if (request.action === "getContacts") {
        console.log("Comando getContacts recebido");
        // Extraindo nomes de conversas recentes da barra lateral esquerda do WA
        const contacts = new Set();
        // #pane-side é o painel que contém as conversas
        const chatTitles = document.querySelectorAll('#pane-side span[title]');
        chatTitles.forEach(el => {
            const title = el.getAttribute('title').trim();
            if (title && title.length > 1) { // ignorar strings vazias ou icones bugs
                contacts.add(title);
            }
        });
        const contactList = Array.from(contacts);
        sendResponse({ success: true, contacts: contactList });
        return true;
    }
});
