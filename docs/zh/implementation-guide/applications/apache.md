# Apache HTTP 服务器日志
Apache HTTP Server (httpd) 能够将 [错误和访问日志] [apache-http-logs] 文件写入本地目录。 您可以配置日志通摄取 Apache HTTP 服务器日志。

## 前提条件
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个 Apache HTTP 服务器日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `, ` 分隔多个路径。
6. 在日志类型下拉菜单中选择**Apache HTTP 服务器**。
7. 在 **Apache Log Format** 部分，粘贴您的 Apache HTTP 服务器日志格式配置。 它的格式为`/etc/httpd/conf/httpd.conf`，以`LogFormat`开头。

    如:
    ```
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    ```

8. （可选）在 **示例日志解析** 部分，粘贴示例 Apache HTTP 服务器日志以验证日志解析是否成功。

    如:
    ```
    127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"
    ```

9. 选择**创建**。


## 步骤 2: 创建一个日志摄入

{%
   include-markdown "create-log-ingestion.md"
   start="<!--ig-start-->"
   end="<!--eks-end-->"
%}

## 步骤 3: 查看 Apache HTTP 服务器日志仪表板
对于 Apache HTTP 服务器日志，日志通将创建一个内置的示例仪表板。

1. 在浏览器中打开 OpenSearch 仪表板。
2. 转到左侧边栏中的**仪表板**部分。
3. 找到名称以`<the-application-pipeline>`开头的仪表板。

## 示例仪表板

[![nginx-1]][nginx-1]
[![nginx-2]][nginx-2]


[nginx-1]: ../../images/dashboards/nginx-1.png
[nginx-2]: ../../images/dashboards/nginx-2.png

[apache-http-logs]: https://httpd.apache.org/docs/2.4/logs.html



