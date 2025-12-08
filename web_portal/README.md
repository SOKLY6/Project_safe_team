# Web Portal - React приложение

React приложение для управления системой безопасности с использованием nginx.

## Установка и запуск

### Разработка

1. Установите зависимости:
```bash
npm install
```

2. Запустите dev сервер:
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

### Production сборка

1. Соберите приложение:
```bash
npm run build
```

2. Запустите через Docker:
```bash
docker build -t web-portal .
docker run -p 80:80 web-portal
```

## Структура проекта

- `src/` - исходный код React приложения
  - `pages/` - страницы приложения
  - `components/` - переиспользуемые компоненты
  - `contexts/` - React контексты (AuthContext)
  - `services/` - API сервисы
- `public/` - статические файлы
- `nginx.conf` - конфигурация nginx
- `Dockerfile` - Docker образ для production

## Маршруты

- `/login` - страница входа (начальная страница)
- `/dashboard` - главная панель
- `/scan-qr` - проверка QR-кодов
- `/visitors` - управление посетителями
- `/statistics` - статистика доступа
- `/staff` - управление охранниками (только для админов)
- `/api-panel` - панель управления API (только для админов)

## API

Все API запросы проксируются через nginx на бэкенд сервер (порт 8000).

