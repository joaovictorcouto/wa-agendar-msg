/**
 * Servidor Worker (Background) para WA Scheduler
 * Orquestra agendamentos usando chrome.alarms.
 */

chrome.runtime.onInstalled.addListener(() => {
    // Retirado openPanelOnActionClick direto, para podermos injetar a aba.
});

// Abertura de Aba e Foco
chrome.action.onClicked.addListener(async (tab) => {
    const waUrl = "*://web.whatsapp.com/*";
    chrome.tabs.query({ url: waUrl }, (tabs) => {
        if (tabs.length > 0) {
            // Existe aba aberta, vamos focar nela
            const targetTab = tabs[0];
            chrome.tabs.update(targetTab.id, { active: true });
            chrome.windows.update(targetTab.windowId, { focused: true });
            
            // Re-abrir painel lateral na janela ativa (requer userGesture)
            chrome.sidePanel.open({ windowId: targetTab.windowId });
        } else {
            // Criar nova aba
            chrome.tabs.create({ url: "https://web.whatsapp.com/" }, (newTab) => {
                // Aguarda um pouco e abre o painel (pode falhar se o window id não estiver pronto, mas o padrão do Chrome abre no active)
                chrome.sidePanel.open({ windowId: newTab.windowId });
            });
        }
    });
});

// Listener principal para mensagens (content script & side panel)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveFlow") {
        saveFlow(request.data).then(() => {
            sendResponse({ success: true });
        });
        return true; // async
    } else if (request.action === "pauseFlow") {
        pauseFlow(request.telefone).then(() => {
            sendResponse({ success: true });
        });
        return true; // async
    } else if (request.action === "resumeFlow") {
        resumeFlow(request.id).then(() => {
            sendResponse({ success: true });
        });
        return true; // async
    }
});

// Alarm Listener para disparos agendados
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith("msg_")) {
        const parts = alarm.name.split('_');
        const flowId = parts[1];
        const msgIndex = parseInt(parts[2], 10);
        
        processScheduledMessage(flowId, msgIndex);
    }
});

async function saveFlow(flowData) {
    const { flows = [] } = await chrome.storage.local.get("flows");
    
    flowData.id = flowData.id || crypto.randomUUID();
    flowData.pausado = false;
    flowData.indice_atual = 0;
    
    // Atualiza ou insere
    const existingIndex = flows.findIndex(f => f.id === flowData.id);
    if (existingIndex >= 0) {
        flows[existingIndex] = flowData;
    } else {
        flows.push(flowData);
    }

    await chrome.storage.local.set({ flows });
    scheduleNext(flowData);
}

async function pauseFlow(telefone) {
    const { flows = [] } = await chrome.storage.local.get("flows");
    
    // Procura fluxo ativo do contato
    const flow = flows.find(f => f.telefone === telefone && !f.pausado);
    if (flow) {
        flow.pausado = true;
        await chrome.storage.local.set({ flows });
        
        // Remove alarmes futuros para este fluxo
        chrome.alarms.clearAll(alarm => {
            if (alarm.name.startsWith(`msg_${flow.id}`)) {
                chrome.alarms.clear(alarm.name);
            }
        });

        // Notifica auto-pausa
        chrome.notifications.create({
            type: "basic",
            iconUrl: "images/icon-48.png", // Criar / providenciar depois
            title: "Fluxo Pausado",
            message: `O contato ${flow.contato} respondeu. O fluxo foi pausado.`
        });
    }
}

async function resumeFlow(flowId) {
    const { flows = [] } = await chrome.storage.local.get("flows");
    const flow = flows.find(f => f.id === flowId);
    if (flow) {
        flow.pausado = false;
        await chrome.storage.local.set({ flows });
        scheduleNext(flow);
    }
}

function scheduleNext(flow) {
    if (flow.pausado || flow.indice_atual >= flow.mensagens.length) {
        if (flow.indice_atual >= flow.mensagens.length) {
            // Fim do fluxo, notificar
             chrome.notifications.create({
                type: "basic",
                iconUrl: "images/icon-48.png",
                title: "Fluxo Concluído",
                message: `O fluxo para ${flow.contato} foi finalizado.`
            });
        }
        return;
    }

    const nextMsg = flow.mensagens[flow.indice_atual];
    // Calcular tempo futuro: delay em dias + delay em segundos
    const delayMs = (nextMsg.delay_dias * 24 * 60 * 60 * 1000) + (nextMsg.delay_seg * 1000);
    
    // Adicionar randomização: +/- 2s
    const humanizedOffset = (Math.random() * 4000) - 2000;
    
    const triggerTime = Date.now() + delayMs + humanizedOffset;

    const alarmName = `msg_${flow.id}_${flow.indice_atual}`;
    chrome.alarms.create(alarmName, { when: triggerTime });
}

async function processScheduledMessage(flowId, msgIndex) {
    const { flows = [] } = await chrome.storage.local.get("flows");
    const flow = flows.find(f => f.id === flowId);
    
    if (!flow || flow.pausado || flow.indice_atual !== msgIndex) return;

    const msg = flow.mensagens[msgIndex];
    let finalMsg = msg.texto.replace(/\{\{nome\}\}/g, flow.contato.split(' ')[0]);
    // TODO: Outras variaveis (empresa, destino)

    // Enviar mensagem pro content script agir
    // Aqui procuramos a aba ativa do WhatsApp
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
        if (tabs.length === 0) {
            console.warn("WhatsApp Web não encontrado para envio de mensagem agendada.");
            // Lógica de retry?
            return;
        }

        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, {
            action: "sendMessage",
            telefone: flow.telefone,
            texto: finalMsg
        }, (response) => {
            if (response && response.success) {
                // Sucesso
                flow.indice_atual++;
                chrome.storage.local.set({ flows }).then(() => {
                    scheduleNext(flow);
                });
            }
        });
    });
}
