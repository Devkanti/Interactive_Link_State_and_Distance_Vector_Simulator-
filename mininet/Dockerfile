FROM ubuntu:22.04

# Prevent interactive debconf prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install Mininet, Open vSwitch, networking utilities and Python3
RUN apt-get update && apt-get install -y --no-install-recommends \
    mininet \
    openvswitch-switch \
    openvswitch-common \
    iproute2 \
    iptables \
    iputils-ping \
    net-tools \
    traceroute \
    tcpdump \
    socat \
    python3 \
    python3-pip \
    python3-setuptools \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app/mininet

# Copy mininet scripts and entrypoint
COPY . /app/mininet/

# Grant execution permissions
RUN chmod +x /app/mininet/docker-entrypoint.sh \
    && chmod +x /app/mininet/*.py 2>/dev/null || true

# Expose REST Bridge port
EXPOSE 8080

# Mininet requires container to be run with --privileged or CAP_NET_ADMIN
ENTRYPOINT ["/bin/bash", "/app/mininet/docker-entrypoint.sh"]
