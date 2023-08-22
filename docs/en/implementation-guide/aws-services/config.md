# AWS Config Logs
By default, AWS Config delivers configuration history and snapshot files to your Amazon S3 bucket.

## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - AWS Config must be enabled in the same region as the Centralized Logging with OpenSearch solution.
    - The Amazon S3 bucket region must be the same as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
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
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in Amazon OpenSearch Service dashboard.
10. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix the AWS Config Name you entered in previous steps.
11. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the standalone CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - AWS Config Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Standard Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name            | Source Field                                                                                                                                                                           | Description                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Global Filters                | <ul><li> awsAccountId </li><li> awsRegion </li><li>resourceType </li><li> resourceId </li><li> resourceName </li></ul>                                                                 |The charts are filtered according to Account ID, Region, Resource Type and other conditions.                                         |
| Total Change Events           | <ul><li> log event </li></ul>                                                                                                                                                          | Shows the number of configuration changes detected across all AWS resources during a selected time period.                               |
| Top Resource Types            | <ul><li> resourceType </li></ul>                                                                                                                                                       | Displays the breakdown of configuration changes by the most frequently modified AWS resource types during a selected time period.        |
| Config History                | <ul><li> log event </li></ul>                                                                                                                                                          | Presents a bar chart that displays the distribution of events over time.                                                                 |
| Total Delete Events           | <ul><li> log event </li></ul>                                                                                                                                                          | Shows the number of AWS resource deletion events detected by AWS Config during a selected time period.                                   |
| Config Status                 | <ul><li> configurationItemStatus </li></ul>                                                                                                                                            | Displays the operational state of the AWS Config service across monitored regions and accounts.                                          |
| Top S3 Changes                | <ul><li> resourceName</li></ul>                                                                                                                                                        | Displays the Amazon S3 buckets undergoing the highest number of configuration changes during a selected time period.                     |
| Top Changed Resources         | <ul><li> resourceName</li><li> resourceId</li><li> resourceType</li></ul>                                                                                                              | Displays the individual AWS resources undergoing the highest number of configuration changes during a selected time period.              |
| Top VPC Changes               | <ul><li> resourceId</li></ul>                                                                                                                                                          | Presents a bar chart that Displays the Amazon VPCs undergoing the highest number of configuration changes during a selected time period. |
| Top Subnet Changes            | <ul><li> resourceId</li></ul>                                                                                                                                                          | Delivers targeted visibility into the subnets undergoing the most transformation for governance, security and stability.                 |
| Top Network Interface Changes | <ul><li> resourceId</li></ul>                                                                                                                                                          | Spotlights the Amazon VPC network interfaces seeing the most configuration changes during a selected period.                             |
| Top Security Group Changes    | <ul><li> resourceId</li></ul>                                                                                                                                                          | Top 10 changed groups rank by total modification count.                                                                                  |
| EC2 Config                    | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceId</li><li>configurationItemStatus</li></ul>                                                                 | Allows reconstructing the incremental changes applied to EC2 configurations over time for auditing.                                      |
| RDS Config                    | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceId</li><li>resourceName</li><li>configurationItemStatus</li></ul>                                            | Shows the configuration history and changes detected by AWS Config for RDS database resources                                            |
| Latest Config Changes         | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceType</li><li>resourceId</li><li>resourceName</li><li>relationships</li><li>configurationItemStatus</li></ul> | Offers an at-a-glance overview of infrastructure modifications.                                                                          |

### Sample Dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![config-db]][config-db]

[config-db]: ../../images/dashboards/config-db.png
