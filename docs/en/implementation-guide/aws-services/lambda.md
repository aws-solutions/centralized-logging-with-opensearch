# AWS Lambda Logs
AWS Lambda automatically monitors Lambda functions on your behalf and sends function metrics to Amazon CloudWatch. 
## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    
    - The Lambda region must be the same as the Log Hub solution.
    - The AOS index is rotated on a daily basis, and cannot be adjusted.
### Using the Log Hub Console
1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **AWS Lambda**.
5. Choose **Next**.
6. Under **Specify settings**, choose the Lambda function from the dropdown list.
9. Choose **Next**.
10. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
11. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated AOS dashboard.
12. You can change the **Index Prefix** of the target AOS index if needed. The default prefix is the Lambda function name.
13. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
14. Choose **Next**.
15. Add tags if needed.
16. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - Lambda Log Ingestion* solution in the AWS Cloud.

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

    |                      | Launch in AWS Console                                        | Download Template                                            |
    | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
    | AWS standard regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template) |
    | AWS China regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template) |

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | LogGroupNames | `<Requires input>` | The names of the CloudWatch log group for Lambda logs.  |
    | KDSShardNumber | `1` | The shard number of Kinesis Data Streams which will subscribe to the CloudWatch log groups. |
    | KDSRetentionHours | `48` | The retention hours of Kinesis Data Streams. |
    | EngineType | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch. |
    | DomainName | `<Requires input>` | The domain name of the Amazon OpenSearch cluster. |
    | Endpoint | `<Requires input>` | The OpenSearch endpoint URL. For example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com` |
    | IndexPrefix | `<requires input>` | The target index prefix name in the OpenSearch domain. The solution will append the suffix `-YYYY-MM-DD` to the index name. |
    | CreateDashboard | `Yes` | Whether to create a sample OpenSearch dashboard. |
    | VPCId | `<requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be reside in the selected VPC. |
    | SecurityGroupId | `<requires input>` | Select a Security Group which will be associated with the log processing Lambda. Make sure the Security Group has access to the OpenSearch domain. |
    | SubnetIds | `<requires input>` | Select at least two subnets which have access to the OpenSearch domain. The log processing Lambda will reside in the subnets. Make sure the subnets have access to the Amazon S3 service. |
    | FailedLogBucket | `<requires input>` | All failed logs will be saved to this S3 bucket under the path `s3://<failed-log-buckets>/<account-id>/rds/<stack-name>` |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 10 minutes.
