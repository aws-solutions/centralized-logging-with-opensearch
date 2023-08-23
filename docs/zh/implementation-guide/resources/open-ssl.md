# OpenSSL 1.1 安装

日志通使用 Fluent Bit 作为日志代理，需要 [OpenSSL 1.1][open-ssl]{target="_blank"} 或更高版本。 您可以根据您的操作系统 (OS) 安装依赖项。 建议您自己制作安装了 OpenSSL 1.1 的 AMI。

!!! important "重要"
    如果您使用的操作系统不在以下列表中，您可以参考官方的安装指南自己安装 OpenSSL。


## Amazon Linux 2

```bash
sudo yum install openssl11
```

## Ubuntu

### 22.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
ln -s /snap/core18/current/usr/lib/x86_64-linux-gnu/libssl.so.1.1 /usr/lib/libssl.so.1.1
ln -s /snap/core18/current/usr/lib/x86_64-linux-gnu/libcrypto.so.1.1 /usr/lib/libcrypto.so.1.1
```

### 20.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

### 18.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## Debian

### GNU/10

```bash
ln -s  /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

### GNU/11

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## Red Hat Enterprise Linux

### 8.X
OpenSSL 1.1 已经默认安装。

### 7.X

```bash
sudo su -

yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm

systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

yum install -y wget perl unzip gcc zlib-devel
mkdir /tmp/openssl
cd /tmp/openssl
wget https://www.openssl.org/source/openssl-1.1.1s.tar.gz
tar xzvf openssl-1.1.1s.tar.gz
cd openssl-1.1.1s
./config --prefix=/usr/local/openssl11 --openssldir=/usr/local/openssl11 shared zlib
make
make install

echo /usr/local/openssl11/lib/ >> /etc/ld.so.conf
ldconfig
```

## SUSE Linux Enterprise Server

### 15
OpenSSL 1.1 已经默认安装。

## CentOS 7 安装日志代理方法

1. 登录到 CentOS 7 机器中，手动安装 SSM Agent。

    ```bash
    sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
    ```

2. 来到日志通 控制台的**实例组**面板，创建**实例组**，选择 centos 7 机器，点击**安装日志代理**，等待其状态为**离线**。

3. 登录 centos7 手动安装 fluent-bit 1.9.3。

    ```bash
    export RELEASE_URL=${FLUENT_BIT_PACKAGES_URL:-https://packages.fluentbit.io}
    export RELEASE_KEY=${FLUENT_BIT_PACKAGES_KEY:-https://packages.fluentbit.io/fluentbit.key}

    sudo rpm --import $RELEASE_KEY
    cat << EOF | sudo tee /etc/yum.repos.d/fluent-bit.repo
    [fluent-bit]
    name = Fluent Bit
    baseurl = $RELEASE_URL/centos/VERSION_ARCH_SUBSTR
    gpgcheck=1
    repo_gpgcheck=1
    gpgkey=$RELEASE_KEY
    enabled=1
    EOF
    sudo sed -i 's|VERSION_ARCH_SUBSTR|\$releasever/\$basearch/|g' /etc/yum.repos.d/fluent-bit.repo
    sudo yum install -y fluent-bit-1.9.3-1

    # 修改配置文件
    sudo sed -i 's/ExecStart.*/ExecStart=\/opt\/fluent-bit\/bin\/fluent-bit -c \/opt\/fluent-bit\/etc\/fluent-bit.conf/g' /usr/lib/systemd/system/fluent-bit.service
    sudo systemctl daemon-reload
    sudo systemctl enable fluent-bit
    sudo systemctl start fluent-bit
    ```
4. 回到日志通 控制台的**实例组**面板，等待 CentOS 7 机器状态为**在线**并继续创建实例组。


[open-ssl]: https://www.openssl.org/source/