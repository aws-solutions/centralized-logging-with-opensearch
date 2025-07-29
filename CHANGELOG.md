# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] - 2025-07-29

### Security

- Updated form-data package to address [CVE-2025-7783](https://avd.aquasec.com/nvd/2025/cve-2025-7783/)
- Updated urllib3 package to address [CVE-2025-50182](https://avd.aquasec.com/nvd/2025/cve-2025-50182/)
- Updated requests package to address [CVE-2024-47081](https://avd.aquasec.com/nvd/2024/cve-2024-47081/)

## [2.4.0] - 2025-05-22

### Added

- Anonymized operational metrics collection

### Changed

- Added input validation to ensure Light Engine table name only contains alphanumeric characters, hyphens, and underscores
- Renamed PostgreSQL log field `duration` to `query_time` for consistency with existing MySQL log format

### Fixed

- Issue where domains would display inconsistent metric values. [Issue #277](https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/277)
- Enhanced OpenSearch API retry mechanism in Log processor Lambda to handle IAM role propagation delays

### Security

- Updated setuptools package to address [CVE-2025-47273](https://avd.aquasec.com/nvd/2025/cve-2025-47273/)

## [2.3.3] - 2025-04-30

### Changed

- Cognito user invitation email template

### Fixed

- NGINX service startup issue and optimized health check settings for OpenSearch Access Proxy instances
- OpenSearch bulk loading to split large payloads into smaller batches to comply with OpenSearch's HTTP request size limits
- PostgreSQL log ingestion parser to parse duration and log message into separate fields

### Security

- Updated http-proxy-middleware to version 2.0.9
- Updated AWS CDK packages to latest versions

## [2.3.2] - 2025-03-14

### Fixed

- Fixed an issue where Lambda Elastic Network Interface resources were not being properly cleaned up during CloudFormation stack deletion

### Security

- Updated axios package to address [CVE-2025-27152](https://avd.aquasec.com/nvd/2025/cve-2025-27152/)
- Updated Jinja2 package to address [CVE-2025-27516](https://avd.aquasec.com/nvd/2025/cve-2025-27516/)
- Updated prismjs package to address [CVE-2024-53382](https://avd.aquasec.com/nvd/2024/cve-2024-53382/)
- Updated Babel packages to address [CVE-2025-27789](https://avd.aquasec.com/nvd/2025/cve-2025-27789/)

## [2.3.1] - 2025-02-24

### Changed

- Migrated to Poetry for Python dependency management

### Fixed

- Fixed S3 permission issue when creating cross-account Lambda log ingestion pipeline [Issue #312](https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/312)
- Fixed STS credential expiration handling when ingesting logs from cross-account sources
- Fixed Opensearch index rollover timeout issue

### Security

- Updated serialize-javascript package to address [CVE-2024-11831](https://avd.aquasec.com/nvd/2024/cve-2024-11831/)
- Updated cryptography package to address [CVE-2024-12797](https://avd.aquasec.com/nvd/2024/cve-2024-12797/)

## [2.3.0] - 2024-12-11

### Added

- Add the architecture diagram of sampled WAF logs when creating WAF log pipeline. #132
- Add the support of ingesting Aurora/RDS PostgreSQL logs. #122

### Changed

- Replace Amazon SQS with Amazon EventBridge to mitigate the Amazon S3 Event Notifications creation failure. #12
- Redesigned the log ingestion workflow to ingest logs from RDS without the dependency of CloudWatch Logs. #102
- Reordered pipeline creation workflow: log type and analytics engine selection now occur first for AWS service log pipelines. #309

### Fixed

- Fix the sampling rate validation issue to allow only positive integers when creating CloudFront real-time logs. #302
- Fix the issue that the pipeline cannot be created due to a lack of "iam:TagRole" permission in some AWS Accounts. #279
- Fix the issue that the content of Log Config detail may exceed the maximum length of the window. #275
- Fix the issue that the EKS DaemonSet Guide is not refreshed after editing the log config. #241
- Fix the user interface issue that a wrong S3 bucket prefix is using when creating WAF log pipeline if the logging has already been enabled. #67

## [2.2.2] - 2024-08-23

### Changed

- Support editing the auto-generated Regular Expression of Nginx and Apache log in the Log Config. #301
- Adjusted the error logs from info level to error level in the log-processor function. #305

### Fixed

- Fixed failed to retrieve instance status due to too many instances in the Instance Group details page. #298
- Remove the redundant sign in alert dialog modal when user session expired. #303
- Fixed the Grafana url validation failed with spaces when import a Grafana Server. #304

## [2.2.1] - 2024-07-02

### Added

- Optimise list instance performance.

### Fixed

- Fixed an issue that lost time key when edit JSON config. #296
- Fixed an issue that upgrade to v2.2.0 failed because of the lack of permission of cmk. #297

## [2.2.0] - 2024-06-20

### Added

- Added support to install, configure, and monitor the Fluent Bit agent on Windows Server 2016/2019/2022 Instances. #76
- Added a log visualization template for Windows IIS (W3C Format) logs. #212
- Added a default tag "CLOSolutionCostAnalysis" to all resources created by the solution. #285
- Add support for tag propagation for resources when creating log pipelines, allowing customers to view all resources and associated costs at the pipeline level. #232
- Added support for ingesting and analyzing data in a specified S3 location using Light Engine. #233
- Added support for importing OpenSearch clusters with custom KMS encryption enabled. #172
- Added support for ingesting and analyzing AWS CloudTrail logs using Light Engine. #234
- Added support for ingesting and analyzing Syslog data using Light Engine. #235
- Added support for using Unix epoch time format as the time key in Log Config. #198
- Added support for Asia Pacific (Hyderabad), Asia Pacific (Jakarta), Asia Pacific (Melbourne), Israel (Tel Aviv), Canada (Calgary), Europe (Spain), Europe(Zurich), Middle East (UAE) regions. #230

### Fixed

- Fixed an issue where creating a pipeline failed when Lambda reached concurrency limits. #141
- Fixed a bug where the system could not read properties of undefined ('accountId') when the Next button was clicked without selecting an Instance Group. #236
- Fixed an issue where logs were not received when using the solution-provisioned staging bucket in Light Engine. #237
- Fixed a permissions issue in the LogMerger State Machine within Light Engine: The S3ObjectMigration Lambda failed due to insufficient KMS permissions on the analytics S3 bucket. #272
- Fixed a bug that the maximum number of distributions that can be displayed is 100 when creating pipeline. #278
- Fixed a bug that prevented instances from being listed when switching accounts on the Instance Group list page. #291
- Fixed a bug where creating a Log Conf with JSON type, if the field type select float, can not create the index template. #293

## [2.1.1] - 2023-12-05

### Fixed

- Fixed the issue that Log ingestion error in light engine when not specified time key in the log config #220
- Fixed the issue that cannot deploy the Centralized Logging with OpenSearch solution in UAE region #221
- Fixed the issue that EC2 instances should not be added to the same Instance Group #128

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
