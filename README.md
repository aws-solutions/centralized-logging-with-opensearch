<p align="center">
  <strong>
    Log Hub - Build log analytics platform in 20 minutes
  </strong>
</p>
<p align="center">
Easily ingest, process and visualize application logs and AWS service logs on top of <strong><a href="https://aws.amazon.com/opensearch-service/">Amazon OpenSearch Service</a></strong>
</p>

<p align="center">
  <a href="https://awslabs.github.io/log-hub/">
    <img src="https://raw.githubusercontent.com/awslabs/log-hub/main/Home.png" width="700" />
  </a>
</p>

<p align="center">
  <em>
    Getting Started – 
    <a href="https://awslabs.github.io/log-hub/">awslabs.github.io/log-hub</a>.
  </em>
</p>

## Features

### All-in-one log ingestion
Provides a single web console to ingest both application logs and AWS service logs. The solution comes with built-in 
log ingestion support for AWS services, for example, Amazon S3, Amazon CloudFront, Amazon CloudTrail, Amazon RDS, 
AWS WAF, and Elastic Load Balancer. It reads logs from the default log output locations, buffers, parses and ingests 
them into the OpenSearch cluster. Besides, Log Hub supports log ingestion from commonly used software like Nginx, 
Apache HTTP Server, or custom applications by automating the log agent installation, monitoring and configuration update.

### Codeless log processors
Provides both log processor plugins developed by AWS and those verified by AWS, which allow customers to filter, 
enrich and transform the raw log data through a few clicks on the web console. In this way, data engineers do not 
need to spend much time on log data preparation before ingesting it into the search engine.

### Out-of-box dashboard templates
Offers a collection of reference designs of Kibana templates, for both commonly used software such as Nginx, Apache 
HTTP Server, Spring Boot, and AWS services such as Amazon S3, Amazon CloudFront, AWS WAF, and Amazon CloudTrail. The 
visualization templates help customers to insert built-in sample dashboards into the Amazon OpenSearch Service (AOS) 
domains on the web console, and the reference dashboards can further facilitate the creation of customized dashboards.

## Quick start

[Deployment Guide](https://awslabs.github.io/log-hub/en/implementation-guide/deployment/)

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
