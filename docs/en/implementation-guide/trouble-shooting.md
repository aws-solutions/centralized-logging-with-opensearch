# Troubleshooting Errors in Log Hub

The following help you to fix errors or problems that you might encounter when using Log Hub.

## Error: Failed to assume service-linked role `arn:x:x:x:/AWSServiceRoleForAppSync`

The reason for this error is that the account has never used the [AWS AppSync](https://aws.amazon.com/appsync/) service. You can deploy the solution's CloudFormation template again. AWS has already created the role automatically when you encountered the error. 

You can also go to [AWS CloudShell](https://aws.amazon.com/cloudshell/) or the local terminal and run the following AWS CLI command to Link AppSync Role

```
aws iam create-service-linked-role --aws-service-name appsync.amazonaws.com
```

## Error: Unable to add backend role

Log Hub only supports AOS domain with [Fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html) enabled.
You need to go to AOS console, and edit the **Access policy** for the AOS domain.

## Error：User xxx is not authorized to perform sts:AssumeRole on resource

![](../images/faq/assume-role-latency.png)

If you see this error, please make sure you have entered the correct information during [cross account setup](./link-account/index.md), and then please wait for several minutes.

Log Hub uses [AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) for cross-account access.
This is the best practice to temporary access the AWS resources in your sub-account. 
However, these roles created during [cross account setup](./link-account/index.md) take seconds or minutes to be affective.


## Error: PutRecords API responded with error='InvalidSignatureException'

Fluent-bit agent reports PutRecords API responded with error='InvalidSignatureException', message='The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.'

Please restart the fluent-bit agent. Eg. on EC2 with Amazon Linux2, run command:
```commandline
sudo service fluent-bit restart
```

## Error: PutRecords API responded with error='AccessDeniedException'

Fluent-bit agent deployed on EKS Cluster reports "AccessDeniedException" when sending records to Kinesis. Verify that 
the IAM role trust relations are correctly set. With the Log Hub console:

1. Open the Log Hub console.
2. In the left sidebar, under **Log Source**, choose **EKS Clusters**.
3. Choose the **EKS Cluster** that you want to check.
4. Click the **IAM Role ARN** which will open the IAM Role in AWS Console.
5. Choose the **Trust relationships** to verify that the OIDC Provider, the service account namespace and conditions are correctly set.

You can get more information from Amazon EKS [IAM role configuration](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-technical-overview.html#iam-role-configuration)

## My CloudFormation stack is stuck on deleting an `AWS::Lambda::Function` resource when I update the stack. How to resolve it?
![](../images/faq/cloudformation-stuck.png)
The Lambda function resides in a VPC, and you need to wait for the associated ENI resource to be deleted.


## The agent status is offline after I restart the EC2 instance, how can I make it auto start on instance restart?

This usually happens if you have installed the log agent, but restart the instance before you create any Log Ingestion. The Logging
Agent will auto restart if there is at least one Log Ingestion. If you have a log ingestion, but the problem still exists, you can use `systemctl status fluent-bit`
to check its status inside the instance.

## I have switched to Global tenant. However, I still cannot find the dashboard in OpenSearch.

This is usually because Log Hub received 403 error from OpenSearch when creating the index template and dashboard. This 
can be fixed by re-run the Lambda function manually by following the steps below:

With the Log Hub console:

1. Open the Log Hub console, and find the AWS Service Log pipeline which has this issue.
2. Copy the first 5 characters from the ID section. Eg. you should copy `c169c` from ID `c169cb23-88f3-4a7e-90d7-4ab4bc18982c`
3. Go to AWS Console > Lambda. Paste in function filters. This will filter in all the lambda function created for this AWS Service Log ingestion.
4. Click the Lambda function whose name contains "OpenSearchHelperFn".
5. In the **Test** tab, create a new event with any Event name.
6. Click the **Test** button to trigger the Lambda, and wait the lambda function to complete.
7. The dashboard should be available in OpenSearch

## How to install log agent on CentOS 7

1. Log in to your CentOS 7 machine and install SSM Agent manually.

    ```bash
    sudo yum install -y http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
    ```
2. Go to the **Instance Group** panel of Log Hub console, create **Instance Group**, select the CentOS 7 machine, click **Install log agent** and wait for its status to be **offline**.
3. Login to CentOS 7 and install fluent-bit 1.9.3 manually.

    ```bash
    export RELEASE_URL=${FLUENT_BIT_PACKAGES_URL:-https://packages.fluentbit.io}
    export RELEASE_KEY=${FLUENT_BIT_PACKAGES_KEY:-https://packages.fluentbit.io/fluentbit.key}

    sudo rpm --import $RELEASE_KEY
    cat << EOF | sudo tee /etc/yum.repos.d/fluent-bit.repo
    [fluent-bit]
    name = Fluent Bit
    baseurl = $RELEASE_URL/centos/VERSION_ARCH_SUBSTR
    gpgcheck=1
    repo_gpgcheck=1
    gpgkey=$RELEASE_KEY
    enabled=1
    EOF
    sudo sed -i 's|VERSION_ARCH_SUBSTR|\$releasever/\$basearch/|g' /etc/yum.repos.d/fluent-bit.repo
    sudo yum install -y fluent-bit-1.9.3-1

    # Modify the configuration file
    sudo sed -i 's/ExecStart.*/ExecStart=\/opt\/fluent-bit\/bin\/fluent-bit -c \/opt\/fluent-bit\/etc\/fluent-bit.conf/g' /usr/lib/systemd/system/fluent-bit.service
    sudo systemctl daemon-reload
    sudo systemctl enable fluent-bit
    sudo systemctl start fluent-bit
    ```
4. Go back to the **Instance Groups** panel of the Log Hub console and wait for the CentOS 7 machine status to be **Online** and proceed to create the instance group.