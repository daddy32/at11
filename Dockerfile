FROM node:18 as builder
ENV TZ=Europe/Kiev
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
RUN ls -la /usr/src/app/*

FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install Puppeteer/Chromium dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libglib2.0-0 \
    libxshmfence1 \
    libu2f-udev \
    libvpx7 \
    libxss1 \
    libxtst6 \
    libpci3 \
    libwayland-client0 \
    libwayland-cursor0 \
    libwayland-egl1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatspi2.0-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package*.json ./

RUN npm ci --production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/static ./static
COPY --from=builder /usr/src/app/views ./views

RUN ls -la /usr/src/app/*

EXPOSE 54321
CMD ["node", "./dist/app.js"]
