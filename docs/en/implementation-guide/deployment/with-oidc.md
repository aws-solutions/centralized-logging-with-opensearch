# Launch with OpenID Connect (OIDC)

**Time to deploy**: Approximately 30 minutes

## Prerequisites

!!! important "Important"
    The Centralized Logging with OpenSearch console is served via CloudFront distribution which is considered as an Internet information service.
    If you are deploying the solution in **AWS China Regions**, the domain must have a valid [ICP Recordal][icp].

* A domain. You will use this domain to access the Centralized Logging with OpenSearch console (Required for AWS China Regions, optional for AWS Regions).
* An SSL certificate in AWS IAM. The SSL must be associated with the given domain. Follow [this guide](../resources/upload-ssl-certificate.md) to upload SSL certificate to IAM. Note that this is required for AWS China Regions, but is not recommended for AWS Regions.
* Make sure to request or import the ACM certificate in the US East (N. Virginia) Region (us-east-1). Note that this is not required for AWS China Regions, and is optional for AWS Regions.

## Deployment Overview
Use the following steps to deploy this solution on AWS.

[Step 1. Create OIDC client](#step-1-create-oidc-client)

[Step 2. Launch the stack](#step-2-launch-the-stack)

[Step 3. Setup DNS Resolver](#step-3-setup-dns-resolver)

[Step 4. Launch the web console](#step-4-launch-the-web-console)

## Step 1. Create OIDC client

You can use different kinds of OpenID Connector (OIDC) providers. This section introduces Option 1 to Option 4.

- (Option 1) Using Amazon Cognito from another region as OIDC provider.
- (Option 2) [Authing][authing], which is an example of a third-party authentication provider.
- (Option 3) [Keycloak](https://github.com/aws-samples/keycloak-on-aws), which is a solution maintained by AWS and can serve as an authentication identity provider.
- (Option 4) [ADFS](https://docs.microsoft.com/en-us/windows-server/identity/active-directory-federation-services){target="_blank"}, which is a service offered by Microsoft.
- (Option 5) Other third-party authentication platforms such as [Auth0][auth0].

Follow the steps below to create an OIDC client, and obtain the `client_id` and `issuer`.

### (Option 1) Using Cognito User Pool from another region

You can leverage the [Cognito User Pool][cognito] in a supported AWS Standard Region as the OIDC provider.

1. Go to the [Amazon Cognito console](https://console.aws.amazon.com/cognito/home) in an AWS Standard Region.
2. Set up the hosted UI with the Amazon Cognito console based on this [guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html#cognito-user-pools-create-an-app-integration).
3. Choose **Public client** when selecting the **App type**.
4. Enter the **Callback URL** and **Sign out URL** using your domain name for Centralized Logging with OpenSearch console. If your hosted UI is set up, you should be able to see something like below.
       [![](../../images/OIDC/cognito-hostUI-new.png)](../../images/OIDC/cognito-hostUI-new.png)
5. Save the App client ID, User pool ID and the AWS Region to a file, which will be used later.
       [![](../../images/OIDC/cognito-new-console-clientID.png)](../../images/OIDC/cognito-new-console-clientID.png)
       [![](../../images/OIDC/cognito-new-console-userpoolID.png)](../../images/OIDC/cognito-new-console-userpoolID.png)

In [Step 2. Launch the stack](#step-2-launch-the-stack), the OidcClientID is the `App client ID`, and OidcProvider is `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`.

### (Option 2) Authing.cn OIDC client

1. Go to the [Authing console](https://console.authing.cn/console){target=_blank}.
2. Create a user pool if you don't have one.
3. Select the user pool.
4. On the left navigation bar, select **Self-built App** under **Applications**.
5. Click the **Create** button.
6. Enter the **Application Name**, and **Subdomain**.
7. Save the `App ID` (that is, `client_id`) and `Issuer` to a text file from Endpoint Information, which will be used later.
    [![](../../images/OIDC/endpoint-info.png)](../../images/OIDC/endpoint-info.png)

8. Update the `Login Callback URL` and `Logout Callback URL` to your IPC recorded domain name.

9. Set the Authorization Configuration.
    [![](../../images/OIDC/authorization-configuration.png)](../../images/OIDC/authorization-configuration.png)

You have successfully created an authing self-built application.

### (Option 3) Keycloak OIDC client

1. Deploy the Keycloak solution in AWS China Regions following [this guide](https://aws-samples.github.io/keycloak-on-aws/en/implementation-guide/deployment/){target='_blank'}.

2. Sign in to the Keycloak console.

3. On the left navigation bar, select **Add realm**. Skip this step if you already have a realm.

4. Go to the realm setting page. Choose **Endpoints**, and then **OpenID Endpoint Configuration** from the list.

    [![](../../images/OIDC/keycloak-example-realm.jpg)](../../images/OIDC/keycloak-example-realm.jpg)

5. In the JSON file that opens up in your browser, record the **issuer** value which will be used later.

    [![](../../images/OIDC/OIDC-config.jpg)](../../images/OIDC/OIDC-config.jpg)

6. Go back to Keycloak console and select **Clients** on the left navigation bar, and choose **Create**.
7. Enter a Client ID, which must contain 24 letters (case-insensitive) or numbers. Record the **Client ID** which will be used later.
8. Change client settings. Enter `https://<Centralized Logging with OpenSearch Console domain>` in **Valid Redirect URIs**，and enter `*` and `+` in **Web Origins**.

9. In the Advanced Settings, set the **Access Token Lifespan** to at least 5 minutes.
10. Select **Users** on the left navigation bar.
11. Click **Add user** and enter **Username**.
12. After the user is created, select **Credentials**, and enter **Password**.

The issuer value is `https://<KEYCLOAK_DOMAIN_NAME>/auth/realms/<REALM_NAME>`.

### (Option 4) ADFS OpenID Connect Client

1. Make sure your ADFS is installed. For information about how to install ADFS, refer to [this guide](https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/deployment/ad-fs-deployment-guide).
2. Make sure you can log in to the ADFS Sign On page. The URL should be `https://adfs.domain.com/adfs/ls/idpinitiatedSignOn.aspx`, and you need to replace **adfs.domain.com** with your real ADFS domain.
3. Log on your **Domain Controller**, and open **Active Directory Users and Computers**.
4. Create a **Security Group** for Centralized Logging with OpenSearch Users, and add your planned Centralized Logging with OpenSearch users to this Security Group.

5. Log on to ADFS server, and open **ADFS Management**.

6. Right click **Application Groups**, choose **Application Group**, and enter the name for the Application Group. Select **Web browser accessing a web application** option under **Client-Server Applications**, and choose **Next**.

7. Record the **Client Identifier** (`client_id`) under **Redirect URI**, enter your Centralized Logging with OpenSearch domain (for example, `xx.domain.com`), and choose **Add**, and then choose **Next**.

8. In the **Choose Access Control Policy** window, select **Permit specific group**, choose **parameters** under Policy part, add the created Security Group in Step 4, then click **Next**. You can configure other access control policy based on your requirements.

9. Under Summary window, choose **Next**, and choose **Close**.
10. Open the Windows PowerShell on ADFS Server, and run the following commands to configure ADFS to allow CORS for your planned URL.

    ```shell
    Set-AdfsResponseHeaders -EnableCORS $true
    Set-AdfsResponseHeaders -CORSTrustedOrigins https://<your-centralized-logging-with-opensearch-domain>
    ```

11. Under Windows PowerShell on ADFS server, run the following command to get the Issuer (`issuer`) of ADFS, which is similar to `https://adfs.domain.com/adfs`.

    ```shell
    Get-ADFSProperties | Select IdTokenIssuer
    ```

    ![](../../images/OIDC/adfs-9.png)

## Step 2. Launch the stack

!!! important "Important"

    You can only have one active Centralized Logging with OpenSearch solution stack in one region of an AWS account.
    If your deployment failed (for example, not meeting the requirements in [prerequisites](./index.md#Prerequisites)), make sure you have deleted the failed stack before retrying the deployment.

1. Sign in to the AWS Management Console and use the button below to launch the AWS CloudFormation template.

    |                                       | Launch in AWS Console                                                                                                                                                                                                                                                            |
    |----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------- |
    | Launch with a new VPC in AWS Regions       | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template){target=_blank}                               |
    | Launch with an existing VPC in AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template){target=_blank}                |
    | Launch with a new VPC in AWS China Regions                 | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template){target=_blank}                                 |
    | Launch with an existing VPC in AWS China Regions            | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template){target=_blank} |

2. The template is launched in the default region after you log in to the console. To launch the Centralized Logging with OpenSearch solution in a different AWS Region, use the Region selector in the console navigation bar.
3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.
4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and STS Limits](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html){target='_blank'} in the *AWS Identity and Access Management User Guide*.
5. Under **Parameters**, review the parameters for the template and modify them as necessary.

     - If you are launching the solution in a new VPC, this solution uses the following parameters:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | OidcClientId | `<Requires input>` | OpenID Connector client Id. |
    | OidcProvider  | `<Requires input>` | OpenID Connector provider issuer. The issuer must begin with `https://` |
    | Domain | `<Optional>` | Custom domain for Centralized Logging with OpenSearch console. Do NOT add `http(s)` prefix. |
    | IamCertificateID | `<Optional>` | The ID of the SSL certificate in IAM. The ID is composed of 21 characters of capital letters and digits. Use the [`list-server-certificates`](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates){target='_blank'} command to retrieve the ID. |
    | AcmCertificateArn | `<Optional>` | Arn for ACM certificates requested (or imported) the certificate in the US East (N. Virginia) Region (us-east-1). |

     - If you are launching the solution in an existing VPC, this solution uses the following parameters:

    | Parameter  | Default          | Description                                                                                                                                                                                                                                                                                            |
    | ---------- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | OidcClientId | `<Requires input>` | OpenID Connector client Id.                                                                                                                                                                                                                                                                            |
    | OidcProvider  | `<Requires input>` | OpenID Connector provider issuer. The issuer must begin with `https://`                                                                                                                                                                                                                                |
    | Domain | `<Optional>` | Custom domain for Centralized Logging with OpenSearch console. Do NOT add `http(s)` prefix.                                                                                                                                                                                                                                        |
    | IamCertificateID | `<Optional>` | The ID of the SSL certificate in IAM. The ID is composed of 21 characters of capital letters and digits. Use the [`list-server-certificates`](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates){target='_blank'} command to retrieve the ID. |    | VPC ID | `<Requires input>` | Specify the existing VPC ID which you are launching the Centralized Logging with OpenSearch solution in. |
    | AcmCertificateArn | `<Optional>` | Arn for ACM certificates requested (or imported) the certificate in the US East (N. Virginia) Region (us-east-1). |
    | VPC ID | `<Requires input>` | Specify the existing VPC ID in which you are launching the solution.   |
    | Public Subnet IDs | `<Requires input>` | Specify the two public subnets in the selected VPC. The subnets must have routes pointing to an [Internet Gateway][IGW].                                                                                                                                                                                  |
    | Private Subnet IDs | `<Requires input>` | Specify the two private subnets in the selected VPC. The subnets must have routes pointing to an [NAT Gateway][NAT].                                                                                                                                                                                      |

    !!! important "Important"

        - If you are deploying the solution in **AWS China Regions**, you must enter Domain, and IamCertificateID.
        - If you are deploying the solution in **AWS Regions**,
            - when a custom domain name is required, you must enter Domain, and AcmCertificateArn.
            - when no custom domain name is required, leave it blank for Domain, IamCertificateID, and AcmCertificateArn.

6. Choose **Next**.
7. On the **Configure stack options** page, choose **Next**.
8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.
9. Choose **Create stack**  to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

## Step 3. Setup DNS Resolver

This solution provisions a CloudFront distribution that gives you access to the Centralized Logging with OpenSearch console.

1. Sign in to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Obtain the **WebConsoleUrl** as the endpoint.
5. Create a CNAME record in DNS resolver, which points to the endpoint address.

## Step 4. Launch the web console

!!! important "Important"

    You login credentials is managed by the OIDC provider. Before signing in to the Centralized Logging with OpenSearch console, make sure you have created at least one user in the OIDC provider's user pool.

1. Use the previous assigned CNAME to open the **OIDC Customer Domain URL** using a web browser.
2. Choose **Sign in to Centralized Logging with OpenSearch**, and navigate to OIDC provider.
3. Enter sign-in credentials. You may be asked to change your default password for first-time login, which depends on your OIDC provider's policy.
4. After the verification is complete, the system opens the Centralized Logging with OpenSearch web console.

Once you have logged into the Centralized Logging with OpenSearch console, you can [import an Amazon OpenSearch Service domain](../domains/import.md#import-an-amazon-opensearch-service-domain) and build log analytics pipelines.

[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[openid-connect]: https://openid.net/connect/
[authing]: https://www.authing.cn/
[keycloak]: https://www.keycloak.org/
[auth0]: https://auth0.com/
[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
[icp]: https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su
[keycloak-solution]: https://github.com/aws-samples/keycloak-on-aws
[adfs-1]: ../../images/OIDC/adfs-1.png
[NAT]: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
[IGW]: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html