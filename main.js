import { SEATS, SESSIONS, DAYS, buildDays } from './data.js';
import { loadState, saveState, clearStorage } from './storage.js';

// --- ГЛОБАЛЬНЫЙ СТЕЙТ ---
// Храним копию DAYS в стейте, чтобы можно было пересчитывать при смене суток
let state = {
    days: DAYS.slice(),                   // актуальные на момент загрузки
    selectedDay: DAYS[0].id,              // текущий день
    selectedMovie: null,                  // текущий фильм
    selectedSessionId: null,              // текущий сеанс
    selectedCategory: 'all',              // 'all' | 'standard' | 'vip'
    selectedSeats: [],
    tickets: [],
    error: null
};

// Защита от двойного submit
let isSubmitting = false;

// --- DOM ---
const daySwitch = document.getElementById('day-switch');
const sessionCards = document.getElementById('session-cards');
const sessionSelect = document.getElementById('session-select');
const categorySelect = document.getElementById('category-select');
const hallGrid = document.getElementById('hall-grid');
const bookingCard = document.getElementById('booking-card');
const selectedInfo = document.getElementById('selected-info');
const totalPriceEl = document.getElementById('total-price');
const bookingForm = document.getElementById('booking-form');
const userNameInput = document.getElementById('user-name');
const userNameError = document.getElementById('user-name-error');
const formError = document.getElementById('form-error');
const confirmBtn = document.getElementById('confirm-btn');
const ticketsList = document.getElementById('tickets-list');
const resetAllBtn = document.getElementById('reset-all-btn');
const errorMessageEl = document.getElementById('error-message');
const scrollToBooking = document.getElementById('scroll-to-booking');
const heroSlider = document.getElementById('hero-slider');
const heroDots = document.getElementById('hero-dots');

// --- ИНИЦИАЛИЗАЦИЯ ---
const init = () => {
    const loaded = loadState();
    if (loaded) {
        if (loaded.error) showToast(loaded.error);
        else state.tickets = loaded.tickets || [];
    }

    // Стартовый сеанс — первый сеанс первого дня
    const firstSession = SESSIONS.find(s => s.day === state.selectedDay) || SESSIONS[0];
    state.selectedMovie = firstSession.movie;
    state.selectedSessionId = firstSession.id;

    daySwitch.addEventListener('click', handleDayChange);
    sessionSelect.addEventListener('change', handleSessionFilterChange);
    categorySelect.addEventListener('change', handleCategoryChange);
    bookingForm.addEventListener('submit', handleBookingSubmit);
    resetAllBtn.addEventListener('click', handleResetAll);
    hallGrid.addEventListener('click', handleSeatClick);
    ticketsList.addEventListener('click', handleCancelTicket);
    sessionCards.addEventListener('click', handleSessionCardClick);

    scrollToBooking.addEventListener('click', () =>
        document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' })
    );

    initHeroSlider();
    startDateWatcher();
    render();
};

// --- СЛЕЖЕНИЕ ЗА СМЕНОЙ ДАТЫ ---
// Раз в минуту проверяем, не изменилась ли «сегодняшняя» дата.
// Если да — пересчитываем DAYS и перерисовываем интерфейс.
const startDateWatcher = () => {
    let lastDateKey = getTodayKey();

    setInterval(() => {
        const currentKey = getTodayKey();
        if (currentKey !== lastDateKey) {
            lastDateKey = currentKey;
            state.days = buildDays();
            // Если пользователь остался на «Сегодня» — он должен увидеть новую дату.
            render();
        }
    }, 60_000);
};

const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// --- СЛАЙДЕР ГЕРОЯ ---
const initHeroSlider = () => {
    if (!heroSlider || !heroDots) return;
    const slides = heroSlider.querySelectorAll('.hero-slide');
    const dots = heroDots.querySelectorAll('.hero-dot');
    if (slides.length <= 1) return;

    let current = 0;
    let timer = null;
    const INTERVAL = 6000;

    const goTo = (index) => {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    };

    const start = () => {
        stop();
        timer = setInterval(() => goTo(current + 1), INTERVAL);
    };

    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            goTo(Number(dot.dataset.index));
            start();
        });
    });

    heroSlider.addEventListener('mouseenter', stop);
    heroSlider.addEventListener('mouseleave', start);

    start();
};

// --- ЛОГИКА ---
const getDayInfo = (dayId) => state.days.find(d => d.id === dayId);

const getCurrentSession = () => SESSIONS.find(s => s.id === state.selectedSessionId);

// Сеансы выбранного дня
const getSessionsOfSelectedDay = () =>
    SESSIONS.filter(s => s.day === state.selectedDay);

// Сеансы выбранного фильма в выбранный день
const getSessionsOfSelectedMovie = () =>
    SESSIONS.filter(s => s.day === state.selectedDay && s.movie === state.selectedMovie);

// Группируем сеансы выбранного дня по фильму
const getMoviesWithSessions = () => {
    const map = new Map();
    getSessionsOfSelectedDay().forEach(s => {
        if (!map.has(s.movie)) {
            map.set(s.movie, { movie: s.movie, genre: s.genre, poster: s.poster, sessions: [] });
        }
        map.get(s.movie).sessions.push(s);
    });
    return [...map.values()];
};

const getOccupiedSeats = () => {
    const session = getCurrentSession();
    if (!session) return new Set();
    const initial = session.initialOccupied || [];
    const booked = state.tickets
        .filter(t => t.sessionId === state.selectedSessionId)
        .flatMap(t => t.seatIds);
    return new Set([...initial, ...booked]);
};

const resetSeatSelection = (message) => {
    if (state.selectedSeats.length > 0) {
        state.selectedSeats = [];
        showToast(message);
    }
};

// Переключение дня
const handleDayChange = (e) => {
    const btn = e.target.closest('.day-btn');
    if (!btn) return;
    const dayId = btn.dataset.day;
    if (!dayId || dayId === state.selectedDay) return;

    state.selectedDay = dayId;

    const firstSession = getSessionsOfSelectedDay()[0];
    if (firstSession) {
        state.selectedMovie = firstSession.movie;
        state.selectedSessionId = firstSession.id;
    }

    resetSeatSelection('День изменён — выбор мест сброшен.');
    render();
};

// Переключить фильм + сеанс с корректным сбросом выбора мест
const selectMovieAndSession = (movieName, sessionId) => {
    const movieSessions = SESSIONS.filter(
        s => s.day === state.selectedDay && s.movie === movieName
    );
    if (!movieSessions.length) return;

    const target = movieSessions.find(s => s.id === sessionId) || movieSessions[0];
    const movieChanged = state.selectedMovie !== movieName;

    if (!movieChanged && state.selectedSessionId === target.id) return;

    state.selectedMovie = movieName;
    state.selectedSessionId = target.id;

    resetSeatSelection('Фильм или сеанс изменён — выбор мест сброшен.');
    render();
};

// Клик по карточке фильма
const handleSessionCardClick = (e) => {
    const chip = e.target.closest('.time-chip');
    const card = e.target.closest('.session-card');
    if (!card) return;

    const movieName = card.dataset.movie;
    if (!movieName) return;

    if (chip) {
        selectMovieAndSession(movieName, chip.dataset.id);
    } else {
        selectMovieAndSession(movieName, null);
    }

    document.getElementById('hall-section').scrollIntoView({ behavior: 'smooth' });
};

// Смена сеанса через фильтр-<select>
const handleSessionFilterChange = (e) => {
    const newId = e.target.value;
    const session = SESSIONS.find(s => s.id === newId);
    if (!session) return;
    if (session.day !== state.selectedDay) return;
    if (session.movie !== state.selectedMovie) return;
    if (state.selectedSessionId === newId) return;

    state.selectedSessionId = newId;
    resetSeatSelection('Сеанс изменён — выбор мест сброшен.');
    render();
};

const handleCategoryChange = (e) => {
    state.selectedCategory = e.target.value;
    if (state.selectedSeats.length > 0) {
        const hidden = state.selectedSeats.filter(id => {
            const seat = SEATS.find(s => s.id === id);
            return state.selectedCategory !== 'all' && seat.category !== state.selectedCategory;
        });
        if (hidden.length > 0) {
            state.selectedSeats = [];
            showToast('Выбор сброшен, так как выбранные места скрыты фильтром.');
        }
    }
    render();
};

const handleSeatClick = (e) => {
    const seatBtn = e.target.closest('.seat');
    if (!seatBtn || seatBtn.classList.contains('occupied') || seatBtn.disabled) return;
    const seatId = seatBtn.dataset.id;
    if (getOccupiedSeats().has(seatId)) return;

    if (state.selectedSeats.includes(seatId)) {
        state.selectedSeats = state.selectedSeats.filter(id => id !== seatId);
    } else {
        state.selectedSeats.push(seatId);
    }
    render();
};

const clearFormErrors = () => {
    userNameError.textContent = '';
    userNameError.classList.add('hidden');
    formError.textContent = '';
    formError.classList.add('hidden');
};

const showFieldError = (el, msg) => {
    el.textContent = msg;
    el.classList.remove('hidden');
};

const handleBookingSubmit = (e) => {
    e.preventDefault();
    clearFormErrors();

    if (isSubmitting) return;

    if (state.selectedSeats.length === 0) {
        showFieldError(formError, 'Сначала выберите хотя бы одно место в зале.');
        return;
    }

    const name = userNameInput.value.trim();
    if (name.length === 0) {
        showFieldError(userNameError, 'Укажите имя — так билет будет проще найти.');
        userNameInput.focus();
        return;
    }
    if (name.length > 60) {
        showFieldError(userNameError, 'Имя слишком длинное (максимум 60 символов).');
        userNameInput.focus();
        return;
    }

    const occupied = getOccupiedSeats();
    if (state.selectedSeats.some(id => occupied.has(id))) {
        showFieldError(formError, 'Некоторые из выбранных мест уже заняты. Выбор сброшен — обновите его.');
        state.selectedSeats = [];
        render();
        return;
    }

    isSubmitting = true;
    confirmBtn.disabled = true;

    try {
        const session = getCurrentSession();
        const day = getDayInfo(session.day);
        const seatsDetails = state.selectedSeats.map(id => SEATS.find(s => s.id === id));
        const total = seatsDetails.reduce((sum, s) => sum + s.price, 0);

        const ticket = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sessionId: session.id,
            sessionDay: session.day,
            sessionDayLabel: day ? `${day.label}, ${day.date}` : session.day,
            sessionTime: session.time,
            sessionMovie: session.movie,
            seatIds: [...state.selectedSeats],
            seatsInfo: seatsDetails.map(s => `Ряд ${s.row} Место ${s.col} (${s.category === 'vip' ? 'VIP' : 'Стандарт'})`),
            totalPrice: total,
            userName: name
        };

        state.tickets.push(ticket);

        const saveResult = saveState(state);
        if (!saveResult.ok) {
            state.tickets = state.tickets.filter(t => t.id !== ticket.id);
            showFieldError(formError, saveResult.error);
            return;
        }

        state.selectedSeats = [];
        userNameInput.value = '';
        render();
    } finally {
        isSubmitting = false;
        confirmBtn.disabled = false;
    }
};

const handleCancelTicket = (e) => {
    if (!e.target.classList.contains('cancel-btn')) return;
    const ticketId = e.target.dataset.id;
    state.tickets = state.tickets.filter(t => t.id !== ticketId);
    const result = saveState(state);
    if (!result.ok) showToast(result.error);
    render();
};

const handleResetAll = () => {
    if (!state.tickets.length) {
        showToast('Своих билетов нет — сбрасывать нечего.');
        return;
    }
    if (!confirm('Удалить все свои билеты? Изначально занятые места останутся занятыми.')) return;
    state.tickets = [];
    state.selectedSeats = [];
    const result = clearStorage();
    if (!result.ok) showToast(result.error);
    render();
};

const showToast = (msg) => {
    state.error = msg;
    errorMessageEl.textContent = msg;
    errorMessageEl.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
        errorMessageEl.classList.add('hidden');
        state.error = null;
    }, 5000);
};

// --- СОХРАНЕНИЕ ФОКУСА ПОСЛЕ RENDER ---
const captureFocusKey = () => {
    const el = document.activeElement;
    if (!el) return null;
    if (el.dataset && el.dataset.id) {
        return { kind: 'seat-or-ticket', id: el.dataset.id, tag: el.tagName };
    }
    if (el.dataset && el.dataset.day) {
        return { kind: 'day', id: el.dataset.day, tag: el.tagName };
    }
    if (el.id) return { kind: 'id', id: el.id, tag: el.tagName };
    return null;
};

const restoreFocusKey = (key) => {
    if (!key) return;
    let target = null;
    if (key.kind === 'id') {
        target = document.getElementById(key.id);
    } else if (key.kind === 'seat-or-ticket') {
        target =
            hallGrid.querySelector(`[data-id="${CSS.escape(key.id)}"]`) ||
            ticketsList.querySelector(`[data-id="${CSS.escape(key.id)}"]`) ||
            sessionCards.querySelector(`[data-id="${CSS.escape(key.id)}"]`);
    } else if (key.kind === 'day') {
        target = daySwitch.querySelector(`[data-day="${CSS.escape(key.id)}"]`);
    }
    if (target && typeof target.focus === 'function' && !target.disabled) {
        target.focus({ preventScroll: true });
    }
};

// --- РЕНДЕР ---
const render = () => {
    const focusKey = captureFocusKey();
    renderDaySwitch();
    renderSessions();
    renderSessionFilter();
    renderHall();
    renderBookingCard();
    renderTickets();
    restoreFocusKey(focusKey);
};

const renderDaySwitch = () => {
    daySwitch.innerHTML = '';
    state.days.forEach(day => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day-btn' + (day.id === state.selectedDay ? ' active' : '');
        btn.dataset.day = day.id;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', day.id === state.selectedDay ? 'true' : 'false');
        btn.innerHTML = `
            <span class="day-short">${day.short}</span>
            <span class="day-label">${day.label}</span>
            <span class="day-date">${day.date}</span>
        `;
        daySwitch.appendChild(btn);
    });
};

const renderSessions = () => {
    sessionCards.innerHTML = '';
    getMoviesWithSessions().forEach(movie => {
        const isActiveMovie = movie.movie === state.selectedMovie;

        const card = document.createElement('div');
        card.className = 'session-card' + (isActiveMovie ? ' active' : '');
        card.dataset.movie = movie.movie;

        const timeChips = movie.sessions.map(s => {
            const chipActive = isActiveMovie && s.id === state.selectedSessionId;
            return `
                <button type="button"
                        class="time-chip${chipActive ? ' active' : ''}"
                        data-id="${s.id}"
                        aria-pressed="${chipActive}"
                        aria-label="Сеанс ${s.time} — ${movie.movie}">
                    ${s.time}
                </button>`;
        }).join('');

        card.innerHTML = `
            <div class="session-poster">
                <img src="${movie.poster}" alt="Обложка фильма «${movie.movie}»" loading="lazy">
            </div>
            <div class="session-info">
                <div class="session-movie">${movie.movie}</div>
                <div class="session-genre">${movie.genre}</div>
                <div class="session-times">${timeChips}</div>
            </div>
        `;
        sessionCards.appendChild(card);
    });
};

// <select> сеансов показывает ТОЛЬКО сеансы выбранного фильма в выбранный день
const renderSessionFilter = () => {
    const active = document.activeElement;
    const isFocused = active === sessionSelect;

    sessionSelect.innerHTML = '';

    getSessionsOfSelectedMovie().forEach(session => {
        const opt = document.createElement('option');
        opt.value = session.id;
        opt.textContent = `${session.time} — ${session.movie}`;
        if (session.id === state.selectedSessionId) opt.selected = true;
        sessionSelect.appendChild(opt);
    });

    sessionSelect.value = state.selectedSessionId;

    if (isFocused) sessionSelect.focus({ preventScroll: true });
};

const renderHall = () => {
    const occupied = getOccupiedSeats();
    hallGrid.innerHTML = '';
    SEATS.forEach(seat => {
        if (state.selectedCategory !== 'all' && seat.category !== state.selectedCategory) {
            const ph = document.createElement('div');
            ph.className = 'seat-placeholder';
            hallGrid.appendChild(ph);
            return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat';
        btn.dataset.id = seat.id;

        const isOccupied = occupied.has(seat.id);
        const isSelected = state.selectedSeats.includes(seat.id);
        const catLabel = seat.category === 'vip' ? 'VIP' : 'Стандарт';
        const statusLabel = isOccupied ? 'Занято' : isSelected ? 'Выбрано' : 'Свободно';

        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        btn.setAttribute('aria-label', `Ряд ${seat.row}, место ${seat.col}, ${catLabel} — ${statusLabel}`);
        btn.title = `Ряд ${seat.row}, место ${seat.col} — ${statusLabel}`;

        if (isOccupied) {
            btn.classList.add('occupied');
            btn.disabled = true;
            btn.textContent = '×';
        } else {
            if (seat.category === 'vip') btn.classList.add('vip');
            if (isSelected) {
                btn.classList.add('selected');
                btn.textContent = '✓';
            } else {
                btn.textContent = `${seat.row}-${seat.col}`;
            }
        }
        hallGrid.appendChild(btn);
    });
};

const renderBookingCard = () => {
    if (state.selectedSeats.length > 0) {
        bookingCard.classList.remove('hidden');
        const session = getCurrentSession();
        const day = getDayInfo(session.day);
        const seatsDetails = state.selectedSeats.map(id => SEATS.find(s => s.id === id));
        const total = seatsDetails.reduce((sum, s) => sum + s.price, 0);
        selectedInfo.innerHTML = `
            <p><strong>День:</strong> ${day ? `${day.label}, ${day.date}` : session.day}</p>
            <p><strong>Фильм:</strong> ${session.movie}</p>
            <p><strong>Сеанс:</strong> ${session.time}</p>
            <p><strong>Места:</strong> ${seatsDetails
                .map(s => `Ряд ${s.row} Место ${s.col} (${s.category === 'vip' ? 'VIP' : 'Стандарт'})`)
                .join(', ')}</p>
        `;
        totalPriceEl.textContent = total;
    } else {
        bookingCard.classList.add('hidden');
        clearFormErrors();
    }
};

const renderTickets = () => {
    ticketsList.innerHTML = '';
    if (state.tickets.length === 0) {
        ticketsList.innerHTML = '<p class="empty">У вас пока нет билетов.</p>';
        return;
    }
    state.tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        const dayLabel = ticket.sessionDayLabel || ticket.sessionDay || '';
        card.innerHTML = `
            <div class="ticket-day">${dayLabel}</div>
            <div class="ticket-time">${ticket.sessionTime}</div>
            <div class="ticket-movie">${ticket.sessionMovie}</div>
            <p><strong>Места:</strong> ${ticket.seatsInfo.join(', ')}</p>
            <p><strong>Сумма:</strong> ${ticket.totalPrice} ₽</p>
            <p><strong>Имя:</strong> ${ticket.userName}</p>
            <button type="button" class="cancel-btn" data-id="${ticket.id}">Отменить</button>
        `;
        ticketsList.appendChild(card);
    });
};

init();