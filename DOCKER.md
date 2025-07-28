# Docker Setup for Get It Done Frontend

This guide explains how to set up and run the Get It Done frontend application using Docker Compose.

## Prerequisites

- Docker Desktop installed on your machine
- Docker Compose (usually comes with Docker Desktop)

## Quick Start

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file and fill in your environment variables.

2. **Build and Start the Application**
   ```bash
   docker-compose up --build
   ```

3. **Access the Application**
   Open your browser and go to: http://localhost:3000

## Available Commands

### Start the application
```bash
docker-compose up
```

### Start in detached mode (background)
```bash
docker-compose up -d
```

### Rebuild the containers
```bash
docker-compose up --build
```

### Stop the application
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Run a command in the container
```bash
docker-compose exec app <command>
```
Example:
```bash
docker-compose exec app npm run lint
```

## Environment Variables

Create a `.env` file based on `.env.example` with your configuration. The following environment variables are required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `JWT_SECRET`

## Troubleshooting

### If you get port conflicts
Edit the `docker-compose.yml` file to use a different port:
```yaml
ports:
  - "3001:3000"  # Change the first number to an available port
```

### To completely remove containers and volumes
```bash
docker-compose down -v
```

### To rebuild from scratch
```bash
docker-compose down -v
docker-compose up --build
```
