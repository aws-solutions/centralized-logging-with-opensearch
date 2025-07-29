FROM public.ecr.aws/lambda/python:3.12.2025.07.27.11 AS builder

WORKDIR /build

COPY common-lib ./common-lib
COPY pyproject.toml poetry.lock ./

RUN python -m venv .venv && \
    source .venv/bin/activate && \
    pip install --upgrade build && \
    pip install poetry==2.0.1 && \
    poetry self add poetry-plugin-export && \
    poetry export --format requirements.txt --output requirements.txt --without-hashes --without dev && \
    cd common-lib && \
    poetry build

FROM public.ecr.aws/lambda/python:3.12.2025.07.27.11

WORKDIR /ws

COPY --from=builder /build/common-lib/dist/commonlib-0.1.0.tar.gz .
COPY --from=builder /build/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir commonlib-0.1.0.tar.gz

COPY . .

ENTRYPOINT ["./s3_list_objects.py"]