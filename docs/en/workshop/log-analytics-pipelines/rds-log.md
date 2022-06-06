## RDS/Aurora MySQL Logs
> Estimated time: 10 minutes

In this section, we will describe how to ingest logs from Amazon RDS into Amazon OpenSearch service and build up 
visualization dashboards. By following the steps, Log Hub will create the architecture in your AWS account:
![](../../images/workshop/rds-arch-2.png)

1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
   ![](../../images/workshop/create-service-log.png)
4. In the **AWS Services** section, choose **Amazon RDS**.
5. Choose **Next**.
6. Under **Specify logs settings**, choose **Automatic**.
7. Choose the RDS cluster from the dropdown list.
   We choose **`MySQL-workshop-db`**.
   ![](../../images/workshop/rds-specify-settings.png)
   Make sure you select the **Audit log** option!
9. Choose **Next**.
10. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**. Remain the other part of the page unchanged.
11. Choose **Next**.
12. Choose **Create**.

You can view the status of the stack in the LogHub Web console.

Status column shows **creating** means that the log pipeline is being created. 

!!! info "Hold on!"  
      Please wait until the status change to **"Active"** before proceeding.

## Generate slow query logs

Now we can go to the Workshop Demo Website and start creating some RDS logs.

Firstly, go back to Workshop Demo Website home again, we can see three products listed on the Website. We click the **View Detail** button under **Funny Moto**.

![](../../images/workshop/generate-slow-query-log.png)

**Notice that:** The product details will show up very slowly. Because we are generating slow query logs here.

That's what we expected, because we are generating slow query logs now. 

## View RDS Log Dashboard

We can now leave the website behind and go to OpenSearch Dashboard to take a peek.

1. Open the Dashboard page in your browser.

2. Go to the location shown in the graph below, you can find the RDS dashboard have already been imported for you, which name is `workshop-db-rds-dashboard`. Click it and you can view all the details by yourself:
![](../../images/workshop/view-dashboard.png)

The RDS dashboard should look like this:
![](../../images/workshop/rds-dashboard.png)

Congratulations! We have created the service log pipeline for RDS successfully.
