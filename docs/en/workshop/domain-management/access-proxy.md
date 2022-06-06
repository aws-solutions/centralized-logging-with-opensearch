# Access AOS via Proxy 
> Estimated time: 3 minutes

We have deployed proxys through UI in the previous section. Now, let's try to access the OpenSearch Dashboard through ALB DNS address.

1. Go to **Log Hub Console > OpenSearch Domains > workshop-os > Access Proxy**
2. Copy the **Load Balancer Domain** name: **`LogHu-LoadB-XXXXXXXXXX`**
    ![](../../images/workshop/find-lb.png)

    !!! Info "Note"  
        
        Please do not use the Domain name to access LogHub. In this workshop it will not work because we are entering a fake one. But for real customer cases, the domain name should be a real one.

3. Open a new tab in your browser, type in: **`https://<Your_Copied_Load_Balancer_Domain_Name>/_dashboards/`**. 

    The browser may warn you that the link you are going to is not secure. 
    Please just ignore the warning and choose the **Advanced** button.

    **The following graph is an example of Chrome**:
    ![](../../images/workshop/chrome-warning.png)
    Click the revealed URL. 

    **The following graph is an example of FireFox**:
    ![](../../images/workshop/fire-fox-2.png)
    Click **Accept the Risk and Continue**.

    !!! Note "Note"
        If you still can not access, please double check if you have disabled **Enhanced Protection** function in your browser.

        We have this warning issue because the url we are using is not resolved in Route53. This is a expected issue and will only occur in this workshop. For real use case, customers need to use a resolved domain name and valid certification to access the dashboard.

    Now we can start login the OpenSearch Dashboard!

4. The username is **`admin`** and password is **`Loghub@@123`**, which are both fixed, so just copy and paste.
5. You can now access the OpenSearch portal! Select **Global** on the popup window:
![](../../images/workshop/dashboard-global.png)
Then select **Explore on my own**，then you can see a blank dashboard since we have not generated access log yet:
![](../../images/workshop/on-my-own.png)

You have completed this part and successfully access the proxy server to view the OpenSearch Dashboard! 

Just leave the dashboard open and we will go back later.