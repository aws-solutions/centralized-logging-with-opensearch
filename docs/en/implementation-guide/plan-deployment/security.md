# Security

When you build systems on AWS infrastructure, security responsibilities are shared between you and AWS. This [shared responsibility model](https://aws.amazon.com/compliance/shared-responsibility-model/)
reduces your operational burden because AWS operates, manages, and controls the components including the host
operating system, the virtualization layer, and the physical security of the facilities in which the services operate.
For more information about AWS security, see [AWS Cloud Security](http://aws.amazon.com/security/).

## IAM Roles

AWS Identity and Access Management (IAM) roles allow customers to assign granular access policies and permissions
to services and users on the AWS Cloud. This solution creates IAM roles that grant the solution’s AWS Lambda functions,
AWS AppSync and Amazon Cognito access to create regional resources.

## Security Groups

The security groups created in this solution are designed to control and isolate network traffic between the solution
components. We recommend that you review the security groups and further restrict access as needed once the deployment
is up and running.

## Amazon CloudFront

This solution deploys a web console hosted in an Amazon Simple Storage Service (Amazon S3) bucket. To help reduce
latency and improve security, this solution includes an Amazon CloudFront distribution with an origin access identity,
which is a CloudFront user that provides public access to the solution’s website bucket contents.
For more information, refer to [Restricting Access to Amazon S3 Content by Using an Origin Access Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) in the
Amazon CloudFront Developer Guide.

## Amazon EC2

This solution creates a [Nginx based proxy](../getting-started/2.create-proxy.md), which will allow you to access the OpenSearch provisioned
within VPC environment. The Nginx is hosted using EC2 instances. We recommend you to use [AWS Systems Manager Patch Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html) to
patch the instances periodically. Patch Manager is a capability of AWS Systems Manager that automates the process of
patching managed nodes with updates. You can choose to show only a report of missing patches (a Scan operation),
or to automatically install all patches which are missing (a Scan and install operation).


