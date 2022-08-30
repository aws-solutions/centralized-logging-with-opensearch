# Ingest EKS Pod Logs via Log Hub Console

## Create Nginx log config

1. Go to **Log Hub Console**, choose **Log Config** on the left most side of the page

2. Click **Create a log config**, type in the **Config Name** like: `nginx-config`.

3. Choose the log type as **`Nginx`**.

4. Copy paste the following log format in **Log Format** text box: 
```
log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
'$status $body_bytes_sent "$http_referer" '
'"$http_user_agent" "$http_x_forwarded_for"';
```

5. Copy and paste the following sample log into the **Sample Log** box:
     ```
     127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
     ```
     Click **Parse Log**

5. Click **Save**.

We have successfully created a multi-line Spring Boot log config.

## Import an EKS Cluster

1. Go to the **Log Hub Console**.
2. In the left sidebar, under **Log Source**, choose **EKS Cluster**.
3. Click the **Import a Cluster** button.
4. Choose the **loghub-workshop-eks**.
5. Select **DaemonSet** as logging agent's deployment pattern. 
6. Choose **Next**.
7. Choose the AOS domain as **workshop-os**.
8. Configure the Network the EKS cluster and OpenSearch
    - During the [pre-requisites](../deployment/create-eks.md), we have created the EKS in the same VPC of OpenSearch. So, we can skip the VPC peering in this workshop. But we still need to update the security group.
    - Go to [AWS Console > OpenSearch](https://us-east-1.console.aws.amazon.com/esv3/home?region=us-east-1#opensearch/domains/workshop-os){target="_blank"}
    - Copy the value of `Security group`. Then click the security group to view details
          ![eks-network-sg](../../images/workshop/eks-network-sg.png)
    - Edit the inbound rule of the security group
          ![eks-network-sg2](../../images/workshop/eks-network-sg2.png)
    - Allow `All Traffic` from the `Security group` you copied above. Save the rules
          ![eks-network-sg3](../../images/workshop/eks-network-sg3.png)
    - Go back to the Log Hub console, and check the checkbox that you have completed the "Network Configuration".
9. Choose **Next**.
10. Choose **Create**.

    ![](../../images/workshop/eks-log-import.png)

## Create eks pod log ingestion
1. Click the EKS Cluster **loghub-workshop-eks** that has been imported above.
2. Go to **App Log Ingestion** tab and click **Create an Ingestion**.
![](../../images/workshop/eks-ingestion-1.png)
3. In Specify Pipeline Settings page, Select **Create new**
    * Index Prefix: **`eks-nginx`**
    * Click **Next**
4. In Specify log config page:
5. Type in the following log path:
```
/var/log/containers/app-nginx-demo*nginx-ns*
```
     And 
    * Select **nginx-config** from Log Config dropdown.
    * Click **Next**
6. Click **Create**
7. Wait the App Log Ingestion Status as **Created**

    ![](../../images/workshop/eks-ingestion-2.png)


## Deploy fluent-bit agent to EKS
!!! Warning "Waring"

    Please follow the workshop guide to deploy the fluent-bit agent

1. Click the **DaemonSet Guide** tab

    ![](../../images/workshop/eks-fluent-bit-1.png)

2. Deploy fluent-bit log agent as DaemonSet
    * Go to the Cloud9 workspace created in [Pre-request](../deployment/create-eks.md#create-a-workspace)
    * Create a file **fluent-bit-logging.yaml** and copy&paste the yaml generated in LogHub console
    * run the command below in terminal
```commandline
kubectl apply -f fluent-bit-logging.yaml
```
3. Make sure your fluent-bit is running
```commandline
kubectl get pods -n logging
```
![](../../images/workshop/eks-fluent-bit-2.png)

## Generate Nginx Pod Logs

1. Run the command, and you will find the load balancer at **LoadBalancer Ingress** in response
```commandline
kubectl describe service nginx-service -n nginx-ns
```
   ![](../../images/workshop/eks-generatelog-1.png)

2. In a browser, enter the load balancer address, and you should see **Welcome to nginx**

    ![eks-nginx-log-1](../../images/workshop/eks-nginx-log-1.png)

This will generate access log. Feel free to generate more by refreshing the page.

## View the Nginx Log Dashboard

We can now leave the website behind and go to OpenSearch Dashboard to take a peek.

1. Open the Dashboard page in your browser.

2. Go to the location shown in the graph below, you can find the RDS dashboard have already been imported for you, which name is `eks-nginx-dashboard`. Click it and you can view all the details by yourself:
![](../../images/workshop/view-dashboard.png)

The dashboard should look like this:
![](../../images/workshop/eks-nginx-dashboard.png)

We have completed all the steps of creating an eks pod log pipeline.