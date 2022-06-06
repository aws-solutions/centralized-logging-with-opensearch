The Log Hub solution provides comprehensive log management and analysis functions to help customers simplify the build of log analytics pipelines and gain insights into their business in minutes. Built on top of Amazon OpenSearch Service, the solution allows customers to streamline effectively log ingestion, log processing, and log visualization, thus eliminating the underling technical complexity. The solution also delivers end-to-end customer experience on a single web console.

This solution has the following benefits:

- All-in-one log ingestion: Provides a single web console to ingest both application logs and AWS service logs. The solution comes with built-in log ingestion support for AWS services, for example, Amazon S3, Amazon CloudFront, Amazon CloudTrail, Amazon RDS, AWS WAF, and Elastic Load Balancer. It reads logs from the default log output locations, buffers, parses and ingests them into the OpenSearch cluster. Besides, Log Hub supports log ingestion from commonly used software like Nginx, Apache HTTP Server, or custom applications by automating the log agent installation, monitoring and configuration update.

- Codeless log processors: Provides both log processor plugins developed by AWS and those verified by AWS, which allow customers to filter, enrich and transform the raw log data through a few clicks on the web console. In this way, data engineers do not need to spend much time on log data preparation before ingesting it into the search engine.

- Out-of-box dashboard templates: Offers a collection of reference designs of Kibana templates, for both commonly used software such as Nginx, Apache HTTP Server, Microsoft IIS, MySQL, Apache Kafka, and AWS services such as Amazon S3, Amazon CloudFront, AWS Lambda, and Amazon CloudTrail. The visualization templates help customers to insert build-in sample dashboards into the Amazon OpenSearch Service (AOS) domains on the web console, and the reference dashboards can further facilitate the creation of customized dashboards.

This implementation guide describes architectural considerations and configuration steps for deploying the Log Hub solution in the AWS cloud. It includes links to [CloudFormation][cloudformation] templates that launches and configures the AWS services required to deploy this solution using AWS best practices for security and availability.

The guide is intended for IT architects, developers, DevOps, data engineers with practical experience architecting in the AWS Cloud.

[cloudformation]: https://aws.amazon.com/en/cloudformation/