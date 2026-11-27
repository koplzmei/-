// ВСТАВЬТЕ СЮДА ССЫЛКУ НА ВАШУ БАЗУ FIREBASE (без слэша в конце)
const DB_URL = 'https://ВАШ-ПРОЕКТ-default-rtdb.europe-west1.firebasedatabase.app'.replace(/\/$/, '');

function makeKey(str) {
    return Array.from(new TextEncoder().encode((str || '').toLowerCase().trim()))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const currentUser = localStorage.getItem('currentUser');
const isMaster = localStorage.getItem('isMaster') === 'true';

if (!currentUser) {
    window.location.href = 'login.html';
}

const nameInput = document.getElementById('char-name');
const levelInput = document.getElementById('char-level');
const xpInput = document.getElementById('char-xp');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const logoutBtn = document.getElementById('logout-btn');
const charactersList = document.getElementById('characters-list');
const panelTitle = document.getElementById('panel-title');
const pageTitle = document.getElementById('page-title');
const importFileInput = document.getElementById('import-file');

let globalItemsDB = [];

if (isMaster) {
    panelTitle.textContent = 'Все персонажи';
    pageTitle.textContent = 'Панель Мастера';
} else {
    panelTitle.textContent = 'Мои карточки';
    pageTitle.textContent = 'Мои персонажи';
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isMaster');
    window.location.href = 'index.html';
});

const style = document.createElement('style');
style.innerHTML = `
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    @keyframes popLevel { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    .level-pop { animation: popLevel 0.4s ease-in-out; }
    
    .skills-container { display: flex; gap: 20px; margin-top: 15px; }
    .column-50 { flex: 1; background: rgba(0,0,0,0.15); padding: 15px; border-radius: 8px; border: 1px solid #333; }
    .column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .column-header p { color: #ffd700; font-size: 18px; font-weight: bold; margin: 0; }
    .column-header span { color: #aaa; font-size: 14px; }
    
    .ability-row { display: flex; gap: 5px; align-items: center; margin-bottom: 8px; position: relative; }
    .ability-input { 
        background: #1e1e24; color: #fff; border: 1px solid #555; padding: 4px 6px; 
        border-radius: 4px; font-size: 14px; outline: none; width: 130px; 
        transition: 0.2s; height: 30px;
    }
    .ability-input:focus { border-color: #4caf50; }
    
    .mini-stat { 
        background: #1e1e24; color: #fff; border: 1px solid #555; 
        padding: 4px; border-radius: 4px; font-size: 14px; text-align: center; 
        outline: none; width: 40px; height: 30px;
    }
    .mini-stat:focus { border-color: #4caf50; }

    .ability-controls { display: flex; gap: 10px; margin-top: 10px; }
    .btn-ability-control { 
        width: 30px; height: 30px; border-radius: 4px; font-size: 18px; font-weight: bold; 
        cursor: pointer; display: flex; justify-content: center; align-items: center; 
        transition: 0.2s; border: 1px solid #555; color: #fff;
    }
    .btn-add { background: #2e7d32; border-color: #4caf50; }
    .btn-add:hover { background: #4caf50; }
    .btn-remove { background: #8b0000; border-color: #ff4d4d; }
    .btn-remove:hover { background: #ff4d4d; }
    
    .hand-label { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }

    .status-cube {
        width: 28px; height: 28px; border: 1px solid #555; border-radius: 4px;
        background: #1e1e24; cursor: pointer; display: flex; justify-content: center;
        align-items: center; font-size: 14px; transition: 0.2s; flex-shrink: 0;
    }
    .status-cube:hover { border-color: #4caf50; background: #2a2a35; }

    .download-btn, .lore-btn {
        position: absolute; top: 25px; width: 40px; height: 40px;
        background: rgba(0,0,0,0.3); border-radius: 50%; font-size: 20px; cursor: pointer; 
        display: flex; justify-content: center; align-items: center; padding: 0; transition: 0.2s;
    }
    .download-btn { right: 75px; border: 1px solid rgba(255, 215, 0, 0.5); color: #ffd700; }
    .download-btn:hover { background: rgba(255, 215, 0, 0.2); }
    
    .lore-btn { right: 125px; border: 1px solid rgba(100, 149, 237, 0.5); color: #6495ED; }
    .lore-btn:hover { background: rgba(100, 149, 237, 0.2); }

    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center;
        z-index: 1000; backdrop-filter: blur(5px); opacity: 0; pointer-events: none; transition: 0.3s;
    }
    .modal-overlay.active { opacity: 1; pointer-events: auto; }
    .modal-content {
        background: #1e1e24; border: 1px solid #444; padding: 30px; border-radius: 12px;
        width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    }
    .modal-content h2 { color: #ffd700; margin-bottom: 20px; text-align: center; }
    .modal-content label { color: #aaa; font-size: 16px; display: block; margin-bottom: 5px; }
    
    .modal-content input, .modal-content textarea {
        width: 100%; padding: 10px; background: #121216; border: 1px solid #555;
        color: #fff; border-radius: 6px; margin-bottom: 20px; font-size: 16px; outline: none;
        resize: vertical; font-family: inherit;
    }
    .modal-content textarea { height: 150px; }
    .modal-content input:focus, .modal-content textarea:focus { border-color: #6495ED; }
    .modal-close {
        position: absolute; top: 15px; right: 20px; background: none; border: none;
        color: #ff4d4d; font-size: 24px; cursor: pointer; transition: 0.2s;
    }
    .modal-close:hover { transform: scale(1.2); }

    .char-description {
        color: #ccc; font-size: 15px; line-height: 1.5; margin-left: 110px; margin-bottom: 20px;
        background: rgba(0,0,0,0.15); padding: 15px; border-radius: 8px; border-left: 3px solid #6495ED;
        white-space: pre-wrap;
    }

    .admin-items-btn {
        background: #6495ED; color: white; border: none; padding: 10px 20px;
        border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold;
        display: flex; align-items: center; gap: 10px; margin-left: auto;
    }
    .admin-items-btn:hover { background: #4169E1; }

    .item-tag {
        display: flex;
        align-items: center;
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
        border: 1px solid #4caf50;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        width: 130px;
        height: 30px;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        position: relative;
    }
    
    .item-tag::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 130%;
        left: 0;
        background: #121216;
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #4caf50;
        font-size: 13px;
        white-space: pre-wrap;
        width: 200px;
        max-width: 250px;
        z-index: 1000;
        pointer-events: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.9);
        display: none;
    }
    .item-tag:hover::after {
        display: block;
    }
`;
document.head.appendChild(style);

const modalHTML = `
    <div class="modal-overlay" id="lore-modal">
        <div class="modal-content">
            <button class="modal-close" id="modal-close-btn">✖</button>
            <h2>Описание и Медиа</h2>
            <label>Загрузить фото или GIF:</label>
            <input type="file" id="modal-image-file" accept="image/*" style="padding: 10px; background: #121216; border: 1px solid #555; color: #fff; border-radius: 6px; margin-bottom: 15px;">
            <div id="image-preview-container" style="margin-bottom: 15px;"></div>
            <label>Описание персонажа:</label>
            <textarea id="modal-description" placeholder="Напишите историю..."></textarea>
            <button id="modal-save-btn" style="width: 100%; padding: 15px; font-size: 18px; background: #2e7d32; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Сохранить</button>
        </div>
    </div>

    <div class="modal-overlay" id="items-modal">
        <div class="modal-content" style="max-width: 800px;">
            <button class="modal-close" id="items-modal-close">✖</button>
            <h2 style="color: #6495ED;">База предметов</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <label>Название предмета:</label>
                    <input type="text" id="item-name-input" placeholder="Например: Зелье лечения">
                    <label>Описание / Эффект:</label>
                    <textarea id="item-desc-input" placeholder="Восстанавливает 2d4+2 ХП..." style="height: 100px;"></textarea>
                    <button id="add-item-btn" style="width: 100%; padding: 10px; background: #6495ED; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Добавить / Обновить</button>
                </div>
                <div style="flex: 1; border-left: 1px solid #444; padding-left: 20px;">
                    <label>Список предметов:</label>
                    <div id="items-list-container" style="max-height: 250px; overflow-y: auto; background: #121216; padding: 10px; border-radius: 6px; border: 1px solid #555; display: flex; flex-direction: column; gap: 5px;"></div>
                </div>
            </div>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

const loreModal = document.getElementById('lore-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalImageFile = document.getElementById('modal-image-file');
const modalDescription = document.getElementById('modal-description');
const imagePreviewContainer = document.getElementById('image-preview-container');
let currentEditingCharId = null;
let currentImageBase64 = '';

function collectCardData(card) {
    const data = { ac: 10 };
    card.querySelectorAll('[data-field]').forEach(inp => {
        data[inp.getAttribute('data-field')] = inp.value.trim();
    });

    const abilities = [];
    card.querySelectorAll('.abilities-container .ability-row').forEach(row => {
        const abInput = row.querySelector('.ability-input');
        if (abInput) {
            abilities.push({
                name: abInput.value.trim(),
                s: row.querySelector('.ability-s').value,
                en: row.querySelector('.ability-en').value,
                status: row.querySelector('.status-cube').getAttribute('data-status') || ''
            });
        }
    });
    data.abilities = abilities;

    const skills = [];
    card.querySelectorAll('.skills-list-container .skill-row').forEach(row => {
        const skInput = row.querySelector('.skill-input');
        if (skInput) {
            skills.push({
                name: skInput.value.trim(),
                har: row.querySelector('.skill-har').value,
                status: row.querySelector('.status-cube').getAttribute('data-status') || ''
            });
        }
    });
    data.skills = skills;

    const inventory = [];
    card.querySelectorAll('.inventory-list-container .inventory-row').forEach(row => {
        const inp = row.querySelector('.inventory-input');
        const tag = row.querySelector('.item-tag');
        const count = row.querySelector('.inventory-count');
        if (inp) inventory.push({ name: inp.value.trim(), count: count ? count.value : 1 });
        else if (tag) inventory.push({ name: tag.getAttribute('data-name') || tag.textContent.trim(), count: count ? count.value : 1 });
    });
    data.inventory = inventory;

    const equipment = [];
    card.querySelectorAll('.equipment-list-container .equipment-row').forEach(row => {
        const eqInput = row.querySelector('.equipment-input');
        if (eqInput) equipment.push(eqInput.value.trim());
    });
    data.equipment = equipment;

    return data;
}

async function saveCard(card, extraData = {}) {
    const id = card.getAttribute('data-char-id');
    const payload = { ...collectCardData(card), ...extraData };
    await fetch(`${DB_URL}/characters/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

modalCloseBtn.onclick = () => {
    loreModal.classList.remove('active');
    currentEditingCharId = null;
    currentImageBase64 = '';
    modalImageFile.value = '';
};

modalImageFile.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageBase64 = event.target.result;
            imagePreviewContainer.innerHTML = `<img src="${currentImageBase64}" style="max-width: 100%; max-height: 150px; border-radius: 6px; border: 1px solid #555;">`;
        };
        reader.readAsDataURL(file);
    }
};

modalSaveBtn.onclick = async () => {
    if (!currentEditingCharId) return;
    const card = document.querySelector(`div[data-char-id="${currentEditingCharId}"]`);
    if (!card) return;

    await saveCard(card, {
        description: modalDescription.value.trim(),
        image: currentImageBase64
    });

    loreModal.classList.remove('active');
    currentEditingCharId = null;
    await loadData();
};

const itemsModal = document.getElementById('items-modal');
const itemsModalClose = document.getElementById('items-modal-close');
const itemNameInput = document.getElementById('item-name-input');
const itemDescInput = document.getElementById('item-desc-input');
const addItemBtn = document.getElementById('add-item-btn');
const itemsListContainer = document.getElementById('items-list-container');

itemsModalClose.onclick = () => itemsModal.classList.remove('active');

async function loadItemsDB() {
    const res = await fetch(`${DB_URL}/items.json`);
    if (!res.ok) throw new Error('Не удалось загрузить базу предметов');
    const rawItems = await res.json();
    globalItemsDB = rawItems ? Object.values(rawItems) : [];

    itemsListContainer.innerHTML = '';
    if (globalItemsDB.length === 0) {
        itemsListContainer.innerHTML = '<p style="color: #888;">База пуста.</p>';
    } else {
        globalItemsDB.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; flex-direction: column; background: #1e1e24; padding: 8px; border-radius: 4px; border-left: 2px solid #4caf50; margin-bottom: 5px;';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #4caf50; font-weight: bold;">${escapeHtml(item.name)}</span>
                    <button class="delete-item-btn" style="background: none; border: none; color: #ff4d4d; cursor: pointer;">✖</button>
                </div>
                <span style="color: #aaa; font-size: 12px; margin-top: 4px;">${escapeHtml(item.description)}</span>
            `;
            div.querySelector('.delete-item-btn').addEventListener('click', () => window.deleteItem(item.name));
            itemsListContainer.appendChild(div);
        });
    }
}

window.deleteItem = async (name) => {
    if (confirm('Удалить предмет из базы?')) {
        await fetch(`${DB_URL}/items/${makeKey(name)}.json`, { method: 'DELETE' });
        await loadItemsDB();
        await loadData();
    }
};

addItemBtn.onclick = async () => {
    const name = itemNameInput.value.trim();
    const desc = itemDescInput.value.trim();
    if (!name || !desc) return alert('Заполните название и описание!');

    await fetch(`${DB_URL}/items/${makeKey(name)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc })
    });
    itemNameInput.value = '';
    itemDescInput.value = '';
    await loadItemsDB();
    await loadData();
};

window.editItemTag = (el) => {
    const name = el.getAttribute('data-name');
    const card = el.closest('div[data-char-id]');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inventory-input ability-input';
    input.value = name;
    input.placeholder = 'Предмет...';

    el.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });

    input.addEventListener('blur', async () => {
        await saveCard(card);
        await loadData();
    });
};

function calculateLevel(xp) {
    xp = parseInt(xp) || 0;
    if (xp >= 2900) return 9;
    if (xp >= 2500) return 8;
    if (xp >= 2100) return 7;
    if (xp >= 1700) return 6;
    if (xp >= 1300) return 5;
    if (xp >= 900) return 4;
    if (xp >= 600) return 3;
    if (xp >= 300) return 2;
    return 1;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

function triggerLevelEffect(inputElement, oldLevel, newLevel) {
    if (oldLevel === newLevel) return;
    inputElement.classList.remove('level-pop');
    void inputElement.offsetWidth;
    inputElement.classList.add('level-pop');
    if (newLevel > oldLevel) {
        inputElement.style.borderColor = '#4caf50'; inputElement.style.boxShadow = '0 0 10px #4caf50'; inputElement.style.color = '#4caf50';
    } else {
        inputElement.style.borderColor = '#ff4d4d'; inputElement.style.boxShadow = '0 0 10px #ff4d4d'; inputElement.style.color = '#ff4d4d';
    }
    setTimeout(() => { inputElement.style.borderColor = '#555'; inputElement.style.boxShadow = 'none'; inputElement.style.color = '#fff'; }, 1000);
}

xpInput.addEventListener('input', debounce(() => {
    const oldLevel = parseInt(levelInput.value) || 1;
    const newLevel = calculateLevel(xpInput.value);
    if (oldLevel !== newLevel) { levelInput.value = newLevel; triggerLevelEffect(levelInput, oldLevel, newLevel); }
}, 800));

const statuses = ['', '🔒', '🦠', '✅'];

function attachStatusCubeHandler(cube) {
    cube.addEventListener('click', async () => {
        const curStat = cube.getAttribute('data-status') || '';
        const curIdx = statuses.indexOf(curStat);
        const nxtIdx = (curIdx + 1) % statuses.length;
        cube.setAttribute('data-status', statuses[nxtIdx]);
        cube.textContent = statuses[nxtIdx];
        const card = cube.closest('div[data-char-id]');
        if (card) await saveCard(card);
    });
}

function attachFieldSaveHandler(element) {
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); element.blur(); }
    });

    element.addEventListener('blur', async () => {
        const card = element.closest('div[data-char-id]');
        await saveCard(card);

        if (element.classList.contains('inventory-input')) {
            await loadData();
        } else {
            element.style.borderColor = '#4caf50';
            setTimeout(() => { element.style.borderColor = '#555'; }, 500);
        }
    });
}

function createCardHTML(char, showMaster, canDelete) {
    const deleteBtn = canDelete ? '<button class="delete-btn" data-id="' + escapeHtml(char.id) + '" title="Удалить" style="position: absolute; top: 25px; right: 25px; width: 40px; height: 40px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255, 77, 77, 0.5); border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 0; color: #ff4d4d; transition: 0.2s;">🗑️</button>' : '';
    const downloadBtn = '<button class="download-btn" data-id="' + escapeHtml(char.id) + '" title="Скачать карточку (JSON)">📥</button>';
    const loreBtn = '<button class="lore-btn" data-id="' + escapeHtml(char.id) + '" title="Описание и Медиа">📜</button>';

    const creatorText = showMaster ? '<p style="font-size: 15px; color: #ffd700; margin-bottom: 15px; margin-left: 110px;">Создатель: ' + escapeHtml(char.login) + '</p>' : '<div style="margin-bottom: 15px;"></div>';

    let abilitiesHtml = '';
    if (char.abilities && char.abilities.length > 0) {
        char.abilities.forEach(ab => {
            const name = typeof ab === 'object' ? ab.name : ab;
            const s = typeof ab === 'object' ? (ab.s || 0) : 0;
            const en = typeof ab === 'object' ? (ab.en || 0) : 0;
            const status = typeof ab === 'object' ? (ab.status || '') : '';
            abilitiesHtml += `
                <div class="ability-row">
                    <div class="status-cube" data-status="${escapeHtml(status)}">${escapeHtml(status)}</div>
                    <input type="text" class="ability-input" value="${escapeHtml(name || '')}" placeholder="Название...">
                    <input type="number" class="ability-s mini-stat" value="${escapeHtml(s)}" placeholder="С" title="С">
                    <input type="number" class="ability-en mini-stat" value="${escapeHtml(en)}" placeholder="ЕН" title="ЕН">
                </div>
            `;
        });
    }
    const abilityCount = char.abilities ? char.abilities.length : 0;

    let skillsHtml = '';
    if (char.skills && char.skills.length > 0) {
        char.skills.forEach(sk => {
            const name = typeof sk === 'object' ? sk.name : sk;
            const har = typeof sk === 'object' ? (sk.har || 0) : 0;
            const status = typeof sk === 'object' ? (sk.status || '') : '';
            skillsHtml += `
                <div class="ability-row skill-row">
                    <div class="status-cube" data-status="${escapeHtml(status)}">${escapeHtml(status)}</div>
                    <input type="text" class="skill-input" value="${escapeHtml(name || '')}" placeholder="Название...">
                    <input type="number" class="skill-har mini-stat" value="${escapeHtml(har)}" placeholder="ХАР" title="ХАР">
                </div>
            `;
        });
    }
    const skillCount = char.skills ? char.skills.length : 0;

    const inventory = char.inventory || [{ name: "", count: 1 }, { name: "", count: 1 }, { name: "", count: 1 }];
    let inventoryHtml = '';
    inventory.forEach(item => {
        const name = typeof item === 'object' ? item.name : item;
        const count = typeof item === 'object' ? (item.count || 1) : 1;
        const itemInDB = globalItemsDB.find(i => i.name.toLowerCase() === (name || '').toLowerCase());

        if (itemInDB) {
            inventoryHtml += `
                <div class="ability-row inventory-row">
                    <div class="item-tag" data-tooltip="${escapeHtml(itemInDB.description)}" title="${escapeHtml(itemInDB.description)}" data-name="${escapeHtml(name)}" onclick="editItemTag(this)">${escapeHtml(name)}</div>
                    <input type="number" class="inventory-count mini-stat" value="${escapeHtml(count)}" placeholder="Кол-во">
                </div>
            `;
        } else {
            inventoryHtml += `
                <div class="ability-row inventory-row">
                    <input type="text" class="inventory-input ability-input" value="${escapeHtml(name || '')}" placeholder="Предмет...">
                    <input type="number" class="inventory-count mini-stat" value="${escapeHtml(count)}" placeholder="Кол-во">
                </div>
            `;
        }
    });
    const inventoryCount = inventory.length;

    const equipment = char.equipment || ["", "", "", ""];
    let equipmentHtml = '';
    equipment.forEach((item, index) => {
        let handIcon = '';
        if (index === 0) handIcon = '<span class="hand-label" title="Левая рука">✋</span>';
        if (index === 1) handIcon = '<span class="hand-label" title="Правая рука">🤚</span>';

        equipmentHtml += `
            <div class="ability-row equipment-row">
                ${handIcon}
                <input type="text" class="equipment-input ability-input" value="${escapeHtml(item || '')}" placeholder="${index === 0 ? 'Левая рука...' : index === 1 ? 'Правая рука...' : 'Снаряжение...'}">
            </div>
        `;
    });
    const equipmentCount = equipment.length;

    let html = '<div style="background: rgba(255,255,255,0.1); padding: 25px; padding-right: 180px; border-radius: 10px; border-left: 5px solid #4caf50; margin-bottom: 15px; position: relative;" data-char-id="' + escapeHtml(char.id) + '">';

    if (char.image && char.image.length > 50) {
        html += `<div style="margin-left: 110px; margin-bottom: 15px;"><img src="${char.image}" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 2px solid #555; object-fit: cover;" onerror="this.style.display='none'"></div>`;
    }

    html += '<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">';
    html += '<label style="color: #aaa; font-size: 18px; width: 90px;">Имя:</label>';
    html += '<input type="text" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="name" value="' + escapeHtml(char.name || '') + '" style="background: transparent; color: #fff; border: 1px solid transparent; padding: 5px 10px; border-radius: 6px; width: 300px; outline: none; font-size: 22px; font-weight: bold;">';
    html += '</div>';

    if (char.description) {
        html += `<div class="char-description">${escapeHtml(char.description)}</div>`;
    }

    html += creatorText;

    html += '<div style="display: flex; gap: 40px; margin-bottom: 25px; margin-left: 110px;">';
    html += '<div style="display: flex; align-items: center; gap: 10px;"><label style="color: #aaa; font-size: 18px;">Уровень:</label><input type="number" id="card-level-' + escapeHtml(char.id) + '" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="level" value="' + escapeHtml(char.level || 1) + '" readonly style="background: #1a1a1a; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 6px; width: 80px; height: 40px; font-size: 18px; text-align: center; cursor: not-allowed; transition: 0.3s;"></div>';
    html += '<div style="display: flex; align-items: center; gap: 10px;"><label style="color: #aaa; font-size: 18px;">XP:</label><input type="number" class="inline-edit card-xp-input" data-id="' + escapeHtml(char.id) + '" data-field="xp" value="' + escapeHtml(char.xp || 0) + '" style="background: #1e1e24; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 6px; width: 100px; height: 40px; font-size: 18px; text-align: center;"></div>';
    html += '</div>';

    html += '<div style="background: rgba(0,0,0,0.2); padding: 25px; border-radius: 8px; margin-left: 110px;">';
    html += '<p style="color: #ffd700; font-size: 18px; margin-bottom: 20px; font-weight: bold;">ХАРАКТЕРИСТИКИ</p>';
    html += '<div style="display: grid; grid-template-columns: 90px 120px 90px 120px; gap: 20px 20px; align-items: center; font-size: 18px; color: #ccc;">';
    html += '<div>ХП:</div><div style="display: flex; align-items: center; gap: 5px; width: 100%;"><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="hp" value="' + escapeHtml(char.hp ?? 10) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"><span style="color:#888;">/</span><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="hpMax" value="' + escapeHtml(char.hpMax ?? 10) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"></div>';
    html += '<div>СИЛ:</div><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="str" value="' + escapeHtml(char.str ?? 10) + '" style="width: 100%; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center; padding: 0 10px;">';
    html += '<div>ЕН:</div><div style="display: flex; align-items: center; gap: 5px; width: 100%;"><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="en" value="' + escapeHtml(char.en ?? 10) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"><span style="color:#888;">/</span><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="enMax" value="' + escapeHtml(char.enMax ?? 10) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"></div>';
    html += '<div>ЛОВ:</div><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="dex" value="' + escapeHtml(char.dex ?? 10) + '" style="width: 100%; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center; padding: 0 10px;">';
    html += '<div>СТРЕС:</div><div style="display: flex; align-items: center; gap: 5px; width: 100%;"><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="stress" value="' + escapeHtml(char.stress ?? 0) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"><span style="color:#888;">/</span><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="stressMax" value="' + escapeHtml(char.stressMax ?? 10) + '" style="width: 50px; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center;"></div>';
    html += '<div>РАЗУМ:</div><input type="number" class="inline-edit" data-id="' + escapeHtml(char.id) + '" data-field="razum" value="' + escapeHtml(char.razum ?? 10) + '" style="width: 100%; height: 40px; font-size: 18px; background: #1e1e24; color: #fff; border: 1px solid #555; border-radius: 6px; text-align: center; padding: 0 10px;">';
    html += '<div></div><div></div>';
    html += '</div></div>';

    html += '<div class="skills-container" style="margin-left: 110px;">';
    html += '<div class="column-50">';
    html += '<div class="column-header"><p>СПОСОБНОСТИ</p><span class="ability-counter">' + abilityCount + ' / 10</span></div>';
    html += '<div class="abilities-container">' + abilitiesHtml + '</div>';
    html += '<div class="ability-controls">';
    html += '<button class="btn-ability-control btn-add-ability" title="Добавить">+</button>';
    html += '<button class="btn-ability-control btn-remove-ability" title="Удалить">−</button>';
    html += '</div></div>';

    html += '<div class="column-50">';
    html += '<div class="column-header"><p>НАВЫКИ</p><span class="skill-counter">' + skillCount + ' / 10</span></div>';
    html += '<div class="skills-list-container">' + skillsHtml + '</div>';
    html += '<div class="ability-controls">';
    html += '<button class="btn-ability-control btn-add-skill" title="Добавить">+</button>';
    html += '<button class="btn-ability-control btn-remove-skill" title="Удалить">−</button>';
    html += '</div></div>';
    html += '</div>';

    html += '<div class="skills-container" style="margin-left: 110px;">';
    html += '<div class="column-50">';
    html += '<div class="column-header"><p>ИНВЕНТАРЬ</p><span class="inventory-counter">' + inventoryCount + ' / 20</span></div>';
    html += '<div class="inventory-list-container">' + inventoryHtml + '</div>';
    html += '<div class="ability-controls">';
    html += '<button class="btn-ability-control btn-add-inventory" title="Добавить">+</button>';
    html += '<button class="btn-ability-control btn-remove-inventory" title="Удалить">−</button>';
    html += '</div></div>';

    html += '<div class="column-50">';
    html += '<div class="column-header"><p>ЭКИПИРОВКА</p><span class="equipment-counter">' + equipmentCount + ' / 10</span></div>';
    html += '<div class="equipment-list-container">' + equipmentHtml + '</div>';
    html += '<div class="ability-controls">';
    html += '<button class="btn-ability-control btn-add-equipment" title="Добавить">+</button>';
    html += '<button class="btn-ability-control btn-remove-equipment" title="Удалить">−</button>';
    html += '</div></div>';
    html += '</div>';

    html += downloadBtn;
    html += loreBtn;
    html += deleteBtn;
    html += '</div>';

    return html;
}

async function loadData() {
    try {
        if (DB_URL.includes('ВАШ-ПРОЕКТ')) {
            charactersList.innerHTML = '<p style="color: #ff4d4d;">Укажите ссылку DB_URL на вашу базу Firebase в файле app.js.</p>';
            return;
        }

        await loadItemsDB();

        const response = await fetch(`${DB_URL}/characters.json`);
        if (!response.ok) throw new Error('База недоступна');
        const rawChars = await response.json();
        const chars = rawChars ? Object.values(rawChars) : [];
        chars.sort((a, b) => Number(a.id) - Number(b.id));

        const charsToShow = isMaster
            ? [...chars].reverse()
            : chars.filter(c => c.login === currentUser).reverse();

        charactersList.innerHTML = '';
        if (charsToShow.length === 0) {
            charactersList.innerHTML = '<p style="color: #aaa; font-size: 18px;">Пока нет созданных персонажей.</p>';
        } else {
            charsToShow.forEach(c => { charactersList.innerHTML += createCardHTML(c, isMaster, true); });
        }

        if (isMaster) {
            const adminPanel = document.querySelector('.main-container');
            if (!document.getElementById('open-items-btn')) {
                const btn = document.createElement('button');
                btn.id = 'open-items-btn';
                btn.className = 'admin-items-btn';
                btn.innerHTML = '📖 База предметов';
                btn.onclick = () => itemsModal.classList.add('active');
                adminPanel.insertBefore(btn, adminPanel.children[1]);
            }
        }

        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const char = chars.find(c => c.id === id);
                if (!char) return;
                const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${char.name || 'character'}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
        });

        document.querySelectorAll('.lore-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const char = chars.find(c => c.id === id);
                currentEditingCharId = id;
                modalDescription.value = char.description || '';
                currentImageBase64 = char.image || '';
                imagePreviewContainer.innerHTML = (currentImageBase64 && currentImageBase64.length > 50)
                    ? `<img src="${currentImageBase64}" style="max-width: 100%; max-height: 150px;">`
                    : '';
                loreModal.classList.add('active');
            };
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                if (confirm('Удалить?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    await fetch(`${DB_URL}/characters/${id}.json`, { method: 'DELETE' });
                    await loadData();
                }
            };
        });

        document.querySelectorAll('.card-xp-input').forEach(input => {
            input.addEventListener('input', debounce((e) => {
                const id = input.getAttribute('data-id');
                const levelInputInCard = document.getElementById('card-level-' + id);
                const oldLevel = parseInt(levelInputInCard.value) || 1;
                const newLevel = calculateLevel(e.target.value);
                if (oldLevel !== newLevel) {
                    levelInputInCard.value = newLevel;
                    triggerLevelEffect(levelInputInCard, oldLevel, newLevel);
                }
            }, 800));
        });

        document.querySelectorAll('.status-cube').forEach(attachStatusCubeHandler);

        document.querySelectorAll('.btn-add-ability').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.abilities-container');
                const counter = card.querySelector('.ability-counter');
                const currentCount = container.querySelectorAll('.ability-row').length;
                if (currentCount >= 10) return alert('Максимум 10!');
                const newRow = document.createElement('div');
                newRow.className = 'ability-row';
                newRow.innerHTML = `
                    <div class="status-cube" data-status=""></div>
                    <input type="text" class="ability-input" value="" placeholder="Название...">
                    <input type="number" class="ability-s mini-stat" value="0" placeholder="С">
                    <input type="number" class="ability-en mini-stat" value="0" placeholder="ЕН">
                `;
                container.appendChild(newRow);
                counter.textContent = (currentCount + 1) + ' / 10';
                attachStatusCubeHandler(newRow.querySelector('.status-cube'));
                newRow.querySelectorAll('input').forEach(attachFieldSaveHandler);
                newRow.querySelector('.ability-input').focus();
            });
        });

        document.querySelectorAll('.btn-add-skill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.skills-list-container');
                const counter = card.querySelector('.skill-counter');
                const currentCount = container.querySelectorAll('.skill-row').length;
                if (currentCount >= 10) return alert('Максимум 10!');
                const newRow = document.createElement('div');
                newRow.className = 'ability-row skill-row';
                newRow.innerHTML = `
                    <div class="status-cube" data-status=""></div>
                    <input type="text" class="skill-input" value="" placeholder="Название...">
                    <input type="number" class="skill-har mini-stat" value="0" placeholder="ХАР">
                `;
                container.appendChild(newRow);
                counter.textContent = (currentCount + 1) + ' / 10';
                attachStatusCubeHandler(newRow.querySelector('.status-cube'));
                newRow.querySelectorAll('input').forEach(attachFieldSaveHandler);
                newRow.querySelector('.skill-input').focus();
            });
        });

        document.querySelectorAll('.btn-add-inventory').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.inventory-list-container');
                const counter = card.querySelector('.inventory-counter');
                const currentCount = container.querySelectorAll('.inventory-row').length;
                if (currentCount >= 20) return alert('Максимум 20!');
                const newRow = document.createElement('div');
                newRow.className = 'ability-row inventory-row';
                newRow.innerHTML = `
                    <input type="text" class="inventory-input ability-input" value="" placeholder="Предмет...">
                    <input type="number" class="inventory-count mini-stat" value="1" placeholder="Кол-во">
                `;
                container.appendChild(newRow);
                counter.textContent = (currentCount + 1) + ' / 20';
                newRow.querySelectorAll('input').forEach(attachFieldSaveHandler);
                newRow.querySelector('.inventory-input').focus();
            });
        });

        document.querySelectorAll('.btn-add-equipment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.equipment-list-container');
                const counter = card.querySelector('.equipment-counter');
                const currentCount = container.querySelectorAll('.equipment-row').length;
                if (currentCount >= 10) return alert('Максимум 10!');
                const newRow = document.createElement('div');
                newRow.className = 'ability-row equipment-row';
                newRow.innerHTML = `<input type="text" class="equipment-input ability-input" value="" placeholder="Снаряжение...">`;
                container.appendChild(newRow);
                counter.textContent = (currentCount + 1) + ' / 10';
                newRow.querySelectorAll('input').forEach(attachFieldSaveHandler);
                newRow.querySelector('.equipment-input').focus();
            });
        });

        document.querySelectorAll('.btn-remove-ability').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.abilities-container');
                const counter = card.querySelector('.ability-counter');
                const rows = container.querySelectorAll('.ability-row');
                if (rows.length === 0) return;
                if (confirm('Удалить эту способность?')) {
                    rows[rows.length - 1].remove();
                    counter.textContent = container.querySelectorAll('.ability-row').length + ' / 10';
                    await saveCard(card);
                }
            });
        });

        document.querySelectorAll('.btn-remove-skill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.skills-list-container');
                const counter = card.querySelector('.skill-counter');
                const rows = container.querySelectorAll('.skill-row');
                if (rows.length === 0) return;
                if (confirm('Удалить этот навык?')) {
                    rows[rows.length - 1].remove();
                    counter.textContent = container.querySelectorAll('.skill-row').length + ' / 10';
                    await saveCard(card);
                }
            });
        });

        document.querySelectorAll('.btn-remove-inventory').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.inventory-list-container');
                const counter = card.querySelector('.inventory-counter');
                const rows = container.querySelectorAll('.inventory-row');
                if (rows.length === 0) return;
                if (confirm('Удалить этот предмет?')) {
                    rows[rows.length - 1].remove();
                    counter.textContent = container.querySelectorAll('.inventory-row').length + ' / 20';
                    await saveCard(card);
                }
            });
        });

        document.querySelectorAll('.btn-remove-equipment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('div[data-char-id]');
                const container = card.querySelector('.equipment-list-container');
                const counter = card.querySelector('.equipment-counter');
                const rows = container.querySelectorAll('.equipment-row');
                if (rows.length === 0) return;
                if (confirm('Удалить этот предмет снаряжения?')) {
                    rows[rows.length - 1].remove();
                    counter.textContent = container.querySelectorAll('.equipment-row').length + ' / 10';
                    await saveCard(card);
                }
            });
        });

        document.querySelectorAll('.inline-edit, .ability-input, .ability-s, .ability-en, .skill-input, .skill-har, .inventory-input, .inventory-count, .equipment-input')
            .forEach(attachFieldSaveHandler);

    } catch (err) {
        console.error(err);
        charactersList.innerHTML = '<p style="color: #ff4d4d;">Ошибка загрузки данных. Проверьте ссылку DB_URL и правила доступа в Firebase.</p>';
    }
}

importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            const id = Date.now().toString();

            const newChar = {
                id,
                login: currentUser,
                name: importedData.name || 'Безымянный',
                hp: importedData.hp ?? 10,
                hpMax: importedData.hpMax ?? 10,
                ac: importedData.ac ?? 10,
                level: importedData.level ?? 1,
                xp: importedData.xp ?? 0,
                en: importedData.en ?? 10,
                enMax: importedData.enMax ?? 10,
                stress: importedData.stress ?? 0,
                stressMax: importedData.stressMax ?? 10,
                str: importedData.str ?? 10,
                dex: importedData.dex ?? 10,
                razum: importedData.razum ?? 10,
                abilities: importedData.abilities || [],
                skills: importedData.skills || [],
                inventory: importedData.inventory || [{ name: "", count: 1 }, { name: "", count: 1 }, { name: "", count: 1 }],
                equipment: importedData.equipment || ["", "", "", ""],
                description: importedData.description || '',
                image: importedData.image || ''
            };

            await fetch(`${DB_URL}/characters/${id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChar)
            });

            importFileInput.value = '';
            await loadData();
            alert('Карточка успешно загружена!');
        } catch (error) {
            alert('Ошибка при чтении файла. Убедитесь, что это корректный JSON-файл карточки.');
            console.error(error);
        }
    };
    reader.readAsText(file);
});

window.addEventListener('DOMContentLoaded', loadData);

saveBtn.addEventListener('click', async () => {
    if (!nameInput.value.trim()) {
        saveStatus.textContent = 'Введите имя!';
        saveStatus.style.color = 'red';
        return;
    }

    const id = Date.now().toString();
    const char = {
        id,
        login: currentUser,
        name: nameInput.value.trim(),
        hp: document.getElementById('char-hp').value,
        hpMax: document.getElementById('char-hp-max').value,
        ac: 10,
        level: levelInput.value,
        xp: xpInput.value,
        en: document.getElementById('char-en').value,
        enMax: document.getElementById('char-en-max').value,
        stress: document.getElementById('char-stress').value,
        stressMax: document.getElementById('char-stress-max').value,
        str: document.getElementById('char-str').value,
        dex: document.getElementById('char-dex').value,
        razum: document.getElementById('char-razum').value,
        abilities: [],
        skills: [],
        inventory: [{ name: "", count: 1 }, { name: "", count: 1 }, { name: "", count: 1 }],
        equipment: ["", "", "", ""],
        description: '',
        image: ''
    };

    await fetch(`${DB_URL}/characters/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(char)
    });

    saveStatus.textContent = 'Персонаж создан!';
    saveStatus.style.color = '#4caf50';
    setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    nameInput.value = '';
    xpInput.value = '0';
    levelInput.value = '1';
    await loadData();
});
