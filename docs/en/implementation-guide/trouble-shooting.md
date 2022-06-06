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



## Error: PutRecords API responded with error='AccessDeniedException'

Fluent-bit agent deployed on EKS Cluster reports "AccessDeniedException" when sending records to Kinesis

### Verify that the IAM role trust relations are correctly set.

With the Log Hub console:

1. Open the Log Hub console.
2. In the left sidebar, under **Log Source**, choose **EKS Clusters**.
3. Choose the **EKS Cluster** that you want to check.
4. Click the **IAM Role ARN** which will open the IAM Role in AWS Console.
5. Choose the **Trust relationships** to verify that the OIDC Provider, the service account namespace and conditions are correctly set.

You can get more information from Amazon EKS [IAM role configuration](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-technical-overview.html#iam-role-configuration)