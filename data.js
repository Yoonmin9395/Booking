// Начальные данные для зала
export const HALL_ROWS = 4;
export const HALL_COLS = 6;

// Форматтеры дат (создаём один раз)
const DAY_FMT = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });
const WEEKDAY_FMT = new Intl.DateTimeFormat('ru', { weekday: 'short' });

// Динамическая генерация двух дней: сегодня и завтра.
// Возвращает массив с реальными датами на момент вызова.
export const buildDays = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
        {
            id: 'day-1',
            label: 'Сегодня',
            short: WEEKDAY_FMT.format(today).toUpperCase(),
            date: DAY_FMT.format(today)
        },
        {
            id: 'day-2',
            label: 'Завтра',
            short: WEEKDAY_FMT.format(tomorrow).toUpperCase(),
            date: DAY_FMT.format(tomorrow)
        }
    ];
};

// Начальное значение DAYS — на момент загрузки модуля.
// main.js может пересчитывать его через buildDays() при необходимости.
export const DAYS = buildDays();

// Функция для генерации уникальных мест
export const generateSeats = () => {
    const seats = [];
    let id = 1;
    for (let r = 1; r <= HALL_ROWS; r++) {
        for (let c = 1; c <= HALL_COLS; c++) {
            const isVip = r === HALL_ROWS;
            seats.push({
                id: `seat-${id}`,
                row: r,
                col: c,
                category: isVip ? 'vip' : 'standard',
                price: isVip ? 500 : 300
            });
            id++;
        }
    }
    return seats;
};

// Три фильма × два сеанса × два дня = двенадцать сеансов.
// У каждого сеанса своя занятость мест.
export const SESSIONS = [
    // ---------- ДЕНЬ 1 ----------
    {
        id: 'session-1',
        day: 'day-1',
        time: '15:00',
        movie: 'Паразиты',
        genre: 'драма · 2019 · 2 ч 11 мин',
        poster: 'images/poster-1.jpg',
        initialOccupied: ['seat-3', 'seat-4', 'seat-8', 'seat-10', 'seat-13', 'seat-17', 'seat-21', 'seat-20']
    },
    {
        id: 'session-2',
        day: 'day-1',
        time: '18:00',
        movie: 'Паразиты',
        genre: 'драма · 2019 · 2 ч 11 мин',
        poster: 'images/poster-1.jpg',
        initialOccupied: ['seat-1', 'seat-5', 'seat-6', 'seat-11', 'seat-12', 'seat-18', 'seat-22', 'seat-24']
    },
    {
        id: 'session-3',
        day: 'day-1',
        time: '15:00',
        movie: 'Голодные игры',
        genre: 'фантастика · 2023 · 2 ч 37 мин',
        poster: 'images/poster-2.jpg',
        initialOccupied: ['seat-1', 'seat-2', 'seat-4', 'seat-7', 'seat-10', 'seat-16', 'seat-19', 'seat-23']
    },
    {
        id: 'session-4',
        day: 'day-1',
        time: '18:00',
        movie: 'Голодные игры',
        genre: 'фантастика · 2023 · 2 ч 37 мин',
        poster: 'images/poster-2.jpg',
        initialOccupied: ['seat-2', 'seat-3', 'seat-9', 'seat-14', 'seat-15', 'seat-20', 'seat-21', 'seat-24']
    },
    {
        id: 'session-5',
        day: 'day-1',
        time: '15:00',
        movie: 'Колония',
        genre: 'ужасы · 2026 · 2 ч 2 мин',
        poster: 'images/poster-3.jpg',
        initialOccupied: ['seat-1', 'seat-3', 'seat-6', 'seat-9', 'seat-12', 'seat-15', 'seat-18', 'seat-23']
    },
    {
        id: 'session-6',
        day: 'day-1',
        time: '18:00',
        movie: 'Колония',
        genre: 'ужасы · 2026 · 2 ч 2 мин',
        poster: 'images/poster-3.jpg',
        initialOccupied: ['seat-2', 'seat-4', 'seat-7', 'seat-10', 'seat-13', 'seat-16', 'seat-19', 'seat-22']
    },

    // ---------- ДЕНЬ 2 ----------
    {
        id: 'session-7',
        day: 'day-2',
        time: '12:00',
        movie: 'Паразиты',
        genre: 'драма · 2019 · 2 ч 11 мин',
        poster: 'images/poster-1.jpg',
        initialOccupied: ['seat-2', 'seat-5', 'seat-9', 'seat-11', 'seat-14', 'seat-18', 'seat-20', 'seat-23']
    },
    {
        id: 'session-8',
        day: 'day-2',
        time: '20:00',
        movie: 'Паразиты',
        genre: 'драма · 2019 · 2 ч 11 мин',
        poster: 'images/poster-1.jpg',
        initialOccupied: ['seat-1', 'seat-4', 'seat-7', 'seat-12', 'seat-15', 'seat-19', 'seat-21', 'seat-24']
    },
    {
        id: 'session-9',
        day: 'day-2',
        time: '12:00',
        movie: 'Голодные игры',
        genre: 'фантастика · 2023 · 2 ч 37 мин',
        poster: 'images/poster-2.jpg',
        initialOccupied: ['seat-3', 'seat-6', 'seat-8', 'seat-13', 'seat-16', 'seat-17', 'seat-22', 'seat-24']
    },
    {
        id: 'session-10',
        day: 'day-2',
        time: '20:00',
        movie: 'Голодные игры',
        genre: 'фантастика · 2023 · 2 ч 37 мин',
        poster: 'images/poster-2.jpg',
        initialOccupied: ['seat-1', 'seat-2', 'seat-5', 'seat-10', 'seat-14', 'seat-18', 'seat-20', 'seat-23']
    },
    {
        id: 'session-11',
        day: 'day-2',
        time: '12:00',
        movie: 'Колония',
        genre: 'ужасы · 2026 · 2 ч 2 мин',
        poster: 'images/poster-3.jpg',
        initialOccupied: ['seat-4', 'seat-7', 'seat-9', 'seat-11', 'seat-15', 'seat-19', 'seat-21', 'seat-24']
    },
    {
        id: 'session-12',
        day: 'day-2',
        time: '20:00',
        movie: 'Колония',
        genre: 'ужасы · 2026 · 2 ч 2 мин',
        poster: 'images/poster-3.jpg',
        initialOccupied: ['seat-2', 'seat-3', 'seat-6', 'seat-8', 'seat-12', 'seat-16', 'seat-17', 'seat-22']
    }
];

export const SEATS = generateSeats();