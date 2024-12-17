# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Union, Optional, List, Iterator
from boto3.dynamodb.conditions import ConditionBase
from utils.helpers import AWSConnection


class DynamoDBUtil:
    conn = AWSConnection()

    def __init__(self, table: str, max_attempts: int = 10):
        self.dynamodb = self.conn.get_client(
            "dynamodb", client_type="resource", max_attempts=max_attempts
        )
        self._table_name = table
        self._table = self.dynamodb.Table(table)  # type: ignore

    def put_item(self, item: dict) -> None:
        self._table.put_item(Item=item)

    def get_item(self, key: dict, raise_if_not_found: bool = True) -> dict:
        """
        Get an item from the table.

        Example:
        get_item("id")
        get_item({"index": "index-id"})
        """
        resp = self._table.get_item(Key=key)
        item = resp.get("Item")
        if raise_if_not_found and not item:
            raise KeyError(f"[Item is not found] Key: {key}")
        return item

    def list_items(
        self,
        filter: Union[Optional[ConditionBase], str] = None,
        projection_attribute_names: Optional[List[str]] = None,
    ) -> List[dict]:
        """List all items in the table with filter expression or projection.

        list_items(Attr("status").eq("ERROR"))
        list_items(Attr("status").eq("ERROR"), projection_attribute_names=["id", "name", ...])

        Args:
            filter_expression (Optional[ConditionBase], optional): The filter expression. Defaults to None.
            projection_attribute_names (Optional[List[str]], optional): A list of attribute names. Defaults to None.

        Returns:
            List[dict]: A list of items.
        """

        def _items_iter():
            for page_iterator in self.scan(
                filter=filter, projection_attribute_names=projection_attribute_names
            ):
                for item in page_iterator.get("Items", []):
                    yield item

        return list(_items_iter())

    def scan(
        self,
        filter: Union[Optional[ConditionBase], str] = None,
        select: str = "ALL_ATTRIBUTES",
        projection_attribute_names: Optional[List[str]] = None,
        consistent: bool = False,
    ) -> Iterator[dict]:
        """
        List all items in the table with filter expression.

        Example:

        scan_item(Attr("status").eq("ERROR"))
        """

        expr_attr_names = {}

        kwargs = {}
        if filter is not None:
            kwargs["FilterExpression"] = filter
        if projection_attribute_names is not None:
            kwargs["ProjectionExpression"] = ",".join(
                f"#{attr_name}" for attr_name in projection_attribute_names
            )
            for attr_name in projection_attribute_names:
                expr_attr_names[f"#{attr_name}"] = attr_name
            kwargs["ExpressionAttributeNames"] = expr_attr_names

        paginator = self._table.meta.client.get_paginator("scan")
        for page_iterator in paginator.paginate(
            TableName=self._table_name,
            Select=select,
            ConsistentRead=consistent,
            **kwargs,
        ):
            yield page_iterator

    def query(
        self,
        key_condition: Union[Optional[ConditionBase], str],
        filter: Union[Optional[ConditionBase], str] = None,
        select: str = "ALL_ATTRIBUTES",
        consistent: bool = False,
    ) -> Iterator[dict]:
        """
        query items in the table with key and filter expression.

        Example:

        query_item(Attr("status").eq("ERROR"))
        """

        kwargs = {}
        if filter is not None:
            kwargs["FilterExpression"] = filter

        paginator = self.dynamodb.meta.client.get_paginator("query")  # type: ignore
        for page_iterator in paginator.paginate(
            TableName=self._table.table_name,
            KeyConditionExpression=key_condition,
            Select=select,
            ConsistentRead=consistent,
            **kwargs,
        ):
            yield page_iterator

    def update_item(self, key: dict, item: dict) -> None:
        """Update an item in the table.

        update_item({"id": "uuid"}, {"attr1": 1, "attr2": [1, 2, ...], ...})
        update_item({"index-name": "index-value"}, {"field1": 1, attr2: [1, 2, ...], ...})

        Args:
            key (dict): A dict of primary key.
            attributes_map (dict): A dict of attributes and values.

        Raises:
            ValueError: The key in attributes cannot contain a dot.

        """
        update_exprs = []
        expr_attr_names = {}
        expr_attr_values = {}

        for k, v in item.items():
            if "." in k:  # We don't support update a nested attribute here.
                raise ValueError(f"Attributes key {k} cannot contain a dot.")

            expr_attr_names[f"#{k}"] = k
            expr_attr_values[f":{k}"] = v
            update_exprs.append(f"#{k}=:{k}")

        self._table.update_item(
            Key=key,
            UpdateExpression="SET " + ",".join(update_exprs),
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
        )

    def delete_item(self, key: dict):
        return self._table.delete_item(Key=key)
