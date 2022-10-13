# Considerations

## Regional deployments
This solution uses services which may not be currently available in all AWS Regions. Launch this solution in an AWS Region where required services are available. For the most current availability by Region, refer to the [AWS Regional Services List][services]. 

Log Hub provides two types of authentication, [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [OpenID Connect (OIDC) Provider](https://openid.net/connect/). You need to choose to launch the solution with OpenID Connect if one of the following cases occurs:

- Cognito User Pool is not available in your AWS region.
- You already have an OpenID Connect Provider.

**Supported regions for deployment**

| Region Name                               | Launch with Cognito User Pool         | Launch with OpenID Connect            |
|-------------------------------------------|---------------------------------------|---------------------------------------|
| US East (N. Virginia)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US East (Ohio)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US West (N. California)                   | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US West (Oregon)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Africa (Cape Town)                        | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Hong Kong)                  | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
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
| Europe (Milan)                            | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Europe (Paris)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Stockholm)                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Middle East (Bahrain)                     | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| South America (Sao Paulo)                 | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| China (Beijing) Region Operated by Sinnet | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| China (Ningxia) Regions operated by NWCD  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |


## Restrictions

- You can have only one active Log Hub solution stack in one region. If your deployment failed, make sure you have deleted the failed stack before retrying the deployment.

[services]: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?nc1=h_ls
