FROM public.ecr.aws/lambda/python:3.9 AS builder

WORKDIR /build

COPY common-lib .

RUN python -m venv .venv && \
    source .venv/bin/activate && \
    pip install --upgrade build && \
    python3 -m build -s


FROM public.ecr.aws/lambda/python:3.9

WORKDIR /ws

COPY requirements.txt .
COPY --from=builder /build/dist/commonlib-0.1.0.tar.gz .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir commonlib-0.1.0.tar.gz

COPY . .

ENTRYPOINT ["./s3_list_objects.py"]