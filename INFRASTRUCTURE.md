# Architecture Overview

This document provides an overview of the architecture for the Iris Test Generation Tool.

The application follows a microservices-based architecture, with distinct services for the user interface, backend logic, and an AI agent. These services are containerized using Docker and orchestrated using Docker Compose. This approach allows for scalability, maintainability, and independent development of each component.

## Services

### UI Service

- **Technology:** React (using Create React App), Zustand, Axios, Tailwind UI, SCSS
- **Purpose:** Provides the frontend user interface for the Iris Test Generation Tool. Users interact with this service to input data, trigger test generation, and view results.
- **Port:** Runs on port `3000`.
- **Dockerfile:** `ui/Dockerfile`

### Backend Service

- **Technology:** Node.js with Express.js, Prisma
- **Purpose:** Handles the core business logic of the application. This includes processing user requests from the UI, interacting with the database, and potentially communicating with the `agent` service for AI-powered tasks.
- **Database:** Connects to a PostgreSQL database (defined as the `database` service) for data persistence.
- **Port:** Runs on port `8000`.
- **Dockerfile:** `backend/Dockerfile`

### Agent Service

- **Technology:** Node.js with Express.js, utilizing the Langchain.js library and a pre-trained LLM model.
- **Purpose:** Provides AI-powered capabilities, likely for test case generation or analysis. It is designed to interact with large language models (LLMs) via Langchain.js.
- **Port:** Runs on port `8001`.
- **Dockerfile:** `agent/Dockerfile`

### Database Service

- **Technology:** PostgreSQL (using the official `postgres:latest` Docker image).
- **Purpose:** Provides persistent storage for the application. The `backend` service connects to this database to store and retrieve data.
- **Port:** Runs on port `5432`.
- **Data Persistence:** Uses a Docker volume (`pgdata`) to ensure data is not lost when the container restarts.

## Running the Application

The entire application stack can be started using Docker Compose.

1.  **Prerequisites:**
    *   Docker installed and running.
    *   Docker Compose installed.

2.  **Steps:**
    *   Clone the repository.
    *   Navigate to the root directory of the project.
    *   Run the command: `docker-compose up`
    *   To run in detached mode (in the background), use: `docker-compose up -d`

Once started, the services will be accessible at their respective ports:
- UI: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Agent: `http://localhost:8001`
- Database: `localhost:5432` (typically accessed by the backend service)

To stop the application, run: `docker-compose down`

## Dependency Verification

Based on the project's wiki specification, the following dependencies were checked:

**UI Service (`ui/package.json`):**
- `react`: Present
- `react-dom`: Present
- `zustand`: **Present**
- `axios`: **Present**
- `tailwindcss`: **Present**
- `sass`: **Present**

**Backend Service (`backend/package.json`):**
- `express`: Present
- `prisma`: **Present**

**Note:** The AI agent's dependencies (`@langchain/core`, `@langchain/openai`) are present in `agent/package.json` as per the initial exploration, aligning with the use of Langchain.js. The "pre-trained LLM model" is an external component and would not be listed as a package dependency.
