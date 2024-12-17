# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Iterator
from datetime import datetime, timedelta
from utils.helpers import logger, AWSConnection, iso8601_strftime


class WAFV2Client:
    """Amazon WAFV2 Client, used to interact with Amazon WAF."""

    def __init__(self, sts_role_arn="", region_name="us-east-1"):
        self.conn = AWSConnection()
        self._wafv2_client = self.conn.get_client(
            "wafv2", sts_role_arn=sts_role_arn, region_name=region_name
        )

    def list_web_acls(self, scope: str = "REGIONAL") -> Iterator[dict]:
        """Retrieves an array of WebACLSummary objects for the web ACLs that you manage.

        @see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/wafv2/client/list_web_acls.html

        :param scope (str): Specifies whether this is for an Amazon CloudFront distribution or for a regional application.

        """
        kwargs = dict(Scope=scope, Limit=100)

        next_marker = True

        while next_marker:
            response = self._wafv2_client.list_web_acls(**kwargs)
            if (
                response.get("NextMarker")
                and response["NextMarker"] != "Not Implemented"
            ):
                kwargs["NextMarker"] = response["NextMarker"]
            else:
                next_marker = False

            for web_acl in response.get("WebACLs", []):
                yield web_acl

    def get_web_acls_by_name(
        self, web_acl_names: list[str], scope: str = "REGIONAL"
    ) -> list[dict]:
        """Retrieves an array of WebACLSummary objects for the web ACLs that you manage by web ACLs name.

        :param web_acl_names (list[str]): The names of the web ACLs to retrieve.
        :param scope (str): Specifies whether this is for an Amazon CloudFront distribution or for a regional application.

        """
        web_acls = []
        for web_acl in self.list_web_acls(scope=scope):
            if web_acl["Name"] in web_acl_names:
                web_acls.append(web_acl)
        return web_acls

    def get_sampled_requests_by_acl_names(
        self, web_acl_names: list[str], scope: str = "REGIONAL", interval: int = 60
    ) -> Iterator[dict]:
        """Use WEB ACL name to retrieve the log of the Rule with SampledRequests enabled.

        :param web_acl_names (list[str]): The names of the web ACLs to retrieve.
        :param scope (str): Specifies whether this is for an Amazon CloudFront distribution or for a regional application.
        :param interval (int): The time interval for retrieving Sampled logs, in seconds.

        """
        web_acls = self.get_web_acls_by_name(web_acl_names, scope=scope)

        for web_acl in web_acls:
            response = self._wafv2_client.get_web_acl(
                Name=web_acl["Name"],
                Scope=scope,
                Id=web_acl["Id"],
            )

            rules = [response["WebACL"]]
            rules.extend(response["WebACL"]["Rules"])
            if len(rules) == 0:
                logger.info("No metrics found for %s", web_acl["Name"])
                return []

            for rule in rules:
                if rule["VisibilityConfig"]["SampledRequestsEnabled"]:
                    # Delay for 5 minute + interval
                    response = self._wafv2_client.get_sampled_requests(
                        WebAclArn=web_acl["ARN"],
                        RuleMetricName=rule["VisibilityConfig"]["MetricName"],
                        Scope=scope,
                        TimeWindow={
                            "StartTime": datetime.now()
                            - timedelta(seconds=300 + interval),
                            "EndTime": datetime.now() - timedelta(seconds=300),
                        },
                        MaxItems=500,
                    )

                    for req in response["SampledRequests"]:
                        req["Timestamp"] = iso8601_strftime(
                            req["Timestamp"],
                            precision=6,
                        )
                        req["WebAclName"] = web_acl["Name"]
                        req["WebAclArn"] = web_acl["ARN"]
                        req["WebAclId"] = web_acl["Id"]
                        yield req
