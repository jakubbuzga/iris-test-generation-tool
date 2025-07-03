A Technical Blueprint for an AI-Powered API Test Generation Platform
Introduction: A Blueprint for AI-Driven Test Automation
1.1. Executive Summary

This document provides a complete architectural and implementation blueprint for an AI-powered API test generation platform. The core value proposition of this system is to significantly accelerate the software testing lifecycle by automatically generating comprehensive, ready-to-use Postman test collections directly from OpenAPI specifications. By leveraging a sophisticated microservices architecture, state-of-the-art AI orchestration, and industry-standard deployment practices, this blueprint outlines a path to building a scalable, secure, and maintainable application. The intended audience for this document is the engineering team responsible for the implementation, providing a prescriptive and actionable guide from high-level architecture down to granular code-level details.

1.2. Core Technological Pillars

The selection of technologies for this platform is deliberate, aiming to create a robust and modern system primarily within the JavaScript/TypeScript ecosystem. Each pillar is chosen for its specific strengths in the context of a distributed, AI-driven application.

Microservices with NestJS: The application is decomposed into a set of independent services, each responsible for a distinct business capability. NestJS is selected as the primary backend framework due to its opinionated structure, which promotes clean, maintainable, and testable code. Its native support for TypeScript and its modular architecture make it an ideal choice for building scalable microservices. This approach facilitates parallel development, fault isolation, and independent scaling of components.

Docker's Model Context Protocol (MCP) for AI Tooling: The core AI logic relies on a Large Language Model (LLM) understanding the structure of a given OpenAPI specification. Instead of building a custom preprocessor, this architecture leverages Docker's Model Context Protocol (MCP), an open standard for letting LLMs interact with external tools and data sources. Specifically, we will use the official mcp/openapi-schema server. This pre-built MCP server runs in a Docker container and exposes a given OpenAPI specification as a set of standardized tools that an LLM can query to understand API endpoints, schemas, and parameters. This approach decouples the tool provider from the AI orchestration logic, promoting a standardized and secure interaction model.

Docker Compose for Deployment: To ensure a consistent and reproducible environment across development, testing, and production, the entire application stack will be containerized and managed with Docker Compose. This approach simplifies deployment to a single command while enabling the implementation of rigorous security and operational best practices, such as network segmentation and secrets management.

1.3. Document Structure

This report is structured to guide the reader from the highest level of architectural abstraction down to the specific implementation details required to build the system. It begins with the foundational principles and system-wide design patterns, then drills down into the design of each individual microservice, details the complex AI workflow, and concludes with a comprehensive plan for secure deployment and ongoing maintenance.

Section 1: System Architecture and Core Principles
This section establishes the foundational architectural tenets that govern the design of the entire system. These principles are not merely suggestions but core requirements intended to ensure the final product is scalable, resilient, and secure.

1.1. Architectural Tenets

Single Responsibility Principle (SRP): Each microservice is designed to own a single, well-defined business capability. For example, the auth-service is exclusively responsible for user identity and authentication, while the project-service manages the lifecycle of projects and their associated test collections. This strict separation of concerns prevents the emergence of a "distributed monolith," where services are technically separate but functionally entangled. By adhering to SRP, development teams can work on different services independently, accelerating development and reducing the risk of unintended side effects in unrelated parts of the system.

Database-per-Service: To ensure true independence and loose coupling, each microservice that requires persistence will manage its own dedicated database. This pattern is a cornerstone of microservice architecture, as it prevents services from becoming coupled at the data layer. This allows each service to choose the database technology best suited for its needs—for instance, a relational database like PostgreSQL for the structured data of the auth-service, and potentially a NoSQL document database for the flexible, JSON-heavy test collections. A critical consequence of this design is that services cannot directly query each other's databases. To handle scenarios where one service needs data owned by another (e.g., the project-service needing user details), the system will rely on asynchronous, event-driven communication to synchronize a minimal, denormalized copy of the required data, thus preserving service autonomy.

Asynchronous-First Communication: While immediate, user-facing interactions will necessarily be synchronous, the default communication pattern between internal services will be asynchronous and event-driven. For long-running, computationally intensive tasks such as invoking an LLM to generate a test suite, a synchronous request-response model is brittle and inefficient. Instead, the system will use a message broker (RabbitMQ) to decouple the service initiating the task from the service performing it. This approach improves fault tolerance, as a task can be queued even if the consuming service is temporarily unavailable, and enhances overall system scalability by allowing services to process tasks at their own pace.

Security by Design: Security is not an add-on but an integral part of the architecture at every layer. This principle manifests in several key design choices: a hardened API gateway as the sole entry point, strict network segmentation between services, the execution of all containers as non-root users, and the principle of least privilege applied to all components. By embedding security into the foundational design, the system is made resilient against common threats from the outset.

1.2. Service Decomposition and Bounded Contexts

The application is decomposed into the following microservices, each aligned with a specific bounded context. This structure provides a clear map of the system's responsibilities.

Table 1: Microservice Responsibility Matrix

Service Name

Bounded Context (Business Responsibility)

Core Technology

Communication Protocols (Consumes/Produces)

api-gateway

External Traffic Management & Security

NGINX

Consumes: Public HTTP/S. Produces: HTTP to internal services.

auth-service

User Identity & Access Management

NestJS, PostgreSQL

Consumes: HTTP from Gateway. Produces: JWTs, UserCreated events to Message Broker.

project-service

Project & Test Collection Lifecycle Management

NestJS, PostgreSQL

Consumes: HTTP from Gateway, UserCreated & GenerationTaskCompleted events. Produces: GenerationTaskCreated & ReworkTaskCreated events.

llm-orchestrator-service

AI Orchestration & LLM Interaction

NestJS, LangGraph.js

Consumes: GenerationTaskCreated & ReworkTaskCreated events. Produces: GenerationTaskCompleted events. Manages and communicates with mcp-openapi-server via MCP/JSON-RPC.

mcp-openapi-server

Exposing OpenAPI Schema as MCP Tools

Docker Image (mcp/openapi-schema)

Consumes: MCP requests from llm-orchestrator-service. (Launched on-demand, not part of the main stack).

test-runner-service

On-Demand Postman Test Execution

Node.js/TypeScript, Newman

Consumes: HTTP from Gateway. Produces: Streamed test results.

ui-service

User Interface & Experience

React/Next.js

Consumes: HTTP/S from Gateway, WebSocket/SSE for real-time updates.

db-auth

User Data Persistence

PostgreSQL

Internal to auth-service.

db-project

Project Data Persistence

PostgreSQL

Internal to project-service.

message-broker

Asynchronous Communication Hub

RabbitMQ

Consumes/Produces: AMQP messages from/to various services.

1.3. System Interaction Flows

The following diagrams, represented in Mermaid syntax, visualize the primary user journeys through the system. These can be rendered in any Markdown-aware viewer, such as a GitHub README.

Initial Test Generation Flow

This flow describes the process from a user uploading an OpenAPI specification to receiving the generated test collection.

sequenceDiagram
    participant User
    participant UI as ui-service
    participant GW as api-gateway
    participant PS as project-service
    participant MB as message-broker
    participant Orchestrator as llm-orchestrator-service
    participant Docker as Docker Daemon
    participant MCPServer as mcp-openapi-server
    participant LLM

    User->>+UI: Uploads OpenAPI spec & comment
    UI->>+GW: POST /api/projects/{id}/spec
    GW->>+PS: Forward request
    PS->>PS: Save spec to shared volume, create DB record (status: PENDING)
    PS->>+MB: Publish event (GenerationTaskCreated)
    PS-->>-GW: 202 Accepted (Generation in progress)
    GW-->>-UI: 202 Accepted
    UI-->>-User: Show "Generation in progress..."
    MB->>+Orchestrator: Deliver message
    Orchestrator->>+Docker: Start mcp-openapi-server container with spec file
    Docker-->>-Orchestrator: Container started
    Orchestrator->>+LLM: Instruct LLM to use tools from MCPServer
    LLM->>+MCPServer: Use tools (e.g., list-endpoints) to analyze spec
    MCPServer-->>-LLM: Return schema info
    LLM-->>-Orchestrator: Return Postman collection JSON
    Orchestrator->>+Docker: Stop and remove mcp-openapi-server container
    Orchestrator->>+MB: Publish event (GenerationTaskCompleted)
    Orchestrator-->>-MB: Acknowledge message
    MB->>+PS: Deliver message
    PS->>PS: Update DB with collection & status (status: GENERATED)
    PS-->>-MB: Acknowledge message
    PS->>UI: Notify via WebSocket/SSE
    UI->>User: Display generated tests

Test Rework/Refinement Cycle

This flow is triggered when a user finds the generated tests unsatisfactory and requests a revision.

sequenceDiagram
    participant User
    participant UI as ui-service
    participant GW as api-gateway
    participant PS as project-service
    participant MB as message-broker
    participant Orchestrator as llm-orchestrator-service

    User->>+UI: Submits feedback and clicks "Rework"
    UI->>+GW: POST /api/projects/{id}/rework
    GW->>+PS: Forward request with feedback
    PS->>PS: Update DB record (status: REWORK_REQUESTED)
    PS->>+MB: Publish event (ReworkTaskCreated with feedback)
    PS-->>-GW: 202 Accepted
    GW-->>-UI: 202 Accepted
    UI-->>-User: Show "Rework in progress..."
    MB->>+Orchestrator: Deliver rework message
    Note over Orchestrator: Orchestrator starts MCPServer, then invokes LLM with original spec, previous attempt, and user feedback.
    Orchestrator-->>MB: (Flow continues as in initial generation...)

Test Execution Flow

This flow describes how a user can run the generated tests directly from the application.

sequenceDiagram
    participant User
    participant UI as ui-service
    participant GW as api-gateway
    participant TR as test-runner-service

    User->>+UI: Clicks "Run Tests"
    UI->>+GW: POST /api/tests/run (with collection JSON)
    GW->>+TR: Forward request
    TR->>TR: Invoke Newman programmatically
    Note over TR: Newman executes API requests against target endpoints.
    TR-->>UI: Stream test results (pass/fail) via WebSocket/SSE
    UI->>User: Display real-time test execution results

Section 2: Inter-Service Communication and API Gateway
The communication strategy is the nervous system of the microservices architecture. A well-designed strategy ensures that services can interact reliably, securely, and efficiently, while maintaining the loose coupling that is essential for scalability and resilience.

2.1. Communication Strategy: Synchronous vs. Asynchronous

The system employs a pragmatic hybrid communication model, choosing the right pattern for the right job rather than dogmatically adhering to a single approach.

Synchronous (Request/Response): This pattern is used for interactions where the client (typically the user's browser) requires an immediate response. For example, when a user logs in or fetches their list of projects, the interaction is synchronous. These requests are handled via RESTful APIs over HTTP. The API Gateway receives the request and routes it to the appropriate service, which processes it and returns a response in real-time. This pattern is simple to implement and debug, as errors are immediately apparent.

Asynchronous (Event-Driven): This is the preferred pattern for internal service-to-service communication, especially for operations that are not time-sensitive or are computationally intensive. The core test generation process is a prime example. When the project-service receives a request to generate tests, it does not block and wait for the llm-orchestrator-service to finish. Instead, it publishes an event to a message queue and immediately returns a 202 Accepted response to the user. This decouples the services, allowing the llm-orchestrator-service to process the request when it has capacity. This pattern significantly improves system scalability and resilience; if the agent service is down, the request remains safely in the queue until the service recovers.

2.2. The API Gateway (NGINX): The System's Front Door

The API Gateway is a critical component that serves as the single entry point for all external traffic. No other service is directly exposed to the public internet. This centralizes cross-cutting concerns and provides a robust first line of defense. NGINX is selected for this role due to its high performance, stability, and extensive feature set.

The gateway's primary responsibilities include:

Request Routing: It inspects the incoming request URL and intelligently routes it to the correct downstream microservice. For example, a request to /api/auth/login is routed to the auth-service, while /api/projects is routed to the project-service. This routing logic is transparent to the end-user.

SSL/TLS Termination: The gateway handles all aspects of HTTPS, decrypting incoming requests and encrypting outgoing responses. This centralizes the management of SSL certificates (e.g., using Certbot for Let's Encrypt) and offloads the computational overhead of encryption from the application services.

Authentication & Authorization Offloading: The gateway can be configured to inspect the Authorization header of incoming requests. It validates the JSON Web Token (JWT) issued by the auth-service. If the token is valid, the gateway can pass user information (like userId) to the downstream service in a trusted header. If the token is invalid or missing, the request is rejected at the edge, before it can consume resources from internal services. This simplifies the logic within each microservice, as they can trust that any request they receive has already been authenticated.

Rate Limiting and Security Policies: To protect against brute-force attacks and Denial of Service (DoS), the gateway will implement rate limiting on sensitive endpoints like login and registration. It can also be configured with basic Web Application Firewall (WAF) rules to block common malicious patterns, such as path traversal attacks.

2.3. Asynchronous Messaging with RabbitMQ

RabbitMQ is chosen as the message broker to facilitate asynchronous communication. It is lightweight, protocol-agnostic, and has excellent support within the NestJS ecosystem via the @nestjs/microservices package.

Why RabbitMQ? It enables the decoupling of services, allowing them to evolve and scale independently. For example, the project-service does not need to know the network location or number of instances of the llm-orchestrator-service; it simply publishes a message to a named queue.

Key Patterns Implemented:

Task Queues (Direct-to-Queue): This pattern is used for the primary test generation and rework flows. The project-service acts as the producer, sending a message containing the task details directly to a specific queue (e.g., generation_tasks). The llm-orchestrator-service is the consumer, listening exclusively on this queue. This ensures that each task is processed by exactly one worker.

Publish/Subscribe (Fanout Exchange): This pattern is used for broadcasting state changes that may be of interest to multiple services. For example, when a new user registers, the auth-service publishes a UserCreated event to a fanout exchange. Any service that needs to know about new users (like the project-service) can bind its own queue to this exchange and receive a copy of the message. This allows services to react to system-wide events without being directly coupled to the event source.

Message Acknowledgements and Idempotency: To ensure reliability, the system will use manual message acknowledgements. The noAck: false option will be set for all consumers. This means RabbitMQ will not remove a message from the queue until the consumer explicitly signals that it has successfully processed it. If the consumer crashes mid-process, the message is re-queued for another worker to attempt. This guarantee of "at-least-once" delivery introduces the need for idempotent consumers. An idempotent operation is one that can be performed multiple times with the same input yet produce the same result without adverse side effects. For example, the llm-orchestrator-service must be designed to handle receiving the same generation task twice, perhaps by checking the status of the target entity in the database before starting work.

2.4. Data Contracts: The Role of DTOs

To ensure clear, consistent, and validated communication between services, all data exchanged via APIs or messages will be structured using Data Transfer Objects (DTOs).

Defining DTOs: A DTO is a simple object whose purpose is to carry data between processes. By defining explicit DTOs, we create a formal contract for what a service expects as input and what it produces as output. This decouples the internal domain models of a service from its public-facing interface, allowing internal refactoring without breaking external consumers.

Implementation in NestJS: In the NestJS services, DTOs will be implemented as TypeScript classes. The class-validator and class-transformer libraries will be used extensively. class-validator provides decorators (e.g., @IsString(), @IsEmail(), @IsNotEmpty()) that allow NestJS to automatically validate incoming request bodies against the DTO definition. If validation fails, NestJS will automatically return a 400 Bad Request response with detailed error messages, preventing invalid data from ever reaching the service's business logic.

Shared Library: To avoid code duplication and ensure consistency, DTOs that are used by multiple services (e.g., the payload for a GenerationTaskCreated event) will be defined in a private, versioned NPM package. This shared library can then be included as a dependency in each relevant microservice, providing a single source of truth for the data contracts.

Section 3: Detailed Microservice Design
This section provides a detailed blueprint for each of the core application microservices. Each subsection serves as a self-contained specification for the development team, outlining responsibilities, data models, and API contracts.

3.1. auth-service (NestJS, PostgreSQL)

This service is the definitive authority on user identity and access control for the entire platform.

Responsibilities:

Handling new user registration, including secure password hashing.

Authenticating existing users and issuing signed JSON Web Tokens (JWTs).

Providing endpoints for managing user profiles.

Publishing a UserCreated event to the message broker upon successful registration to inform other services.

Database Schema (db-auth):
A single users table is sufficient for its needs.

users

id (UUID, Primary Key)

email (VARCHAR, UNIQUE, NOT NULL)

password_hash (VARCHAR, NOT NULL)

name (VARCHAR)

created_at (TIMESTAMP WITH TIME ZONE)

updated_at (TIMESTAMP WITH TIME ZONE)

API Endpoints Table:

Method

Path

Description

DTO (Request Body)

DTO (Response)

POST

/api/auth/register

Creates a new user account.

CreateUserDto

UserDto

POST

/api/auth/login

Authenticates a user and issues a JWT.

LoginUserDto

{ accessToken: string }

GET

/api/auth/me

Retrieves the profile of the authenticated user. (Requires JWT)

N/A

UserDto

Implementation Notes:

Password Hashing: The bcrypt library must be used to hash and salt user passwords before storing them in the database. A cost factor of at least 12 is recommended.

JWT Strategy: JWTs will be signed using a strong, secret key managed via environment variables. The payload will contain the userId, email, and any assigned roles (e.g., admin). These tokens will have a reasonably short expiration time (e.g., 1-24 hours) to limit the window of exposure if a token is compromised.

Route Protection: NestJS Guards will be implemented to protect routes. An AuthGuard will be used to ensure that a valid JWT is present for protected endpoints like /api/auth/me.

3.2. project-service (NestJS, PostgreSQL)

This service is the central hub for managing the core business logic of the application. It acts as the primary interface for users interacting with their projects and orchestrates the complex, asynchronous test generation workflows.

Responsibilities:

Full CRUD (Create, Read, Update, Delete) operations for projects.

Handling the upload and storage of OpenAPI specifications.

Storing the generated Postman collections and their associated metadata (e.g., status, version).

Managing the user feedback loop by processing approval and rework requests.

Initiating generation and rework tasks by publishing events to RabbitMQ.

Consuming events from the message broker to update the status of test collections upon completion.

Database Schema (db-project):

projects

id (UUID, Primary Key)

name (VARCHAR, NOT NULL)

owner_id (UUID, Foreign Key referencing a denormalized user ID)

created_at, updated_at

openapi_specs

id (UUID, Primary Key)

project_id (UUID, Foreign Key to projects)

spec_json (JSONB, NOT NULL)

user_comment (TEXT)

version (INTEGER)

created_at

test_collections

id (UUID, Primary Key)

spec_id (UUID, Foreign Key to openapi_specs)

collection_json (JSONB)

status (ENUM: PENDING, GENERATING, GENERATED, REWORK_REQUESTED, APPROVED, FAILED)

feedback (TEXT)

version (INTEGER)

created_at, updated_at

API Endpoints Table:

Method

Path

Description

POST

/api/projects

Creates a new project for the authenticated user.

GET

/api/projects

Lists all projects for the authenticated user.

POST

/api/projects/{id}/spec

Uploads a new OpenAPI spec, which triggers the initial test generation workflow.

GET

/api/projects/{id}/collection

Retrieves the latest generated Postman collection for a project.

POST

/api/projects/{id}/rework

Submits user feedback and triggers the test rework workflow.

POST

/api/projects/{id}/approve

Marks the latest test collection as approved.

Asynchronous Integration:

This service is both a producer and a consumer of messages. It will use the @nestjs/microservices package with the RabbitMQ transporter.

Producer: When a spec is uploaded, it publishes a GenerationTaskCreated event. When a rework is requested, it publishes a ReworkTaskCreated event.

Consumer: It subscribes to a GenerationTaskCompleted queue. The handler for this message, decorated with @EventPattern(), will update the corresponding test_collections record in the database with the generated JSON and set the status to GENERATED. It will also subscribe to the UserCreated fanout exchange to maintain a local, denormalized cache of user IDs and names for display purposes, avoiding synchronous calls to the auth-service.

3.3. ui-service (React/Next.js)

This service is the face of the application, responsible for rendering the user interface and managing all client-side interactions.

Responsibilities:

Provide a clean, responsive interface for all application features.

Manage client-side state, including user authentication status and data fetched from the backend.

Handle user input through forms for registration, login, and project creation.

Implement a robust file upload component for OpenAPI specifications.

Display real-time updates on the status of test generation.

Key Components:

Authentication: Login and registration forms that interact with the auth-service. Logic to store the JWT securely (e.g., in an HttpOnly cookie) and attach it to subsequent API requests.

Dashboard: A central view listing all of the user's projects, their status, and links to view details.

Test Case Viewer: A component that can parse and display the generated Postman collection in a human-readable format. It will feature prominent "Approve" and "Rework" buttons, along with a text area for providing feedback.

Test Runner Interface: A view that triggers the test-runner-service and displays the streamed results of the test execution in real-time, showing which tests passed or failed.

State Management: A modern state management library such as Redux Toolkit or Zustand is recommended. This will provide a centralized store for application state, simplifying data flow and making it easier to manage complex UI states, such as the real-time status updates for test generation.

Real-time Updates: To provide a dynamic and responsive user experience, the UI should not rely solely on polling. It will establish a WebSocket or Server-Sent Events (SSE) connection to the backend. The project-service, upon receiving a GenerationTaskCompleted event, will push a notification over this connection, allowing the UI to instantly update and inform the user that their tests are ready without requiring a page refresh.

Section 4: AI Orchestration with Docker MCP and LangGraph
This section details the intelligent core of the application, which has been redesigned to use the official Docker Model Context Protocol (MCP). This approach separates the AI "tool provider" from the "tool consumer," resulting in a more modular and standardized architecture.

4.1. The MCP-Centric Approach

Instead of a monolithic AI agent, the system now uses a standardized protocol to allow a Large Language Model (LLM) to interact with an external tool. This aligns with modern AI engineering practices, where specialized tools are exposed to general-purpose models.

Why Docker MCP? By adopting the MCP standard, we leverage a community-vetted protocol for AI-tool interaction. This avoids building a bespoke solution and ensures future compatibility with a growing ecosystem of MCP-compliant clients and servers.

The mcp/openapi-schema Server: We will use the mcp/openapi-schema Docker image directly. This server's specific purpose is to load an OpenAPI specification file and expose its contents (endpoints, schemas, parameters) as a set of callable tools through the MCP protocol. The LLM can then query these tools to understand the API's structure before generating tests.

4.2. A Two-Part AI Core: The Orchestrator and the Tool Server

The original mcp-agent-service is now split into two distinct components with clear responsibilities:

mcp-openapi-server (The Tool Provider):

Role: This is an ephemeral, on-demand container running the mcp/openapi-schema image. Its sole responsibility is to make a single OpenAPI specification file available to an LLM via the MCP protocol.

Lifecycle: It is not a continuously running service. For each test generation task, the llm-orchestrator-service will dynamically start a new mcp-openapi-server container, pointing it to the specific OpenAPI file for that task. Once the task is complete, the container is terminated. This ensures that each LLM interaction is scoped to the correct API specification.

llm-orchestrator-service (The Brains):

Role: This new NestJS microservice is the central coordinator of the AI workflow. It acts as the MCP client, connecting to the ephemeral mcp-openapi-server.

Responsibilities:

Consumes GenerationTaskCreated and ReworkTaskCreated events from the message broker.

Manages the lifecycle of mcp-openapi-server containers using the Docker API.

Constructs the high-level prompts for the LLM, instructing it to use the tools provided by the MCP server to analyze the API and generate a Postman collection.

Handles the "rework" cycle by incorporating user feedback into a new prompt for the LLM.

Parses the final JSON output from the LLM.

Publishes GenerationTaskCompleted events back to the message broker.

4.3. Orchestrating the LLM with LangGraph.js

While the MCP server provides the tools, LangGraph.js is still the ideal choice for managing the stateful, cyclical conversation with the LLM within the llm-orchestrator-service. The "generate -> get feedback -> regenerate" flow is a natural fit for a LangGraph graph.

Stateful Rework Cycles: LangGraph allows us to model the workflow as a graph with a persistent state object. This state can hold the OpenAPI spec, user comments, the previously generated collection, and user feedback.

Conditional Logic: A conditional edge in the graph can check if user feedback is present. If so, it routes the flow to a node that constructs a "rework" prompt; otherwise, it uses the initial generation prompt. This creates the required cyclical behavior without complex custom logic. The LangGraph implementation will be internal to the llm-orchestrator-service, providing the logic to intelligently call the LLM, which in turn uses the external mcp-openapi-server tools.

4.4. The mcp/openapi-schema Toolkit

The llm-orchestrator-service will prompt the LLM to use the tools exposed by the mcp-openapi-server. Based on the server's documentation, these tools include:

list-endpoints: Lists all available API paths and their HTTP methods.

get-endpoint: Retrieves detailed information for a specific endpoint, including parameters and responses.

get-request-body: Gets the schema for a request body.

get-response-schema: Gets the schema for a specific response status code.

list-components: Lists all reusable schema components.

get-component: Retrieves the definition of a specific component.

search-schema: Performs a text-based search across the entire specification.

The LLM will be instructed to use these tools to build a complete understanding of the API before attempting to write the Postman test collection, leading to more accurate and comprehensive results.

Section 5: The Test Runner Service: On-Demand Execution
This service provides immediate, tangible value to the user by allowing them to execute the newly generated API tests directly from the application's UI. It acts as a sandboxed execution environment, programmatically running Postman collections using the Newman library.

5.1. Programmatic Newman Integration

The service will be a lightweight Node.js application, likely built with Express or a similar framework, and written in TypeScript for consistency. Its core functionality revolves around the programmatic use of the newman NPM package.

Technology Stack: A simple Node.js/TypeScript service. It does not require a database, as its operations are stateless.

Core Logic: The service will expose a single, secure API endpoint, for example, POST /api/run. This endpoint will accept a JSON payload containing the Postman collection to be executed and, optionally, an environment JSON for variable substitution.

Using the Newman Library: The newman package provides a run function that can be imported and used directly within a Node.js script. This allows for full control over the execution process, including the configuration of reporters, timeouts, and other options.

A basic implementation would look like this:

import newman from 'newman';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/run', (req, res) => {
    const { collection, environment } = req.body;

    if (!collection) {
        return res.status(400).send({ error: 'Collection JSON is required.' });
    }

    // The newman.run method is asynchronous and takes a callback
    newman.run({
        collection: collection, // The collection JSON object
        environment: environment, // Optional environment JSON object
        reporters: 'cli' // For logging to the console. A custom reporter is needed for streaming.
    }, (err, summary) => {
        if (err) {
            console.error(err);
            // Don't send a response here if streaming results
            return;
        }
        console.log('Collection run complete!');
        // The final summary can be sent at the end if not streaming
    });

    // Immediately respond to the client if using streaming
    res.status(202).send({ message: 'Test run initiated.' });
});

//... server listen logic...

5.2. Managing Execution and Streaming Results

A key feature for a positive user experience is providing real-time feedback during the test run. Simply waiting for the entire collection to finish and then returning a summary report would feel slow and unresponsive, especially for large test suites.

Asynchronous Execution: The API call to initiate a test run is asynchronous. The service will immediately acknowledge the request and then begin the Newman execution in the background. Results will be pushed to the client as they happen.

Leveraging Newman's Event Emitters: The newman.run function returns an event emitter. By attaching listeners to various events, the service can capture detailed information at each stage of the run. This is the mechanism for enabling real-time result streaming.

The most useful events include:

start: Fired when the collection run begins.

beforeRequest: Fired before each request is sent.

request: Fired after a response is received for a request. The args object contains the full request, response, and any errors.

assertion: Fired for each test assertion, providing its name and whether it passed or failed.

done: Fired when the entire collection run is complete, providing the final summary.

This event-driven approach allows the test-runner-service to push granular updates (e.g., "Running test 'Check status code'... PASSED") to the ui-service via a WebSocket or SSE connection.

Security Considerations: This service is inherently powerful, as it executes arbitrary API requests defined in the LLM-generated collection. Therefore, it must be treated as a high-risk component and be heavily sandboxed. Its container will have tightly restricted network egress rules, allowing it to communicate only with the intended test environments and preventing it from accessing internal services or the host network. This isolation is a critical security control.

Section 6: Secure Deployment with Docker Compose
This section provides the complete, actionable plan for containerizing and deploying the entire application stack using Docker Compose. The focus is on creating a secure, reproducible, and production-ready environment.

6.1. The docker-compose.yml Blueprint

The docker-compose.yml file is the single source of truth for defining the application's services, networks, and volumes. Below is an annotated structure of the file.

Note: The mcp-openapi-server is not defined in this file. It is designed to be an ephemeral container launched on-demand by the llm-orchestrator-service for each specific test generation task.

# docker-compose.yml
version: '3.8'

services:
  # --- API Gateway: The only publicly exposed service ---
  api-gateway:
    image: nginx:1.25-alpine
    container_name: api-gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      -./nginx/nginx.conf:/etc/nginx/nginx.conf:ro # Mount config read-only
      -./nginx/certs:/etc/nginx/certs:ro
    networks:
      - frontend_net
    depends_on:
      - auth-service
      - project-service
    restart: unless-stopped

  # --- UI Service ---
  ui-service:
    build:./ui-service
    container_name: ui-service
    networks:
      - frontend_net
    restart: unless-stopped
    # No ports exposed; traffic goes through the gateway

  # --- Authentication Service ---
  auth-service:
    build:./auth-service
    container_name: auth-service
    environment:
      - DATABASE_URL=${AUTH_DB_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - backend_net
    depends_on:
      db-auth:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}", "-d", "${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # --- Project Service ---
  project-service:
    build:./project-service
    container_name: project-service
    environment:
      - DATABASE_URL=${PROJECT_DB_URL}
      - RABBITMQ_URI=${RABBITMQ_URI}
    networks:
      - backend_net
    volumes:
      - openapi_specs:/specs # Shared volume for storing OpenAPI files
    depends_on:
      db-project:
        condition: service_healthy
      message-broker:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # --- LLM Orchestrator Service ---
  llm-orchestrator-service:
    build:./llm-orchestrator-service
    container_name: llm-orchestrator-service
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RABBITMQ_URI=${RABBITMQ_URI}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Mount Docker socket
      - openapi_specs:/specs # Mount shared volume
    networks:
      - backend_net
    depends_on:
      - message-broker
    restart: unless-stopped

  # --- Test Runner Service ---
  test-runner-service:
    build:./test-runner-service
    container_name: test-runner-service
    networks:
      - backend_net # Isolated network
    cap_drop:
      - ALL # Drop all Linux capabilities
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

  # --- Databases and Message Broker ---
  db-auth:
    image: postgres:15-alpine
    container_name: db-auth
    environment:
      - POSTGRES_USER=${AUTH_DB_USER}
      - POSTGRES_PASSWORD=${AUTH_DB_PASSWORD}
      - POSTGRES_DB=${AUTH_DB_NAME}
    volumes:
      - auth_db_data:/var/lib/postgresql/data
    networks:
      - backend_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  db-project:
    image: postgres:15-alpine
    container_name: db-project
    environment:
      - POSTGRES_USER=${PROJECT_DB_USER}
      - POSTGRES_PASSWORD=${PROJECT_DB_PASSWORD}
      - POSTGRES_DB=${PROJECT_DB_NAME}
    volumes:
      - project_db_data:/var/lib/postgresql/data
    networks:
      - backend_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PROJECT_DB_USER} -d ${PROJECT_DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  message-broker:
    image: rabbitmq:3.12-management-alpine
    container_name: message-broker
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}
    networks:
      - backend_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

# --- Networks and Volumes ---
networks:
  frontend_net:
    driver: bridge
  backend_net:
    driver: bridge
    internal: true # Crucial for security: prevents direct external access

volumes:
  auth_db_data:
  project_db_data:
  openapi_specs:

6.2. Security Hardening in Practice

The following practices are not optional; they are essential for securing the containerized application.

Network Segmentation: The docker-compose.yml defines two distinct networks: frontend_net and backend_net. The api-gateway is the only service connected to both, acting as a controlled bridge. The backend_net is configured with internal: true, which is a critical Docker feature that prevents any container on that network from being accidentally exposed to the outside world, even if a port is mistakenly declared. This creates a secure internal zone for databases and backend services.

Non-Root Containers: Running containers as the root user is a major security risk, as a compromise of the container could lead to privilege escalation on the host. Every service's Dockerfile must create and switch to a dedicated, unprivileged user.

Example Dockerfile for a NestJS service:

FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app
# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Change ownership of application files
RUN chown -R appuser:appgroup .
# Switch to the non-root user
USER appuser
CMD ["node", "dist/main.js"]

Secrets Management: Hardcoding secrets into images or docker-compose.yml files is a severe security vulnerability.

Development: Use a .env file to store secrets locally. This file must be added to .gitignore to prevent it from ever being committed to version control. The docker-compose.yml file will automatically load variables from this file.

Production: For production deployments, secrets should be injected into the environment by a secure CI/CD system or managed using Docker Secrets. The environment keys in docker-compose.yml can be populated from the host machine's environment variables, which are set by the deployment pipeline.

Securing the Docker Socket: The llm-orchestrator-service requires access to the Docker daemon to manage the lifecycle of mcp-openapi-server containers. Mounting /var/run/docker.sock directly into a container is powerful but carries significant security risks, as a compromise of that container could grant root-level control over the host. For production, it is strongly recommended to use a secure proxy for the Docker socket, such as docker-socket-proxy. This proxy can be configured to allow only the specific Docker API commands needed by the service (e.g., container_create, container_start, container_stop) and deny all others, adhering to the principle of least privilege.

Principle of Least Privilege: Containers should only have the permissions they absolutely need to function.

Drop Capabilities: The test-runner-service, being a higher-risk component, is configured with cap_drop: - ALL to remove all Linux kernel capabilities, drastically reducing its potential attack surface. The security_opt: [no-new-privileges=true] flag further prevents the container process from gaining any new privileges.

Read-Only Volumes: Configuration files, like nginx.conf, are mounted as read-only (:ro). This prevents a compromised NGINX process from maliciously modifying its own configuration to bypass security controls.

No Privileged Mode: The privileged: true flag must never be used in the docker-compose.yml file, as it effectively disables all container isolation.

Section 7: Observability and Maintenance
Deploying the application is only the first step. To run it reliably in production, a robust strategy for observability and maintenance is required. This involves understanding the health and performance of the system and having automated processes for updates and recovery.

7.1. Centralized Logging and Health Checks

In a distributed microservices architecture, tracking down an error by inspecting the logs of individual containers is inefficient and often impossible. A centralized approach is essential.

Centralized Logging: All microservices should be configured to log structured JSON messages to stdout and stderr. This allows Docker's logging driver to easily capture and forward these logs to a centralized aggregation service. A stack like ELK (Elasticsearch, Logstash, Kibana) or cloud-native solutions like Grafana Loki or Datadog are recommended. This provides a single place to search, filter, and analyze logs from across the entire system, making it possible to trace a single user request as it flows through multiple services.

Health Checks: To ensure the system is resilient, each service must provide a way to signal its health status.

Application-Level Health Checks: Each NestJS service will expose a simple /health endpoint (e.g., using a library like @nestjs/terminus). This endpoint can perform checks to ensure not only that the web server is running but also that it can connect to its database and other critical dependencies.

Container-Level Health Checks: The docker-compose.yml file utilizes the healthcheck instruction for critical services like databases and the message broker. Docker will periodically run the specified command inside the container. If the check fails multiple times, Docker will mark the container as unhealthy. This status can be used by orchestration tools to automatically restart the failing container. Furthermore, the depends_on directive is configured with condition: service_healthy, ensuring that services like project-service will not start until their database and message broker dependencies are fully up and running.

7.2. CI/CD Pipeline Recommendations

Automation is key to maintaining a high-quality, secure, and up-to-date application. A Continuous Integration and Continuous Deployment (CI/CD) pipeline, for example using GitHub Actions, should be implemented to automate the build, test, and deployment process.

A typical pipeline would consist of the following stages:

Code Quality: On every commit, run static analysis tools (e.g., ESLint) and code formatters (e.g., Prettier) to enforce code style and catch common errors.

Unit & Integration Testing: Execute the unit and integration test suites for each microservice. A commit should not be allowed to merge if any tests fail.

Build Docker Images: If tests pass on the main branch, the pipeline will build new Docker images for any services that have changed. These images should be tagged with the commit hash or a semantic version.

Push to Registry: The newly built images are pushed to a container registry (e.g., Docker Hub, GitHub Container Registry, AWS ECR).

Deploy to Staging: The pipeline automatically deploys the new images to a staging environment that mirrors production. Automated end-to-end tests can be run against this environment.

Deploy to Production: After manual approval or successful staging tests, the pipeline deploys the new images to the production environment.

An essential part of this pipeline is automating security updates. Tools like Watchtower can be deployed to automatically pull the latest base images for the application containers, ensuring that the system is patched against known vulnerabilities. Alternatively, a tool like Renovate can be integrated into the Git repository to automatically create pull requests when new versions of base images or NPM dependencies are available, allowing for a more controlled update process.

