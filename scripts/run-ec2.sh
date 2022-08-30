#!/usr/bin/env bash
# docs:
# https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-finding-public-parameters.html#paramstore-discover-public-console
#
# usage:
# ./run-ec2.sh <your-ec2-key-pair>
# AWS_DEFAULT_REGION=us-west-2 ./run-ec2.sh <your-ec2-key-pair>

set -eo pipefail

function systemd_conf() {
    local desc="$1"
    local cmd="$2"

    echo "[Unit]
Description=${desc}
Requires=network.target
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash -c \\\"${cmd}\\\"
Type=simple
Restart=always

[Install]
WantedBy=multi-user.target"
}

export AWS_PAGER=""

CURRENT_REGION="$(aws ec2 describe-availability-zones --output text --query 'AvailabilityZones[0].[RegionName]')"
IS_CHINA_REGION="$(echo "${CURRENT_REGION}" | grep ^cn-)"

echo "Current region is ${CURRENT_REGION}."

if [ -n "${IS_CHINA_REGION}" ]; then
    GITHUB_HOST="hub.fastgit.xyz"
else
    GITHUB_HOST="github.com"
fi

# json sample log:
#   {"host":"176.54.164.169", "user-identifier":"kling1353", "time":"24/Jul/2022:07:56:40 +0000", "method": "PUT", "request": "/unleash/magnetic/matrix", "protocol":"HTTP/1.1", "status":403, "bytes":29229, "referer": "http://www.chiefleading-edge.info/frictionless"}
# json log time format:
#   %d/%b/%Y:%H:%M:%S %z

# nginx sample log:
#   130.224.138.98 - bartoletti6752 [24/Jul/2022:07:53:55 +0000] "POST /strategic HTTP/1.0" 203 23317
# nginx log format:
#   log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
#   '$status $body_bytes_sent';
# time format:
#   %d/%b/%Y:%H:%M:%S %z
# regex:
#   (?<remote_addr>\S+)\s+-\s+(?<remote_user>\S+)\s+\[(?<time>\d+/\S+/\d+:\d+:\d+:\d+\s+\S+)\]\s+"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s+(?<status>\S+)\s+(?<body_bytes_sent>\S+).*

# apache sample log:
#   55.146.151.251 - - [24/Jul/2022:07:59:59 +0000] "POST /e-enable HTTP/1.1" 405 13357
# apache log format:
#   LogFormat "%h %l %u %t \"%r\" %>s %b" combined

FLOG_JSON_CONF="$(systemd_conf flog-json 'mkdir -p /var/log/json/ && flog -f json -d 2s -l | sed -e 's/datetime/time/g' > /var/log/json/access.log')"
FLOG_NGINX_CONF="$(systemd_conf flog-nginx 'mkdir -p /var/log/nginx/ && flog -d 2s -l > /var/log/nginx/access.log')"
FLOG_APACHE_CONF="$(systemd_conf flog-apache 'mkdir -p /var/log/apache/ && flog -f apache_common -d 2s -l > /var/log/apache/access.log')"
SPRING_BOOT_CONF="$(systemd_conf spring-boot 'mkdir -p /var/log/spring-boot/ && java -jar /var/lib/app.jar --server.port=8080 > /var/log/spring-boot/access.log')"

FLOG_TARBALL_URL="https://${GITHUB_HOST}/wchaws/flog/releases/download/v0.5.1-20220623/flog_0.5.1-20220623_linux_amd64.tar.gz"
SPRING_BOOT_JAR_URL="https://aws-gcr-solutions.s3.amazonaws.com/log-hub-workshop/v1.0.0/petstore-0.0.1-SNAPSHOT.jar"
SYSTEMD_SVC_INSTALL="cd /tmp/
curl -LS ${FLOG_TARBALL_URL} -o /tmp/flog.tar.gz
tar -xvzf flog.tar.gz
mv flog /usr/bin
curl -LS ${SPRING_BOOT_JAR_URL} -o /var/lib/app.jar
echo \"${FLOG_JSON_CONF}\" > /etc/systemd/system/flog-json.service
echo \"${FLOG_NGINX_CONF}\" > /etc/systemd/system/flog-nginx.service
echo \"${FLOG_APACHE_CONF}\" > /etc/systemd/system/flog-apache.service
echo \"${SPRING_BOOT_CONF}\" > /etc/systemd/system/spring-boot.service
systemctl enable flog-json.service flog-nginx.service flog-apache.service spring-boot.service
systemctl start flog-json.service flog-nginx.service flog-apache.service spring-boot.service"

KEYPAIR=$1

# amazon linux 2
NAME="run-ec2-amazon-linux2" && echo -n "Creating a ${NAME} instance: "
aws ec2 run-instances \
    --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo yum update -y
        sudo yum install -y openssl11
        sudo amazon-linux-extras install -y nginx1 java-openjdk11 || sudo amazon-linux-extras install -y nginx1 java-openjdk11   # double install to make sure installation is successful
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# debian 10
NAME="run-ec2-debian-10" && echo -n "Creating a ${NAME} instance: "
if [ -n "${IS_CHINA_REGION}" ]; then
    AMI=$(aws ec2 describe-images  --filters "Name=name,Values=debian-10*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
else
    AMI="resolve:ssm:/aws/service/debian/release/10/latest/amd64"
fi
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        cd /tmp/
        wget http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb || wget http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb
        sudo dpkg -i amazon-ssm-agent.deb
        sudo systemctl enable amazon-ssm-agent
        sudo apt update
        sudo apt install -y default-jre
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# debian 11
NAME="run-ec2-debian-11" && echo -n "Creating a ${NAME} instance: "
if [ -n "${IS_CHINA_REGION}" ]; then
    AMI=$(aws ec2 describe-images  --filters "Name=name,Values=debian-11*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
else
    AMI="resolve:ssm:/aws/service/debian/release/11/latest/amd64"
fi
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        cd /tmp/
        wget http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb || wget http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb
        sudo dpkg -i amazon-ssm-agent.deb
        sudo systemctl enable amazon-ssm-agent
        sudo apt update
        sudo apt install -y default-jre
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# ubuntu 20.04
NAME="run-ec2-ubuntu-20.04" && echo -n "Creating a ${NAME} instance: "
if [ -n "${IS_CHINA_REGION}" ]; then
    AMI=$(aws ec2 describe-images  --filters "Name=name,Values=ubuntu/images/hvm-ssd*20.04*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
else
    AMI="resolve:ssm:/aws/service/canonical/ubuntu/server-minimal/20.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
fi
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        sudo apt update
        sudo apt install -y default-jre
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# ubuntu 18.04
NAME="run-ec2-ubuntu-18.04" && echo -n "Creating a ${NAME} instance: "
if [ -n "${IS_CHINA_REGION}" ]; then
    AMI=$(aws ec2 describe-images  --filters "Name=name,Values=ubuntu/images/hvm-ssd*18.04*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
else
    AMI="resolve:ssm:/aws/service/canonical/ubuntu/server-minimal/18.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
fi
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        sudo apt update
        sudo apt install -y default-jre
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# redhat enterprise linux 8.5.0
NAME="run-ec2-rhel-8.5.0" && echo -n "Creating a ${NAME} instance: "
AMI=$(aws ec2 describe-images  --filters "Name=name,Values=RHEL-8.5.0_HVM-*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo dnf install -y http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
        sudo systemctl enable amazon-ssm-agent
        sudo systemctl start amazon-ssm-agent
        sudo yum update -y
        sudo yum install -y java-11-openjdk
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

# centos 7
NAME="run-ec2-centos-7" && echo -n "Creating a ${NAME} instance: "
AMI=$(aws ec2 describe-images  --filters "Name=name,Values=CentOS-7*" "Name=architecture,Values=x86_64" --query 'reverse(sort_by(Images, &CreationDate))[0].ImageId' --output text)
aws ec2 run-instances \
    --image-id ${AMI} \
    --instance-type t2.medium \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
    --user-data "#!/bin/bash -ex
        exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
        sudo yum install -y http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
        sudo systemctl enable amazon-ssm-agent
        sudo systemctl start amazon-ssm-agent
        cd /tmp
        sudo yum update -y
        sudo yum install -y unzip gcc perl
        sudo yum install -y java-11-openjdk
        curl -SL https://${GITHUB_HOST}/openssl/openssl/archive/OpenSSL_1_1_1-stable.zip -o OpenSSL_1_1_1-stable.zip
        unzip OpenSSL_1_1_1-stable.zip
        cd openssl-OpenSSL_1_1_1-stable/
        ./config
        sudo make install
        sudo echo "/usr/local/lib64/" >> /etc/ld.so.conf
        sudo ldconfig
        ${SYSTEMD_SVC_INSTALL}
    " \
    --key-name ${KEYPAIR} --query 'Instances[].InstanceId' --output text

echo "Please manually attach SSM IAM role to your instances!"