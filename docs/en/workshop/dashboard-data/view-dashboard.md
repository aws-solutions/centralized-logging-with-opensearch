# View dashboard

We have successfully finished all the steps before viewing the dashboards.

Now, let's explore the OpenSearch dashboard. Please open up the OpenSearch Dashboard we previously logged in.

1. On the Log Hub console, select the **OpenSearch Domains** on the left navigation bar.
2. Select the domain you have imported.
3. Click the **Link** in General **configuration > Access Proxy**.
4. Double-check your tenant by click the little circle on the right upper corner, select **Switch tenants**.
![](../../images/workshop/tenant.png)
Check if **Global** is selected, then click **Confirm**.

5. Now you can go and play with your dashboard, go to the location shown in the graph below, you can find several dashboards have already been imported for you. Click each one of them, and you can view all the details by yourself:
![](../../images/workshop/view-dashboard.png)

Let's see one example dashboard, the elb sample dashboard.
Select **workshop-elb-dashboard** and change the time range, we can see elb logs has been streamed into OpenSearch already:
![](../../images/workshop/elb-dashboard.png)
There are several metrics we can see, for example: we can see detailed number of total sent bytes and received bytes. 

Operation engineers can extract useful information out of it and adjust their business architecture.

For BI team, let's see the **Top Request URLs** block, we can easily find out which product was the most viewed product in their website.

The above only gives you a possible way of using the sample OpenSearch Dashboard. Customers with specific demand can even customize their own dashboard to get business insights.

Now, you can continue play around inside the dashboard and our workshop is reaching the end.
