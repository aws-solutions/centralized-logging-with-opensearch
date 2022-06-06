# Deploy Log Hub 
> Estimated time: 15 minutes

!!! Warning "Warning"

    Before following this section, please make sure we have **one** more vacancy to create new VPC, and **two** more vacancies to create EIP in your us-east-1 region. This cloudformation deployment will automatically create one VPC in your us-east-1 region and occupy two more EIP in total, so lack of VPC and EIP would cause deployment failure. 
    Further more, **five** new S3 buckets will be created in total. So please also make sure your S3 bucket limit has not been reached.

## Launch Stack 

1. Log in the <a href="https://console.aws.amazon.com/console/home?region=us-east-1" target="_blank">AWS Management Console</a> and select the button below to launch the ```LogHub``` AWS CloudFormation template.
    
    <a href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHub.template" target="_blank">![Launch Stack](../../images/launch-stack.png)</a>
    
2. We launch this template in US East (N. Virginia) Region, please check the region on the right-upper corner and make sure it's correct.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, leave the stack name as **LogHub**.

5. Under **Parameters**, enter the email, this email will be used as your username to login the dashboard.

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes. The successful deployment should look like this: 

![Loghub Success](../../images/workshop/loghub-success.png)

## Access the Log Hub Web Console

This solution will generate a CloudFront endpoint that gives you access to the Log Hub console. The endpoint can be found in **Outputs** section of the CloudFormation template as **WebConsoleUrl**. An auto-generated password will be sent to your email address, you will need it to log in to the console. Please remember to omit the last digit `.` in your email.

1. Open the **WebConsoleUrl** in the browser. You will be navigated to a sign-in page.
    ![](../../images/web-console-url.png)

2. Input the email as the **Username**, and fill with the auto-generated password in the **Password** field.

    ![Portal Signin](../../images/workshop/portal-signin.png)

3. Choose **Sign in**.

4. You will be asked to change your password for the first-time login. Follow the guide to change your password.

5. You will be asked to confirm your email address for password recovery. Skip it this time.

So far, we have successfully deployed the main stack of LogHub.

Now you can see the **LogHub Web Console**, please do not close it, we will do further steps on it later.
![LogHub Web Console](../../images/workshop/loghub-portal-2.png)