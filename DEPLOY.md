# Развертывание Zorssms на хостинге

## Вариант 1: Render.com (Рекомендуется - Бесплатно)

### Шаги:

1. **Скопируй файлы на GitHub:**
   - Создай новый репозиторий на github.com
   - Загрузи все файлы из папки `zorssms`

2. **На Render.com:**
   - Перейди на https://render.com
   - Нажми "New" → "Web Service"
   - Подключи свой GitHub репозиторий
   - Заполни поля:
     - **Name**: zorssms
     - **Region**: Frankfurt
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Нажми "Create Web Service"

3. **Готово!** Приложение будет на `https://zorssms-[random].onrender.com`

---

## Вариант 2: Railway.app (Просто)

1. Перейди на https://railway.app
2. Нажми "New Project"
3. Выбери "Deploy from GitHub"
4. Подключи репозиторий `zorssms`
5. Railway автоматически обнаружит `package.json` и запустит

---

## Вариант 3: DigitalOcean (VPS)

1. Создай App на https://www.digitalocean.com/products/app-platform
2. Подключи GitHub
3. Выбери `zorssms` репозиторий
4. Настрой:
   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000

---

## Вариант 4: Собственный VPS

```bash
# SSH на сервер
ssh root@your_server_ip

# Установи Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонируй репозиторий
git clone https://github.com/your_username/zorssms.git
cd zorssms

# Установи зависимости
npm install

# Запусти приложение
npm start

# Используй PM2 для фонового запуска
npm install -g pm2
pm2 start npm --name zorssms -- start
pm2 save
pm2 startup
```

---

## Важно!

- База данных сохраняется в файле `database.json`
- При перезагрузке все данные восстанавливаются
- Для продакшена рекомендуется использовать MongoDB
- PORT автоматически устанавливается из переменной окружения

---

## Переменные окружения

Создай файл `.env`:
```
PORT=3000
NODE_ENV=production
```

---

## Трубулшутинг

**Приложение не запускается?**
- Проверь `npm install` выполнен
- Убедись что Node.js версия >= 14

**Данные теряются?**
- Проверь что `database.json` создан и доступен

**WebSocket не работает?**
- Убедись что хост поддерживает WebSocket
- Render, Railway и DigitalOcean поддерживают
