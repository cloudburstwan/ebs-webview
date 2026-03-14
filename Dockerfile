# Build stage:
# Build the application with a Node Alpine image
FROM node:20-alpine as build-stage

# Set the working directory in the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite application for production
RUN npm run build

# Production stage:
# Serve the static files with Nginx (or similar web server)
# Use a minimal web server like Nginx-alpine for production serving
FROM nginx:stable-alpine as production-stage

# Copy the build output from the 'build' stage to the Nginx serve directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Install Minio Client
RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc
RUN chmod +x mc

# Get arguments
ARG S3_ENDPOINT
ARG S3_ACCESS_KEY
ARG S3_SECRET_KEY

# Create alias for S3 store and pull certificates
RUN ./mc alias set s3 $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY
RUN ./mc get s3/certs/fullchain.pem /etc/nginx/fullchain.pem
RUN ./mc get s3/certs/privkey.pem /etc/nginx/privkey.pem

# Expose the port Nginx is running on (default is 80)
EXPOSE 80
EXPOSE 443

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
