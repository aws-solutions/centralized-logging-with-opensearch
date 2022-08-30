# Create proxy
> Estimated time: 15 minutes

!!! Note "Note"

     Please make sure you have finished the section [Deployment > Pre-requisites](../deployment/must-read.md) of this workshop guide before proceeding.

By default, Amazon OpenSearch domain within VPC cannot be access from the Internet. There are a couple of ways to 
access the built-in dashboard of OpenSearch using VPC. In Log Hub solution, you can deploy a Nginx based proxy to allows
public access to the OpenSearch domain. The following is the architecture diagram:

![](../../images/architecture/proxy.svg)

## Create a proxy
1. In the navigation pane, under **Clusters**, choose **OpenSearch domains**.
2. Select the domain from the table.
3. Under **General configuration**, choose **Enable** at the **Access Proxy** label.
    ![](../../images/workshop/proxy-enable.png)
4. On the **Create access proxy** page, under **Public access proxy**, you must **select TWO** subnets for **Public Subnets**, named **`LogHubVPC/DefaultVPC/publicSubnet1`** and **`LogHubVPC/DefaultVPC/publicSubnet2`**.

5. Choose a Security Group of the ALB in **Public Security Group**, named **`LogHub-ProxySecurityGroup-xxx`**.
6. Input the following **Domain Name**: 
```
fakename.workshop.log-hub.solutions.aws.dev
```

    **Notice that:** This Domain Name is a fake one and we will do nothing for it in this workshop. For real use case, customers will need to enter a real Domain name, which will be used to grant access via public.

7. Choose the associated **Load Balancer SSL Certificate** which applies to the domain name.

8. Choose the **Nginx Instance Key Pair Name**. And check if the page looks like this graph below:
    ![](../../images/workshop/proxy-create.png)
9. Choose **Create**.
    ![](../../images/workshop/proxy-creating.png)
The above shows that proxys are creating now! 

It will take 10 minutes to fully deploy the proxy, so please wait until the creating status changes to a link like that:

![](../../images/workshop/proxy-link.png)

So, please **do not proceed** until it's done.

!!! Note Note
    Please do not click the **Link**. We will access the proxy through ALB directly in the next section. 