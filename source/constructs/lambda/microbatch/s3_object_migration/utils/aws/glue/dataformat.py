# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from utils.helpers import CommonEnum


# see: https://docs.aws.amazon.com/athena/latest/ug/serde-reference.html
class InputFormat(CommonEnum):
    AVRO = "org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat"
    CLOUDTRAIL = "com.amazon.emr.cloudtrail.CloudTrailInputFormat"
    ORC = "org.apache.hadoop.hive.ql.io.orc.OrcInputFormat"
    PARQUET = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    TEXT = "org.apache.hadoop.mapred.TextInputFormat"


class OutputFormat(CommonEnum):
    AVRO = "org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat"
    ORC = "org.apache.hadoop.hive.ql.io.orc.OrcOutputFormat"
    HIVE_IGNORE_KEY_TEXT = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
    PARQUET = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"


class SerializationLibrary(CommonEnum):
    AVRO = "org.apache.hadoop.hive.serde2.avro.AvroSerDe"
    CLOUDTRAIL = "org.openx.data.jsonserde.JsonSerDe"
    LAZY_SIMPLE = "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe"
    OPEN_CSV = "org.apache.hadoop.hive.serde2.OpenCSVSerde"
    OPENX_JSON = "org.openx.data.jsonserde.JsonSerDe"
    ORC = "org.apache.hadoop.hive.ql.io.orc.OrcSerde"
    PARQUET = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    REGEXP = "org.apache.hadoop.hive.serde2.RegexSerDe"


class ClassificationString(CommonEnum):
    AVRO = "avro"
    CSV = "csv"
    JSON = "json"
    ORC = "orc"
    PARQUET = "parquet"
    NONE = ""


class DataFormat(type):
    INPUT_FORMAT: InputFormat
    OUTPUT_FORMAT: OutputFormat
    SERIALIZATION_LIBRARY: SerializationLibrary
    CLASSIFICATION_STRING: ClassificationString


class Avro(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.AVRO
    OUTPUT_FORMAT = OutputFormat.AVRO
    SERIALIZATION_LIBRARY = SerializationLibrary.AVRO
    CLASSIFICATION_STRING = ClassificationString.AVRO


class CloudTrailLogs(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.CLOUDTRAIL
    OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
    SERIALIZATION_LIBRARY = SerializationLibrary.CLOUDTRAIL
    CLASSIFICATION_STRING = ClassificationString.NONE


class Csv(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.TEXT
    OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
    SERIALIZATION_LIBRARY = SerializationLibrary.OPEN_CSV
    CLASSIFICATION_STRING = ClassificationString.CSV


class Json(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.TEXT
    OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
    SERIALIZATION_LIBRARY = SerializationLibrary.OPENX_JSON
    CLASSIFICATION_STRING = ClassificationString.JSON


class Orc(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.ORC
    OUTPUT_FORMAT = OutputFormat.ORC
    SERIALIZATION_LIBRARY = SerializationLibrary.ORC
    CLASSIFICATION_STRING = ClassificationString.ORC


class Parquet(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.PARQUET
    OUTPUT_FORMAT = OutputFormat.PARQUET
    SERIALIZATION_LIBRARY = SerializationLibrary.PARQUET
    CLASSIFICATION_STRING = ClassificationString.PARQUET


class Tsv(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.TEXT
    OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
    SERIALIZATION_LIBRARY = SerializationLibrary.LAZY_SIMPLE
    CLASSIFICATION_STRING = ClassificationString.NONE


class Regex(metaclass=DataFormat):
    INPUT_FORMAT = InputFormat.TEXT
    OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
    SERIALIZATION_LIBRARY = SerializationLibrary.REGEXP
    CLASSIFICATION_STRING = ClassificationString.NONE


DATA_FORMAT_MAPPING = {
    "avro": Avro,
    "cloudtraillogs": CloudTrailLogs,
    "csv": Csv,
    "json": Json,
    "orc": Orc,
    "parquet": Parquet,
    "tsv": Tsv,
    "regex": Regex,
}
