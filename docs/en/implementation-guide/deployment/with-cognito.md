# Launch with Cognito User Pool

**Time to deploy**: Approximately 15 minutes
## Deployment Overview

Use the following steps to deploy this solution on AWS.

[Step 1. Launch the stack](#step-1-launch-the-stack)

[Step 2. Launch the web console](#step-2-launch-the-web-console)

## Step 1. Launch the stack

This AWS CloudFormation template automatically deploys the Centralized Logging with OpenSearch solution on AWS.

1. Sign in to the AWS Management Console and select the button to launch the AWS CloudFormation template.

    |                             | Launch in AWS Console                                                                                                                                                                                                                                   |
    |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | Launch with a new VPC       | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLogging.template){target=_blank}              |
    | Launch with an existing VPC | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPC.template){target=_blank} |

2. The template is launched in the default region after you log in to the console. To launch the Centralized Logging with OpenSearch solution in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL is shown in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and STS Limits](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html){target='_blank'} in the *AWS Identity and Access Management User Guide*.

5. Under **Parameters**, review the parameters for the template and modify them as necessary.

     - If you are launching the solution in a new VPC, this solution uses the following parameters:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Admin User Email | `<Requires input>` | Specify the email of the Administrator. This email address will receive a temporary password to access the Centralized Logging with OpenSearch web console. You can create more users directly in the provisioned Cognito User Pool after launching the solution. |

     - If you are launching the solution in an existing VPC, this solution uses the following parameters:

    | Parameter  | Default          | Description                                                                                                                                                                                                                          |
    | ---------- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | Admin User Email | `<Requires input>` | Specify the email of the Administrator. This email address will receive a temporary password to access the Centralized Logging with OpenSearch web console. You can create more users directly in the provisioned Cognito User Pool after launching the solution. |
    | VPC ID | `<Requires input>` | Specify the existing VPC ID in which you are launching the Centralized Logging with OpenSearch solution.                                                                                                                                                         |
    | Public Subnet IDs | `<Requires input>` | Specify the two public subnets in the selected VPC. The subnets must have routes point to an [Internet Gateway][IGW].                                                                                                               |
    | Private Subnet IDs | `<Requires input>` | Specify the two private subnets in the selected VPC. The subnets must have routes point to an [NAT Gateway][NAT].                                                                                                                    |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Select the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create stack** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

## Step 2. Launch the web Console

After the stack is successfully created, this solution generates a CloudFront domain name that gives you access to the Centralized Logging with OpenSearch web console.
Meanwhile, an auto-generated temporary password (excluding the last digit `.`) will be sent to your email address.

1. Sign in to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.

2. On the **Stacks** page, select the solution’s stack.

3. Choose the **Outputs** tab and record the domain name.

4. Open the **WebConsoleUrl** using a web browser, and navigate to a sign-in page.

5. Enter the **Email** and the temporary password.

    a. Set a new account password.

    b. (Optional) Verify your email address for account recovery.

6. After the verification is complete, the system opens the Centralized Logging with OpenSearch web console.

Once you have logged into the Centralized Logging with OpenSearch console, you can [import an Amazon OpenSearch Service domain](../domains/import.md#import-an-amazon-opensearch-service-domain) and build log analytics pipelines.


[NAT]: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
[IGW]: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html