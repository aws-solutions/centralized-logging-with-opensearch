# Cross-Account Ingestion

Log Hub solution supports ingesting AWS Service logs and Application logs from another AWS account in the same region. 
To do that, you will need to launch a CloudFormation stack in the other account, and associate with the account which Log Hub deploys in.

## Concepts

- **Main Account**: The account in which you deployed the Log Hub console is Main Account. The OpenSearch cluster(s) must also be in the same account.
- **Member Account**: The account in which you have AWS Services or applications, and would like to ingest logs from.

## Add a Member Account

### Step 1. Launch a CloudFormation stack in the member account

1. Sign in to the Log Hub console.
2. In the navigation pane, under **Resources**, choose **Cross-Account Ingestion**. 
3. Click **Link an Account** button. You can find the steps to deploy the CloudFormation stack in the member account.
4. Go to the CloudFormation console of the member account.
5. Click the **Create stack** button and choose **With new resources (standard)**.
6. In the **Create stack** page, input the CloudFormation URL in **Amazon S3 URL**. You can find the URL on the **Link an Account** page in the Log Hub console. 
7. Follow the steps to create the CloudFormation stack.
8. Wait until the CloudFormation stack being provisioned. 

### Step 2. Link a member account

1. Go to the Log Hub console.
2. In the navigation panel, under **Resources**, choose **Cross-Account Ingestion**.
3. In **Step 2**, fill up the parameters using the Outputs from the previous step. 

    | Parameter                              | CloudFormation Outputs | Description                                                  |
    |------------------------| --------------------- | ------------------------------------------------------------ |
    | Account Name                           | N/A                    | A friendly name of the member account.                       |
    | Account ID                             | N/A                    | The 12 digits AWS account ID.                                |
    | Cross Account Role ARN                 | CrossAccountRoleARN    | Log Hub will assume this role to operate resources in the member account. |
    | FluentBit Agent Installation Document  | AgentInstallDocument   | Log Hub will assume this SSM Document to install Fluent Bit agent on EC2 instances in the member account. |
    | FluentBit Agent Configuration Document | AgentConfigDocument    | Log Hub will assume this SSM Document to deliver Fluent Bit configuration to EC2 instances. |
    | Cross Account S3 Bucket                | CrossAccountS3Bucket   | You can use the Log Hub console to enable some AWS Service logs and output to Amazon S3. The logs will be stored in this account. |
    | Cross Account Stack ID                 | CrossAccountStackId    | The CloudFormation stack ID in the member account.           |
    | Cross Account KMS Key                  | CrossAccountKMSKeyARN  | Log Hub will use the KMS key to encrypt SQS.                 |

4. Click the **Link** button.

## How it works?

Log Hub needs to provision some AWS resources in the member account to collect logs. Log Hub will assume an IAM 
role provisioned in the member account to list or create resources. The CloudFormation stack in member stack has the least privileges. 
For the cross-account ingestion architecture diagrams, please refer to the [Architecture](../architecture.md) section for more details.