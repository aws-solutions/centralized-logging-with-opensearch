Deploying this solution with the default parameters builds the following environment in the AWS Cloud.

[![arch]][arch]
_Centralized Logging with OpenSearch architecture_

This solution deploys the AWS CloudFormation template in your AWS account and completes the following settings.

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) distributes the frontend web UI assets hosted in [Amazon S3](https://aws.amazon.com/s3/) bucket.

2. [Amazon Cognito user pool](https://aws.amazon.com/cognito) or OpenID Connector (OIDC) can be used for authentication.

3. [AWS AppSync](https://aws.amazon.com/appsync) provides the backend GraphQL APIs.

4. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) stores the solution related information as backend database.

5. [AWS Lambda](https://aws.amazon.com/lambda) interacts with other AWS Services to process core logic of managing log pipelines or log agents, and obtains information updated in DynamoDB tables.

6. [AWS Step Functions](https://aws.amazon.com/step-functions) orchestrates on-demand [AWS CloudFormation](https://aws.amazon.com/cloudformation) deployment of a set of predefined stacks for log pipeline management. The log pipeline stacks deploy separate AWS resources and are used to collect and process logs and ingest them into [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) for further analysis and visualization.

7. [Service Log Pipeline](#service-log-analytics-pipeline) or [Application Log Pipeline](#application-log-analytics-pipeline) are provisioned on demand via Centralized Logging with OpenSearch console.

8. [AWS Systems Manager](https://aws.amazon.com/systems-manager) and [Amazon EventBridge](https://aws.amazon.com/eventbridge) manage log agents for collecting logs from application servers, such as installing Fluent Bit log agents for application servers and monitoring the health status of the agents.

9. Fluent Bit installed on [Amazon EC2](https://aws.amazon.com/ec2/) or [Amazon EKS](https://aws.amazon.com/eks/), uploads log data to application log pipeline.

10. Application Log Pipelines read, parse, process application logs and ingest them into Amazon OpenSearch domains or Light Engine.

11. Service Log Pipelines read, parse, process AWS service logs and ingest them into Amazon OpenSearch domains or Light Engine.

!!! note "Note"
    After deploying the solution, you can use [AWS WAF](https://aws.amazon.com/waf/) to protect CloudFront or AppSync. Moreover, you can follow this [guide](https://docs.aws.amazon.com/appsync/latest/devguide/WAF-Integration.html) to configure your WAF settings to prevent GraphQL schema introspection.

This solution supports two types of log pipelines: **Service Log Analytics Pipeline** and **Application Log Analytics Pipeline**, and two log analytics engines: **OpenSearch Engine** and **Light Engine**. Architecture details for pipelines and Light Engine are described in:

- [Service Log Analytics Pipeline](../architecture-details/service-log-analytics-pipeline.md)
- [Application Log Analytics Pipeline](../architecture-details/application-log-analytics-pipeline.md)
- [Light Engine](../architecture-details/light-engine.md)


[s3log]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
[alblog]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
[s3]: https://aws.amazon.com/s3/
[s3-events]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
[cloudfront]: https://aws.amazon.com/cloudfront/
[cognito]: https://aws.amazon.com/cognito/
[appsync]: https://aws.amazon.com/appsync/
[lambda]: https://aws.amazon.com/lambda/
[dynamodb]: https://aws.amazon.com/dynamodb/
[systemsmanager]: https://aws.amazon.com/systemmanager/
[stepfunction]: https://aws.amazon.com/stepfunctions/
[kds]: https://aws.amazon.com/kinesis/data-streams/
[kdf]: https://aws.amazon.com/kinesis/data-firehose/
[arch]: ../../images/architecture/arch.png
[arch-service-pipeline-s3]: ../../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-s3-lightengine]: ../../images/architecture/logs-in-s3-light-engine.drawio.svg
[arch-service-pipeline-kdf-to-s3]: ../../images/architecture/service-pipeline-kdf-to-s3.svg
[arch-service-pipeline-cw]: ../../images/architecture/service-pipeline-cw.svg
[arch-service-pipeline-kds]: ../../images/architecture/service-pipeline-kds.svg
[arch-service-pipeline-cwl-to-kds]: ../../images/architecture/service-pipeline-cwl-to-kds.svg
[arch-app-log-pipeline]: ../../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-app-log-pipeline-lighengine]: ../../images/architecture/logs-from-amazon-ec2-eks-light-engine.drawio.png
[arch-syslog-pipeline]: ../../images/architecture/app-log-pipeline-syslog.svg
[arch-syslog-pipeline-lightengine]: ../../images/architecture/syslog_arch_light_engine.png
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
