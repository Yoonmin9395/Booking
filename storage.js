const STORAGE_KEY = 'cinema_booking_app_state';

// Загрузка состояния из localStorage
export const loadState = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        
        // Базовая валидация структуры
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tickets)) {
            throw new Error('Неверная структура данных');
        }
        return parsed;
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        // Возвращаем специальный флаг, чтобы показать ошибку в UI
        return { error: 'Не удалось загрузить сохраненные данные. Возможно, хранилище повреждено.' };
    }
};

// Сохранение состояния
export const saveState = (state) => {
    try {
        // Сохраняем только необходимые данные (билеты), чтобы не раздувать хранилище
        const toSave = {
            tickets: state.tickets
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
};

// Очистка
export const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
};