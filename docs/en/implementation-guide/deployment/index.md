# Overview

Before you launch the solution, review the architecture, supported regions, and other considerations discussed in this 
guide. Follow the step-by-step instructions in this section to configure and deploy the solution into your account.

## Prerequisites

Review all the [considerations](../considerations.md) and make sure you have the following in the target region you want to deploy the solution:

- At least one vacancy to create new VPCs, if you choose to launch with new VPC.
- At least two Elastic IP (EIP) addresses, if you choose to launch with new VPC.
- At least eight S3 buckets.

## Deployment in AWS Standard Regions

Log Hub provides two ways to authenticate and log into the Log Hub console. For some AWS regions where Cognito User Pool is not available (for example, Hong Kong), you need to launch the solution with OpenID Connect provider. 

* [Launch with Cognito User Pool](./with-cognito.md)
* [Launch with OpenID Connect](./with-oidc.md)

For more information about supported regions, see [Regional deployments](../considerations.md).

## Deployment in AWS China Regions

AWS China Regions do not have Cognito User Pool. You need to launch the solution with OpenID Connect.

* [Launch with OpenID Connect](./with-oidc.md)
