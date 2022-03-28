FROM ubuntu:latest
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y nodejs \
    npm
WORKDIR /usr/yourapplication-name
COPY package.json .
RUN npm install
COPY . .
RUN tsc
CMD ["node", "./dist/server.js"]