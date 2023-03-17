# VPC Flow Logs
[VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) enable you to capture information about the IP traffic going to and from network interfaces in your VPC.

## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - Centralized Logging with OpenSearch supports VPCs who publish the flow log data to an Amazon S3 bucket or a CloudWatch log group. When publishing to S3, The S3 Bucket region must be the same as the Centralized Logging with OpenSearch solution region.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **VPC Flow Logs**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **VPC Flow Log enabling**. The automatic mode will enable the VPC Flow Log and save the logs to a centralized S3 bucket if logging is not enabled yet.
    - For **Automatic mode**, choose the VPC from the dropdown list.
    - For **Manual mode**, enter the **VPC Name** and **VPC Flow Logs location**.
    - (Optional) If you are ingesting VPC Flow logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
 7. Under **Log Source**, select **S3** or **CloudWatch** as the source.
 8. Choose **Next**.
 9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
 10. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in Amazon OpenSearch Service dashboard.
 11. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is your VPC name.
 12. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
 13. Choose **Next**.
 14. Add tags if needed.
 15. Choose **Create**.

### Using the standalone CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - VPC Flow Logs Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Standard Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![vpc-db]][vpc-db]


[vpc-db]: ../../images/dashboards/vpcflow-db.png