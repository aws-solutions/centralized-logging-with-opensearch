# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class DataType:

    is_primitive = True
    input_string = ""

    def __init__(self, input_string: str, is_primitive: bool = True):
        self.is_primitive = is_primitive
        self.input_string = input_string


class Schema:

    @staticmethod
    def boolean() -> DataType:
        return DataType(is_primitive=True, input_string="boolean")

    @staticmethod
    def binary() -> DataType:
        return DataType(is_primitive=True, input_string="binary")

    @staticmethod
    def big_int() -> DataType:
        return DataType(is_primitive=True, input_string="bigint")

    @staticmethod
    def double() -> DataType:
        return DataType(is_primitive=True, input_string="double")

    @staticmethod
    def number() -> DataType:
        return DataType(is_primitive=True, input_string="double")

    @staticmethod
    def float() -> DataType:
        return DataType(is_primitive=True, input_string="float")

    @staticmethod
    def integer() -> DataType:
        return DataType(is_primitive=True, input_string="int")

    @staticmethod
    def small_int() -> DataType:
        return DataType(is_primitive=True, input_string="smallint")

    @staticmethod
    def tiny_int() -> DataType:
        return DataType(is_primitive=True, input_string="tinyint")

    @staticmethod
    def date() -> DataType:
        return DataType(is_primitive=True, input_string="date")

    @staticmethod
    def timestamp() -> DataType:
        return DataType(is_primitive=True, input_string="timestamp")

    @staticmethod
    def string() -> DataType:
        return DataType(is_primitive=True, input_string="string")

    @staticmethod
    def decimal(precision: int = 38, scale: int = 0) -> DataType:
        input_string = f"decimal({precision}, {scale})"
        return DataType(is_primitive=True, input_string=input_string)

    @staticmethod
    def char(length: int) -> DataType:
        if length <= 0 or length > 255:
            raise ValueError(
                f"char length must be (inclusively) between 1 and 255, but was {length}."
            )
        if length % 1 != 0:
            raise ValueError(f"char length must be a positive integer, was {length}.")
        return DataType(is_primitive=True, input_string=f"char({length})")

    @staticmethod
    def varchar(length: int) -> DataType:
        if length <= 0 or length > 65535:
            raise ValueError(
                f"char length must be (inclusively) between 1 and 65535, but was {length}."
            )
        if length % 1 != 0:
            raise ValueError(f"char length must be a positive integer, was {length}.")
        return DataType(is_primitive=True, input_string=f"varchar({length})")

    @staticmethod
    def array(item_type: DataType) -> DataType:
        return DataType(
            is_primitive=False, input_string=f"array<{item_type.input_string}>"
        )

    @staticmethod
    def map(key_type: DataType, value_type: DataType):
        if not key_type.is_primitive:
            raise TypeError(
                f"the key type of a 'map' must be a primitive, but was {key_type.input_string}"
            )
        return DataType(
            is_primitive=False,
            input_string=f"map<{key_type.input_string},{value_type.input_string}>",
        )

    @staticmethod
    def struct(columns: list):
        struct = ",".join(
            [f'{column["name"]}:{column["type"].input_string}' for column in columns]
        )
        input_string = f"struct<{struct}>"
        return DataType(is_primitive=False, input_string=input_string)
