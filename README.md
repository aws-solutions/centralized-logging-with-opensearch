**Important: This AWS Solution will retire in December 2026. We encourage customers to explore using [Amazon
CloudWatch's new unified data management and analytics capabilities](https://aws.amazon.com/blogs/aws/amazon-cloudwatch-introduces-unified-data-management-and-analytics-for-operations-security-and-compliance/). Learn more about [AWS CloudWatch unified data and telemetry](https://aws.amazon.com/cloudwatch/features/unified-data-and-telemetry/) and give it a try in the [AWS CloudWatch console](https://console.aws.amazon.com/cloudwatch/).**

# Centralized Logging with OpenSearch

The Centralized Logging with OpenSearch solution provides comprehensive log management and analysis functions to help you simplify the build of log analytics pipelines. Built on top of <strong><a href="https://aws.amazon.com/opensearch-service/">Amazon OpenSearch Service</a></strong>, the solution allows you to streamline log ingestion, log processing, and log visualization. You can leverage the solution in multiple use cases, such as to abide by security and compliance regulations, achieve refined business operations, and enhance IT troubleshooting and maintenance.

## Table of content

- [Centralized Logging with OpenSearch](#centralized-logging-with-opensearch)
  - [Table of content](#table-of-content)
  - [Solution Overview](#solution-overview)
  - [Architecture](#architecture)
  - [Deployment](#deployment)
  - [Customization](#customization)


## Solution Overview

The solution has the following features:

- **All-in-one log ingestion**: provides a single web console to ingest both application logs and AWS service logs into the Amazon OpenSearch (AOS) domains.

- **Codeless log processor**: supports log processor plugins developed by AWS. You are allowed to enrich the raw log data through a few clicks on the web console.

- **Out-of-box dashboard template**: offers a collection of reference designs of visualization templates, for both commonly used software such as Nginx and Apache HTTP Server, and AWS services such as Amazon S3 and Amazon CloudTrail.



## Architecture

Deploying this solution with the default parameters builds the following environment in the AWS Cloud. For more details about the architecture description, please refer to [architecture overview](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/architecture-overview.html), and [architecture details](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/architecture-details.html).

![Architecture](arch.png)


## Deployment

Please follow the [Implementation Guide](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/) to deploy the solution in your AWS account.


## Customization

Please follow the [Customization Guide](CUSTOM_BUILD.md) for custom build.


## Data Collection

This solution sends operational metrics to AWS (the “Data”) about the use of this solution. We use this Data to better understand how customers use this solution and related services and products. AWS’s collection of this Data is subject to the [AWS Privacy Notice](https://aws.amazon.com/privacy/).
