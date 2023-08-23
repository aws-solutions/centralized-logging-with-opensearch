The following AWS services are included in this solution:

| AWS service                                                                                       | Description                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Amazon CloudFront](https://aws.amazon.com/cloudfront)                                            | To distribute the frontend web UI assets.                                                         |
| [Amazon S3](http://aws.amazon.com/s3/)                                                            | To store the static web assets (frontend user interface), and also uses it as a data buffer for log shipping.                                           |
| [Amazon Cognito](https://aws.amazon.com/cognito)                                        | To authenticate users (in AWS Regions).                                                                                                                           |
| [AWS AppSync](https://aws.amazon.com/appsync)                                                     | To provide the backend GraphQL APIs.                                                                                                                       |
| [Amazon DynamoDB](https://aws.amazon.com/dynamodb)                                                | To store the solution related information as backend database.                                                                                             |
| [AWS Lambda](https://aws.amazon.com/lambda)                                                       | To interact with other AWS Services to process core logic of managing log pipelines or log agents, and obtain information updated in DynamoDB tables.     |
| [AWS Step Functions](https://aws.amazon.com/step-functions)                                       | To orchestrate on-demand AWS CloudFormation deployment of a set of predefined stacks for log pipeline management. |
| [AWS CloudFormation](https://aws.amazon.com/cloudformation)                                       | To provision the AWS resources for the modules of pipelines and the solution web console.                                                |
| [AWS Systems Manager](https://aws.amazon.com/systems-manager)                                     | To manage log agents for collecting logs from application servers, such as installing log agents (Fluent Bit) for application servers.                      |
| [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/)   | To subscribe to logs from a CloudWatch Log Group or as a data buffer for log shipping, and then initiate the Log Processor Lambda to run.        |
| [Amazon Kinesis Data Firehose](https://aws.amazon.com/kinesis/data-firehose/) | To subscribe the logs from CloudWatch Log Group and then put logs into Amazon S3.                                                                   |
| [Amazon SQS](https://aws.amazon.com/sqs)                   | To receive Amazon S3 Event Notifications and then initiate the Log Processor Lambda to run.                                                                |


