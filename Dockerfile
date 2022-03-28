FROM node:alpine
WORKDIR /usr/yourapplication-name
COPY package.json .
RUN npm install
COPY . .
RUN tsc
CMD ["node", "./dist/server.js"]