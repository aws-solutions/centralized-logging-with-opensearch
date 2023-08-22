# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import logging
import boto3

from functools import reduce

from botocore import config
from typing import List, Optional
from boto3.dynamodb.conditions import ConditionBase, Key
from .exception import APIException, ErrorCode
from .decorator import singleton


logger = logging.getLogger(__name__)


@singleton
class AWSConnection:
    """Common Utility to deal with AWS services.

    Usage:
    ```
    # initialize an instance
    conn = AWSConnection()

    # to create client
    s3 = conn.get_client("s3")

    # to create a resource
    s3 = conn.get_client("s3", type="resource")

    # to create a client with sts
    s3 = conn.get_client("s3", sts_role_arn="xxx")
    ```
    """

    role_session_name = "CentralizedLogging"

    def __init__(self) -> None:
        solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
        solution_id = os.environ.get("SOLUTION_ID", "SO8025")
        user_agent_extra = f"AwsSolution/{solution_id}/{solution_version}"

        self._default_config = config.Config(
            connect_timeout=30,
            retries={"max_attempts": 1},
            user_agent_extra=user_agent_extra,
        )
        self._default_region = os.environ.get("AWS_REGION")

    def get_client(
        self, service_name: str, region_name="", sts_role_arn="", client_type="client"
    ):
        """Create a boto3 client/resource session

        Args:
            service_name (str): AWS service name, e.g. s3
            region_name (str, optional): AWS region. If not provided, current region will be defaulted.
            sts_role_arn (str, optional): STS assumed role arn. If not provided, default profile wil be used.
            client_type (str, optional): either "client" or "resource". Defaults to "client".

        Returns:
            boto3 service client/resource
        """
        args = {
            "service_name": service_name,
            "region_name": self._default_region,
            "config": self._default_config,
        }
        if region_name:
            args["region_name"] = region_name

        if sts_role_arn:
            sts = boto3.client("sts", config=self._default_config)

            # Any exception handling for ConnectTimeoutError?
            resp = sts.assume_role(
                RoleArn=sts_role_arn,
                RoleSessionName=self.role_session_name,
            )
            cred = resp["Credentials"]
            args["aws_access_key_id"] = cred["AccessKeyId"]
            args["aws_secret_access_key"] = cred["SecretAccessKey"]
            args["aws_session_token"] = cred["SessionToken"]

        if client_type.lower() == "resource":
            return boto3.resource(**args)
        return boto3.client(**args)


def create_log_group(cwl_client, log_group_name):
    """Create CloudWatch Log Group"""
    try:
        cwl_client.create_log_group(logGroupName=log_group_name)
    except cwl_client.exceptions.ResourceAlreadyExistsException:
        logger.info("Log Group already exists, do nothing.")
    except Exception as e:
        logger.error(e)
        raise RuntimeError("Unable to create log group")


def get_bucket_location(s3_client, bucket_name):
    """Get bucket location (region)"""
    resp = s3_client.get_bucket_location(
        Bucket=bucket_name,
    )
    loc = resp["LocationConstraint"]
    # For us-east-1, the location is None
    return "us-east-1" if loc is None else loc


class DynamoDBUtil:
    """Common Utility to handle DynamoDB operations

    Usage:
    ```
    table_name = "my-table-name"
    ddb_util = DynamoDBUtil(table_name)

    items = ddb_util.list_items()
    print(items)
    ```
    """

    def __init__(self, table_name: str):
        """Constructor.

        Args:
            table_name (str): DynamoDB table name.
        """
        conn = AWSConnection()
        self._ddb_client = conn.get_client("dynamodb", client_type="resource")
        self._table = self._ddb_client.Table(table_name)

    def put_item(self, item: dict):
        """Put an item.

        Args:
            item (dict): The item to put.
        """
        return self._table.put_item(Item=item)

    def batch_put_items(self, items: list[dict]):
        """Put items in batch.

        Args:
            items (list[dict]): The item to put.
        """
        with self._table.batch_writer() as batch:
            for item in items:
                batch.put_item(item)

    def query_items(
        self,
        key: dict,
        index_name: str = "",
        limit: int = 0,
    ) -> list[dict]:
        """Query items from the table/index.

        Usage:
        ```
        # query by partition key and sort key
        items = query_items({"pk": "pk-value", "sk": "sk-value"})

        # query by partition key (with any sort key)
        items = query_items({"pk": "pk-value"})

        # query with limit (e.g. get latest record, sort by sort_key decending)
        items = query_items({"pk": "pk-value"}, limit=1)

        # query index
        items = query_items({"pk": "pk-value"}, index_name="MyIndex")

        ```

        Args:
            key (dict): partition key and/or sort key
            index_name (str, optional): index name. Defaults to "".
            limit (int, optional): limit the result count. Defaults to 0, which is no limit.

        Returns:
            list[dict]: List of items
        """

        key_expr = reduce((lambda x, y: x & y), [Key(k).eq(v) for k, v in key.items()])
        query_args = {"KeyConditionExpression": key_expr, "ScanIndexForward": False}
        if limit:
            query_args["Limit"] = limit

        if index_name:
            query_args["IndexName"] = index_name

        resp = self._table.query(**query_args)
        return resp.get("Items")

    def get_item(self, key: dict, raise_if_not_found: bool = False) -> dict:
        """Get an item from the table.

        Usage:
        ```
        get_item({"id": "uuid"})
        get_item({"pk": "pk-value", "sk": "sk-value"})
        ```

        Args:
            key (dict): A dict of primary key.
            raise_if_not_found (bool, optional): Raise error if item not found. Defaults to False.

        Raises:
            Exception: Item not found.

        Returns:
            dict: The item.
        """

        resp = self._table.get_item(Key=key)
        item = resp.get("Item")
        if raise_if_not_found and not item:
            raise APIException(
                ErrorCode.ITEM_NOT_FOUND, f"Can not find item with key: {key}"
            )
        return item

    def list_items(
        self,
        filter_expression: Optional[ConditionBase] = None,
        projection_attribute_names: Optional[List[str]] = None,
        index_name: str = "",
        limit: int = 0,
    ) -> List[dict]:
        """List all items in the table with filter expression or projection.

        Usage:
        ```
        list_items(Attr("status").eq("ERROR"))
        list_items(Attr("status").eq("ERROR"), projection_attribute_names=["id", "name", ...])
        ```

        Args:
            filter_expression (Optional[ConditionBase], optional): The filter expression. Defaults to None.
            projection_attribute_names (Optional[List[str]], optional): A list of attribute names. Defaults to None.

        Returns:
            List[dict]: A list of items.
        """

        projection_attribute_names = projection_attribute_names or []
        proj_expr = ",".join(
            "#" + attr_name for attr_name in projection_attribute_names
        )
        expr_attr_names = {}
        for attr_name in projection_attribute_names:
            expr_attr_names["#" + attr_name] = attr_name

        kwargs = {}
        if filter_expression:
            kwargs["FilterExpression"] = filter_expression

        if len(projection_attribute_names) > 0:
            kwargs["ProjectionExpression"] = proj_expr
            kwargs["ExpressionAttributeNames"] = expr_attr_names

        if limit:
            kwargs["Limit"] = limit

        if index_name:
            kwargs["IndexName"] = index_name

        return self._table.scan(**kwargs)["Items"]

    def update_item(self, key: dict, attributes_map: dict) -> None:
        """Update an item in the table.

        Usage:
        ```
        update_item({"id": "uuid"}, {"attr1": 1, "attr2": [1, 2, ...], ...})
        update_item({"pk": "pk-value", "sk": "sk-value"}, {"field1": 1, attr2: [1, 2, ...], ...})
        update_item({"id": "uuid"}, {"field1.nested-field1": 1})
        ```

        Args:
            key (dict): A dict of primary key.
            attributes_map (dict): A dict of attributes and values.

        Raises:
            ValueError: The key in attributes cannot contain a dot.

        """
        update_exprs = []
        expr_attr_names = {}
        expr_attr_values = {}

        for k, v in attributes_map.items():
            nested_keys = k.split(".")
            attr_key = nested_keys[-1] + "_val"
            nested_attr_names = []
            for nested_key in nested_keys:
                nested_attr_names.append(f"#{nested_key}")
                expr_attr_names[f"#{nested_key}"] = nested_key

            update_exprs_attr_name = ".".join(nested_attr_names)
            expr_attr_values[f":{attr_key}"] = v
            update_exprs.append(f"{update_exprs_attr_name} = :{attr_key}")

        update_expression = "SET " + ", ".join(update_exprs)

        self._table.update_item(
            Key=key,
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
        )

    def delete_item(self, key: dict):
        """Delete an item in the table.

        This is not soft delete.

        Usage:
        ```
        delete_item({"id": "uuid"})
        delete_item({"pk": "pk-value", "sk": "sk-value"})
        ```

        Args:
            key (dict): A dict of primary key.
        """

        return self._table.delete_item(Key=key, ReturnValues="ALL_OLD")

    def batch_delete_items(self, keys: list[dict]):
        """Delete items in the table in batch.

        This is not soft delete.

        Usage:
        ```
        batch_delete_items([{"id": "uuid"}])
        batch_delete_items({"pk": "pk-value", "sk": "sk-value"})

        Args:
            key (dict): A dict of primary key.
        """
        with self._table.batch_writer() as batch:
            for key in keys:
                batch.delete_item(key)
