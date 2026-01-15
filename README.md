# FCM Notification Service

Scalable notification service that consumes messages from RabbitMQ and delivers push notifications via Firebase Cloud Messaging (FCM).

## Features

- ✅ RabbitMQ message queue consumer
- ✅ Firebase Cloud Messaging (FCM) integration
- ✅ MySQL database for job tracking
- ✅ Message validation (identifier, type, deviceId, text)
- ✅ Structured logging with Pino
- ✅ Health check endpoints
- ✅ Docker Compose for easy deployment
- ✅ Graceful shutdown handling

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Firebase project with credentials
- FCM device tokens for testing

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd fcm-notification-service
```

### 2. Configure environment
```bash
cp .env.example .env
```

### 3. Add Firebase credentials
- Download service account JSON from Firebase Console
- Save as `firebase-conf.json` in project root
- Update `FIREBASE_CREDENTIALS_PATH` in `.env` if needed

### 4. Start services
```bash
docker-compose up --build -d
```

### 5. Verify health
```bash
curl http://localhost:3000/health
```

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────┐
│  RabbitMQ   │─────▶│  Queue Consumer  │─────▶│   FCM   │
│notification │      │   (Validator)    │      │   API   │
│    .fcm     │      └──────────────────┘      └─────────┘
└─────────────┘              │                      │
                             │                      │
                             ▼                      ▼
                      ┌─────────────┐        ┌──────────┐
                      │    MySQL    │        │  Mobile  │
                      │  fcm_job    │        │  Device  │
                      └─────────────┘        └──────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  RabbitMQ   │
                      │notification │
                      │   .done     │
                      └─────────────┘
```

### Workflow
1. Message arrives in `notification.fcm` queue
2. Validate 4 required fields: identifier, type, deviceId, text
3. **ACK immediately** after validation
4. Send notification via FCM
5. Save record to `fcm_job` table
6. Publish confirmation to `notification.done` topic

## Project Structure

```
notification-service/
├── src/
│   ├── config/
│   │   ├── database.js      # MySQL connection pool
│   │   ├── rabbitmq.js      # RabbitMQ client
│   │   └── firebase.js      # Firebase Admin SDK
│   ├── models/
│   │   └── FcmJob.js        # Database operations
│   ├── services/
│   │   ├── queueConsumer.js # Message processing
│   │   ├── fcmService.js    # FCM sending
│   │   └── notificationPublisher.js
│   ├── routes/
│   │   └── health.js        # Health endpoints
│   ├── validators/
│   │   └── messageValidator.js
│   ├── utils/
│   │   └── logger.js        # Pino logger
│   └── app.js               # Entry point
├── Dockerfile
├── docker-compose.yml
├── init.sql                  # DB initialization
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `RABBITMQ_URL` | RabbitMQ connection | `amqp://localhost:5672` |
| `QUEUE_NAME` | Input queue name | `notification.fcm` |
| `TOPIC_NAME` | Output topic name | `notification.done` |
| `RABBITMQ_PREFETCH_COUNT` | Concurrent messages | `10` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | `password` |
| `DB_NAME` | Database name | `notification_db` |
| `FIREBASE_PROJECT_ID` | Firebase project | - |
| `FIREBASE_CREDENTIALS_PATH` | Credentials JSON path | `./firebase-conf.json` |

## How to Run

### Local Development (without Docker)

1. Start MySQL and RabbitMQ separately
2. Configure `.env` with local connection details
3. Run:
```bash
npm install
npm run dev
```

### Local Development (with Docker)

1. Start all services with:
```bash
docker-compose up --build -d
```

2. Verify containers are running:
```bash
docker-compose ps
```

### View Logs
```bash
# Follow all logs
docker-compose logs -f

# App logs only
docker-compose logs -f app

# Show errors only
docker-compose logs app | grep ERROR
```

## Testing

### Using Test Client
For a better end-to-end experience including seeing the notification on your desktop:
1. Follow the setup in [test-client/README.md](test-client/README.md)
2. Open the UI, get a token, and send a message using that token.

### Send Test Message

Using RabbitMQ Management UI (http://localhost:15672):

1. Navigate to **Queues** → `notification.fcm`
2. Click **Publish message**
3. Set **Payload**:
```json
{
  "identifier": "test-msg-001",
  "type": "promotional",
  "deviceId": "your-actual-fcm-token-here",
  "text": "Hello from notification service!"
}
```

### Verify Delivery

**Check database:**
```bash
docker-compose exec mysql mysql -u root -ppassword -D notification_db \
  -e "SELECT * FROM fcm_job WHERE identifier='test-msg-001';"
```

**Check logs:**
```bash
docker-compose logs -f app
```

**Check topic:**
Navigate to RabbitMQ Management → Exchanges → `notification.done`

## API Endpoints

### Health Check
```bash
GET /health
```

Response (healthy):
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T09:12:35.000Z",
  "services": {
    "mysql": "connected",
    "rabbitmq": "connected",
    "fcm": "initialized"
  }
}
```