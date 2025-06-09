# Use an official Node.js runtime as a parent image
FROM node:alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
# Using --legacy-peer-deps based on previous experiences with this project
RUN npm install --legacy-peer-deps

# Copy the rest of the application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application
CMD ["node", "dist/server.js"]
