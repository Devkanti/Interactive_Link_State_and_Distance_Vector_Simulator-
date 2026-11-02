# ==============================================================================
# STAGE 1: Build the React TypeScript Web Dashboard
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: Serve with High-Performance Nginx Alpine
# ==============================================================================
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
