# CloudTrail Logs
Amazon CloudTrail monitors and records account activity across your AWS infrastructure. It outputs all the data to the specified S3 bucket. 
## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudTrail region must be the same as the solution region.
    - The AOS index is rotated on a daily basis, and cannot be adjusted.
### Using the Log Hub console
1. Sign in to the Log Hub console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**. 
3. Click the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon CloudTrail**.
5. Choose **Next**.
6. Under **Specify settings**, for **Trail**, select one from the dropdown list. (Optional) If you are ingesting CloudTrail logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**. 
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in AOS dashboard.
10. You can change the **Index Prefix** of the target AOS index if needed. The default prefix is your trail name.
11. In the **Log Lifecycle** section, enter the number of days to manage the AOS index lifecycle. Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the standalone CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - CloudTrail Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Standard Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudTrail&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudTrailLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudTrail&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]


[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png

