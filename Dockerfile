# Use an Ubuntu base image
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    python3 \
    python3-pip \
    unzip \
    socat \
    build-essential \
    libssl-dev \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install NVM, Node.js, and npm
ENV NVM_DIR /root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install 18 && \
    nvm use 18 && \
    nvm alias default 18

# Add Node to PATH (use wildcard to match actual version)
RUN ln -sf $NVM_DIR/versions/node/v18.*/bin/* /usr/local/bin/
ENV PATH $NVM_DIR/versions/node/v18.20.8/bin:$PATH

# Set the working directory
WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies
RUN npm install

RUN npx update-browserslist-db@latest

# Copy application files
COPY . .

# Expose necessary ports
EXPOSE 5173

CMD ["npx", "vite", "--host"]
