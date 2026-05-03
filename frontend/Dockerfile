# Stage 1: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Accept build arguments
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the React application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine

# Copy the built assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
