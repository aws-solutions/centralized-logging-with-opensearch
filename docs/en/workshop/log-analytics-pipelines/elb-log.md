# Ingest Logs via CloudFormation Stack
> Estimated time: 10 minutes

In addition to the Log Hub console, Log Hub also allows customers to ingest logs by provisioning a standalone CloudFormation template. 
These templates are super useful when

* The customer has limited log types, for example the customer only one type of logs to analyze.
* The customer wants to integrate with the [Infrastructure-as-Code][IaC] technology, and they can reuse the CloudFormation templates.

In this chapter, you will learn how to ingest ELB access logs into Amazon OpenSearch service and build up dashboards. [ELB Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) provides
access logs that capture detailed information about requests sent to your load balancer. ELB publishes a log file for each load balancer node every 5 minutes.

## Enable ELB Access Logs
1. Go to <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:sort=loadBalancerName" target="_blank">**AWS Console > EC2 > Load Balancers**</a> on the left column of the page
![](../../images/workshop/edit-attribute.png)
2. Select the balancer which name starts with **`Works-works-`**

3. Under **Description** tab, we can find **Attributes** section, select **Edit attributes**

4. Please enable **AccessLogs** and create a new s3 location to store ELB, please save the name of s3 for later usage. Also, select **Create this location for me**.
The suggested name is: 
```
<your-login>-loghub-workshop-logging-bucket/elb
```
Please double-check if you have selected all the following items:
![](../../images/workshop/editing.png)
5. Click **Save**.

## Create log ingestion using CloudFormation

1. Log in the AWS Management Console and select the button to launch the ``LogHub-ELBLog`` AWS CloudFormation template.
    
    <a href="https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-ELBLog&templateURL=https://aws-gcr-solutions.s3.amazonaws.com/log-hub/v0.2.0-dev/ELBLog.template" target="_blank">![Launch Stack](../../images/launch-stack.png)</a>

2. Click **Next** and fill in the parameters required:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Log Bucket Name | `<Requires input>` | The S3 bucket stores ELB log, which we created in adding ELB attributes: **`YOURLOGIN-loghub-workshop-logging-bucket`** |
    | Log Bucket Prefix | `<Requires input>` | Type in **elb** |
    | Engine Type | OpenSearch | Choose **OpenSearch**.|
    | OpenSearch Domain Name | `<Requires input>` | Type in **workshop-os** |
    | OpenSearch Endpoint | `<Requires input>` | The OpenSearch endpoint URL. You can find it inside the Log Hub Portal: **AWS Console > Cloudformation > Stacks > WorkshopDemo > Ouputs > opensearchDomain**|
    | Index Prefix | `<requires input>` | Type in **workshop** |
    | Create Sample Dashboard | Yes | Choose **Yes** this time. |
    | VPC ID | `<requires input>` | Select the VPC which name starts with **LogHub/LogHubVpc/DefaultVPC** |
    | Subnet IDs | `<requires input>` | Select **TWO** private subnets which names are **LogHub/LogHubVpc/DefaultVPC/privateSubnet1** and **LogHub/LogHubVpc/DefaultVPC/privateSubnet2** |
    | Security Group ID | `<requires input>` | Select the Security Group which name start with **LogHub-ProcessSecurityGroup-** |
    | S3 Backup Bucket | `<requires input>` | **`YOURLOGIN-loghub-workshop-logging-bucket`**  |
    | Number Of Shards | 5 | Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10-50 GiB. |
    | Number of Replicas | 1 | The number of days required to move the index into warm storage, this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch. |
    | Days to Warm Storage | 0 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index. |
    | Days to Cold Storage | 0 | The number of days required to move the index into cold storage, this is only effecitve when the value is >0 and cold storage is enabled in OpenSearch. |
    | Days to Retain | 0 | The total number of days to retain the index, if value is 0, the index will not be deleted. |

    Your parameters should look mostly like this:

    ![](../../images/workshop/elb-parameters.png)

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 10 minutes.

[IaC]:https://en.wikipedia.org/wiki/Infrastructure_as_code

We have successfully created a service log pipeline for ELB from Cloudformation, and congrats on finishing all the sections in this workshop! 
