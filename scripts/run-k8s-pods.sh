#!/usr/bin/env bash

set -eo pipefail

export AWS_PAGER=""

CURRENT_REGION="$(aws ec2 describe-availability-zones --output text --query 'AvailabilityZones[0].[RegionName]')"
IS_CHINA_REGION="$(echo "${CURRENT_REGION}" | grep ^cn-)"

echo "Current region is ${CURRENT_REGION}."

if [ -n "${IS_CHINA_REGION}" ]; then
    GITHUB_HOST="hub.fastgit.xyz"
else
    GITHUB_HOST="github.com"
fi

if [[ "$1" == "x86" ]]; then
    ARCH="amd64"
elif [[ "$1" == "x64" ]]; then
    ARCH="amd64"
elif [[ "$1" == "arm" ]]; then
    ARCH="arm64"
else
    ARCH="amd64"
fi

echo "Arch is ${ARCH}."


# json sample log:
#   {"host":"176.54.164.169", "user-identifier":"kling1353", "time":"24/Jul/2022:07:56:40 +0000", "method": "PUT", "request": "/unleash/magnetic/matrix", "protocol":"HTTP/1.1", "status":403, "bytes":29229, "referer": "http://www.chiefleading-edge.info/frictionless"}
# json log time format:
#   %d/%b/%Y:%H:%M:%S %z
# log path: /var/log/containers/flog-json*.log

# nginx sample log:
#   130.224.138.98 - bartoletti6752 [24/Jul/2022:07:53:55 +0000] "POST /strategic HTTP/1.0" 203 23317
# nginx log format:
#   log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
#   '$status $body_bytes_sent';
# time format:
#   %d/%b/%Y:%H:%M:%S %z
# regex:
#   (?<remote_addr>\S+)\s+-\s+(?<remote_user>\S+)\s+\[(?<time>\d+/\S+/\d+:\d+:\d+:\d+\s+\S+)\]\s+"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s+(?<status>\S+)\s+(?<body_bytes_sent>\S+).*
# log path: /var/log/containers/flog-nginx*.log

# apache sample log:
#   55.146.151.251 - - [24/Jul/2022:07:59:59 +0000] "POST /e-enable HTTP/1.1" 405 13357
# apache log format:
#   LogFormat "%h %l %u %t \"%r\" %>s %b" combined
# log path: /var/log/containers/flog-apache*.log

# spring-boot sample log:
#   2022-07-27 03:33:52  INFO [http-nio-80-exec-4] com.amazonaws.demo.petstore.PetstoreApplication : nginx forward
# spring-boot log format:
#   %d{yyyy-MM-dd HH:mm:ss} %-5level [%thread] %logger : %msg%n
# log path:
#   /var/log/containers/spring-boot*.log


cat <<EOF | kubectl apply -f -
---
# flog json
apiVersion: v1
kind: Pod
metadata:
  name: flog-json
spec:
  containers:
    - name: flog-json
      image: nginx:1.20
      resources:
        limits:
          cpu: 200m
          memory: 512Mi
      args:
        - /bin/bash
        - -xec
        - |
          curl -LS "https://${GITHUB_HOST}/wchaws/flog/releases/download/v0.5.0-20220529/flog_0.5.0-20220529_linux_${ARCH}.tar.gz" -o /tmp/flog.tar.gz
          cd /tmp
          tar -xvzf flog.tar.gz
          mv flog /usr/bin
          mkdir -p /var/log/json
          /usr/bin/flog -d 1s -l -f json | sed -e 's/datetime/time/g' | tee /var/log/json/access.log

---
# flog nginx
apiVersion: v1
kind: Pod
metadata:
  name: flog-nginx
spec:
  containers:
    - name: flog-nginx
      image: nginx:1.20
      resources:
        limits:
          cpu: 200m
          memory: 512Mi
      args:
        - /bin/bash
        - -xec
        - |
          curl -LS "https://${GITHUB_HOST}/wchaws/flog/releases/download/v0.5.0-20220529/flog_0.5.0-20220529_linux_${ARCH}.tar.gz" -o /tmp/flog.tar.gz
          cd /tmp
          tar -xvzf flog.tar.gz
          mv flog /usr/bin
          mkdir -p /var/log/nginx/
          /usr/bin/flog -d 2s -l | tee /var/log/nginx/access.log

---
# flog apache
apiVersion: v1
kind: Pod
metadata:
  name: flog-apache
spec:
  containers:
    - name: flog-apache
      image: nginx:1.20
      resources:
        limits:
          cpu: 200m
          memory: 512Mi
      args:
        - /bin/bash
        - -xec
        - |
          curl -LS "https://${GITHUB_HOST}/wchaws/flog/releases/download/v0.5.0-20220529/flog_0.5.0-20220529_linux_${ARCH}.tar.gz" -o /tmp/flog.tar.gz
          cd /tmp
          tar -xvzf flog.tar.gz
          mv flog /usr/bin
          mkdir -p /var/log/apache/
          /usr/bin/flog -d 2s -f apache_common -l | tee /var/log/apache/access.log

---
# spring-boot
apiVersion: v1
kind: Pod
metadata:
  name: spring-boot
spec:
  containers:
    - name: spring-boot
      image: openjdk:11-jre
      resources:
        limits:
          cpu: 200m
          memory: 512Mi
      args:
        - /bin/bash
        - -xec
        - |
          cd /tmp
          wget https://aws-gcr-solutions.s3.amazonaws.com/log-hub-workshop/v1.0.0/petstore-0.0.1-SNAPSHOT.jar
          mkdir -p /var/log/spring-boot/
          java -jar petstore-0.0.1-SNAPSHOT.jar --server.port=80 | tee /var/log/spring-boot/access.log
      ports:
        - containerPort: 80
          protocol: TCP
    - name: ping-spring-boot
      image: badouralix/curl-jq
      resources:
        limits:
          cpu: 200m
          memory: 512Mi
      args:
        - /bin/sh
        - -ec
        - |
          curl -LSs "https://${GITHUB_HOST}/wchaws/flog/releases/download/v0.5.0-20220529/flog_0.5.0-20220529_linux_${ARCH}.tar.gz" -o /tmp/flog.tar.gz
          cd /tmp
          tar -xvzf flog.tar.gz
          mv flog /usr/bin
          while true; do
            flog -f json -n 10 | jq -r '"http://localhost" + .request' | xargs -I {} sh -c "curl {} -o /dev/null; sleep 1;" &> /dev/null
            curl http://localhost/hello &> /dev/null
          done
EOF