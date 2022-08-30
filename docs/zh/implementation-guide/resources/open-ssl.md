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
OpenSSL 已经默认安装。

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
sudo yum -y install wget
sudo yum -y install ca-certificates
echo "ca_directory=/etc/ssl/certs" | sudo tee -a /etc/wgetrc > /dev/null

wget https://github.com/openssl/openssl/archive/OpenSSL_1_1_1-stable.zip
sudo yum -y install gcc unzip perl
unzip OpenSSL_1_1_1-stable.zip
cd openssl-OpenSSL_1_1_1-stable
./config
sudo make
sudo make install
echo "/usr/local/lib64/" | sudo tee -a /etc/ld.so.conf > /dev/null
sudo ldconfig
```

## SUSE Linux Enterprise Server 

### 15
OpenSSL 1.1 已经默认安装。


[open-ssl]: https://www.openssl.org/source/