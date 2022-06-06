# OpenSSL 1.1 Installation

Log Hub uses Fluent Bit as the logging agent, which requires [OpenSSL 1.1][open-ssl]{target="_blank"} or later. You can install the dependency according to your operating system (OS). It is recommended to make your own AMI with OpenSSL 1.1 installed.

!!! important "Important"
    If your OS is not listed below, it does not mean you cannot use Log Hub. You need to find a way to install OpenSSL 1.1.

## Amazon Linux 2

```bash
sudo yum install openssl11
```

## CentOS 7

```bash
sudo yum -y install wget gcc unzip perl
wget https://github.com/openssl/openssl/archive/OpenSSL_1_1_1-stable.zip
unzip OpenSSL_1_1_1-stable.zip
cd openssl-OpenSSL_1_1_1-stable
./config 
sudo make 
sudo make install
echo "/usr/local/lib64/" | sudo tee -a /etc/ld.so.conf > /dev/null
sudo ldconfig
```

## Ubuntu

### 20.04
OpenSSL 1.1 is installed by default.

### 18.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## Debian

### GNU/10

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

### GNU/11

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## Red Hat Enterprise Linux 

### 8.X
OpenSSL 1.1 is installed by default.

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
OpenSSL 1.1 is installed by default.


[open-ssl]: https://www.openssl.org/source/