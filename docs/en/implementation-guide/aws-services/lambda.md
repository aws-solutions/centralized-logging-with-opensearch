# AWS Lambda Logs
AWS Lambda automatically monitors Lambda functions on your behalf and sends function metrics to Amazon CloudWatch.
## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"

    - The Lambda region must be the same as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.
### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **AWS Lambda**.
5. Choose **Next**.
6. Under **Specify settings**, choose the Lambda function from the dropdown list. (Optional) If you are ingesting logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown first.
9. Choose **Next**.
10. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
11. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated Amazon OpenSearch Service dashboard.
12. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is the Lambda function name.
13. In the **Log Lifecycle** section, input the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
14. Choose **Next**.
15. Add tags if needed.
16. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - Lambda Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![lambda-db]][lambda-db]


[lambda-db]: ../../images/dashboards/lambda-db.png
