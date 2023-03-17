The Centralized Logging with OpenSearch solution provides comprehensive log management and analysis functions to help you simplify the build of log analytics pipelines. Built on top of Amazon OpenSearch Service, the solution allows you to streamline log ingestion, log processing, and log visualization. You can leverage the solution in multiple use cases such as to abide by security and compliance regulations, achieve refined business operations, and enhance IT troubleshooting and maintenance.

The solution has the following features:

- **All-in-one log ingestion**: provides a single web console to ingest both application logs and AWS service logs into the Amazon OpenSearch Service domains. For supported AWS service logs, refer to [AWS Service Logs](implementation-guide/aws-services/index.md). For supported application logs, refer to [Application Logs](implementation-guide/applications/index.md).

- **Codeless log processor**: supports log processor plugins developed by AWS. You are allowed to enrich the raw log data through a few steps on the web console.

- **Out-of-the-box dashboard template**: offers a collection of reference designs of visualization templates, for both commonly used software such as Nginx and Apache HTTP Server, and AWS services such as Amazon S3 and Amazon CloudTrail.

This guide includes a [getting started](implementation-guide/getting-started/index.md) chapter to walk you through the process of building log analytics pipelines, and a [domain management](implementation-guide/domains/index.md) chapter to introduce how to import Amazon OpenSearch Service domains on the Centralized Logging with OpenSearch web console.

This implementation guide describes architectural considerations and configuration steps for deploying the Centralized Logging with OpenSearch solution in the AWS cloud. It includes links to [CloudFormation][cloudformation] templates that launches and configures the AWS services required to deploy this solution using AWS best practices for security and availability.

The guide is intended for IT architects, developers, DevOps, data engineers with practical experience architecting on the AWS Cloud.

[cloudformation]: https://aws.amazon.com/en/cloudformation/