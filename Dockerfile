# 1. Base Image
FROM phusion/passenger-full:latest

# 2. Set environment variables
ENV HOME /root
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ENV DEBIAN_FRONTEND noninteractive

# 3. Install system dependencies and enable Apache
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3-dev \
    python3-pip \
    build-essential \
    curl \
    apache2 passenger \
    libapache2-mod-passenger && \
    a2enmod passenger && \
    # Disable nginx and enable apache2
    rm -f /etc/service/nginx/down && \
    rm -f /etc/service/apache2/down && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 4. Install Rust


# 5. Create app directory and copy application
WORKDIR /home/app/axum-wsgi
COPY --chown=app:app . .

# 6. Install Python dependencies
# RUN pip3 install --no-cache-dir maturin

# 7. Build the Rust extension
# The user 'app' needs a home directory to exist for cargo to work
RUN mkdir -p /home/app && chown -R app:app /home/app
USER app
ENV HOME "/home/app"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH "/home/app/.cargo/bin:${PATH}"
WORKDIR /home/app/axum-wsgi/example
RUN python3 -m venv .venv && \
    . .venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir maturin && \
    maturin develop
USER root
ENV HOME "/root"
WORKDIR /home/app/axum-wsgi

# 8. Configure Apache
# The default site is enabled in the base image, let's just overwrite it.
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# 9. Create and set up the entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 10. Set the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD []
