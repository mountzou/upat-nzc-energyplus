FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

ARG ENERGYPLUS_URL="https://github.com/NREL/EnergyPlus/releases/download/v25.2.0/EnergyPlus-25.2.0-cf7368216c-Linux-Ubuntu22.04-arm64.tar.gz"
ARG ENERGYPLUS_SHA="b5247538b4ecbaec9ea57754b55d5d8cd3e07059b3c485db387b5430a8fa1f5a"
ARG ENERGYPLUS_ROOT="/opt/EnergyPlus-25.2.0-cf7368216c-Linux-Ubuntu22.04-arm64"

ENV ENERGYPLUS_URL=${ENERGYPLUS_URL}
ENV ENERGYPLUS_SHA=${ENERGYPLUS_SHA}
ENV ENERGYPLUS_ROOT=${ENERGYPLUS_ROOT}
ENV ENERGYPLUS_IDD=${ENERGYPLUS_ROOT}/Energy+.idd

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L "$ENERGYPLUS_URL" -o /tmp/energyplus.tar.gz \
    && echo "$ENERGYPLUS_SHA  /tmp/energyplus.tar.gz" | sha256sum -c - \
    && mkdir -p /opt \
    && tar -xzf /tmp/energyplus.tar.gz -C /opt \
    && rm /tmp/energyplus.tar.gz

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY app ./app
COPY resources ./resources

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]