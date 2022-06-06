1. Log in to the AWS Management Console and select above button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Log Bucket Name | `<Requires input>` | The S3 bucket name which stores the logs. |
    | Log Bucket Prefix | `<Requires input>` | The S3 bucket path prefix which stores the logs. |
    | Engine Type | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch. |
    | OpenSearch Domain Name | `<Requires input>` | The domain name of the Amazon OpenSearch cluster. |
    | OpenSearch Endpoint | `<Requires input>` | The OpenSearch endpoint URL. For example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com` |
    | Index Prefix | `<Requires input>` | The common prefix of OpenSearch index for the log. The index name will be `<Index Prefix>-<log-type>-<YYYY-MM-DD>`. |
    | Create Sample Dashboard | Yes | Whether to create a sample OpenSearch dashboard. |
    | VPC ID | `<requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will reside in the selected VPC. |
    | Subnet IDs | `<Requires input>` | Select at least two subnets which have access to the OpenSearch domain. The log processing Lambda will reside in the subnets. Make sure the subnets have access to the Amazon S3 service. |
    | Security Group ID | `<Requires input>` | Select a Security Group which will be associated with the log processing Lambda. Make sure the Security Group has access to the OpenSearch domain. |
    | S3 Backup Bucket | `<Requires input>` | The S3 backup bucket name to store the failed ingestion logs.  |
    | Number Of Shards | 5 | Number of shards to distribute the index evenly across all data nodes. Keep the size of each shard between 10-50 GiB. |
    | Number of Replicas | 1 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index. |
    | Days to Warm Storage | 0 | The number of days required to move the index into warm storage. This takes effect only when the value is larger than 0 and warm storage is enabled in OpenSearch. |
    | Days to Cold Storage | 0 | The number of days required to move the index into cold storage. This takes effect only when the value is larger than 0 and cold storage is enabled in OpenSearch. |
    | Days to Retain | 0 | The total number of days to retain the index. If value is 0, the index will not be deleted. |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 10 minutes.