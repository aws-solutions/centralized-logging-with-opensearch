# Import AOS domain
> Estimated time: 2 minutes

Log Hub solution is built on top of Amazon OpenSearch Service. In this section, you will import an existing OpenSearch domain. 

1. In the navigation panel, under **Clusters**, choose **Import OpenSearch Domain**.
![](../../images/workshop/web-console.png)
2. On **Select domain** page, choose a domain from the dropdown list. The dropdown list will only list domain in the same region as the Log Hub solution using VPC.

      We choose **workshop-os**, which is the OpenSearch we created in Deployment section using CloudFormation.

3. Choose **Next**.
4. On **Configure network** page, under **Network creation**, 
   choose **Automatic**.
   ![](../../images/workshop/import-domain.png)
5. Choose **Next**.
6. We can skip the Tags now, choose **Import**.
7. We have successfully imported a OpenSearch Domain:
![](../../images/workshop/import-domain-success.png)

## What has been automatically done for me?

Firstly, a VPC peering connection is automatically established between your **Workshop-Demo-VPC** and your **LogHub-VPC**.

Secondly, security groups and detailed routing mechanisms are automatically inserted into your **Workshop-Demo-VPC**. 

!!! info Why we need to do VPC peering

      Let's take a look at the architecture for VPC peering:

      ![](../../images/domain/domain-vpc-peering.svg)

      As we can see, we need to peer the VPC which contains the log processors (10.255.0.0/16) with the OpenSearch VPC (10.0.0.0/16), and enable processors to go through the workshop demo VPC so as to process logs for us.