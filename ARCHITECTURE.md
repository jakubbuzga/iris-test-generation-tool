+----------------+      +----------------+      +----------------+      +-----------+
|                |      |                |      |                |      |           |
| User Interface |----->|     Backend    |----->|     AI Agent   |----->| LLM Model |
| (React.js)     |<-----| (Node/Express) |<-----|   (Langchain)  |<-----|           |
|                |      |                |      |                |      |           |
+----------------+      +-------+--------+      +----------------+      +-----------+
                          |     ^
                          |     | (Stores Results)
                          v     |
                   +--------+---+----+      +----------------+
                   |                 |      |                |
                   |    Database     |<-----| Test Runner    |
                   |  (PostgreSQL)   |      |   (Newman)     |
                   |                 |      |                |
                   +-----------------+      +-------+--------+
                                                    ^
                                                    | (Run Request)
                                                    |
                                              (Callback w/Report)
```---
## 3. Component Breakdown & Implementation Subtasks

### **a. Frontend (Client)**
*   **Tech Stack:** React.js, Zustand, Axios, Tailwind UI, SASS
*   **Subtasks:** *(Unchanged from previous version)*
    1.  **[FE-1] Setup Project & Auth:** Initialize React project, create login/registration pages, and implement JWT-based auth logic.
    2.  **[FE-2] OpenAPI Spec Management:** Build UI to upload and list OpenAPI specs.
    3.  **[FE-3] Test Generation & Feedback UI:** Build UI to display generated tests, with "Save to Collection" and "Discard" buttons.
    4.  **[FE-4] Postman Collection Management:** Build UI to list, view, import, and manage collections and their test cases.
    5.  **[FE-5] Test Run History & Filtering UI:** Create a main "Test Runs" page with filter controls for collection and status.
    6.  **[FE-6] Detailed Test Run Result View:** Create a page to display full results for a single test run.

---
### **b. Backend (API Server)**
*   **Tech Stack:** Node.js, Express.js, Prisma
*   **Subtasks:**
    1.  **[BE-1] Setup Project & Auth:** Initialize Node.js project, set up Prisma, and implement user authentication endpoints.
    2.  **[BE-2] API Spec & Collection Endpoints:**
        *   `POST /api/specs`: Uploads and saves an `ApiSpecification`.
        *   `POST /api/specs/:id/generate`: Calls the AI Agent to start generating tests for a given specification.
    3.  **[BE-3] Test Case & Feedback Management:**
        *   `POST /api/collections/:id/testcases`: Saves a `TestCase` (with its full Postman item JSON) to a collection.
        *   `POST /api/tests/refine`: Forwards a discarded test case to the AI Agent for refinement.
    4.  **[BE-4] Import/Export Endpoints:**
        *   `POST /api/collections/import`: Parses an imported Postman collection file and creates the corresponding `TestCase` records in the database.
        *   `GET /api/collections/:id/export`: Constructs a Postman-compatible JSON file from the `TestCase` records in a collection.
    5.  **[BE-5] Test Runner & History Endpoints:**
        *   `POST /api/collections/:id/run`: Creates a 'PENDING' `TestRun` and calls the Test Runner Service.
        *   `POST /api/runs/callback/:runId`: An internal endpoint to receive the Newman report and store the detailed results.
        *   `GET /api/runs`: A filterable endpoint for fetching test run history.
        *   `GET /api/runs/:runId`: An endpoint to fetch details for a single run.

---
### **c. AI Agent**
*   **Tech Stack:** Python (FastAPI/Flask) or Node.js (Express) with LangChain
*   **Description:** The intelligent core of the application. It acts as a specialized proxy to the LLM, handling the complex logic of prompt engineering and data formatting.

#### Subtasks:
1.  **[AI-1] Setup Service:** Create a simple, standalone server to expose the agent's API to the Backend.
2.  **[AI-2] Implement OpenAPI Parser:** Create a robust function to parse an OpenAPI specification JSON. This function should extract endpoints, methods, parameters, request body schemas, and example values.
3.  **[AI-3] Develop Prompt Engineering for Generation:**
    *   Design a detailed prompt template that instructs the LLM to act as a QA engineer.
    *   The prompt must request the output to be a **single, valid JSON object** matching the Postman collection `item` schema.
    *   This prompt will include the extracted API details and ask the LLM to generate not only the `request` but also the `event` array containing a `test` script with relevant assertions (e.g., `pm.test("Status code is 200", () => { pm.response.to.have.status(200); });`).
4.  **[AI-4] Implement Feedback Loop for Refinement:**
    *   Design a second prompt template for refining "bad" tests.
    *   This prompt will include the API context and the rejected test case JSON, instructing the LLM to identify the likely error and generate a corrected or alternative version.
5.  **[AI-5] Define and Implement Agent API:**
    *   `POST /generate-test`: Accepts `{ openApiSpec: {...}, context: "..." }`. It will parse the spec, call the LLM with the generation prompt, validate the LLM's JSON output, and return the complete Postman `itemJson`.
    *   `POST /refine-test`: Accepts `{ openApiSpec: {...}, rejectedItemJson: {...} }`. It will call the LLM with the refinement prompt and return the new, improved `itemJson`.

---
## 4. Data Models (Final Prisma Schema)

This schema is updated to store the complete Postman `item` JSON within the `TestCase`, which naturally includes requests, assertions, and other metadata.

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                 String              @id @default(cuid())
  email              String              @unique
  password           String
  createdAt          DateTime            @default(now())
  apiSpecifications  ApiSpecification[]
  postmanCollections PostmanCollection[]
  testRuns           TestRun[]
}

model ApiSpecification {
  id                   String              @id @default(cuid())
  name                 String
  content              Json
  user                 User                @relation(fields: [userId], references: [id])
  userId               String
  createdAt            DateTime            @default(now())
  generatedCollections PostmanCollection[]
}

model PostmanCollection {
  id                 String           @id @default(cuid())
  name               String
  user               User             @relation(fields: [userId], references: [id])
  userId             String
  apiSpecification   ApiSpecification? @relation(fields: [apiSpecificationId], references: [id])
  apiSpecificationId String?
  createdAt          DateTime         @default(now())
  testCases          TestCase[]
  testRuns           TestRun[]
}

// Unified model for all test cases, storing the complete Postman Item object.
model TestCase {
  id           String            @id @default(cuid())
  // The full Postman Item JSON object, including name, request, and the event array with test scripts.
  itemJson     Json
  collection   PostmanCollection @relation(fields: [collectionId], references: [id])
  collectionId String
  createdAt    DateTime          @default(now())
}

// Stores a summary of a single collection run
model TestRun {
  id                  String             @id @default(cuid())
  runAt               DateTime           @default(now())
  status              String             // "PENDING", "COMPLETED", "FAILED"
  postmanCollection   PostmanCollection  @relation(fields: [postmanCollectionId], references: [id])
  postmanCollectionId String
  user                User               @relation(fields: [userId], references: [id])
  userId              String
  summary             Json?              // Store Newman's run.stats and run.timings
  executions          TestRunExecution[]
}

// Stores the detailed result of a single request within a TestRun
model TestRunExecution {
  id              String   @id @default(cuid())
  testRun         TestRun  @relation(fields: [testRunId], references: [id])
  testRunId       String
  requestName     String
  requestDetails  Json
  responseDetails Json?
  assertions      Json?    // Store Newman's execution.assertions array
  status          String   // "passed" or "failed"
}