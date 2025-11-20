FROM public.ecr.aws/docker/library/alpine:latest AS installer
RUN apk update && apk add --no-cache unzip curl
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip -d /tmp/

FROM public.ecr.aws/aws-observability/aws-for-fluent-bit:3.0.1

COPY --from=installer /tmp/aws /tmp/aws

RUN /tmp/aws/install

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 2022
ENTRYPOINT ["./docker-entrypoint.sh"]
