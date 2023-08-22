# Recommended Alarms
Amazon OpenSearch provides a set of [recommended CloudWatch alarms](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html) to monitor the health of Amazon OpenSearch Service domains. Centralized Logging with OpenSearch helps you to create the alarms automatically, and send notification to your email (or SMS) via SNS.

## Create alarms

### Using the Centralized Logging with OpenSearch console
1. Log in to the Centralized Logging with OpenSearch console.
2. In the navigation pane, under **Domains**, choose **OpenSearch domains**.
3. Select the domain from the table.
4. Under **General configuration**, choose **Enable** at the **Alarms** label.
5. Enter the **Email**.
6. Choose the alarms you want to create and adjust the settings if necessary.
7. Choose **Create**.

### Using the CloudFormation stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - Alarms* solution in the AWS Cloud.

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template.

    [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/AlarmForOpenSearch.template){target=_blank}

    You can also [download the template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/AlarmForOpenSearch.template) as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    | Parameter  | Default            | Description                                                                                                                                                                                                   |
    |--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | Endpoint | `<Requires input>` | The endpoint of the OpenSearch domain, for example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`.                                                                  |
    | DomainName | `<Requires input>` | The name of the OpenSearch domain.                                                                                                                                                                            |
    | Email | `<Requires input>` | The notification email address. Alarms will be sent to this email address via SNS.                                                                                                                            |
    | ClusterStatusRed | `Yes`              | Whether to enable alarm when at least one primary shard and its replicas are not allocated to a node.                                                                                                         |
    | ClusterStatusYellow | `Yes`              | Whether to enable alarm when at least one replica shard is not allocated to a node.                                                                                                                           |
    | FreeStorageSpace | `10`               | Whether to enable alarm when a node in your cluster is down to the free storage space you entered in GiB. We recommend setting it to 25% of the storage space for each node. `0` means the alarm is disabled. |
    | ClusterIndexWritesBlocked | `1`                 | Index writes blocked error occurs for >= x times in 5 minutes, 1 consecutive time. Input `0` to disable this alarm.                                                                                           |
    | UnreachableNodeNumber | `3`                | Nodes minimum is < x for 1 day, 1 consecutive time. `0` means the alarm is disabled.                                                                                                                          |
    | AutomatedSnapshotFailure | `Yes`              | Whether to enable alarm when automated snapshot failed. AutomatedSnapshotFailure maximum is >= 1 for 1 minute, 1 consecutive time.                                                                            |
    | CPUUtilization | `Yes`              | Whether to enable alarm when sustained high usage of CPU occurred. CPUUtilization or WarmCPUUtilization maximum is >= 80% for 15 minutes, 3 consecutive times.                                                |
    | JVMMemoryPressure | `Yes`              | Whether to enable alarm when JVM RAM usage peak occurred. JVMMemoryPressure or WarmJVMMemoryPressure maximum is >= 80% for 5 minutes, 3 consecutive times.                                                    |
    | MasterCPUUtilization | `Yes`              | Whether to enable alarm when sustained high usage of CPU occurred in master nodes. MasterCPUUtilization maximum is >= 50% for 15 minutes, 3 consecutive times.                                                |
    | MasterJVMMemoryPressure | `Yes`              | Whether to enable alarm when JVM RAM usage peak occurred in master nodes. MasterJVMMemoryPressure maximum is >= 80% for 15 minutes, 1 consecutive time.                                                       |
    | KMSKeyError | `Yes`              | Whether to enable alarm when KMS encryption key is disabled. KMSKeyError is >= 1 for 1 minute, 1 consecutive time.                                                                                            |
    | KMSKeyInaccessible | `Yes`              | Whether to enable alarm when KMS encryption key has been deleted or has revoked its grants to OpenSearch Service. KMSKeyInaccessible is >= 1 for 1 minute, 1 consecutive time.                                |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 5 minutes.

Once you have created the alarms, a confirmation email will be sent to your email address. You need to click the **Confirm** link in the email.

Go to the CloudWatch Alarms page by choosing the **General configuration > Alarms > CloudWatch Alarms** link on the Centralized Logging with OpenSearch console, and the link location is shown as follows:

![](../../images/domain/cloudwatch-alarm-link-en.png)

Make sure that all the alarms are in **OK** status because you might have missed the notification if alarms have changed its status before subscription.

!!! Warning "Note"

    The alarm will not send SNS notification to your email address if triggered before subscription. We recommend you check the alarms status after enabling the OpenSearch alarms. If you see any alarm which is in **In Alarm** status, you should fix that issue first.


## Delete alarms

1. Log in to the Centralized Logging with OpenSearch console.
2. In the navigation pane, under **Domains**, choose **OpenSearch domains**.
3. Select the domain from the table.
4. Choose the **Alarms** tab.
5. Choose the **Delete**.
6. On the confirmation prompt, choose **Delete**.

