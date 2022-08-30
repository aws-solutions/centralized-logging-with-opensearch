# 考虑因素

## 可部署区域
此解决方案使用的服务目前可能并非在所有 AWS 区域都可用。请在提供所需服务的 AWS 区域中启动此解决方案。有关按区域划分的最新可用性，请参阅 [AWS 区域服务列表][services]。

Log Hub 提供两种类型的身份验证，使用 [Cognito 用户池](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) 或
使用 [OpenID Connect (OIDC ) 提供者](https://openid.net/connect/)。 如果您满足以下条件，您需要选择使用 OpenID Connect 启动

- 对于缺少 Cognito 用户池的 AWS 区域。
- 您已经有一个 OpenID Connect 认证中心。

**支持部署的区域**

| Region Name                               | 使用 Cognito User Pool                  | 使用 OpenID Connect                     |
|-------------------------------------------|---------------------------------------|---------------------------------------|
| US East (N. Virginia)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US East (Ohio)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US West (N. California)                   | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US West (Oregon)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Africa (Cape Town)                        | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Hong Kong)                  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Jakarta)                    | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Mumbai)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Osaka)                      | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Seoul)                      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Singapore)                  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Sydney)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Tokyo)                      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Canada (Central)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Frankfurt)                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Ireland)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (London)                           | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Milan)                            | :material-close-thick:{ .icon_cross } |                                       |
| Europe (Paris)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Stockholm)                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Middle East (Bahrain)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| South America (Sao Paulo)                 | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| China (Beijing) Region Operated by Sinnet | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| China (Ningxia) Regions operated by NWCD  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |

## 限制

- 一个区域中只能有一个活动的 Log Hub 解决方案堆栈。 如果您的部署失败，请确保在重试部署之前已删除失败的堆栈。


[services]: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?nc1=h_ls