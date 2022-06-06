# Nginx
Nginx 能够将 [错误和访问日志] [nginx-logs] 文件写入本地目录。 您可以配置 Log Hub 以摄取 Nginx 日志。

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个 Nginx 日志配置

1. 登录 Log Hub 控制台。
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

9. 点击 **创建**.

## 步骤 2: 创建一个日志摄入

{%
  include-markdown "create-log-ingestion.md"
  start="<!--ig-start-->"
  end="<!--eks-end-->"
%}

## 步骤 3: 查看 Nginx 服务器日志仪表板

对于 Nginx 日志，Log Hub 会创建一个内置的示例仪表板。

1. 在浏览器中打开 OpenSearch 仪表板。
2. 转到左侧边栏中的**仪表板**部分。
3. 找到名称以`<the-application-pipeline>`开头的仪表板。

## 示例仪表板

[![nginx-1]][nginx-1]
[![nginx-2]][nginx-2]

[nginx-1]: ../../images/dashboards/nginx-1.png
[nginx-2]: ../../images/dashboards/nginx-2.png


[nginx-logs]: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/