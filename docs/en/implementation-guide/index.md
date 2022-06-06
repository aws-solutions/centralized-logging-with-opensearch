# Analytics Pipelines
Log Hub supports server-side application log ingestion and AWS Service log ingestion. 

## Supported AWS Services
The following table lists the supported AWS services and the correspondence features.

| AWS Service | Log Type | Log Location | Automatic Ingestion | Build-in Dashboard |
| ----------- | -------- |------------------ |  ---------- |  ---------- |
| Amazon CloudTrail | Standard | S3 | Yes | Yes |
| Amazon S3 | Access log | S3 | Yes | Yes |
| Amazon RDS/Aurora | Slow query log | CloudWatch Logs | Yes | Yes |
| Amazon RDS/Aurora | Error log | CloudWatch Logs | Yes | Yes |
| Amazon CloudFront | Standard access log | S3 | Yes | Yes |
| Application Load Balancer | Access log | S3 | Yes | Yes |
| AWS WAF | Standard log | S3 | Yes | Yes |
| AWS Lambda | Standard | CloudWatch Logs | Yes | No |

* **Automatic Ingestion**. Automatic ingestion means Log Hub will detect the log location of the resource automatically and then read the log. 
* **Templated Dashboard**. An out-of-box dashboard for the specified AWS service. The Log Hub solution will automatically
  ingest a dashboard into the AOS.