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

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name     | Source Field  | Description  |
| ---------- | ------ | -------------- |
| Global Control         |  awsRegion   | Provides users with the ability to drill down data by Region.  |
| Event History          | log event | Presents a bar chart that displays the distribution of events over time.                                                                                       |
| Event by Account ID    | userIdentity.accountId                                                                            | Breaks down events based on the AWS account ID, enabling you to analyze activity patterns across different accounts within your organization.                  |
| Top Event Names        | eventName  | Shows the most frequently occurring event names, helping you identify common activities or potential anomalies.                                                |
| Top Event Sources      | eventSource      | Highlights the top sources generating events, providing insights into the services or resources that are most active or experiencing the highest event volume. |
| Event Category         | eventCategory  | Categorizes events into different types or classifications, facilitating analysis and understanding of event distribution across categories.                   |
| Top Users              | <ul><li> userIdentity.sessionContext.sessionIssuer.userName </li> <li> userIdentity.sessionContext.sessionIssuer.arn </li> <li> userIdentity.accountId </li> <li> userIdentity.sessionContext.sessionIssuer.type </li> </ul>      | Identifies the users or IAM roles associated with the highest number of events, aiding in user activity monitoring and access management.                      |
| Top Source IPs         | sourceIPAddress | Lists the source IP addresses associated with events, enabling you to identify and investigate potentially suspicious or unauthorized activities.              |
| S3 Access Denied       | <ul><li> eventSource: s3\* </li><li> errorCode: AccessDenied</li></ul>       | Displays events where access to Amazon S3 resources was denied, helping you identify and troubleshoot permission issues or potential security breaches.        |
| S3 Buckets             | requestParameters.bucketName | Provides a summary of S3 bucket activity, including create, delete, and modify operations, allowing you to monitor changes and access patterns.                |
| Top S3 Change Events   | <ul><li> eventName</li><li> requestParameters.bucketName</li></ul>      | Presents the most common types of changes made to S3 resources, such as object uploads, deletions, or modifications, aiding in change tracking and auditing.   |
| EC2 Change Event Count | <ul><li> eventSource: ec2\* </li><li> eventName: (RunInstances or TerminateInstances or RunInstances or StopInstances)</li></ul>        | Shows the total count of EC2-related change events, giving an overview of the volume and frequency of changes made to EC2 instances and resources.             |
| EC2 Changed By         | userIdentity.sessionContext.sessionIssuer.userName   | Identifies the users or IAM roles responsible for changes to EC2 resources, assisting in accountability and tracking of modifications.                         |
| Top EC2 Change Events  | eventName | Highlights the most common types of changes made to EC2 instances or related resources, allowing you to focus on the most significant or frequent changes.     |
| Error Events           | <ul><li>awsRegion</li><li>errorCode</li><li>errorMessage</li><li>eventName</li><li>eventSource</li><li>sourceIPAddress</li><li>userAgent</li><li>userIdentity.​accountId</li><li>userIdentity.​sessionContext.​sessionIssuer.​accountId</li><li>userIdentity.​sessionContext.​sessionIssuer.​arn</li><li>userIdentity.​sessionContext.​sessionIssuer.​type</li><li>userIdentity.​sessionContext.​sessionIssuer.​userName</li></ul> | Displays events that resulted in errors or failures, helping you identify and troubleshoot issues related to API calls or resource operations.                 |

### Sample dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]

[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png

