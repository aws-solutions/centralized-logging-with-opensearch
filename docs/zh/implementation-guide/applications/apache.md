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

## 查看仪表板

该仪表板包含以下可视化内容。

| Visualization Name  | 数据来源字段 | 描述 |
| ------------------- | --- | --- |
| Total Request | 日志事件 | 在指定的时间间隔内显示汇总的事件。 |
| Status Codes | status | 显示 Apache Web 服务器在选定时间段内提供的 HTTP 响应代码的分布。 |
| Access History | 日志事件 | 显示 Apache Web 服务器处理的所有请求的历史日志，通过条形图进行可视化。这使管理员能够随时间分析流量量和模式。 |
| Unique Visitors | remote_addr | 提供从同一 IP 地址重复访问 Apache 服务器的用户或设备总数的估计。 |
| Status Code Metric | status | 显示 Apache 服务器在一段时间内提供的 HTTP 响应代码的分布。 |
| Top Access Paths | request_uri | 显示选定时间段内 Apache 服务器上最常请求的 URL。 |
| Top Client IPs | <ul><li>response_size_bytes</li><li>remote_addr</li></ul> | 显示在选定时间段内由 Apache 服务器接收到最多请求数的前 10 个源 IP 地址。 |
| Bandwidth | response_size_bytes | 跟踪从 Apache 服务器到客户端传输的数据量，选定时间段内。 |
| Top Agents | http_user_agent | 提供访问者的概要。这些数据指导了更好地服务核心受众的决策。 |
| Http Methods | request_method | 呈现一个饼图，显示 Apache 服务器在选定时间段内处理的请求方法的分布。 |
| Top Access URIs | request_uri | 显示在选定时间段内 Apache 处理的最常命中的 URI 路径。 |
| Top Referers | http_referer | 引荐者是链接到应用程序请求的页面的 URL。跟踪引荐者揭示了访问和参与的主要外部来源。 |
| Bandwidth History | response_size_bytes | 显示 Apache 服务器向客户端传输数据的历史趋势。 |
| Apache Error Log | <ul><li> status</li><li>request_uri</li><li>request_method</li><li>http_referer</li><li>response_size_bytes</li><li>http_user_agent</li><li>remote_addr</li></ul> | 提供 Web 服务器遇到的错误的详细记录。 |
| Apache Log Examples | <ul><li> @timestamp</li><li>_index</li><li>http_user_agent</li><li>remote_addr</li><li> status</li><li>request_method</li><li>request_uri</li><li>response_size_bytes</li><li>request_protocol</li><li>file_name</li><li>http_referer</li><li>remote_user</li></ul> | 用于解释 Apache 访问和错误日志的快速入口。 |

### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![apache]][apache]

[apache]: ../../images/dashboards/apache.png

[apache-http-logs]: https://httpd.apache.org/docs/2.4/logs.html



