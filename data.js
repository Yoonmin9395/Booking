// Начальные данные для зала
export const HALL_ROWS = 4;
export const HALL_COLS = 6;

// Функция для генерации уникальных мест
export const generateSeats = () => {
    const seats = [];
    let id = 1;
    for (let r = 1; r <= HALL_ROWS; r++) {
        for (let c = 1; c <= HALL_COLS; c++) {
            // Места в последнем ряду сделаем VIP
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

// Два фильма — два сеанса
export const SESSIONS = [
    {
        id: 'session-1',
        time: '15:00',
        movie: 'Паразиты',
        genre: 'драма · 2019 · 2 ч 11 мин',
        poster: 'images/poster-1.jpg', 
        initialOccupied: ['seat-3', 'seat-4', 'seat-8', 'seat-10', 'seat-13', 'seat-17', 'seat-21', 'seat-20']
    },
    {
        id: 'session-2',
        time: '18:00',
        movie: 'Голодные игры',
        genre: 'фантастика · 2023 · 2 ч 37 мин',
        poster: 'images/poster-2.jpg', 
        initialOccupied: ['seat-1', 'seat-2', 'seat-4', 'seat-7', 'seat-10', 'seat-16', 'seat-19', 'seat-23']
    }
];

export const SEATS = generateSeats();