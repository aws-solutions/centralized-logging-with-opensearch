# Upgrade Log Hub

**Time to upgrade**: Approximately 20 minutes

## Upgrade Overview

Use the following steps to upgrade the solution on AWS console. 

* [Step 1. Update the CloudFormation Stack](#step-1-update-the-cloudformation-stack)
* [Step 2. Trigger Lambda to refresh web config](#step-2-generate-new-web-console-configuration-file)
* [Step 3. Create an invalidation on CloudFront](#step-3-create-an-invalidation-on-cloudfront)
* [Step 4. Refresh the web console](#step-4-refresh-the-web-console)

## Step 1. Update the CloudFormation stack

1. Go to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.

2. Select the Log Hub main stack, and click the **Update** button.

3. Choose **Replace current template**, and enter the specific **Amazon S3 URL** according to your initial deployment type. Refer to [Deployment Overview](./deployment/index.md) for more details.

    | Type                                         | Link                                                         |
    | -------------------------------------------- | ------------------------------------------------------------ |
    | Launch with Cogito User Pool & New VPC       | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHub.template` |
    | Launch with Cognito User Pool & Existing VPC | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubFromExistingVPC.template` |
    | Launch with OpenID Connect & New VPC         | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubWithOIDC.template` |
    | Launch with OpenID Connect & Existing VPC    | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubFromExistingVPCWithOIDC.template` |

7. Under **Parameters**, review the parameters for the template and modify them as necessary.

8. Choose **Next**.

9. On **Configure stack options** page, choose **Next**.

10. On **Review** page, review and confirm the settings. Check the box **I acknowledge that AWS CloudFormation might create IAM resources**.

11. Choose **Update stack** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **UPDATE_COMPLETE** status in approximately 15 minutes.

## Step 2. Create an invalidation on CloudFront

CloudFront has cached an old version of Log Hub console at its pop locations. We need to create an invalidation on the CloudFront console to 
force the deletion of cache. You must do this after thew console configuration file being generated.

1. Go to the [AWS CloudFront console](https://console.aws.amazon.com/cloudfront/){target='_blank'}.

2. Choose the Distribution of Log Hub. The Description is like `SolutionName - Web Console Distribution (RegionName)`.

3. On the **Invalidation** page, click **Create invalidation**, and create an invalidation with `/*`.

## Step 3. Refresh the web console

Now you have completed all the upgrade steps. Please click the **refresh** button in your browser. You can check the new version number in the bottom right corner of the Log Hub console.


## Upgrade Notice

### Application Logs from EC2
Log Hub has an updated IAM policy after v1.1.0. If you have created an [Application Log Pipeline](applications/create-applog-pipeline.md) 
in Log Hub V1.0.X, and want to create a new Application Log Ingestion in v1.1.0 or later versions, you will receive an upgrade notice popup:

![app-pipeline-upgrade-v1.0](../images/app-log/app-pipline-upgrade-v1.0.png)

Click the **Upgrade** button to upgrade your Application Log Pipeline to the current version, 
This upgrade will not affect your existing log ingestion which were created in Log Hub V1.0.X.
However, please make sure you have updated IAM Policy to the EC2 instance profile before [creating a new ingestion](applications/nginx.md#step-2-create-an-application-log-ingestion).

### Application Logs from EKS
Log Hub has updated the default [architecture](./architecture.md#logs-from-eks) for ingesting application logs from EKS.
In Log Hub V1.1.0 or later version, by default, Log Hub ingests EKS pod logs directly into Amazon OpenSearch. This upgrade will not affect your existing log ingestion created in Log Hub V1.0.x. 

For example, if you have log ingestion created in Log Hub V1.0.x, and have created a new log ingestion in Log Hub V1.1.0.
Log Hub will send the logs ingested in V1.0.x to OpenSearch through Amazon Kinesis Data Stream, and send the logs ingested in V1.1.0 to OpenSearch directly.