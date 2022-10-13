# 在 AWS 中国区域部署

**部署时间**：大约 30 分钟

## 前提条件

!!! important "重要"
    Log Hub 控制台通过 CloudFront 分发提供服务，该分发被视为 Internet 信息服务。 如果您在**AWS 中国区域**部署解决方案。域名必须有有效的[ICP备案][icp]才能正常使用。

* 一个域名。 您将使用此域来访问 Log Hub 控制台。
* AWS IAM 中的 SSL 证书，且必须与给定的域相关联。 按照 [本指南](../resources/upload-ssl-certificate.md) 将 SSL 证书上传到 IAM。

## 部署概览
使用以下步骤在 AWS 上部署此解决方案。

[步骤 1. 创建 OIDC 客户端](#1-oidc)

[步骤 2. 启动堆栈](#2)

[步骤 3. 配置 DNS 解析](#3-dns)

[步骤 4. 登录控制台](#4)

## 步骤 1. 创建 OIDC 客户端

您可以使用不同类型的 OpenID 连接器 (OIDC) 提供商。在本节中，我们将介绍选项 1 至 4。

- （选项 1）使用其他区域的 Cognito User Pool 作为身份验证提供者。
- （选项 2）[Authing][authing] 是第三方身份验证提供者。
- （选项 3）[Keycloak](https://github.com/aws-samples/keycloak-on-aws) 是 AWS 维护的解决方案，可以作为身份验证提供者。
- （选项 4）[ADFS](https://docs.microsoft.com/en-us/windows-server/identity/active-directory-federation-services){target="_blank"} 是 Microsoft 提供的一项服务。
- （选项 5）其它第三方认证平台，如[Auth0][auth0]。

按照以下步骤创建 OIDC 客户端，并获取 `client_id` 和 `issuer`。

### (选项 1) 使用其他区域的 Cognito User Pool

1. 在 AWS 海外区域登陆 [Amazon Cognito 控制台](https://console.aws.amazon.com/cognito/home)。
2. 使用 Amazon Cognito 控制台设置托管 UI。([详细步骤](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html#cognito-user-pools-create-an-app-integration))
3. 请注意，Amazon Cognito 控制台发布了一个新版本，新老版本都在使用。如果您正在使用新版本的 Cognito 控制台，请按照 **New console** 的步骤操作。并且：
    - 对于 **新版本的 Cognito 控制台**：请在选择 App type（应用程序类型）时选择 Public client（公有客户端）。
    - 对于 **旧版本的 Cognito 控制台**：请在添加应用程序客户端时，**清除**选项 Generate client secret（生成客户端密钥）。该选项是默认开启的。
4. 请在填写 Callback URL 和 Sign out URL 时，使用给 Log Hub 控制台准备的域名。在您的 hosted UI 设置成功后，您可以看到如下状态：
    - 对于 **新版本的 Cognito 控制台**：hosted UI 的状态为 **Available**。
        [![](../../images/OIDC/cognito-hostUI-new.png)](../../images/OIDC/cognito-hostUI-new.png)
    - 对于 **旧版本的 Cognito 控制台**：可以看到 **Launch Hosted UI** 这个链接，并且该链接有效。
        [![](../../images/OIDC/cognito-hostUI-old.png)](../../images/OIDC/cognito-hostUI-old.png)
5. 将 App client ID, User pool ID 和 Cognito 用户池所在的海外区域保存到一个文本文件中，以备后面使用。
    - 对于 **新版本的 Cognito 控制台**：
        [![](../../images/OIDC/cognito-new-console-clientID.png)](../../images/OIDC/cognito-new-console-clientID.png)
        [![](../../images/OIDC/cognito-new-console-userpoolID.png)](../../images/OIDC/cognito-new-console-userpoolID.png)
    - 对于 **旧版本的 Cognito 控制台**：
        [![](../../images/OIDC/cognito-old-console-clientID.png)](../../images/OIDC/cognito-old-console-clientID.png)
        [![](../../images/OIDC/cognito-old-console-userpoolID.png)](../../images/OIDC/cognito-old-console-userpoolID.png)

在[步骤 2. 启动堆栈](#2)中，OidcClientID 就是 `App client ID`, OidcProvider 是 `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`。

### (选项 2) Authing.cn OIDC 客户端

1. 登录[Authing 控制台](https://console.authing.cn/console){target=_blank}。
2. 如果您还没有用户池，先创建一个用户池。
3. 选择用户池。
4. 在左侧导航栏，选择**应用**下的**自建应用**。
5. 单击**创建自建应用**按钮。
6. 输入**应用名称**和**认证地址**。
7. 将Endpoint Information中的`App ID`（即`client_id`）和`Issuer`保存到一个文本文件中，以备后面使用。
    [![](../../images/OIDC/endpoint-info.png)](../../images/OIDC/endpoint-info.png)

7. 将`Login Callback URL`和`Logout Callback URL`更新为IPC记录的域名。
    [![](../../images/OIDC/authentication-configuration.png)](../../images/OIDC/authentication-configuration.png)

8. 设置以下授权配置。
    [![](../../images/OIDC/authorization-configuration.png)](../../images/OIDC/authorization-configuration.png)

您已经成功创建了一个身份验证自建应用程序。

### (选项 3) Keycloak OIDC 客户端

1. 按照[本指南](https://aws-samples.github.io/keycloak-on-aws/zh/implementation-guide/deployment/){target='_blank'} 在AWS中国区域部署 Keycloak 解决方案。
2. 确保您可以登录 Keycloak 控制台。
3. 在左侧导航栏，选择 **Add Realm**。如果您已经有一个 Realm，请跳过此步骤。
4. 进入领域设置页面。选择 **Endpoints**，然后从列表中选择 **OpenID Endpoint Configuration**。

    [![](../../images/OIDC/keycloak-example-realm.jpg)](../../images/OIDC/keycloak-example-realm.jpg)

5. 在浏览器打开的 JSON 文件中，记录 **issuer** 值，以备后面使用。

    [![](../../images/OIDC/OIDC-config.jpg)](../../images/OIDC/OIDC-config.jpg)

6. 返回Keycloak控制台，在左侧导航栏选择**Clients**，然后选择**Create**。
7. 输入客户 ID，必须包含 24 个字母（不区分大小写）或数字。记录 **Client ID**，以备后面使用。
8. 更改Client设置，在 **Valid Redirect URIs** 处输入 `https://<Log Hub 控制台域名>`，在 **Web Origins** 输入 `*` 和 `+`。如下图所示：
   
    [![](../../images/OIDC/keycloak-client-setting.jpg)](../../images/OIDC/keycloak-client-setting.jpg)

9. 在 Advanced Settings 中, 请把 Access Token Lifespan 的值设置为5分钟或更长时间。

     [![](../../images/OIDC/keycloak-access-token-setting.png)](../../images/OIDC/keycloak-access-token-setting.png)

10. 选择左侧导航栏的 **Users**。
11. 点击 **Add user**，并输入 **username**。
12. 创建用户后，选择**Credentials**，输入**Password**。

`Issuer` 的值的格式为 `https://<KEYCLOAK_DOMAIN_NAME>/auth/realms/<REALM_NAME>`。

### (选项 4) 使用 ADFS OpenID Connect

1. 确保您的 ADFS 已安装，您可以按照 [本指南](https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/deployment/ad-fs) 了解如何安装 ADFS -部署指南）。
2. 确保您可以登录到 ADFS 登录页面。 URL 应为“https://adfs.domain.com/adfs/ls/idpinitiatedSignOn.aspx”，将 **adfs.domain.com** 替换为您的真实 ADFS 域。

    ![](../../images/OIDC/adfs-1.png)

3. 登录您的**域控制器**，打开**Active Directory 用户和计算机**。
4. 为 Log Hub 用户创建一个**安全组**，将您计划的 Log Hub 用户添加到此安全组。

    ![](../../images/OIDC/adfs-2.png)

5. 登录 ADFS 服务器，打开 **ADFS 管理**。

    ![](../../images/OIDC/adfs-3.png)

6. 右击**Application Groups**，点击**Application Group**，输入Application Group的名称，如LogHub。在**Client-Server Applications**下选择**Web browser access a web application**选项 ， 点击**下一步**。

    ![](../../images/OIDC/adfs-4.png)

7. 记录下此窗口中的 **Client Identifier** (`client_id`)，在 **Redirect URI** 下，输入您的 Log Hub 域名（例如，`loghub.domain.com`），然后单击 **添加** ，然后单击**下一步**。

    ![](../../images/OIDC/adfs-5.png)

8. 在 **Choose Access Control Policy** 窗口中，选择 **Permit specific group**，单击 Policy 部分下的 **parameters**，添加在第 4 步中创建的安全组，然后单击 **下一步**（您也可以根据您的要求配置其他访问控制策略）。

    ![](../../images/OIDC/adfs-6.png)

9. 在摘要窗口下，单击**下一步**，然后单击**关闭**。
10. 在 ADFS 服务器上打开 Windows PowerShell，并运行以下命令来配置 ADFS 以允许对您计划的 LogHub URL 进行 CORS。

    ```shell
    Set-AdfsResponseHeaders -EnableCORS $true
    Set-AdfsResponseHeaders -CORSTrustedOrigins https://<your-loghub-domain>
    ```

11. 在 ADFS 服务器上的 Windows PowerShell 下，运行以下命令获取 ADFS 的颁发者（`issuer`），类似于`https://adfs.domain.com/adfs`。

    ```shell
    Get-ADFSProperties | Select IdTokenIssuer
    ```

     ![](../../images/OIDC/adfs-9.png)



## 步骤 2. 启动堆栈

!!! important "Important"

    在一个 AWS 账户的一个区域中，您只能部署一个 Log Hub solution的堆栈。
    如果您在部署中碰到了错误，比如没有满足[前提条件](./index.md)， 请确保您删除了失败的堆栈，然后再重试部署。

1. 登录 AWS 管理控制台并使用下面的按钮启动 `log-hub` AWS CloudFormation 模板。

    |                     | Launch in AWS Console                                        |
    |---------------------| ------------------------- |
    | 在海外区域新的 VPC 中部署 | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubWithOIDC.template){target=_blank} |
    | 在海外区域现有的 VPC 中部署 | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubFromExistingVPCWithOIDC.template){target=_blank} |
    | 在中国区域新的 VPC 中部署 | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubWithOIDC.template){target=_blank} |
    | 在中国区域现有的 VPC 中部署 | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LogHubFromExistingVPCWithOIDC.template){target=_blank} |


2. 登录控制台后，模板在默认区域启动。要在不同的 AWS 区域中启动 Log Hub 解决方案，请使用控制台导航栏中的区域选择器。
3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。
4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。有关命名字符限制的信息，请参阅 [IAM 和 STS 限制](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html){target='_blank'} 中的 *AWS Identity and Access Management 用户指南*。
5. 在 **参数** 部分，查看模板的参数并根据需要进行修改。此解决方案使用以下默认值。

      - 如果从新的 VPC 中部署, 此解决方案使用以下默认值:

    |参数 |默认 |说明 |
    | ---------- | ---------------- | -------------------------------------------------- ---------- |
    | OidcClientId | `<需要输入>` | OpenId 连接器客户端 ID。 |
    | OidcProvider | `<需要输入>` | OpenId 连接器提供者发行者。发行者必须以 `https://` | 开头。
    | Domain | `<需要输入>` | Log Hub 控制台的自定义域。切记不要添加 `http(s)` 前缀。 |
    | IamCertificateID | `<需要输入>` | IAM 中 SSL 证书的 ID。 ID 由 21 个大写字母和数字字符组成。您可以使用 [`list-server-certificates`](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates){target='_blank'} 命令检索 ID。 |

      - 如果从现有的 VPC 中部署, 此解决方案使用以下默认值:

    |参数 |默认 |说明 |
    | ---------- | ---------------- | -------------------------------------------------- ---------- |
    | OidcClientId | `<需要输入>` | OpenId 连接器客户端 ID。 |
    | OidcProvider | `<需要输入>` | OpenId 连接器提供者发行者。发行者必须以 `https://` | 开头。
    | Domain | `<需要输入>` | Log Hub 控制台的自定义域。切记不要添加 `http(s)` 前缀。 |
    | IamCertificateID | `<需要输入>` | IAM 中 SSL 证书的 ID。 ID 由 21 个大写字母和数字字符组成。您可以使用 [`list-server-certificates`](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates){target='_blank'} 命令检索 ID。 |
    | VPC ID | `<需要输入>` | 选择现有的VPC。 |
    | Public Subnet IDs | `<需要输入>` | 从现有的 VPC 中选择2个公有子网。 |
    | Private Subnet IDs | `<需要输入>` | 从现有的 VPC 中选择2个私有子网。 |

7. 选择**下一步**。
8. 在 **配置堆栈选项** 页面上，选择 **下一步**。
9. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。
10. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。您应该会在大约 15 分钟内收到 **CREATE_COMPLETE** 状态。

## 步骤 3. 配置 DNS 解析

此解决方案预置 CloudFront 分配，让您可以访问 Log Hub 控制台。

1. 登录 [AWS CloudFormation 控制台](https://console.aws.amazon.com/cloudformation/){target='_blank'}。
2. 选择解决方案的堆栈。
3. 选择**输出**选项卡。
4. 获取**WebConsoleUrl** 作为解析地址。
5. 在 DNS 解析器中创建 CNAME 记录，指向该解析地址。

## 步骤 4. 登录控制台

!!! important "重要"

    您的登录凭据（用户名和密码）由 OIDC 提供商管理。 在登录 Log Hub 控制台之前，请确保您已在 OIDC 提供商的用户池中创建了至少一个用户。

1. 使用网页浏览器打开DNS解析器中创建的CNAME记录。
2. 选择 **登录 Log Hub**，然后导航到 OIDC 提供商。
3. 输入用户名和密码。 您可能会被要求更改首次登录的默认密码，这取决于您的 OIDC 提供商的政策。
4. 验证完成后，系统打开 Log Hub 网页控制台。

后续操作：登录 Log Hub 控制台之后，您可以 [导入 AOS 域](../domains/import.md) 并构建日志分析管道。

[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[openid-connect]: https://openid.net/connect/
[authing]: https://www.authing.cn/
[keycloak]: https://www.keycloak.org/
[auth0]: https://auth0.com/
[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
[icp]: https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su
[keycloak-solution]: https://github.com/aws-samples/keycloak-on-aws