FROM public.ecr.aws/lambda/python:3.12 AS builder

# Fix OS-level CVEs - AL2023 repos are version-locked, need --releasever=latest to get security patches
RUN microdnf update -y --releasever=latest \
    openssl-fips-provider-latest \
    openssl-snapsafe-libs \
    libnghttp2 \
    glibc glibc-common \
    libsolv \
    libacl \
    glib2 \
    gawk \
    rpm-libs \
    rpm \
    pcre2 \
    pcre2-syntax \
    libcurl-minimal \
    curl-minimal \
    libxml2 \
    && microdnf clean all

WORKDIR /build

COPY common-lib ./common-lib
COPY pyproject.toml poetry.lock ./

RUN python -m venv .venv && \
    source .venv/bin/activate && \
    pip install --upgrade build && \
    pip install poetry==2.1.0 && \
    poetry self add poetry-plugin-export && \
    poetry export --format requirements.txt --output requirements.txt --without-hashes --without dev && \
    cd common-lib && \
    poetry build

FROM public.ecr.aws/lambda/python:3.12

# Fix OS-level CVEs - AL2023 repos are version-locked, need --releasever=latest to get security patches
RUN microdnf update -y --releasever=latest \
    openssl-fips-provider-latest \
    openssl-snapsafe-libs \
    libnghttp2 \
    glibc glibc-common \
    libsolv \
    libacl \
    glib2 \
    gawk \
    rpm-libs \
    rpm \
    pcre2 \
    pcre2-syntax \
    libcurl-minimal \
    curl-minimal \
    libxml2 \
    && microdnf clean all

WORKDIR /ws

COPY --from=builder /build/common-lib/dist/commonlib-0.1.0.tar.gz .
COPY --from=builder /build/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir commonlib-0.1.0.tar.gz && \
    pip install --no-cache-dir "jaraco.context>=6.1.0" "wheel>=0.46.2"

COPY . .

ENTRYPOINT ["./s3_list_objects.py"]
