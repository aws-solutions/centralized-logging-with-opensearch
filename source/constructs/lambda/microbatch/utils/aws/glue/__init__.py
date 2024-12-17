# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import copy
from typing import Union, Optional
from utils.helpers import logger, AWSConnection
from .table import TableMetaData


class GlueClient:
    """Amazon Glue Client, used to interact with Amazon Glue."""

    def __init__(self):
        conn = AWSConnection()
        self._glue_client = conn.get_client("glue")

    def get_database(self, name: str, catalog_id: Optional[str] = None) -> dict:
        """Retrieves the definition of a specified database.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/get_database.html

        Args:
            name (str): The name of the database for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase
            catalog_id (optional): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.

        Returns:
            dict: _description_
        """
        kwargs = dict(Name=name)
        if catalog_id:
            kwargs["CatalogId"] = catalog_id

        try:
            response = self._glue_client.get_database(**kwargs)
            return response
        except Exception as e:
            logger.warning(e)
            return {}

    def create_database(self, name: str, catalog_id: Optional[str] = None) -> dict:
        """Creates a new database in a Data Catalog.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/create_database.html

        Args:
            name (str): The name of the database for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase
            catalog_id (optional): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.

        Returns:
            dict: _description_
        """
        database_info = self.get_database(name=name, catalog_id=catalog_id)
        if not database_info:
            if catalog_id:
                self._glue_client.create_database(
                    CatalogId=catalog_id,
                    DatabaseInput={"Name": name},
                )
            else:
                self._glue_client.create_database(
                    DatabaseInput={"Name": name},
                )
            return self.get_database(name=name, catalog_id=catalog_id)
        else:
            return database_info

    def delete_database(self, name: str, catalog_id: Optional[str] = None) -> None:
        """Removes a specified database from a Data Catalog.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/delete_database.html

        Args:
            name (str): The name of the database for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase
            catalog_id (optional): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
        """
        kwargs = dict(Name=name)
        if catalog_id:
            kwargs["CatalogId"] = catalog_id

        try:
            self._glue_client.delete_database(**kwargs)
        except Exception as e:
            logger.warning(e)

    def get_table(self, database: str, name: str) -> dict:
        """Retrieves the Table definition in a Data Catalog for a specified table.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/get_table.html

        Args:
            database (str): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
            name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase

        Returns:
            dict: _description_
        """
        try:
            response = self._glue_client.get_table(DatabaseName=database, Name=name)
            return response
        except Exception as e:
            logger.warning(e)
            return {}

    def get_partition_indexes(self, database: str, table_name: str) -> dict:
        """Retrieves the partition indexes associated with a table.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/get_partition_indexes.html

        Args:
            database (str): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
            table_name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase

        Returns:
            _type_: _description_
        """
        return self._glue_client.get_partition_indexes(
            DatabaseName=database, TableName=table_name
        )

    def _convert_to_spark_sql_data_type(self, input_string: str) -> str:
        """Convert glue data type to spark sql data type.

        Args:
            input_string (str): Primitive Data Type.

        Raises:
            TypeError: _description_

        Returns:
            str: _description_
        """
        _data_type_mapping = {
            "boolean": "boolean",
            "tinyint": "byte",
            "smallint": "short",
            "int": "integer",
            "integer": "integer",
            "bigint": "long",
            "float": "float",
            "double": "double",
            "date": "date",
            "timestamp": "timestamp",
            "string": "string",
            "char": "string",
            "varchar": "string",
            "binary": "binary",
            "decimal": "decimal",
            "array": "array",
            "struct": "struct",
            "map": "map",
        }
        try:
            return _data_type_mapping[input_string.lower()]
        except Exception as e:
            logger.error(e)
            raise TypeError(f"Do not supported data type: {input_string.lower()}.")

    @staticmethod
    def _parse_complex_input_string(input_string: str) -> list:
        """parse input string of complex data type.

        Args:
            input_string (str): _description_

        Returns:
            list: _description_
        """

        stack = []
        columns = []
        current_item = ""

        for char in input_string:
            if char == "<":
                stack.append(char)
            elif char == ">":
                if stack:
                    stack.pop()
            elif char == "," and not stack:
                columns.append(current_item.strip())
                current_item = ""
                char = ""
            current_item += char

        if current_item:
            columns.append(current_item.strip())

        return columns

    def _generate_spark_sql_type(self, input_string: str) -> Union[dict, str]:
        """Generate type and elementType in Spark SQL schema.

        Args:
            input_string (str): _description_

        Returns:
            Union[dict, str]: _description_
        """
        if input_string.startswith("array"):
            return {
                "type": self._convert_to_spark_sql_data_type(input_string="array"),
                "elementType": self._generate_spark_sql_type(input_string[6:-1]),
                "containsNull": True,
            }
        elif input_string.startswith("struct"):
            columns = [
                {
                    "Name": column_info.split("<", 1)[0].rsplit(":", 1)[0],
                    "Type": column_info[
                        len(column_info.split("<", 1)[0].rsplit(":", 1)[0]) + 1 :
                    ],
                }
                for column_info in self._parse_complex_input_string(
                    input_string=input_string[7:-1]
                )
            ]
            return self._generate_spark_sql_schema(columns=columns)
        elif input_string.startswith("map"):
            map_data_type = input_string[4:-1].split(",", 1)
            return {
                "type": self._convert_to_spark_sql_data_type(input_string="map"),
                "keyType": self._convert_to_spark_sql_data_type(
                    input_string=map_data_type[0]
                ),
                "valueType": self._generate_spark_sql_type(
                    input_string=map_data_type[1]
                ),
                "valueContainsNull": True,
            }
        elif input_string.startswith("char"):
            return self._convert_to_spark_sql_data_type(input_string=input_string[:4])
        elif input_string.startswith("varchar"):
            return self._convert_to_spark_sql_data_type(input_string=input_string[:7])
        elif input_string.startswith("decimal"):
            return f"{self._convert_to_spark_sql_data_type(input_string=input_string[:7])}{input_string[7:]}"
        else:
            return self._convert_to_spark_sql_data_type(input_string=input_string)

    def _generate_spark_sql_schema(self, columns: list) -> dict:
        """Generate Spark SQL Schema based on TableInput.StorageDescriptor.Columns.

        Args:
            columns (list): A list of the Columns in the table.

        Returns:
            dict: Spark SQL Schema.
        """
        spark_sql_schema = {"type": "struct", "fields": []}
        for column in columns:
            name = column["Name"].lower()
            input_string = column["Type"].lower()

            if input_string.startswith("array"):
                spark_sql_schema["fields"].append(
                    {
                        "name": name,
                        "type": {
                            "type": self._convert_to_spark_sql_data_type(
                                input_string="array"
                            ),
                            "elementType": self._generate_spark_sql_type(
                                input_string=input_string[6:-1]
                            ),
                            "containsNull": True,
                        },
                        "nullable": True,
                        "metadata": {},
                    }
                )
            elif input_string.startswith(("struct", "map")):
                spark_sql_schema["fields"].append(
                    {
                        "name": name,
                        "type": self._generate_spark_sql_type(
                            input_string=input_string
                        ),
                        "nullable": True,
                        "metadata": {},
                    }
                )
            else:
                field_schema = {
                    "name": name,
                    "type": self._generate_spark_sql_type(input_string=input_string),
                    "nullable": True,
                    "metadata": {},
                }
                if input_string.startswith(("char", "varchar")):
                    field_schema["metadata"][
                        "__CHAR_VARCHAR_TYPE_STRING"
                    ] = input_string
                spark_sql_schema["fields"].append(field_schema)

        return spark_sql_schema

    def _generate_table_input(
        self,
        name: str,
        table_metadata: TableMetaData,
        location: str,
        partition_filtering: str = "true",
    ) -> dict:
        """Generate Table Input.

        Args:
            name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase.
            table_metadata (TableMetaData): see utils.aws.glue.table.TableMetaData
            location (str): The physical location of the table. By default, this takes the form of the warehouse location, followed by the database location in the warehouse, followed by the table name.
            partition_filtering (str, optional): _description_. Defaults to 'true'.

        Returns:
            dict: _description_
        """
        table_input = {
            "Name": name,
            "StorageDescriptor": {
                "Columns": table_metadata.columns,
                "Location": location,
                "InputFormat": table_metadata.data_format.INPUT_FORMAT,
                "OutputFormat": table_metadata.data_format.OUTPUT_FORMAT,
                "SerdeInfo": {
                    "SerializationLibrary": table_metadata.data_format.SERIALIZATION_LIBRARY,
                },
                "Compressed": True,
            },
            "TableType": "EXTERNAL_TABLE",
            "Parameters": {
                "partition_filtering.enabled": partition_filtering,
                "classification": table_metadata.data_format.CLASSIFICATION_STRING,
                "has_encrypted_data": "true",
                "parquet.compression": "ZSTD",
            },
            "PartitionKeys": table_metadata.partition_keys,
        }
        spark_table_columns = copy.deepcopy(table_metadata.columns)
        spark_table_columns.extend(table_metadata.partition_keys)
        spark_table_properties = {
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": json.dumps(
                self._generate_spark_sql_schema(columns=spark_table_columns)
            ),
            "spark.sql.sources.schema.numPartCols": str(
                len(table_metadata.partition_keys)
            ),
        }
        for idx, partition in enumerate(table_metadata.partition_keys):
            spark_table_properties[f"spark.sql.sources.schema.partCol.{idx}"] = (
                partition["Name"]
            )
        table_input["Parameters"].update(spark_table_properties)

        return table_input

    def create_table(
        self,
        database: str,
        name: str,
        table_metadata: TableMetaData,
        location: str,
        partition_filtering: str = "true",
    ) -> dict:
        """Creates a new table definition in the Data Catalog.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/create_table.html

        Args:
            database (str): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
            name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase.
            table_metadata (TableMetaData): see utils.aws.glue.table.TableMetaData
            location (str): The physical location of the table. By default, this takes the form of the warehouse location, followed by the database location in the warehouse, followed by the table name.
            partition_filtering (str, optional): _description_. Defaults to 'true'.

        Returns:
            dict: _description_
        """
        table_info = self.get_table(database=database, name=name)
        if not table_info:
            self._glue_client.create_table(
                DatabaseName=database,
                TableInput=self._generate_table_input(
                    name=name,
                    table_metadata=table_metadata,
                    location=location,
                    partition_filtering=partition_filtering,
                ),
                PartitionIndexes=table_metadata.partition_indexes,
            )
            return self.get_table(database=database, name=name)
        else:
            return table_info

    def update_table(
        self,
        database: str,
        name: str,
        table_metadata: TableMetaData,
        location: str,
        partition_filtering: str = "true",
    ) -> dict:
        """Updates a metadata table in the Data Catalog. You can not delete partition key.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/update_table.html

        Args:
            database (str): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
            name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase.
            table_metadata (TableMetaData): see utils.aws.glue.table.TableMetaData
            location (str): The physical location of the table. By default, this takes the form of the warehouse location, followed by the database location in the warehouse, followed by the table name.
            partition_filtering (str, optional): _description_. Defaults to 'true'.

        Returns:
            dict: _description_
        """

        if self.get_table(database=database, name=name):
            self._glue_client.update_table(
                DatabaseName=database,
                TableInput=self._generate_table_input(
                    name=name,
                    table_metadata=table_metadata,
                    location=location,
                    partition_filtering=partition_filtering,
                ),
            )
        else:
            self.create_table(
                database=database,
                name=name,
                table_metadata=table_metadata,
                location=location,
                partition_filtering=partition_filtering,
            )
        return self.get_table(database=database, name=name)

    def delete_table(self, database: str, name: str) -> None:
        """Removes a table definition from the Data Catalog.

        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/delete_table.html

        Args:
            database (str): The name of the database in the catalog in which the table resides. For Hive compatibility, this name is entirely lowercase.
            name (str): The name of the table for which to retrieve the definition. For Hive compatibility, this name is entirely lowercase.
        """
        try:
            self._glue_client.delete_table(DatabaseName=database, Name=name)
        except Exception as e:
            logger.warning(e)
