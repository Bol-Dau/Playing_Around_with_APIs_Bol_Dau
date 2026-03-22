# Use Nginx as the web server
FROM nginx:alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy all farmiq app files into the folder Nginx serves from
COPY . /usr/share/nginx/html

# Copy the custom Nginx config so that landing.html is served first
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Open port 80 so the outside world can reach the app
EXPOSE 80

# Start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]
