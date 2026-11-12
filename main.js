import { SEATS, SESSIONS } from './data.js';
import { loadState, saveState, clearStorage } from './storage.js';

// --- ГЛОБАЛЬНЫЙ СТЕЙТ ---
let state = {
    selectedSessionId: SESSIONS[0].id,
    selectedCategory: 'all',
    selectedSeats: [],
    tickets: [],
    error: null
};

// --- DOM ---
const sessionCards = document.getElementById('session-cards');
const categorySelect = document.getElementById('category-select');
const hallGrid = document.getElementById('hall-grid');
const bookingCard = document.getElementById('booking-card');
const selectedInfo = document.getElementById('selected-info');
const totalPriceEl = document.getElementById('total-price');
const bookingForm = document.getElementById('booking-form');
const userNameInput = document.getElementById('user-name');
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
        if (loaded.error) showError(loaded.error);
        else state.tickets = loaded.tickets || [];
    }

    categorySelect.addEventListener('change', handleCategoryChange);
    bookingForm.addEventListener('submit', handleBookingSubmit);
    resetAllBtn.addEventListener('click', handleResetAll);
    hallGrid.addEventListener('click', handleSeatClick);
    ticketsList.addEventListener('click', handleCancelTicket);

    // Делегирование клика по карточкам сеансов
    sessionCards.addEventListener('click', (e) => {
        const card = e.target.closest('.session-card');
        if (!card) return;
        state.selectedSessionId = card.dataset.id;
        state.selectedSeats = [];
        render();
        document.getElementById('hall-section').scrollIntoView({ behavior: 'smooth' });
    });

    scrollToBooking.addEventListener('click', () =>
        document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' })
    );

    initHeroSlider();
    render();
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

    // Пауза при наведении на герой
    heroSlider.addEventListener('mouseenter', stop);
    heroSlider.addEventListener('mouseleave', start);

    start();
};

// --- ЛОГИКА ---
const getCurrentSession = () => SESSIONS.find(s => s.id === state.selectedSessionId);

const getOccupiedSeats = () => {
    const session = getCurrentSession();
    const initial = session.initialOccupied || [];
    const booked = state.tickets
        .filter(t => t.sessionId === state.selectedSessionId)
        .flatMap(t => t.seatIds);
    return new Set([...initial, ...booked]);
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
            showError('Выбор сброшен, так как выбранные места скрыты фильтром.');
        }
    }
    render();
};

const handleSeatClick = (e) => {
    const seatBtn = e.target.closest('.seat');
    if (!seatBtn || seatBtn.classList.contains('occupied')) return;
    const seatId = seatBtn.dataset.id;
    if (getOccupiedSeats().has(seatId)) return;

    if (state.selectedSeats.includes(seatId)) {
        state.selectedSeats = state.selectedSeats.filter(id => id !== seatId);
    } else {
        state.selectedSeats.push(seatId);
    }
    render();
};

const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (state.selectedSeats.length === 0) return;

    const occupied = getOccupiedSeats();
    if (state.selectedSeats.some(id => occupied.has(id))) {
        showError('Некоторые из выбранных мест уже заняты. Обновите выбор.');
        state.selectedSeats = [];
        render();
        return;
    }

    const session = getCurrentSession();
    const seatsDetails = state.selectedSeats.map(id => SEATS.find(s => s.id === id));
    const total = seatsDetails.reduce((sum, s) => sum + s.price, 0);

    state.tickets.push({
        id: Date.now().toString(),
        sessionId: session.id,
        sessionTime: session.time,
        sessionMovie: session.movie,
        seatIds: [...state.selectedSeats],
        seatsInfo: seatsDetails.map(s => `Ряд ${s.row} Место ${s.col} (${s.category === 'vip' ? 'VIP' : 'Стандарт'})`),
        totalPrice: total,
        userName: userNameInput.value.trim() || 'Гость'
    });

    saveState(state);
    state.selectedSeats = [];
    userNameInput.value = '';
    render();
};

const handleCancelTicket = (e) => {
    if (!e.target.classList.contains('cancel-btn')) return;
    state.tickets = state.tickets.filter(t => t.id !== e.target.dataset.id);
    saveState(state);
    render();
};

const handleResetAll = () => {
    if (confirm('Удалить все билеты?')) {
        state.tickets = [];
        state.selectedSeats = [];
        clearStorage();
        render();
    }
};

const showError = (msg) => {
    state.error = msg;
    errorMessageEl.textContent = msg;
    errorMessageEl.classList.remove('hidden');
    setTimeout(() => {
        errorMessageEl.classList.add('hidden');
        state.error = null;
    }, 5000);
};

// --- РЕНДЕР ---
const render = () => {
    renderSessions();
    renderHall();
    renderBookingCard();
    renderTickets();
};

// NEW: карточка сеанса теперь с обложкой
const renderSessions = () => {
    sessionCards.innerHTML = '';
    SESSIONS.forEach(session => {
        const isActive = session.id === state.selectedSessionId;
        const card = document.createElement('button');
        card.className = 'session-card' + (isActive ? ' active' : '');
        card.dataset.id = session.id;
        card.innerHTML = `
            <div class="session-poster">
                <img src="${session.poster}" alt="Обложка фильма «${session.movie}»" loading="lazy">
            </div>
            <div class="session-info">
                <div class="session-time">${session.time}</div>
                <div class="session-movie">${session.movie}</div>
                <div class="session-genre">${session.genre}</div>
                <div class="session-meta">
                    <span>${isActive ? 'Выбран' : 'Выбрать сеанс'}</span>
                    <span class="arrow">→</span>
                </div>
            </div>
        `;
        sessionCards.appendChild(card);
    });
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
        btn.className = 'seat';
        btn.dataset.id = seat.id;
        btn.setAttribute('aria-pressed', state.selectedSeats.includes(seat.id) ? 'true' : 'false');

        if (occupied.has(seat.id)) {
            btn.classList.add('occupied');
            btn.disabled = true;
            btn.textContent = '×';
            btn.setAttribute('aria-label', `Ряд ${seat.row} Место ${seat.col} - Занято`);
        } else {
            if (seat.category === 'vip') btn.classList.add('vip');
            if (state.selectedSeats.includes(seat.id)) {
                btn.classList.add('selected');
                btn.textContent = '✓';
                btn.setAttribute('aria-label', `Ряд ${seat.row} Место ${seat.col} - Выбрано`);
            } else {
                btn.textContent = `${seat.row}-${seat.col}`;
                btn.setAttribute('aria-label', `Ряд ${seat.row} Место ${seat.col} - Свободно`);
            }
        }
        hallGrid.appendChild(btn);
    });
};

const renderBookingCard = () => {
    if (state.selectedSeats.length > 0) {
        bookingCard.classList.remove('hidden');
        const seatsDetails = state.selectedSeats.map(id => SEATS.find(s => s.id === id));
        const total = seatsDetails.reduce((sum, s) => sum + s.price, 0);
        selectedInfo.innerHTML = `
            <p><strong>Фильм:</strong> ${getCurrentSession().movie}</p>
            <p><strong>Сеанс:</strong> ${getCurrentSession().time}</p>
            <p><strong>Места:</strong> ${seatsDetails
                .map(s => `Ряд ${s.row} Место ${s.col} (${s.category === 'vip' ? 'VIP' : 'Стандарт'})`)
                .join(', ')}</p>
        `;
        totalPriceEl.textContent = total;
    } else {
        bookingCard.classList.add('hidden');
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
        card.innerHTML = `
            <div class="ticket-time">${ticket.sessionTime}</div>
            <div class="ticket-movie">${ticket.sessionMovie || 'Фильм'}</div>
            <p><strong>Места:</strong> ${ticket.seatsInfo.join(', ')}</p>
            <p><strong>Сумма:</strong> ${ticket.totalPrice} ₽</p>
            <p><strong>Имя:</strong> ${ticket.userName}</p>
            <button class="cancel-btn" data-id="${ticket.id}">Отменить</button>
        `;
        ticketsList.appendChild(card);
    });
};

init();