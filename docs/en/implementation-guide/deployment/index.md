# Overview

Before you launch the solution, review the architecture, supported regions, and other considerations discussed in this 
guide. Follow the step-by-step instructions in this section to configure and deploy the solution into your account.

## Prerequisites

Make sure you have the following in the target region you want to deploy the solution:

- At least one vacancy to create new VPCs, if you choose to launch with new VPC.
- At least two Elastic IP (EIP) addresses, if you choose to launch with new VPC.
- At least eight S3 buckets.
- Review all the [considerations](../considerations.md).

## Deploy in AWS Standard Regions

Log Hub provides two ways to authenticate and log into the Log Hub console. There are some AWS regions where Cognito User Pool
is missing (e.g., Hong Kong). In those regions, you need to follow the instruction to launch the solution with OpenID Connect provider. 
For more information about supported regions, see [Regional deployments](../considerations.md).

* [Launch with Cognito User Pool](./with-cognito.md)
* [Launch with OpenID Connect](./with-oidc.md)

## Deploy in AWS China Regions

AWS China regions do not have Cognito User Pool, please follow the instruction below to deploy the solution in China regions.

* [Launch with OpenID Connect](./with-oidc.md)
