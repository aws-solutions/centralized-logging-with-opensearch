# AWS Config Logs
By default, AWS Config delivers configuration history and snapshot files to your Amazon S3 bucket.

## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - AWS Config must be enabled in the same region as the Log Hub solution.
    - The Amazon S3 bucket region must be the same as the Log Hub solution.
    - The AOS index is rotated on a daily basis, and cannot be adjusted.

### Using the Log Hub Console
1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **AWS Config Logs**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **Log creation**.
    - For **Automatic mode**, make sure the S3 bucket location is correct, and enter the **AWS Config Name**. 
    - For **Manual mode**, enter the **AWS Config Name** and **Log location**.
    - (Optional) If you are ingesting AWS Config logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in AOS dashboard.
10. You can change the **Index Prefix** of the target AOS index if needed. The default prefix the AWS Config Name you entered in previous steps.
11. In the **Log Lifecycle** section, enter the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the standalone CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - AWS Config Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Standard Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-ConfigLog&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/ConfigLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-ConfigLog&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/ConfigLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![config-db]][config-db]


[config-db]: ../../images/dashboards/config-db.png