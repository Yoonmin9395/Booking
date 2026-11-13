import { SEATS, SESSIONS } from './data.js';

const STORAGE_KEY = 'cinema_booking_app_state';

const SEAT_IDS = new Set(SEATS.map(s => s.id));
const SESSION_IDS = new Set(SESSIONS.map(s => s.id));
const SESSION_DAYS = new Map(SESSIONS.map(s => [s.id, s.day]));

const initialOccupiedBySession = new Map(
    SESSIONS.map(s => [s.id, new Set(s.initialOccupied || [])])
);

/**
 * Полная валидация массива билетов.
 * Возвращает { valid: true, tickets } либо { valid: false, error }.
 */
const validateTickets = (raw) => {
    if (!Array.isArray(raw)) {
        return { valid: false, error: 'Список билетов имеет неверный формат.' };
    }

    const seenTicketIds = new Set();
    const occupiedBySession = new Map(); // sessionId -> Set(seatId)

    const tickets = [];

    for (const t of raw) {
        if (!t || typeof t !== 'object') {
            return { valid: false, error: 'Одна из записей билета повреждена.' };
        }
        if (typeof t.id !== 'string' || t.id.length === 0) {
            return { valid: false, error: 'У билета отсутствует идентификатор.' };
        }
        if (seenTicketIds.has(t.id)) {
            return { valid: false, error: 'Обнаружены дублирующиеся билеты.' };
        }
        seenTicketIds.add(t.id);

        if (typeof t.sessionId !== 'string' || !SESSION_IDS.has(t.sessionId)) {
            return { valid: false, error: 'Билет ссылается на неизвестный сеанс.' };
        }

        // Проверка дня: если поле sessionDay есть — оно должно совпадать с днём сеанса
        if (t.sessionDay != null) {
            if (typeof t.sessionDay !== 'string' || t.sessionDay !== SESSION_DAYS.get(t.sessionId)) {
                return { valid: false, error: 'Билет ссылается на неверный день сеанса.' };
            }
        }

        if (!Array.isArray(t.seatIds) || t.seatIds.length === 0) {
            return { valid: false, error: 'У билета не указаны места.' };
        }

        if (typeof t.totalPrice !== 'number' || !Number.isFinite(t.totalPrice) || t.totalPrice <= 0) {
            return { valid: false, error: 'У билета некорректная сумма.' };
        }

        if (typeof t.userName !== 'string' || t.userName.length === 0) {
            return { valid: false, error: 'У билета не указано имя.' };
        }

        if (typeof t.sessionTime !== 'string' || typeof t.sessionMovie !== 'string') {
            return { valid: false, error: 'У билета отсутствуют данные сеанса.' };
        }

        if (!Array.isArray(t.seatsInfo) || t.seatsInfo.length !== t.seatIds.length) {
            return { valid: false, error: 'Данные о местах в билете повреждены.' };
        }

        if (!occupiedBySession.has(t.sessionId)) {
            occupiedBySession.set(t.sessionId, new Set());
        }
        const occupiedNow = occupiedBySession.get(t.sessionId);
        const initialOccupied = initialOccupiedBySession.get(t.sessionId);

        const seenSeatsInTicket = new Set();
        for (const seatId of t.seatIds) {
            if (typeof seatId !== 'string' || !SEAT_IDS.has(seatId)) {
                return { valid: false, error: 'Билет ссылается на неизвестное место.' };
            }
            if (seenSeatsInTicket.has(seatId)) {
                return { valid: false, error: 'В одном билете указано место дважды.' };
            }
            seenSeatsInTicket.add(seatId);

            if (initialOccupied && initialOccupied.has(seatId)) {
                return { valid: false, error: 'В сохранённых данных есть бронь на изначально занятое место.' };
            }
            if (occupiedNow.has(seatId)) {
                return { valid: false, error: 'В сохранённых данных одно место занято дважды.' };
            }
            occupiedNow.add(seatId);
        }

        tickets.push(t);
    }

    return { valid: true, tickets };
};

export const loadState = () => {
    let saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        return { error: 'Браузер запретил доступ к хранилищу. Брони не будут сохраняться.' };
    }
    if (!saved) return null;

    let parsed;
    try {
        parsed = JSON.parse(saved);
    } catch (e) {
        return { error: 'Сохранённые данные повреждены и не могут быть прочитаны.' };
    }

    if (!parsed || typeof parsed !== 'object' || !('tickets' in parsed)) {
        return { error: 'Сохранённые данные имеют неверную структуру.' };
    }

    const result = validateTickets(parsed.tickets);
    if (!result.valid) {
        return { error: `Данные билетов отклонены: ${result.error}` };
    }

    return { tickets: result.tickets };
};

export const saveState = (state) => {
    try {
        const toSave = { tickets: state.tickets };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        return { ok: true };
    } catch (e) {
        return { ok: false, error: 'Не удалось сохранить бронь в браузере. Проверьте настройки хранилища.' };
    }
};

export const clearStorage = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: 'Не удалось очистить сохранённые данные.' };
    }
};