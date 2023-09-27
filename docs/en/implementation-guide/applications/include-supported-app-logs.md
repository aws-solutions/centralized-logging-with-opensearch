The table lists the log formats supported by each log source. For more information about how to create log ingestion for each log format, refer to [Log Config](./create-log-config.md).

| Log Format | EC2 Instance Group | EKS Cluster | Amazon S3 | Syslog |
| ----------- | -------- |------------------ |  ---------- | --------|
| Nginx | Yes | Yes | Yes | No |
| Apache HTTP Server | Yes | Yes | Yes |No |
| JSON | Yes | Yes | Yes | Yes |
| Single-line Text | Yes            | Yes | Yes | Yes |
| Multi-line Text | Yes | Yes | Yes | No | 
| Multi-line Text (Spring Boot) | Yes | Yes | Yes | No |
| Syslog RFC5424/RFC3164 | No | No | No | Yes |
| Syslog Custom | No | No | No | Yes |