FROM nginx:alpine

# Custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entire project (respecting .dockerignore)
COPY . /usr/share/nginx/html/

# Cleanup non-web files that leaked in
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/generate-albums.js \
          /usr/share/nginx/html/README.md && \
    rm -rf /usr/share/nginx/html/.git \
           /usr/share/nginx/html/.github \
           /usr/share/nginx/html/node_modules

EXPOSE 4111

CMD ["nginx", "-g", "daemon off;"]
