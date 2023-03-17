# Amazon CloudTrail Logs
 Amazon CloudTrail monitors and records account activity across your AWS infrastructure. It outputs all the data to the specified S3 bucket or a CloudWatch log group.
## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudTrail region must be the same as the solution region.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.
### Using the Centralized Logging with OpenSearch console
1. Sign in to the Centralized Logging with OpenSearch console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose **Create a log ingestion**.
4. In the **AWS Services** section, choose **Amazon CloudTrail**.
5. Choose **Next**.
6. Under **Specify settings**, for **Trail**, select one from the dropdown list. (Optional) If you are ingesting CloudTrail logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Under **Log Source**, Select **S3** or **CloudWatch** as the log source.
8. Choose **Next**.
9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
10. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in Amazon OpenSearch Service dashboard.
11. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is your trail name.
12. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
13. Choose **Next**.
14. Add tags if needed.
15. Choose **Create**.

### Using the standalone CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudTrail Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]


[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png

