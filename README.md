# Iris Test Generation Tool - Microservices

This project sets up the Iris Test Generation Tool as a set of microservices orchestrated by Docker Compose.

## Project Structure

- **/ui**: Contains the React.js frontend application.
- **/backend**: Contains the Node.js/Express.js backend application with Prisma.
- **/agent**: Contains the Python/Langchain AI agent.
- **docker-compose.yml**: Defines the services, networks, and volumes for Docker Compose.
- **/database**: Data for the PostgreSQL database is persisted in a Docker volume defined in `docker-compose.yml`.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1.  **Clone the repository (if you haven't already):**
    ```bash
    # git clone <repository-url>
    # cd <repository-name>
    ```

2.  **Build and run the services using Docker Compose:**
    ```bash
    docker-compose up --build
    ```

    This command will:
    - Build the Docker images for the `ui`, `backend`, and `agent` services if they don't exist.
    - Pull the `postgres:latest` image for the `database` service.
    - Start all the defined services.

3.  **Accessing the services:**
    - **UI**: [http://localhost:3000](http://localhost:3000)
    - **Backend**: [http://localhost:8000](http://localhost:8000)
    - **Agent**: [http://localhost:8001](http://localhost:8001) (or as configured)
    - **Database**: Accessible on port `5432` (e.g., for a database client)

## API Documentation

The backend service provides API documentation using Swagger UI. Once the backend server is running, you can access the Swagger UI by navigating to:

- **Swagger API Docs**: [http://localhost:8000/api-docs](http://localhost:8000/api-docs)

This interface allows you to view and interact with the available API endpoints.

4.  **To stop the services:**
    ```bash
    docker-compose down
    ```

## Further Development

- Each service (`ui`, `backend`, `agent`) has its own Dockerfile and can be developed independently.
- Changes to the source code in the mounted volumes (`./ui:/app/ui`, etc.) will trigger auto-reloading if configured within the respective service's development server.
