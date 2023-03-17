# Domain Operations
 
Once logged into the Centralized Logging with OpenSearch console, you can import an Amazon OpenSearch Service domain. 

## Prerequisite

1. Centralized Logging with OpenSearch supports Amazon OpenSearch Service, engine version Elasticsearch 7.10 or later, and engine version OpenSearch 1.0 or later.
2. Centralized Logging with OpenSearch supports OpenSearch clusters within VPC. If you don't have an Amazon OpenSearch Service domain yet, you can create an Amazon OpenSearch Service domain within VPC. See [Launching your Amazon OpenSearch Service domains within a VPC][vpc].
3. Centralized Logging with OpenSearch supports OpenSearch clusters with [fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html) only. In the security configuration, the Access policy should look like the image below:
   ![](../../images/domain/policy.png)

## Import an Amazon OpenSearch Service Domain

1. Sign in to the Centralized Logging with OpenSearch console.
2. In the left navigation panel, under **Domains**, choose **Import OpenSearch Domain**.
3. On the **Select domain** page, choose a domain from the dropdown list. The dropdown list will display only domains in the same region as the solution.
4. Choose **Next**.
5. On the **Configure network** page, under **Network creation**, choose **Manual** and click **Next**; or choose **Automatic**, and go to step 9.
6. Under **VPC**, choose a VPC from the list. By default, the solution creates a standalone VPC, and you can choose the one named `LogHubVpc/DefaultVPC`. You can also choose the same VPC as your Amazon OpenSearch Service domains.
7. Under **Log Processing Subnet Group**, select at least 2 subnets from the dropdown list. By default, the solution creates two private subnets. You can choose subnets named `LogHubVpc/DefaultVPC/privateSubnet1` and `LogHubVpc/DefaultVPC/privateSubnet2`.
8. Under **Log Processing Security Group**, select one from the dropdown list. By default, the solution creates one Security Group named `ProcessSecurityGroup`.
9. On the **Create tags** page, add tags if needed.
10. Choose **Import**.

## Set up VPC Peering

By default, the solution creates a standalone VPC. You need to create VPC Peering to allow the log processing layer to have access to your Amazon OpenSearch Service domains.

!!! Note "Note"
  
    Automatic mode will create VPC peering and configure route table automatically. You do not need to set up VPC peering again.

![](../../images/domain/domain-vpc-peering.svg)

Follow this section to create VPC peering, update security group and update route tables.

### Create VPC Peering Connection

1. Sign in to the Centralized Logging with OpenSearch console.
2. In the left navigation panel, under **Domains**, select **OpenSearch Domains**.
3. Find the domain you imported and select the domain name.
4. Choose the **Network** tab.
5. Copy the VPC ID in both sections **OpenSearch domain network** and **Log processing network**. You will create Peering Connection between these two VPCs.
6. Navigate to [VPC Console Peering Connections](https://console.aws.amazon.com/vpc/home#PeeringConnections).
7. Select the **Create peering connection** button.
8. On the **Create peering connection** page, enter a name.
9. For the **Select a local VPC to peer with, VPC ID (Requester)**, select the VPC ID of the **Log processing network**.
10. For the **Select another VPC to peer with, VPC ID (Accepter)**, select the VPC ID of the **OpenSearch domain network**.
11. Choose **Create peering connection**, and navigate to the peering connection detail page.
12. Click the **Actions** button and choose **Accept request**.

### Update Route Tables

1. Go to the Centralized Logging with OpenSearch console.
2. In the **OpenSearch domain network** section, click the subnet under **AZs and Subnets** to open the subnet console in a new tab.
3. Select the subnet, and choose the **Route table** tab.
4. Select the associated route table of the subnet to open the route table configuration page.
5. Select the **Routes** tab, and choose **Edit routes**.
6. Add a route `10.255.0.0/16` (the CIDR of Centralized Logging with OpenSearch, if you created the solution with existing VPC, please change this value) pointing to the Peering Connection you just created.
7. Go back to the Centralized Logging with OpenSearch console.
8. Click the VPC ID under the **OpenSearch domain network** section.
9. Select the VPC ID on the VPC Console and find its **IPv4 CIDR**.
10. On the Centralized Logging with OpenSearch console, in the **Log processing network** section, click the subnets under **AZs and Subnets** to open the subnets in new tabs.
11. Repeat step 3, 4, 5, 6 to add an opposite route. Namely, configure the IPv4 CIDR of the OpenSearch VPC to point to the Peering Connection. You need to repeat the steps for each subnet of Log processing network.

### Update Security Group of OpenSearch Domain

1. On the Centralized Logging with OpenSearch console, under the **OpenSearch domain network** section, select the Security Group ID in **Security Groups** to open the Security Group in a new tab.
2. On the console, select **Edit inbound rules**.
3. Add the rule `ALLOW TCP/443 from 10.255.0.0/16` (the CIDR of Centralized Logging with OpenSearch, if you created Centralized Logging with OpenSearch with existing VPC, change this value).
4. Choose **Save rules**.

## Remove an Amazon OpenSearch Service domain

If needed, you can remove the Amazon OpenSearch Service domains. 

!!! Important "Important"
    
    Removing the domain from Centralized Logging with OpenSearch will **NOT** delete the Amazon OpenSearch Service domain in your AWS account. It will **NOT** impact any existing log analytics pipelines.

1. Sign in to the Centralized Logging with OpenSearch console.
2. In the navigation pane, under **Domains**, choose **OpenSearch Domains**.
3. Select the domain from the table.
4. Choose **Remove**.
5. In the confirmation dialog box, choose **Remove**.


[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html 
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html

