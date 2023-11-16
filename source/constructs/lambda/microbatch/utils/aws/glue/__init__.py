# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from utils.aws.commonlib import AWSConnection
from utils.logger import logger
from .table import TableMetaData


        
class GlueClient:
    """Amazon Glue Client, used to interact with Amazon Glue."""

    def __init__(self):
        conn = AWSConnection()
        self._glue_client = conn.get_client("glue")
    
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
        return self._glue_client.get_partition_indexes(DatabaseName=database, TableName=table_name)
    
    def create_table(self, database: str, name: str, table_metadata: TableMetaData, location: str, partition_filtering: str = 'true') -> dict:
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
                TableInput={
                    'Name': name,
                    'StorageDescriptor': {
                        'Columns': table_metadata.columns,
                        'Location': location,
                        'InputFormat': table_metadata.data_format.INPUT_FORMAT,
                        'OutputFormat': table_metadata.data_format.OUTPUT_FORMAT,
                        'SerdeInfo': {
                            'SerializationLibrary': table_metadata.data_format.SERIALIZATION_LIBRARY,
                        },
                        'Compressed': True,
                    },
                    'TableType': 'EXTERNAL_TABLE',
                    'Parameters': {
                        'partition_filtering.enabled': partition_filtering,
                        'classification': table_metadata.data_format.CLASSIFICATION_STRING,
                        'has_encrypted_data': 'true',
                    },
                    'PartitionKeys': table_metadata.partition_keys,
                },
                PartitionIndexes=table_metadata.partition_indexes,
            )
            return self.get_table(database=database, name=name)
        else:
            return table_info
    
    def update_table(self, database: str, name: str, table_metadata: TableMetaData, location: str, partition_filtering: str = 'true') -> dict:
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
                TableInput={
                    'Name': name,
                    'StorageDescriptor': {
                        'Columns': table_metadata.columns,
                        'Location': location,
                        'InputFormat': table_metadata.data_format.INPUT_FORMAT,
                        'OutputFormat': table_metadata.data_format.OUTPUT_FORMAT,
                        'SerdeInfo': {
                            'SerializationLibrary': table_metadata.data_format.SERIALIZATION_LIBRARY,
                        },
                        'Compressed': True,
                    },
                    'TableType': 'EXTERNAL_TABLE',
                    'Parameters': {
                        'partition_filtering.enabled': partition_filtering,
                        'classification': table_metadata.data_format.CLASSIFICATION_STRING,
                        'has_encrypted_data': 'true',
                    },
                    'PartitionKeys': table_metadata.partition_keys,
                },
            )
        else:
            self.create_table(database=database, name=name, table_metadata=table_metadata, location=location, partition_filtering=partition_filtering)
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


