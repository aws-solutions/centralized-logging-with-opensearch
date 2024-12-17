# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from typing import Callable


__all__ = [
    "extension_to_merge_func",
]


def extension_to_merge_func(extension) -> Callable:
    """A function that maps files to file merging through file extensions. Currently, only parquet, gzip,
        and text are supported, and exceptions are returned for unsupported types.

    :return: returns a merge function
    """
    from .parquet import merge_parquets
    from .text import merge_text
    from .gz import merge_gzip

    if extension not in ("parquet", "gz", "text"):
        raise ValueError(
            "Unsupported file extension, only parquet, gz, text is supported."
        )
    extension_merge_function_mapping = {
        "parquet": merge_parquets,
        "gz": merge_gzip,
        "text": merge_text,
    }
    return extension_merge_function_mapping[extension]
