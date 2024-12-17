# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from commonlib.logging import get_logger
import boto3
from datetime import datetime, timedelta


logger = get_logger(__name__)

cw_metric_map = {
    "m1": {"metric_name": "FreeStorageSpace", "stat": "Sum"},
    "m2": {"metric_name": "SearchableDocuments", "stat": "Maximum"},
    "m3": {"metric_name": "ClusterStatus.green", "stat": "Maximum"},
    "m4": {"metric_name": "ClusterStatus.yellow", "stat": "Maximum"},
    "m5": {"metric_name": "ClusterStatus.red", "stat": "Maximum"},
    "m6": {"metric_name": "ClusterIndexWritesBlocked", "stat": "Maximum"},
}


def get_metric_data(client: boto3.Session.client, domain_list, account_id):
    """Get FreeStorageSpace, SearchableDocuments, Cluster Health for a list of OpenSearch domains.

    There might be different ways to get the metrics, such as use OpenSearch REST API.
    Currently, we use Cloudwatch GetMetricData API to get the ES stats.

    The advantage is to use 1 API call to get all results for many domains.

    The disadvantage is that this can't support domains in different regions very well.

    Args:
        client (boto3.Session.client) : Default boto3 client for cloudwatch
        domain_list (list): A list of domain names. e.g. ['domain1', 'domain2'...]
        account_id (str): AWS Account ID

    Returns:
        dict: A dict of metric data with key as domain name
        e.g.

        {
            'domain1': {'health': 'GREEN', ...},
            'domain2': {'health': 'GREEN', ...}
        }
    """
    # print('Get Metric Data from Cloudwatch')
    # query in the GetMetricData api input.
    queries = _build_metric_query(domain_list, account_id)

    # Can use the GetMetricData API to retrieve as many as 500 different metrics in a single request,
    # means 100 domains tops
    # ideally, there won't be more than 100 domains.
    resp = client.get_metric_data(
        MetricDataQueries=queries,
        StartTime=datetime.now() - timedelta(seconds=60),
        EndTime=datetime.now(),
    )
    # print(resp)
    metric_data = _parse_result(domain_list, resp["MetricDataResults"])

    return metric_data


def _build_metric_query(domain_list, account_id):
    """Helper func to set query metric"""
    queries = []

    # for each domain, there is a unique index
    # the metric id is in a format of 'mx'+index, e.g. m10
    # This is to map the metric result back to a domain
    for index, domain_name in enumerate(domain_list):
        for id, m in cw_metric_map.items():
            queries.append(
                {
                    "Id": id + str(index),
                    "MetricStat": {
                        "Metric": {
                            "Namespace": "AWS/ES",
                            "MetricName": m["metric_name"],
                            "Dimensions": [
                                {"Name": "DomainName", "Value": domain_name},
                                {"Name": "ClientId", "Value": account_id},
                            ],
                        },
                        "Period": 60,
                        "Stat": m["stat"],
                    },
                }
            )
    return queries


def _parse_result(domain_list, metric_result):  # NOSONAR
    """Helper func to parse query result"""

    # metric_data is the result to be returned (a map, the key is the domain name)
    metric_data = {}

    # domain_map is a map of index and domain name (key is index, value is domain name)
    domain_map = {}

    for index, domain_name in enumerate(domain_list):
        metric_data[domain_name] = {}
        domain_map[str(index)] = domain_name

    for metric in metric_result:

        # if no values
        if len(metric["Values"]) == 0:
            continue

        metric_id = metric["Id"][:2]
        index = metric["Id"][2:]
        domain_name = domain_map.get(index)

        # Map each metric to a domain metric
        if metric_id == "m1":
            metric_data.get(domain_name)["freeStorageSpace"] = metric["Values"][0]
        elif metric_id == "m2":
            metric_data.get(domain_name)["searchableDocs"] = metric["Values"][0]
        elif metric_id == "m3" and metric["Values"][0] != 0.0:
            metric_data.get(domain_name)["health"] = "GREEN"
        elif metric_id == "m4" and metric["Values"][0] != 0.0:
            metric_data.get(domain_name)["health"] = "YELLOW"
        elif metric_id == "m5" and metric["Values"][0] != 0.0:
            metric_data.get(domain_name)["health"] = "RED"
        elif metric_id == "m6" and metric["Values"][0] != 0.0:
            metric_data.get(domain_name)["health"] = "RED"
        else:
            logger.error("Unknown metric")
            logger.info(metric)

    return metric_data
