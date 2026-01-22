// Globale Variablen (werden durch fetch gefüllt)
let ITEMS_DB = {};
let BOSS_DATA = {};

// UI Texte (klein genug, um sie im Code zu lassen)
const UI_TEXT = {
    de: { stats: "Werte & Anforderungen", tribute: "Tribute (Beschwörung)", loot: "Loot & Belohnung", unlocks: "Tek Engramme", strategy: "Strategie", hp: "Leben", dmg: "Schaden", lvl: "Min. Level", gamma: "Gamma", beta: "Beta", alpha: "Alpha", prev: "+ Vorherige Stufen", arena: "Arena Informationen", attacks: "Boss Verhalten & Angriffe" },
    en: { stats: "Stats & Requirements", tribute: "Tributes (Summon)", loot: "Loot & Rewards", unlocks: "Tek Engrams", strategy: "Strategy", hp: "Health", dmg: "Damage", lvl: "Min. Level", gamma: "Gamma", beta: "Beta", alpha: "Alpha", prev: "+ Previous Tiers", arena: "Arena Information", attacks: "Boss Behavior & Attacks" }
};

let currentBossId = "broodmother"; // Standard, falls vorhanden
let currentMap = "The Island";
let currentLang = "de";

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        // Wir laden beide JSON Dateien parallel
        const [itemsResponse, bossesResponse] = await Promise.all([
            fetch('data/items.json'),
            fetch('data/bosses.json')
        ]);

        if (!itemsResponse.ok || !bossesResponse.ok) throw new Error("Netzwerkfehler beim Laden der JSONs");

        ITEMS_DB = await itemsResponse.json();
        BOSS_DATA = await bossesResponse.json();

        // Event Listeners setzen
        setupEventListeners();

        // App starten
        // Prüfen ob broodmother existiert, sonst den ersten Key nehmen
        const keys = Object.keys(BOSS_DATA);
        if (keys.length > 0 && !BOSS_DATA[currentBossId]) {
            currentBossId = keys[0];
        }

        renderBossList();
        loadBoss(currentBossId);

    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        document.getElementById('mainContent').innerHTML = `<div class="strategy-box" style="border-color:red;">Fehler beim Laden der Daten. Bitte Seite neu laden.<br>${error.message}</div>`;
    }
}

function setupEventListeners() {
    // Suche
    document.getElementById('searchInput').addEventListener('input', (e) => filterBosses(e.target.value));
    
    // Map Selector
    document.getElementById('mapSelector').addEventListener('change', (e) => changeMap(e.target.value));

    // Sprachen
    document.getElementById('btn-de').addEventListener('click', () => setLang('de'));
    document.getElementById('btn-en').addEventListener('click', () => setLang('en'));
}

// --- LOGIK FUNKTIONEN (unverändert, nur globale Vars werden genutzt) ---

function getTrans(key) {
    return UI_TEXT[currentLang][key] || key;
}

function getItem(key) {
    const item = ITEMS_DB[key];
    if (!item) return { name: key, icon: "" };
    return {
        name: item[currentLang] || item.en,
        icon: item.icon
    };
}

function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-'+lang).classList.add('active');
    
    const searchVal = document.getElementById('searchInput').value;
    filterBosses(searchVal);
    loadBoss(currentBossId);
}

function filterBosses(query) {
    const list = document.getElementById('bossList');
    query = query.toLowerCase();
    
    const categories = { "Bosse": [], "Titanen": [], "Minibosse": [] };

    for (const [id, data] of Object.entries(BOSS_DATA)) {
        let match = false;
        let matchReason = "";

        const bName = (data.name[currentLang] || data.name.en).toLowerCase();
        if (bName.includes(query)) match = true;
        else {
            // Deep search logic
            for (const map in data.maps) {
                const mapData = data.maps[map];
                // Helper function for deep search
                const checkUnlocks = (arr) => {
                    if(!arr) return false;
                    for(const u of arr) {
                        const item = getItem(u);
                        if(item.name && item.name.toLowerCase().includes(query)) return true;
                    }
                    return false;
                };

                if (data.hasDiff === false) {
                    if(checkUnlocks(mapData.unlocks)) { match = true; matchReason = "Tek"; break; }
                } else {
                    for (const diff in mapData) {
                         if(checkUnlocks(mapData[diff].unlocks)) { match = true; matchReason = "Tek"; break; }
                    }
                }
                if(match) break;
            }
        }

        if (match || query === "") {
            const btn = document.createElement('button');
            btn.className = `boss-btn ${id === currentBossId ? 'active' : ''}`;
            btn.onclick = () => loadBoss(id);
            
            let html = `<img src="${data.icon}"> ${data.name[currentLang] || data.name.en}`;
            if(query !== "" && matchReason) html += `<span class="match-badge">${matchReason}</span>`;
            btn.innerHTML = html;
            
            const cat = data.category || "Bosse";
            if(!categories[cat]) categories[cat] = []; // Fallback für neue Kategorien
            categories[cat].push(btn);
        }
    }

    list.innerHTML = '';
    const catOrder = ["Bosse", "Titanen", "Minibosse"];
    catOrder.forEach(cat => {
        if(categories[cat] && categories[cat].length > 0) {
            const header = document.createElement('div');
            header.className = 'cat-header';
            let icon = "fa-skull";
            if(cat === "Titanen") icon = "fa-mountain";
            if(cat === "Minibosse") icon = "fa-spider";
            header.innerHTML = `<i class="fa-solid ${icon}"></i> ${cat}`;
            list.appendChild(header);
            categories[cat].forEach(btn => list.appendChild(btn));
        }
    });
}

function renderBossList() {
    filterBosses(""); 
}

function loadBoss(bossId) {
    currentBossId = bossId;
    const boss = BOSS_DATA[bossId];
    if(!boss) return; // Sicherheitscheck

    // Header Info
    let headerHTML = "";
    if (boss.image) {
        headerHTML += `<div class="boss-main-image-container"><img src="${boss.image}" class="boss-main-image"></div>`;
    }
    headerHTML += `<div class="boss-info"><h1>${boss.name[currentLang] || boss.name.en}</h1><p>${boss.desc[currentLang] || boss.desc.en}</p></div>`;
    
    document.getElementById('bossHeader').innerHTML = headerHTML;
    
    // Map Selector
    const mapSelect = document.getElementById('mapSelector');
    mapSelect.innerHTML = '';
    const maps = Object.keys(boss.maps);
    
    if(maps.length === 0) {
         const opt = document.createElement('option'); opt.innerText = "Keine Daten";
         mapSelect.appendChild(opt); renderContent(); return;
    }

    maps.forEach(map => {
        const opt = document.createElement('option');
        opt.value = map; opt.innerText = map;
        mapSelect.appendChild(opt);
    });
    
    if (!maps.includes(currentMap)) currentMap = maps[0];
    mapSelect.value = currentMap;

    document.querySelectorAll('.boss-btn').forEach(b => b.classList.remove('active'));
    filterBosses(document.getElementById('searchInput').value); // Re-Render List to update active state

    renderContent();
}

function changeMap(map) {
    currentMap = map;
    renderContent();
}

function renderContent() {
    const boss = BOSS_DATA[currentBossId];
    if(!boss) return;
    const mapData = boss.maps[currentMap];
    const content = document.getElementById('mainContent');
    
    if(!mapData) { content.innerHTML = `<div class="strategy-box">Daten fehlen.</div>`; return; }

    // Helper functions inside render to access closure or pass easy
    const renderItemList = (list) => {
        if(!list || list.length === 0) return '<div style="color:#666; font-size:0.8rem;">-</div>';
        return list.map(entry => {
            const dbItem = getItem(entry.id);
            // Handle Items that might be missing in DB
            const name = dbItem.name || entry.id;
            const icon = dbItem.icon || "";
            return `
            <div class="item-entry" title="${name}">
                <div class="item-left"><img src="${icon}"><span>${name}</span></div>
                <span class="qty">x${entry.q}</span>
            </div>`;
        }).join('');
    };

    const renderUnlocks = (list, hasPrev) => {
        if(!list || list.length === 0) return '<div style="color:#666; font-size:0.8rem;">-</div>';
        let html = "";
        if(hasPrev) html += `<div class="note" style="width:100%;">${getTrans('prev')}</div>`;
        html += list.map(key => {
            const dbItem = getItem(key);
            const name = dbItem.name || key;
            const icon = dbItem.icon || "";
            return `<div class="tek-tag"><img src="${icon}"> ${name}</div>`;
        }).join('');
        return html;
    };

    const renderStats = (s) => {
        if(!s) return "-";
        return `<table class="stats-table">
            <tr><td>${getTrans('hp')}</td><td class="val" style="color:#ff5555">${s.hp}</td></tr>
            <tr><td>${getTrans('dmg')}</td><td class="val" style="color:#ffaa00">${s.dmg}</td></tr>
            <tr><td>${getTrans('lvl')}</td><td class="val" style="color:#55ff55">${s.lvl}</td></tr>
        </table>`;
    };

    let html = "";

    // SINGLE VIEW
    if (boss.hasDiff === false) {
         html = `
            <div class="single-view">
                <div class="single-col">
                    <h3 class="section-title"><i class="fa-solid fa-chart-line"></i> ${getTrans('stats')}</h3>
                    ${renderStats(mapData.stats)}
                    <h3 class="section-title" style="margin-top:20px;"><i class="fa-solid fa-gem"></i> ${getTrans('tribute')}</h3>
                    <div class="item-list">${renderItemList(mapData.tributes)}</div>
                </div>
                <div class="single-col">
                    <h3 class="section-title"><i class="fa-solid fa-gift"></i> ${getTrans('loot')}</h3>
                    <div class="item-list">${renderItemList(mapData.loot)}</div>
                    <h3 class="section-title" style="margin-top:20px;"><i class="fa-solid fa-dna"></i> ${getTrans('unlocks')}</h3>
                    <div class="tek-unlocks">${renderUnlocks(mapData.unlocks, false)}</div>
                </div>
            </div>`;
    } 
    // MATRIX VIEW
    else {
        const dGamma = mapData.Gamma || {};
        const dBeta = mapData.Beta || {};
        const dAlpha = mapData.Alpha || {};
        html = `
            <div class="matrix-header">
                <div class="mh-col mh-gamma">${getTrans('gamma')}</div>
                <div class="mh-col mh-beta">${getTrans('beta')}</div>
                <div class="mh-col mh-alpha">${getTrans('alpha')}</div>
            </div>
            <div class="section-block">
                <div class="section-title"><i class="fa-solid fa-chart-line"></i> ${getTrans('stats')}</div>
                <div class="matrix-row">
                    <div class="matrix-col gamma">${renderStats(dGamma.stats)}</div>
                    <div class="matrix-col beta">${renderStats(dBeta.stats)}</div>
                    <div class="matrix-col alpha">${renderStats(dAlpha.stats)}</div>
                </div>
            </div>
            <div class="section-block">
                <div class="section-title"><i class="fa-solid fa-gem"></i> ${getTrans('tribute')}</div>
                <div class="matrix-row">
                    <div class="matrix-col gamma"><div class="item-list">${renderItemList(dGamma.tributes)}</div></div>
                    <div class="matrix-col beta"><div class="item-list">${renderItemList(dBeta.tributes)}</div></div>
                    <div class="matrix-col alpha"><div class="item-list">${renderItemList(dAlpha.tributes)}</div></div>
                </div>
            </div>
            <div class="section-block">
                <div class="section-title"><i class="fa-solid fa-gift"></i> ${getTrans('loot')}</div>
                <div class="matrix-row">
                    <div class="matrix-col gamma"><div class="item-list">${renderItemList(dGamma.loot)}</div></div>
                    <div class="matrix-col beta"><div class="item-list">${renderItemList(dBeta.loot)}</div></div>
                    <div class="matrix-col alpha"><div class="item-list">${renderItemList(dAlpha.loot)}</div></div>
                </div>
            </div>
            <div class="section-block">
                <div class="section-title"><i class="fa-solid fa-dna"></i> ${getTrans('unlocks')}</div>
                <div class="matrix-row">
                    <div class="matrix-col gamma"><div class="tek-unlocks">${renderUnlocks(dGamma.unlocks, false)}</div></div>
                    <div class="matrix-col beta"><div class="tek-unlocks">${renderUnlocks(dBeta.unlocks, true)}</div></div>
                    <div class="matrix-col alpha"><div class="tek-unlocks">${renderUnlocks(dAlpha.unlocks, true)}</div></div>
                </div>
            </div>`;
    }

    // ARENA & STRATEGY
    if (boss.arena) {
        html += `<div class="section-block" style="margin-top: 40px;">
                <div class="section-title"><i class="fa-solid fa-location-dot"></i> ${getTrans('arena')}</div>
                <div class="strategy-box">${boss.arena[currentLang] || boss.arena.en}</div>
            </div>`;
    }
    if (boss.behavior) {
        html += `<div class="section-block">
                <div class="section-title"><i class="fa-solid fa-paw"></i> ${getTrans('attacks')}</div>
                <div class="strategy-box">${boss.behavior[currentLang] || boss.behavior.en}</div>
            </div>`;
    }
    html += `<div class="section-block">
            <div class="section-title"><i class="fa-solid fa-chess-knight"></i> ${getTrans('strategy')}</div>
            <div class="strategy-box">${boss.strategy[currentLang] || boss.strategy.en}</div>
        </div>`;

    content.innerHTML = html;
}
