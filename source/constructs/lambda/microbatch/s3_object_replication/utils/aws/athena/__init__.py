# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import datetime
from typing import Union
from utils.helpers import logger, AWSConnection, iso8601_strftime


class AthenaClient:
    """Amazon Athena Client, used to interact with Amazon Athena."""

    def __init__(self):
        conn = AWSConnection()
        self._athena_client = conn.get_client("athena")

    def get_query_execution(self, query_execution_id: str) -> dict:
        """Returns information about a single execution of a query if you have access to the workgroup in which the query ran.
           Each time a query executes, information about the query execution is saved with a unique ID.

        :param query_execution_id (str): The unique ID of the query execution.

        Returns: dict
        """
        response = {"QueryExecution": {"QueryExecutionId": ""}}
        try:
            query_execution_response = self._athena_client.get_query_execution(
                QueryExecutionId=query_execution_id
            )
        except Exception as e:
            logger.error(e)
            return response
        response["QueryExecution"] = query_execution_response["QueryExecution"]
        logger.info(
            f"Get Athena query execution information, QueryExecutionId: {query_execution_id}, Response: {response}."
        )
        return response

    def get_query_execution_status(self, execution_info: dict) -> dict:
        """The state of query execution via get_query_execution' response

        :param execution_info (dict): get_query_execution' response

         Returns: str: the state of query execution, e.g. RUNNING or FAILED to QUEUED or CANCELLED or SUCCEEDED
        """

        submission_date_time = execution_info["QueryExecution"]["Status"][
            "SubmissionDateTime"
        ]
        submission_date_time = iso8601_strftime(submission_date_time)

        completion_date_time = execution_info["QueryExecution"]["Status"].get(
            "CompletionDateTime"
        )
        if not isinstance(completion_date_time, datetime.datetime):
            completion_date_time = iso8601_strftime()
        else:
            completion_date_time = iso8601_strftime(completion_date_time)

        return {
            "queryExecutionId": execution_info["QueryExecution"]["QueryExecutionId"],
            "state": execution_info["QueryExecution"]["Status"]["State"],
            "query": execution_info["QueryExecution"]["Query"],
            "submissionDateTime": submission_date_time,
            "completionDateTime": completion_date_time,
        }

    def start_query_execution(
        self,
        query_string,
        work_group: Union[str, None] = None,
        output_location: Union[str, None] = None,
        asynchronous: bool = False,
        interval: int = 1,
    ) -> dict:
        """Call start_query_execution to execute SQL statement, if query_string is a DML statement, you must specify work_group and output_location.

        :param query_string (_type_): SQL statement need to execution.
        :param work_group (Union[str, None], optional): Required when query_string is a DML statement. Defaults to None.
        :param output_location (Union[str, None], optional): Required when query_string is a DML statement. Defaults to None.
        :param asynchronous (bool, optional): When it is true, wait for the execution to be completed and return the execution result;
                when it is false, only query_execution_id will be returned. Defaults to False.

        Returns:
            dict: response
        """
        kwargs = {}
        if work_group is not None:
            kwargs["WorkGroup"] = work_group
        if output_location is not None:
            kwargs["ResultConfiguration"] = {"OutputLocation": output_location}

        logger.debug(
            f"Starting Athena query execution, this queryString is {query_string}."
        )
        try:
            query_execution_response = self._athena_client.start_query_execution(
                QueryString=query_string, **kwargs
            )
        except Exception as e:
            logger.error(e)
            return {
                "QueryExecution": {
                    "QueryExecutionId": "",
                    "Query": query_string,
                    "Status": {
                        "State": "FAILED",
                        "SubmissionDateTime": datetime.datetime.now(datetime.UTC),
                        "CompletionDateTime": datetime.datetime.now(datetime.UTC),
                    },
                }
            }

        query_execution_id = query_execution_response["QueryExecutionId"]
        if asynchronous is True:
            response = self.get_query_execution(query_execution_id=query_execution_id)
            logger.info(
                f"Start query execution is asynchronous, the response is {response}."
            )
            return response

        while True:
            response = self.get_query_execution(query_execution_id)
            if response["QueryExecution"]["Status"]["State"] in (
                "SUCCEEDED",
                "FAILED",
                "CANCELLED",
            ):
                break
            # It is not recommended to modify it. When there are too many partitions, it is easy to cause lambda execution timeout.
            time.sleep(interval)
        logger.info(
            f"Start query execution is synchronous, the response is {response}."
        )
        return response

    def get_named_query(self, named_query_id: str) -> dict:
        """Get a named query.

        @see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/get_named_query.html

        :param named_query_id (str): The unique ID of the query.

        Returns: dict
        """
        response = {"NamedQuery": {}}
        try:
            response = self._athena_client.get_named_query(NamedQueryId=named_query_id)
        except Exception as e:
            logger.warning(e)
            return response
        logger.info(
            f"Get named query, named_query_id: {named_query_id}, response: {response}."
        )
        return response

    def list_named_queries(self, name: str = "", work_group: str = "primary") -> dict:
        """List all named queries.

        @see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/list_named_queries.html

        :param work_group (str): The name of the workgroup in which the named query is being created.
        :param name (str): The query name which you need to filter.

        Returns: dict
        """
        response = {"NamedQueryIds": []}

        named_query_ids = []
        paginator = self._athena_client.get_paginator("list_named_queries")
        for page_iterator in paginator.paginate(WorkGroup=work_group):
            named_query_ids.extend(page_iterator.get("NamedQueryIds", []))

        if name:
            for named_query_id in named_query_ids:
                named_query = self.get_named_query(named_query_id=named_query_id)
                if named_query["NamedQuery"].get("Name") == name:
                    response["NamedQueryIds"].append(named_query_id)
                    break
        else:
            response["NamedQueryIds"] = named_query_ids

        logger.info(
            f"List named queries, work_group: {work_group}, name: {name}, response: {response}."
        )
        return response

    def create_named_query(
        self, name: str, database: str, query_string: str, work_group: str = "primary"
    ) -> dict:
        """Create a named query.

        @see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/create_named_query.html

        :param name (str): The name of the query.
        :param database (str): The database to which the query belongs.
        :param query_string (str): The SQL query statements.
        :param work_group (str): The name of the workgroup in which the named query is being created.

        Returns: dict
        """
        response = {"NamedQuery": {}}
        try:
            create_named_query_response = self._athena_client.create_named_query(
                Name=name,
                Description=name,
                Database=database,
                QueryString=query_string,
                WorkGroup=work_group,
            )
            response = self.get_named_query(
                named_query_id=create_named_query_response.get("NamedQueryId")
            )
        except Exception as e:
            logger.error(e)
        return response

    def update_named_query(
        self, name: str, database: str, query_string: str, work_group: str = "primary"
    ) -> dict:
        """Create or update a named query.

        @see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/update_named_query.html

        :param name (str): The name of the query.
        :param database (str): The database to which the query belongs.
        :param query_string (str): The SQL query statements.
        :param work_group (str): The name of the workgroup in which the named query is being created.

        Returns: dict
        """
        response = {"NamedQuery": {}}
        named_query_ids = self.list_named_queries(work_group=work_group, name=name)[
            "NamedQueryIds"
        ]

        if named_query_ids:
            try:
                self._athena_client.update_named_query(
                    Name=name,
                    Description=name,
                    Database=database,
                    QueryString=query_string,
                    WorkGroup=work_group,
                )
                response = self.get_named_query(named_query_id=named_query_ids[0])
            except Exception as e:
                logger.warning(e)
        else:
            response = self.create_named_query(
                name=name,
                database=database,
                query_string=query_string,
                work_group=work_group,
            )
        logger.info(
            f"Update named query, name: {name}, database: {database}, query_string: {query_string}, response: {response}."
        )
        return response

    def delete_named_query(self, named_query_id: str) -> dict:
        """Delete a named query.

        @see: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena/client/delete_named_query.html

        :param named_query_id (str): The unique ID of the query.

        Returns: dict
        """
        response = {}
        try:
            response = self._athena_client.delete_named_query(
                NamedQueryId=named_query_id
            )
        except Exception as e:
            logger.warning(e)
        logger.info(
            f"Delete named query, named_query_id: {named_query_id}, response: {response}."
        )
        return response
