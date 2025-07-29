# Docker Setup for Get It Done Frontend

This guide explains how to set up and run the Get It Done frontend application using Docker Compose with multi-stage builds for development and production environments.

## Prerequisites

- Docker 20.10.0 or later
- Docker Compose 2.0.0 or later
- Node.js 18.x (for local development without Docker)

## Quick Start

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file and fill in your environment variables.

2. **Start Development Environment**
   ```bash
   docker-compose up --build
   ```
   This will:
   - Build the development image
   - Mount your local code into the container
   - Start the Next.js development server with hot-reload

3. **Access the Application**
   Open your browser and go to: http://localhost:3000

## Build for Production

To create a production-ready image:

```bash
docker build -t get-it-done-fe:prod --target production .
```

## Available Commands

### Development

Start development server:
```bash
docker-compose up
```

Start in detached mode (background):
```bash
docker-compose up -d
```

Rebuild the containers:
```bash
docker-compose up --build
```

### Production

Build production image:
```bash
docker build -t get-it-done-fe:prod --target production .
```

Run production container:
```bash
docker run -p 3000:3000 --env-file .env get-it-done-fe:prod
```

### Common Operations

Stop the application:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f
```

Run a command in the container:
```bash
docker-compose exec app <command>
```

Example (run tests):
```bash
docker-compose exec app npm test
```

## Environment Variables

Create a `.env` file based on `.env.example` with your configuration. Required environment variables include:

- `NODE_ENV` - Set to 'development' or 'production'
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- Other Next.js and application-specific variables

## Security Considerations

The production build runs as a non-root user (`nextjs` with UID 1001) for enhanced security.

## Troubleshooting

### Port Conflicts
Edit the `docker-compose.yml` file to use a different port:
```yaml
ports:
  - "3001:3000"  # Change the first number to an available port
```

### Clean Up

Remove all containers, networks, and volumes:
```bash
docker-compose down -v
```

### Rebuild from Scratch
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### Development Notes
- The development container mounts your local directory, so changes will be reflected immediately
- Node modules are installed in a separate volume to prevent host/container conflicts
- The production build includes only necessary files for running the application
