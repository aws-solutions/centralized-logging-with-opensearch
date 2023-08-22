import logging

from commonlib.model import DomainStatusCheckType
from commonlib import AWSConnection

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
ec2 = conn.get_client("ec2")


def clean_check_result(check_details):
    """Helper function to get the final check status,
    and remove useless check details whose value is null
    """
    cleaned_detail = []
    global_status = DomainStatusCheckType.PASSED
    for detail in check_details:
        if (detail["values"] == "" or detail["values"] is None) and (
            detail["status"] == DomainStatusCheckType.PASSED
        ):
            continue

        cleaned_detail.append(detail)
        if global_status == DomainStatusCheckType.FAILED:
            # if the global_status is already FAILED, we will not update it any more
            continue
        if detail["status"] == DomainStatusCheckType.FAILED:
            global_status = DomainStatusCheckType.FAILED

    return global_status, cleaned_detail


def record_check_detail(
    details: list, check_result: bool, name: str, values: any, error_code
):
    """Record the check detail
    Args:
        values: any, can be string or array. This function will transfer it to array.
    """
    if isinstance(values, str):
        values = values.split(",")

    details.append(
        {
            "name": name,
            "values": values,
            "errorCode": error_code if not check_result else None,
            "status": DomainStatusCheckType.PASSED
            if check_result
            else DomainStatusCheckType.FAILED,
        }
    )


def validate_domain_engine(engine: str) -> bool:
    """validate the domain engine"""
    return engine in ["OpenSearch"]


def validate_domain_version(version: str) -> bool:
    """validate the domain version"""
    logger.info("Checking the Domain Version, current version is %s", version)
    version = float(version)
    minimum_version = 1.3
    return version >= minimum_version


def validate_domain_network_type(network_type: str) -> bool:
    """validate the domain network type"""
    logger.info(
        "Checking the Domain Network Type, current network type is %s", network_type
    )

    return network_type == "private"


def validate_solution_subnet_nat_status(subnet_ids: str) -> bool:
    """validate solution private subnets nat status
    Only return True if all the subnet has a NAT route
    """
    subnet_list = subnet_ids.split(",")
    return all(has_nat_route(subnet_id) for subnet_id in subnet_list)


def has_nat_route(subnet_id: str) -> bool:
    """Return True if the subnet has a NAT route, else False"""
    response = ec2.describe_route_tables(
        Filters=[
            {"Name": "association.subnet-id", "Values": [subnet_id]},
        ],
        DryRun=False,
    )
    if "RouteTables" not in response:
        return False
    return any(
        contains_active_nat_route(route_table)
        for route_table in response["RouteTables"]
    )


def contains_active_nat_route(route_table: dict) -> bool:
    """Return True if the route_table contains an active NAT route, else False"""
    if "Routes" not in route_table:
        return False
    return any(is_active_nat_route(route) for route in route_table["Routes"])


def is_active_nat_route(route: dict) -> bool:
    """Return True if the route is an active NAT route, else False"""
    if (
        "NatGatewayId" in route
        and route["DestinationCidrBlock"] == "0.0.0.0/0"
        and route["State"] == "active"
    ):
        logger.info(
            "Detect the valid nat gateway in route: %s",
            route["NatGatewayId"],
        )
        return True
    return False
