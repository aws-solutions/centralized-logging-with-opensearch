# Nginx
Nginx 能够将 [错误和访问日志] [nginx-logs] 文件写入本地目录。 您可以配置日志通以摄取 Nginx 日志。

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个 Nginx 日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**Nginx**。
7. 在**Nginx Log Format**部分，粘贴你的Nginx日志格式配置，格式为`/etc/nginx/nginx.conf`，以`log_format`开头。

    如:
       ```
       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
       '$status $body_bytes_sent "$http_referer" '
       '"$http_user_agent" "$http_x_forwarded_for"';
       ```

8. （可选）在**示例日志解析**部分，粘贴一个Nginx示例日志以验证日志解析是否成功。

    如:
    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. （可选）在**过滤器**部分，您可以在日志代理端启用并添加一些条件来过滤日志。日志通解决方案将仅收集符合所有指定条件的日志。

10. 点击 **创建**.

## 步骤 2: 创建一个日志摄入

{%
  include-markdown "create-log-ingestion.md"
  start="<!--ig-start-->"
  end="<!--eks-end-->"
%}

## 步骤 3: 查看 Nginx 服务器日志仪表板

对于 Nginx 日志，日志通会创建一个内置的示例仪表板。

1. 在浏览器中打开 OpenSearch 仪表板。
2. 转到左侧边栏中的**仪表板**部分。
3. 找到名称以`<the-application-pipeline>`开头的仪表板。

## 查看仪表板

仪表板包括以下可视化内容。

| 图表名称 | 源字段                                                                                                                                                                                     | 描述                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests     | <ul><li> log event </li></ul>                                                                                                                                                              | 基于指定的时间间隔显示聚合事件。                                                                                                                                           |
| Http Method        | <ul><li> request_method </li></ul>                                                                                                                                                         | 使用管道图显示 Nginx 在选定时间段内处理的请求方法的分布。                                                                                                                  |
| Request History    | <ul><li> log event</li></ul>                                                                                                                                                               | 使用条形图显示 Nginx 处理的所有请求的历史日志。这允许管理员分析流量量和模式。                                                                                               |
| Unique Visitors    | <ul><li> remote_addr</li></ul>                                                                                                                                                             | 显示在给定时间段内对应用程序进行请求的不同 IP 地址的数量。                                                                                                                 |
| Bandwidth          | <ul><li> body_bytes_sent</li></ul>                                                                                                                                                         | 带宽指标跟踪 Nginx 服务器在一段时间内向客户端传输的数据总量。                                                                                                              |
| Status Code Metric | <ul><li> status</li></ul>                                                                                                                                                                  | 显示 Nginx 服务器在一段时间内提供的 HTTP 响应代码的分布。                                                                                                                 |
| Status Code        | <ul><li>status</li></ul>                                                                                                                                                                   | 与总响应数量相对的每个状态代码的比例也显示为百分比。这使得容易识别主导的响应类型。                                                                                         |
| Bandwidth History  | <ul><li> body_bytes_sent</li></ul>                                                                                                                                                         | 显示 Nginx 服务器到客户端的数据传输活动的历史趋势。                                                                                                                       |
| Top IPs            | <ul><li>body_bytes_sent</li><li>remote_addr</li></ul>                                                                                                                                      | 显示在指定时间段内向应用程序生成最多请求的前10个客户端 IP 地址。                                                                                                          |
| Top Referers       | <ul><li> http_referer</li></ul>                                                                                                                                                            | 引荐者是链接到应用程序请求的页面的 URL。跟踪引荐者揭示了主要的外部访问和参与来源。                                                                                        |
| Top User Agents    | <ul><li> http_user_agent</li></ul>                                                                                                                                                         | 显示产生流量的客户端浏览器和设备类型的分解。                                                                                                                               |
| Top Access URL     | <ul><li> remote</li><li> method </li></ul>                                                                                                                                                 | 显示在指定时间段内应用程序上最常请求的 URL。                                                                                                                               |
| Nginx Error Log    | <ul><li> @timestamp</li><li> status </li><li> remote_addr </li><li> request_uri </li><li> request_method </li><li> http_referer </li><li> body_bytes_sent </li><li> http_user_agent </li></ul> | 提供 web 服务器遇到的错误的详细记录。                                                                                                        |

### 样本仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![nginx-1]][nginx-1]

[nginx-1]: ../../images/dashboards/nginx-1.png

[![nginx-2]][nginx-2]

[nginx-2]: ../../images/dashboards/nginx-2.png

[nginx-logs]: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
