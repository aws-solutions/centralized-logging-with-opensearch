The solution consists of the following components:

## Domain Management

This solution uses Amazon OpenSearch Service as the underlying engine to store and analyze logs. You can import an existing Amazon OpenSearch Service domain for log ingestion, and provide an access proxy to the Amazon OpenSearch Service dashboards within VPC. Moreover, you can set up recommended Amazon CloudWatch alarms for Amazon OpenSearch Service.

## Analytics Pipelines

A log pipeline includes a series of log processing steps, including collecting logs from sources, processing and sending them to Amazon OpenSearch Service for further analysis. Centralized Logging with OpenSearch supports AWS Service log ingestion and server-side application log ingestion.

### Service Log Pipeline

This solution supports out of the box log analysis for AWS service logs, such as Amazon S3 access logs, and ELB access logs. The component is designed to reduce the complexities of building log analytics pipelines for different AWS services with different formats. 

### Application Log Pipeline

This solution supports out of the box log analysis for application logs, such as Nginx/Apache logs or general application logs via regex parser. The component uses [Fluent Bit](https://fluentbit.io/) as the underlying log agent to collect logs from application servers, and allows you to easily install log agent and monitor the agent health via System Manager.
