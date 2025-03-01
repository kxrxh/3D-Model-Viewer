# 3D Assembly Viewer

Интерактивный просмотрщик 3D моделей с возможностью создания пошаговых инструкций по сборке, включая голосовое описание этапов.

## Функциональность

- Загрузка и отображение 3D моделей в форматах GLB, GLTF
- Создание пошаговых инструкций по сборке
- Добавление описаний к этапам сборки с помощью голосового ввода (Speech-to-Text)
- Различные режимы просмотра (последовательный, изолированный)
- Оптимизированный производительный рендеринг

## Установка и запуск

### Предварительные требования

1. Установите [Bun](https://bun.sh/) для запуска проекта:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Установите OpenAI Whisper для локального распознавания речи:
   ```bash
   # Установите через pip
   pip install -U openai-whisper

   # Или используя Conda
   conda install -c conda-forge openai-whisper
   ```

3. Установите необходимые зависимости:
   ```bash
   sudo apt-get install ffmpeg
   ```

### Запуск проекта

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/your-username/3d-assembly-viewer.git
   cd 3d-assembly-viewer
   ```

2. Установите зависимости:
   ```bash
   bun install
   ```

3. Запустите сервер разработки:
   ```bash
   bun run dev
   ```

4. Для запуска с локальным распознаванием речи:
   ```bash
   bun run start
   ```

## Использование голосового ввода

Приложение позволяет добавлять описания к этапам сборки с помощью голосового ввода:

1. Создайте новый этап сборки, нажав кнопку "Добавить сборку"
2. Выберите детали для данного этапа, нажав кнопку "Редактировать"
3. Для добавления описания, нажмите кнопку "Добавить описание"
4. В открывшемся окне нажмите на иконку микрофона для начала записи
5. Продиктуйте инструкции по сборке
6. Нажмите на иконку микрофона снова для остановки записи
7. Дождитесь окончания обработки записи
8. Нажмите "Готово" для сохранения описания

## Технические детали

### Локальное распознавание речи

В проекте используется локальное распознавание речи с помощью OpenAI Whisper:

- Запись звука осуществляется через браузерный API `MediaRecorder`
- Обработка аудио и распознавание текста происходит локально на сервере с использованием модели Whisper
- По умолчанию используется модель `small`, обеспечивающая хороший баланс между точностью и скоростью
- Поддерживается русский язык и другие языки, доступные в Whisper

### Настройка параметров распознавания

Вы можете изменить модель и параметры распознавания в файле `api/speech-to-text.js`:

```javascript
const args = [
  '-m', 'small',  // Доступные модели: tiny, base, small, medium, large
  '--language', language || 'ru', 
  '--task', 'transcribe',
  '--output_format', 'json',
  '--output_dir', TEMP_DIR,
  audioPath
];
```

## Технические требования

- Современный браузер с поддержкой WebGL
- Доступ к микрофону для голосового ввода
- Для наилучшего опыта рекомендуется использовать Chrome или Edge
- Python и FFmpeg для запуска Whisper

## Поддержка браузерами

Голосовой ввод реализован с использованием комбинации технологий для обеспечения максимальной совместимости:

- **Chrome/Edge**: Полная поддержка через Web Speech API
- **Firefox/Safari/Opera**: Базовая поддержка через MediaRecorder API с последующей обработкой аудио через Whisper

## Известные ограничения

- На некоторых мобильных устройствах может потребоваться ручной ввод текста
- Для работы голосового ввода требуется разрешение на доступ к микрофону
- Качество распознавания речи зависит от четкости произношения и уровня фонового шума
- Первое распознавание может занять больше времени из-за загрузки модели

# Speech-to-Text Viewer Application

A web application for speech-to-text conversion using whisper.cpp.

## Docker Setup

This application is containerized and deployed using Docker Compose with Traefik as a reverse proxy.

### Prerequisites

- Docker
- Docker Compose

### Getting Started

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd viewer-app
   ```

2. Configure environment variables (optional):
   - Edit the `.env` file to customize domain, email, and authentication

3. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Main application: http://viewer-app.localhost (or your configured domain)
   - Traefik dashboard: http://traefik.viewer-app.localhost (default login: admin/password)

## Production Deployment

For production deployment:

1. Update the `.env` file with your domain and valid email for Let's Encrypt certificates:
   ```
   DOMAIN=your-domain.com
   ACME_EMAIL=your-email@example.com
   ```

2. Generate a secure password for the Traefik dashboard:
   ```bash
   docker run --rm httpd:alpine htpasswd -nb admin your_secure_password
   ```
   Copy the output to the TRAEFIK_BASIC_AUTH variable in the `.env` file.

3. Launch the application:
   ```bash
   docker-compose up -d
   ```

4. Set up your DNS to point to your server.

## Architecture

- **App Container**: Bun.js application with Whisper.cpp for speech recognition
- **Traefik**: Reverse proxy handling SSL termination and routing

## Volumes

- **whisper_data**: Persistent storage for audio files
- **traefik_certificates**: Storage for Let's Encrypt certificates

## Security

- HTTPS is enabled by default (with automatic certificate generation)
- Traefik dashboard is protected with basic authentication

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DOMAIN | Domain name for the application | viewer-app.localhost |
| ACME_EMAIL | Email for Let's Encrypt | admin@example.com |
| TRAEFIK_BASIC_AUTH | Credentials for Traefik dashboard | admin:hashed_password |
