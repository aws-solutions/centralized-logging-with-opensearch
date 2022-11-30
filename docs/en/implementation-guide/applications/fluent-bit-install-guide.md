# Fluent-bit installation guide

Currently, Log hub uses fluent-bit as the log agent. The prerequisites for different operating system are different.


## Amazon Linux 2

```bash
sudo yum install openssl11
```

## CentOS 7

```bash
cd /tmp
sudo yum install -y unzip gcc perl
curl -SL https://github.com/openssl/openssl/archive/OpenSSL_1_1_1-stable.zip -o OpenSSL_1_1_1-stable.zip
unzip OpenSSL_1_1_1-stable.zip
cd openssl-OpenSSL_1_1_1-stable/
./config
sudo make install
sudo echo "/usr/local/lib64/" >> /etc/ld.so.conf
sudo ldconfig
```

## Ubuntu

### Ubuntu 20.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so /usr/lib/libsasl2.so.3
```

### Ubuntu 18.04

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## Red Hat Enterprise Linux 8.5

None

## Debian

### Debian GNU/10

```bash
ln -s  /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

### Debian GNU/11

```bash
ln -s /usr/lib/x86_64-linux-gnu/libsasl2.so.2 /usr/lib/libsasl2.so.3
```

## SUSE Linux Enterprise Server 15

None