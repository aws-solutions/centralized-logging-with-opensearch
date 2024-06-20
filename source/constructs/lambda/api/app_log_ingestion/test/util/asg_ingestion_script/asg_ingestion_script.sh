#!/usr/bin/env bash
set -eo pipefail

export PATH=/usr/local/bin:$PATH

OS_UBUNTU="ubuntu"
OS_UBUNTU_22="ubuntu-22"
OS_UBUNTU_20="ubuntu-20"
OS_UBUNTU_18="ubuntu-18"

OS_DEBIAN="debian"
OS_DEBIAN_10="debian-10"
OS_DEBIAN_11="debian-11"

OS_AMAZON_LINUX="amazon-linux"
OS_AMAZON_LINUX_1="amazon-linux-1"
OS_AMAZON_LINUX_2="amazon-linux-2"

OS_RHEL="rhel"
OS_RHEL_8="rhel-8"
OS_RHEL_7="rhel-7"

ARCH=$(uname -m)

get_os_version() {
    local os_name=$(grep -E -w 'NAME' /etc/os-release)
    local os_version=$(grep -E -w 'VERSION' /etc/os-release)
    if [ $(echo ${os_name} | grep -i ubuntu | wc -l) -ge 1 ]; then
        if [ $(echo ${os_version} | grep -i 22 | wc -l) -ge 1 ]; then
            echo ${OS_UBUNTU_22}
        elif [ $(echo ${os_version} | grep -i 20 | wc -l) -ge 1 ]; then
            echo ${OS_UBUNTU_20}
        elif [ $(echo ${os_version} | grep -i 18 | wc -l) -ge 1 ]; then
            echo ${OS_UBUNTU_18}
        else
            echo ${OS_UBUNTU}
        fi
    elif [ $(echo ${os_name} | grep -i debian | wc -l) -ge 1 ]; then
        if [ $(echo ${os_version} | grep -i 10 | wc -l) -ge 1 ]; then
            echo ${OS_DEBIAN_10}
        elif [ $(echo ${os_version} | grep -i 11 | wc -l) -ge 1 ]; then
            echo ${OS_DEBIAN_11}
        else
            echo ${OS_DEBIAN}
        fi
    elif [ $(echo ${os_name} | grep -i "amazon linux" | wc -l) -ge 1 ]; then
        if [ $(echo ${os_version} | grep -i 1 | wc -l) -ge 1 ]; then
            echo ${OS_AMAZON_LINUX_1}
        elif [ $(echo ${os_version} | grep -i 2 | wc -l) -ge 1 ]; then
            echo ${OS_AMAZON_LINUX_2}
        else
            echo ${OS_AMAZON_LINUX}
        fi
    elif [ $(echo ${os_name} | grep -i "Red Hat Enterprise Linux" | wc -l) -ge 1 ]; then
        if [ "$(echo ${os_version} | grep -i 8.* | wc -l)" -ge 1 ]; then
            echo ${OS_RHEL_8}
        elif [ "$(echo ${os_version} | grep -i 7.* | wc -l)" -ge 1 ]; then
            echo ${OS_RHEL_7}
        else
            echo ${OS_RHEL}
        fi
    fi 
}

CONNECTION_TIMEOUT=5
WGET_INSTALLED=true && wget --version &> /dev/null || WGET_INSTALLED=false
CURL_INSTALLED=true && curl --version &> /dev/null || CURL_INSTALLED=false
download() {
    local download_url=$1
    local destination=$2
    [ $WGET_INSTALLED == true ] && {
        wget ${download_url} -nv --connect-timeout ${CONNECTION_TIMEOUT} -O ${destination} || {
            >&2 echo "Failed to download from ${download_url} to ${destination}, Please check your network service."
            return 1
        }
    } || {
        curl ${download_url} -sSfL --connect-timeout ${CONNECTION_TIMEOUT} -o ${destination} || {
            >&2 echo "Failed to download from ${download_url} to ${destination}, Please check your network service."
            return 1
        }
    }
    return 0
}

urlopen() {
    local download_url=$1
    [ $CURL_INSTALLED == true ] && {
        curl ${download_url} -sSfL --connect-timeout ${CONNECTION_TIMEOUT} || {
            echo "Failed to open ${download_url}, Please check your network service." 1>&2
            return 1
        }
    } || {
        wget ${download_url} -nv --connect-timeout ${CONNECTION_TIMEOUT} -O- || {
            echo "Failed to open ${download_url}, Please check your network service." 1>&2
            return 1
        }
    }
    return 0
}

IS_CHINA_REGION=$(hostname | { grep cn- || true; })
CURRENT_REGION=$(hostname | cut -d'.' -f2)

has_svc() {
    local svc_name=$1
    if systemctl status "${svc_name}" >& /dev/null; then
        return 0    # yes
    else
        return 1    # no
    fi
}

install_deps() {
    local os_name=$1
    if [ $(echo ${os_name} | grep -i ${OS_AMAZON_LINUX} | wc -l) -ge 1 ]; then
        yum install -y openssl11
    elif [ $(echo ${os_name} | grep -i ${OS_DEBIAN} | wc -l) -ge 1 ]; then
        ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        apt install -y unzip
        if has_svc amazon-ssm-agent; then
            return 0
        fi
        download http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb /tmp/amazon-ssm-agent.deb
        dpkg -i /tmp/amazon-ssm-agent.deb
        systemctl enable amazon-ssm-agent
        systemctl start amazon-ssm-agent
    elif [ $(echo ${os_name} | grep -i ${OS_UBUNTU} | wc -l) -ge 1 ]; then
        ln -s -f /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
        apt install -y unzip
        if [ $(echo ${os_name} | grep -i ${OS_UBUNTU_22} | wc -l) -ge 1 ]; then
            ln -s /snap/core18/current/usr/lib/x86_64-linux-gnu/libssl.so.1.1 /usr/lib/libssl.so.1.1
            ln -s /snap/core18/current/usr/lib/x86_64-linux-gnu/libcrypto.so.1.1 /usr/lib/libcrypto.so.1.1
        fi
    elif [ $(echo ${os_name} | grep -i ${OS_RHEL} | wc -l) -ge 1 ]; then
        yum install -y unzip
        if [ $(echo ${os_name} | grep -i ${OS_RHEL_7} | wc -l) -ge 1 ]; then
            if ! has_svc amazon-ssm-agent; then
                yum install -y http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
                systemctl enable amazon-ssm-agent
                systemctl start amazon-ssm-agent
            fi
            cd /tmp
            yum install -y unzip gcc perl
            download https://github.com/openssl/openssl/archive/OpenSSL_1_1_1-stable.zip OpenSSL_1_1_1-stable.zip
            unzip OpenSSL_1_1_1-stable.zip
            cd openssl-OpenSSL_1_1_1-stable/
            ./config
            make install
            echo "/usr/local/lib64/" >> /etc/ld.so.conf
            ldconfig
        fi
    fi
}

install_aws_cli() {
    if which aws; then
        echo "skip installation since aws cli has already been installed."
        return 0
    fi
    cd /tmp
    download https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip awscliv2.zip
    unzip awscliv2.zip
    ./aws/install
}

if [ "$IS_CHINA_REGION" != "" ]; then
    FLB_PKG_DOMAIN="aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn"
else
    FLB_PKG_DOMAIN="aws-gcr-solutions-assets.s3.amazonaws.com"
fi

install_fluent_bit() {
    local suffix=""
    if [ "$ARCH" == "aarch64" ]; then
        suffix="-arm64"
    fi
    mkdir -p /opt
    download "https://${FLB_PKG_DOMAIN}/clo/${SOLUTION_VERSION}/aws-for-fluent-bit/fluent-bit${suffix}.tar.gz" /opt/fluent-bit.tar.gz
    cd /opt
    tar -xvzf fluent-bit.tar.gz
    cat << EOF | tee /etc/systemd/system/fluent-bit.service
[Unit]
Description=Fluent Bit
Requires=network.target
After=network.target

[Service]
Type=simple
ExecStart=/opt/fluent-bit/bin/fluent-bit -c /opt/fluent-bit/etc/fluent-bit.conf
Type=simple
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    systemctl enable fluent-bit.service
    systemctl daemon-reload
}


fetch_config_and_restart_fluent_bit() {
    export AWS_DEFAULT_REGION=${CURRENT_REGION}
    aws s3 cp s3://${BUCKET_NAME}/app_log_config/${ASG_NAME}/applog_parsers.conf /opt/fluent-bit/etc/
    aws s3 cp s3://${BUCKET_NAME}/app_log_config/${ASG_NAME}/fluent-bit.conf /opt/fluent-bit/etc/
    systemctl restart fluent-bit
}

OS_VERSION=$(get_os_version)

echo "current region is: ${CURRENT_REGION}"
echo "os version: ${OS_VERSION}"
echo "arch: ${ARCH}"
echo "installing deps." && install_deps ${OS_VERSION}
echo "installing aws cli v2." && install_aws_cli
echo "installing fluent-bit." && install_fluent_bit
echo "fetching config and restart fluent-bit." && fetch_config_and_restart_fluent_bit
echo "done."