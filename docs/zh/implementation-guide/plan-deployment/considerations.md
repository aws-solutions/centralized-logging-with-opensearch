# 考虑因素

## 可部署区域
此解决方案使用的服务目前可能并非在所有 AWS 区域都可用。请在提供所需服务的 AWS 区域中启动此解决方案。有关按区域划分的最新可用性，请参阅 [AWS 区域服务列表][services]。

日志通提供两种类型的身份验证，使用 [Cognito 用户池](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) 或
使用 [OpenID Connect (OIDC) 提供者](https://openid.net/connect/)。 针对以下两种情况中的任何一种，您需要选择使用 OpenID Connect 启动解决方案：

- 您的 AWS 区域没有 Cognito 用户池。
- 您已经有一个 OpenID Connect 认证中心，同时也希望使用它进行认证。

**支持部署的区域**

| 区域名称           | 使用 Cognito User Pool                  | 使用 OpenID Connect                     |
|----------------|---------------------------------------|---------------------------------------|
| 美国东部 (弗吉尼亚北部)  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 美国东部 (俄亥俄)     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 美国西部 (加利福尼亚北部) | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 美国西部 (俄勒冈)     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 非洲 (开普敦)       | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 亚太地区 (香港)      | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 亚太地区 (雅加达)     | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| 亚太地区 (孟买)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太地区 (大阪)      | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| 亚太地区 (首尔)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太地区 (新加坡)     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太地区 (悉尼)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太地区 (东京)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 加拿大 (中部)       | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲 (法兰克福)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲 (爱尔兰)       | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲 (伦敦)        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲 (米兰)        | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 欧洲 (巴黎)        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲 (斯德哥尔摩)     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 中东 (巴林)        | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| 南美洲 (圣保罗)      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 中国 (北京)        | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |
| 中国 (宁夏)        | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  |

## 重要提示

- 一个区域中只能有一个活动的日志通解决方案堆栈。 如果您的部署失败，请确保在重试部署之前已删除失败的堆栈。


[services]: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?nc1=h_ls