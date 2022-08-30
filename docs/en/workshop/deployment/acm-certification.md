# Import SSL certificate into ACM
> Estimated time: 2 minutes

In this section, you will import an SSL certificate into ACM. An ACM certificate is needed to create a proxy to access the OpenSearch Dashboards. 
We recommended you to use your own domain and certificate. In this workshop, for your convenience, we have generated the certificate for you using [Let's encrypt](https://letsencrypt.org/). Follow
the instruction below to import it into ACM.  

1. Go to [AWS Certificate Manager Console](https://console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list){target="_blank"}.
2. Select **Import** on the right-upper corner.
3. Download the [cert.pem](https://aws-gcr-solutions-assets.s3.amazonaws.com/log-hub-workshop/cert.pem), open with text editor and copy to fill in **Certificate body**.
4. Download the [privkey.pem](https://aws-gcr-solutions-assets.s3.amazonaws.com/log-hub-workshop/privkey.pem), open with text editor and copy to fill in **Certificate private key**.
5. Download the [chain.pem](https://aws-gcr-solutions-assets.s3.amazonaws.com/log-hub-workshop/chain.pem), open with text editor and copy to fill in **Certificate chain**.
6. Click **Next**, **Next** and **Import**. 

If you see the certification shows **Issued**, it means certification successfully imported.
![](../../images/workshop/certification-success.png)
