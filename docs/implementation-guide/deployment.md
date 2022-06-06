# Deployment 

Before you launch the solution, review the architecture, supported regions, and other considerations discussed in this guide. Follow the step-by-step instructions in this section to configure and deploy the solution into your account.

**Time to deploy**: Approximately 15 minutes

## Prerequisites
- Make sure all the AWS Services listed in [required AWS Services](./resources.md#aws-services) are available in your target region.

- Provision the [Amazon OpenSearch][opensearch] domain within VPC. For more information, refer to [Launching your Amazon OpenSearch Service domains within a VPC][vpc]. 

## Deployment Overview
Use the following steps to deploy this solution on AWS.

[Step 1. Launch the stack](#step-1-launch-the-stack)

[Step 2. Log in to the web console](#step-2-log-in-to-the-log-hub-web-console)

## For Global Regions
### Step 1. Launch the stack 

This automated AWS CloudFormation template deploys the Log Hub solution in the AWS Cloud.

1. Sign in to the AWS Management Console and select the button to launch the `log-hub` AWS CloudFormation template.
   
    [![Launch Stack](../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHub.template){target=_blank}

2. The template is launched in the US East (N. Virginia) Region by default. To launch the Log Hub solution in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL is shown in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and STS Limits][iam-limit] in the *AWS Identity and Access Management User Guide*.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.
   
    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Admin User Email | `<Requires input>` | Specify the email of the Administrator. This email address will receive a temporary password to access the Log Hub web console. You can create more users directly in the provisioned Cognito User Pool after launching the solution. |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

### Step 2. Log in to the Log Hub web console

This solution generates a CloudFront domain name that gives you access to the Log Hub web console. You can find the domain name in the **Outputs** section of the CloudFormation template as an **WebConsoleUrl**. An auto-generated password will be sent to your email address. Please remember to omit the last digit `.` in your email. 

1. Open the **WebConsoleUrl** using a web browser, then navigate to a sign-in page.
2. Sign in with the **Email** and the temporary password.

    a. Set a new account password.

    b. (Optional) Verify your email address for account recovery.

4. After the verification is complete, the system opens the Log Hub web console.

Once you have logged into the Log Hub console, you can [import an AOS domain](./domains/import.md#import-opensearch-domain) and create log analytics pipelines.

## For China Regions

### Step 1. Launch the stack

This automated AWS CloudFormation template deploys the Log Hub solution in the AWS Cloud.

1. Sign in to the AWS Management Console and select the button to launch the `log-hub` AWS CloudFormation template.
   
    [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubWithOIDC.template){target=_blank}

2. On the **Create stack** page, verify that the correct template URL is shown in the **Amazon S3 URL** text box and choose **Next**.

3. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and STS Limits][iam-limit] in the *AWS Identity and Access Management User Guide*.

4. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Oidc Client Id | `<Requires input>` | OpenId Connector Client Id |
    | Oidc Provider  | `<Requires input>` | OpenId Connector Provider Issuer (please add `https://` at beginning) |
    | Oidc Customer Domain | `<Requires input>` | Customer Domain for Log Hub (please add `https://` at beginning), this will be used to access LogHub web console |

5. Choose **Next**.

6. On the **Configure stack options** page, choose **Next**.

7. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

8. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

This solution generates a CloudFront domain name that gives you access to the Log Hub console. The domain name can be found in the **Outputs** tab of the CloudFormation template as an **WebConsoleUrl**. 

For China region, we need to add a **CNAME record** under your domain name, to enable public access. 

And also, we need to add the domain name to your CloudFront **Alternate domain names**:

![](../../images/authing/cloudfront-alternative.png)

### Step 2. Log in to the Log Hub web console

This solution generates a CloudFront domain name that gives you access to the Log Hub web console. You can find the domain name in the **Outputs** section of the CloudFormation template as an **WebConsoleUrl**. An auto-generated password will be sent to your email address. Please remember to omit the last digit `.` in your email. 

1. Open the **Oidc Customer Domain URL** using a web browser.
    The browser may warn you that the link you are going to is not secure. 
    Please just ignore the warning and choose the **Advanced** button.

    **The following graph is an example of Chrome**:
    ![](../../images/workshop/chrome-warning.png)
    Click the revealed URL. 

    **The following graph is an example of FireFox**:
    ![](../../images/workshop/fire-fox-2.png)
    Click **Accept the Risk and Continue**.

    !!! Note "Note"
        If you still can not access, please double check if you have disabled **Enhanced Protection** function in your browser.

        
2. Click **Sign in to Log Hub**, then you will be navigated to Authing
    
3. Type in your Authing username and password.


Once you have logged into the Log Hub console, you can [import an AOS domain](./domains/import.md#import-opensearch-domain) and create log analytics pipelines.


[opensearch]: https://aws.amazon.com/opensearch-service/
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
[iam-limit]:https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html