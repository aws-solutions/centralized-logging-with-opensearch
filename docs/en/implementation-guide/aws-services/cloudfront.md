# Amazon CloudFront Logs
[CloudFront standard logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) provide detailed records about every request made to a distribution.

## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudFront logging bucket must be the same region as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon CloudFront**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **CloudFront logs enabling**. The automatic mode will detect the CloudFront log location automatically.
    - For **Automatic mode**, choose the CloudFront distribution and Log Type from the dropdown lists.
      * For Standard Log, the solution will automatically detect the log location  if logging is enabled.
      * For Real-time log, the solution will prompt you for confirmation to create or replace CloudFront real-time log configuration.
    - For **Manual mode**, enter the **CloudFront Distribution ID** and **CloudFront Standard Log location**. (Note that CloudFront real-time log is not supported in Manual mode)
    - (Optional) If you are ingesting CloudFront logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
1. Choose **Next**.
2. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
3. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated Amazon OpenSearch Service dashboard.
4.  You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is the CloudFront distribution ID.
5.  In the **Log Lifecycle** section, input the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
6.  Choose **Next**.
7.  Add tags if needed.
8.  Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudFront Standard Log Ingestion* template in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |

{%
include-markdown "include-cfn-plugins-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![cloudfront-db]][cloudfront-db]


[cloudfront-db]: ../../images/dashboards/cloudfront-db.png