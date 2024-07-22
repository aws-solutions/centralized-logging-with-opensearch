# AWS CloudTrail Logs
 AWS CloudTrail monitors and records account activity across your AWS infrastructure. It outputs all the data to the specified S3 bucket or a CloudWatch log group.

 You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudTrail logging bucket must be in the same Region as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.


## Create log ingestion (OpenSearch Engine)

### Using the Centralized Logging with OpenSearch console
1. Sign in to the Centralized Logging with OpenSearch console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose **Create a log ingestion**.
4. In the **AWS Services** section, choose **AWS CloudTrail**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual**.
    - For **Automatic** mode, choose a CloudTrail in the dropdown list.
    - For **Manual** mode, enter the **CloudTrail name**.
    - (Optional) If you are ingesting CloudTrail logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Under **Log Source**, Select **S3** or **CloudWatch** as the log source.
8. Choose **Next**.
9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
10. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in Amazon OpenSearch Service dashboard.
11. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is your trail name.
12. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
13. In the **Select log processor** section, please choose the log processor.
    - When selecting Lambda as log processor, you can configure the Lambda concurrency if needed.
    - (Optional) OSI as log processor is now supported in these [regions](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/). When OSI is selected, please type in the minimum and maximum number of OCU. See more information [here](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling).
14. Choose **Next**.
14. Add tags if needed.
15. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudTrail Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

### View dashboard

The dashboard includes the following visualizations.

| Visualization Name     | Source Field  | Description  |
| ---------- | ------ | -------------- |
| Global Control         |  awsRegion   | Provides users with the ability to drill down data by Region.  |
| Event History          | log event | Presents a bar chart that displays the distribution of events over time.                                                                                       |
| Event by Account ID    | userIdentity.accountId                                                                            | Breaks down events based on the AWS account ID, enabling you to analyze activity patterns across different accounts within your organization.                  |
| Total Event Count    | eventSource eventName                                                                            | Shows the total count of CloudTrail events.                  |
| Top Event Names        | eventName  | Shows the most frequently occurring event names, helping you identify common activities or potential anomalies.                                                |
| Top Event Sources      | eventSource      | Highlights the top sources generating events, providing insights into the services or resources that are most active or experiencing the highest event volume. |
| Event By Region    | awsRegion                                                                          | Breaks down events based on regions, enabling you to analyze activity patterns across different regions.                   |
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

#### Sample dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]

[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png


## Create log ingestion (Light Engine)

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **AWS CloudTrail**.
5. Choose **Light Engine**, and choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **CloudTrail logs enabling**. The automatic mode will detect the CloudTrail log location automatically.
    - For **Automatic mode**, choose the CloudTrail from the dropdown lists.
      * For Standard Log, the solution will automatically detect the log location if logging is enabled.
    - For **Manual mode**, enter the **CloudTrail ID** and **CloudTrail Standard Log location**.
    - (Optional) If you are ingesting CloudTrail logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
9. In the **Specify Light Engine Configuration** section, if you want to ingest associated templated Grafana dashboards, select **Yes** for the sample dashboard.
10. You can choose an existing Grafana, or if you need to import a new one, you can go to Grafana for configuration.
12. Select an S3 bucket to store partitioned logs and define a name for the log table. We have provided a predefined table name, but you can modify it according to your business needs.
13. If needed, change the log processing frequency, which is set to **5** minutes by default, with a minimum processing frequency of **1** minute.
14. In the **Log Lifecycle** section, enter the log merge time and log archive time. We have provided default values, but you can adjust them based on your business requirements.
15. Select **Next**.
16. If desired, add tags.
17. Select **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudTrail Standard Log Ingestion* template in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template) |

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    - Parameters for **Pipeline settings**

    | Parameter                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<Requires input>` | The unique identifier for the pipeline is essential if you need to create multiple ALB pipelines and write different ALB logs into separate tables. To ensure uniqueness, you can generate a unique pipeline identifier using [uuidgenerator](https://www.uuidgenerator.net/version4).                                                                                         |
    | Staging Bucket Prefix              | AWSLogs/CloudTrailLogs | The storage directory for logs in the temporary storage area should ensure the uniqueness and non-overlapping of the Prefix for different pipelines.                                                                                        |

    - Parameters for **Destination settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<Requires input>` | Centralized s3 bucket name. For example, centralized-logging-bucket.           |
    | Centralized Bucket Prefix     |  datalake                | Centralized bucket prefix. By default, the data base location is s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized. |
    | Centralized Table Name              | CloudTrail | Table name for writing data to the centralized database. You can modify it if needed.                                                                                        |


    - Parameters for **Scheduler settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | LogProcessor Schedule Expression | rate(5 minutes) | Task scheduling expression for performing log processing, with a default value of executing the LogProcessor every 5 minutes. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html).           |
    | LogMerger Schedule Expression   |  cron(0 1 * * ? *)                | Task scheduling expression for performing log merging, with a default value of executing the LogMerger at 1 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html). |
    | LogArchive Schedule Expression              | cron(0 2 * * ? *) | Task scheduling expression for performing log archiving, with a default value of executing the LogArchive at 2 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html). |
    | Age to Merge              | 7 | Small file retention days, with a default value of 7, indicating that logs older than 7 days will be merged into small files. It can be adjusted as needed.
     | Age to Archive              | 30 | Log retention days, with a default value of 30, indicating that data older than 30 days will be archived and deleted. It can be adjusted as needed.


    - Parameters for **Notification settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Notification Service | SNS | Notification method for alerts. If your main stack is using China, you can only choose the SNS method. If your main stack is using Global, you can choose either the SNS or SES method.           |
    | Recipients   |  `<Requires Input>`               | Alert notification: If the Notification Service is SNS, enter the SNS Topic ARN here, ensuring that you have the necessary permissions. If the Notification Service is SES, enter the email addresses separated by commas here, ensuring that the email addresses are already Verified Identities in SES. The adminEmail provided during the creation of the main stack will receive a verification email by default. |

    - Parameters for **Dashboard settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Import Dashboards | FALSE | Whether to import the Dashboard into Grafana, with a default value of false. If set to true, you must provide the Grafana URL and Grafana Service Account Token.           |
    | Grafana URL   |  `<Requires Input>`                | Grafana access URL，for example: https://alb-72277319.us-west-2.elb.amazonaws.com. |
    | Grafana Service Account Token              | `<Requires Input>` | Grafana Service Account Token：Service Account Token created in Grafana.
                                                                                          |




6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 10 minutes.
