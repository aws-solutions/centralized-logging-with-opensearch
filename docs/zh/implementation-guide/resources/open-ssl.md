# OpenSSL 1.1 安装

Log Hub 使用 Fluent Bit 作为日志代理，需要 [OpenSSL 1.1][open-ssl]{target="_blank"} 或更高版本。 您可以根据您的操作系统 (OS) 安装依赖项。 建议您自己制作安装了 OpenSSL 1.1 的 AMI。

!!! important "重要"
    如果您使用的操作系统不在以下列表中，这并不代表您不可以使用 Log Hub。您需要自己安装 OpenSSL 1.1。


## Amazon Linux 2

```bash
sudo yum install openssl11
```

## Ubuntu

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


[open-ssl]: https://www.openssl.org/source/