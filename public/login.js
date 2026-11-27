const loginInput = document.getElementById('auth-login');
const passInput = document.getElementById('auth-pass');
const authBtn = document.getElementById('auth-btn');
const authStatus = document.getElementById('auth-status');
const formTitle = document.getElementById('form-title');
const masterCheckbox = document.getElementById('master-checkbox');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');

let isLoginMode = true; // По умолчанию мы на экране Входа

// Переключение между Входом и Регистрацией
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        formTitle.textContent = 'Вход';
        authBtn.textContent = 'Войти';
        masterCheckbox.style.display = 'none';
        toggleText.textContent = 'Нет аккаунта?';
        toggleLink.textContent = 'Зарегистрироваться';
    } else {
        formTitle.textContent = 'Регистрация';
        authBtn.textContent = 'Создать аккаунт';
        masterCheckbox.style.display = 'flex'; // Показываем чекбокс (если он есть в HTML)
        toggleText.textContent = 'Уже есть аккаунт?';
        toggleLink.textContent = 'Войти';
    }
});

// Нажатие на главную кнопку
authBtn.addEventListener('click', async () => {
    const login = loginInput.value.trim();
    const pass = passInput.value;
    
    // Проверяем, существует ли чекбокс мастера в HTML (чтобы не было ошибки)
    let isMaster = false;
    const masterCheck = document.getElementById('is-master');
    if (masterCheck) {
        isMaster = masterCheck.checked;
    }

    if (!login || !pass) {
        authStatus.textContent = 'Заполните все поля!';
        authStatus.style.color = 'red';
        return;
    }

    // Отправляем запрос на сервер (регистрация или вход)
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, pass, isMaster })
    });

    const data = await response.json();

    if (response.ok) {
        // Если успешно, сохраняем логин в браузере
        localStorage.setItem('currentUser', login);
        
        // Всегда перекидываем на страницу игрока
        window.location.href = '/player.html';
        
    } else {
        authStatus.textContent = data.error || 'Ошибка';
        authStatus.style.color = 'red';
    }
});