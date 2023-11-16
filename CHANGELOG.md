# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2023-11-15

### Added

- Added Light Engine to provide an Athena-based serverless and cost-effective log analytics engine to analyze infrequent access logs
- Added OpenSearch Ingestion to provide more log processing capabilities, with which OSI can provision compute resource OpenSearch Compute Units (OCU) and pay per ingestion capacity
- Supported parsing logs in nested JSON format
- Supported CloudTrail logs ingestion from the specified bucket manually

### Fixed

- Fixed the issue that the solution cannot list instances when creating instance groups #214
- Fixed the issue that EC2 instances launched by the Auto Scaling group failed to pass the health check #202

## [2.0.1] - 2023-09-27

### Fixed

- Automatically adjust log processor lambda request's body size based on Amazon OpenSearch Service data nodes instance type #119
- When creating Application log pipeline and selecting Nginx, default sample dashboard option to be "Yes" #192
- Monitoring page cannot show metrics when there is only one dot
- The time of the data point of the monitoring metrics does not match the time of the abscissa

## [2.0.0] - 2023-08-22

### Added

- Log ingestion from S3 bucket to support more log sources #89
- Show logs and metrics of the log analytics pipelines #112
- Quickly enable alarms on log ingestion pipeline #113
- Show the AWS resource changes when importing AOS using automatic networking mode #53
- Log Agent Installation: Support of agent installation on AL2023 instances #88
- Support of multi-AZ standby enabled OpenSearch cluster when creating log pipelines #170
- Instance Group: Show error message on the console when the installation of log agent fails #169
- Support same index name in different OpenSearch clusters #166
- Installation: refresh the aws-exports.json once update the CloudFormation input parameters #161
- Application log pipeline: Add a step to choose Log Config during the application pipeline creation steps #159
- Log Agent: Auto rotation of Fluent Bit log file #158
- Instance group: Add an option to attach IAM policies to Instance Group managed EC2 instances automatically #151
- Domain management: Check the prerequisites of OpenSearch clusters before import OpenSearch clusters #148
- Support ingest WAF (associate with CloudFront) sampled logs to OpenSearch in other regions except us-east-1 #129

### Fixed

- Log Config: Time key in Fluent Bit config for Spring Boot should be time type instead of None #71
- EventBridge will be disabled automatically if deleting instances in instance group #64
- Log Config should not be created without Regex/Log Format #163
- Lack of region check before creating WAF log pipeline #162
- The Fluent bit configuration file generated in sidecar deployment option has a wrong shared volume #160
- S3 access log dashboard: 5xx Code description is covered #157
- S3 access log dashboard: The Average Time Unit should be milliseconds #155
- Cross-account: Unable to get instance list and create instance group in CN region #156
- The OpenSearch information (e.g., version, data nodes) is not updated automatically after customer upgraded the cluster #150
- Cannot differentiate the Lambda for different AWS Service log pipeline based on Lambda description #146
- Fix data lost when cannot find the location with IP address using MaxMind database #126
- Syslog: Fix port conflict when adding & deleting new log source in parallel #174

### Changed

- Minimize the permissions of EC2 log ingestion IAM role #154
- Minimize the privileges of cross-account access role #153
- Soft delete when removing OpenSearch domain #152
- Save ALB access logs of Nginx based proxy to S3 bucket #149
- Code refactor: DynamoDB design optimization and GraphQL API design optimization #147
- Minimize security group egress of the provisioned ECS #145
- WAF dashboard: Cannot filter results using `nonTerminatingMatchingRules.action` field #144

### Removed

- Domain management: Remove the support of Elasticsearch engine #176

## [1.0.3] - 2023-06-27

### Fixed

- Fix the processor Lambda function urllib3 version issue #138

## [1.0.2] - 2023-06-21

### Fixed

- Support generation of Kubernetes YAML configuration file for EKS 1.24~1.27 #133

## [1.0.1] - 2023-04-17

### Fixed

- Fix deployment failure due to S3 ACL changes

## [1.0.0] - 2023-03-16

### Added

- All files, initial version
