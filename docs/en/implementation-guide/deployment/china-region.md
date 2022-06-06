# Deployment in AWS China Regions

**Time to deploy**: Approximately 30 minutes

## Prerequisites

* An [ICP][icp] licensed domain. The Log Hub console is served via CloudFront distribution which is considered as an Internet information service. It is referred to as **Log Hub Console domain**.
* An SSL certificate in AWS IAM. The SSL must be associated with the given domain. For more information, see [uploading a server certificate](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#upload-server-certificate){target='_blank'} to IAM.

## Deployment Overview
Use the following steps to deploy this solution on AWS.

[Step 1. Create OIDC client](#step-1-create-oidc-client)

[Step 2. Launch the stack](#step-2-launch-the-stack)

[Step 3. Setup DNS Resolver](#step-3-setup-dns-resolver)

[Step 4. Launch the web console](#step-4-launch-the-web-console)

## Step 1. Create OIDC client

[Cognito User Pool][cognito] is not supported in AWS China Regions. If you choose to deploy the solution in AWS China Regions, an OpenID Connector (OIDC) client is required.

You can use different kinds of OpenID Connector(OIDC) providers. This section introduces Option 1 and Option 2.

- (Option 1) [Authing][authing] is an example of a third-party authentication provider. 
- (Option 2) [Keycloak](https://github.com/aws-samples/keycloak-on-aws) is a solution maintained by AWS and can serve as an authentication identity provider. 
- (Option 3) Other third-party authentication platforms such as [Auth0][auth0].

Follow the steps below to create an OIDC client, and obtain the `client_id` and `issuer`. 

### (Option 1) Authing.cn OIDC client

1. Go to the [Authing console](https://console.authing.cn/console){target=_blank}.
2. Create a user pool if you don't have one.
3. Select the user pool.
4. On the left navigation bar, select **Self-built App** under **Applications**. 
5. Click the **Create** button.
6. Enter the **Application Name**, and **Subdomain**.
7. Save the `App ID` (that is, `client_id`) and `Issuer` to a text file from Endpoint Information, which will be used later.
    [![](../../images/OIDC/endpoint-info.png)](../../images/OIDC/endpoint-info.png)

8. Update the `Login Callback URL` and `Logout Callback URL` to your IPC recorded domain name.
    [![](../../images/OIDC/authentication-configuration.png)](../../images/OIDC/authentication-configuration.png)

9. Set the Authorization Configuration.
    [![](../../images/OIDC/authorization-configuration.png)](../../images/OIDC/authorization-configuration.png)

You have successfully created an authing self-built application. 

### (Option 2) Keycloak OIDC client

1. Deploy the Keycloak solution in AWS China Regions following [this guide](https://github.com/aws-samples/keycloak-on-aws/blob/master/doc/DEPLOYMENT_GUIDE.md){target='_blank'}.

2. Make sure you can log in to the Keycloak console.

3. On the left navigation bar, select **Add realm**. Skip this step if you already have a realm. 

4. Go to the realm setting page. Choose **Endpoints**, and then **OpenID Endpoint Configuration** from the list.

    [![](../../images/OIDC/keycloak-example-realm.jpg)](../../images/OIDC/keycloak-example-realm.jpg)

5. In the JSON file that opens up in your browser, record the **issuer** value which will be used later.

    [![](../../images/OIDC/OIDC-config.jpg)](../../images/OIDC/OIDC-config.jpg)

6. Go back to Keycloak console and select **Clients** on the left navigation bar, and choose **Create**.
7. Enter a Client ID, which must contain 24 letters (case-insensitive) or numbers. Record the **Client ID** which will be used later.
8. Change client settings. Enter `https://<Log Hub Console domain>` in **Valid Redirect URIs**，and enter `*` and `+` in **Web Origins**, as shown below.

    [![](../../images/OIDC/keycloak-client-setting.jpg)](../../images/OIDC/keycloak-client-setting.jpg)

9. Select **Users** on the left navigation bar.
10. Click **Add user** and enter **Username**.
11. After the user is created, select **Credentials**, and enter **Password**.

The issuer value is `https://<KEYCLOAK_DOMAIN_NAME>/auth/realms/<REALM_NAME>`. 

## Step 2. Launch the stack

1. Sign in to the AWS Management Console and use the button below to launch the `log-hub` AWS CloudFormation template.

    [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubWithOIDC.template){target=_blank}

2. The template is launched in the default region after you log in to the console. To launch the Log Hub solution in a different AWS Region, use the Region selector in the console navigation bar.
3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.
4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and STS Limits](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html){target='_blank'} in the *AWS Identity and Access Management User Guide*.
5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | OidcClientId | `<Requires input>` | OpenId Connector client Id. |
    | OidcProvider  | `<Requires input>` | OpenId Connector provider issuer. The issuer must begin with `https://` |
    | Domain | `<Requires input>` | Custom domain for Log Hub console. Do NOT add `http(s)` prefix. |
    | IamCertificateID | `<Requires input>` | The ID of the SSL certificate in IAM. The ID is composed of 21 characters of capital letters and digits. Use the [`list-server-certificates`](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates){target='_blank'} command to retrieve the ID. |

7. Choose **Next**.
8. On the **Configure stack options** page, choose **Next**.
9. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.
10. Choose **Create stack**  to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

## Step 3. Setup DNS Resolver

This solution provisions a CloudFront distribution that gives you access to the Log Hub console.  

1. Sign in to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Obtain the **WebConsoleUrl** as the endpoint.
5. Create a CNAME record in DNS resolver, which points to the endpoint address. 

## Step 4. Launch the web console

!!! important "Important"

    You login credentials (username & password) is managed by the OIDC provider. Before signing in to the Log Hub console, make sure you have created at least one user in the OIDC provider's user pool.

1. Sign in to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Open the **OIDC Customer Domain URL** using a web browser.
5. Choose **Sign in to Log Hub**, and navigate to OIDC provider.
6. Enter username and password. You may be asked to change your default password for first-time login, which depends on your OIDC provider's policy.
7. After the verification is complete, the system opens the Log Hub web console.

Once you have logged into the Log Hub console, you can [import an AOS domain](../domains/import.md#import-an-aos-domain) and build log analytics pipelines.


[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[openid-connect]: https://openid.net/connect/
[authing]: https://www.authing.cn/
[keycloak]: https://www.keycloak.org/
[auth0]: https://auth0.com/
[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
[icp]: https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su
[keycloak-solution]: https://github.com/aws-samples/keycloak-on-aws