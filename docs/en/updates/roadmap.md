# Roadmap
!!! note "Note"

    Feature request and bug report is welcome, please submit your requset via [GitHub Issues](https://github.com/awslabs/log-hub/issues).

## v0.1.0, 12/31/2021

| Category          | Feature                                               | Description                                                  |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Domain Management | Import/Remove AOS domain                              | Import or remove an AOS domain within VPC into the Log Hub solution through the web console. |
| Domain Management | Public access proxy                                   | Automatically create an Nginx-based proxy that allows the customers to access the AOS dashboards through the Internet. |
| Domain Management | Recommended alarms                                    | Create the [recommended AOS alarms](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html) and send notifications to customers through SNS. |
| AWS Service Log   | CloudTrail log template                               | (1) Support automatic CloudTrail log ingestion <br />(2) One-click to create a dashboard for CloudTrail using templates. |
| AWS Service Log   | Amazon S3 access log template       | (1) Support automatic S3 log ingestion from the a selected S3 location. <br />(2) One-click to create a dashboard for S3 access log. |
| AWS Service Log   | Lifecycle Management                                  | Automate log lifecycle using [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) Support UltraWarm and Cold Storage. |
| AWS Service Log | Amazon RDS MySQL/Aurora Slow query log         | (1) Support automatic RDS/Aurora MySQL log ingestion <br />(2) One-click to create the dashboard using template. |
| AWS Service Log | Amazon RDS MySQL/Aurora Error log              | (1) Support automatic RDS/Aurora MySQL log ingestion<br />(2) One-click to create the dashboard using template. |
| AWS Service Log  | Amazon CloudFront standard access log template | (1) Support automatic log ingestion.<br />(2) One-click to create the dashboard using template. |
| Application Log | Instance Group                               | Create a group of instance to apply the same log configuration. |
| Application Log | Log Config                                   | Create a log agent configuration (e.g. log type, log file path) that applies to a certain version of log agent. |
| Application Log | Log pipeline                                 | Create a log pipeline (on top of Amazon Kinesis Data Streams) which allows the log agent to collect and send logs. |
| Application Log | JSON format log ingestion                    | Build an end-to-end pipeline to ingest JSON format log data. |
| Deployment        | Web console CDK/CloudFormation deployment             | Deploy the solution via AWS CDK or Amazon CloudFormation. It will provision a stack with a build-in Log Hub web console. |
| Deployment        | Standalone log pipeline CDK/CloudFormation deployment | Deploy a single log pipeline via AWS CDK or Amazon CloudFormation. All supported log type can be deployed as a standalone stack. |
| Workshop | Data insights workshop | Demonstrate how to use Log Hub to build a centralized logging platform to explore the data insights. |

## v0.2.0, 3/15/2022

| Category                | Feature                                      | Description                                                  |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| AWS Service Log         | ELB log template                             | Application Load Balancer access log ingestion and visualization.                  |
| AWS Service Log         | WAF Log template                             | WAF ingestion and visualization.                  |
| Application Log         | RegEx single-line text log template             | Support Parse and ingest logs using FluentBit Regular Expression in single-line text format . |
| Application Log         | RegEx multi-line text custom log template       | Support Parse and ingest logs using FluentBit Regular Expression in multi-line text format. |
| Application Log         | RegEx Java - Spring Boot log template           | Support Parse and ingest logs using FluentBit Regular Expression in Spring Boot log format. |
| Application Log         | Nginx Log template                           | Support ingest Nginx format log and create visualization dashboard. |
| Application Log         | Apache HTTP Server template                  | Support ingest Apache HTTP Server format log and create dashboard. |
| Codeless Log Processors | IP2Location Converter                        | A plugin to convert the IP address to location information.  |
| Web Console             | Zh-CN                                | Add Simplified Chinese user interface.                       |
| Web Console             | OpenID Connect (OIDC) authentication | Expand the authentication for OIDC to support China regions deployment. |

## v1.0.0 (MVP), 5/31/2022

| Category        | Feature                                    | Description                                                  |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ |
| Application Log | Ingest logs from S3 bucket | Allows ingest JSON/Single-line Text format logs from a S3 bucket. |
| Codeless Log Processors | User Agent to Device Info | A plugin to convert User-Agent filed to device information.  |
| Application Log         | EKS Pod log ingestion | Wizard to ingest logs from EKS clusters.  |

## v1.1.0, Q3/2022

| Category                | Feature                                    | Description                                                  |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| AWS Service Log         | AWS Config log template                    | [AWS Config](https://aws.amazon.com/config/) log ingestion and visualization. |
| AWS Service Log         | VPC Flow Logs template                     | [VPC Flows Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) log ingestion and visualization. |
| AWS Service Log         | Cross-region/account region support         | Add support for cross-region/account service log ingestion.                 |
| Application Log         | Cross-region/account support               | Add support for cross-region/account application log ingestion.                 |
| Codeless Log Processors | Data Prepper integration                   | Allows customers to import existing [Data Prepper](https://github.com/opensearch-project/data-prepper) domain and use the build-in processors to process logs. This depends on whether Data Prepper supports log processing. |


## v1.2.0, Q4/2022

| Category                | Feature                    | Description                                                  |
| ----------------------- | -------------------------- | ------------------------------------------------------------ |
| Codeless Log Processors | Log preview                                | Allows customers to preview log on the Log Hub console.      |
| Codeless Log Processors | Embedded plugin code editor | Allows customers to write plugin code in Python directly in Log Hub console. |
| Console                 | Resource viewer                            | Add resource list in the Log Pipeline detail.                |

